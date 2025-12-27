/**
 * XIV Dye Tools - Preset Card Tests
 *
 * Tests for the PresetCard component
 * Covers: rendering, dye display, click handling, preset updates
 */

import { PresetCard } from '../preset-card';
import { dyeService, LanguageService } from '@services/index';
import type { UnifiedPreset } from '@services/index';
import {
  createTestContainer,
  cleanupTestContainer,
  cleanupComponent,
} from './test-utils';

// Mock preset data
const createMockPreset = (overrides: Partial<UnifiedPreset> = {}): UnifiedPreset => ({
  id: 'test-preset-1',
  name: 'Test Preset',
  description: 'A test preset for unit testing',
  category: 'aesthetics',
  dyes: [1, 2, 3], // Mock dye IDs
  tags: [],
  voteCount: 10,
  author: 'TestUser',
  isCurated: true,
  isFromAPI: false,
  createdAt: new Date().toISOString(),
  ...overrides,
});

// Mock dye data
const mockDyes = {
  1: { id: 1, name: 'Jet Black', hex: '#000000' },
  2: { id: 2, name: 'Snow White', hex: '#FFFFFF' },
  3: { id: 3, name: 'Rose Pink', hex: '#FF69B4' },
};

// ============================================================================
// Tests
// ============================================================================

