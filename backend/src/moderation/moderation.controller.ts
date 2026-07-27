import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ModerationService } from './moderation.service';
import { ModerationQueueDto } from './dto/moderation-queue.dto';
import { RejectArticleDto } from './dto/reject-article.dto';

@Controller('moderation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MODERATOR, UserRole.ADMIN)
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get('queue')
  getQueue(@Query() dto: ModerationQueueDto) {
    return this.moderationService.getQueue(dto);
  }

  @Post('articles/:id/approve')
  @HttpCode(HttpStatus.OK)
  approve(@Param('id') id: string, @Req() req: any) {
    return this.moderationService.approve(id, req.user.id);
  }

  @Post('articles/:id/reject')
  @HttpCode(HttpStatus.OK)
  reject(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: RejectArticleDto,
  ) {
    return this.moderationService.reject(id, req.user.id, dto);
  }

  @Get('articles/:id/history')
  getHistory(@Param('id') id: string) {
    return this.moderationService.getHistory(id);
  }
}
