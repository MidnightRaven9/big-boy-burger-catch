import { defineConfig, mergeConfig } from 'vite';
import baseConfig from './vite.config';

// Build for static hosting / WebView bundling: all paths are relative and the
// bundle is a classic script so it also runs from file:// inside an APK.
export default mergeConfig(
  baseConfig,
  defineConfig({
    base: './',
    build: {
      outDir: 'dist-standalone',
      sourcemap: false,
      rollupOptions: {
        output: {
          format: 'iife',
          inlineDynamicImports: true,
        },
      },
    },
  }),
);
