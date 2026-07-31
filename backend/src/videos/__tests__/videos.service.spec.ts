import { Test, TestingModule } from '@nestjs/testing';
import { VideosService } from '../videos.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole, VideoType } from '@prisma/client';
import { CreateYouTubeVideoDto } from '../dto/create-youtube-video.dto';
import { UploadVideoUrlDto } from '../dto/upload-video-url.dto';

describe('VideosService', () => {
  let service: VideosService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      article: {
        findUnique: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      video: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideosService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: CacheService,
          useValue: { invalidatePattern: jest.fn(async () => undefined) },
        },
      ],
    }).compile();

    service = module.get<VideosService>(VideosService);
  });

  describe('createYouTube', () => {
    it('should create a YouTube video for article author', async () => {
      const dto: CreateYouTubeVideoDto = {
        youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      };
      prisma.article.findUnique.mockResolvedValue({ id: 'article-1', authorId: 'user-1' });
      prisma.video.create.mockResolvedValue({ id: 'video-1', type: VideoType.YOUTUBE });

      const result = await service.createYouTube('article-1', 'user-1', UserRole.USER, dto);

      expect(result.type).toBe(VideoType.YOUTUBE);
      expect(prisma.video.create).toHaveBeenCalled();
    });

    it('should reject non-author user', async () => {
      prisma.article.findUnique.mockResolvedValue({ id: 'article-1', authorId: 'author-1' });

      await expect(
        service.createYouTube('article-1', 'user-1', UserRole.USER, {
          youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to add video to any article', async () => {
      prisma.article.findUnique.mockResolvedValue({ id: 'article-1', authorId: 'author-1' });
      prisma.video.create.mockResolvedValue({ id: 'video-1' });

      const result = await service.createYouTube('article-1', 'admin-1', UserRole.ADMIN, {
        youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      });

      expect(result).toBeDefined();
    });
  });

  describe('getUploadUrl', () => {
    it('should reject files with invalid extension', async () => {
      prisma.article.findUnique.mockResolvedValue({ id: 'article-1', authorId: 'user-1' });

      await expect(
        service.getUploadUrl('article-1', 'user-1', UserRole.USER, {
          fileName: 'video.avi',
          fileSize: 1024,
        } as UploadVideoUrlDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject files exceeding max size', async () => {
      prisma.article.findUnique.mockResolvedValue({ id: 'article-1', authorId: 'user-1' });
      const maxMb = Number(process.env.MAX_VIDEO_SIZE_MB || '5000');

      await expect(
        service.getUploadUrl('article-1', 'user-1', UserRole.USER, {
          fileName: 'video.mp4',
          fileSize: (maxMb + 1) * 1024 * 1024,
        } as UploadVideoUrlDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByArticle', () => {
    it('should throw NotFoundException if article does not exist', async () => {
      prisma.article.findUnique.mockResolvedValue(null);

      await expect(service.findByArticle('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete video for article author', async () => {
      prisma.article.findUnique.mockResolvedValue({ id: 'article-1', authorId: 'user-1' });
      prisma.video.findUnique.mockResolvedValue({
        id: 'video-1',
        articleId: 'article-1',
        s3Key: null,
      });
      prisma.video.delete.mockResolvedValue({ id: 'video-1' });

      const result = await service.remove('article-1', 'video-1', 'user-1', UserRole.USER);

      expect(result).toEqual({ deleted: true });
      expect(prisma.video.delete).toHaveBeenCalledWith({ where: { id: 'video-1' } });
    });

    it('should reject deletion for non-author', async () => {
      prisma.article.findUnique.mockResolvedValue({ id: 'article-1', authorId: 'author-1' });

      await expect(
        service.remove('article-1', 'video-1', 'user-1', UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
