import { expect, type Page } from '@playwright/test';

/** Start capture through the rationale step (fake microphone auto-grants). */
export async function startTuner(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start' }).click();
  await page.getByRole('button', { name: 'Allow microphone' }).click();
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();
}
