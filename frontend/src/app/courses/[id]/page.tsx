import { apiFetch } from '@/lib/api';
import Link from 'next/link';

export const revalidate = 60;

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let course;
  try {
    course = await apiFetch<any>(`/courses/${id}`);
  } catch {
    return <div>Курс не найден</div>;
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{course.name}</h1>
      {course.description && (
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{course.description}</p>
      )}
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Статьи курса</h2>
      <ol style={{ paddingLeft: '1.5rem' }}>
        {course.articles
          ?.filter((ca: any) => ca.article?.status === 'PUBLISHED')
          .sort((a: any, b: any) => a.order - b.order)
          .map((ca: any) => (
            <li key={ca.article.id} style={{ marginBottom: '0.75rem' }}>
              <Link href={`/articles/${ca.article.id}`}>{ca.article.title}</Link>
            </li>
          ))}
      </ol>
      {(!course.articles || course.articles.filter((ca: any) => ca.article?.status === 'PUBLISHED').length === 0) && (
        <p style={{ color: 'var(--text-muted)' }}>В курсе пока нет опубликованных статей</p>
      )}
    </div>
  );
}
