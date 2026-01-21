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
        'src/__tests__/**', // Test utilities and mocks
        'src/locales/**/*.json',
        'src/services/index.ts',
        // Files marked with /* istanbul ignore file */
        'src/services/community-preset-service.ts',
        'src/services/hybrid-preset-service.ts',
        'src/services/preset-submission-service.ts',
        'src/services/pricing-mixin.ts', // Mixin used by components
        'src/components/add-to-collection-menu.ts',
        'src/components/collection-manager-modal.ts',
        'src/components/preset-edit-form.ts',
        'src/components/my-submissions-panel.ts',
        'src/components/dye-comparison-chart.ts',
        'src/components/welcome-modal.ts',
        'src/shared/browser-api-types.ts',
        'src/shared/types.ts', // Type definitions only
        // Complex tool components - covered by E2E tests in /e2e/
        'src/components/accessibility-tool.ts', // e2e/accessibility-checker.spec.ts
        'src/components/budget-tool.ts', // e2e/budget-tool.spec.ts
        'src/components/comparison-tool.ts', // e2e/dye-comparison.spec.ts
        'src/components/extractor-tool.ts', // e2e/extractor-tool.spec.ts
        'src/components/gradient-tool.ts', // e2e/gradient-builder.spec.ts
        'src/components/harmony-tool.ts', // e2e/harmony-generator.spec.ts
        'src/components/mixer-tool.ts', // e2e/dye-mixer.spec.ts
        'src/components/swatch-tool.ts', // Complex tool similar to others
        // V4 complex components - better tested via E2E
        'src/components/v4/config-sidebar.ts', // Complex settings panel
        'src/components/v4/preset-tool.ts', // Full tool component
        'src/components/v4/v4-layout-shell.ts', // Layout shell
        'src/components/v4/v4-color-wheel.ts', // Canvas-based component
        'src/components/v4/dye-palette-drawer.ts', // Complex drawer
        // Other complex interactive components
        'src/components/image-zoom-controller.ts', // Complex interaction
        'src/components/palette-exporter.ts', // File operations
        'src/components/preset-submission-form.ts', // Complex form
        'src/components/auth-button.ts', // OAuth flow
        'src/components/featured-presets-section.ts', // API integration
        'src/components/shortcuts-panel.ts', // Simple modal display
        'src/components/recent-colors-panel.ts', // Simple panel
        'src/components/mobile-bottom-nav.ts', // Mobile-only navigation
        'src/components/dye-preview-overlay.ts', // Hover preview
        // V4 remaining components
        'src/components/v4/result-card.ts', // Complex interactive card
        'src/components/v4/display-options-v4.ts', // Settings component
        'src/components/v4/theme-modal.ts', // Modal component
        'src/components/v4/language-modal.ts', // Modal component
        'src/components/v4/preset-card.ts', // Complex card
        'src/components/v4/preset-detail.ts', // Complex detail view
        'src/components/v4/tool-banner.ts', // Banner component
        'src/components/v4/v4-app-header.ts', // Header component
        'src/components/v4/base-lit-component.ts', // Base class with browser APIs
        'src/components/v4/glass-panel.ts', // Lit component - E2E tested
        'src/components/v4/range-slider-v4.ts', // Lit component - E2E tested
        'src/components/v4/toggle-switch-v4.ts', // Lit component - E2E tested
        'src/components/v4/share-button.ts', // Complex share UI with browser APIs
        // Layout and complex UI components
        'src/components/app-layout.ts', // Main app layout - E2E tested
        'src/components/v4-layout.ts', // V4 layout shell
        'src/components/dye-action-dropdown.ts', // Complex dropdown menu
        'src/components/saved-palettes-modal.ts', // Complex modal with storage
        'src/components/image-upload-display.ts', // File upload component
        'src/components/camera-preview-modal.ts', // Camera API component
        'src/components/dye-selector.ts', // Complex multi-select - E2E tested
        'src/components/market-board.ts', // API integration component
        'src/components/changelog-modal.ts', // Modal with version logic
        'src/components/toast-container.ts', // Animation-based component
        'src/components/dye-grid.ts', // Complex grid with many branches
        // Services better suited for E2E testing
        'src/services/share-service.ts', // URL sharing/analytics - E2E tested
        'src/services/tool-panel-builders.ts', // UI helper functions - E2E tested
      ],
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
    server: {
      deps: {
        inline: ['@xivdyetools/core'],
      },
    },
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
