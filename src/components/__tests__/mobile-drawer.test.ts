/**
 * XIV Dye Tools - Mobile Drawer Tests
 *
 * Tests for the MobileDrawer component
 * Covers: open/close behavior, keyboard navigation, accessibility
 */

import { MobileDrawer } from '../mobile-drawer';
import { AnnouncerService } from '@services/index';
import {
  createTestContainer,
  cleanupTestContainer,
} from './test-utils';

// ============================================================================
// Tests
// ============================================================================

describe('MobileDrawer', () => {
  let container: HTMLElement;
  let drawer: MobileDrawer;
  let mockAnnounce: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = createTestContainer();

    // Mock AnnouncerService
    mockAnnounce = vi.fn();
    vi.spyOn(AnnouncerService, 'announce').mockImplementation(mockAnnounce);
  });

  afterEach(() => {
    if (drawer) {
      drawer.destroy();
    }
    cleanupTestContainer(container);
    vi.restoreAllMocks();
    // Clean up body overflow style
    document.body.style.overflow = '';
  });

  // ==========================================================================
  // Initialization Tests
  // ==========================================================================

  describe('Initialization', () => {
    it('should create overlay element', () => {
      drawer = new MobileDrawer(container);
      drawer.init();

      const overlay = document.body.querySelector('.drawer-overlay');
      expect(overlay).not.toBeNull();
    });

    it('should create drawer element', () => {
      drawer = new MobileDrawer(container);
      drawer.init();

      const drawerEl = document.body.querySelector('.mobile-drawer');
      expect(drawerEl).not.toBeNull();
    });

    it('should append drawer to document body', () => {
      drawer = new MobileDrawer(container);
      drawer.init();

      const drawerEl = document.body.querySelector('.mobile-drawer');
      expect(drawerEl?.parentElement).toBe(document.body);
    });

    it('should have closed state by default', () => {
      drawer = new MobileDrawer(container);
      drawer.init();

      expect(drawer.getIsOpen()).toBe(false);
    });

    it('should render close button', () => {
      drawer = new MobileDrawer(container);
      drawer.init();

      const closeBtn = document.body.querySelector('button[aria-label="Close configuration panel"]');
      expect(closeBtn).not.toBeNull();
    });

    it('should render drawer header with title', () => {
      drawer = new MobileDrawer(container);
      drawer.init();

      const header = document.body.querySelector('.mobile-drawer h2');
      expect(header?.textContent).toBe('Configuration');
    });

    it('should have proper accessibility attributes', () => {
      drawer = new MobileDrawer(container);
      drawer.init();

      const drawerEl = document.body.querySelector('.mobile-drawer');
      expect(drawerEl?.getAttribute('role')).toBe('dialog');
      expect(drawerEl?.getAttribute('aria-modal')).toBe('true');
      expect(drawerEl?.getAttribute('aria-label')).toBe('Configuration panel');
    });
  });

  // ==========================================================================
  // Open/Close Tests
  // ==========================================================================

  describe('Open/Close', () => {
    beforeEach(() => {
      drawer = new MobileDrawer(container);
      drawer.init();
    });

    it('should open when open() is called', () => {
      drawer.open();
      expect(drawer.getIsOpen()).toBe(true);
    });

    it('should close when close() is called', () => {
      drawer.open();
      drawer.close();
      expect(drawer.getIsOpen()).toBe(false);
    });

    it('should toggle between open and closed', () => {
      expect(drawer.getIsOpen()).toBe(false);

      drawer.toggle();
      expect(drawer.getIsOpen()).toBe(true);

      drawer.toggle();
      expect(drawer.getIsOpen()).toBe(false);
    });

    it('should not re-open when already open', () => {
      drawer.open();
      const overlayOpacity = (document.body.querySelector('.drawer-overlay') as HTMLElement)?.style.opacity;

      drawer.open(); // Call again

      const newOpacity = (document.body.querySelector('.drawer-overlay') as HTMLElement)?.style.opacity;
      expect(newOpacity).toBe(overlayOpacity);
    });

    it('should not re-close when already closed', () => {
      // Already closed, try to close again
      drawer.close();

      expect(drawer.getIsOpen()).toBe(false);
    });

    it('should show overlay when opened', () => {
      drawer.open();

      const overlay = document.body.querySelector('.drawer-overlay') as HTMLElement;
      expect(overlay?.style.opacity).toBe('1');
      expect(overlay?.style.pointerEvents).toBe('auto');
    });

    it('should hide overlay when closed', () => {
      drawer.open();
      drawer.close();

      const overlay = document.body.querySelector('.drawer-overlay') as HTMLElement;
      expect(overlay?.style.opacity).toBe('0');
      expect(overlay?.style.pointerEvents).toBe('none');
    });

    it('should slide drawer in when opened', () => {
      drawer.open();

      const drawerEl = document.body.querySelector('.mobile-drawer') as HTMLElement;
      expect(drawerEl?.style.transform).toBe('translateX(0)');
    });

    it('should slide drawer out when closed', () => {
      drawer.open();
      drawer.close();

      const drawerEl = document.body.querySelector('.mobile-drawer') as HTMLElement;
      expect(drawerEl?.style.transform).toBe('translateX(-100%)');
    });
  });

  // ==========================================================================
  // Body Scroll Lock Tests
  // ==========================================================================

  describe('Body Scroll Lock', () => {
    beforeEach(() => {
      drawer = new MobileDrawer(container);
      drawer.init();
    });

    it('should prevent body scroll when opened', () => {
      drawer.open();
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore body scroll when closed', () => {
      drawer.open();
      drawer.close();
      expect(document.body.style.overflow).toBe('');
    });

    it('should restore body scroll on destroy', () => {
      drawer.open();
      drawer.destroy();
      expect(document.body.style.overflow).toBe('');
    });
  });

  // ==========================================================================
  // Keyboard Navigation Tests
  // ==========================================================================

  describe('Keyboard Navigation', () => {
    beforeEach(() => {
      drawer = new MobileDrawer(container);
      drawer.init();
    });

    it('should close when Escape key is pressed', () => {
      drawer.open();

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);

      expect(drawer.getIsOpen()).toBe(false);
    });

    it('should not close on Escape when already closed', () => {
      // Drawer is closed
      const closeSpy = vi.spyOn(drawer, 'close');

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);

      // close() should not be called because drawer wasn't open
      expect(closeSpy).not.toHaveBeenCalled();
    });

    it('should not close on other key presses', () => {
      drawer.open();

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      document.dispatchEvent(enterEvent);

      expect(drawer.getIsOpen()).toBe(true);
    });
  });

  // ==========================================================================
  // Overlay Click Tests
  // ==========================================================================

  describe('Overlay Click', () => {
    beforeEach(() => {
      drawer = new MobileDrawer(container);
      drawer.init();
    });

    it('should close when overlay is clicked', () => {
      drawer.open();

      const overlay = document.body.querySelector('.drawer-overlay') as HTMLElement;
      overlay.click();

      expect(drawer.getIsOpen()).toBe(false);
    });
  });

  // ==========================================================================
  // Close Button Tests
  // ==========================================================================

  describe('Close Button', () => {
    beforeEach(() => {
      drawer = new MobileDrawer(container);
      drawer.init();
    });

    it('should close when close button is clicked', () => {
      drawer.open();

      const closeBtn = document.body.querySelector('button[aria-label="Close configuration panel"]') as HTMLButtonElement;
      closeBtn.click();

      expect(drawer.getIsOpen()).toBe(false);
    });
  });

  // ==========================================================================
  // Screen Reader Announcements Tests
  // ==========================================================================

  describe('Screen Reader Announcements', () => {
    beforeEach(() => {
      drawer = new MobileDrawer(container);
      drawer.init();
    });

    it('should announce when drawer opens', () => {
      drawer.open();

      expect(mockAnnounce).toHaveBeenCalledWith('Configuration panel opened');
    });

    it('should announce when drawer closes', () => {
      drawer.open();
      mockAnnounce.mockClear();

      drawer.close();

      expect(mockAnnounce).toHaveBeenCalledWith('Configuration panel closed');
    });
  });

  // ==========================================================================
  // Content Management Tests
  // ==========================================================================

  describe('Content Management', () => {
    beforeEach(() => {
      drawer = new MobileDrawer(container);
      drawer.init();
    });

    it('should return content container via getContentContainer()', () => {
      const contentContainer = drawer.getContentContainer();
      expect(contentContainer).not.toBeNull();
      expect(contentContainer?.classList.contains('overflow-y-auto')).toBe(true);
    });

    it('should allow adding content to container', () => {
      const contentContainer = drawer.getContentContainer();

      const customContent = document.createElement('div');
      customContent.className = 'custom-content';
      customContent.textContent = 'Test Content';

      contentContainer?.appendChild(customContent);

      expect(contentContainer?.querySelector('.custom-content')).not.toBeNull();
    });

    it('should set title via setTitle()', () => {
      drawer.setTitle('New Title');

      const title = document.body.querySelector('.mobile-drawer h2');
      expect(title?.textContent).toBe('New Title');
    });
  });

  // ==========================================================================
  // Cleanup Tests
  // ==========================================================================

  describe('Cleanup', () => {
    it('should remove overlay and drawer from DOM on destroy', () => {
      drawer = new MobileDrawer(container);
      drawer.init();

      expect(document.body.querySelector('.drawer-overlay')).not.toBeNull();
      expect(document.body.querySelector('.mobile-drawer')).not.toBeNull();

      drawer.destroy();

      expect(document.body.querySelector('.drawer-overlay')).toBeNull();
      expect(document.body.querySelector('.mobile-drawer')).toBeNull();
    });

    it('should restore body overflow on destroy', () => {
      drawer = new MobileDrawer(container);
      drawer.init();
      drawer.open();

      expect(document.body.style.overflow).toBe('hidden');

      drawer.destroy();

      expect(document.body.style.overflow).toBe('');
    });
  });

  // ==========================================================================
  // Focus Management Tests
  // ==========================================================================

  describe('Focus Management', () => {
    beforeEach(() => {
      drawer = new MobileDrawer(container);
      drawer.init();
      // Use fake timers for this describe block
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should restore focus to previously active element on close', () => {
      // Create a button to focus before opening drawer
      const externalButton = document.createElement('button');
      externalButton.id = 'external-button';
      document.body.appendChild(externalButton);
      externalButton.focus();

      expect(document.activeElement).toBe(externalButton);

      drawer.open();
      vi.advanceTimersByTime(300);

      // After opening, focus moves to drawer
      drawer.close();

      // Focus should be restored to the button
      expect(document.activeElement).toBe(externalButton);

      externalButton.remove();
    });
  });
});
