/**
 * XIV Dye Tools - Harmony Result Panel Tests
 *
 * Tests for the HarmonyResultPanel component
 * Covers: rendering, deviance display, closest dyes, price display, dye actions
 */

import { HarmonyResultPanel, type HarmonyResultPanelOptions } from '../harmony-result-panel';
import { LanguageService, APIService } from '@services/index';
import type { Dye, PriceData } from '@shared/types';
import {
  createTestContainer,
  cleanupTestContainer,
  cleanupComponent,
} from './test-utils';

// Mock dye data
const createMockDye = (overrides: Partial<Dye> = {}): Dye => ({
  id: 1,
  itemID: 1001,
  name: 'Test Dye',
  hex: '#FF5500',
  rgb: { r: 255, g: 85, b: 0 },
  hsv: { h: 20, s: 100, v: 100 },
  category: 'orange',
  acquisition: 'Weaver',
  cost: 100,
  isMetallic: false,
  isPastel: false,
  isDark: false,
  isCosmic: false,
  ...overrides,
});

// Mock options
const createMockOptions = (overrides: Partial<HarmonyResultPanelOptions> = {}): HarmonyResultPanelOptions => ({
  label: 'Harmony 1',
  targetColor: '#FF5500',
  matchedDye: createMockDye(),
  deviance: 5.5,
  closestDyes: [],
  showPrices: false,
  priceData: new Map(),
  isBase: false,
  ...overrides,
});

// ============================================================================
// Tests
// ============================================================================

