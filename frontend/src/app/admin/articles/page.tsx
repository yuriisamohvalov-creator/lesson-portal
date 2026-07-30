'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { AdminNav } from '@/components/AdminNav';

export default function AdminArticlesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

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
          </div>
        </div>
      ))}
    </div>
  );
}
