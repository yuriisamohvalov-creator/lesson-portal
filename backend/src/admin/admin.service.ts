import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminArticlesDto } from './dto/admin-articles.dto';
import { UserRole, ArticleStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [
      usersByRole,
      articlesByStatus,
      totalCourses,
      videosByType,
    ] = await Promise.all([
      this.prisma.user.groupBy({
        by: ['role'],
        _count: true,
      }),
      this.prisma.article.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.course.count(),
      this.prisma.video.groupBy({
        by: ['type'],
        _count: true,
      }),
    ]);

    const usersByRoleMap: Record<string, number> = {};
    for (const item of usersByRole) {
      usersByRoleMap[item.role] = item._count;
    }

    const articlesByStatusMap: Record<string, number> = {};
    let totalArticles = 0;
    for (const item of articlesByStatus) {
      articlesByStatusMap[item.status] = item._count;
      totalArticles += item._count;
    }

    const videosByTypeMap: Record<string, number> = { YOUTUBE: 0, UPLOADED: 0 };
    let totalVideos = 0;
    for (const item of videosByType) {
      videosByTypeMap[item.type] = item._count;
      totalVideos += item._count;
    }

    return {
      users: {
        total: Object.values(usersByRoleMap).reduce((a, b) => a + b, 0),
        byRole: {
          USER: usersByRoleMap['USER'] || 0,
          MODERATOR: usersByRoleMap['MODERATOR'] || 0,
          ADMIN: usersByRoleMap['ADMIN'] || 0,
        },
      },
      articles: {
        total: totalArticles,
        byStatus: {
          DRAFT: articlesByStatusMap['DRAFT'] || 0,
          PENDING: articlesByStatusMap['PENDING'] || 0,
          PUBLISHED: articlesByStatusMap['PUBLISHED'] || 0,
          REJECTED: articlesByStatusMap['REJECTED'] || 0,
        },
      },
      courses: {
        total: totalCourses,
      },
      videos: {
        total: totalVideos,
        byType: {
          YOUTUBE: videosByTypeMap['YOUTUBE'] || 0,
          UPLOADED: videosByTypeMap['UPLOADED'] || 0,
        },
      },
    };
  }

  async getAllArticles(dto: AdminArticlesDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (dto.status) {
      where.status = dto.status;
    }

    if (dto.authorId) {
      where.authorId = dto.authorId;
    }

    if (dto.categoryId) {
      where.categoryId = dto.categoryId;
    }

    const [articles, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
}
