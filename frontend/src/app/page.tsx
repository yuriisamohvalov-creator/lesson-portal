import Link from 'next/link';
import { apiFetch } from '@/lib/api';

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
    return <div>Ошибка загрузки</div>;
  }

  return (
    <div>
      <section style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Категории</h1>
        <div className="grid grid-3">
          {data.categories.map((cat: any) => (
            <Link key={cat.id} href={`/categories/${cat.id}`} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ cursor: 'pointer', transition: 'border-color 0.2s' }}>
                <h3>{cat.name}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  {cat._count?.articles || 0} статей
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Последние статьи</h2>
        <div className="grid grid-2">
          {data.articles.map((article: any) => (
            <Link key={article.id} href={`/articles/${article.id}`} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ cursor: 'pointer' }}>
                <h3 style={{ color: 'var(--text)', marginBottom: '0.5rem' }}>{article.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  {article.category?.name}
                </p>
                <p style={{ fontSize: '0.875rem' }}>
                  {article.author?.displayName} · {new Date(article.createdAt).toLocaleDateString('ru-RU')}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
