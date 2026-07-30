import { apiFetch } from '@/lib/api';
import { ArticleCard } from '@/components/ui';

export const revalidate = 60;

export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let data;
  try {
    data = await apiFetch<any>(`/articles?categoryId=${id}&limit=20`);
  } catch {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-950/40 p-6 text-rose-300">
        Категория не найдена
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">Статьи в категории</h1>
      {data.data.length === 0 ? (
        <p className="text-slate-400">Нет статей в этой категории</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.data.map((article: any) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
