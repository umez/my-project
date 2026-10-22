import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { startTuner } from './helpers';

test.use({
  launchOptions: {
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-audio-capture=${resolve('tests/fixtures/between-strings-220.wav')}`,
    ],
  },
});

test('shows Between strings with both candidates at 220 Hz', async ({ page }) => {
  test.setTimeout(30_000);
  await startTuner(page);

  await expect(page.locator('.state.between')).toHaveText('Between strings', {
    timeout: 15_000,
  });
  await expect(page.locator('.candidates li')).toHaveCount(2);
  await expect(page.locator('.candidates')).toContainText('G3');
  await expect(page.locator('.candidates')).toContainText('B3');
});
