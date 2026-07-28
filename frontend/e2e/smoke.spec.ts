import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should display categories and articles', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Категории');
  });

  test('should have navigation links', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('a[href="/articles"]')).toBeVisible();
  });
});

test.describe('Articles page', () => {
  test('should display articles list', async ({ page }) => {
    await page.goto('/articles');
    await expect(page.locator('h1')).toContainText('Статьи');
  });

  test('should have search functionality', async ({ page }) => {
    await page.goto('/articles');
    await expect(page.locator('input[name="search"]')).toBeVisible();
  });
});

test.describe('Auth pages', () => {
  test('should display login form', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('h1')).toContainText('Вход');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should display register form', async ({ page }) => {
    await page.goto('/auth/register');
    await expect(page.locator('h1')).toContainText('Регистрация');
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('should navigate between login and register', async ({ page }) => {
    await page.goto('/auth/login');
    await page.click('a[href="/auth/register"]');
    await expect(page).toHaveURL('/auth/register');
  });
});

test.describe('Courses page', () => {
  test('should display courses list', async ({ page }) => {
    await page.goto('/courses');
    await expect(page.locator('h1')).toContainText('Курсы');
  });
});

test.describe('Login flow', () => {
  test('should login and show user menu', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'user@test.com');
    await page.fill('input[type="password"]', 'testpass123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
    await expect(page.locator('a[href="/profile"]')).toBeVisible();
  });
});

test.describe('Admin pages', () => {
  test('should redirect non-admin from admin stats', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'user@test.com');
    await page.fill('input[type="password"]', 'testpass123');
    await page.click('button[type="submit"]');
    await page.goto('/admin/stats');
    await expect(page).toHaveURL('/');
  });
});
