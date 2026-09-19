// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://personal-site.dezhengchang.workers.dev',
  output: 'static',
  vite: {
    plugins: [tailwindcss()],
  },
});
