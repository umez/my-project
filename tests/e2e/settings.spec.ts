import { expect, test } from '@playwright/test';
import { startTuner } from './helpers';

test('recomputes the target when the reference pitch changes', async ({ page }) => {
  test.setTimeout(30_000);
  await page.goto('/settings');

  const slider = page.locator('#reference');
  await slider.focus();
  for (let index = 0; index < 5; index++) {
    await slider.press('ArrowRight');
  }
  await expect(page.getByText('445 Hz')).toBeVisible();

  await startTuner(page);
  await expect(page.locator('.note')).toHaveText('A2', { timeout: 15_000 });
  await expect(page.locator('.numbers .value').nth(1)).toHaveText('111.3 Hz', {
    timeout: 15_000,
  });
  await expect(page.locator('.state')).toHaveText('Flat');
  await expect(page.locator('.value').nth(2)).toContainText('-');
});
