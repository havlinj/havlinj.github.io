// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://janhavlin.com',
  integrations: [sitemap()],
  /* Astro 7 default is 'jsx'; keep v6 HTML-aware spacing for text-heavy layout. */
  compressHTML: true,
});
