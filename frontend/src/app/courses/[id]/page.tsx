import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';

export const revalidate = 60;

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let course;
  try {
    course = await apiFetch<any>(`/courses/${id}`);
  } catch {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-950/40 p-6 text-rose-300">
        Курс не найден
      </div>
    );
  }

  const published = (course.articles || [])
    .filter((ca: any) => ca.article?.status === 'PUBLISHED')
    .sort((a: any, b: any) => a.order - b.order);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-cyan-950/50 via-slate-900 to-slate-950 p-6 sm:p-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-300">
          <BookOpen className="h-3.5 w-3.5" />
          Курс
        </div>
        <h1 className="text-3xl font-bold text-slate-100">{course.name}</h1>
        {course.description && (
          <p className="mt-3 text-slate-400">{course.description}</p>
        )}
        {course.author?.displayName && (
          <p className="mt-4 text-sm text-slate-500">Автор: {course.author.displayName}</p>
        )}
      </div>

      <div>
        <h2 className="mb-4 text-xl font-bold text-slate-100">Статьи курса</h2>
        {published.length === 0 ? (
          <p className="text-slate-400">В курсе пока нет опубликованных статей</p>
        ) : (
          <ol className="space-y-2">
            {published.map((ca: any, index: number) => (
              <li key={ca.article.id}>
                <Link
                  href={`/articles/${ca.article.id}?course=${id}`}
                  className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 no-underline transition-colors hover:border-indigo-500/40 hover:bg-slate-800/80"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600/20 text-sm font-bold text-indigo-300">
                    {index + 1}
                  </span>
                  <span className="font-medium text-slate-200">{ca.article.title}</span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
