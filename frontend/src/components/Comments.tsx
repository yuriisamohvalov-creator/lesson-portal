'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  author: { id: string; displayName: string };
}

export function Comments({ articleId }: { articleId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    apiFetch<Comment[]>(`/articles/${articleId}/comments`)
      .then(setComments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [articleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const comment = await apiFetch<Comment>(`/articles/${articleId}/comments`, {
        method: 'POST',
        body: { body: newComment.trim() },
      });
      setComments((prev) => [...prev, comment]);
      setNewComment('');
    } catch (err: any) {
      setError(err.message || 'Ошибка отправки');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Удалить комментарий?')) return;
    try {
      await apiFetch(`/articles/${articleId}/comments/${commentId}`, { method: 'DELETE' });
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err: any) {
      alert(err.message || 'Ошибка удаления');
    }
  };

  return (
    <section style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 600 }}>
        Комментарии ({comments.length})
      </h2>

      {/* Comment form */}
      {user ? (
        <form onSubmit={handleSubmit} style={{ marginBottom: '1.5rem' }}>
          {error && (
            <div style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              {error}
            </div>
          )}
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Напишите комментарий..."
            rows={3}
            required
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              resize: 'vertical',
              fontSize: '0.95rem',
              lineHeight: 1.5,
            }}
          />
          <div style={{ marginTop: '0.5rem', textAlign: 'right' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !newComment.trim()}
            >
              {submitting ? 'Отправка...' : 'Отправить'}
            </button>
          </div>
        </form>
      ) : (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          <a href="/auth/login">Войдите</a>, чтобы оставить комментарий.
        </p>
      )}

      {/* Comments list */}
      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Загрузка комментариев...</p>
      ) : comments.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>Пока нет комментариев. Будьте первым!</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {comments.map((comment) => (
            <div
              key={comment.id}
              style={{
                padding: '1rem',
                background: '#f9fafb',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 600, fontSize: '0.75rem',
                  }}>
                    {comment.author?.displayName?.[0]?.toUpperCase() || '?'}
                  </div>
                  <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>
                    {comment.author?.displayName}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <time style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(comment.createdAt).toLocaleDateString('ru-RU', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </time>
                  {user && (user.id === comment.authorId || user.role === 'ADMIN') && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      style={{
                        background: 'none', border: 'none', color: 'var(--danger)',
                        cursor: 'pointer', fontSize: '0.75rem', padding: 0,
                      }}
                    >
                      Удалить
                    </button>
                  )}
                </div>
              </div>
              <p style={{ fontSize: '0.95rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {comment.body}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
