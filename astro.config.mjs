// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

// https://astro.build/config
// Served from GitHub Pages as a project site: https://new2codinglol.github.io/meridian
export default defineConfig({
  site: 'https://new2codinglol.github.io',
  base: '/meridian/',
  integrations: [react()]
});