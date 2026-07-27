import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VideosService } from './videos.service';
import { CreateYouTubeVideoDto } from './dto/create-youtube-video.dto';
import { UploadVideoUrlDto } from './dto/upload-video-url.dto';
import { ConfirmVideoDto } from './dto/confirm-video.dto';

@Controller('articles/:articleId/videos')
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Get()
  findByArticle(@Param('articleId') articleId: string) {
    return this.videosService.findByArticle(articleId);
  }

  @Post('youtube')
  @UseGuards(JwtAuthGuard)
  createYouTube(
    @Param('articleId') articleId: string,
    @Req() req: any,
    @Body() dto: CreateYouTubeVideoDto,
  ) {
    return this.videosService.createYouTube(
      articleId,
      req.user.id,
      req.user.role,
      dto,
    );
  }

  @Post('upload-url')
  @UseGuards(JwtAuthGuard)
  getUploadUrl(
    @Param('articleId') articleId: string,
    @Req() req: any,
    @Body() dto: UploadVideoUrlDto,
  ) {
    return this.videosService.getUploadUrl(
      articleId,
      req.user.id,
      req.user.role,
      dto,
    );
  }

  @Post('confirm')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  confirmUpload(
    @Param('articleId') articleId: string,
    @Req() req: any,
    @Body() dto: ConfirmVideoDto,
  ) {
    return this.videosService.confirmUpload(
      articleId,
      req.user.id,
      req.user.role,
      dto,
    );
  }
}
