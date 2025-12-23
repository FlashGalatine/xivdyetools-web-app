/**
 * XIV Dye Tools - Dye Action Dropdown Component Tests
 *
 * @module components/__tests__/dye-action-dropdown.test
 */

import { createDyeActionDropdown, DyeAction, DyeActionCallback } from '../dye-action-dropdown';
import { createTestContainer, cleanupTestContainer, mockDyeData } from './test-utils';
import type { Dye } from '@shared/types';

// Mock services
vi.mock('@services/index', () => ({
  LanguageService: {
    t: vi.fn((key: string) => {
      const translations: Record<string, string> = {
        'harmony.actions': 'Actions',
        'harmony.addToComparison': 'Add to Comparison',
        'harmony.addToMixer': 'Add to Mixer',
        'harmony.addToAccessibility': 'Add to Accessibility Checker',
        'harmony.seeHarmonies': 'See Color Harmonies',
        'harmony.seeBudget': 'See Budget Suggestions',
        'harmony.copyHex': 'Copy Hex Code',
        'harmony.copiedHex': 'Copied',
        'harmony.copyFailed': 'Failed to copy',
      };
      return translations[key] || key;
    }),
  },
  StorageService: {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
  },
  RouterService: {
    navigateTo: vi.fn(),
  },
}));

