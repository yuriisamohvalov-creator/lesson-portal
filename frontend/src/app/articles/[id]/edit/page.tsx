'use client';

import { useState, useEffect, useRef } from 'react';
import { apiFetch, getApiErrorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { PdfImportButton } from '@/components/PdfImportButton';
import { ArticleVideoForm } from '@/components/ArticleVideoForm';
import { UploadedVideo } from '@/components/UploadedVideo';
import {
  uploadArticleVideo,
  type VideoTab,
} from '@/lib/video-upload';

const TOOLBAR_BUTTONS = [
  { label: 'B', title: 'Жирный', command: 'bold' },
  { label: 'I', title: 'Курсив', command: 'italic' },
  { label: 'U', title: 'Подчёркнутый', command: 'underline' },
  { label: 'H1', title: 'Заголовок 1', command: 'formatBlock', value: 'h1' },
  { label: 'H2', title: 'Заголовок 2', command: 'formatBlock', value: 'h2' },
  { label: 'H3', title: 'Заголовок 3', command: 'formatBlock', value: 'h3' },
  { label: 'UL', title: 'Список', command: 'insertUnorderedList' },
  { label: 'OL', title: 'Нумерованный', command: 'insertOrderedList' },
  { label: '🔗', title: 'Ссылка', command: 'createLink' },
  { label: '📷', title: 'Изображение', command: 'insertImage' },
  { label: '⟨/⟩', title: 'Код', command: 'formatBlock', value: 'pre' },
  { label: '❝', title: 'Цитата', command: 'formatBlock', value: 'blockquote' },
];

type ArticleVideo = {
  id: string;
  type: 'YOUTUBE' | 'UPLOADED';
  youtubeUrl?: string | null;
  processStatus?: string;
  url?: string;
};

function YouTubeEmbed({ url }: { url: string }) {
  const embedUrl = url
    .replace('watch?v=', 'embed/')
    .replace('youtu.be/', 'youtube.com/embed/')
    .replace('youtube.com/live/', 'youtube.com/embed/');

  return (
    <div className="aspect-video overflow-hidden rounded-xl border border-slate-800 bg-black">
      <iframe
        src={embedUrl}
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="YouTube video"
      />
    </div>
  );
}

export default function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const [articleId, setArticleId] = useState<string>('');
  const [articleStatus, setArticleStatus] = useState<string>('');
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [videos, setVideos] = useState<ArticleVideo[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialContent, setInitialContent] = useState('');
  const [content, setContent] = useState('');
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [videoTab, setVideoTab] = useState<VideoTab>('youtube');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    params.then(({ id }) => setArticleId(id));
  }, [params]);

  const refreshVideos = async (id: string) => {
    const list = await apiFetch<ArticleVideo[]>(`/articles/${id}/videos`);
    setVideos(list);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }
    if (!articleId) return;
    Promise.all([
      apiFetch<any>(`/articles/${articleId}`),
      apiFetch<any[]>('/categories'),
    ]).then(([article, cats]) => {
      setTitle(article.title);
      setCategoryId(article.categoryId);
      setInitialContent(article.content || '');
      setVideos(article.videos || []);
      setArticleStatus(article.status || '');
      setCategories(cats);
      if (!article.videos?.length) {
        setShowVideoForm(true);
      }
    }).catch(() => setError('Не удалось загрузить статью'));
  }, [user, authLoading, router, articleId]);

  useEffect(() => {
    if (editorRef.current && initialContent) {
      editorRef.current.innerHTML = initialContent;
      setContent(initialContent);
    }
  }, [initialContent]);

  const syncContentFromEditor = () => {
    const html = editorRef.current?.innerHTML || '';
    setContent(html);
    return html;
  };

  const switchToPreview = () => {
    syncContentFromEditor();
    setActiveTab('preview');
  };

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

  const resetVideoForm = () => {
    setYoutubeUrl('');
    setVideoFile(null);
    setUploadProgress(0);
    setVideoTab('youtube');
  };

  const handleAddVideo = async () => {
    if (!articleId) return;
    if (videoTab === 'youtube' && !youtubeUrl.trim()) {
      setError('Укажите ссылку на YouTube');
      return;
    }
    if (videoTab === 'upload' && !videoFile) {
      setError('Выберите видеофайл');
      return;
    }

    setError('');
    setUploading(true);
    setUploadProgress(0);
    try {
      await uploadArticleVideo({
        articleId,
        videoTab,
        youtubeUrl,
        videoFile,
        onProgress: setUploadProgress,
      });
      await refreshVideos(articleId);
      setArticleStatus('DRAFT');
      resetVideoForm();
      setShowVideoForm(false);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, err instanceof Error ? err.message : 'Ошибка загрузки видео'));
    } finally {
      setUploading(false);
    }
  };

  const removeVideo = async (videoId: string) => {
    if (!articleId) return;
    setError('');
    setDeletingVideoId(videoId);
    try {
      await apiFetch(`/articles/${articleId}/videos/${videoId}`, { method: 'DELETE' });
      await refreshVideos(articleId);
      setArticleStatus('DRAFT');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Не удалось удалить видео'));
      throw err;
    } finally {
      setDeletingVideoId(null);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm('Удалить это видео из статьи?')) return;
    try {
      await removeVideo(videoId);
      setShowVideoForm(true);
    } catch {
      // error already shown
    }
  };

  const handleReplaceVideo = async (videoId: string) => {
    if (!confirm('Удалить текущее видео и добавить новое?')) return;
    try {
      await removeVideo(videoId);
      resetVideoForm();
      setShowVideoForm(true);
    } catch {
      // error already shown
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const bodyContent = syncContentFromEditor();
      const updated = await apiFetch<any>(`/articles/${articleId}`, {
        method: 'PATCH',
        body: { title, content: bodyContent, categoryId },
      });
      setArticleStatus(updated.status || 'DRAFT');
      router.push('/articles/mine');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Ошибка сохранения'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForModeration = async () => {
    setError('');
    setLoading(true);
    try {
      const bodyContent = syncContentFromEditor();
      await apiFetch(`/articles/${articleId}`, {
        method: 'PATCH',
        body: { title, content: bodyContent, categoryId },
      });
      await apiFetch(`/articles/${articleId}/submit`, { method: 'POST' });
      router.push('/articles/mine');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Ошибка отправки'));
    } finally {
      setLoading(false);
    }
  };

  const busy = loading || uploading || Boolean(deletingVideoId);
  const needsRemoderation =
    articleStatus === 'PUBLISHED' ||
    articleStatus === 'PENDING' ||
    articleStatus === 'REJECTED';

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold text-slate-100">Редактирование статьи</h1>

      {needsRemoderation && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
          После сохранения статья станет черновиком и исчезнет из публикации, пока вы снова
          не отправите её на модерацию.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        <div className="card">
          <div className="form-group">
            <label>Заголовок</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Категория</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
              <option value="">Выберите категорию</option>
              {categories.map((cat: any) => (
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
                disabled={busy}
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

        <div className="card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold text-slate-100">Видео</h2>
              <p className="text-sm text-slate-400">
                Добавьте YouTube-ссылку или загрузите файл. Можно заменить текущее видео.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary text-xs"
              onClick={() => setShowVideoForm((open) => !open)}
              disabled={busy}
            >
              {showVideoForm ? 'Скрыть форму' : videos.length ? 'Добавить ещё' : 'Добавить видео'}
            </button>
          </div>

          {videos.length > 0 ? (
            <ul className="space-y-4">
              {videos.map((video) => (
                <li
                  key={video.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-300">
                      {video.type === 'YOUTUBE' ? 'YouTube' : 'Загруженный файл'}
                      {video.type === 'UPLOADED' && video.processStatus === 'pending'
                        ? ' · обрабатывается'
                        : ''}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn btn-secondary text-xs"
                        disabled={busy}
                        onClick={() => void handleReplaceVideo(video.id)}
                      >
                        Заменить
                      </button>
                      <button
                        type="button"
                        className="btn text-xs border border-rose-500/40 text-rose-300 hover:bg-rose-950/40"
                        disabled={busy}
                        onClick={() => void handleDeleteVideo(video.id)}
                      >
                        {deletingVideoId === video.id ? 'Удаление...' : 'Удалить'}
                      </button>
                    </div>
                  </div>
                  {video.type === 'YOUTUBE' && video.youtubeUrl && (
                    <YouTubeEmbed url={video.youtubeUrl} />
                  )}
                  {video.type === 'UPLOADED' && (
                    <UploadedVideo
                      videoId={video.id}
                      url={video.url}
                      processStatus={video.processStatus}
                    />
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">В статье пока нет видео.</p>
          )}

          {showVideoForm && (
            <div className="space-y-3">
              <ArticleVideoForm
                videoTab={videoTab}
                onVideoTabChange={setVideoTab}
                youtubeUrl={youtubeUrl}
                onYoutubeUrlChange={setYoutubeUrl}
                onVideoFileChange={setVideoFile}
                uploading={uploading}
                uploadProgress={uploadProgress}
                disabled={busy && !uploading}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  className="btn btn-primary text-sm"
                  onClick={() => void handleAddVideo()}
                  disabled={
                    busy ||
                    (videoTab === 'youtube' ? !youtubeUrl.trim() : !videoFile)
                  }
                >
                  {uploading ? `Загрузка ${uploadProgress}%...` : 'Сохранить видео'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" className="btn btn-secondary" onClick={() => router.back()}>
            Отмена
          </button>
          <button type="submit" className="btn btn-secondary" disabled={busy || !title || !categoryId}>
            {loading ? 'Сохранение...' : 'Сохранить'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmitForModeration}
            disabled={busy || !title || !categoryId}
          >
            {loading ? 'Отправка...' : 'Отправить на модерацию'}
          </button>
        </div>
      </form>
    </div>
  );
}
