import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Exhibition } from './entities/exhibition.entity';
import { ExhibitionArtwork } from './entities/exhibition-artwork.entity';
import { CreateExhibitionDto } from './dto/create-exhibition.dto';
import { UpdateExhibitionDto } from './dto/update-exhibition.dto';
import { AddArtworkDto } from './dto/add-artwork.dto';
import { Artwork } from '../artworks/entities/artwork.entity';
import { User } from '../users/entities/user.entity';
import { ArtworksService } from '../artworks/artworks.service';
import { UsersService } from '../users/users.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Role } from '../users/enums/role.enum';
import { ArtworkStatus } from '../artworks/enums/artwork-status.enum';
import { ExhibitionStatus } from './entities/enums/exhibition-status.enum';
import { BusinessRuleViolationException } from '../common/exceptions/business-rule-violation.exception';
import { findMaybePaginated, Paginated } from '../common/pagination/paginate';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';

@Injectable()
export class ExhibitionsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
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
    return this.dataSource.transaction(async (manager) => {
      const gallery = await manager.findOne(User, {
        where: { id: currentUser.id },
      });
      if (!gallery) {
        throw new ForbiddenException('Gallery user not found');
      }

      const artworks = await manager.find(Artwork, {
        where: { id: In(dto.artworkIds) },
        relations: { gallery: true },
      });

      if (artworks.length !== new Set(dto.artworkIds).size) {
        throw new NotFoundException('One or more artworks were not found');
      }

      for (const artwork of artworks) {
        if (
          artwork.gallery.id !== currentUser.id &&
          currentUser.role !== Role.ADMIN
        ) {
          throw new ForbiddenException(
            'This artwork does not belong to your gallery',
          );
        }
        if (artwork.status !== ArtworkStatus.AVAILABLE) {
          throw new BusinessRuleViolationException(
            `Artwork "${artwork.title}" is not available`,
            'ARTWORK_NOT_AVAILABLE',
          );
        }
      }

      const exhibition = manager.create(Exhibition, {
        title: dto.title,
        description: dto.description,
        location: dto.location,
        virtualLink: dto.virtualLink,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        gallery,
      });
      const savedExhibition = await manager.save(Exhibition, exhibition);

      const exhibitionArtworks = artworks.map((artwork) =>
        manager.create(ExhibitionArtwork, {
          exhibition: savedExhibition,
          artwork,
        }),
      );
      await manager.save(ExhibitionArtwork, exhibitionArtworks);

      return savedExhibition;
    });
  }

  findAll(
    currentUser: AuthenticatedUser,
    pagination?: PaginationQueryDto,
  ): Promise<Exhibition[] | Paginated<Exhibition>> {
    return findMaybePaginated(
      this.exhibitionsRepository,
      {
        ...(currentUser.role !== Role.ADMIN && {
          where: { gallery: { id: currentUser.id } },
        }),
        relations: { gallery: true, exhibitionArtworks: { artwork: true } },
      },
      pagination,
    );
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

    exhibition.title = dto.title ?? exhibition.title;
    exhibition.description = dto.description ?? exhibition.description;
    exhibition.location = dto.location ?? exhibition.location;
    exhibition.virtualLink = dto.virtualLink ?? exhibition.virtualLink;
    exhibition.startDate = dto.startDate
      ? new Date(dto.startDate)
      : exhibition.startDate;
    exhibition.endDate = dto.endDate
      ? new Date(dto.endDate)
      : exhibition.endDate;

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

    const exhibitionArtwork = this.exhibitionArtworkRepository.create({
      exhibition,
      artwork,
      displayOrder: dto.displayOrder,
      notes: dto.notes,
    });
    const saved =
      await this.exhibitionArtworkRepository.save(exhibitionArtwork);

    if (exhibition.status === ExhibitionStatus.ONGOING) {
      await this.artworksService.changeStatus(
        dto.artworkId,
        ArtworkStatus.ON_LOAN,
        currentUser,
        `Added to exhibition: ${exhibition.title}`,
      );
      saved.artwork.status = ArtworkStatus.ON_LOAN;
    }

    return saved;
  }

  async removeArtwork(
    exhibitionId: string,
    artworkId: string,
    currentUser: AuthenticatedUser,
  ): Promise<void> {
    await this.findOne(exhibitionId, currentUser);

    const exhibitionArtwork = await this.exhibitionArtworkRepository.findOne({
      where: { exhibition: { id: exhibitionId }, artwork: { id: artworkId } },
    });
    if (!exhibitionArtwork) {
      throw new NotFoundException('Artwork not found in this exhibition');
    }

    await this.exhibitionArtworkRepository.remove(exhibitionArtwork);
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

      for (const exhibitionArtwork of exhibition.exhibitionArtworks) {
        if (exhibitionArtwork.artwork.status === ArtworkStatus.AVAILABLE) {
          await this.artworksService.changeStatus(
            exhibitionArtwork.artwork.id,
            ArtworkStatus.ON_LOAN,
            currentUser,
            `Exhibition started: ${exhibition.title}`,
          );
          exhibitionArtwork.artwork.status = ArtworkStatus.ON_LOAN;
        }
      }
    }

    if (status === ExhibitionStatus.CLOSED) {
      for (const exhibitionArtwork of exhibition.exhibitionArtworks ?? []) {
        if (exhibitionArtwork.artwork.status === ArtworkStatus.ON_LOAN) {
          await this.artworksService.changeStatus(
            exhibitionArtwork.artwork.id,
            ArtworkStatus.AVAILABLE,
            currentUser,
            `Exhibition closed: ${exhibition.title}`,
          );
          exhibitionArtwork.artwork.status = ArtworkStatus.AVAILABLE;
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
