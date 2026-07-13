import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { ExhibitionsService } from './exhibitions.service';
import { Exhibition } from './entities/exhibition.entity';
import { ExhibitionArtwork } from './entities/exhibition-artwork.entity';
import { ExhibitionStatus } from './entities/enums/exhibition-status.enum';
import { ArtworkStatus } from '../artworks/enums/artwork-status.enum';
import { ArtworksService } from '../artworks/artworks.service';
import { UsersService } from '../users/users.service';
import { Role } from '../users/enums/role.enum';
import { BusinessRuleViolationException } from '../common/exceptions/business-rule-violation.exception';

const mockGalleryUser = {
  id: 'gallery-1',
  email: 'g@test.com',
  role: Role.GALLERY,
};

const mockExhibitionsRepository = {
  create: jest.fn((data: any) => ({ ...data, id: 'exhibition-1' })),
  save: jest.fn((data: any) => Promise.resolve(data)),
  find: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
};

const mockExhibitionArtworkRepository = {
  create: jest.fn((data: any) => ({ ...data, id: 'ea-1' })),
  save: jest.fn((data: any) => Promise.resolve(data)),
  findOne: jest.fn(),
  remove: jest.fn(),
};

const mockArtworksService = { findOne: jest.fn(), changeStatus: jest.fn() };
const mockUsersService = { findOne: jest.fn() };

const mockManager = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn((entity: any, data: any) => ({ ...data })),
  save: jest.fn((entity: any, data: any) =>
    Promise.resolve(
      Array.isArray(data) ? data : { ...data, id: 'exhibition-1' },
    ),
  ),
};

const mockDataSource = {
  transaction: jest.fn((cb: (manager: any) => Promise<any>) => cb(mockManager)),
};

