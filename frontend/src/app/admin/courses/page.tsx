'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { AdminNav } from '@/components/AdminNav';

export default function AdminCoursesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');

  const load = () => {
    setLoading(true);
    apiFetch<any[]>('/courses/admin')
      .then(setCourses)
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
    await apiFetch('/courses', {
      method: 'POST',
      body: { name, slug, description: description || undefined },
    });
    setName('');
    setSlug('');
    setDescription('');
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить курс?')) return;
    await apiFetch(`/courses/${id}`, { method: 'DELETE' });
    load();
  };

  const togglePublish = async (course: any) => {
    await apiFetch(`/courses/${course.id}`, {
      method: 'PATCH',
      body: { status: course.status === 'published' ? 'draft' : 'published' },
    });
    load();
  };

  if (authLoading || loading) return <div>Загрузка...</div>;

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Курсы</h1>
      <AdminNav />

      <form onSubmit={handleCreate} className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Новый курс</h3>
        <div className="form-group">
          <label>Название</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Slug</label>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Описание</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>
        <button type="submit" className="btn btn-primary">Создать</button>
      </form>

      {courses.map((course) => (
        <div key={course.id} className="card" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <h3>{course.name}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                {course.slug} · {course.status} · {course._count?.articles || 0} статей
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Link href={`/admin/courses/${course.id}`} className="btn btn-secondary" style={{ textDecoration: 'none' }}>
                Управление
              </Link>
              <button className="btn btn-secondary" onClick={() => togglePublish(course)}>
                {course.status === 'published' ? 'Снять' : 'Опубликовать'}
              </button>
              <button className="btn btn-danger" onClick={() => handleDelete(course.id)}>Удалить</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
