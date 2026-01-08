/**
 * XIV Dye Tools - Color Interpolation Display Component Tests
 *
 * Tests for the color interpolation/gradient display component
 *
 * @module components/__tests__/color-interpolation-display.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ColorInterpolationDisplay, type InterpolationStep } from '../color-interpolation-display';
import { createTestContainer, cleanupTestContainer, waitForComponent } from './test-utils';
import type { Dye } from '@shared/types';

// Mock dye for interpolation steps
const createMockDye = (hex: string, name: string): Dye => ({
  id: 1,
  itemID: 30001,
  stainID: null,
  name,
  hex,
  rgb: { r: 128, g: 128, b: 128 },
  hsv: { h: 0, s: 0, v: 50 },
  category: 'Gray',
  acquisition: 'Vendor',
  cost: 0,
  isMetallic: false,
  isPastel: false,
  isDark: false,
  isCosmic: false,
});

// Create mock interpolation steps
const createMockSteps = (): InterpolationStep[] => [
  {
    position: 0,
    theoreticalColor: '#FF0000',
    matchedDye: createMockDye('#E53935', 'Dalamud Red'),
    distance: 15.2,
  },
  {
    position: 0.25,
    theoreticalColor: '#BF3F00',
    matchedDye: createMockDye('#BF360C', 'Rust Red'),
    distance: 25.8,
  },
  {
    position: 0.5,
    theoreticalColor: '#7F7F00',
    matchedDye: createMockDye('#827717', 'Olive Green'),
    distance: 45.3,
  },
  {
    position: 0.75,
    theoreticalColor: '#3FBF00',
    matchedDye: createMockDye('#33691E', 'Moss Green'),
    distance: 85.7,
  },
  {
    position: 1,
    theoreticalColor: '#00FF00',
    matchedDye: createMockDye('#1B5E20', 'Hunter Green'),
    distance: 120.4,
  },
];

describe('ColorInterpolationDisplay', () => {
  let container: HTMLElement;
  let component: ColorInterpolationDisplay;

  beforeEach(() => {
    vi.clearAllMocks();
    container = createTestContainer();
    // Mock scrollIntoView since jsdom doesn't support it
    HTMLElement.prototype.scrollIntoView = vi.fn();
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
    it('should render empty state when no steps provided', () => {
      component = new ColorInterpolationDisplay(container);
      component.init();

      expect(container.textContent).toContain('No interpolation data');
    });

    it('should render title even in empty state', () => {
      component = new ColorInterpolationDisplay(container);
      component.init();

      expect(container.querySelector('h3')).not.toBeNull();
    });
  });

  // ==========================================================================
  // Rendering - With Steps
  // ==========================================================================

  describe('rendering - with steps', () => {
    it('should render interpolation display with steps', () => {
      const steps = createMockSteps();
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps);
      component.init();

      expect(container.children.length).toBeGreaterThan(0);
    });

    it('should render gradient bar', () => {
      const steps = createMockSteps();
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps);
      component.init();

      expect(container.textContent).toContain('Color Gradient');
    });

    it('should render distance legend', () => {
      const steps = createMockSteps();
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps);
      component.init();

      expect(container.textContent).toContain('Understanding Distance');
    });

    it('should render intermediate dyes section', () => {
      const steps = createMockSteps();
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps);
      component.init();

      expect(container.textContent).toContain('Intermediate Dyes');
    });

    it('should render transition quality metrics', () => {
      const steps = createMockSteps();
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps);
      component.init();

      expect(container.textContent).toContain('Transition Quality');
    });

    it('should render all step items', () => {
      const steps = createMockSteps();
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps);
      component.init();

      // Check for dye names
      expect(container.textContent).toContain('Dalamud Red');
      expect(container.textContent).toContain('Rust Red');
      expect(container.textContent).toContain('Olive Green');
    });

    it('should render position percentages', () => {
      const steps = createMockSteps();
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps);
      component.init();

      expect(container.textContent).toContain('0%');
      expect(container.textContent).toContain('25%');
      expect(container.textContent).toContain('50%');
      expect(container.textContent).toContain('100%');
    });

    it('should render start and end labels', () => {
      const steps = createMockSteps();
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps);
      component.init();

      expect(container.textContent).toContain('Start');
      expect(container.textContent).toContain('End');
    });
  });

  // ==========================================================================
  // Distance Color Coding
  // ==========================================================================

  describe('distance color coding', () => {
    it('should show excellent match color for distance <= 30', () => {
      const steps: InterpolationStep[] = [
        {
          position: 0,
          theoreticalColor: '#FF0000',
          matchedDye: createMockDye('#FF0000', 'Perfect Match'),
          distance: 15,
        },
      ];
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps);
      component.init();

      // Check for green color class (excellent match)
      const greenClass = container.querySelector('.text-green-600, .dark\\:text-green-400');
      expect(greenClass).not.toBeNull();
    });

    it('should show poor match color for distance > 100', () => {
      const steps: InterpolationStep[] = [
        {
          position: 0,
          theoreticalColor: '#FF0000',
          matchedDye: createMockDye('#00FF00', 'Poor Match'),
          distance: 150,
        },
      ];
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps);
      component.init();

      // Check for red color class (poor match)
      const redClass = container.querySelector('.text-red-600, .dark\\:text-red-400');
      expect(redClass).not.toBeNull();
    });
  });

  // ==========================================================================
  // Quality Scale Legend
  // ==========================================================================

  describe('quality scale legend', () => {
    it('should render quality scale', () => {
      const steps = createMockSteps();
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps);
      component.init();

      expect(container.textContent).toContain('Quality Scale');
    });

    it('should show excellent match range', () => {
      const steps = createMockSteps();
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps);
      component.init();

      expect(container.textContent).toContain('≤30');
      expect(container.textContent).toContain('Excellent match');
    });

    it('should show good match range', () => {
      const steps = createMockSteps();
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps);
      component.init();

      expect(container.textContent).toContain('31-60');
      expect(container.textContent).toContain('Good match');
    });

    it('should show fair match range', () => {
      const steps = createMockSteps();
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps);
      component.init();

      expect(container.textContent).toContain('61-100');
      expect(container.textContent).toContain('Fair match');
    });

    it('should show poor match range', () => {
      const steps = createMockSteps();
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps);
      component.init();

      expect(container.textContent).toContain('>100');
      expect(container.textContent).toContain('Poor match');
    });
  });

  // ==========================================================================
  // Metrics Calculation
  // ==========================================================================

  describe('metrics calculation', () => {
    it('should display coverage percentage', () => {
      const steps = createMockSteps();
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps);
      component.init();

      expect(container.textContent).toContain('Coverage');
      expect(container.textContent).toContain('100%'); // All steps have matches
    });

    it('should display average distance', () => {
      const steps = createMockSteps();
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps);
      component.init();

      expect(container.textContent).toContain('Average Distance');
    });

    it('should display max distance', () => {
      const steps = createMockSteps();
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps);
      component.init();

      expect(container.textContent).toContain('Max Distance');
    });

    it('should display matched count', () => {
      const steps = createMockSteps();
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps);
      component.init();

      expect(container.textContent).toContain('5/5'); // All 5 steps matched
    });
  });

  // ==========================================================================
  // No Match Handling
  // ==========================================================================

  describe('no match handling', () => {
    it('should show no match message for step without dye', () => {
      const steps: InterpolationStep[] = [
        {
          position: 0.5,
          theoreticalColor: '#7F7F00',
          matchedDye: null,
          distance: 0,
        },
      ];
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps);
      component.init();

      expect(container.textContent).toContain('No close match');
    });

    it('should calculate coverage correctly with unmatched steps', () => {
      const steps: InterpolationStep[] = [
        {
          position: 0,
          theoreticalColor: '#FF0000',
          matchedDye: createMockDye('#FF0000', 'Match'),
          distance: 10,
        },
        {
          position: 0.5,
          theoreticalColor: '#7F7F00',
          matchedDye: null,
          distance: 0,
        },
      ];
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps);
      component.init();

      expect(container.textContent).toContain('50%');
      expect(container.textContent).toContain('1/2');
    });
  });

  // ==========================================================================
  // Update Method
  // ==========================================================================

  describe('updateInterpolation', () => {
    it('should update display with new interpolation data', async () => {
      component = new ColorInterpolationDisplay(container);
      component.init();

      expect(container.textContent).toContain('No interpolation data');

      const steps = createMockSteps();
      component.updateInterpolation('#FF0000', '#00FF00', steps);
      await waitForComponent();

      expect(container.textContent).not.toContain('No interpolation data');
      expect(container.textContent).toContain('Dalamud Red');
    });
  });

  // ==========================================================================
  // Color Space
  // ==========================================================================

  describe('color space', () => {
    it('should display HSV color space by default', () => {
      const steps = createMockSteps();
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps, 'hsv');
      component.init();

      expect(container.textContent).toContain('HSV');
    });

    it('should display RGB color space when specified', () => {
      const steps = createMockSteps();
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps, 'rgb');
      component.init();

      expect(container.textContent).toContain('RGB');
    });
  });

  // ==========================================================================
  // State Management
  // ==========================================================================

  describe('state management', () => {
    it('should return correct state', () => {
      const steps = createMockSteps();
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps, 'hsv');
      component.init();

      const state = (
        component as unknown as { getState: () => Record<string, unknown> }
      ).getState();

      expect(state).toHaveProperty('startColor', '#FF0000');
      expect(state).toHaveProperty('endColor', '#00FF00');
      expect(state).toHaveProperty('stepCount', 5);
      expect(state).toHaveProperty('colorSpace', 'hsv');
    });
  });

  // ==========================================================================
  // Visual Elements
  // ==========================================================================

  describe('visual elements', () => {
    it('should render color swatches for each step', () => {
      const steps = createMockSteps();
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps);
      component.init();

      const swatches = container.querySelectorAll('[style*="background-color"]');
      expect(swatches.length).toBeGreaterThan(0);
    });

    it('should render progress bar', () => {
      const steps = createMockSteps();
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps);
      component.init();

      const progressBar = container.querySelector('.bg-blue-500');
      expect(progressBar).not.toBeNull();
    });
  });

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  describe('cleanup', () => {
    it('should clean up without error', () => {
      const steps = createMockSteps();
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps);
      component.init();

      expect(() => component.destroy()).not.toThrow();
    });
  });

  // ==========================================================================
  // Interactive Stop Selection (T4)
  // ==========================================================================

  describe('interactive stop selection', () => {
    it('should select a stop when clicking stop marker', () => {
      const steps = createMockSteps();
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps);
      component.init();

      const stopMarker = container.querySelector('button[data-stop-index="0"]') as HTMLButtonElement;
      expect(stopMarker).not.toBeNull();

      stopMarker.click();

      // Check that selectedStopIndex was updated
      expect(component['selectedStopIndex']).toBe(0);
    });

    it('should deselect stop when clicking same stop again', () => {
      const steps = createMockSteps();
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps);
      component.init();

      const stopMarker = container.querySelector('button[data-stop-index="0"]') as HTMLButtonElement;
      stopMarker.click();
      expect(component['selectedStopIndex']).toBe(0);

      stopMarker.click();
      expect(component['selectedStopIndex']).toBe(-1);
    });

    it('should select a different stop when clicking another stop', () => {
      const steps = createMockSteps();
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps);
      component.init();

      const stopMarker0 = container.querySelector('button[data-stop-index="0"]') as HTMLButtonElement;
      const stopMarker2 = container.querySelector('button[data-stop-index="2"]') as HTMLButtonElement;

      stopMarker0.click();
      expect(component['selectedStopIndex']).toBe(0);

      stopMarker2.click();
      expect(component['selectedStopIndex']).toBe(2);
    });

    it('should select step when clicking step item in list', () => {
      const steps = createMockSteps();
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps);
      component.init();

      const stepItem = container.querySelector('[data-step-index="1"]') as HTMLElement;
      expect(stepItem).not.toBeNull();

      stepItem.click();

      expect(component['selectedStopIndex']).toBe(1);
    });

    it('should highlight step in list when stop is selected', () => {
      const steps = createMockSteps();
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps);
      component.init();

      const stopMarker = container.querySelector('button[data-stop-index="0"]') as HTMLButtonElement;
      stopMarker.click();

      const stepItem = container.querySelector('[data-step-index="0"]') as HTMLElement;
      expect(stepItem.classList.contains('ring-2')).toBe(true);
      expect(stepItem.classList.contains('ring-blue-500')).toBe(true);
    });

    it('should handle keyboard navigation with Enter key on step item', () => {
      const steps = createMockSteps();
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps);
      component.init();

      const stepItem = container.querySelector('[data-step-index="1"]') as HTMLElement;
      stepItem.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      expect(component['selectedStopIndex']).toBe(1);
    });

    it('should handle keyboard navigation with Space key on step item', () => {
      const steps = createMockSteps();
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps);
      component.init();

      const stepItem = container.querySelector('[data-step-index="2"]') as HTMLElement;
      stepItem.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));

      expect(component['selectedStopIndex']).toBe(2);
    });

    it('should not select on other keyboard keys', () => {
      const steps = createMockSteps();
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps);
      component.init();

      const stepItem = container.querySelector('[data-step-index="1"]') as HTMLElement;
      stepItem.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));

      expect(component['selectedStopIndex']).toBe(-1);
    });

    it('should update stop marker visuals when selection changes', () => {
      const steps = createMockSteps();
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps);
      component.init();

      const stopMarker = container.querySelector('button[data-stop-index="1"]') as HTMLButtonElement;
      stopMarker.click();

      // Check that the selected marker has the correct classes
      expect(stopMarker.classList.contains('z-20')).toBe(true);

      const handle = stopMarker.querySelector('div');
      expect(handle?.classList.contains('border-blue-500')).toBe(true);
    });

    it('should remove highlight from previous step when selecting new one', () => {
      const steps = createMockSteps();
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps);
      component.init();

      const stopMarker0 = container.querySelector('button[data-stop-index="0"]') as HTMLButtonElement;
      const stopMarker1 = container.querySelector('button[data-stop-index="1"]') as HTMLButtonElement;

      stopMarker0.click();
      stopMarker1.click();

      // First step should no longer be highlighted
      const stepItem0 = container.querySelector('[data-step-index="0"]') as HTMLElement;
      expect(stepItem0.classList.contains('ring-2')).toBe(false);

      // Second step should be highlighted
      const stepItem1 = container.querySelector('[data-step-index="1"]') as HTMLElement;
      expect(stepItem1.classList.contains('ring-2')).toBe(true);
    });
  });

  // ==========================================================================
  // Distance Color Ranges
  // ==========================================================================

  describe('distance color ranges', () => {
    it('should return blue color for distance 31-60', () => {
      const steps: InterpolationStep[] = [
        {
          position: 0,
          theoreticalColor: '#FF0000',
          matchedDye: createMockDye('#FF5500', 'Good Match'),
          distance: 45,
        },
      ];
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps);
      component.init();

      // Check getDistanceColor method
      const color = component['getDistanceColor'](45);
      expect(color).toContain('blue');
    });

    it('should return yellow color for distance 61-100', () => {
      const steps: InterpolationStep[] = [
        {
          position: 0,
          theoreticalColor: '#FF0000',
          matchedDye: createMockDye('#FF8800', 'Fair Match'),
          distance: 80,
        },
      ];
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps);
      component.init();

      const color = component['getDistanceColor'](80);
      expect(color).toContain('yellow');
    });
  });

  // ==========================================================================
  // Gradient Bar
  // ==========================================================================

  describe('gradient bar', () => {
    it('should render gradient stops container', () => {
      const steps = createMockSteps();
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps);
      component.init();

      const stopsContainer = container.querySelector('#stops-container');
      expect(stopsContainer).not.toBeNull();
    });

    it('should render gradient bar with linear gradient', () => {
      const steps = createMockSteps();
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps);
      component.init();

      const gradientBar = container.querySelector('#gradient-bar') as HTMLElement;
      expect(gradientBar).not.toBeNull();
      expect(gradientBar.style.background).toContain('linear-gradient');
    });

    it('should render stop markers for each step', () => {
      const steps = createMockSteps();
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps);
      component.init();

      const markers = container.querySelectorAll('button[data-stop-index]');
      expect(markers.length).toBe(5);
    });

    it('should render hint text', () => {
      const steps = createMockSteps();
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps);
      component.init();

      expect(container.textContent).toContain('Click a stop marker');
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle updateStopMarkerVisuals when stopsContainer is null', () => {
      component = new ColorInterpolationDisplay(container);
      component.init();

      // Calling this should not throw
      expect(() => {
        component['updateStopMarkerVisuals'](0, 1);
      }).not.toThrow();
    });

    it('should handle highlightStepInList when listContainer is null', () => {
      component = new ColorInterpolationDisplay(container);
      component.init();

      // Calling this should not throw
      expect(() => {
        component['highlightStepInList'](0);
      }).not.toThrow();
    });

    it('should handle step with matchedDye but item has null matchedDye in renderStepItem', () => {
      const steps: InterpolationStep[] = [
        {
          position: 0.5,
          theoreticalColor: '#AAAAAA',
          matchedDye: null,
          distance: 0,
        },
      ];
      component = new ColorInterpolationDisplay(container, '#FF0000', '#00FF00', steps);
      component.init();

      expect(container.textContent).toContain('No close match');
    });
  });
});
