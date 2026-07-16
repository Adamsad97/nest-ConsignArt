import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { SalesService } from './sales.service';
import { Sale } from './entities/sale.entity';
import { Invoice } from './entities/invoice.entity';
import { ArtworkStatus } from '../artworks/enums/artwork-status.enum';
import { BusinessRuleViolationException } from '../common/exceptions/business-rule-violation.exception';
import { Role } from '../users/enums/role.enum';

const mockGalleryUser = {
  id: 'gallery-1',
  email: 'gallery@test.com',
  role: Role.GALLERY,
};

const mockCollectorUser = {
  id: 'collector-1',
  email: 'collector@test.com',
  role: Role.COLLECTOR,
};

const mockArtwork = {
  id: 'artwork-1',
  title: 'Test Artwork',
  status: ArtworkStatus.AVAILABLE,
  reservePrice: 5000,
  gallery: { id: 'gallery-1' },
  artist: { id: 'artist-1', firstName: 'Pablo', lastName: 'Picasso' },
};

const mockQueryBuilder = {
  innerJoinAndSelect: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  setLock: vi.fn().mockReturnThis(),
  getOne: vi.fn(),
};

const mockManager = {
  createQueryBuilder: vi.fn(() => mockQueryBuilder),
  findOne: vi.fn(),
  create: vi.fn((entity: any, data: any) => ({ ...data, id: 'new-id' })),
  save: vi.fn((entity: any, data: any) =>
    Promise.resolve({ ...data, id: 'saved-id' }),
  ),
  update: vi.fn().mockResolvedValue({}),
};

const mockDataSource = {
  transaction: vi.fn((cb: (manager: any) => Promise<any>) => cb(mockManager)),
};

const mockSalesRepository = {
  find: vi.fn(),
  findOne: vi.fn(),
  count: vi.fn(),
};

const mockInvoicesRepository = {
  findOne: vi.fn(),
};

