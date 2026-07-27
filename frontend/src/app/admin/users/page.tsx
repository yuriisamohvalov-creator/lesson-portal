'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  const loadUsers = () => {
    apiFetch<any>('/users?page=1&limit=100')
      .then((data) => setUsers(data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') {
      router.push('/');
      return;
    }
    loadUsers();
  }, [user, router]);

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

  if (loading) return <div>Загрузка...</div>;

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Пользователи</h1>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <Link href="/admin/stats" className="btn btn-secondary" style={{ textDecoration: 'none' }}>Статистика</Link>
        <Link href="/admin/users" className="btn btn-primary" style={{ textDecoration: 'none' }}>Пользователи</Link>
      </div>
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
                  <button
                    className={`btn ${u.isBlocked ? 'btn-success' : 'btn-danger'}`}
                    onClick={() => handleToggleBlock(u.id, u.isBlocked)}
                  >
                    {u.isBlocked ? 'Разблокировать' : 'Заблокировать'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
