import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://mansoorameen.netlify.app',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
});
