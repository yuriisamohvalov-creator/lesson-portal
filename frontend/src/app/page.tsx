import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { ArticleCard, CategoryCard } from '@/components/ui';
import { Sparkles } from 'lucide-react';

async function getData() {
  const [categories, articles] = await Promise.all([
    apiFetch<any[]>('/categories'),
    apiFetch<any>('/articles?limit=6'),
  ]);
  return { categories, articles: articles.data };
}

export const revalidate = 60;

export default async function HomePage() {
  let data;
  try {
    data = await getData();
  } catch {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-950/40 p-6 text-rose-300">
        Ошибка загрузки
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-950 p-6 sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-600/20 via-transparent to-transparent" />
        <div className="relative space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[11px] font-semibold text-indigo-300">
            <Sparkles className="h-3.5 w-3.5" />
            Kanagawa Noctalia
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
            Категории
          </h1>
          <p className="max-w-xl text-sm text-slate-400">
            Учебные материалы по категориям — статьи, курсы и видео в едином тёмном интерфейсе.
          </p>
        </div>
      </section>

      <section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.categories.map((cat: any) => (
            <CategoryCard key={cat.id} category={cat} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-bold text-slate-100">Последние статьи</h2>
          <Link href="/articles" className="text-sm font-medium text-indigo-400 no-underline hover:text-indigo-300">
            Все статьи →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.articles.map((article: any) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      </section>
    </div>
  );
}
