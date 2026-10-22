import { expect, test } from '@playwright/test';

test('creates, persists, and deletes a custom tuning', async ({ page }) => {
  await page.goto('/tunings');
  await page.getByRole('button', { name: 'Add custom tuning' }).click();

  await page.locator('input[type="text"]').fill('Open C');
  await page.getByRole('button', { name: 'Create tuning' }).click();

  await expect(page.getByText('Open C', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Open C', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Delete Open C' }).click();
  await expect(page.getByText('Open C', { exact: true })).toHaveCount(0);
  await expect(page.locator('.row.active')).toContainText('Standard');
});
