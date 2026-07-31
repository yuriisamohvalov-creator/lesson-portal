import { VideoThumbnailService } from '../video-thumbnail.service';

describe('VideoThumbnailService', () => {
  const service = new VideoThumbnailService({} as any);

  it('extracts YouTube id from watch URL', () => {
    expect(
      service.extractYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
    ).toBe('dQw4w9WgXcQ');
  });

  it('extracts YouTube id from youtu.be URL', () => {
    expect(service.extractYoutubeId('https://youtu.be/dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ',
    );
  });

  it('builds hqdefault thumbnail URL', () => {
    expect(
      service.youtubeThumbnailUrl('https://www.youtube.com/watch?v=abc123XYZ_-'),
    ).toBe('https://i.ytimg.com/vi/abc123XYZ_-/hqdefault.jpg');
  });
});
