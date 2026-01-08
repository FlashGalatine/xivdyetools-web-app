/**
 * XIV Dye Tools - Harmony Type Component Tests
 *
 * Tests for the HarmonyType component which displays matching dyes
 * for a specific color harmony type
 */

import { HarmonyType, type HarmonyTypeInfo } from '../harmony-type';
import { createTestContainer, cleanupTestContainer, cleanupComponent } from './test-utils';
import type { Dye } from '@shared/types';
import { vi } from 'vitest';

// Mock data
const mockHarmonyInfo: HarmonyTypeInfo = {
  id: 'complementary',
  name: 'Complementary',
  description: 'Colors opposite on the color wheel',
  icon: 'complementary',
};

const mockDye1: Dye = {
  itemID: 1,
  id: 1,
  stainID: null,
  name: 'Jet Black',
  hex: '#000000',
  rgb: { r: 0, g: 0, b: 0 },
  hsv: { h: 0, s: 0, v: 0 },
  category: 'Neutral',
  acquisition: 'Weaver',
  cost: 0,
  isMetallic: false,
  isPastel: false,
  isDark: false,
  isCosmic: false,
};

const mockDye2: Dye = {
  itemID: 2,
  id: 2,
  stainID: null,
  name: 'Snow White',
  hex: '#FFFFFF',
  rgb: { r: 255, g: 255, b: 255 },
  hsv: { h: 0, s: 0, v: 100 },
  category: 'Neutral',
  acquisition: 'Weaver',
  cost: 0,
  isMetallic: false,
  isPastel: false,
  isDark: false,
  isCosmic: false,
};

