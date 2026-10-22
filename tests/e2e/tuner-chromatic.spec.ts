import { expect, test } from '@playwright/test';
import { startTuner } from './helpers';

test('chromatic mode names the note without string context', async ({ page }) => {
  test.setTimeout(30_000);
  await startTuner(page);

  await page.getByRole('button', { name: 'Chromatic' }).click();

  await expect(page.locator('.note')).toHaveText('A2', { timeout: 15_000 });
  await expect(page.getByRole('group', { name: 'Strings' })).toHaveCount(0);
  await expect(page.locator('.state')).toHaveText('In tune', { timeout: 15_000 });
});
