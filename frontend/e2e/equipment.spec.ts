import { test, expect } from '@playwright/test';

test.describe('Equipment Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'メールアドレス' }).fill('test@example.com');
    await page.getByRole('textbox', { name: 'パスワード' }).fill('TestPass123!');
    await page.getByRole('button', { name: 'ログイン' }).click();
    await expect(page).toHaveURL(/.*chat/, { timeout: 15000 });

    // Navigate to equipment page
    await page.getByRole('link', { name: '設備マスタ' }).click();
    await expect(page).toHaveURL(/.*equipment/);
  });

  test('should display equipment list', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '設備マスタ' })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('should open add equipment modal', async ({ page }) => {
    await page.getByRole('button', { name: '+ 設備を追加' }).click();
    await expect(page.getByRole('heading', { name: '設備を追加' })).toBeVisible();
    await expect(page.getByLabel('設備ID')).toBeVisible();
    await expect(page.getByLabel('設備名')).toBeVisible();
  });

  test('should add new equipment', async ({ page }) => {
    const uniqueId = `EQ-E2E-${Date.now()}`;

    await page.getByRole('button', { name: '+ 設備を追加' }).click();
    await page.getByLabel('設備ID').fill(uniqueId);
    await page.getByLabel('設備名').fill('E2Eテスト設備');
    await page.getByRole('button', { name: '追加', exact: true }).click();

    // Wait for the modal to close and the equipment to appear in the list
    await expect(page.getByText(uniqueId)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('E2Eテスト設備')).toBeVisible();
  });
});
