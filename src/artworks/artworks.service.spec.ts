import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ArtworksService } from './artworks.service';
import { Artwork } from './entities/artwork.entity';
import { ArtworkStatusHistory } from './entities/artwork-status-history.entity';
import { ArtworkStatus } from './enums/artwork-status.enum';
import { ArtistsService } from '../artists/artists.service';
import { UsersService } from '../users/users.service';
import { Role } from '../users/enums/role.enum';
import { BusinessRuleViolationException } from '../common/exceptions/business-rule-violation.exception';

const mockGalleryUser = {
  id: 'gallery-1',
  email: 'g@test.com',
  role: Role.GALLERY,
};
const mockOtherGalleryUser = {
  id: 'gallery-2',
  email: 'g2@test.com',
  role: Role.GALLERY,
};

const mockArtist = { id: 'artist-1', gallery: { id: 'gallery-1' } };

const mockArtwork = {
  id: 'artwork-1',
  title: 'Test',
  status: ArtworkStatus.AVAILABLE,
  gallery: { id: 'gallery-1' },
  artist: mockArtist,
};

const mockArtworksRepository = {
  count: vi.fn(),
  create: vi.fn((data: any) => ({ ...data, id: 'new-id' })),
  save: vi.fn((data: any) => Promise.resolve(data)),
  find: vi.fn(),
  findOne: vi.fn(),
  remove: vi.fn(),
};

const mockStatusHistoryRepository = {
  create: vi.fn((data: any) => data),
  save: vi.fn((data: any) => Promise.resolve(data)),
};

const mockArtistsService = { findOne: vi.fn() };
const mockUsersService = { findOne: vi.fn() };

describe('ArtworksService', () => {
  let service: ArtworksService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArtworksService,
        {
          provide: getRepositoryToken(Artwork),
          useValue: mockArtworksRepository,
        },
        {
          provide: getRepositoryToken(ArtworkStatusHistory),
          useValue: mockStatusHistoryRepository,
        },
        { provide: ArtistsService, useValue: mockArtistsService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<ArtworksService>(ArtworksService);
  });

  describe('create', () => {
    it('throws ForbiddenException when the artist does not belong to the caller gallery', async () => {
      mockUsersService.findOne.mockResolvedValue(mockGalleryUser);
      mockArtistsService.findOne.mockResolvedValue({
        id: 'artist-1',
        gallery: { id: 'gallery-2' },
      });

      await expect(
        service.create({ artistId: 'artist-1' } as any, mockGalleryUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('creates the artwork and records the initial status history', async () => {
      mockUsersService.findOne.mockResolvedValue(mockGalleryUser);
      mockArtistsService.findOne.mockResolvedValue(mockArtist);

      const dto = {
        artistId: 'artist-1',
        title: 'New piece',
        price: 1000,
        reservePrice: 800,
      };
      const result = await service.create(dto, mockGalleryUser);

      expect(result.title).toBe('New piece');
      expect(mockStatusHistoryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          previousStatus: null,
          newStatus: ArtworkStatus.AVAILABLE,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the artwork does not exist', async () => {
      mockArtworksRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('changeStatus', () => {
    it('throws ForbiddenException when the caller does not own the artwork', async () => {
      mockArtworksRepository.findOne.mockResolvedValue({ ...mockArtwork });

      await expect(
        service.changeStatus(
          'artwork-1',
          ArtworkStatus.SOLD,
          mockOtherGalleryUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when the new status equals the current one', async () => {
      mockArtworksRepository.findOne.mockResolvedValue({ ...mockArtwork });

      await expect(
        service.changeStatus(
          'artwork-1',
          ArtworkStatus.AVAILABLE,
          mockGalleryUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BusinessRuleViolationException when the artwork is already sold', async () => {
      mockArtworksRepository.findOne.mockResolvedValue({
        ...mockArtwork,
        status: ArtworkStatus.SOLD,
      });

      await expect(
        service.changeStatus(
          'artwork-1',
          ArtworkStatus.RETURNED,
          mockGalleryUser,
        ),
      ).rejects.toThrow(BusinessRuleViolationException);
    });

    it('updates the status and records history on a valid transition', async () => {
      mockArtworksRepository.findOne.mockResolvedValue({ ...mockArtwork });
      mockUsersService.findOne.mockResolvedValue(mockGalleryUser);

      const result = await service.changeStatus(
        'artwork-1',
        ArtworkStatus.ON_LOAN,
        mockGalleryUser,
        'loaned out',
      );

      expect(result.status).toBe(ArtworkStatus.ON_LOAN);
      expect(mockStatusHistoryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          previousStatus: ArtworkStatus.AVAILABLE,
          newStatus: ArtworkStatus.ON_LOAN,
          reason: 'loaned out',
        }),
      );
    });
  });

  describe('remove', () => {
    it('throws ForbiddenException when the caller does not own the artwork', async () => {
      mockArtworksRepository.findOne.mockResolvedValue({ ...mockArtwork });

      await expect(
        service.remove('artwork-1', mockOtherGalleryUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('removes the artwork when owned by the caller', async () => {
      mockArtworksRepository.findOne.mockResolvedValue({ ...mockArtwork });

      await service.remove('artwork-1', mockGalleryUser);

      expect(mockArtworksRepository.remove).toHaveBeenCalled();
    });
  });
});
