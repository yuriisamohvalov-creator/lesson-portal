import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { AddArticleToCourseDto } from './dto/add-article.dto';
import { ReorderArticlesDto } from './dto/reorder-articles.dto';
import { ListCoursesDto } from './dto/list-courses.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(authorId: string, dto: CreateCourseDto) {
    const existing = await this.prisma.course.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException('Course with this slug already exists');
    }

    return this.prisma.course.create({
      data: {
        name: dto.name,
        description: dto.description,
        slug: dto.slug,
        authorId,
        status: 'draft',
      },
      include: { author: { select: { id: true, displayName: true } } },
    });
  }

  async findAllPublic(dto: ListCoursesDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { status: 'published' };
    if (dto.categoryId) {
      where.articles = {
        some: { article: { categoryId: dto.categoryId } },
      };
    }

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, displayName: true } },
          articles: {
            include: {
              article: {
                select: { id: true, title: true, slug: true, status: true },
              },
            },
            orderBy: { order: 'asc' },
          },
        },
      }),
      this.prisma.course.count({ where }),
    ]);

    return {
      data: courses,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOnePublic(id: string, user?: { id: string; role: UserRole }) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, displayName: true } },
        articles: {
          where: { article: { status: 'PUBLISHED' } },
          include: {
            article: {
              select: { id: true, title: true, slug: true, content: true },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.status !== 'published') {
      if (!user) {
        throw new NotFoundException('Course not found');
      }
      if (
        user.role !== UserRole.ADMIN &&
        user.role !== UserRole.MODERATOR &&
        course.authorId !== user.id
      ) {
        throw new NotFoundException('Course not found');
      }
    }

    return course;
  }

  async findAllAdmin() {
    return this.prisma.course.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, displayName: true } },
        _count: { select: { articles: true } },
      },
    });
  }

  async update(id: string, dto: UpdateCourseDto) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (dto.slug && dto.slug !== course.slug) {
      const existing = await this.prisma.course.findUnique({
        where: { slug: dto.slug },
      });
      if (existing) {
        throw new ConflictException('Course with this slug already exists');
      }
    }

    return this.prisma.course.update({
      where: { id },
      data: { ...dto },
      include: { author: { select: { id: true, displayName: true } } },
    });
  }

  async remove(id: string) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    await this.prisma.courseArticle.deleteMany({ where: { courseId: id } });
    return this.prisma.course.delete({ where: { id } });
  }

  async addArticle(courseId: string, dto: AddArticleToCourseDto) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const article = await this.prisma.article.findUnique({
      where: { id: dto.articleId },
    });
    if (!article) {
      throw new NotFoundException('Article not found');
    }

    const existing = await this.prisma.courseArticle.findUnique({
      where: { courseId_articleId: { courseId, articleId: dto.articleId } },
    });
    if (existing) {
      throw new ConflictException('Article already in this course');
    }

    return this.prisma.courseArticle.create({
      data: {
        courseId,
        articleId: dto.articleId,
        order: dto.order,
      },
      include: {
        article: { select: { id: true, title: true, slug: true } },
      },
    });
  }

  async removeArticle(courseId: string, articleId: string) {
    const courseArticle = await this.prisma.courseArticle.findUnique({
      where: { courseId_articleId: { courseId, articleId } },
    });
    if (!courseArticle) {
      throw new NotFoundException('Article not found in this course');
    }

    return this.prisma.courseArticle.delete({
      where: { courseId_articleId: { courseId, articleId } },
    });
  }

  async reorderArticles(courseId: string, dto: ReorderArticlesDto) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    await this.prisma.$transaction(
      dto.articles.map((item) =>
        this.prisma.courseArticle.update({
          where: {
            courseId_articleId: { courseId, articleId: item.articleId },
          },
          data: { order: item.order },
        }),
      ),
    );

    return this.prisma.courseArticle.findMany({
      where: { courseId },
      include: {
        article: { select: { id: true, title: true, slug: true } },
      },
      orderBy: { order: 'asc' },
    });
  }
}
