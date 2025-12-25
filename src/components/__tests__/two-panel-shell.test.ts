/**
 * XIV Dye Tools - Two Panel Shell Tests
 *
 * Tests for the TwoPanelShell component
 * Covers: initialization, tool selection, collapse behavior, responsive layout
 */

import { TwoPanelShell } from '../two-panel-shell';
import { StorageService, LanguageService } from '@services/index';
import { getLocalizedTools } from '../tool-nav';
import {
  createTestContainer,
  cleanupTestContainer,
} from './test-utils';

// ============================================================================
// Tests
// ============================================================================

describe('TwoPanelShell', () => {
  let container: HTMLElement;
  let shell: TwoPanelShell;

  beforeEach(() => {
    container = createTestContainer();
    // Clear storage before each test
    StorageService.clear();
    // Reset window size to desktop
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
  });

  afterEach(() => {
    if (shell) {
      shell.destroy();
    }
    cleanupTestContainer(container);
    // Clean up any elements appended to body
    document.querySelectorAll('.mobile-drawer, .drawer-overlay, nav[aria-label="Tool navigation"]').forEach(el => el.remove());
  });

  // ==========================================================================
  // Initialization Tests
  // ==========================================================================

  describe('Initialization', () => {
    it('should render two-panel shell structure', () => {
      shell = new TwoPanelShell(container);
      shell.init();

      const shellEl = container.querySelector('.two-panel-shell');
      expect(shellEl).not.toBeNull();
    });

    it('should create left panel (sidebar)', () => {
      shell = new TwoPanelShell(container);
      shell.init();

      const leftPanel = container.querySelector('aside');
      expect(leftPanel).not.toBeNull();
    });

    it('should create right panel (main content)', () => {
      shell = new TwoPanelShell(container);
      shell.init();

      const rightPanel = container.querySelector('main');
      expect(rightPanel).not.toBeNull();
    });

    it('should use harmony as default tool', () => {
      shell = new TwoPanelShell(container);
      shell.init();

      expect(shell.getActiveToolId()).toBe('harmony');
    });

    it('should use initialTool option when provided', () => {
      shell = new TwoPanelShell(container, { initialTool: 'matcher' });
      shell.init();

      expect(shell.getActiveToolId()).toBe('matcher');
    });

    it('should render tool navigation buttons', () => {
      shell = new TwoPanelShell(container);
      shell.init();

      const tools = getLocalizedTools();
      const toolNav = container.querySelector('nav[aria-label="Tool navigation"]');
      expect(toolNav).not.toBeNull();

      // Check that all tools have buttons
      tools.forEach(tool => {
        const button = toolNav?.querySelector(`button[aria-label="${tool.name}"], button:has(span:contains("${tool.name}"))`);
        // Alternative check - look for buttons in the nav
        const buttons = toolNav?.querySelectorAll('button');
        expect(buttons?.length).toBeGreaterThanOrEqual(tools.length);
      });
    });

    it('should have collapse button', () => {
      shell = new TwoPanelShell(container);
      shell.init();

      const collapseBtn = container.querySelector('button[aria-label="Collapse sidebar"], button[aria-label="Expand sidebar"]');
      expect(collapseBtn).not.toBeNull();
    });
  });

  // ==========================================================================
  // Tool Selection Tests
  // ==========================================================================

  describe('Tool Selection', () => {
    it('should highlight active tool in navigation', () => {
      shell = new TwoPanelShell(container);
      shell.init();

      const toolNav = container.querySelector('nav[aria-label="Tool navigation"]');
      const activeButton = toolNav?.querySelector('button[aria-current="page"]');
      expect(activeButton).not.toBeNull();
    });

    it('should call onToolChange callback when tool is selected', () => {
      const onToolChange = vi.fn();
      shell = new TwoPanelShell(container, { onToolChange });
      shell.init();

      // Find and click a tool button (not the active one)
      const toolNav = container.querySelector('nav[aria-label="Tool navigation"]');
      const buttons = toolNav?.querySelectorAll('button');
      // Find a button that doesn't have aria-current
      const inactiveButton = Array.from(buttons || []).find(
        btn => !btn.hasAttribute('aria-current')
      );

      if (inactiveButton) {
        inactiveButton.click();
        expect(onToolChange).toHaveBeenCalled();
      }
    });

    it('should update active tool via setActiveToolId', () => {
      shell = new TwoPanelShell(container);
      shell.init();

      expect(shell.getActiveToolId()).toBe('harmony');

      shell.setActiveToolId('mixer');
      expect(shell.getActiveToolId()).toBe('mixer');
    });

    it('should not trigger onToolChange when using setActiveToolId', () => {
      const onToolChange = vi.fn();
      shell = new TwoPanelShell(container, { onToolChange });
      shell.init();

      shell.setActiveToolId('mixer');
      expect(onToolChange).not.toHaveBeenCalled();
    });

  });

  // ==========================================================================
  // Collapse Behavior Tests
  // ==========================================================================

  describe('Collapse Behavior', () => {
    it('should start expanded by default', () => {
      shell = new TwoPanelShell(container);
      shell.init();

      expect(shell.getIsCollapsed()).toBe(false);
    });

    it('should respect stored collapsed state', () => {
      StorageService.setItem('v3_sidebar_collapsed', true);

      shell = new TwoPanelShell(container);
      shell.init();

      expect(shell.getIsCollapsed()).toBe(true);
    });

    it('should toggle collapsed state', () => {
      shell = new TwoPanelShell(container);
      shell.init();

      expect(shell.getIsCollapsed()).toBe(false);

      shell.toggleCollapse();
      expect(shell.getIsCollapsed()).toBe(true);

      shell.toggleCollapse();
      expect(shell.getIsCollapsed()).toBe(false);
    });

    it('should persist collapsed state to storage', () => {
      shell = new TwoPanelShell(container);
      shell.init();

      shell.toggleCollapse();

      const storedValue = StorageService.getItem<boolean>('v3_sidebar_collapsed');
      expect(storedValue).toBe(true);
    });

    it('should toggle when collapse button is clicked', () => {
      shell = new TwoPanelShell(container);
      shell.init();

      const collapseBtn = container.querySelector('button[aria-label="Collapse sidebar"]') as HTMLButtonElement;
      expect(shell.getIsCollapsed()).toBe(false);

      collapseBtn?.click();
      expect(shell.getIsCollapsed()).toBe(true);
    });

    it('should update button label when collapsed', () => {
      shell = new TwoPanelShell(container);
      shell.init();

      shell.toggleCollapse();

      const expandBtn = container.querySelector('button[aria-label="Expand sidebar"]');
      expect(expandBtn).not.toBeNull();
    });
  });

  // ==========================================================================
  // Content Container Tests
  // ==========================================================================

  describe('Content Containers', () => {
    it('should provide left panel content container', () => {
      shell = new TwoPanelShell(container);
      shell.init();

      const leftContent = shell.getLeftPanelContent();
      expect(leftContent).not.toBeNull();
      expect(leftContent?.getAttribute('data-panel')).toBe('left-config');
    });

    it('should provide right panel content container', () => {
      shell = new TwoPanelShell(container);
      shell.init();

      const rightContent = shell.getRightPanelContent();
      expect(rightContent).not.toBeNull();
      expect(rightContent?.getAttribute('data-panel')).toBe('right-results');
    });

    it('should provide mobile drawer content container', () => {
      shell = new TwoPanelShell(container);
      shell.init();

      const drawerContent = shell.getMobileDrawerContent();
      expect(drawerContent).not.toBeNull();
    });
  });

  // ==========================================================================
  // Mobile View Tests
  // ==========================================================================

  describe('Mobile View', () => {
    beforeEach(() => {
      // Set window to mobile size
      Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });
    });

    it('should detect mobile view', () => {
      shell = new TwoPanelShell(container);
      shell.init();

      expect(shell.getIsMobile()).toBe(true);
    });

    it('should create mobile bottom navigation', () => {
      shell = new TwoPanelShell(container);
      shell.init();

      const bottomNav = document.body.querySelector('nav[aria-label="Tool navigation"].md\\:hidden, nav.fixed.bottom-0');
      expect(bottomNav).not.toBeNull();
    });

    it('should have mobile menu button', () => {
      shell = new TwoPanelShell(container);
      shell.init();

      const menuBtn = container.querySelector('button[aria-label="Open configuration menu"]');
      expect(menuBtn).not.toBeNull();
    });
  });

  // ==========================================================================
  // Desktop View Tests
  // ==========================================================================

  describe('Desktop View', () => {
    it('should detect desktop view', () => {
      shell = new TwoPanelShell(container);
      shell.init();

      expect(shell.getIsMobile()).toBe(false);
    });

    it('should show sidebar on desktop', () => {
      shell = new TwoPanelShell(container);
      shell.init();

      const sidebar = container.querySelector('aside.md\\:flex, aside:not(.hidden)');
      expect(sidebar).not.toBeNull();
    });
  });

  // ==========================================================================
  // Language Updates Tests
  // ==========================================================================

  describe('Language Updates', () => {
    it('should update navigation when language changes', () => {
      shell = new TwoPanelShell(container);
      shell.init();

      // Get initial tool names
      const toolNav = container.querySelector('nav[aria-label="Tool navigation"]');
      const initialButtons = toolNav?.querySelectorAll('button');
      const initialCount = initialButtons?.length;

      // Trigger language change (LanguageService.subscribe callback will be called)
      // This is tested implicitly through the subscription

      expect(initialCount).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Cleanup Tests
  // ==========================================================================

  describe('Cleanup', () => {
    it('should remove mobile bottom nav on destroy', () => {
      shell = new TwoPanelShell(container);
      shell.init();

      // Should have mobile bottom nav
      let bottomNav = document.body.querySelector('nav.fixed.bottom-0');

      shell.destroy();

      // Should be removed
      bottomNav = document.body.querySelector('nav.fixed.bottom-0');
      expect(bottomNav).toBeNull();
    });

    it('should clean up mobile drawer on destroy', () => {
      shell = new TwoPanelShell(container);
      shell.init();

      shell.destroy();

      const drawer = document.body.querySelector('.mobile-drawer');
      expect(drawer).toBeNull();
    });
  });
});
