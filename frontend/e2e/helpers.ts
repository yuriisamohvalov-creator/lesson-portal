import { Page } from '@playwright/test';

export async function registerUser(
  page: Page,
  displayName: string,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/auth/register');
  await page.fill('input[type="text"]', displayName);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/auth/login');
}

export async function loginUser(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/auth/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
}

export async function createArticle(
  page: Page,
  title: string,
  contentHtml: string,
): Promise<void> {
  await page.goto('/articles/create');
  await page.fill('input[type="text"]', title);
  // select first real category
  const categorySelect = page.locator('select');
  await categorySelect.waitFor();
  const firstCategory = await page.locator('select option[value]:not([value=""])').first();
  await firstCategory.waitFor({ state: 'attached' });
  const categoryValue = await firstCategory.getAttribute('value');
  await page.selectOption('select', categoryValue!);
  await page.locator('[contenteditable="true"]').fill(contentHtml);
  await page.locator('form button', { hasText: 'Отправить на модерацию' }).click();
  await page.waitForURL('/articles/mine');
}

export async function logout(page: Page): Promise<void> {
  await page.goto('/auth/logout');
}
