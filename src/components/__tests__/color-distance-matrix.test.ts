/**
 * XIV Dye Tools - Color Distance Matrix Component Tests
 *
 * Tests for the color distance matrix table component
 *
 * @module components/__tests__/color-distance-matrix.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ColorDistanceMatrix } from '../color-distance-matrix';
import { createTestContainer, cleanupTestContainer, waitForComponent } from './test-utils';
import type { Dye } from '@shared/types';

// Mock dye data - use unique IDs to avoid conflicts with real database
const createMockDye = (id: number, name: string, hex: string): Dye => ({
  id,
  itemID: 90000 + id,
  stainID: null,
  name,
  hex,
  rgb: { r: 128, g: 128, b: 128 },
  hsv: { h: 0, s: 0, v: 50 },
  category: 'Test',
  acquisition: 'Test',
  cost: 0,
  isMetallic: false,
  isPastel: false,
  isDark: false,
  isCosmic: false,
});

const mockDyes = [
  createMockDye(9001, 'Red Dye', '#FF0000'),
  createMockDye(9002, 'Green Dye', '#00FF00'),
  createMockDye(9003, 'Blue Dye', '#0000FF'),
];

describe('ColorDistanceMatrix', () => {
  let container: HTMLElement;
  let component: ColorDistanceMatrix;

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
    it('should render empty state when no dyes provided', () => {
      component = new ColorDistanceMatrix(container);
      component.init();

      // Should show empty state message
      expect(container.textContent).toContain('Select');
    });

    it('should render empty state with empty array', () => {
      component = new ColorDistanceMatrix(container, []);
      component.init();

      expect(container.children.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Rendering - With Dyes
  // ==========================================================================

  describe('rendering - with dyes', () => {
    it('should render matrix with dyes', () => {
      component = new ColorDistanceMatrix(container, mockDyes);
      component.init();

      expect(container.children.length).toBeGreaterThan(0);
    });

    it('should render title', () => {
      component = new ColorDistanceMatrix(container, mockDyes);
      component.init();

      const title = container.querySelector('h3');
      expect(title).not.toBeNull();
    });

    it('should render description', () => {
      component = new ColorDistanceMatrix(container, mockDyes);
      component.init();

      const description = container.querySelector('p');
      expect(description).not.toBeNull();
    });

    it('should render table element', () => {
      component = new ColorDistanceMatrix(container, mockDyes);
      component.init();

      const table = container.querySelector('table');
      expect(table).not.toBeNull();
    });

    it('should render correct number of rows', () => {
      component = new ColorDistanceMatrix(container, mockDyes);
      component.init();

      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(mockDyes.length);
    });

    it('should render correct number of columns', () => {
      component = new ColorDistanceMatrix(container, mockDyes);
      component.init();

      const headerCells = container.querySelectorAll('thead th');
      // +1 for row header column
      expect(headerCells.length).toBe(mockDyes.length + 1);
    });

    it('should render color swatches in headers', () => {
      component = new ColorDistanceMatrix(container, mockDyes);
      component.init();

      const swatches = container.querySelectorAll('[style*="background-color"]');
      // Each dye appears in header row and in row headers
      expect(swatches.length).toBeGreaterThanOrEqual(mockDyes.length);
    });
  });

  // ==========================================================================
  // Distance Calculations
  // ==========================================================================

  describe('distance calculations', () => {
    it('should show 0.0 on diagonal cells', () => {
      component = new ColorDistanceMatrix(container, mockDyes);
      component.init();

      // Diagonal cells should show 0.0
      const cells = container.querySelectorAll('tbody td');
      let diagonalZeros = 0;

      cells.forEach((cell) => {
        if (cell.textContent === '0.0') {
          diagonalZeros++;
        }
      });

      expect(diagonalZeros).toBe(mockDyes.length);
    });

    it('should display distance values in cells', () => {
      component = new ColorDistanceMatrix(container, mockDyes);
      component.init();

      // Find cells with numeric distance values
      const cells = container.querySelectorAll('tbody td');
      let hasDistanceValues = false;

      cells.forEach((cell) => {
        const value = parseFloat(cell.textContent || '');
        if (!isNaN(value) && value > 0) {
          hasDistanceValues = true;
        }
      });

      expect(hasDistanceValues).toBe(true);
    });

    it('should have symmetric matrix', () => {
      component = new ColorDistanceMatrix(container, mockDyes);
      component.init();

      const rows = container.querySelectorAll('tbody tr');
      const values: number[][] = [];

      rows.forEach((row, i) => {
        values[i] = [];
        const cells = row.querySelectorAll('td');
        cells.forEach((cell, j) => {
          // Skip first cell (row header)
          if (j > 0) {
            values[i][j - 1] = parseFloat(cell.textContent || '0');
          }
        });
      });

      // Check symmetry: distance[i][j] should equal distance[j][i]
      for (let i = 0; i < values.length; i++) {
        for (let j = 0; j < values[i].length; j++) {
          expect(values[i][j]).toBeCloseTo(values[j][i], 1);
        }
      }
    });
  });

  // ==========================================================================
  // Color Coding
  // ==========================================================================

  describe('color coding', () => {
    it('should color code distance cells', () => {
      component = new ColorDistanceMatrix(container, mockDyes);
      component.init();

      // Non-diagonal cells should have background color
      const cells = container.querySelectorAll('tbody td');
      let hasColoredCells = false;

      cells.forEach((cell) => {
        const bgColor = (cell as HTMLElement).style.backgroundColor;
        if (bgColor && bgColor.includes('rgb')) {
          hasColoredCells = true;
        }
      });

      expect(hasColoredCells).toBe(true);
    });

    it('should set text color for readability', () => {
      component = new ColorDistanceMatrix(container, mockDyes);
      component.init();

      const cells = container.querySelectorAll('tbody td');
      let hasTextColor = false;

      cells.forEach((cell) => {
        const color = (cell as HTMLElement).style.color;
        if (color && (color === 'rgb(0, 0, 0)' || color === 'rgb(255, 255, 255)')) {
          hasTextColor = true;
        }
      });

      expect(hasTextColor).toBe(true);
    });
  });

  // ==========================================================================
  // Update Method
  // ==========================================================================

  describe('updateDyes', () => {
    it('should update matrix when dyes change', async () => {
      component = new ColorDistanceMatrix(container, mockDyes.slice(0, 2));
      component.init();

      let rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(2);

      component.updateDyes(mockDyes);
      await waitForComponent();

      rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(3);
    });

    it('should show empty state after clearing dyes', async () => {
      component = new ColorDistanceMatrix(container, mockDyes);
      component.init();

      component.updateDyes([]);
      await waitForComponent();

      expect(container.querySelector('table')).toBeNull();
    });
  });

  // ==========================================================================
  // State Management
  // ==========================================================================

  describe('state management', () => {
    it('should return correct state', () => {
      component = new ColorDistanceMatrix(container, mockDyes);
      component.init();

      const state = (
        component as unknown as { getState: () => Record<string, unknown> }
      ).getState();

      expect(state).toHaveProperty('dyeCount', 3);
      expect(state).toHaveProperty('dyeNames');
      expect((state.dyeNames as string[]).length).toBe(3);
    });

    it('should return empty state when no dyes', () => {
      component = new ColorDistanceMatrix(container);
      component.init();

      const state = (
        component as unknown as { getState: () => Record<string, unknown> }
      ).getState();

      expect(state.dyeCount).toBe(0);
      expect((state.dyeNames as string[]).length).toBe(0);
    });
  });

  // ==========================================================================
  // Table Structure
  // ==========================================================================

  describe('table structure', () => {
    it('should have overflow container for horizontal scroll', () => {
      component = new ColorDistanceMatrix(container, mockDyes);
      component.init();

      const overflow = container.querySelector('.overflow-x-auto');
      expect(overflow).not.toBeNull();
    });

    it('should have proper table borders', () => {
      component = new ColorDistanceMatrix(container, mockDyes);
      component.init();

      const bordered = container.querySelector('.border');
      expect(bordered).not.toBeNull();
    });

    it('should have thead and tbody', () => {
      component = new ColorDistanceMatrix(container, mockDyes);
      component.init();

      expect(container.querySelector('thead')).not.toBeNull();
      expect(container.querySelector('tbody')).not.toBeNull();
    });
  });

  // ==========================================================================
  // Dye Names
  // ==========================================================================

  describe('dye names', () => {
    it('should display dye names in headers', () => {
      component = new ColorDistanceMatrix(container, mockDyes);
      component.init();

      // Check header contains dye name (or truncated version)
      expect(container.textContent).toContain('Red');
      expect(container.textContent).toContain('Green');
      expect(container.textContent).toContain('Blue');
    });

    it('should truncate long dye names', () => {
      const longNameDye = createMockDye(
        9010,
        'Very Long Dye Name That Should Be Truncated',
        '#AABBCC'
      );
      component = new ColorDistanceMatrix(container, [longNameDye]);
      component.init();

      // The component truncates to 12 characters
      const spans = container.querySelectorAll('span');
      let found = false;
      spans.forEach((span) => {
        if (span.textContent && span.textContent.length <= 12) {
          found = true;
        }
      });
      expect(found).toBe(true);
    });
  });

  // ==========================================================================
  // Single Dye
  // ==========================================================================

  describe('single dye', () => {
    it('should render 1x1 matrix for single dye', () => {
      component = new ColorDistanceMatrix(container, [mockDyes[0]]);
      component.init();

      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);

      const cells = rows[0].querySelectorAll('td');
      // 1 row header + 1 data cell
      expect(cells.length).toBe(2);
    });

    it('should show 0.0 for single dye diagonal', () => {
      component = new ColorDistanceMatrix(container, [mockDyes[0]]);
      component.init();

      expect(container.textContent).toContain('0.0');
    });
  });

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  describe('cleanup', () => {
    it('should clean up without error', () => {
      component = new ColorDistanceMatrix(container, mockDyes);
      component.init();

      expect(() => component.destroy()).not.toThrow();
    });
  });
});
