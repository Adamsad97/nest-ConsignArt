import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoansService } from './loans.service';
import { Loan } from './entities/loan.entity';
import { LoanStatus } from './entities/enums/loan-status.enum';
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
const mockOtherGalleryUser = {
  id: 'gallery-2',
  email: 'g2@test.com',
  role: Role.GALLERY,
};

const mockLoansRepository = {
  create: jest.fn((data: any) => ({ ...data, id: 'loan-1' })),
  save: jest.fn((data: any) => Promise.resolve(data)),
  find: jest.fn(),
  findOne: jest.fn(),
};

const mockArtworksService = { findOne: jest.fn(), changeStatus: jest.fn() };
const mockUsersService = { findOne: jest.fn() };

describe('LoansService', () => {
  let service: LoansService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoansService,
        { provide: getRepositoryToken(Loan), useValue: mockLoansRepository },
        { provide: ArtworksService, useValue: mockArtworksService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<LoansService>(LoansService);
  });

  describe('create', () => {
    const artwork = {
      id: 'artwork-1',
      gallery: { id: 'gallery-1' },
      status: ArtworkStatus.AVAILABLE,
    };

    it('throws ForbiddenException when the artwork does not belong to the caller gallery', async () => {
      mockArtworksService.findOne.mockResolvedValue(artwork);

      await expect(
        service.create(
          { artworkId: 'artwork-1' } as any,
          mockOtherGalleryUser as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BusinessRuleViolationException when the artwork is already on loan', async () => {
      mockArtworksService.findOne.mockResolvedValue({
        ...artwork,
        status: ArtworkStatus.ON_LOAN,
      });

      await expect(
        service.create(
          { artworkId: 'artwork-1' } as any,
          mockGalleryUser as any,
        ),
      ).rejects.toThrow(BusinessRuleViolationException);
    });

    it('creates the loan and moves the artwork to on_loan', async () => {
      mockArtworksService.findOne.mockResolvedValue(artwork);
      mockUsersService.findOne.mockResolvedValue(mockGalleryUser);

      const dto = {
        artworkId: 'artwork-1',
        borrower: 'Museum X',
        borrowerContact: 'contact@museum.com',
        startDate: '2026-01-01',
        expectedReturnDate: '2026-02-01',
      };

      await service.create(dto, mockGalleryUser);

      expect(mockArtworksService.changeStatus).toHaveBeenCalledWith(
        'artwork-1',
        ArtworkStatus.ON_LOAN,
        mockGalleryUser,
        expect.any(String),
      );
    });
  });

  describe('returnLoan', () => {
    it('throws BusinessRuleViolationException when the loan is not active', async () => {
      mockLoansRepository.findOne.mockResolvedValue({
        id: 'loan-1',
        status: LoanStatus.RETURNED,
        gallery: { id: 'gallery-1' },
        artwork: { id: 'artwork-1' },
      });

      await expect(
        service.returnLoan('loan-1', mockGalleryUser as any),
      ).rejects.toThrow(BusinessRuleViolationException);
    });

    it('marks the loan as returned and the artwork as available', async () => {
      mockLoansRepository.findOne.mockResolvedValue({
        id: 'loan-1',
        status: LoanStatus.ACTIVE,
        gallery: { id: 'gallery-1' },
        artwork: { id: 'artwork-1' },
        borrower: 'Museum X',
      });

      const result = await service.returnLoan('loan-1', mockGalleryUser);

      expect(result.status).toBe(LoanStatus.RETURNED);
      expect(mockArtworksService.changeStatus).toHaveBeenCalledWith(
        'artwork-1',
        ArtworkStatus.AVAILABLE,
        mockGalleryUser,
        expect.any(String),
      );
    });
  });
});
