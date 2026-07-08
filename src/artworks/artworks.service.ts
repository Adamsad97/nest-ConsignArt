import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Artwork } from './entities/artwork.entity';
import { ArtworkStatusHistory } from './entities/artwork-status-history.entity';
import { CreateArtworkDto } from './dto/create-artwork.dto';
import { UpdateArtworkDto } from './dto/update-artwork.dto';
import { ArtworkStatus } from './enums/artwork-status.enum';
import { ArtistsService } from '../artists/artists.service';
import { UsersService } from '../users/users.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Role } from '../users/enums/role.enum';
import { BusinessRuleViolationException } from '../common/exceptions/business-rule-violation.exception';

@Injectable()
export class ArtworksService {
  constructor(
    @InjectRepository(Artwork)
    private readonly artworksRepository: Repository<Artwork>,
    @InjectRepository(ArtworkStatusHistory)
    private readonly statusHistoryRepository: Repository<ArtworkStatusHistory>,
    private readonly artistsService: ArtistsService,
    private readonly usersService: UsersService,
  ) {}

  async create(
    dto: CreateArtworkDto,
    currentUser: AuthenticatedUser,
  ): Promise<Artwork> {
    const gallery = await this.usersService.findOne(currentUser.id);
    const artist = await this.artistsService.findOne(dto.artistId, currentUser);

    if (
      artist.gallery.id !== currentUser.id &&
      currentUser.role !== Role.ADMIN
    ) {
      throw new ForbiddenException(
        'This artist does not belong to your gallery',
      );
    }

    const artwork = this.artworksRepository.create({
      title: dto.title,
      description: dto.description,
      technique: dto.technique,
      year: dto.year,
      height: dto.height,
      width: dto.width,
      depth: dto.depth,
      price: dto.price,
      reservePrice: dto.reservePrice,
      status: dto.status ?? ArtworkStatus.AVAILABLE,
      imageUrl: dto.imageUrl,
      artist,
      gallery,
    });

    const saved = await this.artworksRepository.save(artwork);

    await this.statusHistoryRepository.save(
      this.statusHistoryRepository.create({
        artwork: saved,
        previousStatus: null,
        newStatus: saved.status,
        reason: 'Artwork registered in gallery',
        changedBy: gallery,
      }),
    );

    return saved;
  }

  findAll(): Promise<Artwork[]> {
    return this.artworksRepository.find({
      relations: { gallery: true, artist: true },
    });
  }

  async findOne(id: string): Promise<Artwork> {
    const artwork = await this.artworksRepository.findOne({
      where: { id },
      relations: { gallery: true, artist: true, statusHistory: true },
    });
    if (!artwork) {
      throw new NotFoundException(`Artwork with id ${id} not found`);
    }
    return artwork;
  }

  async changeStatus(
    id: string,
    newStatus: ArtworkStatus,
    currentUser: AuthenticatedUser,
    reason?: string,
  ): Promise<Artwork> {
    const artwork = await this.findOne(id);

    if (
      currentUser.role !== Role.ADMIN &&
      artwork.gallery.id !== currentUser.id
    ) {
      throw new ForbiddenException('You do not own this artwork');
    }

    if (artwork.status === newStatus) {
      throw new BadRequestException(
        `Artwork is already in status ${newStatus}`,
      );
    }

    if (artwork.status === ArtworkStatus.SOLD) {
      throw new BusinessRuleViolationException(
        'A sold artwork cannot change status',
        'ARTWORK_ALREADY_SOLD',
      );
    }

    const previousStatus = artwork.status;
    artwork.status = newStatus;
    const saved = await this.artworksRepository.save(artwork);

    const changedBy = await this.usersService.findOne(currentUser.id);
    await this.statusHistoryRepository.save(
      this.statusHistoryRepository.create({
        artwork: saved,
        previousStatus,
        newStatus,
        reason: reason ?? (null as string | null),
        changedBy,
      }),
    );

    return saved;
  }

  async update(
    id: string,
    dto: UpdateArtworkDto,
    currentUser: AuthenticatedUser,
  ): Promise<Artwork> {
    const artwork = await this.findOne(id);

    if (
      currentUser.role !== Role.ADMIN &&
      artwork.gallery.id !== currentUser.id
    ) {
      throw new ForbiddenException('You do not own this artwork');
    }

    const { artistId: _artistId, status: _status, ...rest } = dto;
    Object.assign(artwork, rest);
    return this.artworksRepository.save(artwork);
  }

  async remove(id: string, currentUser: AuthenticatedUser): Promise<void> {
    const artwork = await this.findOne(id);

    if (
      currentUser.role !== Role.ADMIN &&
      artwork.gallery.id !== currentUser.id
    ) {
      throw new ForbiddenException('You do not own this artwork');
    }

    await this.artworksRepository.remove(artwork);
  }
}
