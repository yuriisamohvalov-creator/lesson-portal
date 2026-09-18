'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, getApiErrorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { AdminNav } from '@/components/AdminNav';

type BrowseResponse = {
  roots: string[];
  currentPath: string;
  parentPath: string | null;
  entries: Array<{
    name: string;
    path: string;
    kind: 'directory' | 'file';
    sizeBytes?: number;
  }>;
  videoFileCount: number;
};

type PreviewResponse = {
  sourcePath: string;
  recursive: boolean;
  files: Array<{ name: string; path: string; sizeBytes: number }>;
};

type ImportJob = {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  total: number;
  processed: number;
  sourcePath: string;
  results: Array<{
    filePath: string;
    title: string;
    articleId?: string;
    videoId?: string;
    error?: string;
    skipped?: boolean;
    skipReason?: string;
  }>;
  error?: string;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} ГБ`;
}

export default function AdminVideoCatalogImportPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [roots, setRoots] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [browse, setBrowse] = useState<BrowseResponse | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [recursive, setRecursive] = useState(true);
  const [publishArticles, setPublishArticles] = useState(true);
  const [courseMode, setCourseMode] = useState<'none' | 'new' | 'existing'>('new');
  const [courseId, setCourseId] = useState('');
  const [courseName, setCourseName] = useState('');
  const [courseSlug, setCourseSlug] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [publishCourse, setPublishCourse] = useState(true);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadBrowse = useCallback(async (path?: string) => {
    const query = path ? `?path=${encodeURIComponent(path)}` : '';
    const data = await apiFetch<BrowseResponse>(
      `/admin/video-catalog-import/browse${query}`,
    );
    setBrowse(data);
    setCurrentPath(data.currentPath);
    setPreview(null);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'ADMIN') {
      router.push('/');
      return;
    }

    Promise.all([
      apiFetch<{ roots: string[] }>('/admin/video-catalog-import/roots'),
      apiFetch<any[]>('/categories'),
      apiFetch<any[]>('/courses/admin'),
    ])
      .then(([rootsData, categoriesData, coursesData]) => {
        setRoots(rootsData.roots);
        setCategories(categoriesData);
        setCourses(coursesData);
        if (categoriesData[0]?.id) setCategoryId(categoriesData[0].id);
        return loadBrowse(rootsData.roots[0]);
      })
      .catch((err: unknown) => {
        setError(getApiErrorMessage(err, 'Не удалось загрузить настройки импорта'));
      });
  }, [user, authLoading, router, loadBrowse]);

  useEffect(() => {
    if (!job || job.status === 'completed' || job.status === 'failed') return;
    const timer = setInterval(async () => {
      try {
        const next = await apiFetch<ImportJob>(
          `/admin/video-catalog-import/jobs/${job.id}`,
        );
        setJob(next);
      } catch {
        // keep polling until manual refresh
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [job]);

  const selectedRoot = useMemo(
    () => roots.find((root) => currentPath === root || currentPath.startsWith(`${root}/`)),
    [roots, currentPath],
  );

  const handlePreview = async () => {
    if (!currentPath) return;
    setBusy(true);
    setError('');
    try {
      const data = await apiFetch<PreviewResponse>('/admin/video-catalog-import/preview', {
        method: 'POST',
        body: { sourcePath: currentPath, recursive },
      });
      setPreview(data);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Ошибка предпросмотра'));
    } finally {
      setBusy(false);
    }
  };

  const handleRunImport = async () => {
    if (!currentPath || !categoryId) return;
    if (courseMode === 'new' && (!courseName.trim() || !courseSlug.trim())) {
      setError('Укажите название и slug нового курса');
      return;
    }
    if (courseMode === 'existing' && !courseId) {
      setError('Выберите существующий курс');
      return;
    }
    if (
      !confirm(
        `Импортировать видео из каталога?\n${currentPath}\n${recursive ? 'Включая подкаталоги' : 'Только текущий каталог'}`,
      )
    ) {
      return;
    }

    setBusy(true);
    setError('');
    try {
      const body: Record<string, unknown> = {
        sourcePath: currentPath,
        categoryId,
        recursive,
        publishArticles,
      };
      if (courseMode === 'new') {
        body.createCourse = true;
        body.courseName = courseName.trim();
        body.courseSlug = courseSlug.trim();
        body.courseDescription = courseDescription.trim() || undefined;
        body.publishCourse = publishCourse;
      } else if (courseMode === 'existing') {
        body.courseId = courseId;
      }

      const started = await apiFetch<{ jobId: string }>(
        '/admin/video-catalog-import/run',
        { method: 'POST', body },
      );
      const initial = await apiFetch<ImportJob>(
        `/admin/video-catalog-import/jobs/${started.jobId}`,
      );
      setJob(initial);
      setPreview(null);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Не удалось запустить импорт'));
    } finally {
      setBusy(false);
    }
  };

  if (authLoading) return <div className="text-slate-400">Загрузка...</div>;

  return (
    <div className="space-y-4">
      <h1 className="mb-2 text-2xl font-bold text-slate-100">Импорт видео из каталога</h1>
      <p style={{ color: '#9A9884', maxWidth: '48rem', lineHeight: 1.5 }}>
        Создаёт статьи с загрузкой MP4/WebM в MinIO, постерами и (опционально) курсом — по тому же
        сценарию, что ручной импорт курсов по луку. Каталог должен быть смонтирован в backend и
        перечислен в <code>VIDEO_CATALOG_IMPORT_ROOTS</code>.
      </p>
      <AdminNav />

      {error && (
        <div className="card" style={{ borderColor: '#7f1d1d', color: '#fecaca' }}>
          {error}
        </div>
      )}

      {roots.length === 0 && (
        <div className="card" style={{ color: '#fbbf24' }}>
          На сервере не задан <code>VIDEO_CATALOG_IMPORT_ROOTS</code> — импорт недоступен.
        </div>
      )}

      <div className="card space-y-3">
        <h2 style={{ fontSize: '1.125rem' }}>Каталог на сервере</h2>
        {selectedRoot && (
          <p style={{ color: '#9A9884', fontSize: '0.875rem' }}>
            Корень: <code>{selectedRoot}</code>
          </p>
        )}
        <p style={{ fontSize: '0.875rem', wordBreak: 'break-all' }}>
          Текущий путь: <code>{currentPath || '—'}</code>
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {browse?.parentPath && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => loadBrowse(browse.parentPath!)}
            >
              ↑ Вверх
            </button>
          )}
          {roots.map((root) => (
            <button
              key={root}
              type="button"
              className="btn btn-secondary"
              onClick={() => loadBrowse(root)}
            >
              {root.split('/').pop() || root}
            </button>
          ))}
        </div>

        {browse && (
          <div style={{ marginTop: '0.5rem' }}>
            <p style={{ color: '#9A9884', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              Видеофайлов в каталоге: {browse.videoFileCount}
              {!recursive && ' (без подкаталогов — см. предпросмотр)'}
            </p>
            <div style={{ maxHeight: '240px', overflow: 'auto' }}>
              {browse.entries.map((entry) => (
                <div
                  key={entry.path}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0.35rem 0',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ textAlign: 'left', flex: 1, marginRight: '0.5rem' }}
                    disabled={entry.kind !== 'directory'}
                    onClick={() => entry.kind === 'directory' && loadBrowse(entry.path)}
                  >
                    {entry.kind === 'directory' ? '📁' : '🎬'} {entry.name}
                  </button>
                  {entry.kind === 'file' && entry.sizeBytes != null && (
                    <span style={{ color: '#9A9884', fontSize: '0.8rem' }}>
                      {formatBytes(entry.sizeBytes)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            checked={recursive}
            onChange={(e) => setRecursive(e.target.checked)}
          />
          Искать видео в подкаталогах
        </label>

        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy || !currentPath}
          onClick={handlePreview}
        >
          Предпросмотр списка
        </button>
      </div>

      {preview && (
        <div className="card">
          <h3 style={{ marginBottom: '0.75rem' }}>
            Будет импортировано: {preview.files.length} файлов
          </h3>
          <div style={{ maxHeight: '200px', overflow: 'auto' }}>
            {preview.files.map((file) => (
              <div key={file.path} style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                {file.name} · {formatBytes(file.sizeBytes)}
              </div>
            ))}
          </div>
        </div>
      )}

      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          void handleRunImport();
        }}
      >
        <h2 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Параметры импорта</h2>
        <div className="form-group">
          <label>Категория статей</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
            <option value="">Выберите категорию</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            type="checkbox"
            checked={publishArticles}
            onChange={(e) => setPublishArticles(e.target.checked)}
          />
          Опубликовать статьи сразу
        </label>

        <div className="form-group">
          <label>Курс</label>
          <select
            value={courseMode}
            onChange={(e) => setCourseMode(e.target.value as 'none' | 'new' | 'existing')}
          >
            <option value="new">Создать новый курс из каталога</option>
            <option value="existing">Добавить в существующий курс</option>
            <option value="none">Только статьи, без курса</option>
          </select>
        </div>

        {courseMode === 'new' && (
          <>
            <div className="form-group">
              <label>Название курса</label>
              <input value={courseName} onChange={(e) => setCourseName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Slug курса</label>
              <input value={courseSlug} onChange={(e) => setCourseSlug(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Описание</label>
              <textarea
                value={courseDescription}
                onChange={(e) => setCourseDescription(e.target.value)}
                rows={2}
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={publishCourse}
                onChange={(e) => setPublishCourse(e.target.checked)}
              />
              Опубликовать курс сразу
            </label>
          </>
        )}

        {courseMode === 'existing' && (
          <div className="form-group">
            <label>Существующий курс</label>
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)} required>
              <option value="">Выберите курс</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.slug})
                </option>
              ))}
            </select>
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={busy || !currentPath || roots.length === 0}>
          {busy ? 'Запуск...' : 'Запустить импорт'}
        </button>
      </form>

      {job && (
        <div className="card">
          <h3 style={{ marginBottom: '0.75rem' }}>
            Задача {job.id.slice(0, 8)}… — {job.status}
          </h3>
          <p style={{ color: '#9A9884' }}>
            {job.processed} / {job.total}
            {job.error ? ` · ${job.error}` : ''}
          </p>
          {job.results.length > 0 && (
            <div style={{ maxHeight: '280px', overflow: 'auto', marginTop: '0.75rem' }}>
              {job.results.map((row) => (
                <div key={row.filePath} style={{ fontSize: '0.875rem', marginBottom: '0.35rem' }}>
                  {row.error ? '✗' : row.skipped ? '↷' : '✓'} {row.title}
                  {row.articleId && (
                    <>
                      {' '}
                      ·{' '}
                      <Link href={`/articles/${row.articleId}`} style={{ color: '#a78bfa' }}>
                        статья
                      </Link>
                    </>
                  )}
                  {row.skipped && row.skipReason && (
                    <span style={{ color: '#9ca3af' }}> — {row.skipReason}</span>
                  )}
                  {row.error && (
                    <span style={{ color: '#fca5a5' }}> — {row.error}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
