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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { tmpdir } from 'os';
import { extname } from 'path';
import { randomUUID } from 'crypto';
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

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: tmpdir(),
        filename: (_req, file, cb) => {
          cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
        },
      }),
      limits: { fileSize: Number(process.env.MAX_VIDEO_SIZE_MB || '500') * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        if (['.mp4', '.webm'].includes(ext)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only .mp4 and .webm files are allowed'), false);
        }
      },
    }),
  )
  uploadFile(
    @Param('articleId') articleId: string,
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Video file is required');
    }
    return this.videosService.uploadFile(
      articleId,
      req.user.id,
      req.user.role,
      file,
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
