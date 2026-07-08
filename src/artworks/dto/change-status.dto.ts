import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArtworkStatus } from '../enums/artwork-status.enum';

export class ChangeStatusDto {
  @ApiProperty({ enum: ArtworkStatus })
  @IsEnum(ArtworkStatus)
  status: ArtworkStatus;

  @ApiPropertyOptional({ example: 'Sold at auction' })
  @IsString()
  @IsOptional()
  reason?: string;
}
