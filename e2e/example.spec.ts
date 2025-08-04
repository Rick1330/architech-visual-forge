import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Vite/);
});

test('homepage loads', async ({ page }) => {
  await page.goto('/');
  const locator = page.locator('body');
  await expect(locator).toBeVisible();
});