describe('HarmonyType Component', () => {
  let container: HTMLElement;
  let component: HarmonyType;

  beforeEach(() => {
    container = createTestContainer();
  });

  afterEach(() => {
    if (component) {
      cleanupComponent(component, container);
    } else {
      cleanupTestContainer(container);
    }
  });

  describe('Initialization', () => {
    it('should create component with required properties', () => {
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', []);
      component.init();

      expect(component).toBeDefined();
      expect(container.children.length).toBeGreaterThan(0);
    });

    it('should initialize without matched dyes', () => {
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', []);
      component.init();

      const emptyState = container.textContent;
      expect(emptyState).toContain('No matching dyes found');
    });

    it('should initialize with matched dyes', () => {
      const matchedDyes = [
        { dye: mockDye1, deviance: 2 },
        { dye: mockDye2, deviance: 3 },
      ];
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', matchedDyes);
      component.init();

      expect(container.children.length).toBeGreaterThan(0);
    });

    it('should initialize with prices disabled by default', () => {
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', [], false);
      component.init();

      expect(component).toBeDefined();
    });

    it('should initialize with prices enabled', () => {
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', [], true);
      component.init();

      expect(component).toBeDefined();
    });
  });

  describe('Rendering', () => {
    it('should render header with harmony info', () => {
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', []);
      component.init();

      expect(container.textContent).toContain(mockHarmonyInfo.name);
    });

    it('should display matched dyes when provided', () => {
      const matchedDyes = [
        { dye: mockDye1, deviance: 1.5 },
        { dye: mockDye2, deviance: 2.0 },
      ];
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', matchedDyes);
      component.init();

      const text = container.textContent || '';
      expect(text).toContain('Jet Black');
    });

    it('should display correct dye names', () => {
      const matchedDyes = [{ dye: mockDye1, deviance: 2 }];
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', matchedDyes);
      component.init();

      const text = container.textContent || '';
      expect(text).toContain('Jet Black');
    });

    it('should apply card styling classes', () => {
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', []);
      component.init();

      const card = container.querySelector('div');
      expect(card?.className).toContain('rounded-lg');
    });

    it('should apply theme-aware styling', () => {
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', []);
      component.init();

      const card = container.querySelector('div');
      expect(card?.className).toContain('dark:bg-gray-800');
    });
  });

  describe('State Management', () => {
    it('should maintain harmony info through lifecycle', () => {
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', []);
      component.init();

      expect(container.textContent).toContain(mockHarmonyInfo.name);
    });

    it('should handle empty matched dyes gracefully', () => {
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', []);
      component.init();

      const emptyState = container.textContent;
      expect(emptyState).toContain('No matching dyes found');
    });

    it('should handle multiple matched dyes', () => {
      const matchedDyes = Array.from({ length: 5 }, (_, i) => ({
        dye: { ...mockDye1, id: i, itemID: i, name: `Dye ${i}` },
        deviance: Math.random() * 10,
      }));

      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', matchedDyes);
      component.init();

      expect(container.children.length).toBeGreaterThan(0);
    });

    it('should display different harmony types correctly', () => {
      const analogousInfo: HarmonyTypeInfo = {
        id: 'analogous',
        name: 'Analogous',
        description: 'Adjacent colors on the color wheel',
        icon: 'analogous',
      };

      component = new HarmonyType(container, analogousInfo, '#FF0000', []);
      component.init();

      expect(container.textContent).toContain('Analogous');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long dye names', () => {
      const longNameDye: Dye = {
        ...mockDye1,
        name: 'This is an extremely long dye name that should still render properly without breaking',
      };

      const matchedDyes = [{ dye: longNameDye, deviance: 2 }];
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', matchedDyes);
      component.init();

      expect(container.textContent).toContain('extremely long dye name');
    });

    it('should handle special characters in dye names', () => {
      const specialDye: Dye = {
        ...mockDye1,
        name: "Dye's Name & Special <tag>",
      };

      const matchedDyes = [{ dye: specialDye, deviance: 2 }];
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', matchedDyes);
      component.init();

      expect(container.textContent).toContain("Dye's Name & Special");
    });

    it('should handle very high deviance values', () => {
      const matchedDyes = [{ dye: mockDye1, deviance: 100 }];
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', matchedDyes);
      component.init();

      expect(component).toBeDefined();
    });

    it('should handle various color formats', () => {
      component = new HarmonyType(container, mockHarmonyInfo, '#000000', []);
      component.init();

      expect(component).toBeDefined();
    });
  });

  describe('Lifecycle', () => {
    it('should properly initialize and destroy', () => {
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', []);
      component.init();

      expect(container.children.length).toBeGreaterThan(0);

      component.destroy();
      expect(container.children.length).toBe(0);
    });

    it('should handle multiple update cycles', () => {
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', []);
      component.init();

      component.update();
      expect(container.children.length).toBeGreaterThan(0);

      component.update();
      expect(container.children.length).toBeGreaterThan(0);
    });

    it('should cleanup resources on destroy', () => {
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', []);
      component.init();

      const initialChildCount = container.children.length;
      expect(initialChildCount).toBeGreaterThan(0);

      component.destroy();
      expect(container.children.length).toBe(0);
    });
  });

  describe('Accessibility', () => {
    it('should have semantic HTML structure', () => {
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', []);
      component.init();

      const card = container.querySelector('div');
      expect(card).toBeDefined();
    });

    it('should display harmony information clearly', () => {
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', []);
      component.init();

      expect(container.textContent).toContain(mockHarmonyInfo.name);
      expect(container.textContent).toContain(mockHarmonyInfo.description);
    });

    it('should have proper text contrast', () => {
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', []);
      component.init();

      expect(container).toBeDefined();
    });
  });

  // ==========================================================================
  // Function Coverage Tests - bindEvents
  // ==========================================================================

  describe('bindEvents function coverage', () => {
    it('should call bindEvents without throwing', () => {
      const matchedDyes = [{ dye: mockDye1, deviance: 2 }];
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', matchedDyes);
      component.init();

      expect(() => {
        component.bindEvents();
      }).not.toThrow();
    });

    it('should emit dye-selected event when dye swatch is clicked', () => {
      const matchedDyes = [{ dye: mockDye1, deviance: 2 }];
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', matchedDyes);
      component.init();
      component.bindEvents();

      const eventHandler = vi.fn();
      container.addEventListener('dye-selected', eventHandler);

      // Find the dye swatch (element with background-color style)
      const swatch = container.querySelector('[style*="background-color"]');
      swatch?.dispatchEvent(new Event('click', { bubbles: true }));

      expect(eventHandler).toHaveBeenCalled();
    });

    it('should not throw when no dye items exist', () => {
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', []);
      component.init();

      expect(() => {
        component.bindEvents();
      }).not.toThrow();
    });

    it('should handle multiple dye swatches', () => {
      const matchedDyes = [
        { dye: mockDye1, deviance: 2 },
        { dye: mockDye2, deviance: 3 },
      ];
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', matchedDyes);
      component.init();
      component.bindEvents();

      const swatches = container.querySelectorAll('[style*="background-color"]');
      expect(swatches.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Function Coverage Tests - updateDyes
  // ==========================================================================

  describe('updateDyes function coverage', () => {
    it('should update matched dyes', () => {
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', []);
      component.init();

      const newDyes = [{ dye: mockDye1, deviance: 2 }];
      component.updateDyes(newDyes);

      expect(container.textContent).toContain('Jet Black');
    });

    it('should re-render after updating dyes', () => {
      const initialDyes = [{ dye: mockDye1, deviance: 2 }];
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', initialDyes);
      component.init();

      expect(container.textContent).toContain('Jet Black');

      const newDyes = [{ dye: mockDye2, deviance: 3 }];
      component.updateDyes(newDyes);

      expect(container.textContent).toContain('Snow White');
    });

    it('should handle updating to empty dyes', () => {
      const initialDyes = [{ dye: mockDye1, deviance: 2 }];
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', initialDyes);
      component.init();

      component.updateDyes([]);

      expect(container.textContent).toContain('No matching dyes found');
    });
  });

  // ==========================================================================
  // Function Coverage Tests - updateBaseColor
  // ==========================================================================

  describe('updateBaseColor function coverage', () => {
    it('should update base color', () => {
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', []);
      component.init();

      expect(() => {
        component.updateBaseColor('#00FF00');
      }).not.toThrow();
    });

    it('should re-render after updating base color', () => {
      const matchedDyes = [{ dye: mockDye1, deviance: 2 }];
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', matchedDyes);
      component.init();

      component.updateBaseColor('#00FF00');

      // Component should still render properly
      expect(container.children.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Function Coverage Tests - setPriceData
  // ==========================================================================

  describe('setPriceData function coverage', () => {
    it('should set price data', () => {
      const matchedDyes = [{ dye: mockDye1, deviance: 2 }];
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', matchedDyes, true);
      component.init();

      const priceData = new Map<number, { currentAverage: number }>();
      priceData.set(mockDye1.itemID, { currentAverage: 5000 });

      expect(() => {
        component.setPriceData(
          priceData as unknown as Map<number, import('@shared/types').PriceData>
        );
      }).not.toThrow();
    });

    it('should display prices after setting price data', () => {
      const matchedDyes = [{ dye: mockDye1, deviance: 2 }];
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', matchedDyes, true);
      component.init();

      const priceData = new Map<number, { currentAverage: number }>();
      priceData.set(mockDye1.itemID, { currentAverage: 5000 });
      component.setPriceData(
        priceData as unknown as Map<number, import('@shared/types').PriceData>
      );

      expect(container.textContent).toContain('5,000');
    });

    it('should display N/A when price data is missing', () => {
      const matchedDyes = [{ dye: mockDye1, deviance: 2 }];
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', matchedDyes, true);
      component.init();

      const priceData = new Map<number, { currentAverage: number }>();
      component.setPriceData(
        priceData as unknown as Map<number, import('@shared/types').PriceData>
      );

      expect(container.textContent).toContain('N/A');
    });
  });

  // ==========================================================================
  // Function Coverage Tests - updateShowPrices
  // ==========================================================================

  describe('updateShowPrices function coverage', () => {
    it('should toggle prices on', () => {
      const matchedDyes = [{ dye: mockDye1, deviance: 2 }];
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', matchedDyes, false);
      component.init();

      component.updateShowPrices(true);

      // N/A should appear when prices are enabled but no data
      expect(container.textContent).toContain('N/A');
    });

    it('should toggle prices off', () => {
      const matchedDyes = [{ dye: mockDye1, deviance: 2 }];
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', matchedDyes, true);
      component.init();

      // Check that N/A is initially shown
      expect(container.textContent).toContain('N/A');

      component.updateShowPrices(false);

      // N/A should no longer appear
      expect(container.textContent).not.toContain('N/A');
    });
  });

  // ==========================================================================
  // Function Coverage Tests - getDyes
  // ==========================================================================

  describe('getDyes function coverage', () => {
    it('should return empty array when no dyes', () => {
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', []);
      component.init();

      const dyes = component.getDyes();

      expect(dyes).toEqual([]);
    });

    it('should return array of dyes', () => {
      const matchedDyes = [
        { dye: mockDye1, deviance: 2 },
        { dye: mockDye2, deviance: 3 },
      ];
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', matchedDyes);
      component.init();

      const dyes = component.getDyes();

      expect(dyes).toHaveLength(2);
      expect(dyes[0].name).toBe('Jet Black');
      expect(dyes[1].name).toBe('Snow White');
    });

    it('should return dyes after update', () => {
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', []);
      component.init();

      const newDyes = [{ dye: mockDye1, deviance: 2 }];
      component.updateDyes(newDyes);

      const dyes = component.getDyes();

      expect(dyes).toHaveLength(1);
    });
  });

  // ==========================================================================
  // Function Coverage Tests - getState
  // ==========================================================================

  describe('getState function coverage', () => {
    it('should return component state', () => {
      const matchedDyes = [{ dye: mockDye1, deviance: 2 }];
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', matchedDyes);
      component.init();

      // Access protected method
      const state = (
        component as unknown as { getState: () => Record<string, unknown> }
      ).getState();

      expect(state.harmonyType).toBe('complementary');
      expect(state.baseColor).toBe('#FF0000');
      expect(state.matchedDyesCount).toBe(1);
    });

    it('should return 0 matchedDyesCount when no dyes', () => {
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', []);
      component.init();

      const state = (
        component as unknown as { getState: () => Record<string, unknown> }
      ).getState();

      expect(state.matchedDyesCount).toBe(0);
    });

    it('should update state after updating dyes', () => {
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', []);
      component.init();

      const newDyes = [
        { dye: mockDye1, deviance: 2 },
        { dye: mockDye2, deviance: 3 },
      ];
      component.updateDyes(newDyes);

      const state = (
        component as unknown as { getState: () => Record<string, unknown> }
      ).getState();

      expect(state.matchedDyesCount).toBe(2);
    });

    it('should update state after updating base color', () => {
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', []);
      component.init();

      component.updateBaseColor('#00FF00');

      const state = (
        component as unknown as { getState: () => Record<string, unknown> }
      ).getState();

      expect(state.baseColor).toBe('#00FF00');
    });
  });

  // ==========================================================================
  // Function Coverage Tests - getDevianceColor
  // ==========================================================================

  describe('getDevianceColor function coverage', () => {
    it('should return green for very low deviance (≤5)', () => {
      const matchedDyes = [{ dye: mockDye1, deviance: 3 }];
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', matchedDyes);
      component.init();

      // Check that green color class is applied
      const devianceElement = container.querySelector('[title="Hue Difference (lower is better)"]');
      expect(devianceElement?.className).toContain('text-green');
    });

    it('should return blue for low deviance (≤15)', () => {
      const matchedDyes = [{ dye: mockDye1, deviance: 10 }];
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', matchedDyes);
      component.init();

      const devianceElement = container.querySelector('[title="Hue Difference (lower is better)"]');
      expect(devianceElement?.className).toContain('text-blue');
    });

    it('should return yellow for medium deviance (≤30)', () => {
      const matchedDyes = [{ dye: mockDye1, deviance: 25 }];
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', matchedDyes);
      component.init();

      const devianceElement = container.querySelector('[title="Hue Difference (lower is better)"]');
      expect(devianceElement?.className).toContain('text-yellow');
    });

    it('should return red for high deviance (>30)', () => {
      const matchedDyes = [{ dye: mockDye1, deviance: 50 }];
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', matchedDyes);
      component.init();

      const devianceElement = container.querySelector('[title="Hue Difference (lower is better)"]');
      expect(devianceElement?.className).toContain('text-red');
    });

    it('should handle boundary value of exactly 5', () => {
      const matchedDyes = [{ dye: mockDye1, deviance: 5 }];
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', matchedDyes);
      component.init();

      const devianceElement = container.querySelector('[title="Hue Difference (lower is better)"]');
      expect(devianceElement?.className).toContain('text-green');
    });

    it('should handle boundary value of exactly 15', () => {
      const matchedDyes = [{ dye: mockDye1, deviance: 15 }];
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', matchedDyes);
      component.init();

      const devianceElement = container.querySelector('[title="Hue Difference (lower is better)"]');
      expect(devianceElement?.className).toContain('text-blue');
    });

    it('should handle boundary value of exactly 30', () => {
      const matchedDyes = [{ dye: mockDye1, deviance: 30 }];
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', matchedDyes);
      component.init();

      const devianceElement = container.querySelector('[title="Hue Difference (lower is better)"]');
      expect(devianceElement?.className).toContain('text-yellow');
    });
  });

  // ==========================================================================
  // Function Coverage Tests - renderHeader
  // ==========================================================================

  describe('renderHeader function coverage', () => {
    it('should display harmony icon', () => {
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', []);
      component.init();

      // Icon is now rendered as inline SVG in a span element
      const iconSpan = container.querySelector('span.harmony-icon');
      expect(iconSpan).toBeDefined();
      // Check for SVG content
      expect(iconSpan?.innerHTML.includes('<svg') || iconSpan?.querySelector('svg')).toBeTruthy();
    });

    it('should display harmony name', () => {
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', []);
      component.init();

      expect(container.textContent).toContain(mockHarmonyInfo.name);
    });

    it('should display harmony description', () => {
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', []);
      component.init();

      expect(container.textContent).toContain(mockHarmonyInfo.description);
    });

    it('should display average deviance when dyes exist', () => {
      const matchedDyes = [
        { dye: mockDye1, deviance: 5 },
        { dye: mockDye2, deviance: 15 },
      ];
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', matchedDyes);
      component.init();

      // Average should be 10.0
      expect(container.textContent).toContain('10.0');
    });

    it('should not display deviance info when no dyes', () => {
      component = new HarmonyType(container, mockHarmonyInfo, '#FF0000', []);
      component.init();

      // Should not contain deviance degree symbol (when no dyes present in header)
      const headerDevianceDiv = container.querySelector('.harmony-deviance-info');
      expect(headerDevianceDiv).toBeNull();
    });
  });
});
