'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function ModerationHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [articleId, setArticleId] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(({ id }) => setArticleId(id));
  }, [params]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || (user.role !== 'MODERATOR' && user.role !== 'ADMIN')) {
      router.push('/');
      return;
    }
    if (!articleId) return;
    setLoading(true);
    apiFetch<any[]>(`/moderation/articles/${articleId}/history`)
      .then(setHistory)
      .finally(() => setLoading(false));
  }, [user, authLoading, router, articleId]);

  if (authLoading || loading) return <div>Загрузка...</div>;

  return (
    <div>
      <Link href="/moderation" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>← К очереди</Link>
      <h1 style={{ fontSize: '1.5rem', margin: '1rem 0' }}>История модерации</h1>

      {history.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>Записей нет</p>
      ) : (
        history.map((entry) => (
          <div key={entry.id} className="card" style={{ marginBottom: '0.75rem' }}>
            <p style={{ fontWeight: 600 }}>
              {entry.action === 'APPROVE' ? 'Одобрено' : 'Отклонено'}
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {entry.moderator?.displayName} · {new Date(entry.createdAt).toLocaleString('ru-RU')}
            </p>
            {entry.comment && <p style={{ marginTop: '0.5rem' }}>{entry.comment}</p>}
          </div>
        ))
      )}
    </div>
  );
}
