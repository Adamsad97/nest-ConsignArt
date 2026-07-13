import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { Role } from './enums/role.enum';

const mockUser = {
  id: 'user-1',
  email: 'a@test.com',
  password: 'hashed-password',
  firstName: 'Jean',
  lastName: 'Dupont',
  role: Role.COLLECTOR,
  isActive: true,
};

const mockRepository = {
  create: jest.fn((data: any) => data),
  save: jest.fn((data: any) => Promise.resolve(data)),
  find: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('findOne', () => {
    it('throws NotFoundException when the user does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('only updates firstName and lastName, ignoring any other field', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockUser });

      const result = await service.update('user-1', {
        firstName: 'Paul',
        lastName: 'Martin',
        role: Role.ADMIN,
        password: 'plaintext-attempt',
        isActive: true,
      } as any);

      expect(result.firstName).toBe('Paul');
      expect(result.lastName).toBe('Martin');
      expect(result.role).toBe(Role.COLLECTOR);
      expect(result.password).toBe('hashed-password');
    });

    it('keeps existing values when fields are omitted', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockUser });

      const result = await service.update('user-1', {});

      expect(result.firstName).toBe('Jean');
      expect(result.lastName).toBe('Dupont');
    });
  });

  describe('activate / deactivate', () => {
    it('sets isActive to true', async () => {
      mockRepository.findOne.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });
      const result = await service.activate('user-1');
      expect(result.isActive).toBe(true);
    });

    it('sets isActive to false', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockUser, isActive: true });
      const result = await service.deactivate('user-1');
      expect(result.isActive).toBe(false);
    });
  });

  describe('remove', () => {
    it('removes the user', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockUser });
      await service.remove('user-1');
      expect(mockRepository.remove).toHaveBeenCalled();
    });
  });
});
