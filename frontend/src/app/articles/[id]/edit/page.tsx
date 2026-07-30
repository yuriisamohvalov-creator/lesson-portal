'use client';

import { useState, useEffect, useRef } from 'react';
import { apiFetch, getApiErrorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { PdfImportButton } from '@/components/PdfImportButton';

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
  const [content, setContent] = useState('');
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
      setContent(initialContent);
    }
  }, [initialContent]);

  const syncContentFromEditor = () => {
    const html = editorRef.current?.innerHTML || '';
    setContent(html);
    return html;
  };

  const switchToPreview = () => {
    syncContentFromEditor();
    setActiveTab('preview');
  };

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

  const getEditorContent = () => content || editorRef.current?.innerHTML || '';

  const applyPdfImport = ({ html, suggestedTitle }: { html: string; suggestedTitle?: string }) => {
    if (editorRef.current) {
      editorRef.current.innerHTML = html;
    }
    setContent(html);
    if (suggestedTitle && !title.trim()) {
      setTitle(suggestedTitle);
    }
    setActiveTab('edit');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const bodyContent = syncContentFromEditor();
      await apiFetch(`/articles/${articleId}`, {
        method: 'PATCH',
        body: { title, content: bodyContent, categoryId },
      });
      router.push('/articles/mine');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Ошибка сохранения'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForModeration = async () => {
    setError('');
    setLoading(true);
    try {
      const bodyContent = syncContentFromEditor();
      await apiFetch(`/articles/${articleId}`, {
        method: 'PATCH',
        body: { title, content: bodyContent, categoryId },
      });
      await apiFetch(`/articles/${articleId}/submit`, { method: 'POST' });
      router.push('/articles/mine');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Ошибка отправки'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold text-slate-100">Редактирование статьи</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        <div className="card">
          <div className="form-group">
            <label>Заголовок</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Категория</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
              <option value="">Выберите категорию</option>
              {categories.map((cat: any) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="card">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <label className="text-sm font-semibold text-slate-300">Содержание</label>
            <div className="flex flex-wrap items-center gap-1">
              <PdfImportButton
                disabled={loading}
                hasExistingContent={Boolean(getEditorContent().replace(/<[^>]*>/g, '').trim())}
                onImported={applyPdfImport}
                onError={setError}
              />
              <button
                type="button"
                className={`btn text-xs ${activeTab === 'edit' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('edit')}
              >
                Редактор
              </button>
              <button
                type="button"
                className={`btn text-xs ${activeTab === 'preview' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={switchToPreview}
              >
                Предпросмотр
              </button>
            </div>
          </div>

          <div style={{ display: activeTab === 'edit' ? 'block' : 'none' }}>
            <div className="flex flex-wrap gap-1 rounded-t-xl border border-b-0 border-slate-700 bg-slate-800 p-2">
              {TOOLBAR_BUTTONS.map((btn) => (
                <button
                  key={btn.label}
                  type="button"
                  title={btn.title}
                  onClick={() => handleToolbarAction(btn.command, btn.value)}
                  className="cursor-pointer rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700"
                >
                  {btn.label}
                </button>
              ))}
            </div>
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="min-h-[300px] rounded-b-xl border border-slate-700 bg-slate-950/50 p-4 text-sm leading-8 text-slate-200 outline-none"
              onInput={syncContentFromEditor}
            />
          </div>

          {activeTab === 'preview' && (
            <div
              dangerouslySetInnerHTML={{ __html: content }}
              className="article-prose min-h-[300px] rounded-xl border border-slate-700 p-4 leading-8"
            />
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-3">
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
