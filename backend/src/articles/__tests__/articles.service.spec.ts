import { Test, TestingModule } from '@nestjs/testing';
import { ArticlesService } from '../articles.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ArticleStatus, UserRole } from '@prisma/client';

describe('ArticlesService', () => {
  let service: ArticlesService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      article: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      category: {
        findUnique: jest.fn(),
      },
      moderationLog: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticlesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ArticlesService>(ArticlesService);
  });

  describe('generateSlug', () => {
    it('should generate slug from title', () => {
      const slug = (service as any).generateSlug('Hello World Test');
      expect(slug).toBe('hello-world-test');
    });

    it('should handle special characters', () => {
      const slug = (service as any).generateSlug('Привет Мир! @#$%');
      expect(slug).not.toContain('@');
      expect(slug).not.toContain('#');
    });
  });

  describe('ensureUniqueSlug', () => {
    it('should return slug if unique', async () => {
      prisma.article.findFirst.mockResolvedValue(null);
      const slug = await (service as any).ensureUniqueSlug('test-slug');
      expect(slug).toBe('test-slug');
    });

    it('should add suffix on collision', async () => {
      prisma.article.findFirst
        .mockResolvedValueOnce({ id: '1' })
        .mockResolvedValueOnce(null);
      const slug = await (service as any).ensureUniqueSlug('test-slug');
      expect(slug).toBe('test-slug-2');
    });
  });

  describe('update', () => {
    it('should throw NotFoundException for non-existent article', async () => {
      prisma.article.findUnique.mockResolvedValue(null);
      await expect(
        service.update('nonexistent', 'userId', UserRole.USER, { title: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if non-author tries to edit', async () => {
      prisma.article.findUnique.mockResolvedValue({
        id: '1',
        authorId: 'other-user',
        status: ArticleStatus.DRAFT,
      });
      await expect(
        service.update('1', 'userId', UserRole.USER, { title: 'Test' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if editing PENDING article', async () => {
      prisma.article.findUnique.mockResolvedValue({
        id: '1',
        authorId: 'userId',
        status: ArticleStatus.PENDING,
      });
      await expect(
        service.update('1', 'userId', UserRole.USER, { title: 'Test' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow admin to edit any article', async () => {
      prisma.article.findUnique.mockResolvedValue({
        id: '1',
        authorId: 'other-user',
        status: ArticleStatus.DRAFT,
      });
      prisma.article.update.mockResolvedValue({ id: '1' });
      
      const result = await service.update('1', 'adminId', UserRole.ADMIN, { title: 'Test' });
      expect(result).toBeDefined();
    });
  });

  describe('submit', () => {
    it('should throw ConflictException if not DRAFT or REJECTED', async () => {
      prisma.article.findUnique.mockResolvedValue({
        id: '1',
        authorId: 'userId',
        status: ArticleStatus.PENDING,
      });
      await expect(
        service.submit('1', 'userId', UserRole.USER),
      ).rejects.toThrow(ConflictException);
    });
  });
});
