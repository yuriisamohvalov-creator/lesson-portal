import { Module } from '@nestjs/common';
import { VideosController } from './videos.controller';
import { VideosStreamController } from './videos-stream.controller';
import { VideosService } from './videos.service';
import { VideoProcessorService } from './video-processor.service';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [CacheModule],
  controllers: [VideosController, VideosStreamController],
  providers: [VideosService, VideoProcessorService],
  exports: [VideosService],
})
export class VideosModule {}
