import {
  Controller,
  Get,
  Param,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { VideosService } from './videos.service';

@Controller('videos')
export class VideosStreamController {
  constructor(private readonly videosService: VideosService) {}

  @Get(':id/stream')
  async stream(@Param('id') id: string, @Res() res: Response) {
    const url = await this.videosService.getStreamRedirectUrl(id);
    return res.redirect(HttpStatus.FOUND, url);
  }
}
