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

  if (authLoading || loading) return <div className="text-slate-400">Загрузка...</div>;

  return (
    <div className="space-y-4">
      <Link href="/moderation" className="text-sm text-slate-400 no-underline hover:text-indigo-300">
        ← К очереди
      </Link>
      <h1 className="text-2xl font-bold text-slate-100">История модерации</h1>

      {history.length === 0 ? (
        <p className="text-slate-400">Записей нет</p>
      ) : (
        history.map((entry) => (
          <div key={entry.id} className="card">
            <p className="font-semibold text-slate-100">
              {entry.action === 'APPROVE' ? 'Одобрено' : 'Отклонено'}
            </p>
            <p className="text-sm text-slate-400">
              {entry.moderator?.displayName} · {new Date(entry.createdAt).toLocaleString('ru-RU')}
            </p>
            {entry.comment && <p className="mt-2 text-slate-300">{entry.comment}</p>}
          </div>
        ))
      )}
    </div>
  );
}
