'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { AdminNav } from '@/components/AdminNav';
import { revalidateCourses } from './actions';

export default function AdminCoursesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [publishImmediately, setPublishImmediately] = useState(true);

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
      body: {
        name,
        slug,
        description: description || undefined,
        status: publishImmediately ? 'published' : 'draft',
      },
    });
    setName('');
    setSlug('');
    setDescription('');
    await revalidateCourses();
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить курс?')) return;
    await apiFetch(`/courses/${id}`, { method: 'DELETE' });
    await revalidateCourses();
    load();
  };

  const togglePublish = async (course: any) => {
    await apiFetch(`/courses/${course.id}`, {
      method: 'PATCH',
      body: { status: course.status === 'published' ? 'draft' : 'published' },
    });
    await revalidateCourses(course.id);
    load();
  };

  if (authLoading || loading) return <div className="text-slate-400">Загрузка...</div>;

  return (
    <div className="space-y-4">
      <h1 className="mb-4 text-2xl font-bold text-slate-100">Курсы</h1>
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
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={publishImmediately}
            onChange={(e) => setPublishImmediately(e.target.checked)}
          />
          Опубликовать сразу (отображать на странице «Курсы»)
        </label>
        <button type="submit" className="btn btn-primary">Создать</button>
      </form>

      {courses.map((course) => (
        <div key={course.id} className="card" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <h3>{course.name}</h3>
              <p style={{ color: '#9A9884', fontSize: '0.875rem' }}>
                {course.slug} ·{' '}
                <span className={`badge badge-${course.status === 'published' ? 'published' : 'draft'}`}>
                  {course.status === 'published' ? 'опубликован' : 'черновик'}
                </span>
                {' '}· {course._count?.articles || 0} статей
              </p>
              {course.status === 'draft' && (
                <p style={{ color: 'var(--warning, #b45309)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                  Не виден на публичной странице — нажмите «Опубликовать»
                </p>
              )}
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
