import { test, expect, Page } from '@playwright/test';
import { readFileSync } from 'fs';
import { loginUser } from './helpers';

const MODERATOR_EMAIL = 'moderator@test.com';
const MODERATOR_PASSWORD = 'testpass123';

test.describe.serial('Video upload', () => {
  const timestamp = Date.now();
  const authorEmail = `video-author-${timestamp}@e2e.test`;
  const authorPassword = 'TestPass123!';
  const displayName = `Video Author ${timestamp}`;

  let page: Page;

  test.beforeAll(async ({ browser, request }) => {
    page = await browser.newPage();
    const res = await request.post('http://localhost:3001/api/auth/register', {
      data: {
        email: authorEmail,
        password: authorPassword,
        displayName,
      },
    });
    if (!res.ok() && res.status() !== 409) {
      throw new Error(`Failed to register test user: ${res.status()} ${await res.text()}`);
    }
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.beforeEach(async () => {
    await loginUser(page, authorEmail, authorPassword);
  });

  async function createArticleWithVideo(
    title: string,
    videoAction: () => Promise<void>,
  ): Promise<string> {
    await page.goto('/articles/create');
    await page.fill('input[type="text"]', title);
    const categorySelect = page.locator('select');
    await categorySelect.waitFor();
    const firstCategory = await page.locator('select option[value]:not([value=""])').first();
    await firstCategory.waitFor({ state: 'attached' });
    const categoryValue = await firstCategory.getAttribute('value');
    await page.selectOption('select', categoryValue!);
    await page.locator('[contenteditable="true"]').fill(`<p>Content for ${title}</p>`);

    await page.locator('span', { hasText: 'Видео' }).click();
    // Use exact match to avoid matching the accordion header button
    await expect(page.getByRole('button', { name: 'YouTube', exact: true })).toBeVisible();

    await videoAction();

    await page.locator('form button', { hasText: 'Отправить на модерацию' }).click();
    await page.waitForURL('/articles/mine');

    const articleLink = page.locator('table tbody td a', { hasText: title });
    const href = await articleLink.getAttribute('href');
    return href!;
  }

  async function approveAsModerator(articleTitle: string): Promise<void> {
    await loginUser(page, MODERATOR_EMAIL, MODERATOR_PASSWORD);
    await page.goto('/moderation');
    const card = page.locator('.card', { hasText: articleTitle });
    await expect(card).toBeVisible();
    await card.locator('button.btn-success', { hasText: 'Одобрить' }).click();
    await expect(card).not.toBeVisible();
  }

  test('should attach a YouTube video and display it after approval', async () => {
    const title = `YouTube Video Article ${timestamp}`;
    const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

    const articlePath = await createArticleWithVideo(title, async () => {
      await page.fill('input[type="url"]', youtubeUrl);
    });

    await approveAsModerator(title);

    await page.goto(articlePath);
    await expect(page.locator('article h1')).toContainText(title);
    await expect(page.locator('iframe[src*="youtube.com/embed/"]')).toBeVisible();
  });

  test('should display an uploaded mp4 video after approval', async ({ request }) => {
    const title = `Uploaded Video Article ${timestamp}`;

    // Create and submit the article via UI (without video)
    await page.goto('/articles/create');
    await page.fill('input[type="text"]', title);
    const categorySelect = page.locator('select');
    await categorySelect.waitFor();
    const firstCategory = await page.locator('select option[value]:not([value=""])').first();
    await firstCategory.waitFor({ state: 'attached' });
    const categoryValue = await firstCategory.getAttribute('value');
    await page.selectOption('select', categoryValue!);
    await page.locator('[contenteditable="true"]').fill(`<p>Content for ${title}</p>`);
    await page.locator('form button', { hasText: 'Отправить на модерацию' }).click();
    await page.waitForURL('/articles/mine');

    const articleLink = page.locator('table tbody td a', { hasText: title });
    const articlePath = await articleLink.getAttribute('href');

    // Upload the video file directly through the API
    const loginRes = await request.post('http://localhost:3001/api/auth/login', {
      data: { email: authorEmail, password: authorPassword },
    });
    const loginJson = await loginRes.json();
    const articleId = articlePath!.split('/').pop()!;

    const uploadRes = await request.post(
      `http://localhost:3001/api/articles/${articleId}/videos/upload`,
      {
        headers: { Authorization: `Bearer ${loginJson.accessToken}` },
        multipart: {
          file: {
            name: 'sample.mp4',
            mimeType: 'video/mp4',
            buffer: readFileSync('e2e/fixtures/sample.mp4'),
          },
        },
      },
    );
    expect(uploadRes.ok()).toBeTruthy();

    await approveAsModerator(title);

    await page.goto(articlePath!);
    await expect(page.locator('article h1')).toContainText(title);
    await expect(page.locator('article video')).toBeVisible();
  });
});
