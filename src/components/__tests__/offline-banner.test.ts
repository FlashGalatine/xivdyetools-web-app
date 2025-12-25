/**
 * XIV Dye Tools - Offline Banner Component Tests
 *
 * @module components/__tests__/offline-banner.test
 */

import { OfflineBanner, offlineBanner } from '../offline-banner';

// Mock services
vi.mock('@services/index', () => ({
  LanguageService: {
    t: vi.fn((key: string) => {
      const translations: Record<string, string> = {
        'offline.banner': 'You are offline. Some features may be limited.',
        'common.dismiss': 'Dismiss',
      };
      return translations[key] || key;
    }),
  },
}));

vi.mock('@shared/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('OfflineBanner', () => {
  let banner: OfflineBanner;
  let originalOnLine: boolean;

  beforeEach(() => {
    // Store original online status
    originalOnLine = navigator.onLine;

    // Reset singleton by destroying any existing instance
    try {
      offlineBanner.destroy();
    } catch {
      // Ignore if already destroyed
    }

    // Create fresh instance
    banner = OfflineBanner.getInstance();

    // Clean up any existing banners
    document.body.style.paddingTop = '0';
    const existingBanners = document.querySelectorAll('#offline-banner');
    existingBanners.forEach((b) => b.remove());
  });

  afterEach(() => {
    banner.destroy();

    // Restore original online status mock
    Object.defineProperty(navigator, 'onLine', {
      value: originalOnLine,
      writable: true,
      configurable: true,
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = OfflineBanner.getInstance();
      const instance2 = OfflineBanner.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Initialization', () => {
    it('should create banner element on initialize', () => {
      banner.initialize();

      const bannerEl = document.getElementById('offline-banner');
      expect(bannerEl).not.toBeNull();
    });

    it('should set proper ARIA attributes', () => {
      banner.initialize();

      const bannerEl = document.getElementById('offline-banner');
      expect(bannerEl?.getAttribute('role')).toBe('alert');
      expect(bannerEl?.getAttribute('aria-live')).toBe('polite');
    });

    it('should have message text', () => {
      banner.initialize();

      const message = document.getElementById('offline-banner-message');
      expect(message?.textContent).toBe('You are offline. Some features may be limited.');
    });

    it('should have dismiss button', () => {
      banner.initialize();

      const dismissBtn = document.querySelector('#offline-banner button');
      expect(dismissBtn).not.toBeNull();
      expect(dismissBtn?.getAttribute('aria-label')).toBe('Dismiss');
    });
  });

  describe('Online/Offline Status', () => {
    it('should return correct online status', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      });

      // Need fresh instance to pick up new navigator.onLine
      banner.destroy();
      banner = OfflineBanner.getInstance();

      expect(banner.getIsOnline()).toBe(true);
    });

    it('should show banner when offline event fires', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      });

      banner.initialize();

      // Simulate going offline
      window.dispatchEvent(new Event('offline'));

      const bannerEl = document.getElementById('offline-banner') as HTMLElement;
      expect(bannerEl.style.transform).toBe('translateY(0)');
    });

    it('should hide banner when online event fires', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      });

      banner.destroy();
      banner = OfflineBanner.getInstance();
      banner.initialize();

      // Simulate going online
      window.dispatchEvent(new Event('online'));

      const bannerEl = document.getElementById('offline-banner') as HTMLElement;
      expect(bannerEl.style.transform).toBe('translateY(-100%)');
    });
  });

  describe('Show/Hide Banner', () => {
    it('should handle showBanner when not initialized (banner is null)', () => {
      // Don't initialize - banner is null
      expect(() => banner.showBanner()).not.toThrow();
    });

    it('should handle hideBanner when not initialized (banner is null)', () => {
      // Don't initialize - banner is null
      expect(() => banner.hideBanner()).not.toThrow();
    });

    it('should show banner with showBanner()', () => {
      banner.initialize();
      banner.showBanner();

      const bannerEl = document.getElementById('offline-banner') as HTMLElement;
      expect(bannerEl.style.transform).toBe('translateY(0)');
    });

    it('should hide banner with hideBanner()', () => {
      banner.initialize();
      banner.showBanner();
      banner.hideBanner();

      const bannerEl = document.getElementById('offline-banner') as HTMLElement;
      expect(bannerEl.style.transform).toBe('translateY(-100%)');
    });

    it('should add body padding when shown', () => {
      banner.initialize();
      banner.showBanner();

      // Body padding should be set (value depends on banner height)
      expect(document.body.style.paddingTop).not.toBe('0');
    });

    it('should remove body padding when hidden', () => {
      banner.initialize();
      banner.showBanner();
      banner.hideBanner();

      expect(document.body.style.paddingTop).toBe('0px');
    });
  });

  describe('Dismiss Button', () => {
    it('should hide banner when dismiss clicked', () => {
      banner.initialize();
      banner.showBanner();

      const dismissBtn = document.querySelector('#offline-banner button') as HTMLElement;
      dismissBtn.click();

      const bannerEl = document.getElementById('offline-banner') as HTMLElement;
      expect(bannerEl.style.transform).toBe('translateY(-100%)');
    });
  });

  describe('Status Change Subscription', () => {
    it('should call callback on online event', () => {
      const callback = vi.fn();
      const unsubscribe = banner.onStatusChange(callback);

      window.dispatchEvent(new Event('online'));

      expect(callback).toHaveBeenCalledWith(true);

      unsubscribe();
    });

    it('should call callback on offline event', () => {
      const callback = vi.fn();
      const unsubscribe = banner.onStatusChange(callback);

      window.dispatchEvent(new Event('offline'));

      expect(callback).toHaveBeenCalledWith(false);

      unsubscribe();
    });

    it('should stop receiving events after unsubscribe', () => {
      const callback = vi.fn();
      const unsubscribe = banner.onStatusChange(callback);

      unsubscribe();

      window.dispatchEvent(new Event('online'));
      window.dispatchEvent(new Event('offline'));

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Update Message', () => {
    it('should update banner message text', () => {
      banner.initialize();

      banner.updateMessage();

      const message = document.getElementById('offline-banner-message');
      expect(message?.textContent).toBe('You are offline. Some features may be limited.');
    });

    it('should handle updateMessage when banner is not initialized', () => {
      // Don't initialize - banner is null
      expect(() => banner.updateMessage()).not.toThrow();
    });

    it('should handle updateMessage when message element is missing', () => {
      banner.initialize();

      // Remove the message element
      const message = document.getElementById('offline-banner-message');
      message?.remove();

      // Should not throw
      expect(() => banner.updateMessage()).not.toThrow();
    });
  });

  describe('Banner Recreation', () => {
    it('should remove existing banner when initialize is called twice', () => {
      banner.initialize();

      const firstBanner = document.getElementById('offline-banner');
      expect(firstBanner).not.toBeNull();

      // Call initialize again - should remove old banner and create new one
      banner.initialize();

      // Should still have exactly one banner
      const banners = document.querySelectorAll('#offline-banner');
      expect(banners.length).toBe(1);
    });
  });

  describe('Cleanup', () => {
    it('should remove banner on destroy', () => {
      banner.initialize();
      banner.destroy();

      const bannerEl = document.getElementById('offline-banner');
      expect(bannerEl).toBeNull();
    });

    it('should reset body padding on destroy', () => {
      banner.initialize();
      banner.showBanner();
      banner.destroy();

      expect(document.body.style.paddingTop).toBe('0px');
    });

    it('should reset singleton instance on destroy', () => {
      banner.initialize();
      banner.destroy();

      // Getting instance after destroy should work
      const newBanner = OfflineBanner.getInstance();
      expect(newBanner).not.toBeNull();
    });
  });
});
