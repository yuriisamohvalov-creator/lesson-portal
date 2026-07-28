'use client';

import { useEffect, useState } from 'react';
import { getApiUrl } from '@/lib/api';

interface UploadedVideoProps {
  videoId: string;
  url?: string;
  processStatus?: string;
}

export function UploadedVideo({ videoId, url, processStatus }: UploadedVideoProps) {
  const [src, setSrc] = useState(url || '');

  useEffect(() => {
    if (url) {
      setSrc(url);
    }
  }, [url]);

  if (processStatus === 'pending' || (!src && !url)) {
    return (
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        Видео обрабатывается...
      </p>
    );
  }

  const streamUrl = src || getApiUrl(`/videos/${videoId}/stream`);

  return (
    <video
      controls
      preload="metadata"
      style={{ width: '100%', borderRadius: 'var(--radius)', background: '#000' }}
    >
      <source src={streamUrl} />
      Ваш браузер не поддерживает воспроизведение видео.
    </video>
  );
}
