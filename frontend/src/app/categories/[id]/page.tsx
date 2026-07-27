import { apiFetch } from '@/lib/api';
import Link from 'next/link';

export const revalidate = 60;

export default async function CategoryPage({ params }: { params: { id: string } }) {
  let data;
  try {
    data = await apiFetch<any>(`/articles?categoryId=${params.id}&limit=20`);
  } catch {
    return <div>Категория не найдена</div>;
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Статьи в категории</h1>
      <div className="grid grid-2">
        {data.data.map((article: any) => (
          <Link key={article.id} href={`/articles/${article.id}`} style={{ textDecoration: 'none' }}>
            <div className="card" style={{ cursor: 'pointer' }}>
              <h3 style={{ color: 'var(--text)' }}>{article.title}</h3>
              <p style={{ fontSize: '0.875rem' }}>
                {article.author?.displayName} · {new Date(article.createdAt).toLocaleDateString('ru-RU')}
              </p>
            </div>
          </Link>
        ))}
      </div>
      {data.data.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Нет статей в этой категории</p>}
    </div>
  );
}
