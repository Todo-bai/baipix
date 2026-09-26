import { defineConfig } from 'astro/config';

// Made for baipix.app. SITE_URL and BASE_PATH let it be served elsewhere meanwhile
// (GitHub Pages: https://todo-bai.github.io + /baipix/).
export default defineConfig({
  site: process.env.SITE_URL ?? 'https://baipix.app',
  base: process.env.BASE_PATH ?? '/',
  // The site renders the gallery with the editor's own engine (../src) from ../gallery.
  vite: { server: { fs: { allow: ['..'] } } },
});
