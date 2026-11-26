import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: 'https://rnvsfli.vercel.app',
  build: {
    inlineStylesheets: 'auto',
  },
  compressHTML: true,
});
