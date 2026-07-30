'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function ProfilePage() {
  const { user, setUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }
    setDisplayName(user.displayName);
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const updated = await apiFetch<any>('/users/me', {
        method: 'PATCH',
        body: { displayName },
      });
      setUser(updated);
      setMessage('Профиль обновлён');
    } catch (err: any) {
      setError(err.message || 'Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) {
    return <div className="text-slate-400">Загрузка...</div>;
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-bold text-slate-100">Профиль</h1>
      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label>Email</label>
          <input value={user.email} disabled />
        </div>
        <div className="form-group">
          <label>Имя</label>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Роль</label>
          <input value={user.role} disabled />
        </div>
        {message && <p className="mb-3 text-sm text-emerald-400">{message}</p>}
        {error && <p className="mb-3 text-sm text-rose-400">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Сохранение...' : 'Сохранить'}
        </button>
      </form>
    </div>
  );
}
