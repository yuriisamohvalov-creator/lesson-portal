'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ModerationPage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectComment, setRejectComment] = useState('');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const loadQueue = () => {
    setLoading(true);
    apiFetch<any>('/moderation/queue')
      .then((data) => setArticles(data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user || (user.role !== 'MODERATOR' && user.role !== 'ADMIN')) {
      router.push('/');
      return;
    }
    loadQueue();
  }, [user, authLoading, router]);

  const handleApprove = async (id: string) => {
    await apiFetch(`/moderation/articles/${id}/approve`, { method: 'POST' });
    loadQueue();
  };

  const handleReject = async (id: string) => {
    if (!rejectComment.trim()) return;
    await apiFetch(`/moderation/articles/${id}/reject`, {
      method: 'POST',
      body: { comment: rejectComment },
    });
    setRejectId(null);
    setRejectComment('');
    loadQueue();
  };

  if (authLoading || loading) return <div className="text-slate-400">Загрузка...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">Очередь модерации</h1>
      {articles.length === 0 ? (
        <p className="text-slate-400">Нет статей на модерации</p>
      ) : (
        <div className="space-y-4">
          {articles.map((article) => (
            <div key={article.id} className="card">
              <h3 className="text-lg font-semibold text-slate-100">{article.title}</h3>
              <p className="mt-1 text-sm text-slate-400">
                Автор: {article.author?.displayName} · {article.category?.name}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Link href={`/articles/${article.id}`} className="btn btn-secondary no-underline">
                  Открыть
                </Link>
                <Link href={`/moderation/history/${article.id}`} className="btn btn-secondary no-underline">
                  История
                </Link>
                <button type="button" className="btn btn-success" onClick={() => handleApprove(article.id)}>
                  Одобрить
                </button>
                <button type="button" className="btn btn-danger" onClick={() => setRejectId(article.id)}>
                  Отклонить
                </button>
              </div>
              {rejectId === article.id && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <input
                    type="text"
                    placeholder="Причина отклонения"
                    value={rejectComment}
                    onChange={(e) => setRejectComment(e.target.value)}
                    className="min-w-[240px] flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => handleReject(article.id)}
                    disabled={!rejectComment.trim()}
                  >
                    Подтвердить
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
