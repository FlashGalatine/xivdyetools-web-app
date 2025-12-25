import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './node_modules/.cache/vitest-coverage',
      clean: true,
      exclude: [
        'node_modules/',
        'dist/',
        'src/__tests__/setup.ts',
        'src/locales/**/*.json',
        'src/services/index.ts',
        // Files marked with /* istanbul ignore file */
        'src/services/community-preset-service.ts',
        'src/services/hybrid-preset-service.ts',
        'src/services/preset-submission-service.ts',
        'src/components/add-to-collection-menu.ts',
        'src/components/collection-manager-modal.ts',
        'src/components/preset-edit-form.ts',
        'src/components/my-submissions-panel.ts',
        'src/components/dye-comparison-chart.ts',
        'src/components/welcome-modal.ts',
        'src/shared/browser-api-types.ts',
      ],
      lines: 80,
      functions: 80,
      branches: 77,
      statements: 80,
    },
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@services': resolve(__dirname, './src/services'),
      '@shared': resolve(__dirname, './src/shared'),
      '@apps': resolve(__dirname, './src/apps'),
      '@data': resolve(__dirname, './src/data'),
      'virtual:changelog': resolve(__dirname, './src/__tests__/mocks/virtual-changelog.ts'),
    },
  },
})
