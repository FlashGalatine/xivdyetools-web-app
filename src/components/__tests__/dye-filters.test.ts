/**
 * XIV Dye Tools - Dye Filters Component Tests
 *
 * Tests for the advanced dye filters UI component
 *
 * @module components/__tests__/dye-filters.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DyeFilters } from '../dye-filters';
import { createTestContainer, cleanupTestContainer, waitForComponent } from './test-utils';
import type { Dye } from '@shared/types';

// Mock the storage service
vi.mock('@services/storage-service', () => ({
  appStorage: {
    getItem: vi.fn((key: string, defaultValue: unknown) => defaultValue),
    setItem: vi.fn(),
  },
}));

// Mock dye data for filtering tests
const createMockDye = (overrides: Partial<Dye> = {}): Dye => ({
  id: 1,
  itemID: 30001,
  stainID: null,
  name: 'Test Dye',
  hex: '#FF0000',
  rgb: { r: 255, g: 0, b: 0 },
  hsv: { h: 0, s: 100, v: 100 },
  category: 'Red',
  acquisition: 'Vendor',
  cost: 0,
  isMetallic: false,
  isPastel: false,
  isDark: false,
  isCosmic: false,
  ...overrides,
});

describe('DyeFilters', () => {
  let container: HTMLElement;
  let component: DyeFilters;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    container = createTestContainer();
    container.id = 'test-filters';
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
    it('should render the filters section', () => {
      component = new DyeFilters(container);
      component.init();

      expect(container.children.length).toBeGreaterThan(0);
    });

    it('should render collapsible header', () => {
      component = new DyeFilters(container);
      component.init();

      const header = container.querySelector('button');
      expect(header).not.toBeNull();
    });

    it('should render all filter checkboxes', () => {
      component = new DyeFilters(container);
      component.init();

      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes.length).toBe(5);
    });

    it('should render filter labels', () => {
      component = new DyeFilters(container);
      component.init();

      // Check for actual translated filter labels
      expect(container.textContent).toContain('Metallic');
      expect(container.textContent).toContain('Pastel');
      expect(container.textContent).toContain('Dark');
      expect(container.textContent).toContain('Cosmic');
      expect(container.textContent).toContain('Expensive');
    });

    it('should render toggle chevron', () => {
      component = new DyeFilters(container);
      component.init();

      const chevron = container.querySelector('[id$="-toggle-chevron"]');
      expect(chevron).not.toBeNull();
      expect(chevron?.textContent).toBe('▼');
    });

    it('should start collapsed by default', () => {
      component = new DyeFilters(container);
      component.init();

      const checkboxesContainer = container.querySelector(
        '[id$="-checkboxes-container"]'
      ) as HTMLElement;
      expect(checkboxesContainer?.style.maxHeight).toBe('0px');
    });
  });

  // ==========================================================================
  // Toggle Behavior
  // ==========================================================================

  describe('toggle behavior', () => {
    it('should expand filters on header click', async () => {
      component = new DyeFilters(container);
      component.init();

      const header = container.querySelector('button') as HTMLButtonElement;
      const checkboxesContainer = container.querySelector(
        '[id$="-checkboxes-container"]'
      ) as HTMLElement;

      expect(checkboxesContainer.style.maxHeight).toBe('0px');

      header.click();
      await waitForComponent();

      expect(checkboxesContainer.style.maxHeight).toBe('500px');
    });

    it('should collapse filters on second click', async () => {
      component = new DyeFilters(container);
      component.init();

      const header = container.querySelector('button') as HTMLButtonElement;
      const checkboxesContainer = container.querySelector(
        '[id$="-checkboxes-container"]'
      ) as HTMLElement;

      // Expand
      header.click();
      await waitForComponent();
      expect(checkboxesContainer.style.maxHeight).toBe('500px');

      // Collapse
      header.click();
      await waitForComponent();
      expect(checkboxesContainer.style.maxHeight).toBe('0px');
    });

    it('should rotate chevron when expanded', async () => {
      component = new DyeFilters(container);
      component.init();

      const header = container.querySelector('button') as HTMLButtonElement;
      const chevron = container.querySelector('[id$="-toggle-chevron"]') as HTMLElement;

      // Initially rotated (collapsed)
      expect(chevron.style.transform).toBe('rotate(-90deg)');

      // Expand
      header.click();
      await waitForComponent();
      expect(chevron.style.transform).toBe('rotate(0deg)');
    });
  });

  // ==========================================================================
  // Filter Logic
  // ==========================================================================

  describe('filter logic', () => {
    // Helper to enable a checkbox by index
    const enableCheckbox = async (comp: DyeFilters, cont: HTMLElement, index: number) => {
      const checkboxes = cont.querySelectorAll(
        'input[type="checkbox"]'
      ) as NodeListOf<HTMLInputElement>;
      checkboxes[index].checked = true;
      checkboxes[index].dispatchEvent(new Event('change'));
      await waitForComponent();
    };

    it('should exclude metallic dyes when filter is enabled', async () => {
      component = new DyeFilters(container);
      component.init();

      // First checkbox is excludeMetallic
      await enableCheckbox(component, container, 0);

      const metallicDye = createMockDye({ name: 'Metallic Red', isMetallic: true });
      const regularDye = createMockDye({ name: 'Dalamud Red', isMetallic: false });

      expect(component.isDyeExcluded(metallicDye)).toBe(true);
      expect(component.isDyeExcluded(regularDye)).toBe(false);
    });

    it('should exclude pastel dyes when filter is enabled', async () => {
      component = new DyeFilters(container);
      component.init();

      // Second checkbox is excludePastel
      await enableCheckbox(component, container, 1);

      const pastelDye = createMockDye({ name: 'Pastel Pink', isPastel: true });
      const regularDye = createMockDye({ name: 'Coral Pink', isPastel: false });

      expect(component.isDyeExcluded(pastelDye)).toBe(true);
      expect(component.isDyeExcluded(regularDye)).toBe(false);
    });

    it('should exclude dark dyes when filter is enabled', async () => {
      component = new DyeFilters(container);
      component.init();

      // Third checkbox is excludeDark
      await enableCheckbox(component, container, 2);

      const darkDye = createMockDye({ name: 'Dark Red', isDark: true });
      const regularDye = createMockDye({ name: 'Blood Red', isDark: false });

      expect(component.isDyeExcluded(darkDye)).toBe(true);
      expect(component.isDyeExcluded(regularDye)).toBe(false);
    });

    it('should exclude cosmic dyes when filter is enabled', async () => {
      component = new DyeFilters(container);
      component.init();

      // Fourth checkbox is excludeCosmic
      await enableCheckbox(component, container, 3);

      const cosmicExploreDye = createMockDye({ acquisition: 'Cosmic Exploration', isCosmic: true });
      const cosmicFortuneDye = createMockDye({ acquisition: 'Cosmic Fortunes', isCosmic: true });
      const regularDye = createMockDye({ acquisition: 'Vendor', isCosmic: false });

      expect(component.isDyeExcluded(cosmicExploreDye)).toBe(true);
      expect(component.isDyeExcluded(cosmicFortuneDye)).toBe(true);
      expect(component.isDyeExcluded(regularDye)).toBe(false);
    });

    it('should have expensive filter checkbox', () => {
      component = new DyeFilters(container);
      component.init();

      // Verify 5 checkboxes exist (including expensive)
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes.length).toBe(5);
    });

    it('should not exclude any dyes when all filters are disabled', () => {
      component = new DyeFilters(container);
      component.init();

      const metallicDye = createMockDye({ name: 'Metallic Red' });
      const pastelDye = createMockDye({ name: 'Pastel Pink' });
      const darkDye = createMockDye({ name: 'Dark Blue' });

      expect(component.isDyeExcluded(metallicDye)).toBe(false);
      expect(component.isDyeExcluded(pastelDye)).toBe(false);
      expect(component.isDyeExcluded(darkDye)).toBe(false);
    });
  });

  // ==========================================================================
  // Filter Array Method
  // ==========================================================================

  describe('filterDyes method', () => {
    it('should filter out excluded dyes from array', async () => {
      component = new DyeFilters(container);
      component.init();

      // Enable excludeMetallic via checkbox interaction
      const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));
      await waitForComponent();

      const dyes = [
        createMockDye({ id: 1, name: 'Metallic Red', isMetallic: true }),
        createMockDye({ id: 2, name: 'Regular Red', isMetallic: false }),
        createMockDye({ id: 3, name: 'Metallic Blue', isMetallic: true }),
        createMockDye({ id: 4, name: 'Regular Blue', isMetallic: false }),
      ];

      const filtered = component.filterDyes(dyes);

      expect(filtered.length).toBe(2);
      expect(filtered.map((d) => d.id)).toEqual([2, 4]);
    });

    it('should return all dyes when no filters are enabled', () => {
      component = new DyeFilters(container);
      component.init();

      const dyes = [
        createMockDye({ id: 1, name: 'Metallic Red' }),
        createMockDye({ id: 2, name: 'Pastel Pink' }),
        createMockDye({ id: 3, name: 'Dark Blue' }),
      ];

      const filtered = component.filterDyes(dyes);

      expect(filtered.length).toBe(3);
    });

    it('should handle empty array', () => {
      component = new DyeFilters(container);
      component.init();

      const filtered = component.filterDyes([]);

      expect(filtered).toEqual([]);
    });
  });

  // ==========================================================================
  // Get/Set Filters
  // ==========================================================================

  describe('getFilters', () => {
    it('should return current filter configuration', () => {
      component = new DyeFilters(container);
      component.init();

      const filters = component.getFilters();

      expect(filters).toHaveProperty('excludeMetallic');
      expect(filters).toHaveProperty('excludePastel');
      expect(filters).toHaveProperty('excludeDark');
      expect(filters).toHaveProperty('excludeCosmic');
      expect(filters).toHaveProperty('excludeExpensive');
    });

    it('should return copy of filters (not reference)', () => {
      component = new DyeFilters(container);
      component.init();

      const filters1 = component.getFilters();
      const filters2 = component.getFilters();

      expect(filters1).not.toBe(filters2);
      expect(filters1).toEqual(filters2);
    });

    it('should start with all filters disabled', () => {
      component = new DyeFilters(container);
      component.init();

      const filters = component.getFilters();

      expect(filters.excludeMetallic).toBe(false);
      expect(filters.excludePastel).toBe(false);
      expect(filters.excludeDark).toBe(false);
      expect(filters.excludeCosmic).toBe(false);
      expect(filters.excludeExpensive).toBe(false);
    });
  });

  describe('setFilters', () => {
    it('should update filter values via checkbox interaction', async () => {
      component = new DyeFilters(container);
      component.init();

      // Expand filters first
      const header = container.querySelector('button') as HTMLButtonElement;
      header.click();
      await waitForComponent();

      // Find and check the first checkbox
      const checkboxes = container.querySelectorAll(
        'input[type="checkbox"]'
      ) as NodeListOf<HTMLInputElement>;
      expect(checkboxes.length).toBeGreaterThan(0);

      checkboxes[0].checked = true;
      checkboxes[0].dispatchEvent(new Event('change'));
      await waitForComponent();

      const filters = component.getFilters();
      // First checkbox should be excludeMetallic
      expect(filters.excludeMetallic).toBe(true);
    });

    it('should reflect checkbox state in filters', async () => {
      component = new DyeFilters(container);
      component.init();

      // Initially all filters should be false
      let filters = component.getFilters();
      expect(filters.excludeMetallic).toBe(false);

      // Check a checkbox
      const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));
      await waitForComponent();

      // Now the filter should be true
      filters = component.getFilters();
      expect(filters.excludeMetallic).toBe(true);
    });
  });

  // ==========================================================================
  // Events
  // ==========================================================================

  describe('events', () => {
    it('should call onFilterChange callback when filters change', async () => {
      const onFilterChange = vi.fn();
      component = new DyeFilters(container, { onFilterChange });
      component.init();

      component.setFilters({ excludeMetallic: true });

      expect(onFilterChange).toHaveBeenCalled();
    });

    it('should dispatch dye-filters-changed event', async () => {
      component = new DyeFilters(container);
      component.init();

      const eventSpy = vi.fn();
      container.addEventListener('dye-filters-changed', eventSpy);

      component.setFilters({ excludeMetallic: true });

      expect(eventSpy).toHaveBeenCalled();
    });

    it('should include filters in event detail', async () => {
      component = new DyeFilters(container);
      component.init();

      let eventDetail: unknown = null;
      container.addEventListener('dye-filters-changed', ((e: CustomEvent) => {
        eventDetail = e.detail;
      }) as EventListener);

      // Manually toggle checkbox to trigger event with correct state
      const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));
      await waitForComponent();

      expect(eventDetail).toHaveProperty('filters');
      expect(eventDetail).not.toBeNull();
    });
  });

  // ==========================================================================
  // Options
  // ==========================================================================

  describe('options', () => {
    it('should use custom storage key prefix', async () => {
      const { appStorage } = await import('@services/storage-service');
      component = new DyeFilters(container, { storageKeyPrefix: 'custom' });
      component.init();

      expect(appStorage.getItem).toHaveBeenCalledWith(
        'xivdyetools_custom_filters',
        expect.anything()
      );
    });

    it('should use default storage key prefix when not specified', async () => {
      const { appStorage } = await import('@services/storage-service');
      component = new DyeFilters(container);
      component.init();

      expect(appStorage.getItem).toHaveBeenCalledWith(
        'xivdyetools_harmony_filters',
        expect.anything()
      );
    });
  });

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  describe('cleanup', () => {
    it('should clean up without error', () => {
      component = new DyeFilters(container);
      component.init();

      expect(() => component.destroy()).not.toThrow();
    });
  });
});
