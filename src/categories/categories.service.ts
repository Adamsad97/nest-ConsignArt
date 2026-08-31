import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  async create(dto: CreateCategoryDto): Promise<Category> {
    const existing = await this.categoriesRepository.findOne({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Category "${dto.name}" already exists`);
    }
    return this.categoriesRepository.save(
      this.categoriesRepository.create(dto),
    );
  }

  findAll(): Promise<Category[]> {
    return this.categoriesRepository.find();
  }

  async findByIds(ids: string[]): Promise<Category[]> {
    if (ids.length === 0) {
      return [];
    }
    const categories = await this.categoriesRepository.find({
      where: { id: In(ids) },
    });
    if (categories.length !== new Set(ids).size) {
      throw new NotFoundException('One or more categories were not found');
    }
    return categories;
  }
}
