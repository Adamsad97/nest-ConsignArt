import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CategoriesService } from './categories.service';
import { Category } from './entities/category.entity';

const mockCategoriesRepository = {
  create: vi.fn((data: any) => ({ ...data, id: 'category-1' })),
  save: vi.fn((data: any) => Promise.resolve(data)),
  find: vi.fn(),
  findOne: vi.fn(),
};

describe('CategoriesService', () => {
  let service: CategoriesService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: getRepositoryToken(Category),
          useValue: mockCategoriesRepository,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  describe('create', () => {
    it('throws ConflictException when the category name already exists', async () => {
      mockCategoriesRepository.findOne.mockResolvedValue({
        id: 'category-1',
        name: 'Impressionism',
      });

      await expect(service.create({ name: 'Impressionism' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('creates the category', async () => {
      mockCategoriesRepository.findOne.mockResolvedValue(null);

      const result = await service.create({ name: 'Impressionism' });

      expect(result.name).toBe('Impressionism');
    });
  });

  describe('findByIds', () => {
    it('returns an empty array when no ids are given', async () => {
      const result = await service.findByIds([]);
      expect(result).toEqual([]);
      expect(mockCategoriesRepository.find).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when some ids do not exist', async () => {
      mockCategoriesRepository.find.mockResolvedValue([
        { id: 'category-1', name: 'Impressionism' },
      ]);

      await expect(
        service.findByIds(['category-1', 'category-2']),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns the matching categories', async () => {
      mockCategoriesRepository.find.mockResolvedValue([
        { id: 'category-1', name: 'Impressionism' },
      ]);

      const result = await service.findByIds(['category-1']);

      expect(result).toEqual([{ id: 'category-1', name: 'Impressionism' }]);
    });
  });
});
