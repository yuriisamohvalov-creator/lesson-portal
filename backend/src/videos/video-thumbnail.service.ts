import { Injectable, Logger } from '@nestjs/common';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { VideoType } from '@prisma/client';
import { createWriteStream } from 'fs';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { Readable } from 'stream';
import { VideosService } from './videos.service';

const execFileAsync = promisify(execFile);
const THUMB_EXPIRES_IN = 60 * 60; // 1 hour for list cards

export type CoverVideo = {
  id: string;
  type: VideoType;
  youtubeUrl?: string | null;
  s3Key?: string | null;
  thumbnailKey?: string | null;
  processStatus?: string;
};

@Injectable()
export class VideoThumbnailService {
  private readonly logger = new Logger(VideoThumbnailService.name);

  constructor(private readonly videosService: VideosService) {}

  youtubeThumbnailUrl(youtubeUrl: string): string | null {
    const id = this.extractYoutubeId(youtubeUrl);
    if (!id) return null;
    return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  }

  extractYoutubeId(url: string): string | null {
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes('youtu.be')) {
        return parsed.pathname.replace(/^\//, '').split('/')[0] || null;
      }
      const v = parsed.searchParams.get('v');
      if (v) return v;
      const parts = parsed.pathname.split('/').filter(Boolean);
      const embedIdx = parts.findIndex((p) => p === 'embed' || p === 'live' || p === 'shorts');
      if (embedIdx >= 0 && parts[embedIdx + 1]) return parts[embedIdx + 1];
      return null;
    } catch {
      const match = url.match(
        /(?:youtu\.be\/|v=|\/embed\/|\/live\/|\/shorts\/)([A-Za-z0-9_-]{6,})/,
      );
      return match?.[1] ?? null;
    }
  }

  async getCoverUrl(video: CoverVideo | null | undefined): Promise<string | undefined> {
    if (!video) return undefined;

    if (video.type === VideoType.YOUTUBE && video.youtubeUrl) {
      return this.youtubeThumbnailUrl(video.youtubeUrl) || undefined;
    }

    if (
      video.type === VideoType.UPLOADED &&
      video.thumbnailKey &&
      video.processStatus !== 'pending'
    ) {
      return this.getThumbnailSignedUrl(video.thumbnailKey);
    }

    return undefined;
  }

  async getThumbnailSignedUrl(thumbnailKey: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.videosService.getBucket(),
      Key: thumbnailKey,
    });
    return getSignedUrl(this.videosService.getPresignS3Client(), command, {
      expiresIn: THUMB_EXPIRES_IN,
    });
  }

  /**
   * Download video from S3, extract a frame with ffmpeg, upload JPEG thumbnail.
   * Returns the S3 key or null if generation failed.
   */
  async generateAndStore(videoId: string, articleId: string, s3Key: string): Promise<string | null> {
    const s3 = this.videosService.getS3Client();
    const bucket = this.videosService.getBucket();
    const workDir = await mkdtemp(join(tmpdir(), 'lp-thumb-'));
    const videoPath = join(workDir, 'source.mp4');
    const thumbPath = join(workDir, 'thumb.jpg');
    const thumbnailKey = `thumbnails/${articleId}/${videoId}.jpg`;

    try {
      const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: s3Key }));
      if (!obj.Body) {
        throw new Error('Empty S3 object body');
      }
      await pipeline(obj.Body as Readable, createWriteStream(videoPath));

      await execFileAsync(
        'ffmpeg',
        [
          '-y',
          '-ss',
          '1',
          '-i',
          videoPath,
          '-frames:v',
          '1',
          '-q:v',
          '3',
          '-vf',
          'scale=640:-1',
          thumbPath,
        ],
        { timeout: 60_000 },
      );

      const body = await readFile(thumbPath);
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: thumbnailKey,
          Body: body,
          ContentType: 'image/jpeg',
          ContentLength: body.length,
        }),
      );

      return thumbnailKey;
    } catch (err) {
      this.logger.warn(
        `Thumbnail generation failed for video ${videoId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return null;
    } finally {
      await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}
