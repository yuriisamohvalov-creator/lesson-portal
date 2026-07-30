import Link from 'next/link';

interface NavArticle {
  id: string;
  title: string;
}

interface CourseNav {
  course: { id: string; name: string };
  previous: NavArticle | null;
  next: NavArticle | null;
}

export function CourseArticleNav({ courseNav }: { courseNav: CourseNav }) {
  const courseQuery = `?course=${courseNav.course.id}`;

  return (
    <nav
      aria-label="Навигация по курсу"
      className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
    >
      <div>
        {courseNav.previous ? (
          <Link
            href={`/articles/${courseNav.previous.id}${courseQuery}`}
            className="inline-block max-w-full truncate rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 no-underline hover:bg-slate-700"
            title={courseNav.previous.title}
          >
            ← Предыдущая
          </Link>
        ) : (
          <span className="inline-block rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-600 opacity-45">
            ← Предыдущая
          </span>
        )}
      </div>

      <Link
        href={`/courses/${courseNav.course.id}`}
        className="whitespace-nowrap rounded-xl bg-indigo-600/80 px-3 py-2 text-xs font-semibold text-slate-100 no-underline hover:bg-indigo-500"
        title={courseNav.course.name}
      >
        Оглавление курса
      </Link>

      <div className="text-right">
        {courseNav.next ? (
          <Link
            href={`/articles/${courseNav.next.id}${courseQuery}`}
            className="inline-block max-w-full truncate rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 no-underline hover:bg-slate-700"
            title={courseNav.next.title}
          >
            Следующая →
          </Link>
        ) : (
          <span className="inline-block rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-600 opacity-45">
            Следующая →
          </span>
        )}
      </div>
    </nav>
  );
}
