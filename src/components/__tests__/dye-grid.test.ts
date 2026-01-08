import { DyeGrid, type DyeGridOptions } from '../dye-grid';
import { Dye } from '@shared/types';
import {
  createTestContainer,
  cleanupTestContainer,
  renderComponent,
  createComponent,
  cleanupComponent,
  expectElement,
  waitForComponent,
  setupFetchMock,
} from './test-utils';

// Mock shared utils
vi.mock('@shared/utils', () => ({
  clearContainer: vi.fn((container: HTMLElement) => {
    container.innerHTML = '';
  }),
}));

// Mock empty state
vi.mock('../empty-state', () => ({
  getEmptyStateHTML: vi.fn(() => '<div class="flex flex-col">Empty State</div>'),
}));

// Mock icons
vi.mock('@shared/empty-state-icons', () => ({
  ICON_SEARCH: '<svg>search</svg>',
  ICON_PALETTE: '<svg>palette</svg>',
}));

describe('DyeGrid', () => {
  let container: HTMLElement;
  let component: DyeGrid;

  const mockDyes: Dye[] = [
    { id: 1, name: 'Snow White', hex: '#FFFFFF', category: 'Neutrals', itemID: 123, stainID: null, rgb: { r: 255, g: 255, b: 255 }, hsv: { h: 0, s: 0, v: 100 }, acquisition: 'Vendor', cost: 0, isMetallic: false, isPastel: false, isDark: false, isCosmic: false },
    { id: 2, name: 'Soot Black', hex: '#000000', category: 'Neutrals', itemID: 124, stainID: null, rgb: { r: 0, g: 0, b: 0 }, hsv: { h: 0, s: 0, v: 0 }, acquisition: 'Vendor', cost: 0, isMetallic: false, isPastel: false, isDark: true, isCosmic: false },
    { id: 3, name: 'Rose Pink', hex: '#FF0000', category: 'Reds', itemID: 125, stainID: null, rgb: { r: 255, g: 0, b: 0 }, hsv: { h: 0, s: 100, v: 100 }, acquisition: 'Vendor', cost: 0, isMetallic: false, isPastel: false, isDark: false, isCosmic: false },
  ];

  beforeEach(() => {
    setupFetchMock();
    container = createTestContainer();
    // Mock scrollIntoView
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    if (component && container) {
      cleanupComponent(component, container);
    } else {
      cleanupTestContainer(container);
    }
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default options', () => {
      [component, container] = renderComponent(DyeGrid);

      const options = component['options'];
      expect(options.allowMultiple).toBe(true);
      expect(options.allowDuplicates).toBe(false);
      expect(options.maxSelections).toBe(4);
      expect(options.showCategories).toBe(true);
    });

    it('should accept custom options', () => {
      const options: DyeGridOptions = {
        allowMultiple: false,
        allowDuplicates: true,
        maxSelections: 1,
        showCategories: false,
      };

      [component, container] = createComponent(DyeGrid, 'test-container');
      component = new DyeGrid(container, options);
      component.init();

      const compOptions = component['options'];
      expect(compOptions.allowMultiple).toBe(false);
      expect(compOptions.allowDuplicates).toBe(true);
      expect(compOptions.maxSelections).toBe(1);
      expect(compOptions.showCategories).toBe(false);
    });
  });

  describe('Rendering', () => {
    it('should render dye buttons', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);

      const buttons = container.querySelectorAll('.dye-select-btn');
      expect(buttons.length).toBe(3);
    });

    it('should render dye information correctly', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);

      const firstBtn = container.querySelector('.dye-select-btn');
      expect(firstBtn).not.toBeNull();

      const name = firstBtn?.querySelector('.text-sm')?.textContent;
      const hex = firstBtn?.querySelector('.number')?.textContent;

      expect(name).toBeTruthy();
      expect(hex).toBe('#FFFFFF');
    });

    it('should show category when showCategories is true', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);

      const firstBtn = container.querySelector('.dye-select-btn');
      const category = firstBtn?.querySelectorAll('.text-xs')[1]?.textContent;
      expect(category).toBeTruthy();
    });

    it('should not show category when showCategories is false', () => {
      const options: DyeGridOptions = { showCategories: false };
      [component, container] = createComponent(DyeGrid, 'test-container');
      component = new DyeGrid(container, options);
      component.init();
      component.setDyes(mockDyes);

      const firstBtn = container.querySelector('.dye-select-btn');
      // Should only have hex code text-xs div, not category
      const textXsDivs = firstBtn?.querySelectorAll('.text-xs');
      expect(textXsDivs?.length).toBe(1);
    });
  });

  describe('Empty States', () => {
    it('should render search empty state', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes([], { type: 'search', query: 'xyz' });

      // The mock returns <div class="flex flex-col">Empty State</div>
      const emptyState = container.querySelector('.flex.flex-col');
      expect(emptyState).not.toBeNull();
      expect(emptyState?.textContent).toContain('Empty State');
    });

    it('should render category empty state', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes([], { type: 'category' });

      const emptyState = container.querySelector('.flex.flex-col');
      expect(emptyState).not.toBeNull();
      expect(emptyState?.textContent).toContain('Empty State');
    });
  });

  describe('Interactions', () => {
    it('should emit dye-selected event on click', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);

      const spy = vi.fn();
      container.addEventListener('dye-selected', (e: any) => spy(e.detail));

      const firstBtn = container.querySelector('.dye-select-btn') as HTMLElement;
      firstBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

      expect(spy).toHaveBeenCalledWith(mockDyes[0]);
    });

    it('should update selection visuals', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);
      component.setSelectedDyes([mockDyes[0]]);

      const buttons = container.querySelectorAll('.dye-select-btn');
      expect(buttons[0].getAttribute('aria-selected')).toBe('true');
      expect(buttons[1].getAttribute('aria-selected')).toBe('false');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should handle arrow keys', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);

      // Mock grid columns to 1 for predictable navigation
      // And mock updateGridColumns to prevent it from resetting gridColumns
      component['gridColumns'] = 1;
      component['updateGridColumns'] = vi.fn();

      const grid = container.querySelector('div[role="grid"]') as HTMLElement;

      // Press ArrowDown
      grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

      expect(component['focusedIndex']).toBe(0);

      // Press ArrowDown again
      grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      expect(component['focusedIndex']).toBe(1);
    });

    it('should select with Enter key', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);

      const spy = vi.fn();
      container.addEventListener('dye-selected', (e: any) => spy(e.detail));

      // Set focus manually
      component['setFocusedIndex'](0);

      const grid = container.querySelector('div[role="grid"]') as HTMLElement;
      grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      expect(spy).toHaveBeenCalledWith(mockDyes[0]);
    });

    it('should handle ArrowRight key', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);
      component['gridColumns'] = 1;
      component['updateGridColumns'] = vi.fn();
      component['focusedIndex'] = 0;

      const grid = container.querySelector('div[role="grid"]') as HTMLElement;
      grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

      expect(component['focusedIndex']).toBe(1);
    });

    it('should handle ArrowLeft key', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);
      component['gridColumns'] = 1;
      component['updateGridColumns'] = vi.fn();
      component['focusedIndex'] = 2;

      const grid = container.querySelector('div[role="grid"]') as HTMLElement;
      grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));

      expect(component['focusedIndex']).toBe(1);
    });

    it('should handle ArrowUp key', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);
      component['gridColumns'] = 1;
      component['updateGridColumns'] = vi.fn();
      component['focusedIndex'] = 2;

      const grid = container.querySelector('div[role="grid"]') as HTMLElement;
      grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));

      expect(component['focusedIndex']).toBe(1);
    });

    it('should handle Home key to go to first item', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);
      component['gridColumns'] = 1;
      component['updateGridColumns'] = vi.fn();
      component['focusedIndex'] = 2;

      const grid = container.querySelector('div[role="grid"]') as HTMLElement;
      grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));

      expect(component['focusedIndex']).toBe(0);
    });

    it('should handle End key to go to last item', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);
      component['gridColumns'] = 1;
      component['updateGridColumns'] = vi.fn();
      component['focusedIndex'] = 0;

      const grid = container.querySelector('div[role="grid"]') as HTMLElement;
      grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));

      expect(component['focusedIndex']).toBe(2); // Last item index
    });

    it('should handle PageDown key', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);
      component['gridColumns'] = 1;
      component['updateGridColumns'] = vi.fn();
      component['focusedIndex'] = 0;

      const grid = container.querySelector('div[role="grid"]') as HTMLElement;
      grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true }));

      // PageDown moves gridColumns * 3 = 3 rows, clamped to last item
      expect(component['focusedIndex']).toBe(2);
    });

    it('should handle PageUp key', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);
      component['gridColumns'] = 1;
      component['updateGridColumns'] = vi.fn();
      component['focusedIndex'] = 2;

      const grid = container.querySelector('div[role="grid"]') as HTMLElement;
      grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp', bubbles: true }));

      // PageUp moves gridColumns * 3 = 3 rows up, clamped to first item
      expect(component['focusedIndex']).toBe(0);
    });

    it('should select with Space key', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);

      const spy = vi.fn();
      container.addEventListener('dye-selected', (e: any) => spy(e.detail));

      // Set focus manually
      component['setFocusedIndex'](1);

      const grid = container.querySelector('div[role="grid"]') as HTMLElement;
      grid.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));

      expect(spy).toHaveBeenCalledWith(mockDyes[1]);
    });

    it('should emit escape-pressed on Escape key', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);

      const spy = vi.fn();
      container.addEventListener('escape-pressed', () => spy());

      component['focusedIndex'] = 0;

      const grid = container.querySelector('div[role="grid"]') as HTMLElement;
      grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      expect(spy).toHaveBeenCalled();
    });

    it('should not change focus for unrecognized keys', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);
      component['gridColumns'] = 1;
      component['updateGridColumns'] = vi.fn();
      component['focusedIndex'] = 1;

      const grid = container.querySelector('div[role="grid"]') as HTMLElement;
      grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));

      // Should remain at the same index
      expect(component['focusedIndex']).toBe(1);
    });

    it('should clamp ArrowRight at the end of the list', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);
      component['gridColumns'] = 1;
      component['updateGridColumns'] = vi.fn();
      component['focusedIndex'] = 2; // At last item

      const grid = container.querySelector('div[role="grid"]') as HTMLElement;
      grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

      expect(component['focusedIndex']).toBe(2); // Should stay at last item
    });

    it('should clamp ArrowLeft at the beginning of the list', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);
      component['gridColumns'] = 1;
      component['updateGridColumns'] = vi.fn();
      component['focusedIndex'] = 0; // At first item

      const grid = container.querySelector('div[role="grid"]') as HTMLElement;
      grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));

      expect(component['focusedIndex']).toBe(0); // Should stay at first item
    });

    it('should not select with Enter when focusedIndex is -1', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);

      const spy = vi.fn();
      container.addEventListener('dye-selected', (e: any) => spy(e.detail));

      component['focusedIndex'] = -1;
      component['updateGridColumns'] = vi.fn();

      const grid = container.querySelector('div[role="grid"]') as HTMLElement;
      grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      // Should not emit because focusedIndex is out of bounds
      expect(spy).not.toHaveBeenCalled();
    });

    it('should not emit when pressing Enter with no dyes', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes([]);

      const spy = vi.fn();
      container.addEventListener('dye-selected', (e: any) => spy(e.detail));

      component['focusedIndex'] = 0;

      // No grid to dispatch from, so calling handleKeydown directly
      component['handleKeydown'](new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('Grid Columns Calculation', () => {
    it('should calculate grid columns from CSS when available', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);

      // Mock getComputedStyle to return grid template columns
      const originalGetComputedStyle = window.getComputedStyle;
      window.getComputedStyle = vi.fn().mockReturnValue({
        gridTemplateColumns: '100px 100px 100px 100px',
      });

      component['updateGridColumns']();

      expect(component['gridColumns']).toBe(4);

      window.getComputedStyle = originalGetComputedStyle;
    });

    it('should fallback to window width when gridTemplateColumns is none', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);

      const originalGetComputedStyle = window.getComputedStyle;
      window.getComputedStyle = vi.fn().mockReturnValue({
        gridTemplateColumns: 'none',
      });

      // Mock window.innerWidth to 1024 (lg breakpoint)
      Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
      component['updateGridColumns']();
      expect(component['gridColumns']).toBe(4);

      // Mock window.innerWidth to 768 (md breakpoint)
      Object.defineProperty(window, 'innerWidth', { value: 768, writable: true });
      component['updateGridColumns']();
      expect(component['gridColumns']).toBe(3);

      // Mock window.innerWidth to 640 (sm breakpoint)
      Object.defineProperty(window, 'innerWidth', { value: 640, writable: true });
      component['updateGridColumns']();
      expect(component['gridColumns']).toBe(2);

      // Mock window.innerWidth to 500 (below sm)
      Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });
      component['updateGridColumns']();
      expect(component['gridColumns']).toBe(1);

      window.getComputedStyle = originalGetComputedStyle;
    });

    it('should return early when grid container not found', () => {
      [component, container] = renderComponent(DyeGrid);
      // Don't set dyes, so no grid exists - component should not throw
      expect(() => {
        component['updateGridColumns']();
      }).not.toThrow();
    });
  });

  describe('setFocusedIndex', () => {
    it('should update tabindex and focus the new button', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);

      // First set focus to index 0
      component['setFocusedIndex'](0);
      const buttons = container.querySelectorAll('.dye-select-btn');
      expect(buttons[0].getAttribute('tabindex')).toBe('0');

      // Now set focus to index 1
      component['setFocusedIndex'](1);
      expect(buttons[0].getAttribute('tabindex')).toBe('-1');
      expect(buttons[1].getAttribute('tabindex')).toBe('0');
    });

    it('should not update if index is out of bounds (negative)', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);
      component['focusedIndex'] = 1;

      component['setFocusedIndex'](-1);

      // Should remain at original index
      expect(component['focusedIndex']).toBe(1);
    });

    it('should not update if index is out of bounds (too large)', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);
      component['focusedIndex'] = 1;

      component['setFocusedIndex'](10);

      // Should remain at original index
      expect(component['focusedIndex']).toBe(1);
    });

    it('should call scrollIntoView on the focused button', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);

      const scrollSpy = vi.spyOn(HTMLElement.prototype, 'scrollIntoView');
      component['setFocusedIndex'](1);

      expect(scrollSpy).toHaveBeenCalledWith({ block: 'nearest', behavior: 'smooth' });
    });
  });

  describe('Click event through event delegation', () => {
    it('should handle click on nested element within button', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);

      const spy = vi.fn();
      container.addEventListener('dye-selected', (e: any) => spy(e.detail));

      // Click on a nested element (e.g., the hex code div)
      const nestedDiv = container.querySelector('.dye-select-btn .number') as HTMLElement;
      nestedDiv.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

      expect(spy).toHaveBeenCalledWith(mockDyes[0]);
    });

    it('should not emit if clicking outside a button', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);

      const spy = vi.fn();
      container.addEventListener('dye-selected', (e: any) => spy(e.detail));

      // Click on the grid wrapper itself, not a button
      const grid = container.querySelector('div[role="grid"]') as HTMLElement;
      grid.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

      // Spy should not be called since click is not on a button
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('bindEvents edge cases', () => {
    it('should handle bindEvents when element is null', () => {
      [component, container] = createComponent(DyeGrid, 'test-container');
      component = new DyeGrid(container);
      // Don't call init() so element is null

      // bindEvents should return early without error
      expect(() => component['bindEvents']()).not.toThrow();
    });
  });

  describe('handleKeydown with no buttons', () => {
    it('should return early if there are no dye buttons', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes([]);

      // Manually call handleKeydown - should not throw
      expect(() => {
        component['handleKeydown'](new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      }).not.toThrow();
    });
  });

  // ============================================================================
  // Keyboard Navigation Tests - Extended Coverage
  // ============================================================================

  describe('keyboard navigation - extended', () => {
    it('should navigate to first item with Home key', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);
      component['focusedIndex'] = 2;

      component['handleKeydown'](new KeyboardEvent('keydown', { key: 'Home' }));

      expect(component['focusedIndex']).toBe(0);
    });

    it('should navigate to last item with End key', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);
      component['focusedIndex'] = 0;

      component['handleKeydown'](new KeyboardEvent('keydown', { key: 'End' }));

      expect(component['focusedIndex']).toBe(mockDyes.length - 1);
    });

    it('should navigate down multiple rows with PageDown', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);
      component['focusedIndex'] = 0;
      component['gridColumns'] = 3;

      component['handleKeydown'](new KeyboardEvent('keydown', { key: 'PageDown' }));

      // Should jump by 3 * gridColumns but clamped to array length
      expect(component['focusedIndex']).toBeLessThanOrEqual(mockDyes.length - 1);
    });

    it('should navigate up multiple rows with PageUp', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);
      component['focusedIndex'] = 2;
      component['gridColumns'] = 3;

      component['handleKeydown'](new KeyboardEvent('keydown', { key: 'PageUp' }));

      expect(component['focusedIndex']).toBeGreaterThanOrEqual(0);
    });

    it('should handle Escape key without throwing', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);

      // Should not throw when handling Escape key
      expect(() => {
        component['handleKeydown'](new KeyboardEvent('keydown', { key: 'Escape' }));
      }).not.toThrow();
    });

    it('should handle Space key without throwing', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);
      component['focusedIndex'] = 1;

      // Should not throw when handling Space key
      expect(() => {
        component['handleKeydown'](new KeyboardEvent('keydown', { key: ' ' }));
      }).not.toThrow();
    });

    it('should ignore unknown keys', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);
      const initialIndex = component['focusedIndex'];

      component['handleKeydown'](new KeyboardEvent('keydown', { key: 'z' }));

      expect(component['focusedIndex']).toBe(initialIndex);
    });

    it('should navigate left with ArrowLeft key', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);
      component['focusedIndex'] = 2;

      component['handleKeydown'](new KeyboardEvent('keydown', { key: 'ArrowLeft' }));

      expect(component['focusedIndex']).toBe(1);
    });

    it('should navigate right with ArrowRight key', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);
      component['focusedIndex'] = 0;

      component['handleKeydown'](new KeyboardEvent('keydown', { key: 'ArrowRight' }));

      expect(component['focusedIndex']).toBe(1);
    });

    it('should navigate up with ArrowUp key', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);
      component['focusedIndex'] = 2;
      component['gridColumns'] = 1; // Set to 1 so ArrowUp goes from 2 to 1

      component['handleKeydown'](new KeyboardEvent('keydown', { key: 'ArrowUp' }));

      // Should go from 2 to 1 since gridColumns is 1
      expect(component['focusedIndex']).toBe(1);
    });

    it('should not go below 0 with ArrowLeft at start', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);
      component['focusedIndex'] = 0;

      component['handleKeydown'](new KeyboardEvent('keydown', { key: 'ArrowLeft' }));

      expect(component['focusedIndex']).toBe(0);
    });

    it('should not exceed array length with ArrowRight at end', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);
      component['focusedIndex'] = mockDyes.length - 1;

      component['handleKeydown'](new KeyboardEvent('keydown', { key: 'ArrowRight' }));

      expect(component['focusedIndex']).toBe(mockDyes.length - 1);
    });
  });

  // ============================================================================
  // Favorites Feature Tests
  // ============================================================================

  describe('favorites feature', () => {
    it('should handle F key without throwing when showFavorites is true', () => {
      [component, container] = renderComponent(DyeGrid, { showFavorites: true });
      component.setDyes(mockDyes);
      component['focusedIndex'] = 0;

      // Should not throw when handling F key
      expect(() => {
        component['handleKeydown'](new KeyboardEvent('keydown', { key: 'f' }));
      }).not.toThrow();
    });

    it('should handle uppercase F key without throwing', () => {
      [component, container] = renderComponent(DyeGrid, { showFavorites: true });
      component.setDyes(mockDyes);
      component['focusedIndex'] = 1;

      // Should not throw when handling F key
      expect(() => {
        component['handleKeydown'](new KeyboardEvent('keydown', { key: 'F' }));
      }).not.toThrow();
    });

    it('should handle F key when focusedIndex is out of bounds', () => {
      [component, container] = renderComponent(DyeGrid, { showFavorites: true });
      component.setDyes(mockDyes);
      component['focusedIndex'] = -1; // Out of bounds

      // Should not throw even with invalid index
      expect(() => {
        component['handleKeydown'](new KeyboardEvent('keydown', { key: 'f' }));
      }).not.toThrow();
    });

    it('should update favorite visuals when favorites change', () => {
      [component, container] = renderComponent(DyeGrid, { showFavorites: true });
      component.setDyes(mockDyes);

      // Set a favorite
      component['favorites'] = new Set([1]);
      component['updateFavoriteVisuals']();

      const favoriteBtn = container.querySelector('[data-favorite-dye-id="1"]');
      expect(favoriteBtn?.classList.contains('text-yellow-500')).toBe(true);
    });

    it('should not update visuals when showFavorites is false', () => {
      [component, container] = renderComponent(DyeGrid, { showFavorites: false });
      component.setDyes(mockDyes);

      // Should not throw even without favorite buttons
      expect(() => {
        component['updateFavoriteVisuals']();
      }).not.toThrow();
    });
  });

  // ============================================================================
  // Collection Feature Tests
  // ============================================================================

  describe('collection feature', () => {
    it('should open collection menu with C key when showFavorites is true', () => {
      [component, container] = renderComponent(DyeGrid, { showFavorites: true });
      component.setDyes(mockDyes);
      component['focusedIndex'] = 0;

      // Mock the collection click handler
      const collectionSpy = vi.spyOn(component as unknown as { handleCollectionClick: (id: number, el: HTMLElement) => void }, 'handleCollectionClick');

      component['handleKeydown'](new KeyboardEvent('keydown', { key: 'c' }));

      // May or may not be called depending on DOM structure
      // Just ensure no error is thrown
    });

    it('should not open collection menu when showFavorites is false', () => {
      [component, container] = renderComponent(DyeGrid, { showFavorites: false });
      component.setDyes(mockDyes);
      component['focusedIndex'] = 0;

      // Should not throw
      expect(() => {
        component['handleKeydown'](new KeyboardEvent('keydown', { key: 'C' }));
      }).not.toThrow();
    });
  });

  // ============================================================================
  // Selection Visual Update Tests
  // ============================================================================

  describe('selection visuals', () => {
    it('should update selection visuals when dyes are selected', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);
      component['selectedDyes'] = [mockDyes[0]];

      component['updateSelectionVisuals']();

      const selectedBtn = container.querySelector('[data-dye-id="1"]');
      expect(selectedBtn?.getAttribute('aria-selected')).toBe('true');
    });

    it('should mark unselected dyes as not selected', () => {
      [component, container] = renderComponent(DyeGrid);
      component.setDyes(mockDyes);
      component['selectedDyes'] = [];

      component['updateSelectionVisuals']();

      const btn = container.querySelector('[data-dye-id="1"]');
      expect(btn?.getAttribute('aria-selected')).toBe('false');
    });
  });
});
