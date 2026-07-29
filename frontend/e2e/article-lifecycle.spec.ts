import { test, expect } from '@playwright/test';
import { registerUser, loginUser, createArticle } from './helpers';

const MODERATOR_EMAIL = 'moderator@test.com';
const MODERATOR_PASSWORD = 'testpass123';

test.describe('Article lifecycle', () => {
  const timestamp = Date.now();
  const authorEmail = `author-${timestamp}@e2e.test`;
  const authorPassword = 'TestPass123!';
  const displayName = `Author ${timestamp}`;
  const articleTitle = `E2E Test Article ${timestamp}`;

  test('register, create article, submit, approve and verify publication', async ({ page }) => {
    // 1. Register a new author
    await registerUser(page, displayName, authorEmail, authorPassword);

    // 2. Login as author
    await loginUser(page, authorEmail, authorPassword);

    // 3. Create and submit an article for moderation
    await createArticle(page, articleTitle, '<p>Test article content for e2e lifecycle.</p>');

    // Verify article is listed with PENDING status
    await expect(page.locator('h1')).toContainText('Мои статьи');
    const articleRow = page.locator('table tbody tr', { hasText: articleTitle });
    await expect(articleRow).toBeVisible();
    await expect(articleRow.locator('.badge-pending')).toContainText('PENDING');

    // 4. Login as moderator and approve the article
    await loginUser(page, MODERATOR_EMAIL, MODERATOR_PASSWORD);
    await page.goto('/moderation');
    await expect(page.locator('h1')).toContainText('Очередь модерации');

    const moderationCard = page.locator('.card', { hasText: articleTitle });
    await expect(moderationCard).toBeVisible();
    await moderationCard.locator('button.btn-success', { hasText: 'Одобрить' }).click();

    // Wait for the article to disappear from the moderation queue
    await expect(moderationCard).not.toBeVisible();

    // 5. Verify the article is publicly visible
    await page.goto('/articles');
    await expect(page.locator('h1')).toContainText('Статьи');
    const publicArticleLink = page.locator('a', { hasText: articleTitle });
    await expect(publicArticleLink).toBeVisible();

    await publicArticleLink.click();
    await expect(page.locator('article h1')).toContainText(articleTitle);
    await expect(page.locator('article')).toContainText('Test article content for e2e lifecycle.');
  });
});
