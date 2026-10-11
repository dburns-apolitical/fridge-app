import type { IItem } from './model';

export type TExpiryStatus = 'expired' | 'soon' | 'ok' | 'none';

const DAY_MS = 86_400_000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n: number): string => String(n).padStart(2, '0');

const parts = (iso: string): [number, number, number] => {
  const [y, m, d] = iso.split('-').map(Number);
  return [y, m, d];
};

const toUtcMs = (iso: string): number => {
  const [y, m, d] = parts(iso);
  return Date.UTC(y, m - 1, d);
};

/** The device's local calendar date. Deliberately avoids toISOString, which is UTC. */
export const todayIso = (now: Date = new Date()): string =>
  `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

export const addDays = (iso: string, days: number): string =>
  new Date(toUtcMs(iso) + days * DAY_MS).toISOString().slice(0, 10);

export const daysUntil = (iso: string, today: string): number =>
  Math.round((toUtcMs(iso) - toUtcMs(today)) / DAY_MS);

export const expiryStatus = (
  item: Pick<IItem, 'expiry'>,
  today: string,
  soonDays: number,
): TExpiryStatus => {
  if (!item.expiry) return 'none';
  if (item.expiry < today) return 'expired';
  if (item.expiry <= addDays(today, soonDays)) return 'soon';
  return 'ok';
};

const formatDate = (iso: string, today: string): string => {
  const [y, m, d] = parts(iso);
  const sameYear = y === parts(today)[0];
  return `${d} ${MONTHS[m - 1]}${sameYear ? '' : ` ${y}`}`;
};

export const describeExpiry = (expiry: string, today: string): string => {
  const days = daysUntil(expiry, today);
  if (days < -1) return `Expired ${-days} days ago`;
  if (days === -1) return 'Expired yesterday';
  if (days === 0) return 'Expires today';
  if (days === 1) return 'Expires tomorrow';
  if (days <= 7) return `Expires in ${days} days`;
  return `Expires ${formatDate(expiry, today)}`;
};

export const sortItems = (items: IItem[]): IItem[] =>
  [...items].sort((a, b) => {
    if (a.expiry && b.expiry && a.expiry !== b.expiry) return a.expiry < b.expiry ? -1 : 1;
    if (a.expiry && !b.expiry) return -1;
    if (!a.expiry && b.expiry) return 1;
    return a.name.localeCompare(b.name);
  });

export const getUseSoonItems = (items: IItem[], today: string, soonDays: number): IItem[] =>
  sortItems(
    items.filter((item) => {
      const status = expiryStatus(item, today, soonDays);
      return status === 'expired' || status === 'soon';
    }),
  );
