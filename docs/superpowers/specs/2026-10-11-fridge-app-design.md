# Fridge App — Design

Date: 2026-10-11

## Purpose

A small, cute web app that lets one person (Dec's partner) keep track of what is in the fridge and freezer, and see at a glance what has expired or needs using soon. It must install to an iPhone home screen and cost nothing to host.

## Scope

In scope:

- One cartoon fridge-freezer that opens on tap.
- Fridge: three shelves and one door compartment. Freezer: three drawers. Seven compartments in total, fixed.
- Per-compartment item list with add, edit and remove.
- Optional expiry date per item, and a "Use soon" view of expired and soon-to-expire items.
- Installable, offline-capable PWA.
- JSON export/import backup and a configurable "soon" threshold.

Out of scope:

- Sharing or syncing between devices, accounts, login.
- Pictures of food items, barcode scanning, notifications.
- User-configurable compartments.

## Stack

- Vite + Preact + TypeScript.
- `vite-plugin-pwa` for the web app manifest and service worker (precache all assets; app works fully offline).
- No UI framework; hand-written CSS with CSS custom properties for the palette.
- Vitest for unit tests, Playwright for one end-to-end smoke test.
- Hosted on GitHub Pages, deployed by a GitHub Actions workflow on push to `main`.

## Data model

```ts
type TCompartmentId =
  | 'fridge-shelf-1' | 'fridge-shelf-2' | 'fridge-shelf-3' | 'fridge-door'
  | 'freezer-drawer-1' | 'freezer-drawer-2' | 'freezer-drawer-3';

interface IItem {
  id: string;            // crypto.randomUUID()
  name: string;          // required, trimmed, non-empty
  quantity?: string;     // free text, e.g. "half a tub"
  expiry?: string;       // ISO date 'YYYY-MM-DD', no time
  compartment: TCompartmentId;
  addedAt: string;       // ISO timestamp
}

interface ISettings {
  soonDays: number;      // default 3, range 0–30
}

interface IAppData {
  version: 1;
  items: IItem[];
  settings: ISettings;
}
```

Compartment display names and order live in one constant (`compartments.ts`): "Top shelf", "Middle shelf", "Bottom shelf", "Door", "Top drawer", "Middle drawer", "Bottom drawer".

## Units

- `storage.ts` — `load(): IAppData` and `save(data)`. Backed by `localStorage` under one key. Validates on load; corrupt or missing data falls back to defaults without throwing. This is the only module that touches persistence, so it can later be swapped for a remote store.
- `expiry.ts` — pure functions. `expiryStatus(item, today, soonDays): 'expired' | 'soon' | 'ok' | 'none'`. An item expires at the end of its expiry day: expiry < today is expired; today ≤ expiry ≤ today + soonDays is soon. `getUseSoonItems(items, today, soonDays)` returns expired and soon items sorted by expiry ascending.
- `backup.ts` — `exportJson(data): string` and `importJson(text): IAppData`, which throws a readable error on invalid input. Import replaces all data after a confirm step in the UI.
- `store.ts` — a Preact hook (`useFridge`) holding `IAppData` in state, exposing `addItem`, `updateItem`, `removeItem`, `setSettings`, `replaceAll`, and saving through `storage.ts` on every change.
- UI components:
  - `Fridge.tsx` — the fridge-freezer, drawn with CSS shapes and inline SVG faces on the doors. Tracks which door is open. Closed doors show a cute face; the fridge door shows a badge with the count of expired + soon items. Open doors reveal compartment hit areas, each with an accessible name and an item count.
  - `CompartmentSheet.tsx` — bottom sheet listing items in one compartment, each showing name, quantity and an expiry chip coloured by status. Add/edit uses an inline form with name, quantity and a native date input.
  - `UseSoon.tsx` — list from `getUseSoonItems`, showing compartment name, with expired items in red and soon items in amber. Tapping an item opens its compartment.
  - `Settings.tsx` — soon-days picker (a select of 0–30 days, so out-of-range values are impossible), export (offers the dated JSON file through the iOS share sheet when available, otherwise downloads it), import (file input).
  - `App.tsx` — simple view switching between Fridge, Use soon and Settings via a bottom tab bar. No router.

## Visual design

Pastel palette (mint fridge body, cream interior, soft pink and butter accents), rounded corners, thick soft outlines, a smiling face on each closed door. Doors swing open with a CSS 3D rotate transition (`prefers-reduced-motion` turns the animation off). Phone-first layout sized for iPhone widths, respecting safe-area insets. First version aims for "cute and clean"; illustration polish can follow.

## PWA

- Manifest: name "Fridge", standalone display, portrait, theme colour matching the fridge, 192/512 icons plus a 180px `apple-touch-icon`.
- `apple-mobile-web-app-capable` and status-bar meta tags for iOS.
- Service worker auto-updates on next launch.
- Settings shows a one-line hint on how to add to the home screen when not running standalone. Installing also protects data from Safari's storage eviction for sites not used for 7 days.

## Error handling

- Storage read failure or invalid data: start empty with defaults, show nothing alarming.
- Storage write failure (e.g. quota): show a small toast "Couldn't save — try exporting a backup".
- Invalid import file: show the error message from `importJson`, leave data untouched.
- Empty item name: save button disabled.

## Testing

- Vitest: `expiry.ts` (boundaries: yesterday, today, today + soonDays, today + soonDays + 1, no expiry), `storage.ts` (round trip, corrupt data fallback), `backup.ts` (round trip, invalid JSON, wrong shape).
- Playwright (mobile viewport): open fridge, open a shelf, add an item with an expiry of tomorrow, see it in "Use soon", reload and confirm it persisted.

## Deployment

GitHub Actions workflow builds and publishes `dist/` to GitHub Pages. Vite `base` is set from the repository name. Needs a GitHub repository created by Dec; nothing else costs money.
