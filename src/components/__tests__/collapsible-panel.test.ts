/**
 * XIV Dye Tools - Collapsible Panel Tests
 *
 * Tests for the CollapsiblePanel component
 * Covers: initialization, toggle behavior, persistence, content management
 */

import { CollapsiblePanel } from '../collapsible-panel';
import { StorageService } from '@services/index';
import {
  createTestContainer,
  cleanupTestContainer,
  cleanupComponent,
  expectElement,
} from './test-utils';

// ============================================================================
// Tests
// ============================================================================

describe('CollapsiblePanel', () => {
  let container: HTMLElement;
  let panel: CollapsiblePanel;

  beforeEach(() => {
    container = createTestContainer();
    // Clear storage before each test
    StorageService.clear();
  });

  afterEach(() => {
    if (panel) {
      cleanupComponent(panel, container);
    } else {
      cleanupTestContainer(container);
    }
  });

  // ==========================================================================
  // Initialization Tests
  // ==========================================================================

  describe('Initialization', () => {
    it('should render panel with given title', () => {
      panel = new CollapsiblePanel(container, { title: 'Test Panel' });
      panel.init();

      const titleElement = container.querySelector('span');
      expect(titleElement?.textContent).toBe('Test Panel');
    });

    it('should be open by default when no options specified', () => {
      panel = new CollapsiblePanel(container, { title: 'Test Panel' });
      panel.init();

      const header = container.querySelector('button');
      expect(header?.getAttribute('aria-expanded')).toBe('true');
    });

    it('should respect defaultOpen: true option', () => {
      panel = new CollapsiblePanel(container, {
        title: 'Test Panel',
        defaultOpen: true,
      });
      panel.init();

      const header = container.querySelector('button');
      expect(header?.getAttribute('aria-expanded')).toBe('true');
    });

    it('should respect defaultOpen: false option', () => {
      panel = new CollapsiblePanel(container, {
        title: 'Test Panel',
        defaultOpen: false,
      });
      panel.init();

      const header = container.querySelector('button');
      expect(header?.getAttribute('aria-expanded')).toBe('false');
    });

    it('should render icon when provided', () => {
      const testIcon = '<svg class="test-icon" viewBox="0 0 20 20"><circle cx="10" cy="10" r="5"/></svg>';
      panel = new CollapsiblePanel(container, {
        title: 'Test Panel',
        icon: testIcon,
      });
      panel.init();

      const iconContainer = container.querySelector('.w-4.h-4');
      expect(iconContainer).not.toBeNull();
      expect(iconContainer?.innerHTML).toContain('test-icon');
    });

    it('should not render icon container when icon not provided', () => {
      panel = new CollapsiblePanel(container, { title: 'Test Panel' });
      panel.init();

      // Look for the icon wrapper (w-4 h-4 class)
      const iconWrapper = container.querySelector('.w-4.h-4.flex-shrink-0');
      expect(iconWrapper).toBeNull();
    });
  });

  // ==========================================================================
  // Toggle Behavior Tests
  // ==========================================================================

  describe('Toggle Behavior', () => {
    it('should toggle from open to closed when toggle() is called', () => {
      panel = new CollapsiblePanel(container, {
        title: 'Test Panel',
        defaultOpen: true,
      });
      panel.init();

      const header = container.querySelector('button');
      expect(header?.getAttribute('aria-expanded')).toBe('true');

      panel.toggle();

      expect(header?.getAttribute('aria-expanded')).toBe('false');
    });

    it('should toggle from closed to open when toggle() is called', () => {
      panel = new CollapsiblePanel(container, {
        title: 'Test Panel',
        defaultOpen: false,
      });
      panel.init();

      const header = container.querySelector('button');
      expect(header?.getAttribute('aria-expanded')).toBe('false');

      panel.toggle();

      expect(header?.getAttribute('aria-expanded')).toBe('true');
    });

    it('should toggle when header button is clicked', () => {
      panel = new CollapsiblePanel(container, {
        title: 'Test Panel',
        defaultOpen: true,
      });
      panel.init();

      const header = container.querySelector('button') as HTMLButtonElement;
      expect(header?.getAttribute('aria-expanded')).toBe('true');

      header.click();

      expect(header?.getAttribute('aria-expanded')).toBe('false');
    });

    it('should update chevron rotation on toggle', () => {
      panel = new CollapsiblePanel(container, {
        title: 'Test Panel',
        defaultOpen: true,
      });
      panel.init();

      const chevron = container.querySelector('.transition-transform') as HTMLElement;
      expect(chevron?.style.transform).toBe('rotate(0deg)');

      panel.toggle();

      expect(chevron?.style.transform).toBe('rotate(-90deg)');
    });

    it('should update content visibility on toggle', () => {
      panel = new CollapsiblePanel(container, {
        title: 'Test Panel',
        defaultOpen: true,
      });
      panel.init();

      const content = container.querySelector('.collapsible-content') as HTMLElement;
      expect(content?.style.maxHeight).toBe('1000px');
      expect(content?.style.opacity).toBe('1');

      panel.toggle();

      expect(content?.style.maxHeight).toBe('0');
      expect(content?.style.opacity).toBe('0');
    });
  });

  // ==========================================================================
  // Open/Close Methods Tests
  // ==========================================================================

  describe('Open/Close Methods', () => {
    it('should open panel when open() is called on closed panel', () => {
      panel = new CollapsiblePanel(container, {
        title: 'Test Panel',
        defaultOpen: false,
      });
      panel.init();

      const header = container.querySelector('button');
      expect(header?.getAttribute('aria-expanded')).toBe('false');

      panel.open();

      expect(header?.getAttribute('aria-expanded')).toBe('true');
    });

    it('should not change state when open() is called on already open panel', () => {
      panel = new CollapsiblePanel(container, {
        title: 'Test Panel',
        defaultOpen: true,
      });
      panel.init();

      const header = container.querySelector('button');
      expect(header?.getAttribute('aria-expanded')).toBe('true');

      panel.open();

      expect(header?.getAttribute('aria-expanded')).toBe('true');
    });

    it('should close panel when close() is called on open panel', () => {
      panel = new CollapsiblePanel(container, {
        title: 'Test Panel',
        defaultOpen: true,
      });
      panel.init();

      const header = container.querySelector('button');
      expect(header?.getAttribute('aria-expanded')).toBe('true');

      panel.close();

      expect(header?.getAttribute('aria-expanded')).toBe('false');
    });

    it('should not change state when close() is called on already closed panel', () => {
      panel = new CollapsiblePanel(container, {
        title: 'Test Panel',
        defaultOpen: false,
      });
      panel.init();

      const header = container.querySelector('button');
      expect(header?.getAttribute('aria-expanded')).toBe('false');

      panel.close();

      expect(header?.getAttribute('aria-expanded')).toBe('false');
    });
  });

  // ==========================================================================
  // State Persistence Tests
  // ==========================================================================

  describe('State Persistence', () => {
    it('should persist state to storage when storageKey is provided', () => {
      panel = new CollapsiblePanel(container, {
        title: 'Test Panel',
        storageKey: 'test-panel',
        defaultOpen: true,
      });
      panel.init();

      panel.toggle(); // Close it

      const storedValue = StorageService.getItem<boolean>('v3_panel_test-panel');
      expect(storedValue).toBe(false);
    });

    it('should load persisted state from storage', () => {
      // Set initial persisted state
      StorageService.setItem('v3_panel_test-panel', false);

      panel = new CollapsiblePanel(container, {
        title: 'Test Panel',
        storageKey: 'test-panel',
        defaultOpen: true, // Default is true, but storage says false
      });
      panel.init();

      const header = container.querySelector('button');
      expect(header?.getAttribute('aria-expanded')).toBe('false'); // Should respect stored value
    });

    it('should use defaultOpen when no stored value exists', () => {
      panel = new CollapsiblePanel(container, {
        title: 'Test Panel',
        storageKey: 'new-panel',
        defaultOpen: false,
      });
      panel.init();

      const header = container.querySelector('button');
      expect(header?.getAttribute('aria-expanded')).toBe('false');
    });

    it('should not persist state when storageKey is not provided', () => {
      panel = new CollapsiblePanel(container, {
        title: 'Test Panel',
        defaultOpen: true,
      });
      panel.init();

      panel.toggle();

      // No storage key should be set
      const keys = Object.keys(localStorage);
      const panelKeys = keys.filter(k => k.startsWith('v3_panel_'));
      expect(panelKeys.length).toBe(0);
    });
  });

  // ==========================================================================
  // Content Management Tests
  // ==========================================================================

  describe('Content Management', () => {
    it('should return content container via getContentContainer()', () => {
      panel = new CollapsiblePanel(container, { title: 'Test Panel' });
      panel.init();

      const contentContainer = panel.getContentContainer();
      expect(contentContainer).not.toBeNull();
      expect(contentContainer?.classList.contains('px-4')).toBe(true);
    });

    it('should set string content via setContent()', () => {
      panel = new CollapsiblePanel(container, { title: 'Test Panel' });
      panel.init();

      panel.setContent('<p>Test content here</p>');

      const contentContainer = panel.getContentContainer();
      expect(contentContainer?.innerHTML).toContain('Test content here');
    });

    it('should set HTMLElement content via setContent()', () => {
      panel = new CollapsiblePanel(container, { title: 'Test Panel' });
      panel.init();

      const customElement = document.createElement('div');
      customElement.className = 'custom-content';
      customElement.textContent = 'Custom element content';

      panel.setContent(customElement);

      const contentContainer = panel.getContentContainer();
      expect(contentContainer?.querySelector('.custom-content')).not.toBeNull();
      expect(contentContainer?.textContent).toContain('Custom element content');
    });

    it('should replace existing content when setContent() is called', () => {
      panel = new CollapsiblePanel(container, { title: 'Test Panel' });
      panel.init();

      panel.setContent('First content');
      panel.setContent('Second content');

      const contentContainer = panel.getContentContainer();
      expect(contentContainer?.textContent).toBe('Second content');
      expect(contentContainer?.textContent).not.toContain('First content');
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe('Accessibility', () => {
    it('should have proper aria-expanded attribute on header', () => {
      panel = new CollapsiblePanel(container, { title: 'Test Panel' });
      panel.init();

      const header = container.querySelector('button');
      expect(header?.hasAttribute('aria-expanded')).toBe(true);
    });

    it('should update aria-expanded when toggled', () => {
      panel = new CollapsiblePanel(container, {
        title: 'Test Panel',
        defaultOpen: true,
      });
      panel.init();

      const header = container.querySelector('button');
      expect(header?.getAttribute('aria-expanded')).toBe('true');

      panel.toggle();
      expect(header?.getAttribute('aria-expanded')).toBe('false');

      panel.toggle();
      expect(header?.getAttribute('aria-expanded')).toBe('true');
    });

    it('should have button type attribute', () => {
      panel = new CollapsiblePanel(container, { title: 'Test Panel' });
      panel.init();

      const header = container.querySelector('button');
      expect(header?.getAttribute('type')).toBe('button');
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle empty title', () => {
      panel = new CollapsiblePanel(container, { title: '' });
      panel.init();

      // Should still render without errors
      const header = container.querySelector('button');
      expect(header).not.toBeNull();
    });

    it('should handle special characters in title', () => {
      const specialTitle = 'Test <Panel> & "Options"';
      panel = new CollapsiblePanel(container, { title: specialTitle });
      panel.init();

      const titleElement = container.querySelector('button span span');
      expect(titleElement?.textContent).toBe(specialTitle);
    });

    it('should handle multiple rapid toggles', () => {
      panel = new CollapsiblePanel(container, {
        title: 'Test Panel',
        defaultOpen: true,
      });
      panel.init();

      const header = container.querySelector('button');

      // Toggle rapidly
      panel.toggle();
      panel.toggle();
      panel.toggle();
      panel.toggle();
      panel.toggle();

      // Should be closed (5 toggles from open)
      expect(header?.getAttribute('aria-expanded')).toBe('false');
    });
  });
});
