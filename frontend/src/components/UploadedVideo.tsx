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
      <p className="text-sm text-slate-400">Видео обрабатывается...</p>
    );
  }

  const streamUrl = src || getApiUrl(`/videos/${videoId}/stream`);

  return (
    <video
      controls
      preload="metadata"
      className="w-full rounded-2xl border border-slate-800 bg-black"
    >
      <source src={streamUrl} />
      Ваш браузер не поддерживает воспроизведение видео.
    </video>
  );
}
