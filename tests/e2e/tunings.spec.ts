import { expect, test } from '@playwright/test';

test('selects Drop D and restores it after a restart', async ({ page }) => {
  await page.goto('/tunings');
  await page.getByText('Drop D', { exact: true }).click();

  await expect(page.locator('.tuning')).toContainText('Drop D');
  await page.reload();
  await expect(page.locator('.tuning')).toContainText('Drop D');
  await expect(page.getByRole('button', { name: 'String 6, D2' })).toBeVisible();
});