describe('PresetCard', () => {
  let container: HTMLElement;
  let card: PresetCard;
  let getDyeByIdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    container = createTestContainer();

    // Mock dyeService.getDyeById
    getDyeByIdSpy = vi.spyOn(dyeService, 'getDyeById').mockImplementation((id: number) => {
      return (mockDyes[id as keyof typeof mockDyes] as ReturnType<typeof dyeService.getDyeById>) || null;
    });
  });

  afterEach(() => {
    if (card) {
      cleanupComponent(card, container);
    } else {
      cleanupTestContainer(container);
    }
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe('Rendering', () => {
    it('should render preset card element', () => {
      card = new PresetCard(container, createMockPreset());
      card.init();

      const cardEl = container.querySelector('[data-preset-id]');
      expect(cardEl).not.toBeNull();
    });

    it('should set preset ID as data attribute', () => {
      const preset = createMockPreset({ id: 'my-preset' });
      card = new PresetCard(container, preset);
      card.init();

      const cardEl = container.querySelector('[data-preset-id="my-preset"]');
      expect(cardEl).not.toBeNull();
    });

    it('should display preset name', () => {
      const preset = createMockPreset({ name: 'Beautiful Glamour' });
      card = new PresetCard(container, preset);
      card.init();

      const title = container.querySelector('h3');
      expect(title?.textContent).toBe('Beautiful Glamour');
    });

    it('should display preset description', () => {
      const preset = createMockPreset({ description: 'A lovely color combination' });
      card = new PresetCard(container, preset);
      card.init();

      const description = container.querySelector('.line-clamp-2');
      expect(description?.textContent).toBe('A lovely color combination');
    });

    it('should display dye count', () => {
      const preset = createMockPreset({ dyes: [1, 2, 3, 4, 5] });
      card = new PresetCard(container, preset);
      card.init();

      expect(container.textContent).toContain('5');
    });

    it('should display vote count when greater than 0', () => {
      const preset = createMockPreset({ voteCount: 42 });
      card = new PresetCard(container, preset);
      card.init();

      expect(container.textContent).toContain('42');
    });

    it('should not display vote count when 0', () => {
      const preset = createMockPreset({ voteCount: 0 });
      card = new PresetCard(container, preset);
      card.init();

      // Vote count element should not exist
      const voteElements = container.querySelectorAll('.text-indigo-600, .text-indigo-400');
      const hasVoteCount = Array.from(voteElements).some(el => el.textContent?.includes('0'));
      // Vote section with star shouldn't show for 0 votes
      expect(container.innerHTML).not.toContain('★');
    });

    it('should display author name when provided', () => {
      const preset = createMockPreset({ author: 'CoolCreator', isCurated: false });
      card = new PresetCard(container, preset);
      card.init();

      expect(container.textContent).toContain('by CoolCreator');
    });

    it('should display Official for curated presets without author', () => {
      const preset = createMockPreset({ author: undefined, isCurated: true });
      card = new PresetCard(container, preset);
      card.init();

      expect(container.textContent).toContain('Official');
    });
  });

  // ==========================================================================
  // Community Badge Tests
  // ==========================================================================

  describe('Community Badge', () => {
    it('should show Community badge for non-curated presets', () => {
      const preset = createMockPreset({ isCurated: false });
      card = new PresetCard(container, preset);
      card.init();

      expect(container.textContent).toContain('Community');
    });

    it('should not show Community badge for curated presets', () => {
      const preset = createMockPreset({ isCurated: true });
      card = new PresetCard(container, preset);
      card.init();

      // Check that Community badge div doesn't exist
      const badge = container.querySelector('.bg-indigo-100, .bg-indigo-900');
      expect(badge).toBeNull();
    });
  });

  // ==========================================================================
  // Color Swatch Tests
  // ==========================================================================

  describe('Color Swatches', () => {
    it('should render color swatches for each dye', () => {
      const preset = createMockPreset({ dyes: [1, 2, 3] });
      card = new PresetCard(container, preset);
      card.init();

      const swatchStrip = container.querySelector('.h-16');
      const swatches = swatchStrip?.querySelectorAll('.flex-1');
      expect(swatches?.length).toBe(3);
    });

    it('should set correct background colors on swatches', () => {
      const preset = createMockPreset({ dyes: [1, 2] });
      card = new PresetCard(container, preset);
      card.init();

      const swatchStrip = container.querySelector('.h-16');
      const swatches = swatchStrip?.querySelectorAll('.flex-1') as NodeListOf<HTMLElement>;

      expect(swatches[0]?.style.backgroundColor).toBe('rgb(0, 0, 0)'); // #000000
      expect(swatches[1]?.style.backgroundColor).toBe('rgb(255, 255, 255)'); // #FFFFFF
    });

    it('should set dye name as title on swatches', () => {
      const preset = createMockPreset({ dyes: [1] });
      card = new PresetCard(container, preset);
      card.init();

      const swatchStrip = container.querySelector('.h-16');
      const swatch = swatchStrip?.querySelector('.flex-1');
      expect(swatch?.getAttribute('title')).toBe('Jet Black');
    });

    it('should handle unknown dye IDs gracefully', () => {
      getDyeByIdSpy.mockReturnValue(null);

      const preset = createMockPreset({ dyes: [999] });
      card = new PresetCard(container, preset);
      card.init();

      const swatchStrip = container.querySelector('.h-16');
      const swatch = swatchStrip?.querySelector('.flex-1') as HTMLElement;

      // Should use fallback color
      expect(swatch?.style.backgroundColor).toBe('rgb(136, 136, 136)'); // #888888
      expect(swatch?.getAttribute('title')).toBe('Unknown');
    });
  });

  // ==========================================================================
  // Category Icon Tests
  // ==========================================================================

  describe('Category Icon', () => {
    it('should display category icon', () => {
      const preset = createMockPreset({ category: 'aesthetics' });
      card = new PresetCard(container, preset);
      card.init();

      const categoryBadge = container.querySelector('.w-5.h-5');
      expect(categoryBadge).not.toBeNull();
    });
  });

  // ==========================================================================
  // Click Handler Tests
  // ==========================================================================

  describe('Click Handler', () => {
    it('should call onClick callback when card is clicked', () => {
      const onClick = vi.fn();
      const preset = createMockPreset();
      card = new PresetCard(container, preset, onClick);
      card.init();

      const cardEl = container.querySelector('[data-preset-id]') as HTMLElement;
      cardEl.click();

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick).toHaveBeenCalledWith(preset);
    });

    it('should not throw when onClick is not provided', () => {
      const preset = createMockPreset();
      card = new PresetCard(container, preset);
      card.init();

      const cardEl = container.querySelector('[data-preset-id]') as HTMLElement;

      // Should not throw
      expect(() => cardEl.click()).not.toThrow();
    });

    it('should have cursor-pointer style', () => {
      const preset = createMockPreset();
      card = new PresetCard(container, preset);
      card.init();

      const cardEl = container.querySelector('[data-preset-id]');
      expect(cardEl?.classList.contains('cursor-pointer')).toBe(true);
    });
  });

  // ==========================================================================
  // Update Tests
  // ==========================================================================

  describe('Preset Updates', () => {
    it('should update preset via updatePreset method', () => {
      const preset = createMockPreset({ name: 'Original Name' });
      card = new PresetCard(container, preset);
      card.init();

      expect(container.querySelector('h3')?.textContent).toBe('Original Name');

      const updatedPreset = createMockPreset({ name: 'Updated Name' });
      card.updatePreset(updatedPreset);

      expect(container.querySelector('h3')?.textContent).toBe('Updated Name');
    });

    it('should return current preset via getPreset method', () => {
      const preset = createMockPreset({ id: 'get-test' });
      card = new PresetCard(container, preset);
      card.init();

      const retrieved = card.getPreset();
      expect(retrieved.id).toBe('get-test');
    });
  });

  // ==========================================================================
  // Styling Tests
  // ==========================================================================

  describe('Styling', () => {
    it('should have rounded corners', () => {
      const preset = createMockPreset();
      card = new PresetCard(container, preset);
      card.init();

      const cardEl = container.querySelector('[data-preset-id]');
      expect(cardEl?.classList.contains('rounded-lg')).toBe(true);
    });

    it('should have hover shadow effect', () => {
      const preset = createMockPreset();
      card = new PresetCard(container, preset);
      card.init();

      const cardEl = container.querySelector('[data-preset-id]');
      expect(cardEl?.classList.contains('hover:shadow-lg')).toBe(true);
    });

    it('should have different border for curated vs community', () => {
      // Curated preset
      const curatedPreset = createMockPreset({ isCurated: true });
      card = new PresetCard(container, curatedPreset);
      card.init();

      let cardEl = container.querySelector('[data-preset-id]');
      expect(cardEl?.classList.contains('border-gray-200') || cardEl?.classList.contains('border-gray-700')).toBe(true);

      // Clean up
      card.destroy();
      container.innerHTML = '';

      // Community preset
      const communityPreset = createMockPreset({ isCurated: false });
      card = new PresetCard(container, communityPreset);
      card.init();

      cardEl = container.querySelector('[data-preset-id]');
      expect(cardEl?.classList.contains('border-indigo-200') || cardEl?.classList.contains('border-indigo-800')).toBe(true);
    });
  });
});
