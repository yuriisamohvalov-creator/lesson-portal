import {
  Controller,
  Get,
  Param,
  Res,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { VideosService } from './videos.service';
import { VideoThumbnailService } from './video-thumbnail.service';
import { PrismaService } from '../prisma/prisma.service';
import { VideoType } from '@prisma/client';

@Controller('videos')
export class VideosStreamController {
  constructor(
    private readonly videosService: VideosService,
    private readonly thumbnails: VideoThumbnailService,
    private readonly prisma: PrismaService,
  ) {}

  @Get(':id/stream')
  async stream(@Param('id') id: string, @Res() res: Response) {
    const url = await this.videosService.getStreamRedirectUrl(id);
    return res.redirect(HttpStatus.FOUND, url);
  }

  @Get(':id/thumbnail')
  async thumbnail(@Param('id') id: string, @Res() res: Response) {
    const video = await this.prisma.video.findUnique({ where: { id } });
    if (!video) {
      throw new NotFoundException('Video not found');
    }

    if (video.type === VideoType.YOUTUBE && video.youtubeUrl) {
      const url = this.thumbnails.youtubeThumbnailUrl(video.youtubeUrl);
      if (!url) {
        throw new NotFoundException('Thumbnail not found');
      }
      return res.redirect(HttpStatus.FOUND, url);
    }

    if (video.type === VideoType.UPLOADED && video.thumbnailKey) {
      const url = await this.thumbnails.getThumbnailSignedUrl(video.thumbnailKey);
      return res.redirect(HttpStatus.FOUND, url);
    }

    throw new NotFoundException('Thumbnail not found');
  }
}
