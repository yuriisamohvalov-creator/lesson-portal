'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function MyArticlesPage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const loadArticles = () => {
    setLoading(true);
    apiFetch<any[]>('/articles/mine')
      .then(setArticles)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }
    loadArticles();
  }, [user, authLoading, router]);

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить статью?')) return;
    setDeletingId(id);
    try {
      await apiFetch(`/articles/${id}`, { method: 'DELETE' });
      setArticles((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      alert(err.message || 'Ошибка удаления');
    } finally {
      setDeletingId(null);
    }
  };

  const handleResubmit = async (id: string) => {
    try {
      await apiFetch(`/articles/${id}/submit`, { method: 'POST' });
      loadArticles();
    } catch (err: any) {
      alert(err.message || 'Ошибка отправки');
    }
  };

  if (authLoading || loading) return <div>Загрузка...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem' }}>Мои статьи</h1>
        <Link href="/articles/create" className="btn btn-primary" style={{ textDecoration: 'none' }}>+ Написать</Link>
      </div>

      {articles.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>У вас пока нет статей. <Link href="/articles/create">Написать первую</Link></p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem' }}>Заголовок</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem' }}>Статус</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem' }}>Дата</th>
              <th style={{ textAlign: 'left', padding: '0.75rem 0.5rem' }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {articles.map((article) => (
              <tr key={article.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '0.75rem 0.5rem' }}>
                  <Link href={`/articles/${article.id}`} style={{ fontWeight: 500 }}>
                    {article.title}
                  </Link>
                </td>
                <td style={{ padding: '0.75rem 0.5rem' }}>
                  <span className={`badge badge-${article.status.toLowerCase()}`}>
                    {article.status}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  {new Date(article.createdAt).toLocaleDateString('ru-RU')}
                </td>
                <td style={{ padding: '0.75rem 0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {article.lastRejectionComment && (
                      <span style={{ color: 'var(--danger)', fontSize: '0.8rem', flexBasis: '100%' }}>
                        Причина: {article.lastRejectionComment}
                      </span>
                    )}
                    {canEdit(article.status) && (
                      <Link
                        href={`/articles/${article.id}/edit`}
                        className="btn btn-secondary"
                        style={{ textDecoration: 'none', fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
                      >
                        Редактировать
                      </Link>
                    )}
                    {article.status === 'REJECTED' && (
                      <button
                        onClick={() => handleResubmit(article.id)}
                        className="btn btn-primary"
                        style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
                      >
                        Отправить заново
                      </button>
                    )}
                    {(article.status === 'DRAFT' || article.status === 'REJECTED') && (
                      <button
                        onClick={() => handleDelete(article.id)}
                        disabled={deletingId === article.id}
                        className="btn btn-danger"
                        style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
                      >
                        {deletingId === article.id ? '...' : 'Удалить'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function canEdit(status: string): boolean {
  return status === 'DRAFT' || status === 'REJECTED';
}
