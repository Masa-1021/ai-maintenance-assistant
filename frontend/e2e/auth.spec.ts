import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should redirect to login page when not authenticated', async ({ page }) => {
    await page.goto('/chat');
    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByRole('heading', { name: 'メンテナンス記録管理' })).toBeVisible();
  });

  test('should show error message for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'メールアドレス' }).fill('invalid@example.com');
    await page.getByRole('textbox', { name: 'パスワード' }).fill('wrongpassword');
    await page.getByRole('button', { name: 'ログイン' }).click();

    await expect(page.getByText('ログインに失敗しました')).toBeVisible({ timeout: 10000 });
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'メールアドレス' }).fill('test@example.com');
    await page.getByRole('textbox', { name: 'パスワード' }).fill('TestPass123!');
    await page.getByRole('button', { name: 'ログイン' }).click();

    await expect(page).toHaveURL(/.*chat/, { timeout: 15000 });
    await expect(page.getByText('test@example.com')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'メールアドレス' }).fill('test@example.com');
    await page.getByRole('textbox', { name: 'パスワード' }).fill('TestPass123!');
    await page.getByRole('button', { name: 'ログイン' }).click();

    await expect(page).toHaveURL(/.*chat/, { timeout: 15000 });

    // Logout
    await page.getByRole('button', { name: 'ログアウト' }).click();
    await expect(page).toHaveURL(/.*login/);
  });
});
