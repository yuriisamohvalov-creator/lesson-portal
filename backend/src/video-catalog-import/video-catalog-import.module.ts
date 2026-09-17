import { Module } from '@nestjs/common';
import { VideoCatalogImportController } from './video-catalog-import.controller';
import { VideoCatalogImportService } from './video-catalog-import.service';
import { VideosModule } from '../videos/videos.module';
import { CoursesModule } from '../courses/courses.module';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [VideosModule, CoursesModule, CacheModule],
  controllers: [VideoCatalogImportController],
  providers: [VideoCatalogImportService],
})
export class VideoCatalogImportModule {}
