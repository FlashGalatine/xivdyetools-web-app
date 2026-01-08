/**
 * XIV Dye Tools - Color Display Component Tests
 *
 * Tests for the color display UI component showing dye information
 *
 * @module components/__tests__/color-display.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ColorDisplay } from '../color-display';
import { createTestContainer, cleanupTestContainer } from './test-utils';
import type { Dye } from '@shared/types';

// Mock dye data - use unique IDs to avoid conflicts with real dye database
const mockDye: Dye = {
  id: 9999,
  itemID: 99999,
  stainID: null,
  name: 'Jet Black',
  hex: '#2B2B2B',
  rgb: { r: 43, g: 43, b: 43 },
  hsv: { h: 0, s: 0, v: 17 },
  category: 'Black',
  acquisition: 'Market Board',
  cost: 500,
  isMetallic: false,
  isPastel: false,
  isDark: true,
  isCosmic: false,
};

const mockComparisonDye: Dye = {
  id: 9998,
  itemID: 99998,
  stainID: null,
  name: 'Pure White',
  hex: '#FFFFFF',
  rgb: { r: 255, g: 255, b: 255 },
  hsv: { h: 0, s: 0, v: 100 },
  category: 'White',
  acquisition: 'Market Board',
  cost: 500,
  isMetallic: false,
  isPastel: false,
  isDark: false,
  isCosmic: false,
};

describe('ColorDisplay', () => {
  let container: HTMLElement;
  let component: ColorDisplay;

  beforeEach(() => {
    vi.clearAllMocks();
    container = createTestContainer();
  });

  afterEach(() => {
    if (component) {
      component.destroy();
    }
    cleanupTestContainer(container);
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Rendering - Empty State
  // ==========================================================================

  describe('rendering - empty state', () => {
    it('should render empty state when no dye is set', () => {
      component = new ColorDisplay(container);
      component.init();

      expect(container.textContent).toContain('No color selected');
    });

    it('should render with dashed border in empty state', () => {
      component = new ColorDisplay(container);
      component.init();

      const emptyState = container.querySelector('.border-dashed');
      expect(emptyState).not.toBeNull();
    });
  });

  // ==========================================================================
  // Rendering - With Dye
  // ==========================================================================

  describe('rendering - with dye', () => {
    it('should render dye name', () => {
      component = new ColorDisplay(container);
      component.init();
      component.setDye(mockDye);

      expect(container.textContent).toContain('Jet Black');
    });

    it('should render color swatch with correct background', () => {
      component = new ColorDisplay(container);
      component.init();
      component.setDye(mockDye);

      const swatch = container.querySelector('[style*="background-color"]');
      expect(swatch).not.toBeNull();
      expect(swatch?.getAttribute('style')).toContain('#2B2B2B');
    });

    it('should render hex value by default', () => {
      component = new ColorDisplay(container);
      component.init();
      component.setDye(mockDye);

      expect(container.textContent).toContain('#2B2B2B');
    });

    it('should render RGB values by default', () => {
      component = new ColorDisplay(container);
      component.init();
      component.setDye(mockDye);

      expect(container.textContent).toContain('43, 43, 43');
    });

    it('should render HSV values by default', () => {
      component = new ColorDisplay(container);
      component.init();
      component.setDye(mockDye);

      // Check for H, S, V labels
      expect(container.textContent).toContain('H');
      expect(container.textContent).toContain('S');
      expect(container.textContent).toContain('V');
    });

    it('should render color properties section', () => {
      component = new ColorDisplay(container);
      component.init();
      component.setDye(mockDye);

      expect(container.textContent).toContain('Color Properties');
      expect(container.textContent).toContain('Category');
      expect(container.textContent).toContain('Black');
    });

    it('should render accessibility section by default', () => {
      component = new ColorDisplay(container);
      component.init();
      component.setDye(mockDye);

      expect(container.textContent).toContain('Accessibility');
      expect(container.textContent).toContain('Perceived Luminance');
    });
  });

  // ==========================================================================
  // Options
  // ==========================================================================

  describe('options', () => {
    it('should hide hex when showHex is false', () => {
      component = new ColorDisplay(container, { showHex: false });
      component.init();
      component.setDye(mockDye);

      // Hex should not be in the info grid (but may appear in comparison metrics)
      const hexLabels = container.querySelectorAll('.text-xs');
      let hasHexLabel = false;
      hexLabels.forEach((el) => {
        if (el.textContent === 'Hex') hasHexLabel = true;
      });
      expect(hasHexLabel).toBe(false);
    });

    it('should hide RGB when showRGB is false', () => {
      component = new ColorDisplay(container, { showRGB: false });
      component.init();
      component.setDye(mockDye);

      const rgbLabels = container.querySelectorAll('.text-xs');
      let hasRGBLabel = false;
      rgbLabels.forEach((el) => {
        if (el.textContent === 'RGB') hasRGBLabel = true;
      });
      expect(hasRGBLabel).toBe(false);
    });

    it('should hide accessibility when showAccessibility is false', () => {
      component = new ColorDisplay(container, { showAccessibility: false });
      component.init();
      component.setDye(mockDye);

      expect(container.textContent).not.toContain('Perceived Luminance');
    });
  });

  // ==========================================================================
  // Comparison Mode
  // ==========================================================================

  describe('comparison mode', () => {
    it('should render comparison dye when set', () => {
      component = new ColorDisplay(container);
      component.init();
      component.setDye(mockDye);
      component.setComparisonDye(mockComparisonDye);

      expect(container.textContent).toContain('Jet Black');
      expect(container.textContent).toContain('Pure White');
    });

    it('should render comparison metrics section', () => {
      component = new ColorDisplay(container);
      component.init();
      component.setDye(mockDye);
      component.setComparisonDye(mockComparisonDye);

      expect(container.textContent).toContain('Color Comparison');
      expect(container.textContent).toContain('Color Distance');
    });

    it('should render contrast ratio', () => {
      component = new ColorDisplay(container);
      component.init();
      component.setDye(mockDye);
      component.setComparisonDye(mockComparisonDye);

      expect(container.textContent).toContain('Contrast Ratio');
    });

    it('should render WCAG compliance information', () => {
      component = new ColorDisplay(container);
      component.init();
      component.setDye(mockDye);
      component.setComparisonDye(mockComparisonDye);

      expect(container.textContent).toContain('WCAG AA');
      expect(container.textContent).toContain('WCAG AAA');
    });

    it('should show Pass for high contrast colors', () => {
      component = new ColorDisplay(container);
      component.init();
      component.setDye(mockDye); // Very dark
      component.setComparisonDye(mockComparisonDye); // White

      // Black and white should pass WCAG
      expect(container.textContent).toContain('✓ Pass');
    });

    it('should accept comparison dye via constructor options', () => {
      component = new ColorDisplay(container, { comparisonDye: mockComparisonDye });
      component.init();
      component.setDye(mockDye);

      expect(container.textContent).toContain('Pure White');
    });
  });

  // ==========================================================================
  // State Management
  // ==========================================================================

  describe('state management', () => {
    it('should return current dye via getDye', () => {
      component = new ColorDisplay(container);
      component.init();
      component.setDye(mockDye);

      expect(component.getDye()).toEqual(mockDye);
    });

    it('should return null when no dye is set', () => {
      component = new ColorDisplay(container);
      component.init();

      expect(component.getDye()).toBeNull();
    });

    it('should update display when setDye is called', () => {
      component = new ColorDisplay(container);
      component.init();

      expect(container.textContent).toContain('No color selected');

      component.setDye(mockDye);

      expect(container.textContent).not.toContain('No color selected');
      expect(container.textContent).toContain('Jet Black');
    });

    it('should return correct state via getState', () => {
      component = new ColorDisplay(container);
      component.init();
      component.setDye(mockDye);

      const state = (
        component as unknown as { getState: () => Record<string, unknown> }
      ).getState();

      expect(state).toHaveProperty('displayDye');
      expect(state.displayDye).toEqual(mockDye);
    });
  });

  // ==========================================================================
  // Copy Functionality
  // ==========================================================================

  describe('copy functionality', () => {
    it('should have data-copy attribute on hex value', () => {
      component = new ColorDisplay(container);
      component.init();
      component.setDye(mockDye);

      const copyElement = container.querySelector('[data-copy]');
      expect(copyElement).not.toBeNull();
      expect(copyElement?.getAttribute('data-copy')).toBe('#2B2B2B');
    });

    it('should show "Click to copy" tooltip', () => {
      component = new ColorDisplay(container);
      component.init();
      component.setDye(mockDye);

      const copyElement = container.querySelector('[data-copy]');
      expect(copyElement?.getAttribute('title')).toBe('Click to copy');
    });
  });

  // ==========================================================================
  // Property Display
  // ==========================================================================

  describe('property display', () => {
    it('should display acquisition method', () => {
      component = new ColorDisplay(container);
      component.init();
      component.setDye(mockDye);

      expect(container.textContent).toContain('Acquisition');
      expect(container.textContent).toContain('Market Board');
    });

    it('should display item ID', () => {
      component = new ColorDisplay(container);
      component.init();
      component.setDye(mockDye);

      expect(container.textContent).toContain('Item ID');
      expect(container.textContent).toContain('99999');
    });

    it('should display cost when available', () => {
      component = new ColorDisplay(container);
      component.init();
      component.setDye(mockDye);

      expect(container.textContent).toContain('Cost');
      expect(container.textContent).toContain('500');
    });

    it('should display N/A when cost is not available', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dyeWithoutCost = { ...mockDye, cost: undefined } as any;
      component = new ColorDisplay(container);
      component.init();
      component.setDye(dyeWithoutCost);

      expect(container.textContent).toContain('N/A');
    });

    it('should display brightness percentage', () => {
      component = new ColorDisplay(container);
      component.init();
      component.setDye(mockDye);

      expect(container.textContent).toContain('Brightness');
      expect(container.textContent).toContain('17%');
    });

    it('should display saturation percentage', () => {
      component = new ColorDisplay(container);
      component.init();
      component.setDye(mockDye);

      expect(container.textContent).toContain('Saturation');
      expect(container.textContent).toContain('0%');
    });
  });

  // ==========================================================================
  // Accessibility Information
  // ==========================================================================

  describe('accessibility information', () => {
    it('should display perceived luminance', () => {
      component = new ColorDisplay(container);
      component.init();
      component.setDye(mockDye);

      expect(container.textContent).toContain('Perceived Luminance');
    });

    it('should display brightness classification', () => {
      component = new ColorDisplay(container);
      component.init();
      component.setDye(mockDye);

      expect(container.textContent).toContain('Brightness Classification');
      // Jet Black should be classified as Dark
      expect(container.textContent).toContain('Dark');
    });

    it('should display optimal text color', () => {
      component = new ColorDisplay(container);
      component.init();
      component.setDye(mockDye);

      expect(container.textContent).toContain('Optimal Text Color');
    });
  });

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  describe('cleanup', () => {
    it('should clean up without error', () => {
      component = new ColorDisplay(container);
      component.init();
      component.setDye(mockDye);

      expect(() => component.destroy()).not.toThrow();
    });

    it('should clear comparison dye', () => {
      component = new ColorDisplay(container);
      component.init();
      component.setDye(mockDye);
      component.setComparisonDye(mockComparisonDye);

      expect(container.textContent).toContain('Pure White');

      component.setComparisonDye(null);

      expect(container.textContent).not.toContain('Pure White');
    });
  });
});
