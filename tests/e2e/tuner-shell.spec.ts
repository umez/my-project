import { expect, test } from '@playwright/test';

test.describe('Zemu Tuner shell', () => {
  test('opens idle without requesting the microphone', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
    await expect(page.getByText('On-device audio')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Microphone access' })).toHaveCount(0);
  });

  test('Start shows the rationale before the permission prompt', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.getByRole('heading', { name: 'Microphone access' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Allow microphone' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Not now' })).toBeVisible();
  });

  test('switches modes and shows string chips', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Manual' }).click();
    await expect(page.getByRole('button', { name: 'Manual' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByRole('group', { name: 'Strings' })).toBeVisible();
  });

  test('opens settings and persists the reference pitch across navigation', async ({ page }) => {
    await page.goto('/settings');
    await page.getByRole('button', { name: '432' }).click();
    await expect(page.getByText('432 Hz')).toBeVisible();
    await page.reload();
    await expect(page.getByText('432 Hz')).toBeVisible();
  });
});
