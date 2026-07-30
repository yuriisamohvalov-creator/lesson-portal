'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { AdminNav } from '@/components/AdminNav';

export default function AdminCourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [courseId, setCourseId] = useState('');
  const [course, setCourse] = useState<any>(null);
  const [publishedArticles, setPublishedArticles] = useState<any[]>([]);
  const [articleId, setArticleId] = useState('');
  const [order, setOrder] = useState(1);

  useEffect(() => {
    params.then(({ id }) => setCourseId(id));
  }, [params]);

  const load = () => {
    if (!courseId) return;
    Promise.all([
      apiFetch<any>(`/courses/${courseId}`),
      apiFetch<any>('/articles?limit=100'),
    ]).then(([courseData, articlesData]) => {
      setCourse(courseData);
      setPublishedArticles(articlesData.data.filter((a: any) => a.status === 'PUBLISHED'));
    });
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'ADMIN') {
      router.push('/');
      return;
    }
    load();
  }, [user, authLoading, router, courseId]);

  const handleAddArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch(`/courses/${courseId}/articles`, {
      method: 'POST',
      body: { articleId, order: Number(order) },
    });
    setArticleId('');
    load();
  };

  const handleRemove = async (articleIdToRemove: string) => {
    await apiFetch(`/courses/${courseId}/articles/${articleIdToRemove}`, { method: 'DELETE' });
    load();
  };

  if (authLoading || !course) return <div className="text-slate-400">Загрузка...</div>;

  return (
    <div className="space-y-4">
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{course.name}</h1>
      <AdminNav />
      <Link href="/admin/courses" style={{ color: '#9A9884', fontSize: '0.875rem' }}>← К списку курсов</Link>

      <section style={{ marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Статьи в курсе</h2>
        {course.articles?.length === 0 && (
          <p style={{ color: '#9A9884' }}>Статей пока нет</p>
        )}
        {course.articles?.map((item: any) => (
          <div key={item.id} className="card" style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>{item.order}. {item.article?.title}</span>
            <button className="btn btn-danger" onClick={() => handleRemove(item.article.id)}>Убрать</button>
          </div>
        ))}
      </section>

      <form onSubmit={handleAddArticle} className="card" style={{ marginTop: '1.5rem' }}>
        <h3>Добавить статью</h3>
        <div className="form-group">
          <label>Статья</label>
          <select value={articleId} onChange={(e) => setArticleId(e.target.value)} required>
            <option value="">Выберите статью</option>
            {publishedArticles.map((a) => (
              <option key={a.id} value={a.id}>{a.title}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Порядок</label>
          <input type="number" min={1} value={order} onChange={(e) => setOrder(Number(e.target.value))} />
        </div>
        <button type="submit" className="btn btn-primary">Добавить</button>
      </form>
    </div>
  );
}
