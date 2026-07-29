'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { AdminNav } from '@/components/AdminNav';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const loadUsers = () => {
    setLoading(true);
    apiFetch<any>('/users?page=1&limit=100')
      .then((data) => setUsers(data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'ADMIN') {
      router.push('/');
      return;
    }
    loadUsers();
  }, [user, authLoading, router]);

  const handleChangeRole = async (userId: string, role: string) => {
    await apiFetch(`/users/${userId}/role`, {
      method: 'PATCH',
      body: { role },
    });
    loadUsers();
  };

  const handleToggleBlock = async (userId: string, isBlocked: boolean) => {
    const action = isBlocked ? 'unblock' : 'block';
    await apiFetch(`/users/${userId}/${action}`, { method: 'PATCH' });
    loadUsers();
  };

  const handleDelete = async (userId: string, email: string) => {
    if (!confirm(`Удалить пользователя ${email}? Его статьи, курсы и комментарии будут удалены.`)) {
      return;
    }
    setDeletingId(userId);
    try {
      await apiFetch(`/users/${userId}`, { method: 'DELETE' });
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Ошибка удаления');
    } finally {
      setDeletingId(null);
    }
  };

  if (authLoading || loading) return <div>Загрузка...</div>;

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Пользователи</h1>
      <AdminNav />
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border)' }}>
            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Email</th>
            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Имя</th>
            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Роль</th>
            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Статус</th>
            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Действия</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '0.5rem' }}>{u.email}</td>
              <td style={{ padding: '0.5rem' }}>{u.displayName}</td>
              <td style={{ padding: '0.5rem' }}>
                <select
                  value={u.role}
                  onChange={(e) => handleChangeRole(u.id, e.target.value)}
                  style={{ padding: '0.25rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
                >
                  <option value="USER">USER</option>
                  <option value="MODERATOR">MODERATOR</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </td>
              <td style={{ padding: '0.5rem' }}>
                {u.isBlocked ? (
                  <span style={{ color: 'var(--danger)' }}>Заблокирован</span>
                ) : (
                  <span style={{ color: 'var(--success)' }}>Активен</span>
                )}
              </td>
              <td style={{ padding: '0.5rem' }}>
                {u.id !== user?.id && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      className={`btn ${u.isBlocked ? 'btn-success' : 'btn-danger'}`}
                      onClick={() => handleToggleBlock(u.id, u.isBlocked)}
                    >
                      {u.isBlocked ? 'Разблокировать' : 'Заблокировать'}
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDelete(u.id, u.email)}
                      disabled={deletingId === u.id}
                    >
                      {deletingId === u.id ? '...' : 'Удалить'}
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
