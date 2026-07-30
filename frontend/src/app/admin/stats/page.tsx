'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { AdminNav } from '@/components/AdminNav';

export default function AdminStatsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'ADMIN') {
      router.push('/');
      return;
    }
    apiFetch<any>('/admin/stats')
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, authLoading, router]);

  if (authLoading || loading) return <div className="text-slate-400">Загрузка...</div>;
  if (!stats) return <div className="text-rose-400">Ошибка загрузки</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-100">Админ-панель</h1>
      <AdminNav />
      <div className="status-bar">
        <div className="stat">
          <div className="stat-value">{stats.users.total}</div>
          <div className="stat-label">Пользователей</div>
        </div>
        <div className="stat">
          <div className="stat-value">{stats.articles.total}</div>
          <div className="stat-label">Статей</div>
        </div>
        <div className="stat">
          <div className="stat-value">{stats.courses.total}</div>
          <div className="stat-label">Курсов</div>
        </div>
        <div className="stat">
          <div className="stat-value">{stats.videos.total}</div>
          <div className="stat-label">Видео</div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card">
          <h3 className="mb-2 font-semibold text-slate-100">Пользователи по ролям</h3>
          <p className="text-sm text-slate-300">USER: {stats.users.byRole.USER}</p>
          <p className="text-sm text-slate-300">MODERATOR: {stats.users.byRole.MODERATOR}</p>
          <p className="text-sm text-slate-300">ADMIN: {stats.users.byRole.ADMIN}</p>
        </div>
        <div className="card">
          <h3 className="mb-2 font-semibold text-slate-100">Статьи по статусам</h3>
          <p className="text-sm text-slate-300">DRAFT: {stats.articles.byStatus.DRAFT}</p>
          <p className="text-sm text-slate-300">PENDING: {stats.articles.byStatus.PENDING}</p>
          <p className="text-sm text-slate-300">PUBLISHED: {stats.articles.byStatus.PUBLISHED}</p>
          <p className="text-sm text-slate-300">REJECTED: {stats.articles.byStatus.REJECTED}</p>
        </div>
      </div>
    </div>
  );
}
