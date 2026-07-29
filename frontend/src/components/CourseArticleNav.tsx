import Link from 'next/link';
import type { CSSProperties } from 'react';

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

  const linkStyle = (enabled: boolean): CSSProperties => ({
    textDecoration: 'none',
    pointerEvents: enabled ? 'auto' : 'none',
    opacity: enabled ? 1 : 0.45,
  });

  return (
    <nav
      aria-label="Навигация по курсу"
      style={{
        marginTop: '3rem',
        padding: '1rem',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        gap: '0.75rem',
        alignItems: 'center',
      }}
    >
      <div>
        {courseNav.previous ? (
          <Link
            href={`/articles/${courseNav.previous.id}${courseQuery}`}
            className="btn btn-secondary"
            style={{ ...linkStyle(true), display: 'inline-block', maxWidth: '100%' }}
            title={courseNav.previous.title}
          >
            ← Предыдущая
          </Link>
        ) : (
          <span className="btn btn-secondary" style={linkStyle(false)}>
            ← Предыдущая
          </span>
        )}
      </div>

      <Link
        href={`/courses/${courseNav.course.id}`}
        className="btn btn-primary"
        style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}
        title={courseNav.course.name}
      >
        Оглавление курса
      </Link>

      <div style={{ textAlign: 'right' }}>
        {courseNav.next ? (
          <Link
            href={`/articles/${courseNav.next.id}${courseQuery}`}
            className="btn btn-secondary"
            style={{ ...linkStyle(true), display: 'inline-block', maxWidth: '100%' }}
            title={courseNav.next.title}
          >
            Следующая →
          </Link>
        ) : (
          <span className="btn btn-secondary" style={linkStyle(false)}>
            Следующая →
          </span>
        )}
      </div>
    </nav>
  );
}
