import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { ArticleCard } from '@/components/ui';

export const revalidate = 60;

const PAGE_SIZE = 12;

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const { page: pageParam } = await searchParams;
  const page = Number(pageParam) || 1;

  let category: any;
  let data: any;
  try {
    [category, data] = await Promise.all([
      apiFetch<any>(`/categories/${id}`),
      apiFetch<any>(
        `/articles?categoryId=${id}&page=${page}&limit=${PAGE_SIZE}`,
      ),
    ]);
  } catch {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-950/40 p-6 text-rose-300">
        Категория не найдена
      </div>
    );
  }

  const total = data.meta?.total ?? data.data.length;
  const totalPages = data.meta?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">{category.name}</h1>
        <p className="mt-1 text-sm text-slate-400">
          {total} статей
          {totalPages > 1 && ` · страница ${page} из ${totalPages}`}
        </p>
      </div>

      {data.data.length === 0 ? (
        <p className="text-slate-400">Нет опубликованных статей в этой категории</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.data.map((article: any) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/categories/${id}?page=${p}`}
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
