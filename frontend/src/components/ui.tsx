import Link from 'next/link';
import { Clock, User } from 'lucide-react';

export type ArticleCardData = {
  id: string;
  title: string;
  createdAt?: string;
  category?: { id?: string; name?: string } | null;
  author?: { displayName?: string } | null;
  description?: string | null;
  coverUrl?: string | null;
  hasVideo?: boolean;
};

export function ArticleCard({ article }: { article: ArticleCardData }) {
  return (
    <Link
      href={`/articles/${article.id}`}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 no-underline transition-all duration-300 hover:-translate-y-1 hover:border-slate-700 hover:shadow-xl hover:shadow-indigo-500/10"
    >
      <div className="relative h-36 w-full overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950">
        {article.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.coverUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-800/30 via-transparent to-transparent" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-slate-950/20" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {article.category?.name && (
            <span className="rounded-lg border border-slate-700/80 bg-slate-900/90 px-2.5 py-1 text-[11px] font-bold text-slate-200 backdrop-blur-md">
              {article.category.name}
            </span>
          )}
          {article.hasVideo && (
            <span className="rounded-lg border border-indigo-500/40 bg-indigo-950/80 px-2.5 py-1 text-[11px] font-bold text-indigo-200 backdrop-blur-md">
              Видео
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-between space-y-3 p-5">
        <div className="space-y-2">
          <h3 className="line-clamp-2 text-base font-bold leading-snug text-slate-100 transition-colors group-hover:text-indigo-300">
            {article.title}
          </h3>
          {article.description && (
            <p className="line-clamp-2 text-xs leading-relaxed text-slate-400">{article.description}</p>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs text-slate-400">
          <span className="flex items-center gap-1.5 font-medium text-slate-300">
            <User className="h-3.5 w-3.5 text-slate-500" />
            <span className="max-w-[120px] truncate">{article.author?.displayName || 'Автор'}</span>
          </span>
          {article.createdAt && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              {new Date(article.createdAt).toLocaleDateString('ru-RU')}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function CourseCard({
  course,
}: {
  course: {
    id: string;
    name: string;
    description?: string | null;
    author?: { displayName?: string } | null;
    articles?: unknown[];
  };
}) {
  return (
    <Link
      href={`/courses/${course.id}`}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 no-underline transition-all duration-300 hover:-translate-y-1 hover:border-slate-700 hover:shadow-xl hover:shadow-cyan-500/10"
    >
      <div className="relative h-28 bg-gradient-to-br from-cyan-950 via-slate-900 to-indigo-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-cyan-700/20 via-transparent to-transparent" />
      </div>
      <div className="flex flex-1 flex-col space-y-3 p-5">
        <h3 className="line-clamp-2 text-base font-bold text-slate-100 transition-colors group-hover:text-cyan-300">
          {course.name}
        </h3>
        {course.description && (
          <p className="line-clamp-2 text-xs text-slate-400">{course.description}</p>
        )}
        <p className="border-t border-slate-800/80 pt-3 text-xs text-slate-400">
          {course.author?.displayName || 'Автор'} · {course.articles?.length || 0} статей
        </p>
      </div>
    </Link>
  );
}

export function CategoryCard({
  category,
}: {
  category: { id: string; name: string; _count?: { articles?: number } };
}) {
  return (
    <Link
      href={`/categories/${category.id}`}
      className="block rounded-2xl border border-slate-800 bg-slate-900/80 p-5 no-underline transition-all hover:-translate-y-0.5 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/10"
    >
      <h3 className="mb-1 text-base font-bold text-slate-100">{category.name}</h3>
      <p className="text-xs text-slate-400">{category._count?.articles || 0} статей</p>
    </Link>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase();
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium badge-${key}`}>
      {status}
    </span>
  );
}
