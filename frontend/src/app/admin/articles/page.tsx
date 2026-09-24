'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, getApiErrorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { AdminNav } from '@/components/AdminNav';

export default function AdminArticlesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    const query = status ? `?status=${status}&limit=50` : '?limit=50';
    apiFetch<any>(`/admin/articles${query}`)
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'ADMIN') {
      router.push('/');
      return;
    }
    load();
  }, [user, authLoading, router, status]);

  const handleDelete = async (id: string, title: string) => {
    if (
      !confirm(
        `Удалить статью «${title}»? Видео и комментарии будут удалены безвозвратно.`,
      )
    ) {
      return;
    }
    setDeletingId(id);
    try {
      await apiFetch(`/articles/${id}`, { method: 'DELETE' });
      load();
    } catch (err: unknown) {
      alert(getApiErrorMessage(err, 'Ошибка удаления'));
    } finally {
      setDeletingId(null);
    }
  };

  if (authLoading || loading) return <div className="text-slate-400">Загрузка...</div>;
  if (!data) return <div className="text-rose-400">Ошибка загрузки</div>;

  return (
    <div className="space-y-4">
      <h1 className="mb-4 text-2xl font-bold text-slate-100">Все статьи</h1>
      <AdminNav />

      <div style={{ marginBottom: '1rem' }}>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Все статусы</option>
          <option value="DRAFT">DRAFT</option>
          <option value="PENDING">PENDING</option>
          <option value="PUBLISHED">PUBLISHED</option>
          <option value="REJECTED">REJECTED</option>
        </select>
      </div>

      {data.data.map((article: any) => (
        <div key={article.id} className="card" style={{ marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <Link href={`/articles/${article.id}`} style={{ fontWeight: 600, textDecoration: 'none' }}>
                {article.title}
              </Link>
              <p style={{ color: '#9A9884', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                {article.status} · {article.author?.displayName} · {article.category?.name}
              </p>
            </div>
            {(user?.role === 'MODERATOR' || user?.role === 'ADMIN') && (
              <Link
                href={`/moderation/history/${article.id}`}
                className="btn btn-secondary"
                style={{ textDecoration: 'none', alignSelf: 'start' }}
              >
                История
              </Link>
            )}
            {user?.role === 'ADMIN' && (
              <button
                type="button"
                className="btn btn-danger"
                style={{ alignSelf: 'start' }}
                disabled={deletingId === article.id}
                onClick={() => handleDelete(article.id, article.title)}
              >
                {deletingId === article.id ? '...' : 'Удалить'}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
