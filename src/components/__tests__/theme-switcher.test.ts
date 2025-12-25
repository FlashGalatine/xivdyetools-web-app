/**
 * XIV Dye Tools - ThemeSwitcher Component Tests
 *
 * Tests for theme selection, dropdown interaction, and persistence
 */

import { vi } from 'vitest';
import { ThemeSwitcher } from '../theme-switcher';
import { ThemeService } from '@services/theme-service';
import { StorageService, appStorage } from '@services/storage-service';
import { STORAGE_KEYS } from '@shared/constants';
import type { ThemeName } from '@shared/types';
import { renderComponent, cleanupComponent, expectElement, waitForComponent } from './test-utils';

describe('ThemeSwitcher', () => {
  let container: HTMLElement;
  let component: ThemeSwitcher;

  beforeEach(() => {
    // Clear storage and reset theme before each test
    if (StorageService.isAvailable()) {
      StorageService.clear();
    }
    ThemeService.resetToDefault();
  });

  afterEach(() => {
    if (component && container) {
      cleanupComponent(component, container);
    }

    // Clean up after tests
    if (StorageService.isAvailable()) {
      StorageService.clear();
    }
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe('Rendering', () => {
    it('should render theme switcher button', () => {
      [component, container] = renderComponent(ThemeSwitcher);

      const button = container.querySelector('#theme-switcher-btn');
      expect(button).not.toBeNull();
      expect(button?.textContent).toContain('Theme');
    });

    it('should render dropdown menu (initially hidden)', () => {
      [component, container] = renderComponent(ThemeSwitcher);

      const dropdown = container.querySelector('#theme-dropdown');
      expect(dropdown).not.toBeNull();
      expectElement.toHaveClass(dropdown as HTMLElement, 'hidden');
    });

    it('should render all 11 theme options', () => {
      [component, container] = renderComponent(ThemeSwitcher);

      const themeButtons = container.querySelectorAll('[data-theme]');
      expect(themeButtons.length).toBe(11);
    });

    it('should highlight current theme', () => {
      // Set theme and create component in correct order
      [component, container] = renderComponent(ThemeSwitcher);

      // Now set theme and update component
      ThemeService.setTheme('standard-dark');
      component.update();

      const activeButton = container.querySelector('[data-theme="standard-dark"]');
      expect(activeButton).not.toBeNull();
      expectElement.toHaveClass(activeButton as HTMLElement, 'font-semibold');
    });

    it('should format theme names for display', () => {
      [component, container] = renderComponent(ThemeSwitcher);

      // Uses THEME_DISPLAY_NAMES from constants
      const button = container.querySelector('[data-theme="standard-light"]');
      expect(button?.textContent).toContain('Standard (Light)');
    });

    it('should include color swatches for each theme', () => {
      [component, container] = renderComponent(ThemeSwitcher);

      const themeButtons = container.querySelectorAll('[data-theme]');
      themeButtons.forEach((btn) => {
        const swatch = btn.querySelector('div');
        expect(swatch).not.toBeNull();
        expect(swatch?.getAttribute('style')).toContain('background-color');
      });
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      [component, container] = renderComponent(ThemeSwitcher);

      const button = container.querySelector('#theme-switcher-btn');
      expect(button?.getAttribute('aria-label')).toBe('Toggle theme switcher');
      expect(button?.getAttribute('aria-haspopup')).toBe('true');
      expect(button?.getAttribute('aria-expanded')).toBe('false');
    });

    it('should update aria-expanded when dropdown opens', () => {
      [component, container] = renderComponent(ThemeSwitcher);

      const button = container.querySelector('#theme-switcher-btn') as HTMLButtonElement;
      button.click();

      expect(button.getAttribute('aria-expanded')).toBe('true');
    });

    it('should update aria-expanded when dropdown closes', () => {
      [component, container] = renderComponent(ThemeSwitcher);

      const button = container.querySelector('#theme-switcher-btn') as HTMLButtonElement;

      // Open then close
      button.click();
      button.click();

      expect(button.getAttribute('aria-expanded')).toBe('false');
    });
  });

  // ==========================================================================
  // Dropdown Interaction Tests
  // ==========================================================================

  describe('Dropdown Interaction', () => {
    it('should toggle dropdown on button click', () => {
      [component, container] = renderComponent(ThemeSwitcher);

      const button = container.querySelector('#theme-switcher-btn') as HTMLButtonElement;
      const dropdown = container.querySelector('#theme-dropdown') as HTMLDivElement;

      // Initially hidden
      expectElement.toHaveClass(dropdown, 'hidden');

      // Click to open
      button.click();
      expectElement.toNotHaveClass(dropdown, 'hidden');

      // Click to close
      button.click();
      expectElement.toHaveClass(dropdown, 'hidden');
    });

    it('should close dropdown on ESC key', async () => {
      [component, container] = renderComponent(ThemeSwitcher);

      const button = container.querySelector('#theme-switcher-btn') as HTMLButtonElement;
      const dropdown = container.querySelector('#theme-dropdown') as HTMLDivElement;

      // Open dropdown
      button.click();
      expectElement.toNotHaveClass(dropdown, 'hidden');

      // Press ESC key
      const escEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      document.dispatchEvent(escEvent);

      await waitForComponent(10);
      expectElement.toHaveClass(dropdown, 'hidden');
    });
  });

  // ==========================================================================
  // Theme Selection Tests
  // ==========================================================================

  describe('Theme Selection', () => {
    it('should change theme when theme button is clicked', () => {
      [component, container] = renderComponent(ThemeSwitcher);

      const initialTheme = ThemeService.getCurrentTheme();

      // Click on a different theme
      const themeButton = container.querySelector(
        '[data-theme="standard-dark"]'
      ) as HTMLButtonElement;
      themeButton.click();

      const newTheme = ThemeService.getCurrentTheme();
      expect(newTheme).toBe('standard-dark');
      expect(newTheme).not.toBe(initialTheme);
    });

    it('should close dropdown after theme selection', async () => {
      [component, container] = renderComponent(ThemeSwitcher);

      const button = container.querySelector('#theme-switcher-btn') as HTMLButtonElement;
      const dropdown = container.querySelector('#theme-dropdown') as HTMLDivElement;

      // Open dropdown
      button.click();
      expectElement.toNotHaveClass(dropdown, 'hidden');

      // Select a theme
      const themeButton = container.querySelector(
        '[data-theme="parchment-light"]'
      ) as HTMLButtonElement;
      themeButton.click();

      await waitForComponent(10);

      // Dropdown should be closed
      expectElement.toHaveClass(dropdown, 'hidden');
    });

    it('should emit theme-changed event on selection', () => {
      [component, container] = renderComponent(ThemeSwitcher);

      const eventHandler = vi.fn();
      container.addEventListener('theme-changed', eventHandler);

      const themeButton = container.querySelector(
        '[data-theme="og-classic-dark"]'
      ) as HTMLButtonElement;
      themeButton.click();

      expect(eventHandler).toHaveBeenCalledTimes(1);
      expect(eventHandler.mock.calls[0][0].detail.theme).toBe('og-classic-dark');
    });

    it('should persist theme to storage', () => {
      [component, container] = renderComponent(ThemeSwitcher);

      const themeButton = container.querySelector(
        '[data-theme="cotton-candy"]'
      ) as HTMLButtonElement;
      themeButton.click();

      // Verify theme was saved via appStorage (namespaced storage)
      if (StorageService.isAvailable()) {
        const savedTheme = appStorage.getItem<ThemeName>(STORAGE_KEYS.THEME);
        expect(savedTheme).toBe('cotton-candy');
      }
    });

    it('should update component state after theme selection', () => {
      [component, container] = renderComponent(ThemeSwitcher);

      const themeButton = container.querySelector('[data-theme="sugar-riot"]') as HTMLButtonElement;
      themeButton.click();

      const state = component['getState']();
      expect(state.currentTheme).toBe('sugar-riot');
    });

    it('should highlight newly selected theme after update', async () => {
      [component, container] = renderComponent(ThemeSwitcher);

      // Select a theme
      const themeButton = container.querySelector(
        '[data-theme="hydaelyn-light"]'
      ) as HTMLButtonElement;
      themeButton.click();

      await waitForComponent(50); // Wait for component update

      // Verify new theme is highlighted
      const highlightedButton = container.querySelector('[data-theme="hydaelyn-light"]');
      expectElement.toHaveClass(highlightedButton as HTMLElement, 'font-semibold');
    });
  });

  // ==========================================================================
  // Theme Service Integration Tests
  // ==========================================================================

  describe('Theme Service Integration', () => {
    it('should initialize with current theme from service', () => {
      ThemeService.setTheme('og-classic-dark');
      [component, container] = renderComponent(ThemeSwitcher);

      const state = component['getState']();
      expect(state.currentTheme).toBe('og-classic-dark');
    });

    it('should update when theme changes externally', async () => {
      [component, container] = renderComponent(ThemeSwitcher);

      // Simulate external theme change
      ThemeService.setTheme('sugar-riot');

      await waitForComponent(100); // Wait for subscription callback + re-render

      const state = component['getState']();
      expect(state.currentTheme).toBe('sugar-riot');
    });

    it('should subscribe to theme changes on mount', () => {
      const subscribeSpy = vi.spyOn(ThemeService, 'subscribe');

      [component, container] = renderComponent(ThemeSwitcher);

      expect(subscribeSpy).toHaveBeenCalled();
      subscribeSpy.mockRestore();
    });

    it('should apply theme to DOM via ThemeService', () => {
      [component, container] = renderComponent(ThemeSwitcher);

      const themeButton = container.querySelector(
        '[data-theme="standard-dark"]'
      ) as HTMLButtonElement;
      themeButton.click();

      // Verify ThemeService applied the theme to document.documentElement (the <html> element)
      expect(document.documentElement.classList.contains('theme-standard-dark')).toBe(true);
    });
  });

  // ==========================================================================
  // State Management Tests
  // ==========================================================================

  describe('State Management', () => {
    it('should get component state', () => {
      [component, container] = renderComponent(ThemeSwitcher);

      const state = component['getState']();

      expect(state).toHaveProperty('currentTheme');
      expect(state).toHaveProperty('isDropdownOpen');
      expect(typeof state.currentTheme).toBe('string');
      expect(typeof state.isDropdownOpen).toBe('boolean');
    });

    it('should set component state', () => {
      [component, container] = renderComponent(ThemeSwitcher);

      component['setState']({
        currentTheme: 'parchment-light' as ThemeName,
        isDropdownOpen: true,
      });

      const state = component['getState']();
      expect(state.currentTheme).toBe('parchment-light');
      expect(state.isDropdownOpen).toBe(true);
    });

    it('should track dropdown open state', () => {
      [component, container] = renderComponent(ThemeSwitcher);

      const button = container.querySelector('#theme-switcher-btn') as HTMLButtonElement;

      // Initially closed
      let state = component['getState']();
      expect(state.isDropdownOpen).toBe(false);

      // Open dropdown
      button.click();
      state = component['getState']();
      expect(state.isDropdownOpen).toBe(true);

      // Close dropdown
      button.click();
      state = component['getState']();
      expect(state.isDropdownOpen).toBe(false);
    });
  });

  // ==========================================================================
  // Lifecycle Tests
  // ==========================================================================

  describe('Lifecycle', () => {
    it('should clean up event listeners on destroy', () => {
      [component, container] = renderComponent(ThemeSwitcher);

      const listenerCount = component['listeners'].size;
      expect(listenerCount).toBeGreaterThan(0);

      component.destroy();

      expect(component['listeners'].size).toBe(0);
    });

    it('should re-render correctly on update', async () => {
      [component, container] = renderComponent(ThemeSwitcher);

      // Change theme externally to trigger update
      ThemeService.setTheme('og-classic-dark');

      await waitForComponent(100);

      // Verify component re-rendered with new theme
      const highlightedButton = container.querySelector('[data-theme="og-classic-dark"]');
      expectElement.toHaveClass(highlightedButton as HTMLElement, 'font-semibold');
    });

    it('should maintain functionality after update', async () => {
      [component, container] = renderComponent(ThemeSwitcher);

      // Trigger update
      component.update();

      await waitForComponent(50);

      // Test that dropdown still works
      const button = container.querySelector('#theme-switcher-btn') as HTMLButtonElement;
      const dropdown = container.querySelector('#theme-dropdown') as HTMLDivElement;

      button.click();
      expectElement.toNotHaveClass(dropdown, 'hidden');
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle rapid theme changes', async () => {
      [component, container] = renderComponent(ThemeSwitcher);

      // Rapidly select multiple themes
      const themes = ['hydaelyn-light', 'cotton-candy', 'sugar-riot', 'og-classic-dark'];

      for (const themeName of themes) {
        const themeButton = container.querySelector(
          `[data-theme="${themeName}"]`
        ) as HTMLButtonElement;
        themeButton.click();
      }

      await waitForComponent(100);

      // Final theme should be applied
      expect(ThemeService.getCurrentTheme()).toBe('og-classic-dark');
    });

    it('should handle empty dropdown state', () => {
      [component, container] = renderComponent(ThemeSwitcher);

      const state = component['getState']();

      // Dropdown should be closed by default
      expect(state.isDropdownOpen).toBe(false);
    });
  });

  // ==========================================================================
  // Branch Coverage Tests - Click Outside and Close Events
  // ==========================================================================

  describe('Close Dropdown Behavior', () => {
    it('should close dropdown when clicking outside component', async () => {
      [component, container] = renderComponent(ThemeSwitcher);

      const button = container.querySelector('#theme-switcher-btn') as HTMLButtonElement;
      const dropdown = container.querySelector('#theme-dropdown') as HTMLDivElement;

      // Open dropdown
      button.click();
      expectElement.toNotHaveClass(dropdown, 'hidden');

      // Create an element outside the component and click it
      const outsideElement = document.createElement('div');
      outsideElement.id = 'outside-element';
      document.body.appendChild(outsideElement);

      // Simulate click on outside element
      const clickEvent = new MouseEvent('click', { bubbles: true });
      outsideElement.dispatchEvent(clickEvent);

      await waitForComponent(10);

      // Dropdown should be closed
      expectElement.toHaveClass(dropdown, 'hidden');

      // Cleanup
      outsideElement.remove();
    });

    it('should NOT close dropdown when clicking inside component', async () => {
      [component, container] = renderComponent(ThemeSwitcher);

      const button = container.querySelector('#theme-switcher-btn') as HTMLButtonElement;
      const dropdown = container.querySelector('#theme-dropdown') as HTMLDivElement;

      // Open dropdown
      button.click();
      expectElement.toNotHaveClass(dropdown, 'hidden');

      // Click inside the dropdown (not on a theme button)
      const clickEvent = new MouseEvent('click', { bubbles: true });
      dropdown.dispatchEvent(clickEvent);

      await waitForComponent(10);

      // Dropdown should still be open
      expectElement.toNotHaveClass(dropdown, 'hidden');
    });

    it('should close dropdown when receiving close-other-dropdowns event from non-theme source', async () => {
      [component, container] = renderComponent(ThemeSwitcher);

      const button = container.querySelector('#theme-switcher-btn') as HTMLButtonElement;
      const dropdown = container.querySelector('#theme-dropdown') as HTMLDivElement;

      // Open dropdown
      button.click();
      expectElement.toNotHaveClass(dropdown, 'hidden');

      // Dispatch close event from another source (e.g., tools dropdown)
      const closeEvent = new CustomEvent('close-other-dropdowns', {
        detail: { source: 'tools' },
        bubbles: true,
      });
      document.dispatchEvent(closeEvent);

      await waitForComponent(10);

      // Dropdown should be closed
      expectElement.toHaveClass(dropdown, 'hidden');
    });

    it('should NOT close dropdown when receiving close-other-dropdowns from theme source', async () => {
      [component, container] = renderComponent(ThemeSwitcher);

      const button = container.querySelector('#theme-switcher-btn') as HTMLButtonElement;
      const dropdown = container.querySelector('#theme-dropdown') as HTMLDivElement;

      // Open dropdown
      button.click();
      expectElement.toNotHaveClass(dropdown, 'hidden');

      // Dispatch close event from theme source (self)
      const closeEvent = new CustomEvent('close-other-dropdowns', {
        detail: { source: 'theme' },
        bubbles: true,
      });
      document.dispatchEvent(closeEvent);

      await waitForComponent(10);

      // Dropdown should still be open (don't close own dropdown)
      expectElement.toNotHaveClass(dropdown, 'hidden');
    });

    it('should NOT close dropdown when receiving close event while already closed', async () => {
      [component, container] = renderComponent(ThemeSwitcher);

      const dropdown = container.querySelector('#theme-dropdown') as HTMLDivElement;

      // Ensure dropdown is closed
      expectElement.toHaveClass(dropdown, 'hidden');

      // Dispatch close event - should have no effect
      const closeEvent = new CustomEvent('close-other-dropdowns', {
        detail: { source: 'tools' },
        bubbles: true,
      });
      document.dispatchEvent(closeEvent);

      await waitForComponent(10);

      // Dropdown should still be closed
      expectElement.toHaveClass(dropdown, 'hidden');
    });
  });

  // ==========================================================================
  // Branch Coverage Tests - Language Service Integration
  // ==========================================================================

  describe('Language Service Integration', () => {
    it('should update when language changes', async () => {
      const { LanguageService } = await import('@services/language-service');

      [component, container] = renderComponent(ThemeSwitcher);

      // Initial render should have text content
      const initialButton = container.querySelector('#theme-switcher-btn');
      expect(initialButton?.textContent).toBeDefined();

      // Change language
      await LanguageService.setLocale('ja');

      await waitForComponent(100);

      // Component should have updated (re-rendered)
      const updatedButton = container.querySelector('#theme-switcher-btn');
      expect(updatedButton).not.toBeNull();

      // Restore English
      await LanguageService.setLocale('en');
    });

    it('should subscribe to language changes on mount', async () => {
      const { LanguageService } = await import('@services/language-service');
      const subscribeSpy = vi.spyOn(LanguageService, 'subscribe');

      [component, container] = renderComponent(ThemeSwitcher);

      expect(subscribeSpy).toHaveBeenCalled();
      subscribeSpy.mockRestore();
    });
  });

  // ==========================================================================
  // Branch Coverage Tests - Dispatch close-other-dropdowns on open
  // ==========================================================================

  describe('Dropdown Coordination', () => {
    it('should dispatch close-other-dropdowns event when opening dropdown', async () => {
      [component, container] = renderComponent(ThemeSwitcher);

      const eventHandler = vi.fn();
      document.addEventListener('close-other-dropdowns', eventHandler);

      const button = container.querySelector('#theme-switcher-btn') as HTMLButtonElement;

      // Open dropdown - should dispatch event
      button.click();

      expect(eventHandler).toHaveBeenCalledTimes(1);
      expect((eventHandler.mock.calls[0][0] as CustomEvent).detail.source).toBe('theme');

      // Clean up listener
      document.removeEventListener('close-other-dropdowns', eventHandler);
    });

    it('should NOT dispatch close-other-dropdowns event when closing dropdown', async () => {
      [component, container] = renderComponent(ThemeSwitcher);

      const button = container.querySelector('#theme-switcher-btn') as HTMLButtonElement;

      // Open dropdown first
      button.click();

      // Set up listener after first click
      const eventHandler = vi.fn();
      document.addEventListener('close-other-dropdowns', eventHandler);

      // Close dropdown - should NOT dispatch event
      button.click();

      // Event should not have been dispatched for close
      expect(eventHandler).not.toHaveBeenCalled();

      // Clean up listener
      document.removeEventListener('close-other-dropdowns', eventHandler);
    });
  });

  // ==========================================================================
  // Branch Coverage Tests - Hover Effects
  // ==========================================================================

  describe('Theme Button Hover Effects', () => {
    it('should apply hover background on mouseenter', () => {
      [component, container] = renderComponent(ThemeSwitcher);

      const themeButton = container.querySelector(
        '[data-theme="hydaelyn-light"]'
      ) as HTMLButtonElement;

      // Trigger mouseenter
      themeButton.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

      expect(themeButton.style.backgroundColor).toBe('var(--theme-card-hover)');
    });

    it('should remove hover background on mouseleave for non-current theme', () => {
      [component, container] = renderComponent(ThemeSwitcher);

      // Ensure we're not on this theme
      ThemeService.setTheme('standard-dark');
      component.update();

      const themeButton = container.querySelector(
        '[data-theme="hydaelyn-light"]'
      ) as HTMLButtonElement;

      // Trigger mouseenter then mouseleave
      themeButton.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      themeButton.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));

      expect(themeButton.style.backgroundColor).toBe('transparent');
    });

    it('should keep background on mouseleave for current theme', () => {
      [component, container] = renderComponent(ThemeSwitcher);

      // Set this as current theme
      ThemeService.setTheme('hydaelyn-light');
      component.update();

      const themeButton = container.querySelector(
        '[data-theme="hydaelyn-light"]'
      ) as HTMLButtonElement;

      // Trigger mouseenter then mouseleave
      themeButton.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      const hoverBg = themeButton.style.backgroundColor;
      themeButton.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));

      // Should NOT be transparent (keeps the hover/selected background)
      expect(themeButton.style.backgroundColor).toBe(hoverBg);
    });
  });

  // ==========================================================================
  // Branch Coverage Tests - Theme Sorting Edge Case
  // ==========================================================================

  describe('Theme Sorting', () => {
    it('should sort themes correctly (families grouped, light before dark)', () => {
      [component, container] = renderComponent(ThemeSwitcher);

      const themeButtons = container.querySelectorAll('[data-theme]');
      const themeOrder = Array.from(themeButtons).map(
        (btn) => btn.getAttribute('data-theme')
      );

      // Verify that within each family, light comes before dark
      // standard-light should come before standard-dark
      const standardLightIdx = themeOrder.indexOf('standard-light');
      const standardDarkIdx = themeOrder.indexOf('standard-dark');
      expect(standardLightIdx).toBeLessThan(standardDarkIdx);

      // grayscale-light should come before grayscale-dark
      const grayscaleLightIdx = themeOrder.indexOf('grayscale-light');
      const grayscaleDarkIdx = themeOrder.indexOf('grayscale-dark');
      expect(grayscaleLightIdx).toBeLessThan(grayscaleDarkIdx);

      // high-contrast-light should come before high-contrast-dark
      const hcLightIdx = themeOrder.indexOf('high-contrast-light');
      const hcDarkIdx = themeOrder.indexOf('high-contrast-dark');
      expect(hcLightIdx).toBeLessThan(hcDarkIdx);
    });

    it('should handle themes without light/dark suffix (cotton-candy, sugar-riot)', () => {
      [component, container] = renderComponent(ThemeSwitcher);

      // These themes don't have -light or -dark suffix
      // They should still be present and sorted by family name
      const cottonCandyBtn = container.querySelector('[data-theme="cotton-candy"]');
      const sugarRiotBtn = container.querySelector('[data-theme="sugar-riot"]');

      expect(cottonCandyBtn).not.toBeNull();
      expect(sugarRiotBtn).not.toBeNull();
    });
  });
});
