import { apiFetch, getApiUrl, getAccessToken } from '@/lib/api';

export const MAX_VIDEO_MB = Number(process.env.NEXT_PUBLIC_MAX_VIDEO_SIZE_MB || '5000');
export const DIRECT_UPLOAD_MAX_MB = 100;

export type VideoTab = 'youtube' | 'upload';

export function formatMaxVideoSize(): string {
  return MAX_VIDEO_MB >= 1024 ? `${MAX_VIDEO_MB / 1024} ГБ` : `${MAX_VIDEO_MB} МБ`;
}

export function uploadWithProgress(
  xhr: XMLHttpRequest,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    xhr.timeout = 0;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      let message = `${xhr.status} ${xhr.statusText || 'Upload failed'}`;
      try {
        const err = JSON.parse(xhr.responseText);
        message = err.message || message;
      } catch {
        if (xhr.responseText.includes('SignatureDoesNotMatch')) {
          message = 'Ошибка подписи загрузки. Попробуйте ещё раз.';
        }
      }
      if (xhr.status === 413) {
        message = `Файл слишком большой (лимит ${formatMaxVideoSize()})`;
      }
      reject(new Error(message));
    };
    xhr.onerror = () =>
      reject(new Error('Соединение прервано при загрузке видео. Не закрывайте вкладку.'));
    xhr.onabort = () => reject(new Error('Загрузка видео отменена'));
  });
}

export async function uploadArticleVideo(options: {
  articleId: string;
  videoTab: VideoTab;
  youtubeUrl: string;
  videoFile: File | null;
  onProgress?: (percent: number) => void;
}): Promise<boolean> {
  const { articleId, videoTab, youtubeUrl, videoFile, onProgress } = options;

  if (videoTab === 'youtube' && youtubeUrl.trim()) {
    await apiFetch(`/articles/${articleId}/videos/youtube`, {
      method: 'POST',
      body: { youtubeUrl: youtubeUrl.trim() },
    });
    return true;
  }

  if (videoTab === 'upload' && videoFile) {
    if (videoFile.size > MAX_VIDEO_MB * 1024 * 1024) {
      throw new Error(
        `Файл слишком большой. Максимум ${formatMaxVideoSize()}`,
      );
    }

    const setProgress = onProgress || (() => undefined);
    const usePresigned = videoFile.size > DIRECT_UPLOAD_MAX_MB * 1024 * 1024;

    if (usePresigned) {
      const { uploadUrl, s3Key } = await apiFetch<{ uploadUrl: string; s3Key: string }>(
        `/articles/${articleId}/videos/upload-url`,
        {
          method: 'POST',
          body: {
            fileName: videoFile.name,
            fileSize: videoFile.size,
            contentType: videoFile.type || 'video/mp4',
          },
        },
      );

      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', videoFile.type || 'video/mp4');
      const uploadPromise = uploadWithProgress(xhr, setProgress);
      xhr.send(videoFile);
      await uploadPromise;

      await apiFetch(`/articles/${articleId}/videos/confirm`, {
        method: 'POST',
        body: { s3Key, contentType: videoFile.type || 'video/mp4' },
      });
    } else {
      const formData = new FormData();
      formData.append('file', videoFile);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', getApiUrl(`/articles/${articleId}/videos/upload`));
      const token = getAccessToken();
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      xhr.withCredentials = true;
      const uploadPromise = uploadWithProgress(xhr, setProgress);
      xhr.send(formData);
      await uploadPromise;
    }
    return true;
  }

  return false;
}
