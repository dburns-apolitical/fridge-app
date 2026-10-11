# Fridge App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an installable, offline, single-device PWA with a cute cartoon fridge-freezer for tracking what is in each compartment and what needs using soon.

**Architecture:** Pure domain modules (`src/domain/`) hold the model, expiry maths, validation, persistence and a reducer. A thin `useFridge` hook wires the reducer to `localStorage`. Preact components render the fridge, the compartment sheet, the "Use soon" list and settings; `App.tsx` switches between views with a bottom tab bar.

**Tech Stack:** Vite 8.3.4, Preact 10.29.8, TypeScript 5.9.3, vite-plugin-pwa 2.0.0 + @vite-pwa/assets-generator 2.0.0, Vitest 5.0.3 + jsdom 30.1.2 + @testing-library/preact 3.2.4, Playwright 1.64.0, GitHub Pages via GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-11-fridge-app-design.md`

## Global Constraints

- Repository root: `/Users/dec/development/fridge-app`. All commands run from there. Package manager: pnpm 10 (`"packageManager": "pnpm@10.32.1"`).
- This is a plain git repo, not Graphite: commit with `git commit`. Do not create a GitHub remote or push; Dec does that.
- British English in code, comments and UI copy ("colour", "recognise", "normalise").
- Type prefixes: `T` for type aliases, `I` for interfaces.
- Seven fixed compartments: fridge "Top shelf", "Middle shelf", "Bottom shelf", "Door"; freezer "Top drawer", "Middle drawer", "Bottom drawer".
- Expiry dates are `YYYY-MM-DD` strings with no time. "Today" is the device's local date. Expired: expiry < today. Soon: today ≤ expiry ≤ today + soonDays.
- `soonDays` defaults to 3 and is always an integer in 0–30.
- `localStorage` key: `fridge-app:data`. Stored shape: `{ version: 1, items, settings }`.
- Save failure copy: "Couldn't save — try exporting a backup".
- Tests run with `TZ=Europe/London` (set in the `test` script).
- Form inputs use `font-size: 16px` or larger so iOS Safari does not zoom on focus.

## Review Focus

1. **Using the app just after midnight in the UK.** "Today" must come from the local date, not UTC, or items flip status an hour early during BST. Pinned in Task 2 (`todayIso` at 00:30 BST).
2. **An item name of only spaces.** The Add button stays disabled and stored names are trimmed. Pinned in Task 4 (`createItem` trims) and Task 6 (button disabled).
3. **Clearing an expiry date while editing.** The item must lose its expiry entirely rather than store an empty string that breaks sorting and status. Pinned in Task 4 (update removes `expiry`).
4. **Importing a hand-edited or wrong backup file** (unknown compartment, `11/10/2026` date, not JSON). Import must show a readable error and leave current data untouched. Pinned in Task 3 (`parseAppData`, `importJson`) and Task 8 (Settings shows error, no dispatch).
5. **Storage unavailable or full** (private browsing, quota). The app must still load with an empty fridge and show the save warning instead of crashing. Pinned in Task 3 (`load`/`save` never throw) and Task 9 (App shows the alert).

---

## File Structure

```
fridge-app/
├── .github/workflows/deploy.yml     Task 11 — test, build, publish to GitHub Pages
├── .gitignore                       Task 1
├── README.md                        Task 11 — run, deploy and install instructions
├── e2e/fridge.spec.ts               Task 11 — Playwright smoke test
├── index.html                       Task 1 — iOS meta tags, mount point
├── package.json                     Task 1
├── playwright.config.ts             Task 11
├── pwa-assets.config.ts             Task 10 — icon generation
├── public/icon.svg                  Task 10 — source icon
├── tsconfig.json                    Task 1
├── vite.config.ts                   Task 1, PWA plugin added in Task 10
└── src/
    ├── main.tsx                     Task 1 — renders <App />
    ├── App.tsx                      Task 1 placeholder, real shell in Task 9
    ├── App.test.tsx                 Task 9
    ├── styles.css                   Task 9 — all styling
    ├── store.ts                     Task 4 — useFridge hook
    ├── test/setup.ts                Task 1 — RTL cleanup, localStorage reset
    ├── lib/saveFile.ts              Task 8 — share sheet or download
    ├── domain/
    │   ├── model.ts                 Task 1 — types and defaults
    │   ├── compartments.ts (+test)  Task 1 — the seven compartments
    │   ├── expiry.ts (+test)        Task 2 — dates, status, sorting, labels
    │   ├── validate.ts (+test)      Task 3 — parse unknown data into IAppData
    │   ├── storage.ts (+test)       Task 3 — localStorage load/save
    │   ├── backup.ts (+test)        Task 3 — JSON export/import
    │   └── reducer.ts (+test)       Task 4 — actions, createItem, toFields
    └── components/
        ├── Fridge.tsx (+test)           Task 5
        ├── ExpiryChip.tsx               Task 6
        ├── ItemForm.tsx                 Task 6
        ├── CompartmentSheet.tsx (+test) Task 6
        ├── UseSoon.tsx (+test)          Task 7
        └── Settings.tsx (+test)         Task 8
```

---

### Task 1: Scaffold the project, model and compartments

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `src/main.tsx`, `src/App.tsx`, `src/test/setup.ts`, `src/domain/model.ts`, `src/domain/compartments.ts`
- Test: `src/domain/compartments.test.ts`

**Interfaces:**
- Produces (`src/domain/model.ts`):
  - `type TCompartmentId = 'fridge-shelf-1' | 'fridge-shelf-2' | 'fridge-shelf-3' | 'fridge-door' | 'freezer-drawer-1' | 'freezer-drawer-2' | 'freezer-drawer-3'`
  - `type TSection = 'fridge' | 'freezer'`, `type TCompartmentKind = 'shelf' | 'door' | 'drawer'`
  - `interface IItem { id: string; name: string; quantity?: string; expiry?: string; compartment: TCompartmentId; addedAt: string }`
  - `interface IItemFields { name: string; quantity: string; expiry: string }` (form values; empty string means "not set")
  - `interface ISettings { soonDays: number }`, `interface IAppData { version: 1; items: IItem[]; settings: ISettings }`
  - `DEFAULT_SOON_DAYS = 3`, `MAX_SOON_DAYS = 30`, `createEmptyData(): IAppData`
- Produces (`src/domain/compartments.ts`): `interface ICompartment { id; name; section; kind }`, `COMPARTMENTS: readonly ICompartment[]`, `compartmentName(id: TCompartmentId): string`, `isCompartmentId(value: unknown): value is TCompartmentId`
- Produces: `App` component exported from `src/App.tsx` (placeholder until Task 9).

- [ ] **Step 1: Create the project files**

`package.json`:

```json
{
  "name": "fridge-app",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "packageManager": "pnpm@10.32.1",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "typecheck": "tsc",
    "test": "TZ=Europe/London vitest run",
    "test:watch": "TZ=Europe/London vitest",
    "e2e": "playwright test"
  }
}
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "jsxImportSource": "preact",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vite/client", "node"]
  },
  "include": ["src", "e2e", "*.config.ts"]
}
```

`vite.config.ts`:

```ts
/// <reference types="vitest/config" />
import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [preact()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
```

`index.html`:

```html
<!doctype html>
<html lang="en-GB">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#bfe8d8" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="Fridge" />
    <title>Fridge</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`.gitignore`:

```
node_modules
dist
dev-dist
test-results
playwright-report
```

`src/main.tsx`:

```tsx
import { render } from 'preact';
import { App } from './App';
import './styles.css';

render(<App />, document.getElementById('app')!);
```

`src/styles.css`: create it empty (Task 9 fills it).

`src/App.tsx` (placeholder):

```tsx
export const App = () => <h1>Fridge</h1>;
```

`src/test/setup.ts`:

```ts
import { cleanup } from '@testing-library/preact';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
  localStorage.clear();
});
```

- [ ] **Step 2: Install dependencies**

Run:

```bash
pnpm add preact@10.29.8
pnpm add -D vite@8.3.4 @preact/preset-vite@2.10.6 typescript@5.9.3 vitest@5.0.3 jsdom@30.1.2 @testing-library/preact@3.2.4 @types/node@24
```

If pnpm warns that build scripts were ignored, run `pnpm approve-builds` and approve them all.

- [ ] **Step 3: Write the model**

`src/domain/model.ts`:

```ts
export type TCompartmentId =
  | 'fridge-shelf-1'
  | 'fridge-shelf-2'
  | 'fridge-shelf-3'
  | 'fridge-door'
  | 'freezer-drawer-1'
  | 'freezer-drawer-2'
  | 'freezer-drawer-3';

export type TSection = 'fridge' | 'freezer';
export type TCompartmentKind = 'shelf' | 'door' | 'drawer';

export interface IItem {
  id: string;
  name: string;
  quantity?: string;
  expiry?: string;
  compartment: TCompartmentId;
  addedAt: string;
}

/** Values as typed into the item form. An empty string means "not set". */
export interface IItemFields {
  name: string;
  quantity: string;
  expiry: string;
}

export interface ISettings {
  soonDays: number;
}

export interface IAppData {
  version: 1;
  items: IItem[];
  settings: ISettings;
}

export const DEFAULT_SOON_DAYS = 3;
export const MAX_SOON_DAYS = 30;

export const createEmptyData = (): IAppData => ({
  version: 1,
  items: [],
  settings: { soonDays: DEFAULT_SOON_DAYS },
});
```

- [ ] **Step 4: Write the failing compartments test**

`src/domain/compartments.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { COMPARTMENTS, compartmentName, isCompartmentId } from './compartments';

describe('compartments', () => {
  it('has three fridge shelves and a door', () => {
    expect(COMPARTMENTS.filter((c) => c.section === 'fridge').map((c) => c.name)).toEqual([
      'Top shelf',
      'Middle shelf',
      'Bottom shelf',
      'Door',
    ]);
  });

  it('has three freezer drawers', () => {
    expect(COMPARTMENTS.filter((c) => c.section === 'freezer').map((c) => c.name)).toEqual([
      'Top drawer',
      'Middle drawer',
      'Bottom drawer',
    ]);
  });

  it('names a compartment by id', () => {
    expect(compartmentName('freezer-drawer-2')).toBe('Middle drawer');
  });

  it('recognises compartment ids', () => {
    expect(isCompartmentId('fridge-door')).toBe(true);
    expect(isCompartmentId('garage')).toBe(false);
    expect(isCompartmentId(3)).toBe(false);
  });
});
```

- [ ] **Step 5: Run it to see it fail**

Run: `pnpm test`
Expected: FAIL, cannot resolve `./compartments`.

- [ ] **Step 6: Implement the compartments**

`src/domain/compartments.ts`:

```ts
import type { TCompartmentId, TCompartmentKind, TSection } from './model';

export interface ICompartment {
  id: TCompartmentId;
  name: string;
  section: TSection;
  kind: TCompartmentKind;
}

export const COMPARTMENTS: readonly ICompartment[] = [
  { id: 'fridge-shelf-1', name: 'Top shelf', section: 'fridge', kind: 'shelf' },
  { id: 'fridge-shelf-2', name: 'Middle shelf', section: 'fridge', kind: 'shelf' },
  { id: 'fridge-shelf-3', name: 'Bottom shelf', section: 'fridge', kind: 'shelf' },
  { id: 'fridge-door', name: 'Door', section: 'fridge', kind: 'door' },
  { id: 'freezer-drawer-1', name: 'Top drawer', section: 'freezer', kind: 'drawer' },
  { id: 'freezer-drawer-2', name: 'Middle drawer', section: 'freezer', kind: 'drawer' },
  { id: 'freezer-drawer-3', name: 'Bottom drawer', section: 'freezer', kind: 'drawer' },
];

export const isCompartmentId = (value: unknown): value is TCompartmentId =>
  COMPARTMENTS.some((c) => c.id === value);

export const compartmentName = (id: TCompartmentId): string =>
  COMPARTMENTS.find((c) => c.id === id)?.name ?? id;
```

- [ ] **Step 7: Run tests, typecheck and build**

Run: `pnpm test && pnpm build`
Expected: 4 tests pass; build writes `dist/`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + Preact app with fridge compartments"
```

---

### Task 2: Expiry dates, status and sorting

**Files:**
- Create: `src/domain/expiry.ts`
- Test: `src/domain/expiry.test.ts`

**Interfaces:**
- Consumes: `IItem` from `model.ts`.
- Produces (`src/domain/expiry.ts`):
  - `type TExpiryStatus = 'expired' | 'soon' | 'ok' | 'none'`
  - `todayIso(now?: Date): string` — local date as `YYYY-MM-DD`
  - `addDays(iso: string, days: number): string`
  - `daysUntil(iso: string, today: string): number`
  - `expiryStatus(item: Pick<IItem, 'expiry'>, today: string, soonDays: number): TExpiryStatus`
  - `describeExpiry(expiry: string, today: string): string`
  - `sortItems(items: IItem[]): IItem[]` — dated first by expiry ascending, then undated, ties by name
  - `getUseSoonItems(items: IItem[], today: string, soonDays: number): IItem[]`

- [ ] **Step 1: Write the failing tests**

`src/domain/expiry.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  addDays,
  daysUntil,
  describeExpiry,
  expiryStatus,
  getUseSoonItems,
  sortItems,
  todayIso,
} from './expiry';
import type { IItem } from './model';

