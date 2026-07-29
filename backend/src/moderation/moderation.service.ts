import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { ModerationQueueDto } from './dto/moderation-queue.dto';
import { RejectArticleDto } from './dto/reject-article.dto';
import { UserRole, ArticleStatus, ModerationAction } from '@prisma/client';

@Injectable()
export class ModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  private async invalidateArticleCaches() {
    await this.cache.invalidatePattern('articles:list:*');
    await this.cache.del('categories:all');
  }

  async getQueue(dto: ModerationQueueDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const where = { status: ArticleStatus.PENDING };

    const [articles, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          author: { select: { id: true, displayName: true, email: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.article.count({ where }),
    ]);

    return {
      data: articles,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async approve(articleId: string, moderatorId: string) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    if (article.status !== ArticleStatus.PENDING) {
      throw new ForbiddenException('Article is not pending moderation');
    }

    const [updatedArticle] = await this.prisma.$transaction([
      this.prisma.article.update({
        where: { id: articleId },
        data: {
          status: ArticleStatus.PUBLISHED,
          publishedAt: new Date(),
          rejectionReason: null,
        },
        include: {
          author: { select: { id: true, displayName: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.moderationLog.create({
        data: {
          articleId,
          moderatorId,
          action: ModerationAction.APPROVE,
        },
      }),
    ]);

    await this.invalidateArticleCaches();
    return updatedArticle;
  }

  async reject(articleId: string, moderatorId: string, dto: RejectArticleDto) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    if (article.status !== ArticleStatus.PENDING) {
      throw new ForbiddenException('Article is not pending moderation');
    }

    const [updatedArticle] = await this.prisma.$transaction([
      this.prisma.article.update({
        where: { id: articleId },
        data: {
          status: ArticleStatus.REJECTED,
          rejectionReason: dto.comment,
        },
        include: {
          author: { select: { id: true, displayName: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.moderationLog.create({
        data: {
          articleId,
          moderatorId,
          action: ModerationAction.REJECT,
          comment: dto.comment,
        },
      }),
    ]);

    await this.invalidateArticleCaches();
    return updatedArticle;
  }

  async getHistory(articleId: string) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    return this.prisma.moderationLog.findMany({
      where: { articleId },
      orderBy: { createdAt: 'desc' },
      include: {
        moderator: { select: { id: true, displayName: true } },
      },
    });
  }
}
