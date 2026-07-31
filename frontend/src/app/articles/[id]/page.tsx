'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiFetch, getApiErrorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Comments } from '@/components/Comments';
import { UploadedVideo } from '@/components/UploadedVideo';
import { CourseArticleNav } from '@/components/CourseArticleNav';

function YouTubeEmbed({ url }: { url: string }) {
  const embedUrl = url
    .replace('watch?v=', 'embed/')
    .replace('youtu.be/', 'youtube.com/embed/')
    .replace('youtube.com/live/', 'youtube.com/embed/');
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 pb-[56.25%]">
      <iframe
        src={embedUrl}
        className="absolute inset-0 h-full w-full border-0"
        allowFullScreen
        title="YouTube video"
      />
    </div>
  );
}

export default function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const [articleId, setArticleId] = useState<string>('');
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get('course');

  useEffect(() => {
    params.then(({ id }) => setArticleId(id));
  }, [params]);

  useEffect(() => {
    if (!articleId) return;
    const query = courseId ? `?courseId=${encodeURIComponent(courseId)}` : '';
    apiFetch<any>(`/articles/${articleId}${query}`)
      .then(setArticle)
      .catch(() => setError('not-found'))
      .finally(() => setLoading(false));
  }, [articleId, courseId]);

  useEffect(() => {
    if (!articleId || !article?.videos?.some(
      (v: any) => v.type === 'UPLOADED' && v.processStatus === 'pending',
    )) {
      return;
    }

    const timer = setInterval(() => {
      const query = courseId ? `?courseId=${encodeURIComponent(courseId)}` : '';
      apiFetch<any>(`/articles/${articleId}${query}`).then(setArticle).catch(() => {});
    }, 10000);

    return () => clearInterval(timer);
  }, [articleId, courseId, article?.videos]);

  const isAuthor = user && article && user.id === article.authorId;
  const isStaff = user && (user.role === 'ADMIN' || user.role === 'MODERATOR');
  const canEditContent = Boolean(isAuthor || isStaff);
  const canDelete =
    Boolean(isAuthor || user?.role === 'ADMIN') &&
    article &&
    (article.status === 'DRAFT' || article.status === 'REJECTED');

  const handleDelete = async () => {
    if (!confirm('Вы уверены, что хотите удалить статью?')) return;
    setDeleting(true);
    try {
      await apiFetch(`/articles/${articleId}`, { method: 'DELETE' });
      router.push('/articles/mine');
    } catch (err: unknown) {
      alert(getApiErrorMessage(err, 'Ошибка удаления'));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-slate-400">Загрузка...</div>;
  }
  if (error === 'not-found' || !article) {
    return (
      <div className="space-y-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-slate-100">Статья не найдена</h1>
        <Link href="/articles" className="inline-block text-indigo-400 no-underline hover:text-indigo-300">
          Вернуться к списку
        </Link>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <nav className="text-sm text-slate-400">
        <Link href="/" className="text-slate-400 no-underline hover:text-indigo-300">Главная</Link>
        {article.courseNav ? (
          <>
            {' / '}
            <Link href="/courses" className="text-slate-400 no-underline hover:text-indigo-300">Курсы</Link>
            {' / '}
            <Link href={`/courses/${article.courseNav.course.id}`} className="text-slate-400 no-underline hover:text-indigo-300">
              {article.courseNav.course.name}
            </Link>
          </>
        ) : (
          <>
            {' / '}
            <Link href="/articles" className="text-slate-400 no-underline hover:text-indigo-300">Статьи</Link>
            {article.category && (
              <>
                {' / '}
                <Link href={`/categories/${article.category.id}`} className="text-slate-400 no-underline hover:text-indigo-300">
                  {article.category.name}
                </Link>
              </>
            )}
          </>
        )}
        {' / '}
        <span className="text-slate-200">{article.title}</span>
      </nav>

      {article.courseNav && <CourseArticleNav courseNav={article.courseNav} />}

      {(isAuthor || isStaff) && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-950/40 px-4 py-3">
          <span className="text-sm text-slate-400">
            {isAuthor ? 'Ваша статья:' : 'Управление статьёй:'}
          </span>
          {canEditContent && (
            <Link
              href={`/articles/${articleId}/edit`}
              className="rounded-lg bg-indigo-600/80 px-3 py-1.5 text-xs font-semibold text-slate-100 no-underline hover:bg-indigo-500"
            >
              Редактировать
            </Link>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg bg-rose-600/80 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-rose-500 disabled:opacity-50"
            >
              {deleting ? 'Удаление...' : 'Удалить'}
            </button>
          )}
        </div>
      )}

      <header className="space-y-4 border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-bold leading-tight text-slate-100">{article.title}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
          {article.category?.name && (
            <span className="rounded-full border border-indigo-500/30 bg-indigo-600/20 px-3 py-1 text-xs font-medium text-indigo-300">
              {article.category.name}
            </span>
          )}
          <span>{article.author?.displayName}</span>
          <span>·</span>
          <time dateTime={article.createdAt}>
            {new Date(article.createdAt).toLocaleDateString('ru-RU', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
        </div>
      </header>

      {article.content && (
        <div
          className="article-prose text-[1.05rem] leading-8"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
      )}

      {article.videos?.length > 0 && (
        <section className="space-y-4 border-t border-slate-800 pt-8">
          <h2 className="text-xl font-semibold text-slate-100">Видео</h2>
          {article.videos.map((video: any) => (
            <div key={video.id} className="mb-4">
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
            </div>
          ))}
        </section>
      )}

      {article.courseNav && <CourseArticleNav courseNav={article.courseNav} />}

      <div className="flex items-center gap-4 border-t border-slate-800 pt-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-slate-100">
          {article.author?.displayName?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <div className="font-semibold text-slate-100">{article.author?.displayName}</div>
          <div className="text-sm text-slate-400">Автор статьи</div>
        </div>
      </div>

      <Comments articleId={articleId} />
    </article>
  );
}