vi.mock('@services/toast-service', () => ({
  ToastService: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('createDyeActionDropdown', () => {
  let container: HTMLElement;
  let testDye: Dye;

  beforeEach(() => {
    container = createTestContainer();
    testDye = mockDyeData[0] as Dye;

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    cleanupTestContainer(container);
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should create dropdown container', () => {
      const dropdown = createDyeActionDropdown(testDye);
      container.appendChild(dropdown);

      expect(dropdown.className).toContain('dye-action-dropdown');
    });

    it('should have a trigger button with three dots icon', () => {
      const dropdown = createDyeActionDropdown(testDye);
      container.appendChild(dropdown);

      const button = dropdown.querySelector('button');
      expect(button).not.toBeNull();
      expect(button?.getAttribute('aria-label')).toBe('Actions');
      expect(button?.getAttribute('aria-haspopup')).toBe('true');
      expect(button?.innerHTML).toContain('svg');
    });

    it('should have a hidden menu initially', () => {
      const dropdown = createDyeActionDropdown(testDye);
      container.appendChild(dropdown);

      const menu = dropdown.querySelector('[role="menu"]');
      expect(menu).not.toBeNull();
      expect(menu?.className).toContain('invisible');
      expect(menu?.getAttribute('inert')).toBe('');
    });

    it('should render six menu items', () => {
      const dropdown = createDyeActionDropdown(testDye);
      container.appendChild(dropdown);

      const menuItems = dropdown.querySelectorAll('[role="menuitem"]');
      expect(menuItems.length).toBe(6);
    });

    it('should have correct menu item labels in order', () => {
      const dropdown = createDyeActionDropdown(testDye);
      container.appendChild(dropdown);

      const menuItems = dropdown.querySelectorAll('[role="menuitem"]');
      expect(menuItems[0].textContent).toContain('Add to Comparison');
      expect(menuItems[1].textContent).toContain('Add to Mixer');
      expect(menuItems[2].textContent).toContain('Add to Accessibility Checker');
      expect(menuItems[3].textContent).toContain('See Color Harmonies');
      expect(menuItems[4].textContent).toContain('See Budget Suggestions');
      expect(menuItems[5].textContent).toContain('Copy Hex Code');
    });
  });

  describe('Menu Toggle', () => {
    it('should open menu on button click', () => {
      const dropdown = createDyeActionDropdown(testDye);
      container.appendChild(dropdown);

      const button = dropdown.querySelector('button') as HTMLButtonElement;
      const menu = dropdown.querySelector('[role="menu"]') as HTMLElement;

      button.click();

      expect(menu.className).toContain('visible');
      expect(menu.className).not.toContain('invisible');
      expect(button.getAttribute('aria-expanded')).toBe('true');
      expect(menu.hasAttribute('inert')).toBe(false);
    });

    it('should close menu on second button click', () => {
      const dropdown = createDyeActionDropdown(testDye);
      container.appendChild(dropdown);

      const button = dropdown.querySelector('button') as HTMLButtonElement;
      const menu = dropdown.querySelector('[role="menu"]') as HTMLElement;

      button.click(); // Open
      button.click(); // Close

      expect(menu.className).toContain('invisible');
      expect(button.getAttribute('aria-expanded')).toBe('false');
    });

    it('should close menu on escape key', () => {
      const dropdown = createDyeActionDropdown(testDye);
      container.appendChild(dropdown);

      const button = dropdown.querySelector('button') as HTMLButtonElement;
      const menu = dropdown.querySelector('[role="menu"]') as HTMLElement;

      button.click(); // Open

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      dropdown.dispatchEvent(escapeEvent);

      expect(menu.className).toContain('invisible');
    });

    it('should close menu when clicking outside', async () => {
      const dropdown = createDyeActionDropdown(testDye);
      container.appendChild(dropdown);

      const button = dropdown.querySelector('button') as HTMLButtonElement;
      const menu = dropdown.querySelector('[role="menu"]') as HTMLElement;

      button.click(); // Open

      // Wait for click outside listener to be added
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Click outside
      document.body.click();

      expect(menu.className).toContain('invisible');
    });
  });

  describe('Actions', () => {
    it('should call onAction callback for comparison action', () => {
      const onAction = vi.fn();
      const dropdown = createDyeActionDropdown(testDye, onAction);
      container.appendChild(dropdown);

      const button = dropdown.querySelector('button') as HTMLButtonElement;
      button.click(); // Open menu

      const menuItems = dropdown.querySelectorAll('[role="menuitem"]') as NodeListOf<HTMLElement>;
      menuItems[0].click(); // Click "Add to Comparison"

      expect(onAction).toHaveBeenCalledWith('comparison', testDye);
    });

    it('should call onAction callback for mixer action', () => {
      const onAction = vi.fn();
      const dropdown = createDyeActionDropdown(testDye, onAction);
      container.appendChild(dropdown);

      const button = dropdown.querySelector('button') as HTMLButtonElement;
      button.click(); // Open menu

      const menuItems = dropdown.querySelectorAll('[role="menuitem"]') as NodeListOf<HTMLElement>;
      menuItems[1].click(); // Click "Add to Mixer"

      expect(onAction).toHaveBeenCalledWith('mixer', testDye);
    });

    it('should copy hex to clipboard for copy action', async () => {
      const dropdown = createDyeActionDropdown(testDye);
      container.appendChild(dropdown);

      const button = dropdown.querySelector('button') as HTMLButtonElement;
      button.click(); // Open menu

      const menuItems = dropdown.querySelectorAll('[role="menuitem"]') as NodeListOf<HTMLElement>;
      menuItems[5].click(); // Click "Copy Hex Code" (index 5)

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(testDye.hex);
    });

    it('should call onAction callback for harmony action', () => {
      const onAction = vi.fn();
      const dropdown = createDyeActionDropdown(testDye, onAction);
      container.appendChild(dropdown);

      const button = dropdown.querySelector('button') as HTMLButtonElement;
      button.click(); // Open menu

      const menuItems = dropdown.querySelectorAll('[role="menuitem"]') as NodeListOf<HTMLElement>;
      menuItems[3].click(); // Click "See Color Harmonies" (index 3)

      expect(onAction).toHaveBeenCalledWith('harmony', testDye);
    });

    it('should close menu after action', () => {
      const onAction = vi.fn();
      const dropdown = createDyeActionDropdown(testDye, onAction);
      container.appendChild(dropdown);

      const button = dropdown.querySelector('button') as HTMLButtonElement;
      const menu = dropdown.querySelector('[role="menu"]') as HTMLElement;

      button.click(); // Open menu

      const menuItems = dropdown.querySelectorAll('[role="menuitem"]') as NodeListOf<HTMLElement>;
      menuItems[0].click(); // Click action

      expect(menu.className).toContain('invisible');
    });
  });

  describe('Global Close Event', () => {
    it('should close when another dropdown opens', () => {
      const dropdown1 = createDyeActionDropdown(testDye);
      const dropdown2 = createDyeActionDropdown(mockDyeData[1] as Dye);
      container.appendChild(dropdown1);
      container.appendChild(dropdown2);

      const button1 = dropdown1.querySelector('button') as HTMLButtonElement;
      const button2 = dropdown2.querySelector('button') as HTMLButtonElement;
      const menu1 = dropdown1.querySelector('[role="menu"]') as HTMLElement;

      button1.click(); // Open first dropdown
      expect(menu1.className).toContain('visible');

      button2.click(); // Open second dropdown - should close first

      expect(menu1.className).toContain('invisible');
    });
  });

  describe('Cleanup', () => {
    it('should have cleanup function attached', () => {
      const dropdown = createDyeActionDropdown(testDye) as HTMLElement & {
        __cleanup?: () => void;
      };

      expect(typeof dropdown.__cleanup).toBe('function');
    });

    it('should cleanup properly when called', () => {
      const dropdown = createDyeActionDropdown(testDye) as HTMLElement & {
        __cleanup?: () => void;
      };
      container.appendChild(dropdown);

      const button = dropdown.querySelector('button') as HTMLButtonElement;
      button.click(); // Open menu

      dropdown.__cleanup?.();

      const menu = dropdown.querySelector('[role="menu"]') as HTMLElement;
      expect(menu.className).toContain('invisible');
    });
  });
});
