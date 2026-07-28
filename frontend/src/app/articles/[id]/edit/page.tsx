'use client';

import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

const TOOLBAR_BUTTONS = [
  { label: 'B', title: 'Жирный', command: 'bold' },
  { label: 'I', title: 'Курсив', command: 'italic' },
  { label: 'U', title: 'Подчёркнутый', command: 'underline' },
  { label: 'H1', title: 'Заголовок 1', command: 'formatBlock', value: 'h1' },
  { label: 'H2', title: 'Заголовок 2', command: 'formatBlock', value: 'h2' },
  { label: 'H3', title: 'Заголовок 3', command: 'formatBlock', value: 'h3' },
  { label: 'UL', title: 'Список', command: 'insertUnorderedList' },
  { label: 'OL', title: 'Нумерованный', command: 'insertOrderedList' },
  { label: '🔗', title: 'Ссылка', command: 'createLink' },
  { label: '📷', title: 'Изображение', command: 'insertImage' },
  { label: '⟨/⟩', title: 'Код', command: 'formatBlock', value: 'pre' },
  { label: '❝', title: 'Цитата', command: 'formatBlock', value: 'blockquote' },
];

export default function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const [articleId, setArticleId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialContent, setInitialContent] = useState('');
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const editorRef = useRef<HTMLDivElement>(null);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    params.then(({ id }) => setArticleId(id));
  }, [params]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }
    if (!articleId) return;
    Promise.all([
      apiFetch<any>(`/articles/${articleId}`),
      apiFetch<any[]>('/categories'),
    ]).then(([article, cats]) => {
      setTitle(article.title);
      setCategoryId(article.categoryId);
      setInitialContent(article.content || '');
      setCategories(cats);
    }).catch(() => setError('Не удалось загрузить статью'));
  }, [user, authLoading, router, articleId]);

  useEffect(() => {
    if (editorRef.current && initialContent) {
      editorRef.current.innerHTML = initialContent;
    }
  }, [initialContent]);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleToolbarAction = (command: string, value?: string) => {
    if (command === 'createLink') {
      const url = prompt('Введите URL ссылки:');
      if (url) execCommand(command, url);
    } else if (command === 'insertImage') {
      const url = prompt('Введите URL изображения:');
      if (url) execCommand(command, url);
    } else {
      execCommand(command, value);
    }
  };

  const getEditorContent = () => editorRef.current?.innerHTML || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const content = getEditorContent();
      await apiFetch(`/articles/${articleId}`, {
        method: 'PATCH',
        body: { title, content, categoryId },
      });
      router.push('/articles/mine');
    } catch (err: any) {
      setError(err.message || 'Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForModeration = async () => {
    setError('');
    setLoading(true);
    try {
      const content = getEditorContent();
      await apiFetch(`/articles/${articleId}`, {
        method: 'PATCH',
        body: { title, content, categoryId },
      });
      await apiFetch(`/articles/${articleId}/submit`, { method: 'POST' });
      router.push('/articles/mine');
    } catch (err: any) {
      setError(err.message || 'Ошибка отправки');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '2rem auto', padding: '0 1rem' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Редактирование статьи</h1>

      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{
            background: '#fee2e2',
            color: 'var(--danger)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius)',
            marginBottom: '1rem',
          }}>
            {error}
          </div>
        )}

        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="form-group">
            <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Заголовок</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{ fontSize: '1.1rem', padding: '0.75rem' }}
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Категория</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
              <option value="">Выберите категорию</option>
              {categories.map((cat: any) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Содержание</label>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button
                type="button"
                className={`btn ${activeTab === 'edit' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('edit')}
                style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
              >
                Редактор
              </button>
              <button
                type="button"
                className={`btn ${activeTab === 'preview' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('preview')}
                style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
              >
                Предпросмотр
              </button>
            </div>
          </div>

          {activeTab === 'edit' && (
            <>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.25rem',
                padding: '0.5rem',
                background: '#f3f4f6',
                borderRadius: 'var(--radius) var(--radius) 0 0',
                borderBottom: '1px solid var(--border)',
              }}>
                {TOOLBAR_BUTTONS.map((btn) => (
                  <button
                    key={btn.label}
                    type="button"
                    title={btn.title}
                    onClick={() => handleToolbarAction(btn.command, btn.value)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      background: 'white',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                    }}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                style={{
                  minHeight: '300px',
                  padding: '1rem',
                  border: '1px solid var(--border)',
                  borderRadius: '0 0 var(--radius) var(--radius)',
                  outline: 'none',
                  lineHeight: 1.8,
                  fontSize: '0.95rem',
                }}
              />
            </>
          )}

          {activeTab === 'preview' && (
            <div
              dangerouslySetInnerHTML={{ __html: getEditorContent() }}
              style={{
                minHeight: '300px',
                padding: '1rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                lineHeight: 1.8,
              }}
            />
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={() => router.back()}>
            Отмена
          </button>
          <button type="submit" className="btn btn-secondary" disabled={loading || !title || !categoryId}>
            {loading ? 'Сохранение...' : 'Сохранить'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmitForModeration}
            disabled={loading || !title || !categoryId}
          >
            {loading ? 'Отправка...' : 'Отправить на модерацию'}
          </button>
        </div>
      </form>
    </div>
  );
}
