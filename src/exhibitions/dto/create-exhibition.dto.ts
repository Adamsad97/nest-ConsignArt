import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsUrl,
  IsUUID,
  ArrayMinSize,
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

  @ApiProperty({
    description: 'UUIDs of the artworks to feature (at least one required)',
    type: [String],
  })
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  artworkIds: string[];
}
