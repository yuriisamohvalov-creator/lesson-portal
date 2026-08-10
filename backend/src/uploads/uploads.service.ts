import { BadRequestException, Injectable, OnModuleDestroy } from '@nestjs/common';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

export const ALLOWED_IMAGE_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

@Injectable()
export class UploadsService implements OnModuleDestroy {
  private readonly s3: S3Client;
  private readonly bucket = process.env.MINIO_BUCKET || 'lessons-videos';

  constructor() {
    this.s3 = new S3Client({
      endpoint: process.env.MINIO_ENDPOINT,
      region: process.env.MINIO_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.MINIO_ROOT_USER || '',
        secretAccessKey: process.env.MINIO_ROOT_PASSWORD || '',
      },
      forcePathStyle: true,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }

  onModuleDestroy() {
    this.s3.destroy();
  }

  async uploadImage(file: Express.Multer.File, userId: string) {
    if (!file?.buffer?.length) throw new BadRequestException('No image uploaded');
    const extension = ALLOWED_IMAGE_TYPES.get(file.mimetype);
    if (!extension) throw new BadRequestException('Invalid image format. Allowed: jpeg, png, webp');
    if (file.size > MAX_IMAGE_BYTES) throw new BadRequestException('Image is too large (max 5 MB)');

    const fileName = `${randomUUID()}.${extension}`;
    const key = `images/${userId}/${fileName}`;
    await this.s3.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: file.buffer, ContentType: file.mimetype }));
    return { url: `/api/uploads/images/${userId}/${fileName}` };
  }

  async getImageUrl(userId: string, fileName: string) {
    if (!/^[0-9a-f-]{36}$/i.test(userId) || !/^[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(fileName)) {
      throw new BadRequestException('Invalid image path');
    }
    return getSignedUrl(this.s3, new GetObjectCommand({ Bucket: this.bucket, Key: `images/${userId}/${fileName}` }), { expiresIn: 15 * 60 });
  }
}
