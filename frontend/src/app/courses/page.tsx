import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { CourseCard } from '@/components/ui';

export const revalidate = 60;

export default async function CoursesPage() {
  let data;
  try {
    data = await apiFetch<any>('/courses?limit=20');
  } catch {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-950/40 p-6 text-rose-300">
        Ошибка загрузки
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Курсы</h1>
        <p className="mt-1 text-sm text-slate-400">Подборки статей в порядке изучения</p>
      </div>
      {data.data.length === 0 ? (
        <p className="text-slate-400">Пока нет опубликованных курсов.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.data.map((course: any) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
      <Link href="/articles" className="inline-block text-sm text-indigo-400 no-underline hover:text-indigo-300">
        Смотреть все статьи →
      </Link>
    </div>
  );
}
