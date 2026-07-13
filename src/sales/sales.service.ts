import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Sale } from './entities/sale.entity';
import { Invoice } from './entities/invoice.entity';
import { CreateSaleDto } from './dto/create-sale.dto';
import { InvoiceStatus } from './entities/enums/invoice-status.enum';
import { Artwork } from '../artworks/entities/artwork.entity';
import { ArtworkStatus } from '../artworks/enums/artwork-status.enum';
import { ArtworkStatusHistory } from '../artworks/entities/artwork-status-history.entity';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Role } from '../users/enums/role.enum';
import { BusinessRuleViolationException } from '../common/exceptions/business-rule-violation.exception';
import { User } from '../users/entities/user.entity';

interface CommissionResult {
  rate: number;
  galleryCommission: number;
  artistAmount: number;
}

@Injectable()
export class SalesService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(Sale)
    private readonly salesRepository: Repository<Sale>,
    @InjectRepository(Invoice)
    private readonly invoicesRepository: Repository<Invoice>,
  ) {}

  calculateCommission(price: number): CommissionResult {
    let rate: number;
    if (price <= 5000) {
      rate = 0.4;
    } else if (price <= 20000) {
      rate = 0.35;
    } else {
      rate = 0.3;
    }
    const galleryCommission = Math.round(price * rate * 100) / 100;
    const artistAmount = Math.round((price - galleryCommission) * 100) / 100;
    return { rate, galleryCommission, artistAmount };
  }

  private generateInvoiceNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 9000) + 1000);
    return `INV-${year}${month}-${random}`;
  }

  async processSale(
    dto: CreateSaleDto,
    currentUser: AuthenticatedUser,
  ): Promise<Sale> {
    return this.dataSource.transaction(async (manager) => {
      const artwork = await manager
        .createQueryBuilder(Artwork, 'artwork')
        .innerJoinAndSelect('artwork.gallery', 'gallery')
        .innerJoinAndSelect('artwork.artist', 'artist')
        .where('artwork.id = :id', { id: dto.artworkId })
        .setLock('pessimistic_write')
        .getOne();

      if (!artwork) {
        throw new NotFoundException(
          `Artwork with id ${dto.artworkId} not found`,
        );
      }

      if (
        artwork.gallery.id !== currentUser.id &&
        currentUser.role !== Role.ADMIN
      ) {
        throw new ForbiddenException(
          'This artwork does not belong to your gallery',
        );
      }

      if (artwork.status === ArtworkStatus.ON_LOAN) {
        throw new BusinessRuleViolationException(
          'An artwork on loan cannot be sold',
          'ARTWORK_ON_LOAN',
        );
      }

      if (artwork.status !== ArtworkStatus.AVAILABLE) {
        throw new BusinessRuleViolationException(
          'Only available artworks can be sold',
          'ARTWORK_NOT_AVAILABLE',
        );
      }

      if (dto.salePrice < Number(artwork.reservePrice)) {
        throw new BusinessRuleViolationException(
          `Sale price (${dto.salePrice}€) cannot be below reserve price (${artwork.reservePrice}€)`,
          'BELOW_RESERVE_PRICE',
        );
      }

      const commission = this.calculateCommission(dto.salePrice);

      const vatRate = 0.2;
      const vatAmount = Math.round(dto.salePrice * vatRate * 100) / 100;
      const invoiceNumber = this.generateInvoiceNumber();

      const invoice = manager.create(Invoice, {
        invoiceNumber,
        issuedAt: new Date(),
        totalAmount: dto.salePrice,
        vatRate,
        vatAmount,
        items: [
          {
            description: artwork.title,
            quantity: 1,
            unitPrice: dto.salePrice,
            total: dto.salePrice,
          },
        ],
        status: InvoiceStatus.DRAFT,
      });
      await manager.save(Invoice, invoice);

      const gallery = await manager.findOne(User, {
        where: { id: currentUser.id },
      });
      if (!gallery) {
        throw new ForbiddenException('Gallery user not found');
      }

      const sale = manager.create(Sale, {
        buyer: dto.buyer,
        buyerContact: dto.buyerContact,
        saleDate: dto.saleDate ? new Date(dto.saleDate) : new Date(),
        salePrice: dto.salePrice,
        commissionRate: commission.rate,
        galleryCommission: commission.galleryCommission,
        artistAmount: commission.artistAmount,
        artwork,
        gallery,
        invoice,
      });
      const previousStatus = artwork.status;

      await manager.save(Sale, sale);

      await manager.update(Artwork, artwork.id, { status: ArtworkStatus.SOLD });

      const history = manager.create(ArtworkStatusHistory, {
        artwork,
        previousStatus,
        newStatus: ArtworkStatus.SOLD,
        reason: `Sold to ${dto.buyer} for ${dto.salePrice}€`,
        changedBy: gallery,
      });
      await manager.save(ArtworkStatusHistory, history);

      sale.artwork.status = ArtworkStatus.SOLD;
      return sale;
    });
  }

  findAll(currentUser: AuthenticatedUser): Promise<Sale[]> {
    if (currentUser.role === Role.ADMIN) {
      return this.salesRepository.find({
        relations: { artwork: { artist: true }, gallery: true, invoice: true },
      });
    }
    if (currentUser.role === Role.ARTIST) {
      return this.salesRepository.find({
        where: { artwork: { artist: { user: { id: currentUser.id } } } },
        relations: { artwork: { artist: true }, gallery: true, invoice: true },
      });
    }
    return this.salesRepository.find({
      where: { gallery: { id: currentUser.id } },
      relations: { artwork: { artist: true }, gallery: true, invoice: true },
    });
  }

  async findOne(id: string, currentUser: AuthenticatedUser): Promise<Sale> {
    const sale = await this.salesRepository.findOne({
      where: { id },
      relations: { artwork: { artist: true }, gallery: true, invoice: true },
    });
    if (!sale) {
      throw new NotFoundException(`Sale with id ${id} not found`);
    }
    if (currentUser.role !== Role.ADMIN && sale.gallery.id !== currentUser.id) {
      throw new ForbiddenException('You do not have access to this sale');
    }
    return sale;
  }

  async findInvoice(
    saleId: string,
    currentUser: AuthenticatedUser,
  ): Promise<Invoice> {
    const sale = await this.findOne(saleId, currentUser);
    const invoice = await this.invoicesRepository.findOne({
      where: { sale: { id: sale.id } },
      relations: { sale: true },
    });
    if (!invoice) {
      throw new NotFoundException(`Invoice for sale ${saleId} not found`);
    }
    return invoice;
  }
}