const item = (name: string, expiry?: string): IItem => ({
  id: name,
  name,
  compartment: 'fridge-shelf-1',
  addedAt: '2026-10-01T09:00:00.000Z',
  ...(expiry ? { expiry } : {}),
});

describe('todayIso', () => {
  it('uses the local date, not UTC, just after midnight in BST', () => {
    // 00:30 on 11 October in London is 23:30 on 10 October in UTC.
    expect(todayIso(new Date(2026, 9, 11, 0, 30))).toBe('2026-10-11');
  });
});

describe('addDays and daysUntil', () => {
  it('crosses month ends', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
    expect(addDays('2026-11-02', -3)).toBe('2026-10-30');
  });

  it('counts days between dates', () => {
    expect(daysUntil('2026-10-14', '2026-10-11')).toBe(3);
    expect(daysUntil('2026-10-10', '2026-10-11')).toBe(-1);
  });
});

describe('expiryStatus', () => {
  const today = '2026-10-11';

  it.each([
    [undefined, 'none'],
    ['2026-10-10', 'expired'],
    ['2026-10-11', 'soon'],
    ['2026-10-14', 'soon'],
    ['2026-10-15', 'ok'],
  ] as const)('expiry %s is %s with 3 soon days', (expiry, status) => {
    expect(expiryStatus({ expiry }, today, 3)).toBe(status);
  });

  it('treats today as soon when soon days is 0', () => {
    expect(expiryStatus({ expiry: today }, today, 0)).toBe('soon');
    expect(expiryStatus({ expiry: '2026-10-12' }, today, 0)).toBe('ok');
  });
});

describe('describeExpiry', () => {
  const today = '2026-10-11';

  it.each([
    ['2026-10-08', 'Expired 3 days ago'],
    ['2026-10-10', 'Expired yesterday'],
    ['2026-10-11', 'Expires today'],
    ['2026-10-12', 'Expires tomorrow'],
    ['2026-10-16', 'Expires in 5 days'],
    ['2026-11-03', 'Expires 3 Nov'],
    ['2027-01-05', 'Expires 5 Jan 2027'],
  ])('describes %s as "%s"', (expiry, text) => {
    expect(describeExpiry(expiry, today)).toBe(text);
  });
});

describe('sortItems', () => {
  it('puts dated items first by expiry, then undated items by name', () => {
    const sorted = sortItems([
      item('Peas'),
      item('Milk', '2026-10-13'),
      item('Butter'),
      item('Ham', '2026-10-12'),
      item('Cream', '2026-10-12'),
    ]);
    expect(sorted.map((i) => i.name)).toEqual(['Cream', 'Ham', 'Milk', 'Butter', 'Peas']);
  });
});

