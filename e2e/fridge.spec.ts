import { expect, test } from '@playwright/test';

const localDate = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

test('adds an item and still sees it under Use soon after a reload', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Open the fridge' }).click();
  await page.getByRole('button', { name: 'Top shelf, 0 items' }).click();
  await page.getByRole('button', { name: 'Add item' }).click();
  await page.getByLabel('Name').fill('Milk');
  await page.getByLabel('Expiry date (optional)').fill(localDate(1));
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  const sheet = page.getByRole('dialog', { name: 'Top shelf' });
  await expect(sheet).toContainText('Milk');
  await expect(sheet).toContainText('Expires tomorrow');
  await sheet.getByRole('button', { name: 'Close', exact: true }).click();

  await page.reload();

  await expect(page.getByRole('button', { name: 'Open the fridge, 1 to use soon' })).toBeVisible();
  await page.getByRole('button', { name: /Use soon/ }).click();
  await expect(page.getByRole('heading', { name: 'Use soon' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Milk/ })).toContainText('Top shelf');
});
