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

  if (authLoading || loading) return <div>Загрузка...</div>;

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Очередь модерации</h1>
      {articles.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>Нет статей на модерации</p>
      ) : (
        articles.map((article) => (
          <div key={article.id} className="card">
            <h3>{article.title}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Автор: {article.author?.displayName} · {article.category?.name}
            </p>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <Link href={`/articles/${article.id}`} className="btn btn-secondary" style={{ textDecoration: 'none' }}>Открыть</Link>
              <Link href={`/moderation/history/${article.id}`} className="btn btn-secondary" style={{ textDecoration: 'none' }}>История</Link>
              <button className="btn btn-success" onClick={() => handleApprove(article.id)}>Одобрить</button>
              <button className="btn btn-danger" onClick={() => setRejectId(article.id)}>Отклонить</button>
            </div>
            {rejectId === article.id && (
              <div style={{ marginTop: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Причина отклонения"
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  style={{ padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', width: '300px' }}
                />
                <button
                  className="btn btn-danger"
                  style={{ marginLeft: '0.5rem' }}
                  onClick={() => handleReject(article.id)}
                  disabled={!rejectComment.trim()}
                >
                  Подтвердить
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
