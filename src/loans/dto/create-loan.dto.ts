import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLoanDto {
  @ApiProperty({ description: 'UUID of the artwork to loan' })
  @IsUUID()
  @IsNotEmpty()
  artworkId: string;

  @ApiProperty({ description: 'UUID of the borrowing gallery' })
  @IsUUID()
  @IsNotEmpty()
  borrowerGalleryId: string;

  @ApiPropertyOptional({ example: 'Temporary exhibition loan' })
  @IsString()
  @IsOptional()
  purpose?: string;

  @ApiProperty({ example: '2026-09-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-09-30' })
  @IsDateString()
  expectedReturnDate: string;

  @ApiPropertyOptional({
    example: 'Handle with care. Climate-controlled transport required.',
  })
  @IsString()
  @IsOptional()
  conditions?: string;
}
