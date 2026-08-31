import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsDateString,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSaleDto {
  @ApiProperty({ description: 'UUID of the artwork to sell' })
  @IsUUID()
  @IsNotEmpty()
  artworkId: string;

  @ApiPropertyOptional({
    example: 'Jean Dupont',
    description:
      'Required when the caller is a gallery/admin. Ignored for a collector self-purchase (derived from their account).',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  buyer?: string;

  @ApiPropertyOptional({
    example: 'jean.dupont@email.com',
    description:
      'Required when the caller is a gallery/admin. Ignored for a collector self-purchase (derived from their account).',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  buyerContact?: string;

  @ApiProperty({ example: 12000.0 })
  @IsNumber()
  @IsPositive()
  salePrice: number;

  @ApiPropertyOptional({ example: '2026-06-26' })
  @IsDateString()
  @IsOptional()
  saleDate?: string;
}
