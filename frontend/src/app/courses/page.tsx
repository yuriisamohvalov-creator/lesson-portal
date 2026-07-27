import Link from 'next/link';
import { apiFetch } from '@/lib/api';

export const revalidate = 60;

export default async function CoursesPage() {
  let data;
  try {
    data = await apiFetch<any>('/courses?limit=20');
  } catch {
    return <div>Ошибка загрузки</div>;
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Курсы</h1>
      <div className="grid grid-3">
        {data.data.map((course: any) => (
          <Link key={course.id} href={`/courses/${course.id}`} style={{ textDecoration: 'none' }}>
            <div className="card" style={{ cursor: 'pointer' }}>
              <h3 style={{ color: 'var(--text)' }}>{course.name}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{course.description}</p>
              <p style={{ fontSize: '0.875rem' }}>
                {course.author?.displayName} · {course.articles?.length || 0} статей
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
