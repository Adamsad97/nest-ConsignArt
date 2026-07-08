import {
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddArtworkDto {
  @ApiProperty({ description: 'UUID of the artwork to add' })
  @IsUUID()
  @IsNotEmpty()
  artworkId: string;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @IsOptional()
  displayOrder?: number;

  @ApiPropertyOptional({ example: 'Featured piece near entrance' })
  @IsString()
  @IsOptional()
  notes?: string;
}
