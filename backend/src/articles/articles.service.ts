import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VideosService } from '../videos/videos.service';
import { VideoThumbnailService } from '../videos/video-thumbnail.service';
import { CacheService, CACHE_KEYS } from '../cache/cache.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ListArticlesDto } from './dto/list-articles.dto';
import { UserRole, ArticleStatus, ModerationAction, VideoType } from '@prisma/client';
import sanitizeHtml from 'sanitize-html';

@Injectable()
export class ArticlesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly videosService: VideosService,
    private readonly videoThumbnails: VideoThumbnailService,
    private readonly cache: CacheService,
  ) {}

  async invalidatePublicListCache() {
    await this.cache.invalidatePattern('articles:list:*');
  }

  private buildListCacheKey(dto: ListArticlesDto) {
    return CACHE_KEYS.articlesList(
      JSON.stringify({
        page: dto.page || 1,
        limit: dto.limit || 20,
        categoryId: dto.categoryId || '',
        search: dto.search || '',
      }),
    );
  }

  private generateSlug(title: string): string {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return slug || 'article';
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

    if (!this.canManageArticle(article.authorId, userId, userRole)) {
      throw new ForbiddenException('You can only edit your own articles');
    }

    const data: Record<string, unknown> = {};
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

    // Any content change returns the article to DRAFT and requires re-moderation.
    if (Object.keys(data).length > 0 && article.status !== ArticleStatus.DRAFT) {
      data.status = ArticleStatus.DRAFT;
    }

    const updated = await this.prisma.article.update({
      where: { id },
      data,
      include: {
        author: { select: { id: true, displayName: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    if (data.status === ArticleStatus.DRAFT) {
      await this.invalidatePublicListCache();
    }

    return updated;
  }

  async submit(id: string, userId: string, userRole: UserRole) {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) {
      throw new NotFoundException('Article not found');
    }

    if (!this.canManageArticle(article.authorId, userId, userRole)) {
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

  /** Author, moderator, or admin may edit/submit an article. */
  private canManageArticle(authorId: string, userId: string, userRole: UserRole): boolean {
    return (
      authorId === userId ||
      userRole === UserRole.ADMIN ||
      userRole === UserRole.MODERATOR
    );
  }

  private async buildCourseNav(
    articleId: string,
    courseId: string | undefined,
    user?: { id: string; role: UserRole },
  ) {
    const isPrivileged =
      user?.role === UserRole.ADMIN || user?.role === UserRole.MODERATOR;

    const memberships = await this.prisma.courseArticle.findMany({
      where: { articleId },
      include: {
        course: { select: { id: true, name: true, status: true } },
      },
    });

    const publishedCourses = memberships.filter(
      (membership) => membership.course.status === 'published',
    );
    if (publishedCourses.length === 0) {
      return null;
    }

    let selected = publishedCourses[0];
    if (courseId) {
      const match = publishedCourses.find(
        (membership) => membership.courseId === courseId,
      );
      if (match) {
        selected = match;
      }
    }

    const courseArticles = await this.prisma.courseArticle.findMany({
      where: {
        courseId: selected.courseId,
        ...(isPrivileged
          ? {}
          : { article: { status: ArticleStatus.PUBLISHED } }),
      },
      orderBy: { order: 'asc' },
      include: {
        article: { select: { id: true, title: true, status: true } },
      },
    });

    const visible = isPrivileged
      ? courseArticles
      : courseArticles.filter(
          (entry) => entry.article.status === ArticleStatus.PUBLISHED,
        );

    const index = visible.findIndex((entry) => entry.articleId === articleId);
    if (index === -1) {
      return null;
    }

    return {
      course: {
        id: selected.course.id,
        name: selected.course.name,
      },
      previous:
        index > 0
          ? {
              id: visible[index - 1].article.id,
              title: visible[index - 1].article.title,
            }
          : null,
      next:
        index < visible.length - 1
          ? {
              id: visible[index + 1].article.id,
              title: visible[index + 1].article.title,
            }
          : null,
    };
  }

  async findOne(
    id: string,
    user?: { id: string; role: UserRole },
    courseId?: string,
  ) {
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

    let visible = false;

    if (article.status === ArticleStatus.PUBLISHED) {
      visible = true;
    } else if (user) {
      visible =
        article.authorId === user.id ||
        user.role === UserRole.ADMIN ||
        user.role === UserRole.MODERATOR;
    }

    if (!visible) {
      throw new NotFoundException('Article not found');
    }

    const courseNav = await this.buildCourseNav(id, courseId, user);

    return {
      ...article,
      videos: await this.videosService.attachStreamUrls(article.videos),
      courseNav,
    };
  }

  async findAll(dto: ListArticlesDto) {
    const cacheKey = this.buildListCacheKey(dto);
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

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
          videos: {
            orderBy: { createdAt: 'asc' },
            take: 1,
            select: {
              id: true,
              type: true,
              youtubeUrl: true,
              thumbnailKey: true,
              processStatus: true,
            },
          },
        },
      }),
      this.prisma.article.count({ where }),
    ]);

    const data = await Promise.all(
      articles.map(async (article) => {
        const coverUrl = await this.resolveCoverUrl(article.videos[0]);
        const { videos, ...rest } = article;
        return { ...rest, coverUrl, hasVideo: videos.length > 0 };
      }),
    );

    const result = {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    await this.cache.set(cacheKey, result, 60);
    return result;
  }

  private async resolveCoverUrl(
    video?: {
      id: string;
      type: VideoType;
      youtubeUrl: string | null;
      thumbnailKey: string | null;
      processStatus: string;
    } | null,
  ): Promise<string | undefined> {
    if (!video) return undefined;

    if (video.type === VideoType.YOUTUBE && video.youtubeUrl) {
      return this.videoThumbnails.youtubeThumbnailUrl(video.youtubeUrl) || undefined;
    }

    if (
      video.type === VideoType.UPLOADED &&
      video.thumbnailKey &&
      video.processStatus === 'ready'
    ) {
      // Stable same-origin URL; backend redirects to a fresh signed MinIO object.
      return `/api/videos/${video.id}/thumbnail`;
    }

    return undefined;
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

    await this.prisma.$transaction([
      this.prisma.moderationLog.deleteMany({ where: { articleId: id } }),
      this.prisma.video.deleteMany({ where: { articleId: id } }),
      this.prisma.courseArticle.deleteMany({ where: { articleId: id } }),
      this.prisma.article.delete({ where: { id } }),
    ]);

    await this.invalidatePublicListCache();

    return { success: true };
  }
}