describe('getUseSoonItems', () => {
  it('returns expired and soon items only, soonest first', () => {
    const result = getUseSoonItems(
      [item('Peas'), item('Yoghurt', '2026-10-20'), item('Milk', '2026-10-13'), item('Ham', '2026-10-09')],
      '2026-10-11',
      3,
    );
    expect(result.map((i) => i.name)).toEqual(['Ham', 'Milk']);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm test src/domain/expiry.test.ts`
Expected: FAIL, cannot resolve `./expiry`.

- [ ] **Step 3: Implement**

`src/domain/expiry.ts`:

```ts
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
```

- [ ] **Step 4: Run tests**

Run: `pnpm test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add expiry status, labels and sorting"
```

---

### Task 3: Validation, storage and backup

**Files:**
- Create: `src/domain/validate.ts`, `src/domain/storage.ts`, `src/domain/backup.ts`
- Test: `src/domain/validate.test.ts`, `src/domain/storage.test.ts`, `src/domain/backup.test.ts`

**Interfaces:**
- Consumes: `IAppData`, `IItem`, `createEmptyData`, `MAX_SOON_DAYS` from `model.ts`; `isCompartmentId` from `compartments.ts`.
- Produces:
  - `validate.ts`: `clampSoonDays(n: number): number`, `parseItem(value: unknown): IItem | null`, `parseAppData(value: unknown): IAppData | null` (null if anything is invalid)
  - `storage.ts`: `STORAGE_KEY = 'fridge-app:data'`, `load(store?: Storage): IAppData` (never throws), `save(data: IAppData, store?: Storage): boolean` (false on failure, never throws). `store` defaults to `localStorage` when it is accessible.
  - `backup.ts`: `exportJson(data: IAppData): string`, `importJson(text: string): IAppData` (throws `Error` with copy "That file isn't valid JSON." or "That file isn't a fridge backup."), `backupFileName(today: string): string` → `fridge-backup-<today>.json`

- [ ] **Step 1: Write the failing validation tests**

`src/domain/validate.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { clampSoonDays, parseAppData } from './validate';

const validItem = {
  id: 'a1',
  name: 'Milk',
  quantity: '2 pints',
  expiry: '2026-10-12',
  compartment: 'fridge-door',
  addedAt: '2026-10-11T08:00:00.000Z',
};

const withItems = (items: unknown[], soonDays: unknown = 3) => ({
  version: 1,
  items,
  settings: { soonDays },
});

describe('parseAppData', () => {
  it('accepts valid data', () => {
    expect(parseAppData(withItems([validItem]))).toEqual(withItems([validItem]));
  });

  it('accepts items without quantity or expiry', () => {
    const bare = { id: 'a1', name: 'Milk', compartment: 'fridge-door', addedAt: '2026-10-11T08:00:00.000Z' };
    expect(parseAppData(withItems([bare]))?.items[0]).toEqual(bare);
  });

  it.each([
    ['an unknown compartment', { ...validItem, compartment: 'garage' }],
    ['a non-ISO expiry date', { ...validItem, expiry: '11/10/2026' }],
    ['a blank name', { ...validItem, name: '   ' }],
    ['a missing id', { ...validItem, id: undefined }],
    ['a numeric quantity', { ...validItem, quantity: 2 }],
  ])('rejects an item with %s', (_label, bad) => {
    expect(parseAppData(withItems([validItem, bad]))).toBeNull();
  });

  it.each([null, 'hello', [], { version: 2, items: [], settings: { soonDays: 3 } }, { version: 1, items: {} }])(
    'rejects %j',
    (value) => {
      expect(parseAppData(value)).toBeNull();
    },
  );

  it('rejects a non-numeric soonDays', () => {
    expect(parseAppData(withItems([], 'three'))).toBeNull();
  });

  it('clamps soonDays into range', () => {
    expect(parseAppData(withItems([], 99))?.settings.soonDays).toBe(30);
    expect(parseAppData(withItems([], -2))?.settings.soonDays).toBe(0);
  });
});

describe('clampSoonDays', () => {
  it('rounds and clamps', () => {
    expect(clampSoonDays(2.6)).toBe(3);
    expect(clampSoonDays(31)).toBe(30);
    expect(clampSoonDays(-1)).toBe(0);
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `pnpm test src/domain/validate.test.ts`
Expected: FAIL, cannot resolve `./validate`.

- [ ] **Step 3: Implement validation**

`src/domain/validate.ts`:

```ts
import { isCompartmentId } from './compartments';
import { MAX_SOON_DAYS, type IAppData, type IItem } from './model';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const clampSoonDays = (n: number): number => Math.min(MAX_SOON_DAYS, Math.max(0, Math.round(n)));

export const parseItem = (value: unknown): IItem | null => {
  if (!isRecord(value)) return null;
  const { id, name, quantity, expiry, compartment, addedAt } = value;
  if (typeof id !== 'string' || id === '') return null;
  if (typeof name !== 'string' || name.trim() === '') return null;
  if (quantity !== undefined && typeof quantity !== 'string') return null;
  if (expiry !== undefined && (typeof expiry !== 'string' || !ISO_DATE.test(expiry))) return null;
  if (!isCompartmentId(compartment)) return null;
  if (typeof addedAt !== 'string') return null;
  return {
    id,
    name,
    compartment,
    addedAt,
    ...(quantity ? { quantity } : {}),
    ...(expiry ? { expiry } : {}),
  };
};

export const parseAppData = (value: unknown): IAppData | null => {
  if (!isRecord(value) || value.version !== 1) return null;
  if (!Array.isArray(value.items) || !isRecord(value.settings)) return null;

  const items: IItem[] = [];
  for (const raw of value.items) {
    const item = parseItem(raw);
    if (!item) return null;
    items.push(item);
  }

  const { soonDays } = value.settings;
  if (typeof soonDays !== 'number' || !Number.isFinite(soonDays)) return null;

  return { version: 1, items, settings: { soonDays: clampSoonDays(soonDays) } };
};
```

Note the returned item rebuilds keys in a fixed order (`id, name, compartment, addedAt, quantity, expiry`); `toEqual` ignores key order so the tests pass.

- [ ] **Step 4: Write the failing storage tests**

`src/domain/storage.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createEmptyData, type IAppData } from './model';
import { load, save, STORAGE_KEY } from './storage';

const memoryStorage = (): Storage => {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => {
      map.delete(key);
    },
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
};

const throwingStorage = (): Storage => ({
  ...memoryStorage(),
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
});

const sample: IAppData = {
  version: 1,
  items: [{ id: 'a', name: 'Peas', compartment: 'freezer-drawer-1', addedAt: '2026-10-11T08:00:00.000Z' }],
  settings: { soonDays: 5 },
};

describe('storage', () => {
  it('returns empty data when nothing is stored', () => {
    expect(load(memoryStorage())).toEqual(createEmptyData());
  });

  it('round-trips saved data', () => {
    const store = memoryStorage();
    expect(save(sample, store)).toBe(true);
    expect(load(store)).toEqual(sample);
  });

  it('falls back to empty data when stored JSON is corrupt', () => {
    const store = memoryStorage();
    store.setItem(STORAGE_KEY, '{not json');
    expect(load(store)).toEqual(createEmptyData());
  });

  it('falls back to empty data when stored data has the wrong shape', () => {
    const store = memoryStorage();
    store.setItem(STORAGE_KEY, JSON.stringify({ version: 1, items: 'nope' }));
    expect(load(store)).toEqual(createEmptyData());
  });

  it('never throws when storage is unavailable or full', () => {
    expect(load(throwingStorage())).toEqual(createEmptyData());
    expect(save(sample, throwingStorage())).toBe(false);
  });

  it('uses localStorage by default', () => {
    expect(save(sample)).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(sample);
    expect(load()).toEqual(sample);
  });
});
```

- [ ] **Step 5: Run to see it fail**

Run: `pnpm test src/domain/storage.test.ts`
Expected: FAIL, cannot resolve `./storage`.

- [ ] **Step 6: Implement storage**

`src/domain/storage.ts`:

```ts
import { createEmptyData, type IAppData } from './model';
import { parseAppData } from './validate';

export const STORAGE_KEY = 'fridge-app:data';

/** Reading `localStorage` itself can throw in some privacy modes. */
const defaultStorage = (): Storage | undefined => {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
};

export const load = (store: Storage | undefined = defaultStorage()): IAppData => {
  try {
    const text = store?.getItem(STORAGE_KEY);
    if (!text) return createEmptyData();
    return parseAppData(JSON.parse(text)) ?? createEmptyData();
  } catch {
    return createEmptyData();
  }
};

export const save = (data: IAppData, store: Storage | undefined = defaultStorage()): boolean => {
  if (!store) return false;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
};
```

- [ ] **Step 7: Write the failing backup tests**

`src/domain/backup.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { backupFileName, exportJson, importJson } from './backup';
import type { IAppData } from './model';

const sample: IAppData = {
  version: 1,
  items: [
    {
      id: 'a',
      name: 'Milk',
      expiry: '2026-10-12',
      compartment: 'fridge-door',
      addedAt: '2026-10-11T08:00:00.000Z',
    },
  ],
  settings: { soonDays: 3 },
};

describe('backup', () => {
  it('round-trips through JSON', () => {
    expect(importJson(exportJson(sample))).toEqual(sample);
  });

  it('rejects text that is not JSON', () => {
    expect(() => importJson('hello')).toThrow("That file isn't valid JSON.");
  });

  it('rejects JSON that is not a fridge backup', () => {
    expect(() => importJson('{"version":1,"items":[{"name":"x","compartment":"garage"}],"settings":{"soonDays":3}}')).toThrow(
      "That file isn't a fridge backup.",
    );
  });

  it('names the file with the date', () => {
    expect(backupFileName('2026-10-11')).toBe('fridge-backup-2026-10-11.json');
  });
});
```

- [ ] **Step 8: Run to see it fail**

Run: `pnpm test src/domain/backup.test.ts`
Expected: FAIL, cannot resolve `./backup`.

- [ ] **Step 9: Implement backup**

`src/domain/backup.ts`:

```ts
import type { IAppData } from './model';
import { parseAppData } from './validate';

export const exportJson = (data: IAppData): string => JSON.stringify(data, null, 2);

export const importJson = (text: string): IAppData => {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  const data = parseAppData(raw);
  if (!data) throw new Error("That file isn't a fridge backup.");
  return data;
};

export const backupFileName = (today: string): string => `fridge-backup-${today}.json`;
```

- [ ] **Step 10: Run all tests and typecheck**

Run: `pnpm test && pnpm typecheck`
Expected: all pass, no type errors.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: add data validation, local storage and JSON backup"
```

---

### Task 4: Reducer and useFridge hook

**Files:**
- Create: `src/domain/reducer.ts`, `src/store.ts`
- Test: `src/domain/reducer.test.ts`

**Interfaces:**
- Consumes: `IAppData`, `IItem`, `IItemFields`, `TCompartmentId` (model); `clampSoonDays` (validate); `load`, `save` (storage).
- Produces:
  - `reducer.ts`:
    - `type TAction = { type: 'add'; item: IItem } | { type: 'update'; id: string; fields: IItemFields } | { type: 'remove'; id: string } | { type: 'setSoonDays'; soonDays: number } | { type: 'replaceAll'; data: IAppData }`
    - `reduce(data: IAppData, action: TAction): IAppData`
    - `createItem(fields: IItemFields, compartment: TCompartmentId, now?: Date): IItem`
    - `toFields(item: IItem): IItemFields`
  - `store.ts`: `useFridge(): { data: IAppData; dispatch: (action: TAction) => void; saveFailed: boolean }`

- [ ] **Step 1: Write the failing reducer tests**

`src/domain/reducer.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createEmptyData, type IAppData, type IItem } from './model';
import { createItem, reduce, toFields } from './reducer';

const milk: IItem = {
  id: 'milk',
  name: 'Milk',
  quantity: '2 pints',
  expiry: '2026-10-12',
  compartment: 'fridge-door',
  addedAt: '2026-10-11T08:00:00.000Z',
};

const withMilk = (): IAppData => ({ ...createEmptyData(), items: [milk] });

describe('createItem', () => {
  it('trims the name and drops empty optional fields', () => {
    const item = createItem({ name: '  Peas  ', quantity: '  ', expiry: '' }, 'freezer-drawer-1', new Date('2026-10-11T08:00:00.000Z'));
    expect(item).toEqual({
      id: expect.any(String),
      name: 'Peas',
      compartment: 'freezer-drawer-1',
      addedAt: '2026-10-11T08:00:00.000Z',
    });
    expect('quantity' in item).toBe(false);
    expect('expiry' in item).toBe(false);
  });

  it('keeps quantity and expiry when given', () => {
    const item = createItem({ name: 'Ham', quantity: ' 4 slices ', expiry: '2026-10-13' }, 'fridge-shelf-2');
    expect(item.quantity).toBe('4 slices');
    expect(item.expiry).toBe('2026-10-13');
  });

  it('gives each item a different id', () => {
    const fields = { name: 'A', quantity: '', expiry: '' };
    expect(createItem(fields, 'fridge-door').id).not.toBe(createItem(fields, 'fridge-door').id);
  });
});

describe('reduce', () => {
  it('adds an item', () => {
    expect(reduce(createEmptyData(), { type: 'add', item: milk }).items).toEqual([milk]);
  });

  it('updates fields but keeps id, compartment and addedAt', () => {
    const next = reduce(withMilk(), {
      type: 'update',
      id: 'milk',
      fields: { name: ' Oat milk ', quantity: '1 carton', expiry: '2026-10-20' },
    });
    expect(next.items[0]).toEqual({ ...milk, name: 'Oat milk', quantity: '1 carton', expiry: '2026-10-20' });
  });

  it('removes the expiry and quantity when they are cleared', () => {
    const next = reduce(withMilk(), { type: 'update', id: 'milk', fields: { name: 'Milk', quantity: '', expiry: '' } });
    expect('expiry' in next.items[0]).toBe(false);
    expect('quantity' in next.items[0]).toBe(false);
  });

  it('removes an item', () => {
    expect(reduce(withMilk(), { type: 'remove', id: 'milk' }).items).toEqual([]);
  });

  it('clamps soon days', () => {
    expect(reduce(createEmptyData(), { type: 'setSoonDays', soonDays: 50 }).settings.soonDays).toBe(30);
  });

  it('replaces all data', () => {
    expect(reduce(createEmptyData(), { type: 'replaceAll', data: withMilk() })).toEqual(withMilk());
  });

  it('does not mutate the input', () => {
    const before = withMilk();
    reduce(before, { type: 'remove', id: 'milk' });
    expect(before.items).toHaveLength(1);
  });
});

describe('toFields', () => {
  it('maps missing optional fields to empty strings', () => {
    expect(toFields({ ...milk, quantity: undefined, expiry: undefined })).toEqual({ name: 'Milk', quantity: '', expiry: '' });
    expect(toFields(milk)).toEqual({ name: 'Milk', quantity: '2 pints', expiry: '2026-10-12' });
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `pnpm test src/domain/reducer.test.ts`
Expected: FAIL, cannot resolve `./reducer`.

- [ ] **Step 3: Implement the reducer**

`src/domain/reducer.ts`:

```ts
import type { IAppData, IItem, IItemFields, TCompartmentId } from './model';
import { clampSoonDays } from './validate';

export type TAction =
  | { type: 'add'; item: IItem }
  | { type: 'update'; id: string; fields: IItemFields }
  | { type: 'remove'; id: string }
  | { type: 'setSoonDays'; soonDays: number }
  | { type: 'replaceAll'; data: IAppData };

const newId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const normaliseFields = (fields: IItemFields): Pick<IItem, 'name' | 'quantity' | 'expiry'> => {
  const quantity = fields.quantity.trim();
  const expiry = fields.expiry.trim();
  return {
    name: fields.name.trim(),
    ...(quantity ? { quantity } : {}),
    ...(expiry ? { expiry } : {}),
  };
};

export const createItem = (fields: IItemFields, compartment: TCompartmentId, now: Date = new Date()): IItem => ({
  id: newId(),
  compartment,
  addedAt: now.toISOString(),
  ...normaliseFields(fields),
});

export const toFields = (item: IItem): IItemFields => ({
  name: item.name,
  quantity: item.quantity ?? '',
  expiry: item.expiry ?? '',
});

const applyFields = (item: IItem, fields: IItemFields): IItem => ({
  id: item.id,
  compartment: item.compartment,
  addedAt: item.addedAt,
  ...normaliseFields(fields),
});

export const reduce = (data: IAppData, action: TAction): IAppData => {
  switch (action.type) {
    case 'add':
      return { ...data, items: [...data.items, action.item] };
    case 'update':
      return {
        ...data,
        items: data.items.map((item) => (item.id === action.id ? applyFields(item, action.fields) : item)),
      };
    case 'remove':
      return { ...data, items: data.items.filter((item) => item.id !== action.id) };
    case 'setSoonDays':
      return { ...data, settings: { ...data.settings, soonDays: clampSoonDays(action.soonDays) } };
    case 'replaceAll':
      return action.data;
  }
};
```

- [ ] **Step 4: Run tests**

Run: `pnpm test`
Expected: all pass.

- [ ] **Step 5: Write the hook**

`src/store.ts` (covered by the App tests in Task 9):

```ts
import { useCallback, useRef, useState } from 'preact/hooks';
import type { IAppData } from './domain/model';
import { reduce, type TAction } from './domain/reducer';
import { load, save } from './domain/storage';

export interface IFridgeStore {
  data: IAppData;
  dispatch: (action: TAction) => void;
  saveFailed: boolean;
}

export const useFridge = (): IFridgeStore => {
  const [data, setData] = useState<IAppData>(() => load());
  const [saveFailed, setSaveFailed] = useState(false);
  const latest = useRef(data);

  const dispatch = useCallback((action: TAction) => {
    const next = reduce(latest.current, action);
    latest.current = next;
    setData(next);
    setSaveFailed(!save(next));
  }, []);

  return { data, dispatch, saveFailed };
};
```

- [ ] **Step 6: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add item reducer and persisted useFridge hook"
```

---

### Task 5: Fridge component

**Files:**
- Create: `src/components/Fridge.tsx`
- Test: `src/components/Fridge.test.tsx`

**Interfaces:**
- Consumes: `COMPARTMENTS`, `ICompartment` (compartments); `IItem`, `TCompartmentId`, `TSection` (model).
- Produces: `Fridge(props: { items: IItem[]; alertCount: number; onOpenCompartment: (id: TCompartmentId) => void })`.
  - Doors are buttons named "Open the fridge" / "Open the freezer"; when open, "Close the fridge" / "Close the freezer", with `aria-expanded`. When `alertCount > 0` the fridge door name gains ", N to use soon" and shows a badge.
  - Compartment buttons render only while their door is open; names are "<Compartment name>, N item(s)".
  - CSS class names used by Task 9: `fridge`, `page-title`, `cabinet`, `cabinet--fridge`, `cabinet--freezer`, `cabinet--open`, `cabinet__door`, `cabinet__badge`, `cabinet__interior`, `face`, `compartment`, `compartment--shelf|door|drawer`, `compartment__name`, `compartment__count`, `fridge__shelves`, `fridge__feet`.

- [ ] **Step 1: Write the failing tests**

`src/components/Fridge.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import type { IItem } from '../domain/model';
import { Fridge } from './Fridge';

const items: IItem[] = [
  { id: '1', name: 'Milk', compartment: 'fridge-door', addedAt: '2026-10-11T08:00:00.000Z' },
  { id: '2', name: 'Ham', compartment: 'fridge-shelf-1', addedAt: '2026-10-11T08:00:00.000Z' },
  { id: '3', name: 'Cheese', compartment: 'fridge-shelf-1', addedAt: '2026-10-11T08:00:00.000Z' },
];

describe('Fridge', () => {
  it('starts with both doors closed', () => {
    render(<Fridge items={items} alertCount={0} onOpenCompartment={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Open the fridge' }).getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByRole('button', { name: 'Open the freezer' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Top shelf/ })).toBeNull();
  });

  it('opens the fridge to show three shelves and the door compartment with counts', () => {
    render(<Fridge items={items} alertCount={0} onOpenCompartment={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open the fridge' }));

    expect(screen.getByRole('button', { name: 'Close the fridge' }).getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: 'Top shelf, 2 items' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Middle shelf, 0 items' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Bottom shelf, 0 items' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Door, 1 item' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /drawer/ })).toBeNull();
  });

  it('opens the freezer to show three drawers', () => {
    render(<Fridge items={items} alertCount={0} onOpenCompartment={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open the freezer' }));
    expect(screen.getAllByRole('button', { name: /drawer, 0 items/ })).toHaveLength(3);
  });

  it('closes a door again', () => {
    render(<Fridge items={items} alertCount={0} onOpenCompartment={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open the fridge' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close the fridge' }));
    expect(screen.queryByRole('button', { name: /Top shelf/ })).toBeNull();
  });

  it('reports which compartment was tapped', () => {
    const onOpen = vi.fn();
    render(<Fridge items={items} alertCount={0} onOpenCompartment={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open the fridge' }));
    fireEvent.click(screen.getByRole('button', { name: 'Door, 1 item' }));
    expect(onOpen).toHaveBeenCalledWith('fridge-door');
  });

  it('shows how many items to use soon on the fridge door', () => {
    render(<Fridge items={items} alertCount={2} onOpenCompartment={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Open the fridge, 2 to use soon' })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `pnpm test src/components/Fridge.test.tsx`
Expected: FAIL, cannot resolve `./Fridge`.

- [ ] **Step 3: Implement**

`src/components/Fridge.tsx`:

```tsx
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { COMPARTMENTS, type ICompartment } from '../domain/compartments';
import type { IItem, TCompartmentId, TSection } from '../domain/model';

interface IFridgeProps {
  items: IItem[];
  alertCount: number;
  onOpenCompartment: (id: TCompartmentId) => void;
}

const SECTION_NAMES: Record<TSection, string> = { fridge: 'fridge', freezer: 'freezer' };

const DoorFace = ({ sleepy }: { sleepy: boolean }) => (
  <svg class="face" viewBox="0 0 120 80" aria-hidden="true">
    {sleepy ? (
      <>
        <path d="M32 34 q10 -10 20 0" />
        <path d="M68 34 q10 -10 20 0" />
      </>
    ) : (
      <>
        <circle cx="42" cy="30" r="7" class="face__eye" />
        <circle cx="78" cy="30" r="7" class="face__eye" />
        <circle cx="44" cy="27" r="2.2" class="face__shine" />
        <circle cx="80" cy="27" r="2.2" class="face__shine" />
      </>
    )}
    <ellipse cx="28" cy="46" rx="9" ry="5" class="face__cheek" />
    <ellipse cx="92" cy="46" rx="9" ry="5" class="face__cheek" />
    <path d="M50 46 q10 12 20 0" />
  </svg>
);

interface ICabinetProps {
  section: TSection;
  open: boolean;
  alertCount: number;
  onToggle: () => void;
  children: ComponentChildren;
}

const Cabinet = ({ section, open, alertCount, onToggle, children }: ICabinetProps) => {
  const name = SECTION_NAMES[section];
  const alert = alertCount > 0 ? `, ${alertCount} to use soon` : '';
  return (
    <section class={`cabinet cabinet--${section}${open ? ' cabinet--open' : ''}`}>
      {open && <div class="cabinet__interior">{children}</div>}
      <button
        type="button"
        class="cabinet__door"
        aria-expanded={open}
        aria-label={open ? `Close the ${name}` : `Open the ${name}${alert}`}
        onClick={onToggle}
      >
        <DoorFace sleepy={section === 'freezer'} />
        {alertCount > 0 && (
          <span class="cabinet__badge" aria-hidden="true">
            {alertCount}
          </span>
        )}
      </button>
    </section>
  );
};

interface ICompartmentButtonProps {
  compartment: ICompartment;
  count: number;
  onOpen: (id: TCompartmentId) => void;
}

const CompartmentButton = ({ compartment, count, onOpen }: ICompartmentButtonProps) => (
  <button
    type="button"
    class={`compartment compartment--${compartment.kind}`}
    aria-label={`${compartment.name}, ${count} ${count === 1 ? 'item' : 'items'}`}
    onClick={() => onOpen(compartment.id)}
  >
    <span class="compartment__name">{compartment.name}</span>
    <span class="compartment__count">{count}</span>
  </button>
);

export const Fridge = ({ items, alertCount, onOpenCompartment }: IFridgeProps) => {
  const [open, setOpen] = useState<Record<TSection, boolean>>({ fridge: false, freezer: false });
  const toggle = (section: TSection) => setOpen((o) => ({ ...o, [section]: !o[section] }));
  const countIn = (id: TCompartmentId) => items.filter((i) => i.compartment === id).length;
  const button = (c: ICompartment) => (
    <CompartmentButton key={c.id} compartment={c} count={countIn(c.id)} onOpen={onOpenCompartment} />
  );

  const shelves = COMPARTMENTS.filter((c) => c.kind === 'shelf');
  const door = COMPARTMENTS.filter((c) => c.kind === 'door');
  const drawers = COMPARTMENTS.filter((c) => c.kind === 'drawer');

  return (
    <div class="fridge">
      <h1 class="page-title">What's in the fridge?</h1>
      <Cabinet section="fridge" open={open.fridge} alertCount={alertCount} onToggle={() => toggle('fridge')}>
        <div class="fridge__shelves">{shelves.map(button)}</div>
        {door.map(button)}
      </Cabinet>
      <Cabinet section="freezer" open={open.freezer} alertCount={0} onToggle={() => toggle('freezer')}>
        {drawers.map(button)}
      </Cabinet>
      <div class="fridge__feet" aria-hidden="true">
        <span />
        <span />
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm test && pnpm typecheck`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add the fridge-freezer with opening doors and compartments"
```

---

### Task 6: Compartment sheet with add, edit and remove

**Files:**
- Create: `src/components/ExpiryChip.tsx`, `src/components/ItemForm.tsx`, `src/components/CompartmentSheet.tsx`
- Test: `src/components/CompartmentSheet.test.tsx`

**Interfaces:**
- Consumes: `compartmentName` (compartments); `describeExpiry`, `expiryStatus`, `sortItems`, `addDays`, `todayIso` (expiry); `createItem`, `toFields`, `TAction` (reducer); `IItem`, `IItemFields`, `TCompartmentId` (model).
- Produces:
  - `ExpiryChip(props: { expiry?: string; today: string; soonDays: number })` — renders `<span class="chip chip--<status>">` with `describeExpiry` text, or nothing.
  - `ItemForm(props: { initial?: IItemFields; submitLabel: string; onSubmit: (fields: IItemFields) => void; onCancel: () => void })` — inputs labelled "Name", "Quantity (optional)", "Expiry date (optional)".
  - `CompartmentSheet(props: { compartmentId: TCompartmentId; items: IItem[]; today: string; soonDays: number; dispatch: (action: TAction) => void; onClose: () => void })` — `role="dialog"` named by the compartment; buttons "Add item", "Edit <name>", "Remove <name>", "Close"; Escape and backdrop tap close it.
  - CSS class names used by Task 9: `sheet-backdrop`, `sheet`, `sheet__header`, `icon-button`, `item-list`, `item-row`, `item-row__text`, `item-row__name`, `item-row__qty`, `item-row__actions`, `chip`, `chip--expired|soon|ok`, `primary`, `secondary`, `item-form`, `item-form__actions`, `optional`, `link`, `empty`.

- [ ] **Step 1: Write the failing tests**

`src/components/CompartmentSheet.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { addDays, todayIso } from '../domain/expiry';
import type { IItem } from '../domain/model';
import { CompartmentSheet } from './CompartmentSheet';

const today = todayIso();
const tomorrow = addDays(today, 1);

const ham: IItem = {
  id: 'ham',
  name: 'Ham',
  quantity: '4 slices',
  expiry: tomorrow,
  compartment: 'fridge-shelf-1',
  addedAt: '2026-10-11T08:00:00.000Z',
};

const renderSheet = (items: IItem[] = []) => {
  const dispatch = vi.fn();
  const onClose = vi.fn();
  render(
    <CompartmentSheet
      compartmentId="fridge-shelf-1"
      items={items}
      today={today}
      soonDays={3}
      dispatch={dispatch}
      onClose={onClose}
    />,
  );
  return { dispatch, onClose };
};

describe('CompartmentSheet', () => {
  it('is a dialog named after the compartment, with an empty state', () => {
    renderSheet();
    expect(screen.getByRole('dialog', { name: 'Top shelf' })).toBeTruthy();
    expect(screen.getByText('Nothing here yet.')).toBeTruthy();
  });

  it('lists items with quantity and expiry', () => {
    renderSheet([ham]);
    expect(screen.getByText('Ham')).toBeTruthy();
    expect(screen.getByText('4 slices')).toBeTruthy();
    expect(screen.getByText('Expires tomorrow').className).toContain('chip--soon');
  });

  it('adds an item to this compartment', () => {
    const { dispatch } = renderSheet();
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
    fireEvent.input(screen.getByLabelText('Name'), { target: { value: ' Milk ' } });
    fireEvent.input(screen.getByLabelText(/Quantity/), { target: { value: '2 pints' } });
    fireEvent.change(screen.getByLabelText(/Expiry date/), { target: { value: tomorrow } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(dispatch).toHaveBeenCalledWith({
      type: 'add',
      item: expect.objectContaining({
        name: 'Milk',
        quantity: '2 pints',
        expiry: tomorrow,
        compartment: 'fridge-shelf-1',
      }),
    });
    expect(screen.getByRole('button', { name: 'Add item' })).toBeTruthy();
  });

  it('will not add an item whose name is only spaces', () => {
    const { dispatch } = renderSheet();
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
    fireEvent.input(screen.getByLabelText('Name'), { target: { value: '   ' } });
    const add = screen.getByRole('button', { name: 'Add' }) as HTMLButtonElement;
    expect(add.disabled).toBe(true);
    fireEvent.click(add);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('cancels adding without dispatching', () => {
    const { dispatch } = renderSheet();
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(dispatch).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Add item' })).toBeTruthy();
  });

  it('edits an item with its current values filled in', () => {
    const { dispatch } = renderSheet([ham]);
    fireEvent.click(screen.getByRole('button', { name: 'Edit Ham' }));
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Ham');
    expect((screen.getByLabelText(/Expiry date/) as HTMLInputElement).value).toBe(tomorrow);

    fireEvent.click(screen.getByRole('button', { name: 'Clear date' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(dispatch).toHaveBeenCalledWith({
      type: 'update',
      id: 'ham',
      fields: { name: 'Ham', quantity: '4 slices', expiry: '' },
    });
  });

  it('removes an item', () => {
    const { dispatch } = renderSheet([ham]);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Ham' }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'remove', id: 'ham' });
  });

  it('closes with the close button, Escape or a backdrop tap', () => {
    const { onClose } = renderSheet();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(screen.getByRole('dialog').parentElement!);
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('does not close when tapping inside the sheet', () => {
    const { onClose } = renderSheet();
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `pnpm test src/components/CompartmentSheet.test.tsx`
Expected: FAIL, cannot resolve `./CompartmentSheet`.

- [ ] **Step 3: Implement ExpiryChip**

`src/components/ExpiryChip.tsx`:

```tsx
import { describeExpiry, expiryStatus } from '../domain/expiry';

interface IExpiryChipProps {
  expiry?: string;
  today: string;
  soonDays: number;
}

export const ExpiryChip = ({ expiry, today, soonDays }: IExpiryChipProps) => {
  if (!expiry) return null;
  const status = expiryStatus({ expiry }, today, soonDays);
  return <span class={`chip chip--${status}`}>{describeExpiry(expiry, today)}</span>;
};
```

- [ ] **Step 4: Implement ItemForm**

`src/components/ItemForm.tsx`:

```tsx
import type { TargetedEvent } from 'preact';
import { useState } from 'preact/hooks';
import type { IItemFields } from '../domain/model';

interface IItemFormProps {
  initial?: IItemFields;
  submitLabel: string;
  onSubmit: (fields: IItemFields) => void;
  onCancel: () => void;
}

const EMPTY: IItemFields = { name: '', quantity: '', expiry: '' };

export const ItemForm = ({ initial = EMPTY, submitLabel, onSubmit, onCancel }: IItemFormProps) => {
  const [fields, setFields] = useState<IItemFields>(initial);
  const canSave = fields.name.trim() !== '';

  // Read the value before setState: the event's currentTarget is gone by the time an updater runs.
  const update = (key: keyof IItemFields) => (event: TargetedEvent<HTMLInputElement>) => {
    const { value } = event.currentTarget;
    setFields((f) => ({ ...f, [key]: value }));
  };

  const submit = (event: Event) => {
    event.preventDefault();
    if (canSave) onSubmit(fields);
  };

  return (
    <form class="item-form" onSubmit={submit}>
      <label>
        Name
        <input value={fields.name} onInput={update('name')} maxLength={80} autoComplete="off" />
      </label>
      <label>
        Quantity <span class="optional">(optional)</span>
        <input
          value={fields.quantity}
          onInput={update('quantity')}
          maxLength={40}
          placeholder="e.g. half a tub"
          autoComplete="off"
        />
      </label>
      <label>
        Expiry date <span class="optional">(optional)</span>
        <input type="date" value={fields.expiry} onInput={update('expiry')} onChange={update('expiry')} />
      </label>
      {fields.expiry && (
        <button type="button" class="link" onClick={() => setFields((f) => ({ ...f, expiry: '' }))}>
          Clear date
        </button>
      )}
      <div class="item-form__actions">
        <button type="button" class="secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" class="primary" disabled={!canSave}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
};
```

- [ ] **Step 5: Implement CompartmentSheet**

`src/components/CompartmentSheet.tsx`:

```tsx
import { useEffect, useState } from 'preact/hooks';
import { compartmentName } from '../domain/compartments';
import { sortItems } from '../domain/expiry';
import type { IItem, TCompartmentId } from '../domain/model';
import { createItem, toFields, type TAction } from '../domain/reducer';
import { ExpiryChip } from './ExpiryChip';
import { ItemForm } from './ItemForm';

interface ICompartmentSheetProps {
  compartmentId: TCompartmentId;
  items: IItem[];
  today: string;
  soonDays: number;
  dispatch: (action: TAction) => void;
  onClose: () => void;
}

type TMode = { kind: 'list' } | { kind: 'add' } | { kind: 'edit'; item: IItem };

export const CompartmentSheet = ({ compartmentId, items, today, soonDays, dispatch, onClose }: ICompartmentSheetProps) => {
  const [mode, setMode] = useState<TMode>({ kind: 'list' });
  const backToList = () => setMode({ kind: 'list' });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const sorted = sortItems(items);

  return (
    <div class="sheet-backdrop" onClick={onClose}>
      <div
        class="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header class="sheet__header">
          <h2 id="sheet-title">{compartmentName(compartmentId)}</h2>
          <button type="button" class="icon-button" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>

        {mode.kind === 'list' && (
          <>
            {sorted.length === 0 ? (
              <p class="empty">Nothing here yet.</p>
            ) : (
              <ul class="item-list">
                {sorted.map((item) => (
                  <li key={item.id} class="item-row">
                    <div class="item-row__text">
                      <span class="item-row__name">{item.name}</span>
                      {item.quantity && <span class="item-row__qty">{item.quantity}</span>}
                      <ExpiryChip expiry={item.expiry} today={today} soonDays={soonDays} />
                    </div>
                    <div class="item-row__actions">
                      <button type="button" aria-label={`Edit ${item.name}`} onClick={() => setMode({ kind: 'edit', item })}>
                        Edit
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${item.name}`}
                        onClick={() => dispatch({ type: 'remove', id: item.id })}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" class="primary" onClick={() => setMode({ kind: 'add' })}>
              Add item
            </button>
          </>
        )}

        {mode.kind === 'add' && (
          <ItemForm
            submitLabel="Add"
            onCancel={backToList}
            onSubmit={(fields) => {
              dispatch({ type: 'add', item: createItem(fields, compartmentId) });
              backToList();
            }}
          />
        )}

        {mode.kind === 'edit' && (
          <ItemForm
            initial={toFields(mode.item)}
            submitLabel="Save"
            onCancel={backToList}
            onSubmit={(fields) => {
              dispatch({ type: 'update', id: mode.item.id, fields });
              backToList();
            }}
          />
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 6: Run tests and typecheck**

Run: `pnpm test && pnpm typecheck`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add compartment sheet to add, edit and remove items"
```

---

### Task 7: Use soon view

**Files:**
- Create: `src/components/UseSoon.tsx`
- Test: `src/components/UseSoon.test.tsx`

**Interfaces:**
- Consumes: `compartmentName` (compartments); `expiryStatus` (expiry); `ExpiryChip` (Task 6); `IItem`, `TCompartmentId` (model).
- Produces: `UseSoon(props: { items: IItem[]; today: string; soonDays: number; onOpenCompartment: (id: TCompartmentId) => void })`. `items` is already filtered and sorted by the caller (`getUseSoonItems`). Heading "Use soon". Each row is a button that opens the item's compartment.
  - CSS class names used by Task 9: `use-soon`, `soon-row`, `soon-row--expired|soon`, `soon-row__name`, `soon-row__where`.

- [ ] **Step 1: Write the failing tests**

`src/components/UseSoon.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import type { IItem } from '../domain/model';
import { UseSoon } from './UseSoon';

const today = '2026-10-11';
const items: IItem[] = [
  { id: '1', name: 'Ham', expiry: '2026-10-09', compartment: 'fridge-shelf-2', addedAt: '2026-10-01T08:00:00.000Z' },
  { id: '2', name: 'Milk', expiry: '2026-10-12', compartment: 'fridge-door', addedAt: '2026-10-01T08:00:00.000Z' },
];

describe('UseSoon', () => {
  it('lists items with where they are and when they expire', () => {
    render(<UseSoon items={items} today={today} soonDays={3} onOpenCompartment={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Use soon' })).toBeTruthy();
    expect(screen.getByText('Middle shelf')).toBeTruthy();
    expect(screen.getByText('Expired 2 days ago')).toBeTruthy();
    expect(screen.getByText('Door')).toBeTruthy();
    expect(screen.getByText('Expires tomorrow')).toBeTruthy();
  });

  it('marks expired and soon rows differently', () => {
    render(<UseSoon items={items} today={today} soonDays={3} onOpenCompartment={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Ham/ }).className).toContain('soon-row--expired');
    expect(screen.getByRole('button', { name: /Milk/ }).className).toContain('soon-row--soon');
  });

  it('opens the compartment when a row is tapped', () => {
    const onOpen = vi.fn();
    render(<UseSoon items={items} today={today} soonDays={3} onOpenCompartment={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: /Milk/ }));
    expect(onOpen).toHaveBeenCalledWith('fridge-door');
  });

  it('shows a friendly empty state', () => {
    render(<UseSoon items={[]} today={today} soonDays={3} onOpenCompartment={vi.fn()} />);
    expect(screen.getByText('Nothing expiring in the next 3 days.')).toBeTruthy();
  });

  it('words the empty state for zero soon days', () => {
    render(<UseSoon items={[]} today={today} soonDays={0} onOpenCompartment={vi.fn()} />);
    expect(screen.getByText('Nothing has expired.')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `pnpm test src/components/UseSoon.test.tsx`
Expected: FAIL, cannot resolve `./UseSoon`.

- [ ] **Step 3: Implement**

`src/components/UseSoon.tsx`:

```tsx
import { compartmentName } from '../domain/compartments';
import { expiryStatus } from '../domain/expiry';
import type { IItem, TCompartmentId } from '../domain/model';
import { ExpiryChip } from './ExpiryChip';

interface IUseSoonProps {
  items: IItem[];
  today: string;
  soonDays: number;
  onOpenCompartment: (id: TCompartmentId) => void;
}

const emptyMessage = (soonDays: number): string =>
  soonDays === 0
    ? 'Nothing has expired.'
    : `Nothing expiring in the next ${soonDays} ${soonDays === 1 ? 'day' : 'days'}.`;

export const UseSoon = ({ items, today, soonDays, onOpenCompartment }: IUseSoonProps) => (
  <section class="use-soon" aria-labelledby="use-soon-title">
    <h1 id="use-soon-title" class="page-title">
      Use soon
    </h1>
    {items.length === 0 ? (
      <p class="empty">{emptyMessage(soonDays)}</p>
    ) : (
      <ul class="item-list">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              class={`soon-row soon-row--${expiryStatus(item, today, soonDays)}`}
              onClick={() => onOpenCompartment(item.compartment)}
            >
              <span class="soon-row__name">{item.name}</span>
              <span class="soon-row__where">{compartmentName(item.compartment)}</span>
              <ExpiryChip expiry={item.expiry} today={today} soonDays={soonDays} />
            </button>
          </li>
        ))}
      </ul>
    )}
  </section>
);
```

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm test && pnpm typecheck`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add the use soon view"
```

---

### Task 8: Settings with soon days, export and import

**Files:**
- Create: `src/lib/saveFile.ts`, `src/components/Settings.tsx`
- Test: `src/components/Settings.test.tsx`

**Interfaces:**
- Consumes: `exportJson`, `importJson`, `backupFileName` (backup); `todayIso` (expiry); `MAX_SOON_DAYS`, `IAppData` (model); `TAction` (reducer).
- Produces:
  - `saveFile(file: File): Promise<void>` — shares via the iOS share sheet when `navigator.canShare({ files })` is true, otherwise downloads with a temporary link. A cancelled share (`AbortError`) is silent.
  - `Settings(props: { data: IAppData; dispatch: (action: TAction) => void })` — select labelled "Warn me this many days before expiry" (0–30); "Export backup" button; file input labelled "Import backup"; status text in `role="status"` (info) or `role="alert"` (error); an install hint when not running standalone.
  - CSS class names used by Task 9: `settings`, `settings__card`, `settings__buttons`, `hint`, `message--error`, `visually-hidden`.

- [ ] **Step 1: Write the failing tests**

`src/components/Settings.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { exportJson } from '../domain/backup';
import { todayIso } from '../domain/expiry';
import type { IAppData } from '../domain/model';
import { saveFile } from '../lib/saveFile';
import { Settings } from './Settings';

vi.mock('../lib/saveFile', () => ({ saveFile: vi.fn().mockResolvedValue(undefined) }));

const data: IAppData = {
  version: 1,
  items: [{ id: 'm', name: 'Milk', compartment: 'fridge-door', addedAt: '2026-10-11T08:00:00.000Z' }],
  settings: { soonDays: 3 },
};

const backup: IAppData = {
  version: 1,
  items: [{ id: 'p', name: 'Peas', compartment: 'freezer-drawer-1', addedAt: '2026-10-11T08:00:00.000Z' }],
  settings: { soonDays: 5 },
};

const upload = (text: string) => {
  const file = new File([text], 'backup.json', { type: 'application/json' });
  fireEvent.change(screen.getByLabelText('Import backup'), { target: { files: [file] } });
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(saveFile).mockClear();
});

describe('Settings', () => {
  it('changes the number of soon days', () => {
    const dispatch = vi.fn();
    render(<Settings data={data} dispatch={dispatch} />);
    const select = screen.getByLabelText('Warn me this many days before expiry') as HTMLSelectElement;
    expect(select.value).toBe('3');
    expect(select.options).toHaveLength(31);
    fireEvent.change(select, { target: { value: '7' } });
    expect(dispatch).toHaveBeenCalledWith({ type: 'setSoonDays', soonDays: 7 });
  });

  it('exports a dated backup file', async () => {
    render(<Settings data={data} dispatch={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Export backup' }));
    await waitFor(() => expect(saveFile).toHaveBeenCalledTimes(1));
    const file = vi.mocked(saveFile).mock.calls[0][0];
    expect(file.name).toBe(`fridge-backup-${todayIso()}.json`);
    expect(await file.text()).toBe(exportJson(data));
  });

  it('imports a valid backup after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const dispatch = vi.fn();
    render(<Settings data={data} dispatch={dispatch} />);
    upload(exportJson(backup));
    await waitFor(() => expect(dispatch).toHaveBeenCalledWith({ type: 'replaceAll', data: backup }));
    expect(await screen.findByRole('status')).toHaveProperty('textContent', 'Imported 1 item.');
  });

  it('leaves data alone when the import is not confirmed', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const dispatch = vi.fn();
    render(<Settings data={data} dispatch={dispatch} />);
    upload(exportJson(backup));
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('shows an error and leaves data alone for a bad file', async () => {
    const confirm = vi.spyOn(window, 'confirm');
    const dispatch = vi.fn();
    render(<Settings data={data} dispatch={dispatch} />);
    upload('{"version":1,"items":[{"id":"x","name":"Ham","compartment":"garage","addedAt":"x"}],"settings":{"soonDays":3}}');
    expect((await screen.findByRole('alert')).textContent).toBe("That file isn't a fridge backup.");
    expect(confirm).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('explains how to install when not running from the home screen', () => {
    render(<Settings data={data} dispatch={vi.fn()} />);
    expect(screen.getByText(/Add to Home Screen/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `pnpm test src/components/Settings.test.tsx`
Expected: FAIL, cannot resolve `../lib/saveFile` or `./Settings`.

- [ ] **Step 3: Implement saveFile**

`src/lib/saveFile.ts`:

```ts
/**
 * iOS home-screen apps cannot reliably download files, so prefer the share sheet
 * (which offers "Save to Files") and fall back to a normal download elsewhere.
 */
export const saveFile = async (file: File): Promise<void> => {
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name });
      return;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
    }
  }

  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
```

- [ ] **Step 4: Implement Settings**

`src/components/Settings.tsx`:

```tsx
import type { TargetedEvent } from 'preact';
import { useState } from 'preact/hooks';
import { backupFileName, exportJson, importJson } from '../domain/backup';
import { todayIso } from '../domain/expiry';
import { MAX_SOON_DAYS, type IAppData } from '../domain/model';
import type { TAction } from '../domain/reducer';
import { saveFile } from '../lib/saveFile';

interface ISettingsProps {
  data: IAppData;
  dispatch: (action: TAction) => void;
}

type TMessage = { kind: 'info' | 'error'; text: string } | null;

const DAY_OPTIONS = Array.from({ length: MAX_SOON_DAYS + 1 }, (_, n) => n);

const dayLabel = (n: number): string =>
  n === 0 ? '0 days (only show expired)' : `${n} ${n === 1 ? 'day' : 'days'}`;

const plural = (n: number): string => `${n} ${n === 1 ? 'item' : 'items'}`;

const isStandalone = (): boolean =>
  (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export const Settings = ({ data, dispatch }: ISettingsProps) => {
  const [message, setMessage] = useState<TMessage>(null);

  const onSoonDays = (event: TargetedEvent<HTMLSelectElement>) => {
    dispatch({ type: 'setSoonDays', soonDays: Number(event.currentTarget.value) });
  };

  const onExport = async () => {
    const file = new File([exportJson(data)], backupFileName(todayIso()), { type: 'application/json' });
    await saveFile(file);
  };

  const onImport = async (event: TargetedEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const imported = importJson(await file.text());
      const ok = window.confirm(
        `Replace everything in the fridge with ${plural(imported.items.length)} from this backup?`,
      );
      if (!ok) return;
      dispatch({ type: 'replaceAll', data: imported });
      setMessage({ kind: 'info', text: `Imported ${plural(imported.items.length)}.` });
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Import failed.' });
    }
  };

  return (
    <div class="settings">
      <h1 class="page-title">Settings</h1>

      <section class="settings__card">
        <label>
          Warn me this many days before expiry
          <select value={String(data.settings.soonDays)} onChange={onSoonDays}>
            {DAY_OPTIONS.map((n) => (
              <option key={n} value={String(n)}>
                {dayLabel(n)}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section class="settings__card">
        <h2>Backup</h2>
        <p class="hint">Everything is saved on this phone only. Export a backup now and then to keep it safe.</p>
        <div class="settings__buttons">
          <button type="button" class="secondary" onClick={onExport}>
            Export backup
          </button>
          <label class="secondary">
            Import backup
            <input type="file" accept="application/json,.json" class="visually-hidden" onChange={onImport} />
          </label>
        </div>
        {message?.kind === 'info' && <p role="status">{message.text}</p>}
        {message?.kind === 'error' && (
          <p role="alert" class="message--error">
            {message.text}
          </p>
        )}
      </section>

      {!isStandalone() && (
        <section class="settings__card">
          <h2>Install</h2>
          <p class="hint">Open this page in Safari, tap Share, then Add to Home Screen.</p>
        </section>
      )}
    </div>
  );
};
```

- [ ] **Step 5: Run tests and typecheck**

Run: `pnpm test && pnpm typecheck`
Expected: all pass. If `getByLabelText('Import backup')` fails because the label's text includes nothing else, it should match exactly; if jsdom reports the `files` property cannot be set, switch the `upload` helper to `Object.defineProperty(input, 'files', { value: [file] }); fireEvent.change(input);`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add settings for soon days, backup export and import"
```

---

### Task 9: App shell, tabs and styling

**Files:**
- Modify: `src/App.tsx` (replace placeholder), `src/styles.css` (fill)
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: `useFridge` (store); `Fridge`, `CompartmentSheet`, `UseSoon`, `Settings`; `getUseSoonItems`, `todayIso` (expiry); `STORAGE_KEY` (storage, tests only).
- Produces: `App` — tab bar (`nav` named "Main") with buttons "Fridge", "Use soon" (shows a count when > 0), "Settings"; `aria-current="page"` on the active tab; save-failure alert "Couldn't save — try exporting a backup".

- [ ] **Step 1: Write the failing tests**

`src/App.test.tsx`:

```tsx
import { fireEvent, render, screen, within } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { addDays, todayIso } from './domain/expiry';
import { STORAGE_KEY } from './domain/storage';

const tomorrow = addDays(todayIso(), 1);

const addMilkToTopShelf = () => {
  fireEvent.click(screen.getByRole('button', { name: /Open the fridge/ }));
  fireEvent.click(screen.getByRole('button', { name: /Top shelf/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
  fireEvent.input(screen.getByLabelText('Name'), { target: { value: 'Milk' } });
  fireEvent.change(screen.getByLabelText(/Expiry date/), { target: { value: tomorrow } });
  fireEvent.click(screen.getByRole('button', { name: 'Add' }));
};

afterEach(() => vi.restoreAllMocks());

describe('App', () => {
  it('starts on the fridge view', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: "What's in the fridge?" })).toBeTruthy();
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getByRole('button', { name: 'Fridge' }).getAttribute('aria-current')).toBe('page');
  });

  it('adds an item, saves it and lists it under Use soon', () => {
    render(<App />);
    addMilkToTopShelf();

    expect(within(screen.getByRole('dialog')).getByText('Milk')).toBeTruthy();
    expect(localStorage.getItem(STORAGE_KEY)).toContain('"Milk"');

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Use soon/ }));
    expect(screen.getByRole('heading', { name: 'Use soon' })).toBeTruthy();
    expect(screen.getByText('Expires tomorrow')).toBeTruthy();
  });

  it('shows the use soon count on the tab and the fridge door', () => {
    render(<App />);
    addMilkToTopShelf();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close the fridge' }));

    expect(screen.getByRole('button', { name: 'Use soon 1' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open the fridge, 1 to use soon' })).toBeTruthy();
  });

  it('opens the right compartment from Use soon', () => {
    render(<App />);
    addMilkToTopShelf();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('button', { name: /Use soon/ }));
    fireEvent.click(screen.getByRole('button', { name: /Milk/ }));
    expect(screen.getByRole('dialog', { name: 'Top shelf' })).toBeTruthy();
  });

  it('loads items saved earlier', () => {
    const first = render(<App />);
    addMilkToTopShelf();
    first.unmount();

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Open the fridge/ }));
    expect(screen.getByRole('button', { name: 'Top shelf, 1 item' })).toBeTruthy();
  });

  it('warns when saving fails but keeps working', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    render(<App />);
    addMilkToTopShelf();
    expect(screen.getByRole('alert').textContent).toBe("Couldn't save — try exporting a backup");
    expect(within(screen.getByRole('dialog')).getByText('Milk')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `pnpm test src/App.test.tsx`
Expected: FAIL, the placeholder has no tabs.

- [ ] **Step 3: Implement App**

`src/App.tsx`:

```tsx
import { useState } from 'preact/hooks';
import { CompartmentSheet } from './components/CompartmentSheet';
import { Fridge } from './components/Fridge';
import { Settings } from './components/Settings';
import { UseSoon } from './components/UseSoon';
import { getUseSoonItems, todayIso } from './domain/expiry';
import type { TCompartmentId } from './domain/model';
import { useFridge } from './store';

type TView = 'fridge' | 'soon' | 'settings';

export const App = () => {
  const { data, dispatch, saveFailed } = useFridge();
  const [view, setView] = useState<TView>('fridge');
  const [openId, setOpenId] = useState<TCompartmentId | null>(null);

  const today = todayIso();
  const { soonDays } = data.settings;
  const soonItems = getUseSoonItems(data.items, today, soonDays);
  const closeSheet = () => setOpenId(null);

  const tab = (id: TView, label: string, count = 0) => (
    <button type="button" aria-current={view === id ? 'page' : undefined} onClick={() => setView(id)}>
      {label}
      {count > 0 && <span class="tabs__count"> {count}</span>}
    </button>
  );

  return (
    <div class="app">
      <main class="app__main">
        {view === 'fridge' && (
          <Fridge items={data.items} alertCount={soonItems.length} onOpenCompartment={setOpenId} />
        )}
        {view === 'soon' && (
          <UseSoon items={soonItems} today={today} soonDays={soonDays} onOpenCompartment={setOpenId} />
        )}
        {view === 'settings' && <Settings data={data} dispatch={dispatch} />}
      </main>

      {saveFailed && (
        <p class="toast" role="alert">
          {"Couldn't save — try exporting a backup"}
        </p>
      )}

      <nav class="tabs" aria-label="Main">
        {tab('fridge', 'Fridge')}
        {tab('soon', 'Use soon', soonItems.length)}
        {tab('settings', 'Settings')}
      </nav>

      {openId && (
        <CompartmentSheet
          key={openId}
          compartmentId={openId}
          items={data.items.filter((item) => item.compartment === openId)}
          today={today}
          soonDays={soonDays}
          dispatch={dispatch}
          onClose={closeSheet}
        />
      )}
    </div>
  );
};
```

- [ ] **Step 4: Run tests**

Run: `pnpm test`
Expected: all pass.

- [ ] **Step 5: Write the styles**

`src/styles.css`:

```css
:root {
  --bg: #fff7f0;
  --ink: #4a3b47;
  --ink-soft: #85747f;
  --outline: #4a3b47;
  --fridge: #bfe8d8;
  --fridge-shade: #a6dcc8;
  --interior: #fffdf6;
  --shelf: #e6f4ff;
  --drawer: #dcefff;
  --pink: #ffc7d6;
  --cheek: #ff9fb8;
  --butter: #ffe9a8;
  --white: #ffffff;
  --expired: #d93a40;
  --expired-bg: #ffe1e1;
  --soon: #9a6512;
  --soon-bg: #fff0c2;
  --ok: #2f7d4f;
  --ok-bg: #e3f5ea;
  --radius: 18px;
  font-family: ui-rounded, 'SF Pro Rounded', system-ui, -apple-system, sans-serif;
  color: var(--ink);
  background: var(--bg);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--bg);
  overflow-x: hidden;
  -webkit-tap-highlight-color: transparent;
}

button,
input,
select {
  font: inherit;
  color: inherit;
}

input,
select {
  font-size: 16px;
}

button {
  cursor: pointer;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

/* Layout */
.app {
  min-height: 100dvh;
  padding: env(safe-area-inset-top) 16px 0;
}

.app__main {
  max-width: 480px;
  margin: 0 auto;
  padding: 8px 0 calc(96px + env(safe-area-inset-bottom));
}

.page-title {
  margin: 8px 0 16px;
  font-size: 24px;
  text-align: center;
}

.empty,
.hint {
  color: var(--ink-soft);
}

.empty {
  padding: 16px 0;
  text-align: center;
}

/* Tabs */
.tabs {
  position: fixed;
  inset: auto 0 0 0;
  display: flex;
  gap: 8px;
  padding: 8px 16px calc(8px + env(safe-area-inset-bottom));
  background: var(--white);
  border-top: 3px solid var(--outline);
}

.tabs button {
  flex: 1;
  padding: 10px 4px;
  border: 0;
  border-radius: 12px;
  background: none;
  color: var(--ink-soft);
  font-weight: 700;
}

.tabs button[aria-current='page'] {
  background: var(--pink);
  color: var(--ink);
}

.tabs__count {
  display: inline-block;
  min-width: 22px;
  margin-left: 4px;
  padding: 0 6px;
  border-radius: 11px;
  background: var(--expired);
  color: var(--white);
  font-size: 13px;
}

/* Fridge */
.fridge {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: min(100%, 320px);
  margin: 0 auto;
  perspective: 1200px;
}

.cabinet {
  position: relative;
  border: 3px solid var(--outline);
  background: var(--fridge-shade);
}

.cabinet--fridge {
  height: 340px;
  border-radius: 32px 32px var(--radius) var(--radius);
}

.cabinet--freezer {
  height: 230px;
  border-radius: var(--radius) var(--radius) 32px 32px;
}

.cabinet__interior {
  position: absolute;
  inset: 8px;
  display: flex;
  gap: 8px;
  padding: 8px;
  border-radius: 14px;
  background: var(--interior);
}

.cabinet--freezer .cabinet__interior {
  flex-direction: column;
}

.cabinet__door {
  position: absolute;
  inset: -3px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 3px solid var(--outline);
  border-radius: inherit;
  background: var(--fridge);
  transform-origin: left center;
  transition: transform 0.6s cubic-bezier(0.3, 1.3, 0.5, 1);
  z-index: 1;
}

.cabinet__door::after {
  content: '';
  position: absolute;
  top: 50%;
  right: 16px;
  width: 12px;
  height: 64px;
  margin-top: -32px;
  border: 3px solid var(--outline);
  border-radius: 8px;
  background: var(--white);
}

.cabinet--open .cabinet__door {
  transform: rotateY(-105deg);
}

.cabinet__badge {
  position: absolute;
  top: 14px;
  right: 14px;
  display: grid;
  place-items: center;
  min-width: 32px;
  height: 32px;
  padding: 0 6px;
  border: 3px solid var(--outline);
  border-radius: 16px;
  background: var(--expired);
  color: var(--white);
  font-weight: 800;
}

.face {
  width: 55%;
  fill: none;
  stroke: var(--outline);
  stroke-width: 5;
  stroke-linecap: round;
}

.face__eye {
  fill: var(--outline);
  stroke: none;
}

.face__shine {
  fill: var(--white);
  stroke: none;
}

.face__cheek {
  fill: var(--cheek);
  stroke: none;
}

.fridge__shelves {
  display: flex;
  flex: 3;
  flex-direction: column;
  gap: 8px;
}

.compartment {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 8px 12px;
  border: 2.5px solid var(--outline);
  border-radius: 12px;
  background: var(--shelf);
  font-weight: 700;
  text-align: left;
}

.compartment--door {
  flex-direction: column;
  justify-content: center;
  background: var(--butter);
  text-align: center;
}

.compartment--drawer {
  background: var(--drawer);
}

.compartment__count {
  display: grid;
  place-items: center;
  min-width: 28px;
  height: 28px;
  border: 2px solid var(--outline);
  border-radius: 14px;
  background: var(--white);
  font-size: 14px;
}

.fridge__feet {
  display: flex;
  justify-content: space-between;
  padding: 0 32px;
}

.fridge__feet span {
  width: 28px;
  height: 10px;
  border-radius: 0 0 8px 8px;
  background: var(--outline);
}

/* Sheet */
.sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgb(74 59 71 / 0.35);
}

.sheet {
  width: 100%;
  max-width: 520px;
  max-height: 85dvh;
  overflow-y: auto;
  padding: 16px 16px calc(16px + env(safe-area-inset-bottom));
  border-top: 3px solid var(--outline);
  border-radius: 24px 24px 0 0;
  background: var(--white);
  animation: sheet-up 0.25s ease-out;
}

@keyframes sheet-up {
  from {
    transform: translateY(100%);
  }
}

.sheet__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sheet__header h2 {
  margin: 0;
}

.icon-button {
  width: 44px;
  height: 44px;
  border: 2.5px solid var(--outline);
  border-radius: 22px;
  background: var(--pink);
  font-size: 24px;
  line-height: 1;
}

/* Lists */
.item-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 12px 0;
  padding: 0;
  list-style: none;
}

.item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border: 2px solid var(--outline);
  border-radius: 14px;
}

.item-row__text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.item-row__name,
.soon-row__name {
  font-weight: 700;
  overflow-wrap: anywhere;
}

.item-row__qty,
.soon-row__where {
  color: var(--ink-soft);
  font-size: 14px;
}

.item-row__actions {
  display: flex;
  flex-shrink: 0;
  gap: 6px;
}

.item-row__actions button {
  min-height: 36px;
  padding: 6px 10px;
  border: 2px solid var(--outline);
  border-radius: 10px;
  background: var(--white);
  font-size: 14px;
}

.chip {
  align-self: flex-start;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
}

.chip--expired {
  background: var(--expired-bg);
  color: var(--expired);
}

.chip--soon {
  background: var(--soon-bg);
  color: var(--soon);
}

.chip--ok {
  background: var(--ok-bg);
  color: var(--ok);
}

.soon-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 4px 8px;
  width: 100%;
  padding: 12px;
  border: 2px solid var(--outline);
  border-radius: 14px;
  background: var(--white);
  text-align: left;
}

.soon-row--expired {
  background: var(--expired-bg);
}

.soon-row--soon {
  background: var(--soon-bg);
}

.soon-row__where {
  grid-column: 1;
}

.soon-row .chip {
  grid-column: 2;
  grid-row: 1 / span 2;
  align-self: center;
  background: var(--white);
}

/* Buttons and forms */
.primary,
.secondary {
  min-height: 48px;
  padding: 12px;
  border: 3px solid var(--outline);
  border-radius: 14px;
  font-weight: 700;
  text-align: center;
}

.primary {
  width: 100%;
  background: var(--fridge);
}

.primary:disabled {
  opacity: 0.5;
}

.secondary {
  background: var(--white);
}

.link {
  align-self: flex-start;
  padding: 0;
  border: 0;
  background: none;
  color: var(--ink-soft);
  text-decoration: underline;
}

.item-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
}

.item-form label,
.settings__card label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-weight: 700;
}

.item-form input,
.settings__card select {
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border: 2px solid var(--outline);
  border-radius: 12px;
  background: var(--white);
}

.optional {
  color: var(--ink-soft);
  font-weight: 400;
}

.item-form__actions {
  display: flex;
  gap: 8px;
}

.item-form__actions button {
  flex: 1;
}

/* Settings */
.settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settings__card {
  padding: 16px;
  border: 2px solid var(--outline);
  border-radius: 16px;
  background: var(--white);
}

.settings__card h2 {
  margin: 0 0 8px;
  font-size: 18px;
}

.settings__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.settings__buttons .secondary {
  flex: 1;
  display: block;
}

.message--error {
  color: var(--expired);
  font-weight: 700;
}

/* Toast */
.toast {
  position: fixed;
  right: 16px;
  bottom: calc(84px + env(safe-area-inset-bottom));
  left: 16px;
  z-index: 20;
  margin: 0;
  padding: 12px 16px;
  border: 3px solid var(--outline);
  border-radius: 14px;
  background: var(--expired);
  color: var(--white);
  font-weight: 700;
}

@media (prefers-reduced-motion: reduce) {
  .cabinet__door {
    transition: none;
  }

  .sheet {
    animation: none;
  }
}
```

- [ ] **Step 6: Check it by eye**

Run: `pnpm dev`, open the printed URL in a narrow browser window (about 390px wide). Check:
- The closed fridge-freezer has two smiling doors with handles and feet.
- Tapping the fridge door swings it open to show three shelves and a yellow door bin; tapping the freezer shows three drawers.
- Tapping a shelf slides up the sheet; adding, editing and removing work; the door badge and Use soon tab count update.
- Settings shows the picker, backup buttons and install hint.

Fix any layout problem in `styles.css` before continuing. Stop the dev server.

- [ ] **Step 7: Run tests and build**

Run: `pnpm test && pnpm build`
Expected: all pass; build succeeds.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: wire up the app shell, tabs and cute styling"
```

---

### Task 10: Make it an installable, offline PWA

**Files:**
- Create: `public/icon.svg`, `pwa-assets.config.ts`
- Modify: `vite.config.ts`

**Interfaces:**
- Consumes: the built app from Tasks 1–9.
- Produces: `dist/manifest.webmanifest`, `dist/sw.js`, generated icons (`pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`, `favicon.ico`) and their `<link>` tags injected into `dist/index.html`.

- [ ] **Step 1: Install the PWA plugins**

Run: `pnpm add -D vite-plugin-pwa@2.0.0 @vite-pwa/assets-generator@2.0.0`

If pnpm warns that build scripts were ignored (for example `sharp`), run `pnpm approve-builds` and approve them.

- [ ] **Step 2: Add the source icon**

`public/icon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#ffc7d6"/>
  <rect x="156" y="80" width="200" height="352" rx="40" fill="#bfe8d8" stroke="#4a3b47" stroke-width="14"/>
  <line x1="156" y1="300" x2="356" y2="300" stroke="#4a3b47" stroke-width="14"/>
  <rect x="316" y="132" width="16" height="64" rx="8" fill="#ffffff" stroke="#4a3b47" stroke-width="8"/>
  <rect x="316" y="330" width="16" height="56" rx="8" fill="#ffffff" stroke="#4a3b47" stroke-width="8"/>
  <circle cx="226" cy="196" r="12" fill="#4a3b47"/>
  <circle cx="286" cy="196" r="12" fill="#4a3b47"/>
  <ellipse cx="204" cy="228" rx="15" ry="9" fill="#ff9fb8"/>
  <ellipse cx="308" cy="228" rx="15" ry="9" fill="#ff9fb8"/>
  <path d="M236 226 q20 22 40 0" fill="none" stroke="#4a3b47" stroke-width="10" stroke-linecap="round"/>
</svg>
```

- [ ] **Step 3: Configure icon generation**

`pwa-assets.config.ts`:

```ts
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: minimal2023Preset,
  images: ['public/icon.svg'],
});
```

- [ ] **Step 4: Add the PWA plugin to Vite**

Replace `vite.config.ts` with:

```ts
/// <reference types="vitest/config" />
import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      pwaAssets: { config: true, overrideManifestIcons: true },
      manifest: {
        name: 'Fridge',
        short_name: 'Fridge',
        description: "Keep track of what's in the fridge and freezer.",
        lang: 'en-GB',
        theme_color: '#bfe8d8',
        background_color: '#fff7f0',
        display: 'standalone',
        orientation: 'portrait',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
```

- [ ] **Step 5: Build and inspect the output**

Run:

```bash
pnpm build
ls dist
cat dist/manifest.webmanifest
grep -o '<link[^>]*apple-touch-icon[^>]*>' dist/index.html
```

Expected:
- `dist` contains `sw.js`, `manifest.webmanifest`, `apple-touch-icon-180x180.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`.
- The manifest has `"name":"Fridge"`, `"display":"standalone"`, `"start_url"` and `"scope"` of `/`, and icons for 64, 192, 512 and maskable 512.
- `index.html` has an `apple-touch-icon` link.

Then run `BASE_PATH=/fridge-app/ pnpm build && cat dist/manifest.webmanifest` and confirm `start_url` and `scope` are `/fridge-app/` and asset URLs in `dist/index.html` start with `/fridge-app/`. Rebuild with `pnpm build` afterwards.

- [ ] **Step 6: Check offline behaviour**

Run `pnpm preview`, open the URL in Chrome, open DevTools → Application. Confirm the manifest shows the Fridge icon and the service worker is activated. Tick Network → Offline and reload: the app still loads. Stop the preview server.

- [ ] **Step 7: Run tests**

Run: `pnpm test`
Expected: all pass (the PWA plugin does not affect Vitest).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: make the app an installable offline PWA with icons"
```

---

### Task 11: End-to-end test, deployment workflow and README

**Files:**
- Create: `playwright.config.ts`, `e2e/fridge.spec.ts`, `.github/workflows/deploy.yml`, `README.md`

**Interfaces:**
- Consumes: the built app and the accessible names from Tasks 5–9 ("Open the fridge", "Top shelf, N items", "Add item", "Name", "Expiry date (optional)", "Add", "Close", "Use soon").
- Produces: `pnpm e2e` (Playwright, iPhone 13 WebKit) and a GitHub Actions workflow that tests, builds with `BASE_PATH=/<repo>/` and deploys to GitHub Pages.

- [ ] **Step 1: Install Playwright**

Run:

```bash
pnpm add -D @playwright/test@1.64.0
pnpm exec playwright install webkit
```

- [ ] **Step 2: Configure Playwright**

`playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://localhost:4173' },
  projects: [{ name: 'iphone', use: { ...devices['iPhone 13'] } }],
  webServer: {
    command: 'pnpm build && pnpm preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 3: Write the smoke test**

`e2e/fridge.spec.ts`:

```ts
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
```

- [ ] **Step 4: Run it**

Run: `pnpm e2e`
Expected: 1 passed. If the door intercepts the "Top shelf" click, the open door's `transform` is not moving it clear of the interior; fix the CSS in `styles.css` (the door must rotate past 90°), not the test.

- [ ] **Step 5: Add the deployment workflow**

`.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v5
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
      - run: pnpm exec playwright install --with-deps webkit
      - run: pnpm e2e
      - run: pnpm build
        env:
          BASE_PATH: /${{ github.event.repository.name }}/
      - uses: actions/upload-pages-artifact@v4
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 6: Write the README**

`README.md`:

````markdown
# Fridge

A cute fridge-freezer for keeping track of what's in each shelf, door and drawer, and what needs using soon. Works offline and installs to an iPhone home screen. Data is stored on the device only; use Settings → Export backup to keep a copy.

## Develop

```bash
pnpm install
pnpm dev        # local dev server
pnpm test       # unit and component tests
pnpm e2e        # Playwright smoke test (iPhone WebKit)
pnpm build      # production build in dist/
```

## Deploy (free, GitHub Pages)

1. Create a GitHub repository called `fridge-app` and push `main` to it.
2. In the repository, go to Settings → Pages and set Source to "GitHub Actions".
3. Every push to `main` runs the tests and publishes to `https://<your-username>.github.io/fridge-app/`.

## Install on an iPhone

1. Open the site in Safari.
2. Tap Share, then Add to Home Screen.
3. Open Fridge from the home screen. Installing also stops Safari clearing the data after a week of not visiting.
````

- [ ] **Step 7: Validate the workflow file and run everything once more**

Run:

```bash
pnpm dlx @action-validator/cli .github/workflows/deploy.yml || echo "validator unavailable — review the YAML by eye"
pnpm test && pnpm typecheck && pnpm e2e
```

Expected: workflow validates (or reviewed by eye); all tests pass.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: add e2e smoke test, GitHub Pages deploy and README"
```
