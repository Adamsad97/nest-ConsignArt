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

  @ApiProperty({ example: 'Jean Dupont' })
  @IsString()
  @IsNotEmpty()
  buyer: string;

  @ApiProperty({ example: 'jean.dupont@email.com' })
  @IsString()
  @IsNotEmpty()
  buyerContact: string;

  @ApiProperty({ example: 12000.0 })
  @IsNumber()
  @IsPositive()
  salePrice: number;

  @ApiPropertyOptional({ example: '2026-06-26' })
  @IsDateString()
  @IsOptional()
  saleDate?: string;
}
