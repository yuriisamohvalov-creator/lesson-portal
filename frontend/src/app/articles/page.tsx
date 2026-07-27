import Link from 'next/link';
import { apiFetch } from '@/lib/api';

async function getArticles(page: number = 1, search?: string) {
  const params = new URLSearchParams({ page: String(page), limit: '12' });
  if (search) params.set('search', search);
  return apiFetch<any>(`/articles?${params}`);
}

export const revalidate = 60;

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: { page?: string; search?: string };
}) {
  const page = Number(searchParams.page) || 1;
  const search = searchParams.search;
  let data;
  try {
    data = await getArticles(page, search);
  } catch {
    return <div>Ошибка загрузки</div>;
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Статьи</h1>
      <form style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          name="search"
          defaultValue={search}
          placeholder="Поиск по заголовку..."
          style={{ padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', width: '300px' }}
        />
        <button type="submit" className="btn btn-primary" style={{ marginLeft: '0.5rem' }}>Найти</button>
      </form>
      <div className="grid grid-3">
        {data.data.map((article: any) => (
          <Link key={article.id} href={`/articles/${article.id}`} style={{ textDecoration: 'none' }}>
            <div className="card" style={{ cursor: 'pointer' }}>
              <h3 style={{ color: 'var(--text)' }}>{article.title}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{article.category?.name}</p>
              <p style={{ fontSize: '0.875rem' }}>
                {article.author?.displayName} · {new Date(article.createdAt).toLocaleDateString('ru-RU')}
              </p>
            </div>
          </Link>
        ))}
      </div>
      {data.meta.totalPages > 1 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          {Array.from({ length: data.meta.totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/articles?page=${p}${search ? `&search=${search}` : ''}`}
              className={`btn ${p === page ? 'btn-primary' : 'btn-secondary'}`}
              style={{ textDecoration: 'none' }}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
