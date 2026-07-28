import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService, CACHE_KEYS } from '../cache/cache.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  private async invalidateCache() {
    await this.cache.del(CACHE_KEYS.categoriesAll);
  }

  async create(dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException('Category with this slug already exists');
    }

    const category = await this.prisma.category.create({
      data: { name: dto.name, slug: dto.slug },
    });
    await this.invalidateCache();
    return category;
  }

  async findAll() {
    const cached = await this.cache.get(CACHE_KEYS.categoriesAll);
    if (cached) return cached;

    const categories = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { articles: true } } },
    });

    await this.cache.set(CACHE_KEYS.categoriesAll, categories, 300);
    return categories;
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { articles: true } } },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (dto.slug && dto.slug !== category.slug) {
      const existing = await this.prisma.category.findUnique({
        where: { slug: dto.slug },
      });
      if (existing) {
        throw new ConflictException('Category with this slug already exists');
      }
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: { ...dto },
    });
    await this.invalidateCache();
    return updated;
  }

  async remove(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const articleCount = await this.prisma.article.count({
      where: { categoryId: id },
    });
    if (articleCount > 0) {
      throw new ConflictException(
        'Cannot delete category with existing articles',
      );
    }

    const deleted = await this.prisma.category.delete({ where: { id } });
    await this.invalidateCache();
    return deleted;
  }
}
