import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { CourseCard } from '@/components/ui';

const COURSES_PER_PAGE = 15;

export const revalidate = 60;

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Math.floor(Number(pageParam)) || 1);
  let data;
  try {
    data = await apiFetch<any>(`/courses?page=${page}&limit=${COURSES_PER_PAGE}`);
  } catch {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-950/40 p-6 text-rose-300">
        Ошибка загрузки
      </div>
    );
  }

  if (data.meta.totalPages > 0 && page > data.meta.totalPages) {
    redirect(`/courses?page=${data.meta.totalPages}`);
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
      {data.meta.totalPages > 1 && (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: data.meta.totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/courses?page=${p}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium no-underline ${
                p === page
                  ? 'bg-indigo-600/80 text-slate-100'
                  : 'border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
      <Link href="/articles" className="inline-block text-sm text-indigo-400 no-underline hover:text-indigo-300">
        Смотреть все статьи →
      </Link>
    </div>
  );
}
