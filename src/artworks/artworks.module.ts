import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Artwork } from './entities/artwork.entity';
import { ArtworkStatusHistory } from './entities/artwork-status-history.entity';
import { ArtworksService } from './artworks.service';
import { ArtworksController } from './artworks.controller';
import { ArtistsModule } from '../artists/artists.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Artwork, ArtworkStatusHistory]),
    ArtistsModule,
    UsersModule,
  ],
  controllers: [ArtworksController],
  providers: [ArtworksService],
  exports: [ArtworksService],
})
export class ArtworksModule {}
