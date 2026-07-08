import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exhibition } from './entities/exhibition.entity';
import { ExhibitionArtwork } from './entities/exhibition-artwork.entity';
import { CreateExhibitionDto } from './dto/create-exhibition.dto';
import { UpdateExhibitionDto } from './dto/update-exhibition.dto';
import { AddArtworkDto } from './dto/add-artwork.dto';
import { ArtworksService } from '../artworks/artworks.service';
import { UsersService } from '../users/users.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Role } from '../users/enums/role.enum';
import { ArtworkStatus } from '../artworks/enums/artwork-status.enum';
import { ExhibitionStatus } from './entities/enums/exhibition-status.enum';
import { BusinessRuleViolationException } from '../common/exceptions/business-rule-violation.exception';

@Injectable()
export class ExhibitionsService {
  constructor(
    @InjectRepository(Exhibition)
    private readonly exhibitionsRepository: Repository<Exhibition>,
    @InjectRepository(ExhibitionArtwork)
    private readonly exhibitionArtworkRepository: Repository<ExhibitionArtwork>,
    private readonly artworksService: ArtworksService,
    private readonly usersService: UsersService,
  ) {}

  async create(
    dto: CreateExhibitionDto,
    currentUser: AuthenticatedUser,
  ): Promise<Exhibition> {
    const gallery = await this.usersService.findOne(currentUser.id);

    const exhibition = this.exhibitionsRepository.create({
      title: dto.title,
      description: dto.description,
      location: dto.location,
      virtualLink: dto.virtualLink,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      gallery,
    });

    return this.exhibitionsRepository.save(exhibition);
  }

  findAll(currentUser: AuthenticatedUser): Promise<Exhibition[]> {
    if (currentUser.role === Role.ADMIN) {
      return this.exhibitionsRepository.find({
        relations: { gallery: true, exhibitionArtworks: { artwork: true } },
      });
    }
    return this.exhibitionsRepository.find({
      where: { gallery: { id: currentUser.id } },
      relations: { gallery: true, exhibitionArtworks: { artwork: true } },
    });
  }

  async findOne(
    id: string,
    currentUser: AuthenticatedUser,
  ): Promise<Exhibition> {
    const exhibition = await this.exhibitionsRepository.findOne({
      where: { id },
      relations: {
        gallery: true,
        exhibitionArtworks: { artwork: { artist: true } },
      },
    });
    if (!exhibition) {
      throw new NotFoundException(`Exhibition with id ${id} not found`);
    }
    if (
      currentUser.role !== Role.ADMIN &&
      exhibition.gallery.id !== currentUser.id
    ) {
      throw new ForbiddenException('You do not own this exhibition');
    }
    return exhibition;
  }

  async update(
    id: string,
    dto: UpdateExhibitionDto,
    currentUser: AuthenticatedUser,
  ): Promise<Exhibition> {
    const exhibition = await this.findOne(id, currentUser);
    Object.assign(exhibition, dto);
    return this.exhibitionsRepository.save(exhibition);
  }

  async addArtwork(
    exhibitionId: string,
    dto: AddArtworkDto,
    currentUser: AuthenticatedUser,
  ): Promise<ExhibitionArtwork> {
    const exhibition = await this.findOne(exhibitionId, currentUser);
    const artwork = await this.artworksService.findOne(dto.artworkId);

    if (
      artwork.gallery.id !== currentUser.id &&
      currentUser.role !== Role.ADMIN
    ) {
      throw new ForbiddenException(
        'This artwork does not belong to your gallery',
      );
    }

    const existing = await this.exhibitionArtworkRepository.findOne({
      where: {
        exhibition: { id: exhibitionId },
        artwork: { id: dto.artworkId },
      },
    });
    if (existing) {
      throw new ConflictException('This artwork is already in the exhibition');
    }

    if (artwork.status !== ArtworkStatus.AVAILABLE) {
      throw new BusinessRuleViolationException(
        'Only available artworks can be added to an exhibition',
        'ARTWORK_NOT_AVAILABLE',
      );
    }

    const ea = this.exhibitionArtworkRepository.create({
      exhibition,
      artwork,
      displayOrder: dto.displayOrder,
      notes: dto.notes,
    });
    const saved = await this.exhibitionArtworkRepository.save(ea);

    if (exhibition.status === ExhibitionStatus.ONGOING) {
      await this.artworksService.changeStatus(
        dto.artworkId,
        ArtworkStatus.ON_LOAN,
        currentUser,
        `Added to exhibition: ${exhibition.title}`,
      );
    }

    return saved;
  }

  async removeArtwork(
    exhibitionId: string,
    artworkId: string,
    currentUser: AuthenticatedUser,
  ): Promise<void> {
    await this.findOne(exhibitionId, currentUser);

    const ea = await this.exhibitionArtworkRepository.findOne({
      where: { exhibition: { id: exhibitionId }, artwork: { id: artworkId } },
    });
    if (!ea) {
      throw new NotFoundException('Artwork not found in this exhibition');
    }

    await this.exhibitionArtworkRepository.remove(ea);
  }

  async updateStatus(
    id: string,
    status: ExhibitionStatus,
    currentUser: AuthenticatedUser,
  ): Promise<Exhibition> {
    const exhibition = await this.findOne(id, currentUser);

    if (status === ExhibitionStatus.ONGOING) {
      const artworkCount = exhibition.exhibitionArtworks?.length ?? 0;
      if (artworkCount === 0) {
        throw new BusinessRuleViolationException(
          'An exhibition cannot be started with zero artworks',
          'EXHIBITION_NO_ARTWORKS',
        );
      }

      for (const ea of exhibition.exhibitionArtworks) {
        if (ea.artwork.status === ArtworkStatus.AVAILABLE) {
          await this.artworksService.changeStatus(
            ea.artwork.id,
            ArtworkStatus.ON_LOAN,
            currentUser,
            `Exhibition started: ${exhibition.title}`,
          );
        }
      }
    }

    if (status === ExhibitionStatus.CLOSED) {
      for (const ea of exhibition.exhibitionArtworks ?? []) {
        if (ea.artwork.status === ArtworkStatus.ON_LOAN) {
          await this.artworksService.changeStatus(
            ea.artwork.id,
            ArtworkStatus.AVAILABLE,
            currentUser,
            `Exhibition closed: ${exhibition.title}`,
          );
        }
      }
    }

    exhibition.status = status;
    return this.exhibitionsRepository.save(exhibition);
  }

  async remove(id: string, currentUser: AuthenticatedUser): Promise<void> {
    const exhibition = await this.findOne(id, currentUser);
    await this.exhibitionsRepository.remove(exhibition);
  }
}
