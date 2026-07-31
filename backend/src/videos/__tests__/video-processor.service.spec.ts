import { VideoProcessorService } from '../video-processor.service';
import { VideoType } from '@prisma/client';

describe('VideoProcessorService', () => {
  it('should mark video ready when object exists in S3 and generate thumbnail', async () => {
    const prisma = {
      video: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([
            { id: 'video-1', articleId: 'a1', s3Key: 'uploads/a/file.mp4' },
          ])
          .mockResolvedValueOnce([]),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    const videosService = {
      getS3Client: jest.fn().mockReturnValue({
        send: jest.fn().mockResolvedValue({}),
      }),
      getBucket: jest.fn().mockReturnValue('lessons-videos'),
    };

    const thumbnails = {
      generateAndStore: jest.fn().mockResolvedValue('thumbnails/a1/video-1.jpg'),
    };

    const cache = {
      invalidatePattern: jest.fn().mockResolvedValue(undefined),
    };

    const service = new VideoProcessorService(
      prisma as any,
      videosService as any,
      thumbnails as any,
      cache as any,
    );
    await service.processPending();

    expect(prisma.video.update).toHaveBeenCalledWith({
      where: { id: 'video-1' },
      data: { processStatus: 'ready' },
    });
    expect(thumbnails.generateAndStore).toHaveBeenCalledWith(
      'video-1',
      'a1',
      'uploads/a/file.mp4',
    );
    expect(prisma.video.update).toHaveBeenCalledWith({
      where: { id: 'video-1' },
      data: { thumbnailKey: 'thumbnails/a1/video-1.jpg' },
    });
  });

  it('should skip update when object is missing in S3', async () => {
    const prisma = {
      video: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([
            { id: 'video-2', articleId: 'a2', s3Key: 'uploads/a/missing.mp4' },
          ])
          .mockResolvedValueOnce([]),
        update: jest.fn(),
      },
    };

    const videosService = {
      getS3Client: jest.fn().mockReturnValue({
        send: jest.fn().mockRejectedValue(new Error('NotFound')),
      }),
      getBucket: jest.fn().mockReturnValue('lessons-videos'),
    };

    const service = new VideoProcessorService(
      prisma as any,
      videosService as any,
      { generateAndStore: jest.fn() } as any,
      { invalidatePattern: jest.fn() } as any,
    );
    await service.processPending();

    expect(prisma.video.update).not.toHaveBeenCalled();
  });
});
