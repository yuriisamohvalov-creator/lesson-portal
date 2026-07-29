import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { ChangeRoleDto } from './dto/change-role.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isBlocked: true,
        createdAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        displayName: dto.displayName,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async listUsers(dto: ListUsersDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (dto.role) {
      where.role = dto.role;
    }
    if (dto.isBlocked !== undefined) {
      where.isBlocked = dto.isBlocked === 'true';
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          isBlocked: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async changeRole(userId: string, targetUserId: string, dto: ChangeRoleDto) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (targetUser.role === dto.role) {
      throw new BadRequestException('User already has this role');
    }

    // Prevent admin from demoting themselves if they're the last admin
    if (
      userId === targetUserId &&
      targetUser.role === UserRole.ADMIN &&
      dto.role !== UserRole.ADMIN
    ) {
      const adminCount = await this.prisma.user.count({
        where: { role: UserRole.ADMIN },
      });
      if (adminCount <= 1) {
        throw new ForbiddenException(
          'Cannot demote the last administrator',
        );
      }
    }

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { role: dto.role },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isBlocked: true,
        createdAt: true,
      },
    });
  }

  async blockUser(targetUserId: string) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }
    if (targetUser.isBlocked) {
      throw new BadRequestException('User is already blocked');
    }

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { isBlocked: true },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isBlocked: true,
        createdAt: true,
      },
    });
  }

  async unblockUser(targetUserId: string) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }
    if (!targetUser.isBlocked) {
      throw new BadRequestException('User is not blocked');
    }

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { isBlocked: false },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isBlocked: true,
        createdAt: true,
      },
    });
  }

  async deleteUser(requesterId: string, targetUserId: string) {
    if (requesterId === targetUserId) {
      throw new ForbiddenException('Cannot delete your own account');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (targetUser.role === UserRole.ADMIN) {
      const adminCount = await this.prisma.user.count({
        where: { role: UserRole.ADMIN },
      });
      if (adminCount <= 1) {
        throw new ForbiddenException('Cannot delete the last administrator');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const articleIds = (
        await tx.article.findMany({
          where: { authorId: targetUserId },
          select: { id: true },
        })
      ).map((a) => a.id);

      const courseIds = (
        await tx.course.findMany({
          where: { authorId: targetUserId },
          select: { id: true },
        })
      ).map((c) => c.id);

      await tx.comment.deleteMany({ where: { authorId: targetUserId } });
      await tx.moderationLog.deleteMany({ where: { moderatorId: targetUserId } });

      if (articleIds.length > 0) {
        await tx.video.deleteMany({ where: { articleId: { in: articleIds } } });
        await tx.moderationLog.deleteMany({ where: { articleId: { in: articleIds } } });
        await tx.courseArticle.deleteMany({ where: { articleId: { in: articleIds } } });
        await tx.comment.deleteMany({ where: { articleId: { in: articleIds } } });
        await tx.article.deleteMany({ where: { id: { in: articleIds } } });
      }

      if (courseIds.length > 0) {
        await tx.courseArticle.deleteMany({ where: { courseId: { in: courseIds } } });
        await tx.course.deleteMany({ where: { id: { in: courseIds } } });
      }

      await tx.user.delete({ where: { id: targetUserId } });
    });

    return { deleted: true };
  }
}
