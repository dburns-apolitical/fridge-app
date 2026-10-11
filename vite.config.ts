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
        // webmanifest is deliberately excluded: vite-plugin-pwa already precaches the manifest, and a duplicate entry with a different revision breaks service-worker install.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
