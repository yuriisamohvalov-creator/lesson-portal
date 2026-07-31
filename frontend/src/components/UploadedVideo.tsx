'use client';

import { useState } from 'react';
import { getApiUrl } from '@/lib/api';

interface UploadedVideoProps {
  videoId: string;
  url?: string;
  processStatus?: string;
}

export function UploadedVideo({ videoId, processStatus }: UploadedVideoProps) {
  const [failed, setFailed] = useState(false);

  if (processStatus === 'pending') {
    return (
      <p className="text-sm text-slate-400">Видео обрабатывается...</p>
    );
  }

  if (failed) {
    return (
      <p className="text-sm text-slate-400">
        Не удалось загрузить видео. Файл отсутствует или ещё не готов — попробуйте
        перезагрузить страницу или загрузите видео заново.
      </p>
    );
  }

  // Always use the stream endpoint so the backend issues a fresh presigned URL
  // (article payloads may contain expired or mis-hosted signed URLs).
  const streamUrl = getApiUrl(`/videos/${videoId}/stream`);

  return (
    <video
      controls
      preload="metadata"
      className="w-full rounded-2xl border border-slate-800 bg-black"
      onError={() => setFailed(true)}
    >
      <source src={streamUrl} type="video/mp4" />
      Ваш браузер не поддерживает воспроизведение видео.
    </video>
  );
}
