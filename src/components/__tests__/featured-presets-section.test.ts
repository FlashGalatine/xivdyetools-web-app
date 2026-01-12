/**
 * XIV Dye Tools - Featured Presets Section Tests
 *
 * Tests for the FeaturedPresetsSection component
 * Covers: rendering, card display, click handling, visibility
 */

import { FeaturedPresetsSection } from '../featured-presets-section';
import { dyeService, type UnifiedPreset } from '@services/index';
import { createTestContainer, cleanupTestContainer, cleanupComponent } from './test-utils';

// Mock preset data
const createMockPreset = (overrides: Partial<UnifiedPreset> = {}): UnifiedPreset => ({
  id: 'preset-1',
  name: 'Featured Preset',
  description: 'A featured preset',
  category: 'aesthetics',
  dyes: [1, 2, 3],
  tags: [],
  voteCount: 50,
  author: 'FeaturedCreator',
  isCurated: false,
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

describe('FeaturedPresetsSection', () => {
  let container: HTMLElement;
  let section: FeaturedPresetsSection;
  let getDyeByIdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    container = createTestContainer();

    // Mock dyeService.getDyeById
    getDyeByIdSpy = vi.spyOn(dyeService, 'getDyeById').mockImplementation((id: number) => {
      return (
        (mockDyes[id as keyof typeof mockDyes] as ReturnType<typeof dyeService.getDyeById>) || null
      );
    });
  });

  afterEach(() => {
    if (section) {
      cleanupComponent(section, container);
    } else {
      cleanupTestContainer(container);
    }
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe('Rendering', () => {
    it('should render section element', () => {
      section = new FeaturedPresetsSection(container, [createMockPreset()]);
      section.init();

      const sectionEl = container.querySelector('.featured-section-gradient');
      expect(sectionEl).not.toBeNull();
    });

    it('should display header with star icon', () => {
      section = new FeaturedPresetsSection(container, [createMockPreset()]);
      section.init();

      expect(container.innerHTML).toContain('⭐');
    });

    it('should display section title', () => {
      section = new FeaturedPresetsSection(container, [createMockPreset()]);
      section.init();

      expect(container.textContent).toContain('Featured Community Presets');
    });

    it('should create horizontal scroll container', () => {
      section = new FeaturedPresetsSection(container, [createMockPreset()]);
      section.init();

      const grid = container.querySelector('.overflow-x-auto');
      expect(grid).not.toBeNull();
    });
  });

  // ==========================================================================
  // Card Rendering Tests
  // ==========================================================================

  describe('Card Rendering', () => {
    it('should render a card for each preset', () => {
      const presets = [
        createMockPreset({ id: '1' }),
        createMockPreset({ id: '2' }),
        createMockPreset({ id: '3' }),
      ];
      section = new FeaturedPresetsSection(container, presets);
      section.init();

      const cards = container.querySelectorAll('[data-preset-id]');
      expect(cards.length).toBe(3);
    });

    it('should display preset name on card', () => {
      const preset = createMockPreset({ name: 'Amazing Colors' });
      section = new FeaturedPresetsSection(container, [preset]);
      section.init();

      expect(container.textContent).toContain('Amazing Colors');
    });

    it('should display vote count when greater than 0', () => {
      const preset = createMockPreset({ voteCount: 42 });
      section = new FeaturedPresetsSection(container, [preset]);
      section.init();

      expect(container.textContent).toContain('42 votes');
    });

    it('should not display vote count when 0', () => {
      const preset = createMockPreset({ voteCount: 0 });
      section = new FeaturedPresetsSection(container, [preset]);
      section.init();

      expect(container.textContent).not.toContain('0 votes');
    });

    it('should set preset ID as data attribute', () => {
      const preset = createMockPreset({ id: 'my-featured-preset' });
      section = new FeaturedPresetsSection(container, [preset]);
      section.init();

      const card = container.querySelector('[data-preset-id="my-featured-preset"]');
      expect(card).not.toBeNull();
    });
  });

  // ==========================================================================
  // Color Swatch Tests
  // ==========================================================================

  describe('Color Swatches', () => {
    it('should render color swatches for each dye', () => {
      const preset = createMockPreset({ dyes: [1, 2, 3] });
      section = new FeaturedPresetsSection(container, [preset]);
      section.init();

      const swatchStrip = container.querySelector('.h-12');
      const swatches = swatchStrip?.querySelectorAll('.flex-1');
      expect(swatches?.length).toBe(3);
    });

    it('should set correct background colors on swatches', () => {
      const preset = createMockPreset({ dyes: [1, 2] });
      section = new FeaturedPresetsSection(container, [preset]);
      section.init();

      const swatchStrip = container.querySelector('.h-12');
      const swatches = swatchStrip?.querySelectorAll('.flex-1') as NodeListOf<HTMLElement>;

      expect(swatches[0]?.style.backgroundColor).toBe('rgb(0, 0, 0)');
      expect(swatches[1]?.style.backgroundColor).toBe('rgb(255, 255, 255)');
    });

    it('should handle unknown dye IDs gracefully', () => {
      getDyeByIdSpy.mockReturnValue(null);
      const preset = createMockPreset({ dyes: [999] });
      section = new FeaturedPresetsSection(container, [preset]);
      section.init();

      const swatchStrip = container.querySelector('.h-12');
      const swatch = swatchStrip?.querySelector('.flex-1') as HTMLElement;
      expect(swatch?.style.backgroundColor).toBe('rgb(136, 136, 136)');
    });
  });

  // ==========================================================================
  // Click Handler Tests
  // ==========================================================================

  describe('Click Handler', () => {
    it('should call onClick callback when card is clicked', () => {
      const onClick = vi.fn();
      const preset = createMockPreset();
      section = new FeaturedPresetsSection(container, [preset], onClick);
      section.init();

      const card = container.querySelector('[data-preset-id]') as HTMLElement;
      card.click();

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick).toHaveBeenCalledWith(preset);
    });

    it('should not throw when onClick is not provided', () => {
      const preset = createMockPreset();
      section = new FeaturedPresetsSection(container, [preset]);
      section.init();

      const card = container.querySelector('[data-preset-id]') as HTMLElement;
      expect(() => card.click()).not.toThrow();
    });

    it('should have cursor-pointer style on cards', () => {
      const preset = createMockPreset();
      section = new FeaturedPresetsSection(container, [preset]);
      section.init();

      const card = container.querySelector('[data-preset-id]');
      expect(card?.classList.contains('cursor-pointer')).toBe(true);
    });
  });

  // ==========================================================================
  // Update Tests
  // ==========================================================================

  describe('Update Methods', () => {
    it('should update presets via updatePresets method', () => {
      section = new FeaturedPresetsSection(container, [createMockPreset({ name: 'Original' })]);
      section.init();

      expect(container.textContent).toContain('Original');

      section.updatePresets([createMockPreset({ name: 'Updated' })]);

      expect(container.textContent).toContain('Updated');
      expect(container.textContent).not.toContain('Original');
    });

    it('should toggle visibility via setVisible method', () => {
      section = new FeaturedPresetsSection(container, [createMockPreset()]);
      section.init();

      const sectionEl = container.querySelector('.featured-section-gradient');
      expect(sectionEl?.classList.contains('hidden')).toBe(false);

      section.setVisible(false);
      expect(sectionEl?.classList.contains('hidden')).toBe(true);

      section.setVisible(true);
      expect(sectionEl?.classList.contains('hidden')).toBe(false);
    });
  });

  // ==========================================================================
  // Styling Tests
  // ==========================================================================

  describe('Styling', () => {
    it('should have rounded corners on section', () => {
      section = new FeaturedPresetsSection(container, [createMockPreset()]);
      section.init();

      const sectionEl = container.querySelector('.featured-section-gradient');
      expect(sectionEl?.classList.contains('rounded-lg')).toBe(true);
    });

    it('should have white text for contrast', () => {
      section = new FeaturedPresetsSection(container, [createMockPreset()]);
      section.init();

      const sectionEl = container.querySelector('.featured-section-gradient');
      expect(sectionEl?.classList.contains('text-white')).toBe(true);
    });

    it('should have fixed width on cards for horizontal scroll', () => {
      section = new FeaturedPresetsSection(container, [createMockPreset()]);
      section.init();

      const card = container.querySelector('[data-preset-id]');
      expect(card?.classList.contains('w-48')).toBe(true);
      expect(card?.classList.contains('flex-shrink-0')).toBe(true);
    });
  });

  // ==========================================================================
  // Empty State Tests
  // ==========================================================================

  describe('Empty State', () => {
    it('should handle empty presets array', () => {
      section = new FeaturedPresetsSection(container, []);
      section.init();

      const cards = container.querySelectorAll('[data-preset-id]');
      expect(cards.length).toBe(0);
    });
  });
});
