import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaService } from '../prisma/prisma.service';
import { CreateYouTubeVideoDto } from './dto/create-youtube-video.dto';
import { UploadVideoUrlDto } from './dto/upload-video-url.dto';
import { ConfirmVideoDto } from './dto/confirm-video.dto';
import { UserRole, VideoType } from '@prisma/client';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { createReadStream } from 'fs';
import { unlink } from 'fs/promises';

const UPLOAD_EXPIRES_IN = 2 * 60 * 60; // 2 hours for large files
const STREAM_EXPIRES_IN = 15 * 60; // 15 minutes
const ALLOWED_EXTENSIONS = ['.mp4', '.webm'];

@Injectable()
export class VideosService {
  private readonly s3: S3Client;
  private readonly presignS3: S3Client;
  private readonly bucket: string;
  private readonly maxSizeBytes: number;

  constructor(private readonly prisma: PrismaService) {
    this.bucket = process.env.MINIO_BUCKET || 'lessons-videos';
    const maxSizeMb = Number(process.env.MAX_VIDEO_SIZE_MB || '500');
    this.maxSizeBytes = maxSizeMb * 1024 * 1024;

    const credentials = {
      accessKeyId: process.env.MINIO_ROOT_USER || '',
      secretAccessKey: process.env.MINIO_ROOT_PASSWORD || '',
    };
    const region = process.env.MINIO_REGION || 'us-east-1';

    // Avoid AWS SDK flexible checksums in presigned URLs (breaks older MinIO / some proxies).
    const s3Checksums = {
      requestChecksumCalculation: 'WHEN_REQUIRED' as const,
      responseChecksumValidation: 'WHEN_REQUIRED' as const,
    };

    this.s3 = new S3Client({
      endpoint: process.env.MINIO_ENDPOINT,
      region,
      credentials,
      forcePathStyle: true,
      ...s3Checksums,
    });

    // Presigned URLs use the public site origin; nginx proxies /lessons-videos/ to MinIO
    this.presignS3 = new S3Client({
      endpoint: process.env.MINIO_PUBLIC_ENDPOINT || process.env.MINIO_ENDPOINT,
      region,
      credentials,
      forcePathStyle: true,
      ...s3Checksums,
    });
  }

  private getArticleAndCheckOwnership(
    articleId: string,
    userId: string,
    userRole: UserRole,
  ) {
    return this.prisma.article.findUnique({ where: { id: articleId } }).then((article) => {
      if (!article) {
        throw new NotFoundException('Article not found');
      }
      if (article.authorId !== userId && userRole !== UserRole.ADMIN) {
        throw new ForbiddenException('You can only manage videos for your own articles');
      }
      return article;
    });
  }

  async createYouTube(
    articleId: string,
    userId: string,
    userRole: UserRole,
    dto: CreateYouTubeVideoDto,
  ) {
    await this.getArticleAndCheckOwnership(articleId, userId, userRole);

    return this.prisma.video.create({
      data: {
        articleId,
        type: VideoType.YOUTUBE,
        youtubeUrl: dto.youtubeUrl,
      },
    });
  }

  async getUploadUrl(
    articleId: string,
    userId: string,
    userRole: UserRole,
    dto: UploadVideoUrlDto,
  ) {
    await this.getArticleAndCheckOwnership(articleId, userId, userRole);

    const ext = extname(dto.fileName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new BadRequestException('Only .mp4 and .webm files are allowed');
    }

    if (dto.fileSize > this.maxSizeBytes) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${process.env.MAX_VIDEO_SIZE_MB || '500'} MB`,
      );
    }

    const key = `uploads/${articleId}/${randomUUID()}${ext}`;
    const contentType = dto.contentType || 'video/mp4';

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
        ContentLength: dto.fileSize,
      });

      const signedUrl = await getSignedUrl(this.presignS3, command, {
        expiresIn: UPLOAD_EXPIRES_IN,
      });

      return {
        uploadUrl: signedUrl,
        s3Key: key,
        expiresIn: UPLOAD_EXPIRES_IN,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to generate upload URL');
    }
  }

  async confirmUpload(
    articleId: string,
    userId: string,
    userRole: UserRole,
    dto: ConfirmVideoDto,
  ) {
    await this.getArticleAndCheckOwnership(articleId, userId, userRole);

    return this.prisma.video.create({
      data: {
        articleId,
        type: VideoType.UPLOADED,
        s3Key: dto.s3Key,
        s3Bucket: this.bucket,
        processStatus: 'pending',
      },
    });
  }

  async uploadFile(
    articleId: string,
    userId: string,
    userRole: UserRole,
    file: Express.Multer.File,
  ) {
    await this.getArticleAndCheckOwnership(articleId, userId, userRole);

    const ext = extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new BadRequestException('Only .mp4 and .webm files are allowed');
    }

    if (file.size > this.maxSizeBytes) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${process.env.MAX_VIDEO_SIZE_MB || '500'} MB`,
      );
    }

    const key = `uploads/${articleId}/${randomUUID()}${ext}`;
    const contentType = file.mimetype || 'video/mp4';

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: createReadStream(file.path),
          ContentType: contentType,
          ContentLength: file.size,
        }),
      );

      return this.prisma.video.create({
        data: {
          articleId,
          type: VideoType.UPLOADED,
          s3Key: key,
          s3Bucket: this.bucket,
          processStatus: 'ready',
        },
      });
    } catch {
      throw new InternalServerErrorException('Failed to upload video');
    } finally {
      await unlink(file.path).catch(() => undefined);
    }
  }

  getS3Client() {
    return this.s3;
  }

  getBucket() {
    return this.bucket;
  }

  async attachStreamUrls<T extends { type: VideoType; s3Key: string | null; processStatus: string }>(
    videos: T[],
  ): Promise<(T & { url?: string })[]> {
    return Promise.all(
      videos.map(async (video) => {
        if (
          video.type === VideoType.UPLOADED &&
          video.s3Key &&
          video.processStatus === 'ready'
        ) {
          const streamUrl = await this.getStreamUrl(video.s3Key);
          return { ...video, url: streamUrl };
        }
        return video;
      }),
    );
  }

  async findByArticle(articleId: string) {
    const article = await this.prisma.article.findUnique({ where: { id: articleId } });
    if (!article) {
      throw new NotFoundException('Article not found');
    }

    const videos = await this.prisma.video.findMany({ where: { articleId } });
    return this.attachStreamUrls(videos);
  }

  async remove(
    articleId: string,
    videoId: string,
    userId: string,
    userRole: UserRole,
  ) {
    await this.getArticleAndCheckOwnership(articleId, userId, userRole);

    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video || video.articleId !== articleId) {
      throw new NotFoundException('Video not found');
    }

    if (video.s3Key) {
      try {
        await this.s3.send(
          new DeleteObjectCommand({
            Bucket: video.s3Bucket || this.bucket,
            Key: video.s3Key,
          }),
        );
      } catch {
        // Object may already be gone; still remove the DB row.
      }
    }

    await this.prisma.video.delete({ where: { id: videoId } });
    return { deleted: true };
  }

  async getStreamRedirectUrl(videoId: string) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video || video.type !== VideoType.UPLOADED || !video.s3Key) {
      throw new NotFoundException('Video not found');
    }

    return this.getStreamUrl(video.s3Key);
  }

  private async getStreamUrl(s3Key: string) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
      });

      const signedUrl = await getSignedUrl(this.presignS3, command, {
        expiresIn: STREAM_EXPIRES_IN,
      });

      return signedUrl;
    } catch {
      throw new InternalServerErrorException('Failed to generate stream URL');
    }
  }
}
