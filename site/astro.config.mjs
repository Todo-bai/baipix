import { defineConfig } from 'astro/config';

// baipix.app from the start. BASE_PATH lets it be served from a subpath meanwhile (e.g. GitHub Pages).
export default defineConfig({
  site: 'https://baipix.app',
  base: process.env.BASE_PATH ?? '/',
  // The site renders the gallery with the editor's own engine (../src) from ../gallery.
  vite: { server: { fs: { allow: ['..'] } } },
});
