'use client';

import { useState, useEffect, useRef } from 'react';
import { apiFetch, getApiUrl, getAccessToken, getApiErrorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { PdfImportButton } from '@/components/PdfImportButton';

const MAX_VIDEO_MB = Number(process.env.NEXT_PUBLIC_MAX_VIDEO_SIZE_MB || '5000');
const DIRECT_UPLOAD_MAX_MB = 100;

function uploadWithProgress(
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
        message = `Файл слишком большой (лимит ${MAX_VIDEO_MB >= 1024 ? `${MAX_VIDEO_MB / 1024} ГБ` : `${MAX_VIDEO_MB} МБ`})`;
      }
      reject(new Error(message));
    };
    xhr.onerror = () => reject(new Error('Соединение прервано при загрузке видео. Не закрывайте вкладку.'));
    xhr.onabort = () => reject(new Error('Загрузка видео отменена'));
  });
}

const TOOLBAR_BUTTONS = [
  { label: 'B', title: 'Жирный', command: 'bold' },
  { label: 'I', title: 'Курсив', command: 'italic' },
  { label: 'U', title: 'Подчёркнутый', command: 'underline' },
  { label: 'H1', title: 'Заголовок 1', command: 'formatBlock', value: 'h1' },
  { label: 'H2', title: 'Заголовок 2', command: 'formatBlock', value: 'h2' },
  { label: 'H3', title: 'Заголовок 3', command: 'formatBlock', value: 'h3' },
  { label: 'P', title: 'Абзац', command: 'formatBlock', value: 'p' },
  { label: 'UL', title: 'Маркированный список', command: 'insertUnorderedList' },
  { label: 'OL', title: 'Нумерованный список', command: 'insertOrderedList' },
  { label: '🔗', title: 'Ссылка', command: 'createLink' },
  { label: '📷', title: 'Изображение', command: 'insertImage' },
  { label: '⟨/⟩', title: 'Код', command: 'formatBlock', value: 'pre' },
  { label: '❝', title: 'Цитата', command: 'formatBlock', value: 'blockquote' },
];

