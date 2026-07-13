import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { ArtistStatement } from './entities/artist-statement.entity';
import { Sale } from '../sales/entities/sale.entity';
import { Artist } from '../artists/entities/artist.entity';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';
import { ArtworksService } from '../artworks/artworks.service';
import { ArtworkStatus } from '../artworks/enums/artwork-status.enum';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(ArtistStatement)
    private readonly statementsRepository: Repository<ArtistStatement>,
    @InjectRepository(Sale)
    private readonly salesRepository: Repository<Sale>,
    @InjectRepository(Artist)
    private readonly artistsRepository: Repository<Artist>,
    private readonly usersService: UsersService,
    private readonly artworksService: ArtworksService,
  ) {}

  async generateArtistStatement(
    artistId: string,
    periodStart: Date,
    periodEnd: Date,
    currentUser: AuthenticatedUser,
  ): Promise<ArtistStatement> {
    const artist = await this.artistsRepository.findOne({
      where: { id: artistId },
      relations: { gallery: true },
    });
    if (!artist) throw new NotFoundException(`Artist ${artistId} not found`);

    const sales = await this.salesRepository.find({
      where: {
        artwork: { artist: { id: artistId } },
        saleDate: Between(periodStart, periodEnd),
      },
      relations: { artwork: true },
    });

    const totalSaleAmount = sales.reduce(
      (sum, s) => sum + Number(s.salePrice),
      0,
    );
    const totalCommission = sales.reduce(
      (sum, s) => sum + Number(s.galleryCommission),
      0,
    );
    const netAmount = sales.reduce((sum, s) => sum + Number(s.artistAmount), 0);

    const items = sales.map((s) => ({
      saleId: s.id,
      artworkTitle: s.artwork.title,
      saleDate: s.saleDate,
      salePrice: s.salePrice,
      commission: s.galleryCommission,
      net: s.artistAmount,
    }));

    const year = periodStart.getFullYear();
    const month = String(periodStart.getMonth() + 1).padStart(2, '0');
    const period = `${year}-${month}`;

    const gallery = await this.usersService.findOne(artist.gallery.id);
    const generatedBy = await this.usersService.findOne(currentUser.id);

    const statement = this.statementsRepository.create({
      period,
      periodStart,
      periodEnd,
      totalSalesCount: sales.length,
      totalSaleAmount,
      totalCommission,
      netAmount,
      items,
      generatedAt: new Date(),
      artist,
      gallery,
      generatedBy,
    });

    return this.statementsRepository.save(statement);
  }

  async getGalleryDashboard(currentUser: AuthenticatedUser) {
    const galleryId = currentUser.id;

    const totalSales = await this.salesRepository.count({
      where: { gallery: { id: galleryId } },
    });

    const salesData = await this.salesRepository.find({
      where: { gallery: { id: galleryId } },
      relations: { artwork: { artist: true } },
    });

    const totalRevenue = salesData.reduce(
      (sum, s) => sum + Number(s.galleryCommission),
      0,
    );

    const artistSalesMap = new Map<
      string,
      { name: string; count: number; revenue: number }
    >();
    const monthlySalesMap = new Map<
      string,
      { artworksSold: number; revenue: number }
    >();

    for (const sale of salesData) {
      const artistId = sale.artwork.artist.id;
      const name = `${sale.artwork.artist.firstName} ${sale.artwork.artist.lastName}`;
      const current = artistSalesMap.get(artistId) ?? {
        name,
        count: 0,
        revenue: 0,
      };
      current.count++;
      current.revenue += Number(sale.galleryCommission);
      artistSalesMap.set(artistId, current);

      const month = new Date(sale.saleDate).toISOString().slice(0, 7);
      const monthEntry = monthlySalesMap.get(month) ?? {
        artworksSold: 0,
        revenue: 0,
      };
      monthEntry.artworksSold++;
      monthEntry.revenue += Number(sale.salePrice);
      monthlySalesMap.set(month, monthEntry);
    }

    const topArtists = Array.from(artistSalesMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const monthlySales = Array.from(monthlySalesMap.entries())
      .map(([month, data]) => ({
        month,
        artworksSold: data.artworksSold,
        revenue: Math.round(data.revenue * 100) / 100,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const galleryArtworks = (await this.artworksService.findAll()).filter(
      (a) => a.gallery?.id === galleryId,
    );
    const soldCount = galleryArtworks.filter(
      (a) => a.status === ArtworkStatus.SOLD,
    ).length;
    const turnoverRate =
      galleryArtworks.length > 0
        ? Math.round((soldCount / galleryArtworks.length) * 10000) / 100
        : 0;

    return {
      totalSales,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      topArtists,
      monthlySales,
      turnoverRate,
    };
  }

  async getArtistDashboard(artistId: string, _currentUser: AuthenticatedUser) {
    const salesData = await this.salesRepository.find({
      where: { artwork: { artist: { id: artistId } } },
      relations: { artwork: true },
    });

    const totalSales = salesData.length;
    const totalEarnings = salesData.reduce(
      (sum, s) => sum + Number(s.artistAmount),
      0,
    );
    const totalCommissionPaid = salesData.reduce(
      (sum, s) => sum + Number(s.galleryCommission),
      0,
    );

    const allArtworks = await this.artworksService.findAll();
    const availableArtworks = allArtworks.filter(
      (a) => a.artist?.id === artistId && a.status === ArtworkStatus.AVAILABLE,
    );

    return {
      totalSales,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      totalCommissionPaid: Math.round(totalCommissionPaid * 100) / 100,
      availableArtworksCount: availableArtworks.length,
    };
  }

  async getAdminDashboard(_currentUser: AuthenticatedUser) {
    const totalSales = await this.salesRepository.count();
    const allSales = await this.salesRepository.find();
    const totalVolume = allSales.reduce(
      (sum, s) => sum + Number(s.salePrice),
      0,
    );
    const totalCommissions = allSales.reduce(
      (sum, s) => sum + Number(s.galleryCommission),
      0,
    );
    const totalUsers = await this.usersService.findAll();

    return {
      totalUsers: totalUsers.length,
      activeUsers: totalUsers.filter((u) => u.isActive).length,
      totalSales,
      totalVolume: Math.round(totalVolume * 100) / 100,
      totalCommissions: Math.round(totalCommissions * 100) / 100,
    };
  }

  findStatementsByArtist(artistId: string): Promise<ArtistStatement[]> {
    return this.statementsRepository.find({
      where: { artist: { id: artistId } },
      relations: { artist: true, gallery: true },
      order: { createdAt: 'DESC' },
    });
  }
}
