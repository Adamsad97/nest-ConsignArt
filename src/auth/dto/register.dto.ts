import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../users/enums/role.enum';

/**
 * Admin accounts are never self-registrable: they're created only via the
 * bootstrap seed script (see `npm run seed:admin`). Allowing `role: 'admin'`
 * here would let anyone grant themselves platform-wide access.
 */
export const SELF_REGISTERABLE_ROLES = [
  Role.GALLERY,
  Role.ARTIST,
  Role.COLLECTOR,
] as const;

export class RegisterDto {
  @ApiProperty({ example: 'jean.dupont@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'MotDePasse123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Jean' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Dupont' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiPropertyOptional({
    enum: SELF_REGISTERABLE_ROLES,
    default: Role.COLLECTOR,
  })
  @IsIn(SELF_REGISTERABLE_ROLES)
  @IsOptional()
  role?: Role;
}
