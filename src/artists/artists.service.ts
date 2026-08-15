import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Artist } from './entities/artist.entity';
import { CreateArtistDto } from './dto/create-artist.dto';
import { UpdateArtistDto } from './dto/update-artist.dto';
import { UsersService } from '../users/users.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Role } from '../users/enums/role.enum';
import { User } from '../users/entities/user.entity';
import {
  findMaybePaginated,
  Paginated,
} from '../common/pagination/paginate';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';

@Injectable()
export class ArtistsService {
  constructor(
    @InjectRepository(Artist)
    private readonly artistsRepository: Repository<Artist>,
    private readonly usersService: UsersService,
  ) {}

  async create(
    dto: CreateArtistDto,
    galleryUser: AuthenticatedUser,
  ): Promise<Artist> {
    const gallery = await this.usersService.findOne(galleryUser.id);

    let linkedUser: User | undefined;
    if (dto.userId) {
      const foundUser = await this.usersService.findOne(dto.userId);
      if (foundUser.role !== Role.ARTIST) {
        throw new BadRequestException('Linked user must have role ARTIST');
      }

      const existing = await this.artistsRepository.findOne({
        where: { user: { id: dto.userId } },
      });
      if (existing) {
        throw new ConflictException('This user already has an artist profile');
      }
      linkedUser = foundUser;
    }

    const artist = this.artistsRepository.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      bio: dto.bio,
      nationality: dto.nationality,
      birthYear: dto.birthYear,
      specialty: dto.specialty,
      websiteUrl: dto.websiteUrl,
      gallery,
      user: linkedUser,
    });

    return this.artistsRepository.save(artist);
  }

  findAll(
    currentUser: AuthenticatedUser,
    pagination?: PaginationQueryDto,
  ): Promise<Artist[] | Paginated<Artist>> {
    return findMaybePaginated(
      this.artistsRepository,
      {
        ...(currentUser.role !== Role.ADMIN && {
          where: { gallery: { id: currentUser.id } },
        }),
        relations: { gallery: true, user: true },
      },
      pagination,
    );
  }

  async findOne(id: string, currentUser: AuthenticatedUser): Promise<Artist> {
    const artist = await this.artistsRepository.findOne({
      where: { id },
      relations: { gallery: true, user: true },
    });
    if (!artist) {
      throw new NotFoundException(`Artist with id ${id} not found`);
    }

    if (
      currentUser.role !== Role.ADMIN &&
      currentUser.role !== Role.ARTIST &&
      artist.gallery.id !== currentUser.id
    ) {
      throw new ForbiddenException('You do not have access to this artist');
    }

    return artist;
  }

  async update(
    id: string,
    dto: UpdateArtistDto,
    currentUser: AuthenticatedUser,
  ): Promise<Artist> {
    const artist = await this.findOne(id, currentUser);

    if (
      currentUser.role !== Role.ADMIN &&
      artist.gallery.id !== currentUser.id
    ) {
      throw new ForbiddenException(
        'You can only update artists in your gallery',
      );
    }

    Object.assign(artist, {
      firstName: dto.firstName ?? artist.firstName,
      lastName: dto.lastName ?? artist.lastName,
      bio: dto.bio ?? artist.bio,
      nationality: dto.nationality ?? artist.nationality,
      birthYear: dto.birthYear ?? artist.birthYear,
      specialty: dto.specialty ?? artist.specialty,
      websiteUrl: dto.websiteUrl ?? artist.websiteUrl,
    });

    return this.artistsRepository.save(artist);
  }

  async activate(id: string, currentUser: AuthenticatedUser): Promise<Artist> {
    const artist = await this.findOne(id, currentUser);

    if (
      currentUser.role !== Role.ADMIN &&
      artist.gallery.id !== currentUser.id
    ) {
      throw new ForbiddenException(
        'You can only activate artists in your gallery',
      );
    }

    artist.isActive = true;
    return this.artistsRepository.save(artist);
  }

  async remove(id: string, currentUser: AuthenticatedUser): Promise<void> {
    const artist = await this.findOne(id, currentUser);

    if (
      currentUser.role !== Role.ADMIN &&
      artist.gallery.id !== currentUser.id
    ) {
      throw new ForbiddenException(
        'You can only remove artists from your gallery',
      );
    }

    artist.isActive = false;
    await this.artistsRepository.save(artist);
  }

  async transferGallery(
    artistId: string,
    newGalleryId: string,
    currentUser: AuthenticatedUser,
  ): Promise<Artist> {
    if (currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Only admins can transfer artists between galleries',
      );
    }

    const artist = await this.artistsRepository.findOne({
      where: { id: artistId },
      relations: { gallery: true },
    });
    if (!artist) {
      throw new NotFoundException(`Artist with id ${artistId} not found`);
    }

    const newGallery = await this.usersService.findOne(newGalleryId);
    if (newGallery.role !== Role.GALLERY) {
      throw new BadRequestException('Target user must have role GALLERY');
    }

    artist.gallery = newGallery;
    return this.artistsRepository.save(artist);
  }
}
