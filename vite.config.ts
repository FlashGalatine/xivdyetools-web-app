import { defineConfig } from 'vite'
import { resolve } from 'path'
import { asyncCss } from './vite-plugin-async-css'
import { changelogParser } from './vite-plugin-changelog-parser'
import pkg from './package.json'

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  root: 'src',
  base: '/',
  publicDir: '../public',

  build: {
    outDir: '../dist',
    minify: 'esbuild',
    sourcemap: true,
    target: 'ES2020',
    reportCompressedSize: true,
    emptyOutDir: true,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Extract vendor dependencies with higher priority
          if (id.includes('node_modules')) {
            // Separate Lit framework for better caching
            if (id.includes('lit') || id.includes('@lit')) {
              return 'vendor-lit';
            }
            // All other vendors (Tailwind, utilities, etc.)
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          }

          // V3 tools are dynamically imported in v3-layout.ts
          // Vite automatically creates separate chunks for them

          // Modal chunks (lazy-loaded, only shown once per user typically)
          if (
            id.includes('src/components/welcome-modal.ts') ||
            id.includes('src/components/changelog-modal.ts')
          ) {
            return 'modals';
          }

          // Note: Shared services stay in main bundle (BaseComponent, ThemeSwitcher, etc.)
          // These are needed immediately and used by all tools, so main bundle is optimal
          // Services: DyeService, ColorService, APIService, ThemeService, StorageService
        },
      },
    },
  },

  server: {
    port: 5173,
    open: true,
    strictPort: false,
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@services': resolve(__dirname, './src/services'),
      '@shared': resolve(__dirname, './src/shared'),
      '@apps': resolve(__dirname, './src/apps'),
      '@data': resolve(__dirname, './src/data'),
      '@assets': resolve(__dirname, './assets'),
      '@mockups': resolve(__dirname, './src/mockups'),
    },
  },

  css: {
    postcss: './postcss.config.js',
  },

  plugins: [
    asyncCss(),
    changelogParser(),
  ],
})
