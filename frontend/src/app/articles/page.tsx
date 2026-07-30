import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { ArticleCard } from '@/components/ui';
import { Search } from 'lucide-react';

async function getArticles(page: number = 1, search?: string) {
  const params = new URLSearchParams({ page: String(page), limit: '12' });
  if (search) params.set('search', search);
  return apiFetch<any>(`/articles?${params}`);
}

export const revalidate = 60;

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const { page: pageParam, search } = await searchParams;
  const page = Number(pageParam) || 1;
  let data;
  try {
    data = await getArticles(page, search);
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
        <h1 className="text-2xl font-bold text-slate-100">Статьи</h1>
        <p className="mt-1 text-sm text-slate-400">Каталог опубликованных материалов</p>
      </div>

      <form className="flex flex-wrap gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Поиск по заголовку..."
            className="w-full rounded-xl border border-slate-700/80 bg-slate-800/80 py-2 pl-9 pr-4 text-sm text-slate-200 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>
        <button
          type="submit"
          className="rounded-xl bg-indigo-600/80 px-4 py-2 text-sm font-semibold text-slate-100 transition-colors hover:bg-indigo-500"
        >
          Найти
        </button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.data.map((article: any) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>

      {data.meta.totalPages > 1 && (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: data.meta.totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/articles?page=${p}${search ? `&search=${search}` : ''}`}
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
    </div>
  );
}
