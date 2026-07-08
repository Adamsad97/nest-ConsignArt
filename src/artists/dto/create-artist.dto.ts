import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsUrl,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateArtistDto {
  @ApiProperty({ example: 'Pablo' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Picasso' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiPropertyOptional({ example: 'Spanish cubist painter and sculptor.' })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiPropertyOptional({ example: 'Spanish' })
  @IsString()
  @IsOptional()
  nationality?: string;

  @ApiPropertyOptional({ example: 1881 })
  @IsInt()
  @Min(1800)
  @Max(new Date().getFullYear())
  @IsOptional()
  birthYear?: number;

  @ApiPropertyOptional({ example: 'Cubism, Surrealism' })
  @IsString()
  @IsOptional()
  specialty?: string;

  @ApiPropertyOptional({ example: 'https://picasso.com' })
  @IsUrl()
  @IsOptional()
  websiteUrl?: string;

  @ApiPropertyOptional({
    description: 'Link to existing user account with role=ARTIST',
  })
  @IsUUID()
  @IsOptional()
  userId?: string;
}
