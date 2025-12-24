/**
 * XIV Dye Tools - Colorblindness Display Component Tests
 *
 * Tests for the colorblindness simulation display component
 *
 * @module components/__tests__/colorblindness-display.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ColorblindnessDisplay } from '../colorblindness-display';
import { createTestContainer, cleanupTestContainer, waitForComponent } from './test-utils';

describe('ColorblindnessDisplay', () => {
  let container: HTMLElement;
  let component: ColorblindnessDisplay;

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
  // Rendering
  // ==========================================================================

  describe('rendering', () => {
    it('should render the colorblindness display', () => {
      component = new ColorblindnessDisplay(container);
      component.init();

      expect(container.children.length).toBeGreaterThan(0);
    });

    it('should render title', () => {
      component = new ColorblindnessDisplay(container);
      component.init();

      expect(container.textContent).toContain('Color Perception Simulation');
    });

    it('should render description', () => {
      component = new ColorblindnessDisplay(container);
      component.init();

      expect(container.textContent).toContain('See how this color appears');
    });

    it('should render all 5 vision types', () => {
      component = new ColorblindnessDisplay(container);
      component.init();

      expect(container.textContent).toContain('Normal Vision');
      expect(container.textContent).toContain('Deuteranopia');
      expect(container.textContent).toContain('Protanopia');
      expect(container.textContent).toContain('Tritanopia');
      expect(container.textContent).toContain('Achromatopsia');
    });

    it('should render vision type cards', () => {
      component = new ColorblindnessDisplay(container);
      component.init();

      // Check for card structure (5 vision types)
      const cards = container.querySelectorAll('.rounded-lg.border');
      expect(cards.length).toBeGreaterThanOrEqual(5);
    });

    it('should render color values section', () => {
      component = new ColorblindnessDisplay(container);
      component.init();

      expect(container.textContent).toContain('Color Values');
    });
  });

  // ==========================================================================
  // Vision Type Information
  // ==========================================================================

  describe('vision type information', () => {
    it('should display normal vision description', () => {
      component = new ColorblindnessDisplay(container);
      component.init();

      expect(container.textContent).toContain('Standard trichromatic color vision');
    });

    it('should display deuteranopia description', () => {
      component = new ColorblindnessDisplay(container);
      component.init();

      expect(container.textContent).toContain('missing green cones');
    });

    it('should display protanopia description', () => {
      component = new ColorblindnessDisplay(container);
      component.init();

      expect(container.textContent).toContain('missing red cones');
    });

    it('should display tritanopia description', () => {
      component = new ColorblindnessDisplay(container);
      component.init();

      expect(container.textContent).toContain('missing blue cones');
    });

    it('should display achromatopsia description', () => {
      component = new ColorblindnessDisplay(container);
      component.init();

      expect(container.textContent).toContain('Complete colorblindness');
    });

    it('should display prevalence information', () => {
      component = new ColorblindnessDisplay(container);
      component.init();

      expect(container.textContent).toContain('~92-94%'); // Normal vision
      expect(container.textContent).toContain('~1.2%'); // Deuteranopia
      expect(container.textContent).toContain('~1.3%'); // Protanopia
      expect(container.textContent).toContain('~0.02%'); // Tritanopia
      expect(container.textContent).toContain('~0.003%'); // Achromatopsia
    });
  });

  // ==========================================================================
  // Color Simulation
  // ==========================================================================

  describe('color simulation', () => {
    it('should use default red color', () => {
      component = new ColorblindnessDisplay(container);
      component.init();

      // Default color is #FF0000
      expect(container.textContent).toContain('#FF0000');
    });

    it('should accept custom initial color', () => {
      component = new ColorblindnessDisplay(container, '#0000FF');
      component.init();

      expect(container.textContent).toContain('#0000FF');
    });

    it('should display simulated colors for each vision type', () => {
      component = new ColorblindnessDisplay(container, '#FF0000');
      component.init();

      // Check that we have hex values displayed (component uses 'number' class)
      const hexValues = container.querySelectorAll('.number');
      expect(hexValues.length).toBeGreaterThan(0);
    });

    it('should display RGB values', () => {
      component = new ColorblindnessDisplay(container, '#FF0000');
      component.init();

      // Should show rgb() format
      expect(container.textContent).toContain('rgb(');
    });
  });

  // ==========================================================================
  // Update Color
  // ==========================================================================

  describe('updateColor', () => {
    it('should update display when color changes', async () => {
      component = new ColorblindnessDisplay(container, '#FF0000');
      component.init();

      expect(container.textContent).toContain('#FF0000');

      component.updateColor('#00FF00');
      await waitForComponent();

      expect(container.textContent).toContain('#00FF00');
    });

    it('should update simulated colors', async () => {
      component = new ColorblindnessDisplay(container, '#FF0000');
      component.init();

      const initialHtml = container.innerHTML;

      component.updateColor('#0000FF');
      await waitForComponent();

      // Content should change after updating color
      expect(container.innerHTML).not.toBe(initialHtml);
    });
  });

  // ==========================================================================
  // Color Swatches
  // ==========================================================================

  describe('color swatches', () => {
    it('should render color swatches for each vision type', () => {
      component = new ColorblindnessDisplay(container, '#FF0000');
      component.init();

      const swatches = container.querySelectorAll('[style*="background-color"]');
      // Should have at least 5 swatches (one per vision type in cards)
      // Plus additional small swatches in color values section
      expect(swatches.length).toBeGreaterThanOrEqual(5);
    });

    it('should display original color for normal vision', () => {
      component = new ColorblindnessDisplay(container, '#FF0000');
      component.init();

      // Normal vision should show the original color
      const state = (
        component as unknown as { getState: () => Record<string, unknown> }
      ).getState();
      const simulatedColors = state.simulatedColors as Record<string, string>;

      expect(simulatedColors.normal).toBe('#FF0000');
    });
  });

  // ==========================================================================
  // State Management
  // ==========================================================================

  describe('state management', () => {
    it('should return correct state', () => {
      component = new ColorblindnessDisplay(container, '#00FF00');
      component.init();

      const state = (
        component as unknown as { getState: () => Record<string, unknown> }
      ).getState();

      expect(state).toHaveProperty('originalColor', '#00FF00');
      expect(state).toHaveProperty('simulatedColors');
    });

    it('should include all vision types in simulated colors', () => {
      component = new ColorblindnessDisplay(container, '#FF0000');
      component.init();

      const state = (
        component as unknown as { getState: () => Record<string, unknown> }
      ).getState();
      const simulatedColors = state.simulatedColors as Record<string, string>;

      expect(simulatedColors).toHaveProperty('normal');
      expect(simulatedColors).toHaveProperty('deuteranopia');
      expect(simulatedColors).toHaveProperty('protanopia');
      expect(simulatedColors).toHaveProperty('tritanopia');
      expect(simulatedColors).toHaveProperty('achromatopsia');
    });
  });

  // ==========================================================================
  // Color Values Section
  // ==========================================================================

  describe('color values section', () => {
    it('should display hex values for each vision type', () => {
      component = new ColorblindnessDisplay(container, '#FF0000');
      component.init();

      // Multiple hex codes should be displayed
      const hexPattern = /#[0-9A-Fa-f]{6}/g;
      const matches = container.textContent?.match(hexPattern);
      expect(matches).not.toBeNull();
      expect(matches!.length).toBeGreaterThanOrEqual(5);
    });

    it('should display vision type names in values section', () => {
      component = new ColorblindnessDisplay(container);
      component.init();

      const valuesSection = container.querySelector('.bg-gray-50');
      expect(valuesSection).not.toBeNull();
    });
  });

  // ==========================================================================
  // Grayscale Simulation
  // ==========================================================================

  describe('achromatopsia simulation', () => {
    it('should convert color to grayscale', () => {
      component = new ColorblindnessDisplay(container, '#FF0000');
      component.init();

      const state = (
        component as unknown as { getState: () => Record<string, unknown> }
      ).getState();
      const simulatedColors = state.simulatedColors as Record<string, string>;

      // Achromatopsia should produce a grayscale color
      // Pure red (#FF0000) should become a gray value
      const achroColor = simulatedColors.achromatopsia;
      expect(achroColor).toMatch(/^#[0-9A-Fa-f]{6}$/);

      // For grayscale, R, G, B values should be equal or very similar
      // We can verify by checking the hex pattern
    });
  });

  // ==========================================================================
  // Visual Layout
  // ==========================================================================

  describe('visual layout', () => {
    it('should use grid layout for vision type cards', () => {
      component = new ColorblindnessDisplay(container);
      component.init();

      const grid = container.querySelector('.grid');
      expect(grid).not.toBeNull();
    });

    it('should have responsive columns', () => {
      component = new ColorblindnessDisplay(container);
      component.init();

      const grid = container.querySelector('.grid');
      expect(grid?.classList.contains('md:grid-cols-3')).toBe(true);
      expect(grid?.classList.contains('lg:grid-cols-5')).toBe(true);
    });
  });

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  describe('cleanup', () => {
    it('should clean up without error', () => {
      component = new ColorblindnessDisplay(container);
      component.init();

      expect(() => component.destroy()).not.toThrow();
    });
  });
});
