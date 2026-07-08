import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArtistStatement } from './entities/artist-statement.entity';
import { Sale } from '../sales/entities/sale.entity';
import { Artist } from '../artists/entities/artist.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { UsersModule } from '../users/users.module';
import { ArtworksModule } from '../artworks/artworks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ArtistStatement, Sale, Artist]),
    UsersModule,
    ArtworksModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
