'use client';

import { useState, useEffect } from 'react';
import { apiFetch, getAccessToken } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Comments } from '@/components/Comments';

function YouTubeEmbed({ url }: { url: string }) {
  const embedUrl = url
    .replace('watch?v=', 'embed/')
    .replace('youtu.be/', 'youtube.com/embed/')
    .replace('youtube.com/live/', 'youtube.com/embed/');
  return (
    <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
      <iframe
        src={embedUrl}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
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

  useEffect(() => {
    params.then(({ id }) => setArticleId(id));
  }, [params]);

  useEffect(() => {
    if (!articleId) return;
    apiFetch<any>(`/articles/${articleId}`)
      .then(setArticle)
      .catch(() => setError('not-found'))
      .finally(() => setLoading(false));
  }, [articleId]);

  const isAuthor = user && article && user.id === article.authorId;
  const canEdit = isAuthor && article && (article.status === 'DRAFT' || article.status === 'REJECTED');

  const handleDelete = async () => {
    if (!confirm('Вы уверены, что хотите удалить статью?')) return;
    setDeleting(true);
    try {
      await apiFetch(`/articles/${articleId}`, { method: 'DELETE' });
      router.push('/articles/mine');
    } catch (err: any) {
      alert(err.message || 'Ошибка удаления');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Загрузка...</div>;
  if (error === 'not-found' || !article) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Статья не найдена</h1>
        <Link href="/articles" style={{ marginTop: '1rem', display: 'inline-block' }}>Вернуться к списку</Link>
      </div>
    );
  }

  return (
    <article style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Breadcrumb */}
      <nav style={{ marginBottom: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
        <Link href="/" style={{ color: 'var(--text-muted)' }}>Главная</Link>
        {' / '}
        <Link href="/articles" style={{ color: 'var(--text-muted)' }}>Статьи</Link>
        {article.category && (
          <>
            {' / '}
            <Link href={`/categories/${article.category.id}`} style={{ color: 'var(--text-muted)' }}>
              {article.category.name}
            </Link>
          </>
        )}
        {' / '}
        <span style={{ color: 'var(--text)' }}>{article.title}</span>
      </nav>

      {/* Author actions */}
      {isAuthor && (
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1rem',
          padding: '0.75rem 1rem',
          background: '#f0f7ff',
          borderRadius: 'var(--radius)',
          border: '1px solid #d0e3ff',
        }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
            Ваша статья:
          </span>
          {canEdit && (
            <Link
              href={`/articles/${articleId}/edit`}
              className="btn btn-primary"
              style={{ textDecoration: 'none', fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
            >
              Редактировать
            </Link>
          )}
          {canEdit && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="btn btn-danger"
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
            >
              {deleting ? 'Удаление...' : 'Удалить'}
            </button>
          )}
          {!canEdit && (
            <Link
              href={`/articles/${articleId}/edit`}
              className="btn btn-secondary"
              style={{ textDecoration: 'none', fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
            >
              Редактировать
            </Link>
          )}
        </div>
      )}

      {/* Title */}
      <h1 style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1.3, marginBottom: '0.75rem' }}>
        {article.title}
      </h1>

      {/* Meta */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '2rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid var(--border)',
        fontSize: '0.875rem',
        color: 'var(--text-muted)',
      }}>
        <span style={{
          background: 'var(--primary)',
          color: 'white',
          padding: '0.25rem 0.75rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: 500,
        }}>
          {article.category?.name}
        </span>
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

      {/* Content */}
      {article.content && (
        <div
          dangerouslySetInnerHTML={{ __html: article.content }}
          style={{ lineHeight: 1.8, fontSize: '1.05rem' }}
        />
      )}

      {/* Videos */}
      {article.videos?.length > 0 && (
        <section style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 600 }}>Видео</h2>
          {article.videos.map((video: any) => (
            <div key={video.id} style={{ marginBottom: '1.5rem' }}>
              {video.type === 'YOUTUBE' && video.youtubeUrl && (
                <YouTubeEmbed url={video.youtubeUrl} />
              )}
              {video.type === 'UPLOADED' && video.s3Key && (
                <video controls style={{ width: '100%', borderRadius: 'var(--radius)', background: '#000' }}>
                  <source src={`/api/videos/${video.id}/stream`} />
                  Ваш браузер не поддерживает воспроизведение видео.
                </video>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Author info */}
      <div style={{
        marginTop: '3rem',
        paddingTop: '2rem',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%', background: 'var(--primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 700, fontSize: '1.25rem',
        }}>
          {article.author?.displayName?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <div style={{ fontWeight: 600 }}>{article.author?.displayName}</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Автор статьи</div>
        </div>
      </div>

      {/* Comments */}
      <Comments articleId={articleId} />
    </article>
  );
}
