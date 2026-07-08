import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArtworkStatus } from '../enums/artwork-status.enum';

export class CreateArtworkDto {
  @ApiProperty({ example: 'Starry Night' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'Oil painting depicting a night sky' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'UUID of the artist (must belong to your gallery)',
  })
  @IsUUID()
  @IsNotEmpty()
  artistId: string;

  @ApiPropertyOptional({ example: 'oil' })
  @IsString()
  @IsOptional()
  technique?: string;

  @ApiPropertyOptional({ example: 1889 })
  @IsNumber()
  @IsOptional()
  year?: number;

  @ApiPropertyOptional({ example: 73.7 })
  @IsNumber()
  @IsOptional()
  height?: number;

  @ApiPropertyOptional({ example: 92.1 })
  @IsNumber()
  @IsOptional()
  width?: number;

  @ApiPropertyOptional({ example: 3.5 })
  @IsNumber()
  @IsOptional()
  depth?: number;

  @ApiProperty({ example: 15000.0 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 10000.0 })
  @IsNumber()
  @Min(0)
  reservePrice: number;

  @ApiPropertyOptional({
    enum: ArtworkStatus,
    default: ArtworkStatus.AVAILABLE,
  })
  @IsEnum(ArtworkStatus)
  @IsOptional()
  status?: ArtworkStatus;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}
