import { expect, test, type Page } from '@playwright/test';

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

const swipe = async (page: Page, direction: 'left' | 'right') => {
  await page.locator('.pager__viewport').evaluate((el, direction) => {
    const rect = el.getBoundingClientRect();
    const y = rect.top + 70;
    const startX = direction === 'left' ? rect.right - 24 : rect.left + 24;
    const endX = direction === 'left' ? rect.left + 24 : rect.right - 24;
    const event = (type: string, clientX: number) =>
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX,
        clientY: y,
        pointerId: 1,
        pointerType: 'touch',
        isPrimary: true,
      });
    el.dispatchEvent(event('pointerdown', startX));
    el.dispatchEvent(event('pointerup', endX));
  }, direction);
};

const waitForPager = async (page: Page) => {
  await page.locator('.pager__track').evaluate((el) => {
    const duration = getComputedStyle(el).transitionDuration;
    if (duration === '0s') return;
    return new Promise<void>((resolve) => {
      const done = () => resolve();
      el.addEventListener('transitionend', done, { once: true });
      setTimeout(done, 800);
    });
  });
};

const hiddenDoorOverlap = (page: Page) =>
  page.evaluate(() => {
    const viewport = document.querySelector('.pager__viewport')!.getBoundingClientRect();
    return [...document.querySelectorAll('.pager__page[aria-hidden="true"] .cabinet__door, .pager__page[aria-hidden="true"] .cabinet__close')].map(
      (el) => {
        const rect = el.getBoundingClientRect();
        const width = Math.min(rect.right, viewport.right) - Math.max(rect.left, viewport.left);
        return width > 0 ? width : 0;
      },
    );
  });

test('closes every door on pager moves and tab switches', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Open the fridge' }).tap();
  await page.getByRole('button', { name: 'Open the freezer' }).tap();
  await swipe(page, 'left');
  await expect(page.getByRole('heading', { name: 'Notice board' })).toBeVisible();
  await waitForPager(page);
  await expect(page.locator('.cabinet--open')).toHaveCount(0);
  const fridgeSide = await hiddenDoorOverlap(page);
  expect(fridgeSide).toHaveLength(2);
  for (const width of fridgeSide) expect(width).toBeLessThan(8);

  await page.getByRole('button', { name: 'Open the cupboard' }).tap();
  await swipe(page, 'right');
  await expect(page.getByRole('heading', { name: "What's in the fridge?" })).toBeVisible();
  await waitForPager(page);
  await expect(page.locator('.cabinet--open')).toHaveCount(0);
  const cupboardSide = await hiddenDoorOverlap(page);
  expect(cupboardSide).toHaveLength(1);
  for (const width of cupboardSide) expect(width).toBeLessThan(8);
  await expect(page.getByRole('button', { name: 'Open the fridge' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open the freezer' })).toBeVisible();

  const freezer = page.locator('.cabinet--freezer');
  const box = await freezer.boundingBox();
  if (!box) throw new Error('freezer is not visible');
  await page.touchscreen.tap(box.x + box.width - 30, box.y + box.height / 2);
  await expect(page.getByRole('button', { name: 'Close the freezer' })).toBeVisible();

  await page.getByRole('button', { name: 'Open the notice board' }).tap();
  await expect(page.locator('.cabinet--open')).toHaveCount(0);
  await page.getByRole('button', { name: 'Open the cupboard' }).tap();
  await page.getByRole('button', { name: 'Back to the fridge' }).tap();
  await waitForPager(page);
  await expect(page.locator('.cabinet--cupboard.cabinet--open')).toHaveCount(0);
  const afterArrow = await hiddenDoorOverlap(page);
  expect(afterArrow).toHaveLength(1);
  for (const width of afterArrow) expect(width).toBeLessThan(8);

  await page.getByRole('button', { name: 'Open the notice board' }).tap();
  await page.getByRole('button', { name: 'Open the cupboard' }).tap();
  await page.getByRole('button', { name: 'Use soon' }).tap();
  await page.getByRole('button', { name: 'Fridge' }).tap();
  await expect(page.getByRole('button', { name: 'Open the fridge' })).toBeVisible();
  await page.getByRole('button', { name: 'Open the notice board' }).tap();
  await expect(page.getByRole('button', { name: 'Open the cupboard' })).toBeVisible();
  await expect(page.locator('.cabinet--open')).toHaveCount(0);
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
