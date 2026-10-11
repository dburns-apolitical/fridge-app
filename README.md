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
