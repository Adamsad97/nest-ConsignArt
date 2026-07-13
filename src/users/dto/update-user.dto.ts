import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Jean' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Dupont' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  lastName?: string;
}