export default function CreateArticlePage() {
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [videoTab, setVideoTab] = useState<'youtube' | 'upload'>('youtube');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [content, setContent] = useState('');
  const [draftId, setDraftId] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/auth/login'); return; }
    apiFetch<any[]>('/categories').then(setCategories).catch(() => {});
  }, [user, authLoading, router]);

  if (authLoading || !user) return <div>Загрузка...</div>;

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleToolbarAction = (command: string, value?: string) => {
    if (command === 'createLink') {
      const url = prompt('Введите URL ссылки:');
      if (url) execCommand(command, url);
    } else if (command === 'insertImage') {
      const url = prompt('Введите URL изображения:');
      if (url) execCommand(command, url);
    } else {
      execCommand(command, value);
    }
  };

  const syncContentFromEditor = () => {
    const html = editorRef.current?.innerHTML || '';
    setContent(html);
    return html;
  };

  const getEditorContent = () => content || editorRef.current?.innerHTML || '';

  const applyPdfImport = ({ html, suggestedTitle }: { html: string; suggestedTitle?: string }) => {
    if (editorRef.current) {
      editorRef.current.innerHTML = html;
    }
    setContent(html);
    if (suggestedTitle && !title.trim()) {
      setTitle(suggestedTitle);
    }
    setActiveTab('edit');
  };

  const switchToPreview = () => {
    syncContentFromEditor();
    setActiveTab('preview');
  };

  const uploadVideo = async (articleId: string): Promise<boolean> => {
    if (videoTab === 'youtube' && youtubeUrl.trim()) {
      await apiFetch(`/articles/${articleId}/videos/youtube`, {
        method: 'POST',
        body: { youtubeUrl: youtubeUrl.trim() },
      });
      return true;
    }

    if (videoTab === 'upload' && videoFile) {
      if (videoFile.size > MAX_VIDEO_MB * 1024 * 1024) {
        throw new Error(`Файл слишком большой. Максимум ${MAX_VIDEO_MB >= 1024 ? `${MAX_VIDEO_MB / 1024} ГБ` : `${MAX_VIDEO_MB} МБ`}`);
      }

      setUploading(true);
      setUploadProgress(0);
      try {
        const usePresigned = videoFile.size > DIRECT_UPLOAD_MAX_MB * 1024 * 1024;

        if (usePresigned) {
          const { uploadUrl, s3Key } = await apiFetch<any>(
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
          const uploadPromise = uploadWithProgress(xhr, setUploadProgress);
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
          const uploadPromise = uploadWithProgress(xhr, setUploadProgress);
          xhr.send(formData);
          await uploadPromise;
        }
        return true;
      } finally {
        setUploading(false);
      }
    }

    return false;
  };

  const persistArticle = async (): Promise<string> => {
    const articleContent = syncContentFromEditor();

    if (draftId) {
      await apiFetch(`/articles/${draftId}`, {
        method: 'PATCH',
        body: { title, content: articleContent, categoryId },
      });
      return draftId;
    }

    const result = await apiFetch<any>('/articles', {
      method: 'POST',
      body: { title, content: articleContent, categoryId },
    });
    setDraftId(result.id);
    return result.id;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const articleId = await persistArticle();
      try {
        await uploadVideo(articleId);
      } catch (videoErr: unknown) {
        setError(`Статья сохранена, но видео не загружено: ${getApiErrorMessage(videoErr, 'ошибка загрузки')}`);
        return;
      }
      await apiFetch(`/articles/${articleId}/submit`, { method: 'POST' });
      router.push('/articles/mine');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Ошибка создания'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    setError('');
    setLoading(true);
    try {
      const articleId = await persistArticle();
      try {
        await uploadVideo(articleId);
      } catch (videoErr: unknown) {
        setError(`Черновик сохранён, но видео не загружено: ${getApiErrorMessage(videoErr, 'ошибка загрузки')}`);
        return;
      }
      router.push('/articles/mine');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Ошибка сохранения'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold text-slate-100">Новая статья</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        <div className="card">
          <div className="form-group">
            <label>Заголовок статьи</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Введите заголовок..."
              required
              className="text-base"
            />
          </div>

          <div className="form-group">
            <label>Категория</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
              <option value="">Выберите категорию</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="card">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <label className="text-sm font-semibold text-slate-300">Содержание</label>
            <div className="flex flex-wrap items-center gap-1">
              <PdfImportButton
                disabled={loading || uploading}
                hasExistingContent={Boolean(getEditorContent().replace(/<[^>]*>/g, '').trim())}
                onImported={applyPdfImport}
                onError={setError}
              />
              <button
                type="button"
                className={`btn text-xs ${activeTab === 'edit' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('edit')}
              >
                Редактор
              </button>
              <button
                type="button"
                className={`btn text-xs ${activeTab === 'preview' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={switchToPreview}
              >
                Предпросмотр
              </button>
            </div>
          </div>

          <div style={{ display: activeTab === 'edit' ? 'block' : 'none' }}>
            <div className="flex flex-wrap gap-1 rounded-t-xl border border-b-0 border-slate-700 bg-slate-800 p-2">
              {TOOLBAR_BUTTONS.map((btn) => (
                <button
                  key={btn.label}
                  type="button"
                  title={btn.title}
                  onClick={() => handleToolbarAction(btn.command, btn.value)}
                  className="cursor-pointer rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700"
                  style={{ fontWeight: btn.command.startsWith('formatBlock') ? 700 : 400 }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="min-h-[300px] rounded-b-xl border border-slate-700 bg-slate-950/50 p-4 text-sm leading-8 text-slate-200 outline-none"
              onInput={syncContentFromEditor}
            />
          </div>

          {activeTab === 'preview' && (
            <div
              dangerouslySetInnerHTML={{ __html: content }}
              className="article-prose min-h-[300px] rounded-xl border border-slate-700 p-4 leading-8"
            />
          )}
        </div>

        <div className="card">
          <button
            type="button"
            className="flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-left text-slate-200"
            onClick={() => setShowVideoForm(!showVideoForm)}
          >
            <span className="text-lg">{showVideoForm ? '▼' : '▶'}</span>
            <span className="font-semibold">Видео</span>
            <span className="text-sm text-slate-400">(YouTube ссылка или загрузка файла)</span>
          </button>

          {showVideoForm && (
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="mb-4 flex gap-2">
                <button
                  type="button"
                  className={`btn text-xs ${videoTab === 'youtube' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setVideoTab('youtube')}
                >
                  YouTube
                </button>
                <button
                  type="button"
                  className={`btn text-xs ${videoTab === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setVideoTab('upload')}
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
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
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
                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    Допустимые форматы: MP4, WebM. Максимальный размер: {MAX_VIDEO_MB >= 1024 ? `${MAX_VIDEO_MB / 1024} ГБ` : `${MAX_VIDEO_MB} МБ`}.
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
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" className="btn btn-secondary" onClick={() => router.back()}>
            Отмена
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleSaveDraft}
            disabled={loading || !title || !categoryId}
          >
            Сохранить черновик
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !title || !categoryId}
          >
            {loading ? 'Отправка...' : 'Отправить на модерацию'}
          </button>
        </div>
      </form>
    </div>
  );
}
