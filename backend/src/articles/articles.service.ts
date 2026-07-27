import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ListArticlesDto } from './dto/list-articles.dto';
import { UserRole, ArticleStatus, ModerationAction } from '@prisma/client';
import sanitizeHtml from 'sanitize-html';

@Injectable()
export class ArticlesService {
  constructor(private readonly prisma: PrismaService) {}

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private async ensureUniqueSlug(slug: string, excludeId?: string): Promise<string> {
    let candidate = slug;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.article.findFirst({
        where: {
          slug: candidate,
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
      });

      if (!existing) {
        return candidate;
      }

      counter++;
      candidate = `${slug}-${counter}`;
    }
  }

  private sanitizeContent(content: string | null): string | null {
    if (!content) return null;
    return sanitizeHtml(content, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat([
        'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'figure', 'figcaption', 'video', 'source',
        'pre', 'code', 'span', 'div', 'table', 'thead',
        'tbody', 'tr', 'th', 'td', 'blockquote',
      ]),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        img: ['src', 'alt', 'title', 'width', 'height'],
        a: ['href', 'target', 'rel', 'title'],
        code: ['class'],
        pre: ['class'],
        span: ['class'],
        div: ['class'],
      },
      allowedSchemes: ['http', 'https', 'mailto'],
    });
  }

  async create(authorId: string, dto: CreateArticleDto) {
    // Verify category exists
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const slug = await this.ensureUniqueSlug(this.generateSlug(dto.title));
    const content = this.sanitizeContent(dto.content || null);

    return this.prisma.article.create({
      data: {
        title: dto.title,
        slug,
        content,
        authorId,
        categoryId: dto.categoryId,
        status: ArticleStatus.DRAFT,
      },
      include: {
        author: { select: { id: true, displayName: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async update(id: string, userId: string, userRole: UserRole, dto: UpdateArticleDto) {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) {
      throw new NotFoundException('Article not found');
    }

    // Only author can edit
    if (article.authorId !== userId && userRole === UserRole.USER) {
      throw new ForbiddenException('You can only edit your own articles');
    }

    // Can only edit DRAFT or REJECTED
    if (article.status !== ArticleStatus.DRAFT && article.status !== ArticleStatus.REJECTED) {
      throw new ConflictException('Cannot edit article in current status');
    }

    const data: any = {};
    if (dto.title !== undefined) {
      data.title = dto.title;
      data.slug = await this.ensureUniqueSlug(
        this.generateSlug(dto.title),
        id,
      );
    }
    if (dto.content !== undefined) {
      data.content = this.sanitizeContent(dto.content);
    }
    if (dto.categoryId !== undefined) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
      data.categoryId = dto.categoryId;
    }

    return this.prisma.article.update({
      where: { id },
      data,
      include: {
        author: { select: { id: true, displayName: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async submit(id: string, userId: string, userRole: UserRole) {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) {
      throw new NotFoundException('Article not found');
    }

    // Only author can submit (or admin)
    if (article.authorId !== userId && userRole === UserRole.USER) {
      throw new ForbiddenException('You can only submit your own articles');
    }

    if (article.status !== ArticleStatus.DRAFT && article.status !== ArticleStatus.REJECTED) {
      throw new ConflictException('Can only submit DRAFT or REJECTED articles');
    }

    return this.prisma.article.update({
      where: { id },
      data: { status: ArticleStatus.PENDING },
      include: {
        author: { select: { id: true, displayName: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async findOne(id: string, user?: { id: string; role: UserRole }) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, displayName: true } },
        category: { select: { id: true, name: true, slug: true } },
        videos: true,
      },
    });

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    if (article.status === ArticleStatus.PUBLISHED) {
      return article;
    }

    if (!user) {
      throw new NotFoundException('Article not found');
    }

    if (article.authorId === user.id) {
      return article;
    }

    if (user.role === UserRole.ADMIN || user.role === UserRole.MODERATOR) {
      return article;
    }

    throw new NotFoundException('Article not found');
  }

  async findAll(dto: ListArticlesDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { status: ArticleStatus.PUBLISHED };

    if (dto.categoryId) {
      where.categoryId = dto.categoryId;
    }

    if (dto.search) {
      where.title = { contains: dto.search, mode: 'insensitive' };
    }

    const [articles, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, displayName: true } },
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

  async findMine(userId: string) {
    const articles = await this.prisma.article.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        moderationLogs: {
          where: { action: ModerationAction.REJECT },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { comment: true, createdAt: true },
        },
      },
    });

    return articles.map((article) => ({
      ...article,
      lastRejectionComment: article.moderationLogs[0]?.comment || null,
      moderationLogs: undefined,
    }));
  }

  async remove(id: string, userId: string, userRole: UserRole) {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) {
      throw new NotFoundException('Article not found');
    }

    // Only author or admin can delete
    if (article.authorId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only delete your own articles');
    }

    // Can only delete DRAFT or REJECTED
    if (article.status !== ArticleStatus.DRAFT && article.status !== ArticleStatus.REJECTED) {
      throw new ConflictException('Cannot delete article in current status');
    }

    return this.prisma.article.delete({ where: { id } });
  }
}
