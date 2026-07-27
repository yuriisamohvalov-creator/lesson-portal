'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminStatsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') {
      router.push('/');
      return;
    }
    apiFetch<any>('/admin/stats')
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, router]);

  if (loading) return <div>Загрузка...</div>;
  if (!stats) return <div>Ошибка загрузки</div>;

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Админ-панель</h1>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <Link href="/admin/stats" className="btn btn-primary" style={{ textDecoration: 'none' }}>Статистика</Link>
        <Link href="/admin/users" className="btn btn-secondary" style={{ textDecoration: 'none' }}>Пользователи</Link>
      </div>
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
      <div className="grid grid-2">
        <div className="card">
          <h3>Пользователи по ролям</h3>
          <p>USER: {stats.users.byRole.USER}</p>
          <p>MODERATOR: {stats.users.byRole.MODERATOR}</p>
          <p>ADMIN: {stats.users.byRole.ADMIN}</p>
        </div>
        <div className="card">
          <h3>Статьи по статусам</h3>
          <p>DRAFT: {stats.articles.byStatus.DRAFT}</p>
          <p>PENDING: {stats.articles.byStatus.PENDING}</p>
          <p>PUBLISHED: {stats.articles.byStatus.PUBLISHED}</p>
          <p>REJECTED: {stats.articles.byStatus.REJECTED}</p>
        </div>
      </div>
    </div>
  );
}
