# version2 — Kanagawa UI

Ветка `version2` переносит визуальный стиль из [education-portal](https://github.com/yuriisamohvalov-creator/education-portal) на основу **lessons-portal** (Next.js + Nest/Prisma).

## Что сделано

- Tailwind CSS v4 + палитра Kanagawa (тёмная тема) в [`frontend/src/app/globals.css`](../frontend/src/app/globals.css)
- Shell: sticky Navbar + Sidebar ([`AppShell`](../frontend/src/components/AppShell.tsx), [`Navbar`](../frontend/src/components/Navbar.tsx), [`Sidebar`](../frontend/src/components/Sidebar.tsx))
- Карточки статей/курсов/категорий ([`ui.tsx`](../frontend/src/components/ui.tsx))
- Перестилизованы публичные, auth, профиль, модерация и admin-страницы
- Backend, Prisma, маршруты и `apiFetch` **без изменений**

## Маппинг education-portal → lessons-portal

| education-portal | lessons-portal |
|------------------|----------------|
| Lesson / LessonCard | Article / ArticleCard |
| CategoriesView | `/` + `/categories/[id]` |
| LessonView | `/articles/[id]` |
| AdminPanel shell | `/admin/*` + AdminNav |
| ModeratorPanel shell | `/moderation` |
| Sidebar tabs | Next.js Link routes |

## Не перенесено (следующая волна)

- Gemini AI-ассистент
- XP / leaderboard / избранное / история
- Telegram & Push stubs
- DocsAndDockerModal / Express `server.ts`
- Vite SPA (остаёмся на Next.js)

## Remote

```bash
git remote add education git@github.com:yuriisamohvalov-creator/education-portal.git
# только для чтения референса, не merge историй
```

## Локальный запуск frontend

```bash
cd frontend && npm install && npm run dev
```
