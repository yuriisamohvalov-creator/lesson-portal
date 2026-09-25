import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { CourseCard } from '@/components/ui';

const COURSES_PER_PAGE = 15;

export const revalidate = 60;

function coursesPagePath(page: number, search: string) {
  const params = new URLSearchParams();
  if (search) {
    params.set('search', search);
  }
  if (page > 1) {
    params.set('page', String(page));
  }
  const qs = params.toString();
  return qs ? `/courses?${qs}` : '/courses';
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const { page: pageParam, search: searchParam } = await searchParams;
  const page = Math.max(1, Math.floor(Number(pageParam)) || 1);
  const search = (searchParam ?? '').trim();
  let data;
  try {
    const limit = COURSES_PER_PAGE;
    const searchQs = search ? `&search=${encodeURIComponent(search)}` : '';
    data = await apiFetch<any>(`/courses?page=${page}&limit=${limit}${searchQs}`);
  } catch {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-950/40 p-6 text-rose-300">
        Ошибка загрузки
      </div>
    );
  }

  if (data.meta.totalPages > 0 && page > data.meta.totalPages) {
    redirect(coursesPagePath(data.meta.totalPages, search));
  }

  const emptyMessage = search
    ? 'Курсы не найдены'
    : 'Пока нет опубликованных курсов.';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Курсы</h1>
        <p className="mt-1 text-sm text-slate-400">Подборки статей в порядке изучения</p>
      </div>
      <form method="get" action="/courses" className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          name="search"
          defaultValue={search}
          placeholder="Поиск по названию или описанию"
          className="min-w-[12rem] flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
        />
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-indigo-500"
        >
          Найти
        </button>
      </form>
      {data.data.length === 0 ? (
        <p className="text-slate-400">{emptyMessage}</p>
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
              href={coursesPagePath(p, search)}
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
