import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan } from './entities/loan.entity';
import { CreateLoanDto } from './dto/create-loan.dto';
import { LoanStatus } from './entities/enums/loan-status.enum';
import { ArtworksService } from '../artworks/artworks.service';
import { UsersService } from '../users/users.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Role } from '../users/enums/role.enum';
import { ArtworkStatus } from '../artworks/enums/artwork-status.enum';
import { BusinessRuleViolationException } from '../common/exceptions/business-rule-violation.exception';
import {
  findMaybePaginated,
  Paginated,
} from '../common/pagination/paginate';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';

@Injectable()
export class LoansService {
  constructor(
    @InjectRepository(Loan)
    private readonly loansRepository: Repository<Loan>,
    private readonly artworksService: ArtworksService,
    private readonly usersService: UsersService,
  ) {}

  async create(
    dto: CreateLoanDto,
    currentUser: AuthenticatedUser,
  ): Promise<Loan> {
    const artwork = await this.artworksService.findOne(dto.artworkId);

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
        'Only available artworks can be loaned',
        'ARTWORK_NOT_AVAILABLE',
      );
    }

    if (dto.borrowerGalleryId === currentUser.id) {
      throw new BadRequestException(
        'A gallery cannot loan an artwork to itself',
      );
    }

    const borrowerGallery = await this.usersService.findOne(
      dto.borrowerGalleryId,
    );
    if (borrowerGallery.role !== Role.GALLERY) {
      throw new BadRequestException(
        'The borrowing party must be a gallery account',
      );
    }

    const gallery = await this.usersService.findOne(currentUser.id);

    const loan = this.loansRepository.create({
      artwork,
      gallery,
      borrowerGallery,
      purpose: dto.purpose,
      startDate: new Date(dto.startDate),
      expectedReturnDate: new Date(dto.expectedReturnDate),
      conditions: dto.conditions,
    });

    const saved = await this.loansRepository.save(loan);

    await this.artworksService.changeStatus(
      dto.artworkId,
      ArtworkStatus.ON_LOAN,
      currentUser,
      `Loaned to gallery: ${borrowerGallery.firstName} ${borrowerGallery.lastName}`,
    );
    saved.artwork.status = ArtworkStatus.ON_LOAN;

    return saved;
  }

  findAll(
    currentUser: AuthenticatedUser,
    pagination?: PaginationQueryDto,
  ): Promise<Loan[] | Paginated<Loan>> {
    return findMaybePaginated(
      this.loansRepository,
      {
        ...(currentUser.role !== Role.ADMIN && {
          where: { gallery: { id: currentUser.id } },
        }),
        relations: {
          artwork: { artist: true },
          gallery: true,
          borrowerGallery: true,
        },
      },
      pagination,
    );
  }

  async findOne(id: string, currentUser: AuthenticatedUser): Promise<Loan> {
    const loan = await this.loansRepository.findOne({
      where: { id },
      relations: {
        artwork: { artist: true },
        gallery: true,
        borrowerGallery: true,
      },
    });
    if (!loan) {
      throw new NotFoundException(`Loan with id ${id} not found`);
    }
    if (currentUser.role !== Role.ADMIN && loan.gallery.id !== currentUser.id) {
      throw new ForbiddenException('You do not own this loan');
    }
    return loan;
  }

  async returnLoan(id: string, currentUser: AuthenticatedUser): Promise<Loan> {
    const loan = await this.findOne(id, currentUser);

    if (loan.status !== LoanStatus.ACTIVE) {
      throw new BusinessRuleViolationException(
        'Only active loans can be returned',
        'LOAN_NOT_ACTIVE',
      );
    }

    loan.status = LoanStatus.RETURNED;
    loan.actualReturnDate = new Date();
    const saved = await this.loansRepository.save(loan);

    await this.artworksService.changeStatus(
      loan.artwork.id,
      ArtworkStatus.AVAILABLE,
      currentUser,
      `Returned from loan to gallery: ${loan.borrowerGallery.firstName} ${loan.borrowerGallery.lastName}`,
    );
    saved.artwork.status = ArtworkStatus.AVAILABLE;

    return saved;
  }
}
