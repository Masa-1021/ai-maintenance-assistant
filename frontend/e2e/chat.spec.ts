import { test, expect } from '@playwright/test';

test.describe('Chat Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'メールアドレス' }).fill('test@example.com');
    await page.getByRole('textbox', { name: 'パスワード' }).fill('TestPass123!');
    await page.getByRole('button', { name: 'ログイン' }).click();
    await expect(page).toHaveURL(/.*chat/, { timeout: 15000 });
  });

  test('should display chat page', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'チャット' })).toBeVisible();
    await expect(page.getByRole('button', { name: '+ 新規チャット' })).toBeVisible();
  });

  test('should open new chat dialog', async ({ page }) => {
    await page.getByRole('button', { name: '+ 新規チャット' }).click();
    await expect(page.getByRole('heading', { name: '新規チャットセッション' })).toBeVisible();
    await expect(page.getByRole('combobox')).toBeVisible();
  });

  test('should start new chat session', async ({ page }) => {
    await page.getByRole('button', { name: '+ 新規チャット' }).click();

    // Select equipment
    const combobox = page.getByRole('combobox');
    await combobox.selectOption({ index: 1 }); // Select first equipment after placeholder

    // Start button should be enabled
    const startButton = page.getByRole('button', { name: '開始' });
    await expect(startButton).toBeEnabled();
    await startButton.click();

    // Should see the chat interface
    await expect(page.getByRole('textbox', { name: 'メッセージを入力' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('こんにちは。設備のメンテナンス記録を作成します')).toBeVisible();
  });

  test('should send message and receive AI response', async ({ page }) => {
    // Start new chat
    await page.getByRole('button', { name: '+ 新規チャット' }).click();
    const combobox = page.getByRole('combobox');
    await combobox.selectOption({ index: 1 });
    await page.getByRole('button', { name: '開始' }).click();

    // Wait for chat to load
    await expect(page.getByRole('textbox', { name: 'メッセージを入力' })).toBeVisible({ timeout: 10000 });

    // Send message
    await page.getByRole('textbox', { name: 'メッセージを入力' }).fill('ポンプから異音がします');
    await page.getByRole('button', { name: '送信' }).click();

    // Wait for AI response (this may take some time due to Bedrock)
    await expect(page.getByText('ポンプから異音がします')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: '抽出情報' })).toBeVisible({ timeout: 60000 });
  });
});
