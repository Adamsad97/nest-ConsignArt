import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ArtistsService } from './artists.service';
import { Artist } from './entities/artist.entity';
import { UsersService } from '../users/users.service';
import { Role } from '../users/enums/role.enum';
import { ForbiddenException } from '@nestjs/common';

const mockGallery = {
  id: 'gallery-1',
  email: 'gallery@test.com',
  role: Role.GALLERY,
  isActive: true,
};
const mockArtist = {
  id: 'artist-1',
  firstName: 'Pablo',
  lastName: 'Picasso',
  isActive: true,
  gallery: mockGallery,
  user: null,
};

const mockRepo = {
  create: vi.fn((data: any) => ({ ...data, id: 'new-id' })),
  save: vi.fn((data: any) => Promise.resolve(data)),
  find: vi.fn(),
  findOne: vi.fn(),
};

const mockUsersService = {
  findOne: vi.fn(),
};

describe('ArtistsService', () => {
  let service: ArtistsService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArtistsService,
        { provide: getRepositoryToken(Artist), useValue: mockRepo },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<ArtistsService>(ArtistsService);
  });

  describe('findAll', () => {
    it('returns all artists for admin', async () => {
      mockRepo.find.mockResolvedValue([mockArtist]);
      const adminUser = {
        id: 'admin-1',
        email: 'admin@test.com',
        role: Role.ADMIN,
      };
      const result = await service.findAll(adminUser);
      expect(result).toHaveLength(1);
      expect(mockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ relations: expect.anything() }),
      );
    });

    it('returns only gallery artists for gallery user', async () => {
      mockRepo.find.mockResolvedValue([mockArtist]);
      const galleryUser = {
        id: 'gallery-1',
        email: 'gallery@test.com',
        role: Role.GALLERY,
      };
      await service.findAll(galleryUser);
      expect(mockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { gallery: { id: 'gallery-1' } } }),
      );
    });
  });

  describe('create', () => {
    it('creates an artist linked to the gallery', async () => {
      mockUsersService.findOne.mockResolvedValue(mockGallery);
      mockRepo.findOne.mockResolvedValue(null);

      const galleryUser = {
        id: 'gallery-1',
        email: 'gallery@test.com',
        role: Role.GALLERY,
      };
      const dto = { firstName: 'Pablo', lastName: 'Picasso' };

      await service.create(dto, galleryUser);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ gallery: mockGallery }),
      );
      expect(mockRepo.save).toHaveBeenCalled();
    });
  });

  describe('activate', () => {
    it('reactivates a previously deactivated artist', async () => {
      const gallery = { id: 'gallery-1' };
      mockRepo.findOne.mockResolvedValue({
        ...mockArtist,
        gallery,
        isActive: false,
      });

      const galleryUser = {
        id: 'gallery-1',
        email: 'gallery@test.com',
        role: Role.GALLERY,
      };
      const result = await service.activate('artist-1', galleryUser);

      expect(result.isActive).toBe(true);
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true }),
      );
    });

    it('throws ForbiddenException when a different gallery tries to activate', async () => {
      mockRepo.findOne.mockResolvedValue({
        ...mockArtist,
        gallery: { id: 'other-gallery' },
        isActive: false,
      });

      const galleryUser = {
        id: 'gallery-1',
        email: 'gallery@test.com',
        role: Role.GALLERY,
      };
      await expect(service.activate('artist-1', galleryUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('remove', () => {
    it('soft-deletes by setting isActive to false', async () => {
      const gallery = { id: 'gallery-1' };
      mockRepo.findOne.mockResolvedValue({ ...mockArtist, gallery });

      const galleryUser = {
        id: 'gallery-1',
        email: 'gallery@test.com',
        role: Role.GALLERY,
      };
      await service.remove('artist-1', galleryUser);

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });

    it('throws ForbiddenException when wrong gallery tries to remove', async () => {
      mockRepo.findOne.mockResolvedValue({
        ...mockArtist,
        gallery: { id: 'other-gallery' },
      });

      const galleryUser = {
        id: 'gallery-1',
        email: 'gallery@test.com',
        role: Role.GALLERY,
      };
      await expect(service.remove('artist-1', galleryUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
