import { ColorWheelDisplay } from '../color-wheel-display';
import { createTestContainer, cleanupComponent } from './test-utils';
import type { Dye, ThemePalette } from '@shared/types';
import { ThemeService } from '@services/index';

describe('ColorWheelDisplay', () => {
  let container: HTMLElement;
  let component: ColorWheelDisplay | null = null;

  const baseColor = '#ff0000';
  const harmonyDyes: Dye[] = [
    {
      id: 2,
      itemID: 2,
      stainID: null,
      name: 'Second',
      hex: '#00ff00',
      rgb: { r: 0, g: 255, b: 0 },
      hsv: { h: 120, s: 100, v: 100 },
      category: 'Green',
      acquisition: 'Test',
      cost: 1,
      isMetallic: false,
      isPastel: false,
      isDark: false,
      isCosmic: false,
    },
    {
      id: 3,
      itemID: 3,
      stainID: null,
      name: 'Third',
      hex: '#0000ff',
      rgb: { r: 0, g: 0, b: 255 },
      hsv: { h: 240, s: 100, v: 100 },
      category: 'Blue',
      acquisition: 'Test',
      cost: 1,
      isMetallic: false,
      isPastel: false,
      isDark: false,
      isCosmic: false,
    },
  ];

  beforeEach(() => {
    container = createTestContainer();
    vi.spyOn(ThemeService, 'getCurrentThemeObject').mockReturnValue({
      name: 'standard-light',
      palette: {} as unknown as ThemePalette,
      isDark: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (component) {
      cleanupComponent(component, container);
    } else {
      container.remove();
    }
  });

  const createComponentWithHarmony = (harmonyType: string): void => {
    component = new ColorWheelDisplay(container, baseColor, harmonyDyes, harmonyType, 160);
    component.init();
  };

  // ==========================================================================
  // Basic Rendering Tests
  // ==========================================================================

  describe('Basic Rendering', () => {
    it('renders SVG wheel with donut segments', () => {
      createComponentWithHarmony('triadic');

      const svg = container.querySelector('svg.color-wheel');
      expect(svg).not.toBeNull();
    });

    it('renders a dot for each harmony dye', () => {
      createComponentWithHarmony('triadic');
      const dots = container.querySelectorAll('circle');

      // Expect at least base + harmony dots (plus glow circles)
      expect(dots.length).toBeGreaterThanOrEqual(harmonyDyes.length + 1);
    });

    it('displays harmony short name at center', () => {
      createComponentWithHarmony('triadic');
      const label = container.querySelector('text');
      expect(label?.textContent).toBe('TRIAD');
    });

    it('renders with default size when not specified', () => {
      component = new ColorWheelDisplay(container, baseColor, harmonyDyes, 'triadic');
      component.init();

      const svg = container.querySelector('svg.color-wheel');
      expect(svg?.getAttribute('width')).toBe('200');
      expect(svg?.getAttribute('height')).toBe('200');
    });
  });

  // ==========================================================================
  // Harmony Type Branch Coverage
  // ==========================================================================

  describe('Harmony Types', () => {
    it('renders complementary harmony', () => {
      createComponentWithHarmony('complementary');
      const label = container.querySelector('text');
      expect(label?.textContent).toBe('COMP');
    });

    it('renders analogous harmony', () => {
      createComponentWithHarmony('analogous');
      const label = container.querySelector('text');
      expect(label?.textContent).toBe('ANALOG');
    });

    it('renders triadic harmony', () => {
      createComponentWithHarmony('triadic');
      const label = container.querySelector('text');
      expect(label?.textContent).toBe('TRIAD');
    });

    it('renders split-complementary harmony', () => {
      createComponentWithHarmony('split-complementary');
      const label = container.querySelector('text');
      expect(label?.textContent).toBe('SPLIT');
    });

    it('renders tetradic harmony', () => {
      createComponentWithHarmony('tetradic');
      const label = container.querySelector('text');
      expect(label?.textContent).toBe('TETRA');
    });

    it('renders square harmony', () => {
      createComponentWithHarmony('square');
      const label = container.querySelector('text');
      expect(label?.textContent).toBe('SQUARE');
    });

    it('renders monochromatic harmony', () => {
      createComponentWithHarmony('monochromatic');
      const label = container.querySelector('text');
      expect(label?.textContent).toBe('MONO');
    });

    it('renders compound harmony', () => {
      createComponentWithHarmony('compound');
      const label = container.querySelector('text');
      expect(label?.textContent).toBe('COMPND');
    });

    it('renders shades harmony', () => {
      createComponentWithHarmony('shades');
      const label = container.querySelector('text');
      expect(label?.textContent).toBe('SHADES');
    });

    it('handles unknown harmony type with fallback', () => {
      createComponentWithHarmony('unknown-type');
      const label = container.querySelector('text');
      // Should use uppercase slice fallback
      expect(label?.textContent).toBe('UNKNOW');
    });

    it('handles harmony type longer than 6 characters', () => {
      createComponentWithHarmony('verylongharmonytype');
      const label = container.querySelector('text');
      // Should truncate to first 6 uppercase characters
      expect(label?.textContent).toBe('VERYLO');
    });
  });

  // ==========================================================================
  // Theme Branch Coverage
  // ==========================================================================

  describe('Theme Handling', () => {
    it('renders with light theme styling', () => {
      vi.spyOn(ThemeService, 'getCurrentThemeObject').mockReturnValue({
        name: 'standard-light',
        palette: {} as unknown as ThemePalette,
        isDark: false,
      });

      createComponentWithHarmony('triadic');

      const svg = container.querySelector('svg.color-wheel');
      expect(svg).not.toBeNull();

      // Check that a text element exists with light theme color
      const label = container.querySelector('text');
      expect(label?.getAttribute('fill')).toBe('#666666');
    });

    it('renders with dark theme styling', () => {
      vi.spyOn(ThemeService, 'getCurrentThemeObject').mockReturnValue({
        name: 'standard-dark',
        palette: {} as unknown as ThemePalette,
        isDark: true,
      });

      createComponentWithHarmony('triadic');

      const svg = container.querySelector('svg.color-wheel');
      expect(svg).not.toBeNull();

      // Check that a text element exists with dark theme color
      const label = container.querySelector('text');
      expect(label?.getAttribute('fill')).toBe('#CCCCCC');
    });

    it('applies correct dot stroke color for light theme', () => {
      vi.spyOn(ThemeService, 'getCurrentThemeObject').mockReturnValue({
        name: 'standard-light',
        palette: {} as unknown as ThemePalette,
        isDark: false,
      });

      createComponentWithHarmony('triadic');

      // Find a circle with stroke attribute
      const circles = container.querySelectorAll('circle[stroke]');
      const hasWhiteStroke = Array.from(circles).some(
        (c) => c.getAttribute('stroke') === '#FFFFFF'
      );
      expect(hasWhiteStroke).toBe(true);
    });

    it('applies correct dot stroke color for dark theme', () => {
      vi.spyOn(ThemeService, 'getCurrentThemeObject').mockReturnValue({
        name: 'standard-dark',
        palette: {} as unknown as ThemePalette,
        isDark: true,
      });

      createComponentWithHarmony('triadic');

      // Find a circle with stroke attribute
      const circles = container.querySelectorAll('circle[stroke]');
      const hasDarkStroke = Array.from(circles).some((c) => c.getAttribute('stroke') === '#333333');
      expect(hasDarkStroke).toBe(true);
    });
  });

  // ==========================================================================
  // Mouse Events Branch Coverage
  // ==========================================================================

  describe('Mouse Events', () => {
    it('enlarges dot on mouseenter', () => {
      createComponentWithHarmony('triadic');

      // Find harmony dot circles (those with cursor-pointer class)
      const circles = container.querySelectorAll('circle.cursor-pointer');
      expect(circles.length).toBeGreaterThan(0);

      const circle = circles[0] as SVGCircleElement;
      const initialRadius = circle.getAttribute('r');

      // Trigger mouseenter
      circle.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

      // Radius should be larger
      const newRadius = circle.getAttribute('r');
      expect(Number(newRadius)).toBeGreaterThan(Number(initialRadius));
    });

    it('restores dot size on mouseleave', () => {
      createComponentWithHarmony('triadic');

      const circles = container.querySelectorAll('circle.cursor-pointer');
      expect(circles.length).toBeGreaterThan(0);

      const circle = circles[0] as SVGCircleElement;
      const initialRadius = circle.getAttribute('r');

      // Trigger mouseenter then mouseleave
      circle.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      circle.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));

      // Radius should be back to initial
      const finalRadius = circle.getAttribute('r');
      expect(finalRadius).toBe(initialRadius);
    });

    it('enlarges glow circle on mouseenter', () => {
      createComponentWithHarmony('triadic');

      // Find harmony dot circles
      const circles = container.querySelectorAll('circle.cursor-pointer');
      expect(circles.length).toBeGreaterThan(0);

      const circle = circles[0] as SVGCircleElement;

      // Find the glow circle (previous sibling)
      const glowCircle = circle.previousElementSibling as SVGCircleElement;
      expect(glowCircle).not.toBeNull();

      const initialGlowRadius = glowCircle.getAttribute('r');
      const initialGlowOpacity = glowCircle.getAttribute('opacity');

      // Trigger mouseenter
      circle.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

      // Glow should be larger and more opaque
      expect(Number(glowCircle.getAttribute('r'))).toBeGreaterThan(Number(initialGlowRadius));
      expect(Number(glowCircle.getAttribute('opacity'))).toBeGreaterThan(
        Number(initialGlowOpacity)
      );
    });

    it('restores glow circle on mouseleave', () => {
      createComponentWithHarmony('triadic');

      const circles = container.querySelectorAll('circle.cursor-pointer');
      expect(circles.length).toBeGreaterThan(0);

      const circle = circles[0] as SVGCircleElement;
      const glowCircle = circle.previousElementSibling as SVGCircleElement;

      const initialGlowRadius = glowCircle.getAttribute('r');
      const initialGlowOpacity = glowCircle.getAttribute('opacity');

      // Trigger mouseenter then mouseleave
      circle.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      circle.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));

      // Glow should be back to initial
      expect(glowCircle.getAttribute('r')).toBe(initialGlowRadius);
      expect(glowCircle.getAttribute('opacity')).toBe(initialGlowOpacity);
    });
  });

  // ==========================================================================
  // Lifecycle Tests
  // ==========================================================================

  describe('Lifecycle', () => {
    it('destroys component without errors', () => {
      createComponentWithHarmony('triadic');

      expect(() => {
        component?.destroy();
      }).not.toThrow();
    });

    it('returns correct state', () => {
      createComponentWithHarmony('complementary');

      const state = component?.['getState']();
      expect(state?.baseColor).toBe(baseColor);
      expect(state?.harmonyType).toBe('complementary');
      expect(state?.dyeCount).toBe(harmonyDyes.length);
    });

    it('bindEvents does not throw', () => {
      createComponentWithHarmony('triadic');

      expect(() => {
        component?.bindEvents();
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('renders with empty harmony dyes array', () => {
      component = new ColorWheelDisplay(container, baseColor, [], 'triadic', 160);
      component.init();

      const svg = container.querySelector('svg.color-wheel');
      expect(svg).not.toBeNull();
    });

    it('renders with single harmony dye', () => {
      component = new ColorWheelDisplay(
        container,
        baseColor,
        [harmonyDyes[0]],
        'complementary',
        160
      );
      component.init();

      const svg = container.querySelector('svg.color-wheel');
      expect(svg).not.toBeNull();
    });

    it('handles very small size', () => {
      component = new ColorWheelDisplay(container, baseColor, harmonyDyes, 'triadic', 50);
      component.init();

      const svg = container.querySelector('svg.color-wheel');
      expect(svg?.getAttribute('width')).toBe('50');
    });

    it('handles different base colors', () => {
      component = new ColorWheelDisplay(container, '#00ff00', harmonyDyes, 'triadic', 160);
      component.init();

      const svg = container.querySelector('svg.color-wheel');
      expect(svg).not.toBeNull();
    });
  });
});
