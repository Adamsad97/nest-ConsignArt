import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ArtistStatement } from './entities/artist-statement.entity';
import { Sale } from '../sales/entities/sale.entity';
import { Artist } from '../artists/entities/artist.entity';
import { ArtworkStatus } from '../artworks/enums/artwork-status.enum';
import { UsersService } from '../users/users.service';
import { ArtworksService } from '../artworks/artworks.service';
import { Role } from '../users/enums/role.enum';

const mockGalleryUser = {
  id: 'gallery-1',
  email: 'g@test.com',
  role: Role.GALLERY,
};

const mockOtherGalleryUser = {
  id: 'gallery-2',
  email: 'other@test.com',
  role: Role.GALLERY,
};

const mockArtistUser = {
  id: 'artist-user-1',
  email: 'artist@test.com',
  role: Role.ARTIST,
};

const mockStatementsRepository = {
  create: vi.fn((data: any) => data),
  save: vi.fn((data: any) => Promise.resolve({ id: 'statement-1', ...data })),
  find: vi.fn(),
};

const mockSalesRepository = {
  find: vi.fn(),
  count: vi.fn(),
};

const mockArtistsRepository = {
  findOne: vi.fn(),
};

const mockUsersService = { findOne: vi.fn(), findAll: vi.fn() };
const mockArtworksService = { findAll: vi.fn() };

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: getRepositoryToken(ArtistStatement),
          useValue: mockStatementsRepository,
        },
        { provide: getRepositoryToken(Sale), useValue: mockSalesRepository },
        {
          provide: getRepositoryToken(Artist),
          useValue: mockArtistsRepository,
        },
        { provide: UsersService, useValue: mockUsersService },
        { provide: ArtworksService, useValue: mockArtworksService },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  describe('generateArtistStatement', () => {
    it('throws NotFoundException when the artist does not exist', async () => {
      mockArtistsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.generateArtistStatement(
          'missing',
          new Date('2026-01-01'),
          new Date('2026-01-31'),
          mockGalleryUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when the caller is a different gallery', async () => {
      mockArtistsRepository.findOne.mockResolvedValue({
        id: 'artist-1',
        gallery: { id: 'gallery-1' },
        user: null,
      });

      await expect(
        service.generateArtistStatement(
          'artist-1',
          new Date('2026-01-01'),
          new Date('2026-01-31'),
          mockOtherGalleryUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('aggregates sales into a statement for the period', async () => {
      mockArtistsRepository.findOne.mockResolvedValue({
        id: 'artist-1',
        gallery: { id: 'gallery-1' },
        user: null,
      });
      mockSalesRepository.find.mockResolvedValue([
        {
          id: 'sale-1',
          salePrice: 1000,
          galleryCommission: 400,
          artistAmount: 600,
          saleDate: new Date('2026-01-15'),
          artwork: { title: 'Piece A' },
        },
        {
          id: 'sale-2',
          salePrice: 2000,
          galleryCommission: 800,
          artistAmount: 1200,
          saleDate: new Date('2026-01-20'),
          artwork: { title: 'Piece B' },
        },
      ]);
      mockUsersService.findOne.mockResolvedValue(mockGalleryUser);

      const result = await service.generateArtistStatement(
        'artist-1',
        new Date('2026-01-01'),
        new Date('2026-01-31'),
        mockGalleryUser,
      );

      expect(result.totalSalesCount).toBe(2);
      expect(result.totalSaleAmount).toBe(3000);
      expect(result.totalCommission).toBe(1200);
      expect(result.netAmount).toBe(1800);
    });
  });

  describe('getGalleryDashboard', () => {
    it('computes revenue, top 5 artists, monthly sales and turnover rate', async () => {
      mockSalesRepository.count.mockResolvedValue(2);
      mockSalesRepository.find.mockResolvedValue([
        {
          galleryCommission: 400,
          salePrice: 1000,
          saleDate: '2026-01-10',
          artwork: {
            artist: { id: 'artist-1', firstName: 'Pablo', lastName: 'Picasso' },
          },
        },
        {
          galleryCommission: 800,
          salePrice: 2000,
          saleDate: '2026-02-15',
          artwork: {
            artist: { id: 'artist-1', firstName: 'Pablo', lastName: 'Picasso' },
          },
        },
      ]);
      mockArtworksService.findAll.mockResolvedValue([
        {
          id: 'artwork-1',
          gallery: { id: 'gallery-1' },
          status: ArtworkStatus.SOLD,
        },
        {
          id: 'artwork-2',
          gallery: { id: 'gallery-1' },
          status: ArtworkStatus.SOLD,
        },
        {
          id: 'artwork-3',
          gallery: { id: 'gallery-1' },
          status: ArtworkStatus.AVAILABLE,
        },
        {
          id: 'artwork-4',
          gallery: { id: 'gallery-2' },
          status: ArtworkStatus.SOLD,
        },
      ]);

      const result = await service.getGalleryDashboard(mockGalleryUser);

      expect(result.totalSales).toBe(2);
      expect(result.totalRevenue).toBe(1200);
      expect(result.topArtists).toEqual([
        { name: 'Pablo Picasso', count: 2, revenue: 1200 },
      ]);
      expect(result.monthlySales).toEqual([
        { month: '2026-01', artworksSold: 1, revenue: 400 },
        { month: '2026-02', artworksSold: 1, revenue: 800 },
      ]);
      expect(result.turnoverRate).toBeCloseTo(66.67, 1);
    });
  });

  describe('getArtistDashboard', () => {
    it('throws ForbiddenException when the caller is an unrelated artist', async () => {
      mockArtistsRepository.findOne.mockResolvedValue({
        id: 'artist-1',
        gallery: { id: 'gallery-1' },
        user: { id: 'artist-user-1' },
      });

      await expect(
        service.getArtistDashboard('artist-1', {
          id: 'artist-user-2',
          email: 'other-artist@test.com',
          role: Role.ARTIST,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows the linked artist user to view their own dashboard', async () => {
      mockArtistsRepository.findOne.mockResolvedValue({
        id: 'artist-1',
        gallery: { id: 'gallery-1' },
        user: { id: 'artist-user-1' },
      });
      mockSalesRepository.find.mockResolvedValue([]);
      mockArtworksService.findAll.mockResolvedValue([]);

      await expect(
        service.getArtistDashboard('artist-1', mockArtistUser),
      ).resolves.toBeDefined();
    });

    it('sums earnings and counts available artworks for the artist', async () => {
      mockArtistsRepository.findOne.mockResolvedValue({
        id: 'artist-1',
        gallery: { id: 'gallery-1' },
        user: null,
      });
      mockSalesRepository.find.mockResolvedValue([
        { artistAmount: 600, galleryCommission: 400 },
        { artistAmount: 1200, galleryCommission: 800 },
      ]);
      mockArtworksService.findAll.mockResolvedValue([
        {
          id: 'artwork-1',
          artist: { id: 'artist-1' },
          status: ArtworkStatus.AVAILABLE,
        },
        {
          id: 'artwork-2',
          artist: { id: 'artist-1' },
          status: ArtworkStatus.SOLD,
        },
        {
          id: 'artwork-3',
          artist: { id: 'artist-2' },
          status: ArtworkStatus.AVAILABLE,
        },
      ]);

      const result = await service.getArtistDashboard(
        'artist-1',
        mockGalleryUser,
      );

      expect(result.totalSales).toBe(2);
      expect(result.totalEarnings).toBe(1800);
      expect(result.totalCommissionPaid).toBe(1200);
      expect(result.availableArtworksCount).toBe(1);
    });
  });

  describe('getAdminDashboard', () => {
    it('aggregates platform-wide volume, commissions and active users', async () => {
      mockSalesRepository.count.mockResolvedValue(3);
      mockSalesRepository.find.mockResolvedValue([
        { salePrice: 1000, galleryCommission: 400 },
        { salePrice: 2000, galleryCommission: 800 },
      ]);
      mockUsersService.findAll.mockResolvedValue([
        { id: 'user-1', isActive: true },
        { id: 'user-2', isActive: false },
      ]);

      const result = await service.getAdminDashboard(mockGalleryUser);

      expect(result.totalUsers).toBe(2);
      expect(result.activeUsers).toBe(1);
      expect(result.totalVolume).toBe(3000);
      expect(result.totalCommissions).toBe(1200);
    });
  });
});
