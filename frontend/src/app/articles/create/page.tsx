'use client';

import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

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
  const editorRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) { router.push('/auth/login'); return; }
    apiFetch<any[]>('/categories').then(setCategories).catch(() => {});
  }, [user, router]);

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

  const getEditorContent = () => editorRef.current?.innerHTML || '';

  const uploadVideo = async (articleId: string): Promise<boolean> => {
    if (videoTab === 'youtube' && youtubeUrl.trim()) {
      await apiFetch(`/articles/${articleId}/videos/youtube`, {
        method: 'POST',
        body: { youtubeUrl: youtubeUrl.trim() },
      });
      return true;
    }

    if (videoTab === 'upload' && videoFile) {
      setUploading(true);
      setUploadProgress(0);
      try {
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

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', uploadUrl, true);
          xhr.setRequestHeader('Content-Type', videoFile.type || 'video/mp4');
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              setUploadProgress(Math.round((event.loaded / event.total) * 100));
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload failed: ${xhr.statusText}`));
            }
          };
          xhr.onerror = () => reject(new Error('Upload failed'));
          xhr.send(videoFile);
        });

        await apiFetch(`/articles/${articleId}/videos/confirm`, {
          method: 'POST',
          body: { s3Key, contentType: videoFile.type || 'video/mp4' },
        });
        return true;
      } finally {
        setUploading(false);
      }
    }

    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const content = getEditorContent();
      const result = await apiFetch<any>('/articles', {
        method: 'POST',
        body: { title, content, categoryId },
      });
      if (result.id) {
        try {
          await uploadVideo(result.id);
        } catch {
          // video attachment is optional, continue to article list
        }
      }
      router.push('/articles/mine');
    } catch (err: any) {
      setError(err.message || 'Ошибка создания');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    setError('');
    setLoading(true);
    try {
      const content = getEditorContent();
      const result = await apiFetch<any>('/articles', {
        method: 'POST',
        body: { title, content, categoryId },
      });
      if (result.id) {
        try {
          await uploadVideo(result.id);
        } catch {
          // video attachment is optional
        }
      }
      router.push('/articles/mine');
    } catch (err: any) {
      setError(err.message || 'Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '2rem auto', padding: '0 1rem' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Новая статья</h1>

      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{
            background: '#fee2e2',
            color: 'var(--danger)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius)',
            marginBottom: '1rem',
          }}>
            {error}
          </div>
        )}

        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="form-group">
            <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Заголовок статьи</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Введите заголовок..."
              required
              style={{ fontSize: '1.1rem', padding: '0.75rem' }}
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Категория</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
              <option value="">Выберите категорию</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Содержание</label>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button
                type="button"
                className={`btn ${activeTab === 'edit' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('edit')}
                style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
              >
                Редактор
              </button>
              <button
                type="button"
                className={`btn ${activeTab === 'preview' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('preview')}
                style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
              >
                Предпросмотр
              </button>
            </div>
          </div>

          {activeTab === 'edit' && (
            <>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.25rem',
                padding: '0.5rem',
                background: '#f3f4f6',
                borderRadius: 'var(--radius) var(--radius) 0 0',
                borderBottom: '1px solid var(--border)',
              }}>
                {TOOLBAR_BUTTONS.map((btn) => (
                  <button
                    key={btn.label}
                    type="button"
                    title={btn.title}
                    onClick={() => handleToolbarAction(btn.command, btn.value)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      background: 'white',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: btn.command.startsWith('formatBlock') ? 700 : 400,
                    }}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                style={{
                  minHeight: '300px',
                  padding: '1rem',
                  border: '1px solid var(--border)',
                  borderRadius: '0 0 var(--radius) var(--radius)',
                  outline: 'none',
                  lineHeight: 1.8,
                  fontSize: '0.95rem',
                }}
                onInput={() => {}}
              />
            </>
          )}

          {activeTab === 'preview' && (
            <div
              dangerouslySetInnerHTML={{ __html: getEditorContent() }}
              style={{
                minHeight: '300px',
                padding: '1rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                lineHeight: 1.8,
              }}
            />
          )}
        </div>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            onClick={() => setShowVideoForm(!showVideoForm)}
          >
            <span style={{ fontSize: '1.25rem' }}>{showVideoForm ? '▼' : '▶'}</span>
            <span style={{ fontWeight: 600 }}>Видео</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              (YouTube ссылка или загрузка файла)
            </span>
          </div>

          {showVideoForm && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#f9fafb', borderRadius: 'var(--radius)' }}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <button
                  type="button"
                  className={`btn ${videoTab === 'youtube' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setVideoTab('youtube')}
                  style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
                >
                  YouTube
                </button>
                <button
                  type="button"
                  className={`btn ${videoTab === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setVideoTab('upload')}
                  style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
                >
                  Загрузить файл
                </button>
              </div>

              {videoTab === 'youtube' && (
                <div className="form-group">
                  <label style={{ fontSize: '0.875rem' }}>Ссылка на YouTube</label>
                  <input
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    style={{ width: '100%' }}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Поддерживаются форматы: youtube.com/watch?v=... и youtu.be/...
                  </p>
                </div>
              )}

              {videoTab === 'upload' && (
                <div className="form-group">
                  <label style={{ fontSize: '0.875rem' }}>Видеофайл</label>
                  <input
                    type="file"
                    accept=".mp4,.webm,video/mp4,video/webm"
                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                    style={{ width: '100%' }}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Допустимые форматы: MP4, WebM. Максимальный размер: 500 МБ.
                  </p>
                  {uploading && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                        Загрузка: {uploadProgress}%
                      </div>
                      <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3 }}>
                        <div
                          style={{
                            width: `${uploadProgress}%`,
                            height: '100%',
                            background: 'var(--primary)',
                            borderRadius: 3,
                            transition: 'width 0.2s',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => router.back()}
          >
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
