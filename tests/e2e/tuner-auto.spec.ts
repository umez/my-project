import { expect, test } from '@playwright/test';
import { startTuner } from './helpers';

test.describe('Auto tuning journey', () => {
  test('reads a played A2 as in tune', async ({ page }) => {
    test.setTimeout(30_000);
    await startTuner(page);

    await expect(page.locator('.note')).toHaveText('A2', { timeout: 15_000 });
    await expect(page.locator('.state')).toHaveText('In tune', { timeout: 15_000 });
    await expect(page.locator('.readout')).toContainText('String 5');
  });

  test('releases capture on Stop and clears the reading', async ({ page }) => {
    test.setTimeout(30_000);
    await startTuner(page);
    const stoppedAt = Date.now();
    await page.getByRole('button', { name: 'Stop' }).click();

    await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
    expect(Date.now() - stoppedAt).toBeLessThan(1000);
    await expect(page.locator('.note')).toHaveText('—');
    await expect(page.getByRole('heading', { name: 'Microphone access' })).toHaveCount(0);
  });

  test('releases capture when navigating away from the tuner', async ({ page }) => {
    test.setTimeout(30_000);
    await startTuner(page);
    await page.getByRole('button', { name: 'Settings' }).click();

    await expect(page.getByText('Reference pitch')).toBeVisible();
    await page.getByRole('button', { name: 'Back to tuner' }).click();
    await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
  });
});