describe('ExhibitionsService', () => {
  let service: ExhibitionsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExhibitionsService,
        { provide: getDataSourceToken(), useValue: mockDataSource },
        {
          provide: getRepositoryToken(Exhibition),
          useValue: mockExhibitionsRepository,
        },
        {
          provide: getRepositoryToken(ExhibitionArtwork),
          useValue: mockExhibitionArtworkRepository,
        },
        { provide: ArtworksService, useValue: mockArtworksService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<ExhibitionsService>(ExhibitionsService);
  });

  describe('create', () => {
    const dto = {
      title: 'Modern Masters',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      artworkIds: ['artwork-1'],
    };

    it('throws NotFoundException when an artwork id does not exist', async () => {
      mockManager.findOne.mockResolvedValue({ id: 'gallery-1' });
      mockManager.find.mockResolvedValue([]);

      await expect(
        service.create(dto as any, mockGalleryUser as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when an artwork does not belong to the caller gallery', async () => {
      mockManager.findOne.mockResolvedValue({ id: 'gallery-1' });
      mockManager.find.mockResolvedValue([
        {
          id: 'artwork-1',
          gallery: { id: 'gallery-2' },
          status: ArtworkStatus.AVAILABLE,
          title: 'X',
        },
      ]);

      await expect(
        service.create(dto as any, mockGalleryUser as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BusinessRuleViolationException when an artwork is not available', async () => {
      mockManager.findOne.mockResolvedValue({ id: 'gallery-1' });
      mockManager.find.mockResolvedValue([
        {
          id: 'artwork-1',
          gallery: { id: 'gallery-1' },
          status: ArtworkStatus.SOLD,
          title: 'X',
        },
      ]);

      await expect(
        service.create(dto as any, mockGalleryUser as any),
      ).rejects.toThrow(BusinessRuleViolationException);
    });

    it('creates the exhibition with its artworks in a single transaction', async () => {
      mockManager.findOne.mockResolvedValue({ id: 'gallery-1' });
      mockManager.find.mockResolvedValue([
        {
          id: 'artwork-1',
          gallery: { id: 'gallery-1' },
          status: ArtworkStatus.AVAILABLE,
          title: 'X',
        },
      ]);

      const result = await service.create(dto, mockGalleryUser);

      expect(result.title).toBe('Modern Masters');
      expect(mockManager.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('addArtwork', () => {
    const exhibition = {
      id: 'exhibition-1',
      gallery: { id: 'gallery-1' },
      status: ExhibitionStatus.UPCOMING,
    };
    const artwork = {
      id: 'artwork-1',
      gallery: { id: 'gallery-1' },
      status: ArtworkStatus.AVAILABLE,
    };

    it('throws ConflictException when the artwork is already in the exhibition', async () => {
      mockExhibitionsRepository.findOne.mockResolvedValue(exhibition);
      mockArtworksService.findOne.mockResolvedValue(artwork);
      mockExhibitionArtworkRepository.findOne.mockResolvedValue({
        id: 'existing',
      });

      await expect(
        service.addArtwork(
          'exhibition-1',
          { artworkId: 'artwork-1' } as any,
          mockGalleryUser as any,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('throws BusinessRuleViolationException when the artwork is not available', async () => {
      mockExhibitionsRepository.findOne.mockResolvedValue(exhibition);
      mockArtworksService.findOne.mockResolvedValue({
        ...artwork,
        status: ArtworkStatus.SOLD,
      });
      mockExhibitionArtworkRepository.findOne.mockResolvedValue(null);

      await expect(
        service.addArtwork(
          'exhibition-1',
          { artworkId: 'artwork-1' } as any,
          mockGalleryUser as any,
        ),
      ).rejects.toThrow(BusinessRuleViolationException);
    });

    it('adds the artwork and moves it to on_loan when the exhibition is ongoing', async () => {
      const ongoingExhibition = {
        ...exhibition,
        status: ExhibitionStatus.ONGOING,
      };
      mockExhibitionsRepository.findOne.mockResolvedValue(ongoingExhibition);
      mockArtworksService.findOne.mockResolvedValue(artwork);
      mockExhibitionArtworkRepository.findOne.mockResolvedValue(null);

      const result = await service.addArtwork(
        'exhibition-1',
        { artworkId: 'artwork-1' },
        mockGalleryUser,
      );

      expect(mockArtworksService.changeStatus).toHaveBeenCalledWith(
        'artwork-1',
        ArtworkStatus.ON_LOAN,
        mockGalleryUser,
        expect.any(String),
      );
      expect(result.artwork.status).toBe(ArtworkStatus.ON_LOAN);
    });
  });

  describe('update', () => {
    it('only updates the whitelisted fields and converts date strings', async () => {
      const existing = {
        id: 'exhibition-1',
        title: 'Old title',
        gallery: { id: 'gallery-1' },
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-31'),
      };
      mockExhibitionsRepository.findOne.mockResolvedValue(existing);

      const result = await service.update(
        'exhibition-1',
        { title: 'New title', startDate: '2026-02-01' },
        mockGalleryUser,
      );

      expect(result.title).toBe('New title');
      expect(result.startDate).toEqual(new Date('2026-02-01'));
      expect(result.endDate).toEqual(new Date('2026-01-31'));
    });
  });

  describe('updateStatus', () => {
    it('throws BusinessRuleViolationException when starting an exhibition with zero artworks', async () => {
      mockExhibitionsRepository.findOne.mockResolvedValue({
        id: 'exhibition-1',
        gallery: { id: 'gallery-1' },
        exhibitionArtworks: [],
      });

      await expect(
        service.updateStatus(
          'exhibition-1',
          ExhibitionStatus.ONGOING,
          mockGalleryUser as any,
        ),
      ).rejects.toThrow(BusinessRuleViolationException);
    });

    it('moves available artworks to on_loan when the exhibition starts', async () => {
      const exhibitionArtworks = [
        { artwork: { id: 'artwork-1', status: ArtworkStatus.AVAILABLE } },
      ];
      mockExhibitionsRepository.findOne.mockResolvedValue({
        id: 'exhibition-1',
        gallery: { id: 'gallery-1' },
        exhibitionArtworks,
      });

      const result = await service.updateStatus(
        'exhibition-1',
        ExhibitionStatus.ONGOING,
        mockGalleryUser,
      );

      expect(mockArtworksService.changeStatus).toHaveBeenCalledWith(
        'artwork-1',
        ArtworkStatus.ON_LOAN,
        mockGalleryUser,
        expect.any(String),
      );
      expect(result.exhibitionArtworks[0].artwork.status).toBe(
        ArtworkStatus.ON_LOAN,
      );
    });

    it('returns on_loan artworks to available when the exhibition closes', async () => {
      mockExhibitionsRepository.findOne.mockResolvedValue({
        id: 'exhibition-1',
        gallery: { id: 'gallery-1' },
        exhibitionArtworks: [
          { artwork: { id: 'artwork-1', status: ArtworkStatus.ON_LOAN } },
        ],
      });

      await service.updateStatus(
        'exhibition-1',
        ExhibitionStatus.CLOSED,
        mockGalleryUser,
      );

      expect(mockArtworksService.changeStatus).toHaveBeenCalledWith(
        'artwork-1',
        ArtworkStatus.AVAILABLE,
        mockGalleryUser,
        expect.any(String),
      );
    });
  });

  describe('findOne', () => {
    it('throws ForbiddenException when the caller does not own the exhibition', async () => {
      mockExhibitionsRepository.findOne.mockResolvedValue({
        id: 'exhibition-1',
        gallery: { id: 'gallery-2' },
      });

      await expect(
        service.findOne('exhibition-1', mockGalleryUser as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
