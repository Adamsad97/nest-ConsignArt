import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExhibitionDto {
  @ApiProperty({ example: 'Modern Masters 2026' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'A showcase of contemporary art.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'Palais de Tokyo, Paris' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ example: 'https://virtual-tour.example.com' })
  @IsUrl()
  @IsOptional()
  virtualLink?: string;

  @ApiProperty({ example: '2026-09-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-09-30' })
  @IsDateString()
  endDate: string;
}
