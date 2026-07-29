'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { AdminNav } from '@/components/AdminNav';

export default function AdminCategoriesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    apiFetch<any[]>('/categories')
      .then(setCategories)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'ADMIN') {
      router.push('/');
      return;
    }
    load();
  }, [user, authLoading, router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/categories', {
        method: 'POST',
        body: { name, slug },
      });
      setName('');
      setSlug('');
      load();
    } catch (err: any) {
      setError(err.message || 'Ошибка создания');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить категорию?')) return;
    try {
      await apiFetch(`/categories/${id}`, { method: 'DELETE' });
      load();
    } catch (err: any) {
      alert(err.message || 'Ошибка удаления');
    }
  };

  if (authLoading || loading) return <div>Загрузка...</div>;

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Категории</h1>
      <AdminNav />

      <form onSubmit={handleCreate} className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Новая категория</h3>
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
        <div className="form-group">
          <label>Название</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Slug</label>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} required />
        </div>
        <button type="submit" className="btn btn-primary">Создать</button>
      </form>

      <div className="grid grid-2">
        {categories.map((cat) => (
          <div key={cat.id} className="card">
            <h3>{cat.name}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              slug: {cat.slug} · {cat._count?.articles || 0} статей
            </p>
            <button className="btn btn-danger" style={{ marginTop: '0.5rem' }} onClick={() => handleDelete(cat.id)}>
              Удалить
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
