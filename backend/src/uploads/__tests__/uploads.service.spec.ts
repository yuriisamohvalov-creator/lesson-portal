import { BadRequestException } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import { UploadsService } from '../uploads.service';

describe('UploadsService', () => {
  let service: UploadsService;

  beforeEach(() => {
    jest.spyOn(S3Client.prototype, 'send').mockResolvedValue({} as never);
    service = new UploadsService();
  });

  afterEach(() => {
    service.onModuleDestroy();
    jest.restoreAllMocks();
  });

  it('uploads a supported image under the authenticated user path', async () => {
    const result = await service.uploadImage({
      buffer: Buffer.from('image'), mimetype: 'image/png', size: 5, originalname: 'image.png',
    } as Express.Multer.File, '550e8400-e29b-41d4-a716-446655440000');

    expect(result.url).toMatch(/^\/api\/uploads\/images\/550e8400-e29b-41d4-a716-446655440000\/[0-9a-f-]{36}\.png$/);
    expect(S3Client.prototype.send).toHaveBeenCalledTimes(1);
  });

  it('rejects unsupported image formats', async () => {
    await expect(service.uploadImage({
      buffer: Buffer.from('gif'), mimetype: 'image/gif', size: 3,
    } as Express.Multer.File, 'user-id')).rejects.toBeInstanceOf(BadRequestException);
  });
});
