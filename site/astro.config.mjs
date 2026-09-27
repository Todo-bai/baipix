import { defineConfig } from 'astro/config';

// Served at https://baipix.app. SITE_URL and BASE_PATH let it be built for another address
// (for example BASE_PATH=/baipix/ to serve it from a subfolder).
export default defineConfig({
  site: process.env.SITE_URL ?? 'https://baipix.app',
  base: process.env.BASE_PATH ?? '/',
  // The site renders the gallery with the editor's own engine (../src) from ../gallery.
  vite: { server: { fs: { allow: ['..'] } } },
});
