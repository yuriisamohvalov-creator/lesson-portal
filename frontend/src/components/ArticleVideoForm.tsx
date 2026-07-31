'use client';

import {
  formatMaxVideoSize,
  type VideoTab,
} from '@/lib/video-upload';

interface ArticleVideoFormProps {
  videoTab: VideoTab;
  onVideoTabChange: (tab: VideoTab) => void;
  youtubeUrl: string;
  onYoutubeUrlChange: (url: string) => void;
  onVideoFileChange: (file: File | null) => void;
  uploading?: boolean;
  uploadProgress?: number;
  disabled?: boolean;
}

export function ArticleVideoForm({
  videoTab,
  onVideoTabChange,
  youtubeUrl,
  onYoutubeUrlChange,
  onVideoFileChange,
  uploading = false,
  uploadProgress = 0,
  disabled = false,
}: ArticleVideoFormProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          className={`btn text-xs ${videoTab === 'youtube' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => onVideoTabChange('youtube')}
          disabled={disabled || uploading}
        >
          YouTube
        </button>
        <button
          type="button"
          className={`btn text-xs ${videoTab === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => onVideoTabChange('upload')}
          disabled={disabled || uploading}
        >
          Загрузить файл
        </button>
      </div>

      {videoTab === 'youtube' && (
        <div className="form-group">
          <label>Ссылка на YouTube</label>
          <input
            type="url"
            value={youtubeUrl}
            onChange={(e) => onYoutubeUrlChange(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            disabled={disabled || uploading}
          />
          <p className="mt-1 text-xs text-slate-400">
            Поддерживаются форматы: youtube.com/watch?v=... и youtu.be/...
          </p>
        </div>
      )}

      {videoTab === 'upload' && (
        <div className="form-group">
          <label>Видеофайл</label>
          <input
            type="file"
            accept=".mp4,.webm,video/mp4,video/webm"
            onChange={(e) => onVideoFileChange(e.target.files?.[0] || null)}
            disabled={disabled || uploading}
          />
          <p className="mt-1 text-xs text-slate-400">
            Допустимые форматы: MP4, WebM. Максимальный размер: {formatMaxVideoSize()}.
          </p>
          {uploading && (
            <div className="mt-3">
              <div className="mb-1 text-xs text-slate-400">Загрузка: {uploadProgress}%</div>
              <div className="h-1.5 rounded bg-slate-800">
                <div
                  className="h-full rounded bg-indigo-500 transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
