import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByArticle(articleId: string) {
    const article = await this.prisma.article.findUnique({ where: { id: articleId } });
    if (!article) {
      throw new NotFoundException('Article not found');
    }

    return this.prisma.comment.findMany({
      where: { articleId },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, displayName: true } },
      },
    });
  }

  async create(articleId: string, authorId: string, dto: CreateCommentDto) {
    const article = await this.prisma.article.findUnique({ where: { id: articleId } });
    if (!article) {
      throw new NotFoundException('Article not found');
    }

    if (article.status !== 'PUBLISHED') {
      throw new ForbiddenException('Cannot comment on non-published article');
    }

    return this.prisma.comment.create({
      data: {
        articleId,
        authorId,
        body: dto.body,
      },
      include: {
        author: { select: { id: true, displayName: true } },
      },
    });
  }

  async remove(commentId: string, userId: string, userRole: UserRole) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.authorId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    return this.prisma.comment.delete({ where: { id: commentId } });
  }
}
