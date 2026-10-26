import { expect, test } from '@playwright/test';

const localDate = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

test('settings fits an iPhone without sideways overflow', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).tap();
  await page.getByLabel('New criterion').fill('Brush teeth');
  await page.getByRole('button', { name: 'Add criterion' }).tap();

  const fit = await page.evaluate(() => {
    const doc = document.documentElement;
    const field = document.querySelector('.criteria__row input');
    const file = document.querySelector('input.visually-hidden');
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      inputWidth: field?.getBoundingClientRect().width ?? 0,
      fileWidth: file?.getBoundingClientRect().width ?? 0,
    };
  });

  expect(fit.scrollWidth).toBeLessThanOrEqual(fit.clientWidth);
  expect(fit.inputWidth).toBeGreaterThan(240);
  expect(fit.fileWidth).toBeLessThanOrEqual(2);
});

test('opens and closes the cupboard with a tap', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open the notice board' }).tap();
  await page.getByRole('button', { name: 'Open the cupboard' }).tap();
  await expect(page.getByRole('button', { name: 'Top shelf, 0 items' })).toBeVisible();

  await page.getByRole('button', { name: 'Close the cupboard' }).tap();

  await expect(page.getByRole('button', { name: 'Open the cupboard' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Top shelf, 0 items' })).toHaveCount(0);
});

test('keeps star weeks, meals and cupboard items on this phone', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByLabel('New criterion').fill('Teeth');
  await page.getByRole('button', { name: 'Add criterion' }).click();

  await page.getByRole('button', { name: 'Fridge' }).click();
  await page.getByRole('button', { name: 'Open the notice board' }).click();
  await page.getByRole('button', { name: 'Star chart' }).click();
  await page.getByRole('button', { name: 'Monday, Teeth, not starred' }).click();
  await expect(page.getByLabel('1 of 7 stars')).toHaveText('1/7');
  await page.getByRole('button', { name: 'New week' }).click();
  await expect(page.getByRole('heading', { name: 'Week 2' })).toBeVisible();
  await page.getByRole('button', { name: 'Previous week' }).click();
  await expect(page.getByLabel('1 of 7 stars')).toHaveText('1/7');
  await page.getByRole('button', { name: 'Close', exact: true }).click();

  await page.getByRole('button', { name: 'Meal planner' }).click();
  const tuesday = page.getByLabel('Tuesday');
  await tuesday.pressSequentially('Soup');
  await expect(tuesday).toHaveValue('Soup');
  await page.getByRole('button', { name: 'Close', exact: true }).click();

  await page.getByRole('button', { name: 'Open the cupboard' }).click();
  await page.getByRole('button', { name: 'Top shelf, 0 items' }).click();
  await page.getByRole('button', { name: 'Add item' }).click();
  await page.getByLabel('Name').fill('Rice');
  await page.getByLabel('Expiry date (optional)').fill(localDate(1));
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Cupboard · Top shelf' })).toContainText('Rice');
  await page.getByRole('button', { name: 'Close', exact: true }).click();

  await page.reload();
  await page.getByRole('button', { name: 'Open the notice board' }).click();
  await page.getByRole('button', { name: 'Star chart' }).click();
  await page.getByRole('button', { name: 'Previous week' }).click();
  await expect(page.getByLabel('1 of 7 stars')).toHaveText('1/7');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Open the cupboard' }).click();
  await expect(page.getByRole('button', { name: 'Top shelf, 1 item' })).toBeVisible();
});
