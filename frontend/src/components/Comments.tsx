'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

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
    <section className="mt-12 space-y-4 border-t border-slate-800 pt-8">
      <h2 className="text-xl font-semibold text-slate-100">Комментарии ({comments.length})</h2>

      {user ? (
        <form onSubmit={handleSubmit} className="mb-6 space-y-2">
          {error && <div className="text-sm text-rose-400">{error}</div>}
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Напишите комментарий..."
            rows={3}
            required
            className="w-full resize-y rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40"
          />
          <div className="text-right">
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
        <p className="mb-6 text-sm text-slate-400">
          <Link href="/auth/login" className="text-indigo-400 no-underline hover:text-indigo-300">
            Войдите
          </Link>
          , чтобы оставить комментарий.
        </p>
      )}

      {loading ? (
        <p className="text-slate-400">Загрузка комментариев...</p>
      ) : comments.length === 0 ? (
        <p className="text-slate-400">Пока нет комментариев. Будьте первым!</p>
      ) : (
        <div className="flex flex-col gap-3">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-slate-100">
                    {comment.author?.displayName?.[0]?.toUpperCase() || '?'}
                  </div>
                  <span className="text-sm font-medium text-slate-200">
                    {comment.author?.displayName}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <time className="text-xs text-slate-500">
                    {new Date(comment.createdAt).toLocaleDateString('ru-RU', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </time>
                  {user && (user.id === comment.authorId || user.role === 'ADMIN') && (
                    <button
                      type="button"
                      onClick={() => handleDelete(comment.id)}
                      className="cursor-pointer border-0 bg-transparent p-0 text-xs text-rose-400 hover:text-rose-300"
                    >
                      Удалить
                    </button>
                  )}
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                {comment.body}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
