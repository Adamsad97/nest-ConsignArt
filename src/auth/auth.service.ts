import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshToken } from './entities/refresh-token.entity';
import { Role } from '../users/enums/role.enum';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async register(registerDto: RegisterDto) {
    if (registerDto.role === Role.ADMIN) {
      throw new ForbiddenException(
        'Admin accounts cannot be self-registered',
      );
    }

    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const isActive = registerDto.role !== Role.GALLERY;

    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
      isActive,
    });

    const { password: _password, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'Account not activated. Please wait for admin approval.',
      );
    }

    return this.generateTokenPair(user);
  }

  async refresh(rawRefreshToken: string) {
    const storedTokens = await this.refreshTokenRepository.find({
      where: { isRevoked: false },
      relations: { user: true },
    });

    let found: RefreshToken | null = null;
    for (const token of storedTokens) {
      const matches = await bcrypt.compare(rawRefreshToken, token.tokenHash);
      if (matches) {
        found = token;
        break;
      }
    }

    if (!found) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (found.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    found.isRevoked = true;
    await this.refreshTokenRepository.save(found);

    return this.generateTokenPair(found.user);
  }

  async logout(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { user: { id: userId }, isRevoked: false },
      { isRevoked: true },
    );
  }

  private async generateTokenPair(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: (this.configService.get<string>('JWT_ACCESS_EXPIRATION') ??
        '15m') as JwtSignOptions['expiresIn'],
    });

    const rawRefreshToken = randomUUID();
    const tokenHash = await bcrypt.hash(rawRefreshToken, 10);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const refreshToken = this.refreshTokenRepository.create({
      tokenHash,
      user,
      expiresAt,
    });
    await this.refreshTokenRepository.save(refreshToken);

    return {
      access_token: accessToken,
      refresh_token: rawRefreshToken,
      token_type: 'Bearer',
      expires_in: 900,
    };
  }
}
