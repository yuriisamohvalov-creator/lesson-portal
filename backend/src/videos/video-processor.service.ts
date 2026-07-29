import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { HeadObjectCommand } from '@aws-sdk/client-s3';
import { PrismaService } from '../prisma/prisma.service';
import { VideosService } from './videos.service';
import { VideoType } from '@prisma/client';

const POLL_INTERVAL_MS = 10_000;

@Injectable()
export class VideoProcessorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VideoProcessorService.name);
  private timer?: NodeJS.Timeout;
  private processing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly videosService: VideosService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.processPending(), POLL_INTERVAL_MS);
    void this.processPending();
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async processPending() {
    if (this.processing) return;
    this.processing = true;

    try {
      const pending = await this.prisma.video.findMany({
        where: {
          type: VideoType.UPLOADED,
          processStatus: 'pending',
          s3Key: { not: null },
        },
        take: 10,
        orderBy: { createdAt: 'asc' },
      });

      for (const video of pending) {
        await this.processVideo(video.id, video.s3Key!);
      }
    } catch (err) {
      this.logger.error('Video processing failed', err);
    } finally {
      this.processing = false;
    }
  }

  private async processVideo(videoId: string, s3Key: string) {
    const s3 = this.videosService.getS3Client();
    const bucket = this.videosService.getBucket();

    try {
      await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: s3Key }));
      await this.prisma.video.update({
        where: { id: videoId },
        data: { processStatus: 'ready' },
      });
      this.logger.log(`Video ${videoId} is ready`);
    } catch {
      // File not yet uploaded to S3 — will retry on next poll
    }
  }
}
