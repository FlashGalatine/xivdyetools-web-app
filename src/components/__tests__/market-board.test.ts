/**
 * XIV Dye Tools - Market Board Component Tests
 *
 * Tests for market board UI and Universalis API integration
 *
 * @module components/__tests__/market-board.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MarketBoard } from '../market-board';
import {
  createTestContainer,
  cleanupTestContainer,
  waitForComponent,
  setupFetchMock,
} from './test-utils';
import type { Dye } from '@shared/types';

// Mock data
const mockDataCenters = [
  { name: 'Crystal', region: 'NA', worlds: [1, 2, 3] },
  { name: 'Aether', region: 'NA', worlds: [4, 5, 6] },
];

const mockWorlds = [
  { id: 1, name: 'Balmung' },
  { id: 2, name: 'Brynhildr' },
  { id: 3, name: 'Coeurl' },
  { id: 4, name: 'Adamantoise' },
  { id: 5, name: 'Cactuar' },
  { id: 6, name: 'Faerie' },
];

// Mock the services
vi.mock('@services/index', () => ({
  APIService: {
    getInstance: vi.fn(() => ({
      clearCache: vi.fn().mockResolvedValue(undefined),
      getPriceData: vi.fn().mockResolvedValue({ minPrice: 1000, maxPrice: 5000 }),
    })),
    formatPrice: vi.fn((price: number) => `${price.toLocaleString()}G`),
  },
  LanguageService: {
    t: vi.fn((key: string) => {
      const translations: Record<string, string> = {
        'marketBoard.title': 'Market Board',
        'marketBoard.server': 'Server',
        'marketBoard.showPrices': 'Show Prices',
        'marketBoard.baseDyes': 'Base Dyes',
        'marketBoard.craftDyes': 'Craft Dyes',
        'marketBoard.alliedSocietyDyes': 'Allied Society Dyes',
        'marketBoard.cosmicDyes': 'Cosmic Dyes',
        'marketBoard.specialDyes': 'Special Dyes',
        'marketBoard.refresh': 'Refresh Prices',
        'marketBoard.refreshing': 'Refreshing...',
        'marketBoard.clearingCache': 'Clearing cache...',
        'marketBoard.pricesRefreshed': 'Prices refreshed!',
        'marketBoard.refreshError': 'Error refreshing prices',
        'marketBoard.allWorlds': 'All Worlds',
      };
      return translations[key] || key;
    }),
    subscribe: vi.fn(() => () => {}),
  },
}));

vi.mock('@services/storage-service', () => ({
  appStorage: {
    getItem: vi.fn((key: string, defaultValue: unknown) => defaultValue),
    setItem: vi.fn(),
  },
}));

describe('MarketBoard', () => {
  let container: HTMLElement;
  let component: MarketBoard;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    container = createTestContainer();

    // Setup fetch mock for server data
    fetchMock = setupFetchMock();
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('data-centers.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockDataCenters),
        });
      }
      if (url.includes('worlds.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockWorlds),
        });
      }
      return Promise.resolve({ ok: false });
    });
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
    it('should render the market board component', () => {
      component = new MarketBoard(container);
      component.init();

      // Note: Title is provided by parent CollapsiblePanel, so we check for content this component renders
      expect(container.textContent).toContain('Server');
    });

    it('should render server selection dropdown', () => {
      component = new MarketBoard(container);
      component.init();

      const serverSelect = container.querySelector('#mb-server-select');
      expect(serverSelect).not.toBeNull();
    });

    it('should render show prices toggle', () => {
      component = new MarketBoard(container);
      component.init();

      const toggle = container.querySelector('#show-mb-prices-toggle');
      expect(toggle).not.toBeNull();
    });

    it('should render category checkboxes', () => {
      component = new MarketBoard(container);
      component.init();

      const checkboxes = container.querySelectorAll('.mb-price-checkbox');
      expect(checkboxes.length).toBe(5); // 5 categories
    });

    it('should render refresh button', () => {
      component = new MarketBoard(container);
      component.init();

      const refreshBtn = container.querySelector('#mb-refresh-btn');
      expect(refreshBtn).not.toBeNull();
      expect(refreshBtn?.textContent).toBe('Refresh Prices');
    });
  });

  // ==========================================================================
  // Server Data Loading
  // ==========================================================================

  describe('loadServerData', () => {
    it('should load data centers and worlds', async () => {
      component = new MarketBoard(container);
      component.init();

      await component.loadServerData();

      expect(fetchMock).toHaveBeenCalledWith('/json/data-centers.json');
      expect(fetchMock).toHaveBeenCalledWith('/json/worlds.json');
    });

    it('should handle fetch errors gracefully', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 404 });

      component = new MarketBoard(container);
      component.init();

      // Should not throw
      await expect(component.loadServerData()).resolves.not.toThrow();
    });

    it('should populate server dropdown after loading', async () => {
      component = new MarketBoard(container);
      component.init();

      await component.loadServerData();
      await waitForComponent();

      const serverSelect = container.querySelector('#mb-server-select') as HTMLSelectElement;
      // Should have optgroups for data centers
      expect(serverSelect.querySelectorAll('optgroup').length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Toggle Behavior
  // ==========================================================================

  describe('show prices toggle', () => {
    it('should toggle price settings visibility', async () => {
      component = new MarketBoard(container);
      component.init();

      const toggle = container.querySelector('#show-mb-prices-toggle') as HTMLInputElement;
      const priceSettings = container.querySelector('#mb-price-settings');

      // Initially hidden (based on default showPrices = false)
      expect(priceSettings?.classList.contains('hidden')).toBe(true);

      // Toggle on
      toggle.checked = true;
      toggle.dispatchEvent(new Event('change'));
      await waitForComponent();

      expect(priceSettings?.classList.contains('hidden')).toBe(false);
    });

    it('should emit showPricesChanged event', async () => {
      component = new MarketBoard(container);
      component.init();

      const eventSpy = vi.fn();
      container.addEventListener('showPricesChanged', eventSpy);

      const toggle = container.querySelector('#show-mb-prices-toggle') as HTMLInputElement;
      toggle.checked = true;
      toggle.dispatchEvent(new Event('change'));
      await waitForComponent();

      expect(eventSpy).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Server Selection
  // ==========================================================================

  describe('server selection', () => {
    it('should emit server-changed event on selection', async () => {
      component = new MarketBoard(container);
      component.init();

      const eventSpy = vi.fn();
      container.addEventListener('server-changed', eventSpy);

      const serverSelect = container.querySelector('#mb-server-select') as HTMLSelectElement;
      serverSelect.value = 'Aether';
      serverSelect.dispatchEvent(new Event('change'));
      await waitForComponent();

      expect(eventSpy).toHaveBeenCalled();
    });

    it('should update selected server on change', async () => {
      component = new MarketBoard(container);
      component.init();

      // Load server data first so the dropdown has valid options
      await component.loadServerData();
      await waitForComponent();

      const serverSelect = container.querySelector('#mb-server-select') as HTMLSelectElement;
      // Use a value that exists after loading server data
      if (serverSelect.options.length > 1) {
        const validValue = serverSelect.options[1]?.value || 'Crystal';
        serverSelect.value = validValue;
        serverSelect.dispatchEvent(new Event('change'));
        await waitForComponent();

        expect(component.getSelectedServer()).toBe(validValue);
      } else {
        // Fallback - just verify default server is returned
        expect(component.getSelectedServer()).toBe('Crystal');
      }
    });
  });

  // ==========================================================================
  // Category Checkboxes
  // ==========================================================================

  describe('category checkboxes', () => {
    it('should emit categories-changed event on checkbox change', async () => {
      component = new MarketBoard(container);
      component.init();

      const eventSpy = vi.fn();
      container.addEventListener('categories-changed', eventSpy);

      const checkbox = container.querySelector('[data-category="baseDyes"]') as HTMLInputElement;
      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new Event('change'));
      await waitForComponent();

      expect(eventSpy).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Refresh Prices
  // ==========================================================================

  describe('refreshPrices', () => {
    it('should call clearCache and emit refresh-requested', async () => {
      component = new MarketBoard(container);
      component.init();

      const eventSpy = vi.fn();
      container.addEventListener('refresh-requested', eventSpy);

      await component.refreshPrices();

      expect(eventSpy).toHaveBeenCalled();
    });

    it('should disable button during refresh', async () => {
      component = new MarketBoard(container);
      component.init();

      const refreshBtn = container.querySelector('#mb-refresh-btn') as HTMLButtonElement;

      // Start refresh but don't wait
      const refreshPromise = component.refreshPrices();

      // Button should be disabled
      expect(refreshBtn.disabled).toBe(true);

      await refreshPromise;

      // Button should be re-enabled
      expect(refreshBtn.disabled).toBe(false);
    });

    it('should update status message during refresh', async () => {
      component = new MarketBoard(container);
      component.init();

      const statusMsg = container.querySelector('#mb-price-status');

      await component.refreshPrices();

      // Status should show success message
      expect(statusMsg?.textContent).toContain('refreshed');
    });

    it('should not refresh if already refreshing', async () => {
      component = new MarketBoard(container);
      component.init();

      const eventSpy = vi.fn();
      container.addEventListener('refresh-requested', eventSpy);

      // Start two refreshes simultaneously
      const promise1 = component.refreshPrices();
      const promise2 = component.refreshPrices();

      await Promise.all([promise1, promise2]);

      // Should only emit once
      expect(eventSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // shouldFetchPrice
  // ==========================================================================

  describe('shouldFetchPrice', () => {
    beforeEach(() => {
      component = new MarketBoard(container);
      component.init();
    });

    it('should return false for null dye', () => {
      expect(component.shouldFetchPrice(null as unknown as Dye)).toBe(false);
    });

    it('should return false for dye without itemID', () => {
      const dye = { name: 'Test' } as Dye;
      expect(component.shouldFetchPrice(dye)).toBe(false);
    });

    it('should return true for Special category dye when specialDyes enabled', () => {
      const dye = {
        itemID: 123,
        category: 'Special',
        acquisition: 'Unknown',
      } as Dye;

      expect(component.shouldFetchPrice(dye)).toBe(true);
    });

    it('should return false for dye without acquisition', () => {
      const dye = {
        itemID: 123,
        category: 'Red',
      } as Dye;

      expect(component.shouldFetchPrice(dye)).toBe(false);
    });
  });

  // ==========================================================================
  // fetchPrice
  // ==========================================================================

  describe('fetchPrice', () => {
    it('should return null if showPrices is false', async () => {
      component = new MarketBoard(container);
      component.init();

      const dye = {
        itemID: 123,
        name: 'Test Dye',
        category: 'Special',
        acquisition: 'Weaver',
      } as Dye;

      const result = await component.fetchPrice(dye);
      expect(result).toBeNull();
    });

    it('should return null if dye should not be fetched', async () => {
      component = new MarketBoard(container);
      component.init();

      // Enable show prices
      const toggle = container.querySelector('#show-mb-prices-toggle') as HTMLInputElement;
      toggle.checked = true;
      toggle.dispatchEvent(new Event('change'));

      const dye = {
        itemID: 123,
        name: 'Test Dye',
        category: 'Red', // Not Special
        // No acquisition
      } as Dye;

      const result = await component.fetchPrice(dye);
      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // fetchPricesForDyes
  // ==========================================================================

  describe('fetchPricesForDyes', () => {
    it('should fetch prices for multiple dyes', async () => {
      component = new MarketBoard(container);
      component.init();

      const dyes: Dye[] = [
        { itemID: 1, name: 'Dye 1', category: 'Special' } as Dye,
        { itemID: 2, name: 'Dye 2', category: 'Special' } as Dye,
      ];

      const results = await component.fetchPricesForDyes(dyes);

      // Results is a Map
      expect(results instanceof Map).toBe(true);
    });
  });

  // ==========================================================================
  // Static Methods
  // ==========================================================================

  describe('formatPrice', () => {
    it('should format price with G suffix', () => {
      const result = MarketBoard.formatPrice(1000);
      expect(result).toContain('G');
    });
  });

  // ==========================================================================
  // Getters
  // ==========================================================================

  describe('getters', () => {
    beforeEach(() => {
      component = new MarketBoard(container);
      component.init();
    });

    it('should return selected server', () => {
      expect(component.getSelectedServer()).toBe('Crystal'); // Default
    });

    it('should return show prices setting', () => {
      expect(component.getShowPrices()).toBe(false); // Default
    });

    it('should return price categories', () => {
      const categories = component.getPriceCategories();

      expect(categories).toHaveProperty('baseDyes');
      expect(categories).toHaveProperty('craftDyes');
      expect(categories).toHaveProperty('alliedSocietyDyes');
      expect(categories).toHaveProperty('cosmicDyes');
      expect(categories).toHaveProperty('specialDyes');
    });
  });

  // ==========================================================================
  // State Management
  // ==========================================================================

  describe('state management', () => {
    it('should return correct state', () => {
      component = new MarketBoard(container);
      component.init();

      const state = (
        component as unknown as { getState: () => Record<string, unknown> }
      ).getState();

      expect(state).toHaveProperty('selectedServer');
      expect(state).toHaveProperty('showPrices');
      expect(state).toHaveProperty('priceCategories');
    });
  });

  // ==========================================================================
  // Hover Effects
  // ==========================================================================

  describe('hover effects', () => {
    it('should apply brightness filter on refresh button hover', async () => {
      component = new MarketBoard(container);
      component.init();

      const refreshBtn = container.querySelector('#mb-refresh-btn') as HTMLButtonElement;

      refreshBtn.dispatchEvent(new MouseEvent('mouseenter'));
      expect(refreshBtn.style.filter).toContain('brightness');

      refreshBtn.dispatchEvent(new MouseEvent('mouseleave'));
      expect(refreshBtn.style.filter).toBe('');
    });

    it('should not apply brightness filter when button is disabled', async () => {
      component = new MarketBoard(container);
      component.init();

      const refreshBtn = container.querySelector('#mb-refresh-btn') as HTMLButtonElement;
      refreshBtn.disabled = true;

      refreshBtn.dispatchEvent(new MouseEvent('mouseenter'));
      // Filter should not be set when disabled
      expect(refreshBtn.style.filter).toBe('');
    });

    it('should apply mousedown/mouseup filter effects', async () => {
      component = new MarketBoard(container);
      component.init();

      const refreshBtn = container.querySelector('#mb-refresh-btn') as HTMLButtonElement;

      refreshBtn.dispatchEvent(new MouseEvent('mousedown'));
      expect(refreshBtn.style.filter).toContain('brightness(0.8)');

      refreshBtn.dispatchEvent(new MouseEvent('mouseup'));
      expect(refreshBtn.style.filter).toContain('brightness(0.9)');
    });

    it('should not apply mousedown filter when button is disabled', async () => {
      component = new MarketBoard(container);
      component.init();

      const refreshBtn = container.querySelector('#mb-refresh-btn') as HTMLButtonElement;
      refreshBtn.disabled = true;

      refreshBtn.dispatchEvent(new MouseEvent('mousedown'));
      expect(refreshBtn.style.filter).toBe('');

      refreshBtn.dispatchEvent(new MouseEvent('mouseup'));
      expect(refreshBtn.style.filter).toBe('');
    });
  });

  // ==========================================================================
  // Branch Coverage Tests - loadServerData
  // ==========================================================================

  describe('loadServerData branch coverage', () => {
    it('should handle network error gracefully', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      component = new MarketBoard(container);
      component.init();

      // Should not throw
      await expect(component.loadServerData()).resolves.not.toThrow();
    });

    it('should handle partial fetch failure', async () => {
      fetchMock.mockImplementation((url: string) => {
        if (url.includes('data-centers.json')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockDataCenters),
          });
        }
        // worlds.json fails
        return Promise.resolve({ ok: false, status: 500 });
      });

      component = new MarketBoard(container);
      component.init();

      await expect(component.loadServerData()).resolves.not.toThrow();
    });
  });

  // ==========================================================================
  // Branch Coverage Tests - shouldFetchPrice acquisition types
  // ==========================================================================

  describe('shouldFetchPrice acquisition branch coverage', () => {
    beforeEach(() => {
      component = new MarketBoard(container);
      component.init();
    });

    it('should return true for Base Dye with Dye Vendor acquisition when baseDyes enabled', () => {
      // Enable baseDyes checkbox (default is false)
      const baseDyesCheckbox = container.querySelector('#mb-price-baseDyes') as HTMLInputElement;
      baseDyesCheckbox.checked = true;
      baseDyesCheckbox.dispatchEvent(new Event('change'));

      const dye = {
        itemID: 123,
        category: 'Red',
        acquisition: 'Dye Vendor',
      } as Dye;

      expect(component.shouldFetchPrice(dye)).toBe(true);
    });

    it('should return true for Craft Dye with Crafting acquisition (default enabled)', () => {
      const dye = {
        itemID: 123,
        category: 'Red',
        acquisition: 'Crafting',
      } as Dye;

      expect(component.shouldFetchPrice(dye)).toBe(true);
    });

    it('should return true for Allied Society Dye when alliedSocietyDyes enabled', () => {
      // Enable alliedSocietyDyes checkbox (default is false)
      const alliedCheckbox = container.querySelector(
        '#mb-price-alliedSocietyDyes'
      ) as HTMLInputElement;
      alliedCheckbox.checked = true;
      alliedCheckbox.dispatchEvent(new Event('change'));

      const dye = {
        itemID: 123,
        category: 'Red',
        acquisition: "Amalj'aa Vendor",
      } as Dye;

      expect(component.shouldFetchPrice(dye)).toBe(true);
    });

    it('should return true for Cosmic Dye with Cosmic Exploration acquisition (default enabled)', () => {
      const dye = {
        itemID: 123,
        category: 'Red',
        acquisition: 'Cosmic Exploration',
      } as Dye;

      expect(component.shouldFetchPrice(dye)).toBe(true);
    });

    it('should return false for unknown acquisition type', () => {
      const dye = {
        itemID: 123,
        category: 'Red',
        acquisition: 'Unknown Source',
      } as Dye;

      expect(component.shouldFetchPrice(dye)).toBe(false);
    });
  });

  // ==========================================================================
  // Branch Coverage Tests - fetchPrice
  // ==========================================================================

  describe('fetchPrice branch coverage', () => {
    it('should return price data when showPrices is true and dye is valid', async () => {
      component = new MarketBoard(container);
      component.init();

      // Enable show prices
      const toggle = container.querySelector('#show-mb-prices-toggle') as HTMLInputElement;
      toggle.checked = true;
      toggle.dispatchEvent(new Event('change'));

      const dye = {
        itemID: 123,
        name: 'Special Dye',
        category: 'Special',
        acquisition: 'Unknown',
      } as Dye;

      const result = await component.fetchPrice(dye);
      expect(result).not.toBeNull();
    });

    it('should handle API error gracefully', async () => {
      // Mock the API service to throw
      const { APIService } = await import('@services/index');
      vi.mocked(APIService.getInstance).mockReturnValue({
        clearCache: vi.fn().mockResolvedValue(undefined),
        getPriceData: vi.fn().mockRejectedValue(new Error('API Error')),
      } as unknown as ReturnType<typeof APIService.getInstance>);

      component = new MarketBoard(container);
      component.init();

      // Enable show prices
      const toggle = container.querySelector('#show-mb-prices-toggle') as HTMLInputElement;
      toggle.checked = true;
      toggle.dispatchEvent(new Event('change'));

      const dye = {
        itemID: 123,
        name: 'Test Dye',
        category: 'Special',
        acquisition: 'Unknown',
      } as Dye;

      const result = await component.fetchPrice(dye);
      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // Branch Coverage Tests - refreshPrices
  // ==========================================================================

  describe('refreshPrices branch coverage', () => {
    it('should handle clearCache error gracefully', async () => {
      const { APIService } = await import('@services/index');
      vi.mocked(APIService.getInstance).mockReturnValue({
        clearCache: vi.fn().mockRejectedValue(new Error('Cache clear error')),
        getPriceData: vi.fn().mockResolvedValue({ minPrice: 1000 }),
      } as unknown as ReturnType<typeof APIService.getInstance>);

      component = new MarketBoard(container);
      component.init();

      // Should not throw
      await expect(component.refreshPrices()).resolves.not.toThrow();

      // Status should show error message
      const statusMsg = container.querySelector('#mb-price-status');
      expect(statusMsg?.textContent).toContain('Error');
    });

    it('should handle missing refresh button gracefully', async () => {
      component = new MarketBoard(container);
      component.init();

      // Remove refresh button
      container.querySelector('#mb-refresh-btn')?.remove();

      // Should not throw
      await expect(component.refreshPrices()).resolves.not.toThrow();
    });

    it('should handle missing status message gracefully', async () => {
      component = new MarketBoard(container);
      component.init();

      // Remove status message
      container.querySelector('#mb-price-status')?.remove();

      // Should not throw
      await expect(component.refreshPrices()).resolves.not.toThrow();
    });
  });

  // ==========================================================================
  // Branch Coverage Tests - setState
  // ==========================================================================

  describe('setState branch coverage', () => {
    it('should set selectedServer when string provided', () => {
      component = new MarketBoard(container);
      component.init();

      (component as unknown as { setState: (state: Record<string, unknown>) => void }).setState({
        selectedServer: 'Aether',
      });

      expect(component.getSelectedServer()).toBe('Aether');
    });

    it('should set showPrices when boolean provided', () => {
      component = new MarketBoard(container);
      component.init();

      (component as unknown as { setState: (state: Record<string, unknown>) => void }).setState({
        showPrices: true,
      });

      expect(component.getShowPrices()).toBe(true);
    });

    it('should set priceCategories when object provided', () => {
      component = new MarketBoard(container);
      component.init();

      (component as unknown as { setState: (state: Record<string, unknown>) => void }).setState({
        priceCategories: {
          baseDyes: false,
          craftDyes: true,
          alliedSocietyDyes: false,
          cosmicDyes: true,
          specialDyes: false,
        },
      });

      const categories = component.getPriceCategories();
      expect(categories.craftDyes).toBe(true);
      expect(categories.baseDyes).toBe(false);
    });

    it('should not set selectedServer when non-string provided', () => {
      component = new MarketBoard(container);
      component.init();

      const originalServer = component.getSelectedServer();

      (component as unknown as { setState: (state: Record<string, unknown>) => void }).setState({
        selectedServer: 123,
      });

      expect(component.getSelectedServer()).toBe(originalServer);
    });

    it('should not set showPrices when non-boolean provided', () => {
      component = new MarketBoard(container);
      component.init();

      const originalShowPrices = component.getShowPrices();

      (component as unknown as { setState: (state: Record<string, unknown>) => void }).setState({
        showPrices: 'true',
      });

      expect(component.getShowPrices()).toBe(originalShowPrices);
    });

    it('should not set priceCategories when null provided', () => {
      component = new MarketBoard(container);
      component.init();

      const originalCategories = component.getPriceCategories();

      (component as unknown as { setState: (state: Record<string, unknown>) => void }).setState({
        priceCategories: null,
      });

      expect(component.getPriceCategories()).toEqual(originalCategories);
    });
  });

  // ==========================================================================
  // Branch Coverage Tests - server dropdown population
  // ==========================================================================

  describe('populateServerDropdown branch coverage', () => {
    it('should select world when it matches selectedServer', async () => {
      component = new MarketBoard(container);
      component.init();

      // Set selected server to a world name
      (component as unknown as { setState: (state: Record<string, unknown>) => void }).setState({
        selectedServer: 'Balmung',
      });

      await component.loadServerData();
      await waitForComponent();

      const serverSelect = container.querySelector('#mb-server-select') as HTMLSelectElement;
      expect(serverSelect.value).toBe('Balmung');
    });
  });

  // ==========================================================================
  // Branch Coverage Tests - event handlers
  // ==========================================================================

  describe('event handler branch coverage', () => {
    it('should handle toggle change styling', async () => {
      component = new MarketBoard(container);
      component.init();

      const toggle = container.querySelector('#show-mb-prices-toggle') as HTMLInputElement;
      const toggleBg = toggle.nextElementSibling as HTMLElement;

      // Toggle on
      toggle.checked = true;
      toggle.dispatchEvent(new Event('change'));

      expect(toggleBg.style.backgroundColor).toBe('var(--theme-primary)');

      // Toggle off
      toggle.checked = false;
      toggle.dispatchEvent(new Event('change'));

      expect(toggleBg.style.backgroundColor).toBe('');
    });

    it('should handle server select focus/blur styling', async () => {
      component = new MarketBoard(container);
      component.init();

      const serverSelect = container.querySelector('#mb-server-select') as HTMLSelectElement;

      serverSelect.dispatchEvent(new FocusEvent('focus'));
      expect(serverSelect.style.borderColor).toBe('var(--theme-primary)');

      serverSelect.dispatchEvent(new FocusEvent('blur'));
      expect(serverSelect.style.borderColor).toBe('');
    });

    it('should handle checkbox without data-category attribute', async () => {
      component = new MarketBoard(container);
      component.init();

      const checkbox = container.querySelector('.mb-price-checkbox') as HTMLInputElement;

      // Remove the data-category attribute
      checkbox.removeAttribute('data-category');

      // Should not throw
      expect(() => {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change'));
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // Branch Coverage Tests - fetchPricesForDyes
  // ==========================================================================

  describe('fetchPricesForDyes branch coverage', () => {
    it('should skip dyes that return null price', async () => {
      component = new MarketBoard(container);
      component.init();

      // showPrices is false by default, so fetchPrice will return null
      const dyes: Dye[] = [
        { itemID: 1, name: 'Dye 1', category: 'Special' } as Dye,
        { itemID: 2, name: 'Dye 2', category: 'Special' } as Dye,
      ];

      const results = await component.fetchPricesForDyes(dyes);

      // Results should be empty since showPrices is false
      expect(results.size).toBe(0);
    });
  });
});