describe('SalesService', () => {
  let service: SalesService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        { provide: getDataSourceToken(), useValue: mockDataSource },
        {
          provide: getRepositoryToken(Sale),
          useValue: mockSalesRepository,
        },
        {
          provide: getRepositoryToken(Invoice),
          useValue: mockInvoicesRepository,
        },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);
  });

  describe('calculateCommission', () => {
    it('applies 40% for price <= 5000', () => {
      const result = service.calculateCommission(5000);
      expect(result.rate).toBe(0.4);
      expect(result.galleryCommission).toBe(2000);
      expect(result.artistAmount).toBe(3000);
    });

    it('applies 40% for price = 4999', () => {
      const result = service.calculateCommission(4999);
      expect(result.rate).toBe(0.4);
    });

    it('applies 35% for price = 5001', () => {
      const result = service.calculateCommission(5001);
      expect(result.rate).toBe(0.35);
    });

    it('applies 35% for price = 20000', () => {
      const result = service.calculateCommission(20000);
      expect(result.rate).toBe(0.35);
    });

    it('applies 30% for price > 20000', () => {
      const result = service.calculateCommission(20001);
      expect(result.rate).toBe(0.3);
    });

    it('rounds to 2 decimal places', () => {
      const result = service.calculateCommission(9999);
      expect(result.galleryCommission).toBe(
        Math.round(9999 * 0.35 * 100) / 100,
      );
    });
  });

  describe('processSale', () => {
    it('throws BusinessRuleViolationException when artwork is ON_LOAN', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce({
        ...mockArtwork,
        status: ArtworkStatus.ON_LOAN,
      });

      await expect(
        service.processSale(
          {
            artworkId: 'artwork-1',
            buyer: 'Jean',
            buyerContact: 'j@mail.fr',
            salePrice: 6000,
          },
          mockGalleryUser,
        ),
      ).rejects.toThrow(BusinessRuleViolationException);

      try {
        await service.processSale(
          {
            artworkId: 'artwork-1',
            buyer: 'Jean',
            buyerContact: 'j@mail.fr',
            salePrice: 6000,
          },
          mockGalleryUser,
        );
      } catch (e) {
        if (e instanceof BusinessRuleViolationException) {
          expect(e.rule).toBe('ARTWORK_ON_LOAN');
        }
      }
    });

    it('throws BusinessRuleViolationException when artwork is already SOLD', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce({
        ...mockArtwork,
        status: ArtworkStatus.SOLD,
      });

      await expect(
        service.processSale(
          {
            artworkId: 'artwork-1',
            buyer: 'Jean',
            buyerContact: 'j@mail.fr',
            salePrice: 6000,
          },
          mockGalleryUser,
        ),
      ).rejects.toThrow(BusinessRuleViolationException);

      mockQueryBuilder.getOne.mockResolvedValueOnce({
        ...mockArtwork,
        status: ArtworkStatus.SOLD,
      });
      try {
        await service.processSale(
          {
            artworkId: 'artwork-1',
            buyer: 'Jean',
            buyerContact: 'j@mail.fr',
            salePrice: 6000,
          },
          mockGalleryUser,
        );
      } catch (e) {
        if (e instanceof BusinessRuleViolationException) {
          expect(e.rule).toBe('ARTWORK_NOT_AVAILABLE');
        }
      }
    });

    it('throws BusinessRuleViolationException when price is below reserve', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce({
        ...mockArtwork,
        status: ArtworkStatus.AVAILABLE,
        reservePrice: 8000,
      });

      await expect(
        service.processSale(
          {
            artworkId: 'artwork-1',
            buyer: 'Jean',
            buyerContact: 'j@mail.fr',
            salePrice: 5000,
          },
          mockGalleryUser,
        ),
      ).rejects.toThrow(BusinessRuleViolationException);
    });

    it('processes a valid sale in a transaction', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce({
        ...mockArtwork,
        status: ArtworkStatus.AVAILABLE,
      });

      const result = await service.processSale(
        {
          artworkId: 'artwork-1',
          buyer: 'Jean',
          buyerContact: 'j@mail.fr',
          salePrice: 10000,
        },
        mockGalleryUser,
      );

      expect(result.artwork.status).toBe(ArtworkStatus.SOLD);
      expect(result.gallery).toEqual(mockArtwork.gallery);
      expect(mockManager.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          previousStatus: ArtworkStatus.AVAILABLE,
          newStatus: ArtworkStatus.SOLD,
        }),
      );
      expect(mockManager.save).toHaveBeenCalledTimes(3);
      expect(mockManager.update).toHaveBeenCalledWith(
        expect.anything(),
        'artwork-1',
        { status: ArtworkStatus.SOLD },
      );
    });

    it('throws BadRequestException when a gallery omits buyer/buyerContact', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce({
        ...mockArtwork,
        status: ArtworkStatus.AVAILABLE,
      });

      await expect(
        service.processSale(
          { artworkId: 'artwork-1', salePrice: 10000 },
          mockGalleryUser,
        ),
      ).rejects.toThrow('buyer and buyerContact are required');
    });

    it('lets a collector buy for themselves from any gallery, deriving buyer info from their account', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce({
        ...mockArtwork,
        status: ArtworkStatus.AVAILABLE,
      });
      mockManager.findOne.mockResolvedValueOnce({
        id: 'collector-1',
        firstName: 'Marie',
        lastName: 'Curie',
        email: 'collector@test.com',
      });

      const result = await service.processSale(
        { artworkId: 'artwork-1', salePrice: 10000 },
        mockCollectorUser,
      );

      expect(result.buyer).toBe('Marie Curie');
      expect(result.buyerContact).toBe('collector@test.com');
      expect(result.buyerAccount).toEqual(
        expect.objectContaining({ id: 'collector-1' }),
      );
    });
  });

  describe('findAll', () => {
    it('scopes results to the collector own purchases', async () => {
      await service.findAll(mockCollectorUser);
      expect(mockSalesRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { buyerAccount: { id: 'collector-1' } },
        }),
      );
    });
  });
});
