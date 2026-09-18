'use client';

import { useState, useEffect } from 'react';
import { apiFetch, getApiErrorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/ui';

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
      loadArticles();
    } catch (err: unknown) {
      alert(getApiErrorMessage(err, 'Ошибка удаления'));
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

  if (authLoading || loading) return <div className="text-slate-400">Загрузка...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-100">Мои статьи</h1>
        <Link href="/articles/create" className="btn btn-primary no-underline">
          + Написать
        </Link>
      </div>

      {articles.length === 0 ? (
        <p className="text-slate-400">
          У вас пока нет статей.{' '}
          <Link href="/articles/create" className="text-indigo-400 no-underline hover:text-indigo-300">
            Написать первую
          </Link>
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-950/60 text-left text-slate-400">
                <th className="px-4 py-3 font-semibold">Заголовок</th>
                <th className="px-4 py-3 font-semibold">Статус</th>
                <th className="px-4 py-3 font-semibold">Дата</th>
                <th className="px-4 py-3 font-semibold">Действия</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => (
                <tr key={article.id} className="border-b border-slate-800/80">
                  <td className="px-4 py-3">
                    <Link href={`/articles/${article.id}`} className="font-medium text-slate-200 no-underline hover:text-indigo-300">
                      {article.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={article.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(article.createdAt).toLocaleString('ru-RU')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {article.lastRejectionComment && (
                        <span className="basis-full text-xs text-rose-400">
                          Причина: {article.lastRejectionComment}
                        </span>
                      )}
                      <Link href={`/articles/${article.id}/edit`} className="btn btn-secondary no-underline text-xs">
                        Редактировать
                      </Link>
                      {(article.status === 'DRAFT' || article.status === 'REJECTED') && (
                        <button type="button" onClick={() => handleResubmit(article.id)} className="btn btn-primary text-xs">
                          {article.status === 'REJECTED' ? 'Отправить заново' : 'Отправить на модерацию'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(article.id)}
                        disabled={deletingId === article.id}
                        className="btn btn-danger text-xs"
                      >
                        {deletingId === article.id ? '...' : 'Удалить'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