describe('HarmonyResultPanel', () => {
  let container: HTMLElement;
  let panel: HarmonyResultPanel;

  beforeEach(() => {
    container = createTestContainer();
  });

  afterEach(() => {
    if (panel) {
      cleanupComponent(panel, container);
    } else {
      cleanupTestContainer(container);
    }
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Basic Rendering Tests
  // ==========================================================================

  describe('Basic Rendering', () => {
    it('should render panel card element', () => {
      panel = new HarmonyResultPanel(container, createMockOptions());
      panel.init();

      const card = container.querySelector('.rounded-lg');
      expect(card).not.toBeNull();
    });

    it('should display panel label in header', () => {
      panel = new HarmonyResultPanel(container, createMockOptions({ label: 'Harmony 2' }));
      panel.init();

      expect(container.textContent).toContain('Harmony 2');
    });

    it('should display hex code in header', () => {
      const dye = createMockDye({ hex: '#AABBCC' });
      panel = new HarmonyResultPanel(container, createMockOptions({ matchedDye: dye }));
      panel.init();

      expect(container.textContent).toContain('#AABBCC');
    });

    it('should display dye name', () => {
      const dye = createMockDye({ name: 'Beautiful Orange' });
      panel = new HarmonyResultPanel(container, createMockOptions({ matchedDye: dye }));
      panel.init();

      expect(container.textContent).toContain('Beautiful Orange');
    });

    it('should display acquisition info', () => {
      const dye = createMockDye({ acquisition: 'Market Board' });
      panel = new HarmonyResultPanel(container, createMockOptions({ matchedDye: dye }));
      panel.init();

      expect(container.textContent).toContain('Market Board');
    });

    it('should render color swatch with correct background', () => {
      const dye = createMockDye({ hex: '#123456' });
      panel = new HarmonyResultPanel(container, createMockOptions({ matchedDye: dye }));
      panel.init();

      const swatch = container.querySelector('.h-16') as HTMLElement;
      expect(swatch?.style.background).toBe('rgb(18, 52, 86)');
    });
  });

  // ==========================================================================
  // Deviance Display Tests
  // ==========================================================================

  describe('Deviance Display', () => {
    it('should display deviance for harmony panels', () => {
      panel = new HarmonyResultPanel(container, createMockOptions({
        deviance: 12.5,
        isBase: false,
      }));
      panel.init();

      expect(container.textContent).toContain('12.5°');
    });

    it('should not display deviance for base panel', () => {
      panel = new HarmonyResultPanel(container, createMockOptions({
        deviance: 0,
        isBase: true,
        label: 'Base',
      }));
      panel.init();

      // Should not have deviance display
      const devianceEl = container.querySelector('.number');
      // Base panels don't show deviance
      expect(container.textContent).not.toMatch(/\d+\.\d°.*from ideal/);
    });

    it('should show green color for deviance <= 5', () => {
      panel = new HarmonyResultPanel(container, createMockOptions({ deviance: 3.0 }));
      panel.init();

      const devianceEl = container.querySelector('.text-sm.font-semibold.number') as HTMLElement;
      expect(devianceEl?.style.color).toBe('rgb(34, 197, 94)');
    });

    it('should show blue color for deviance <= 15', () => {
      panel = new HarmonyResultPanel(container, createMockOptions({ deviance: 10.0 }));
      panel.init();

      const devianceEl = container.querySelector('.text-sm.font-semibold.number') as HTMLElement;
      expect(devianceEl?.style.color).toBe('rgb(59, 130, 246)');
    });

    it('should show yellow color for deviance <= 30', () => {
      panel = new HarmonyResultPanel(container, createMockOptions({ deviance: 25.0 }));
      panel.init();

      const devianceEl = container.querySelector('.text-sm.font-semibold.number') as HTMLElement;
      expect(devianceEl?.style.color).toBe('rgb(234, 179, 8)');
    });

    it('should show red color for deviance > 30', () => {
      panel = new HarmonyResultPanel(container, createMockOptions({ deviance: 45.0 }));
      panel.init();

      const devianceEl = container.querySelector('.text-sm.font-semibold.number') as HTMLElement;
      expect(devianceEl?.style.color).toBe('rgb(239, 68, 68)');
    });
  });

  // ==========================================================================
  // Closest Dyes Tests
  // ==========================================================================

  describe('Closest Dyes', () => {
    it('should display closest dyes section when provided', () => {
      const closestDyes = [
        createMockDye({ id: 2, hex: '#FF6600', name: 'Orange 2' }),
        createMockDye({ id: 3, hex: '#FF7700', name: 'Orange 3' }),
      ];
      panel = new HarmonyResultPanel(container, createMockOptions({ closestDyes }));
      panel.init();

      const swatches = container.querySelectorAll('button[aria-label^="Swap to"]');
      expect(swatches.length).toBe(2);
    });

    it('should not display closest dyes for base panel', () => {
      const closestDyes = [createMockDye({ id: 2 })];
      panel = new HarmonyResultPanel(container, createMockOptions({
        closestDyes,
        isBase: true,
      }));
      panel.init();

      const swatches = container.querySelectorAll('button[aria-label^="Swap to"]');
      expect(swatches.length).toBe(0);
    });

    it('should call onSwapDye when closest dye swatch is clicked', () => {
      const onSwapDye = vi.fn();
      const closestDye = createMockDye({ id: 2, name: 'Swap Target' });
      panel = new HarmonyResultPanel(container, createMockOptions({
        closestDyes: [closestDye],
        onSwapDye,
      }));
      panel.init();

      const swatch = container.querySelector('button[aria-label^="Swap to"]') as HTMLButtonElement;
      swatch.click();

      expect(onSwapDye).toHaveBeenCalledTimes(1);
      expect(onSwapDye).toHaveBeenCalledWith(closestDye);
    });

    it('should set dye name as title on swap swatches', () => {
      const closestDyes = [createMockDye({ name: 'Pretty Color' })];
      panel = new HarmonyResultPanel(container, createMockOptions({ closestDyes }));
      panel.init();

      const swatch = container.querySelector('button[aria-label^="Swap to"]');
      expect(swatch?.getAttribute('title')).toBe('Pretty Color');
    });
  });

  // ==========================================================================
  // Price Display Tests
  // ==========================================================================

  describe('Price Display', () => {
    it('should display price when showPrices is true and price data available', () => {
      const dye = createMockDye({ itemID: 1001 });
      const priceData = new Map<number, PriceData>();
      priceData.set(1001, {
        itemID: 1001,
        currentAverage: 5000,
        currentMinPrice: 4500,
        currentMaxPrice: 5500,
        lastUpdate: Date.now(),
      });

      // Mock APIService.formatPrice
      vi.spyOn(APIService, 'formatPrice').mockReturnValue('5,000 gil');

      panel = new HarmonyResultPanel(container, createMockOptions({
        matchedDye: dye,
        showPrices: true,
        priceData,
      }));
      panel.init();

      expect(container.textContent).toContain('5,000 gil');
    });

    it('should not display price when showPrices is false', () => {
      const dye = createMockDye({ itemID: 1001 });
      const priceData = new Map<number, PriceData>();
      priceData.set(1001, {
        itemID: 1001,
        currentAverage: 5000,
        currentMinPrice: 4500,
        currentMaxPrice: 5500,
        lastUpdate: Date.now(),
      });

      panel = new HarmonyResultPanel(container, createMockOptions({
        matchedDye: dye,
        showPrices: false,
        priceData,
      }));
      panel.init();

      expect(container.textContent).not.toContain('gil');
    });

    it('should update price display via setShowPrices', () => {
      const dye = createMockDye({ itemID: 1001 });
      const priceData = new Map<number, PriceData>();
      priceData.set(1001, {
        itemID: 1001,
        currentAverage: 5000,
        currentMinPrice: 4500,
        currentMaxPrice: 5500,
        lastUpdate: Date.now(),
      });

      vi.spyOn(APIService, 'formatPrice').mockReturnValue('5,000 gil');

      panel = new HarmonyResultPanel(container, createMockOptions({
        matchedDye: dye,
        showPrices: false,
        priceData,
      }));
      panel.init();

      expect(container.textContent).not.toContain('5,000 gil');

      panel.setShowPrices(true);
      expect(container.textContent).toContain('5,000 gil');
    });
  });

  // ==========================================================================
  // State Getter Tests
  // ==========================================================================

  describe('State Getter', () => {
    it('should return correct state', () => {
      const closestDyes = [createMockDye(), createMockDye()];
      panel = new HarmonyResultPanel(container, createMockOptions({
        label: 'Test Label',
        deviance: 7.5,
        isBase: false,
        closestDyes,
      }));
      panel.init();

      const state = panel['getState']();
      expect(state.label).toBe('Test Label');
      expect(state.deviance).toBe(7.5);
      expect(state.isBase).toBe(false);
      expect(state.closestDyesCount).toBe(2);
    });
  });
});
