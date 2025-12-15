/**
 * XIV Dye Tools - Component Testing Utilities
 *
 * Provides helpers for testing BaseComponent and its subclasses.
 * DOM utilities are imported from @xivdyetools/test-utils.
 *
 * @module components/__tests__/test-utils
 */

import userEvent from '@testing-library/user-event';
import type { BaseComponent } from '../base-component';

import { vi } from 'vitest';

// Import shared DOM utilities from @xivdyetools/test-utils
import {
  MockLocalStorage,
  setupMockLocalStorage,
  setupResizeObserverMock,
  setupCanvasMocks,
  setupFetchMock as setupFetchMockFromPackage,
} from '@xivdyetools/test-utils';

// Re-export shared utilities for convenience
export {
  MockLocalStorage,
  setupMockLocalStorage,
  setupResizeObserverMock,
  setupCanvasMocks,
};

// Re-export the package version as well for cases that use the new API
export { setupFetchMockFromPackage };

/**
 * Backwards-compatible setupFetchMock that returns a Vitest mock function.
 * This allows tests to use .mockImplementation() on the returned mock.
 *
 * @returns A vi.fn() mock that replaces global.fetch
 */
export function setupFetchMock(): ReturnType<typeof vi.fn> {
  const originalFetch = globalThis.fetch;
  const mockFetch = vi.fn();

  // Replace global fetch with our mock
  globalThis.fetch = mockFetch as unknown as typeof fetch;

  // Attach restore method to the mock for cleanup
  (mockFetch as ReturnType<typeof vi.fn> & { restore: () => void }).restore = () => {
    globalThis.fetch = originalFetch;
  };

  return mockFetch;
}

// ============================================
// PROJECT-SPECIFIC: COMPONENT TESTING HELPERS
// ============================================

/**
 * Create a container element for testing components
 */
export function createTestContainer(id = 'test-container'): HTMLElement {
  const container = document.createElement('div');
  container.id = id;
  document.body.appendChild(container);
  return container;
}

/**
 * Clean up a test container
 */
export function cleanupTestContainer(container: HTMLElement): void {
  container.remove();
}

/**
 * Setup and render a component for testing
 * @returns Tuple of [component instance, container element]
 */
export function renderComponent<T extends BaseComponent>(
  ComponentClass: new (container: HTMLElement) => T,
  containerId = 'test-container'
): [T, HTMLElement] {
  const container = createTestContainer(containerId);
  const component = new ComponentClass(container);
  component.init();
  return [component, container];
}

/**
 * Setup component without initializing (for testing constructor)
 */
export function createComponent<T extends BaseComponent>(
  ComponentClass: new (container: HTMLElement) => T,
  containerId = 'test-container'
): [T, HTMLElement] {
  const container = createTestContainer(containerId);
  const component = new ComponentClass(container);
  return [component, container];
}

/**
 * Cleanup a component and its container
 */
export function cleanupComponent(component: BaseComponent, container: HTMLElement): void {
  component.destroy();
  cleanupTestContainer(container);
}

/**
 * Wait for component to finish async operations
 */
export async function waitForComponent(delay = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delay));
}

// ============================================
// PROJECT-SPECIFIC: MOCK DATA
// ============================================

/**
 * Mock dye data for testing
 */
export const mockDyeData = [
  {
    itemID: 1,
    id: 1,
    name: 'Jet Black',
    hex: '#000000',
    rgb: { r: 0, g: 0, b: 0 },
    hsv: { h: 0, s: 0, v: 0 },
    category: 'Neutral',
    acquisition: 'Weaver',
    cost: 0,
    isMetallic: false,
    isPastel: false,
    isDark: true,
    isCosmic: false,
  },
  {
    itemID: 2,
    id: 2,
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
  },
  {
    itemID: 3,
    id: 3,
    name: 'Rose Pink',
    hex: '#FF69B4',
    rgb: { r: 255, g: 105, b: 180 },
    hsv: { h: 330, s: 59, v: 100 },
    category: 'Red',
    acquisition: 'Weaver',
    cost: 100,
    isMetallic: false,
    isPastel: true,
    isDark: false,
    isCosmic: false,
  },
  {
    itemID: 4,
    id: 4,
    name: 'Sky Blue',
    hex: '#87CEEB',
    rgb: { r: 135, g: 206, b: 235 },
    hsv: { h: 197, s: 43, v: 92 },
    category: 'Blue',
    acquisition: 'Weaver',
    cost: 100,
    isMetallic: false,
    isPastel: true,
    isDark: false,
    isCosmic: false,
  },
];

/**
 * Mock theme data for testing
 */
export const mockThemes = [
  { name: 'standard-light', palette: 'standard', isDark: false },
  { name: 'standard-dark', palette: 'standard', isDark: true },
  { name: 'hydaelyn-light', palette: 'hydaelyn', isDark: false },
];

// ============================================
// TESTING LIBRARY RE-EXPORTS
// ============================================

/**
 * Query helpers (re-export from @testing-library/dom)
 */
export { screen, waitFor, within } from '@testing-library/dom';

/**
 * User interaction helpers (re-export from @testing-library/user-event)
 */
export { userEvent };

// ============================================
// PROJECT-SPECIFIC: DOM ELEMENT ASSERTIONS
// ============================================

/**
 * Assertions for DOM elements
 */
export const expectElement = {
  toBeVisible(element: HTMLElement | null): void {
    expect(element).not.toBeNull();
    expect(element!.style.display).not.toBe('none');
  },

  toBeHidden(element: HTMLElement | null): void {
    if (element === null) {
      expect(element).toBeNull();
    } else {
      expect(element.style.display).toBe('none');
    }
  },

  toHaveClass(element: HTMLElement | null, className: string): void {
    expect(element).not.toBeNull();
    expect(element!.classList.contains(className)).toBe(true);
  },

  toNotHaveClass(element: HTMLElement | null, className: string): void {
    expect(element).not.toBeNull();
    expect(element!.classList.contains(className)).toBe(false);
  },

  toHaveText(element: HTMLElement | null, text: string): void {
    expect(element).not.toBeNull();
    expect(element!.textContent).toContain(text);
  },

  toHaveAttribute(element: HTMLElement | null, attr: string, value?: string): void {
    expect(element).not.toBeNull();
    if (value !== undefined) {
      expect(element!.getAttribute(attr)).toBe(value);
    } else {
      expect(element!.hasAttribute(attr)).toBe(true);
    }
  },
};
