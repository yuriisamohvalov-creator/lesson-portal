import { Module } from '@nestjs/common';
import { VideosController } from './videos.controller';
import { VideosStreamController } from './videos-stream.controller';
import { VideosService } from './videos.service';

@Module({
  controllers: [VideosController, VideosStreamController],
  providers: [VideosService],
  exports: [VideosService],
})
export class VideosModule {}
