import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { UsersService } from '../users/users.service';
import { Role } from '../users/enums/role.enum';

const mockUsersService = {
  findByEmail: vi.fn(),
  create: vi.fn(),
  findOne: vi.fn(),
};

const mockJwtService = {
  sign: vi.fn().mockReturnValue('signed-jwt'),
  decode: vi.fn().mockReturnValue({ iat: 1_000, exp: 1_900 }),
};

const mockConfigService = {
  get: vi.fn((key: string) => {
    const values: Record<string, string> = {
      JWT_SECRET: 'test-secret',
      JWT_ACCESS_EXPIRATION: '15m',
    };
    return values[key];
  }),
};

const mockRefreshTokenRepository = {
  find: vi.fn(),
  save: vi.fn((refreshToken: any) =>
    Promise.resolve({ id: 'refresh-token-1', ...refreshToken }),
  ),
  update: vi.fn(),
  create: vi.fn((refreshToken: any) => refreshToken),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepository,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('throws ForbiddenException when trying to self-register as admin', async () => {
      await expect(
        service.register({
          email: 'attacker@test.com',
          password: 'password123',
          firstName: 'Would-be',
          lastName: 'Admin',
          role: Role.ADMIN,
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(mockUsersService.findByEmail).not.toHaveBeenCalled();
    });

    it('throws ConflictException when email already exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: 'user-1' });

      await expect(
        service.register({
          email: 'taken@test.com',
          password: 'password123',
          firstName: 'Jean',
          lastName: 'Dupont',
          role: Role.COLLECTOR,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates gallery accounts as inactive', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockImplementation((data: any) =>
        Promise.resolve({ id: 'user-1', ...data }),
      );

      const result = await service.register({
        email: 'gallery@test.com',
        password: 'password123',
        firstName: 'Galerie',
        lastName: 'X',
        role: Role.GALLERY,
      });

      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
      expect(result).not.toHaveProperty('password');
    });

    it('creates non-gallery accounts as active', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockImplementation((data: any) =>
        Promise.resolve({ id: 'user-2', ...data }),
      );

      await service.register({
        email: 'collector@test.com',
        password: 'password123',
        firstName: 'Marie',
        lastName: 'Curie',
        role: Role.COLLECTOR,
      });

      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true }),
      );
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException when user does not exist', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@test.com', password: 'x' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      const hashed = await bcrypt.hash('correct-password', 10);
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'user@test.com',
        password: hashed,
        isActive: true,
        role: Role.COLLECTOR,
      });

      await expect(
        service.login({ email: 'user@test.com', password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when account is not active', async () => {
      const hashed = await bcrypt.hash('correct-password', 10);
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'user@test.com',
        password: hashed,
        isActive: false,
        role: Role.GALLERY,
      });

      await expect(
        service.login({ email: 'user@test.com', password: 'correct-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns a token pair on valid credentials', async () => {
      const hashed = await bcrypt.hash('correct-password', 10);
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'user@test.com',
        password: hashed,
        isActive: true,
        role: Role.COLLECTOR,
      });

      const result = await service.login({
        email: 'user@test.com',
        password: 'correct-password',
      });

      expect(result.access_token).toBe('signed-jwt');
      expect(result.token_type).toBe('Bearer');
      expect(typeof result.refresh_token).toBe('string');
      expect(mockRefreshTokenRepository.save).toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('throws UnauthorizedException when no stored token matches', async () => {
      mockRefreshTokenRepository.find.mockResolvedValue([]);

      await expect(service.refresh('some-raw-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when the matching token is expired', async () => {
      const raw = 'raw-refresh-token';
      const tokenHash = await bcrypt.hash(raw, 10);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      mockRefreshTokenRepository.find.mockResolvedValue([
        {
          id: 'refresh-token-1',
          tokenHash,
          isRevoked: false,
          expiresAt: yesterday,
          user: { id: 'user-1' },
        },
      ]);

      await expect(service.refresh(raw)).rejects.toThrow(UnauthorizedException);
    });

    it('revokes the old token and returns a new pair when valid', async () => {
      const raw = 'raw-refresh-token';
      const tokenHash = await bcrypt.hash(raw, 10);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const storedToken = {
        id: 'refresh-token-1',
        tokenHash,
        isRevoked: false,
        expiresAt: tomorrow,
        user: { id: 'user-1', email: 'user@test.com', role: Role.COLLECTOR },
      };
      mockRefreshTokenRepository.find.mockResolvedValue([storedToken]);

      const result = await service.refresh(raw);

      expect(storedToken.isRevoked).toBe(true);
      expect(mockRefreshTokenRepository.save).toHaveBeenCalledWith(storedToken);
      expect(result.access_token).toBe('signed-jwt');
    });
  });

  describe('logout', () => {
    it('revokes all active refresh tokens for the user', async () => {
      await service.logout('user-1');

      expect(mockRefreshTokenRepository.update).toHaveBeenCalledWith(
        { user: { id: 'user-1' }, isRevoked: false },
        { isRevoked: true },
      );
    });
  });
});
