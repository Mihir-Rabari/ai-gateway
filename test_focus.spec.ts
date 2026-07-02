import { test, expect } from '@playwright/test';

test('Verify page loads and take screenshot', async ({ page }) => {
  await page.goto('http://localhost:3009');

  // Wait a bit to ensure it renders something
  await page.waitForTimeout(2000);

  // Take a screenshot
  await page.screenshot({ path: '/home/jules/verification/screenshots/login-page.png', fullPage: true });
});
