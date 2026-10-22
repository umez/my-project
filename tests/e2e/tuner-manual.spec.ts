import { expect, test } from '@playwright/test';
import { startTuner } from './helpers';

test('manual mode stays on the locked string and hints at the nearest', async ({ page }) => {
  test.setTimeout(30_000);
  await startTuner(page);

  await page.getByRole('button', { name: 'Manual' }).click();
  await page.getByRole('button', { name: 'String 6, E2' }).click();

  await expect(page.locator('.note')).toHaveText('E2', { timeout: 15_000 });
  await expect(page.getByText('Nearest string is A2')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.state')).toHaveText('Sharp');

  // The lock survives another frame of the same input.
  await page.waitForTimeout(500);
  await expect(page.locator('.note')).toHaveText('E2');
});
