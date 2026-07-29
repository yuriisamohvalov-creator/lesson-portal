import { VideoProcessorService } from '../video-processor.service';
import { VideoType } from '@prisma/client';

describe('VideoProcessorService', () => {
  it('should mark video ready when object exists in S3', async () => {
    const prisma = {
      video: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'video-1', s3Key: 'uploads/a/file.mp4' },
        ]),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    const videosService = {
      getS3Client: jest.fn().mockReturnValue({
        send: jest.fn().mockResolvedValue({}),
      }),
      getBucket: jest.fn().mockReturnValue('lessons-videos'),
    };

    const service = new VideoProcessorService(prisma as any, videosService as any);
    await service.processPending();

    expect(prisma.video.update).toHaveBeenCalledWith({
      where: { id: 'video-1' },
      data: { processStatus: 'ready' },
    });
  });

  it('should skip update when object is missing in S3', async () => {
    const prisma = {
      video: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'video-2', s3Key: 'uploads/a/missing.mp4' },
        ]),
        update: jest.fn(),
      },
    };

    const videosService = {
      getS3Client: jest.fn().mockReturnValue({
        send: jest.fn().mockRejectedValue(new Error('NotFound')),
      }),
      getBucket: jest.fn().mockReturnValue('lessons-videos'),
    };

    const service = new VideoProcessorService(prisma as any, videosService as any);
    await service.processPending();

    expect(prisma.video.update).not.toHaveBeenCalled();
  });
});
