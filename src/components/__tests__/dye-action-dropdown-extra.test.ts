/**
 * XIV Dye Tools - Dye Action Dropdown Component Additional Tests
 * Branch coverage tests for tool integrations and edge cases
 *
 * @module components/__tests__/dye-action-dropdown-extra.test
 */

import { createDyeActionDropdown } from '../dye-action-dropdown';
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
        'harmony.dyeAlreadyInComparison': 'Dye already in Comparison',
        'harmony.dyeAlreadyInMixer': 'Dye already in Mixer',
        'harmony.dyeAlreadyInAccessibility': 'Dye already in Accessibility',
        'harmony.addedToComparison': 'Added to Comparison',
        'harmony.addedToMixer': 'Added to Mixer',
        'harmony.addedToAccessibility': 'Added to Accessibility',
      };
      return translations[key] || key;
    }),
    getDyeName: vi.fn((itemID: number) => `Dye ${itemID}`),
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
    info: vi.fn(),
  },
}));

vi.mock('@services/modal-service', () => ({
  ModalService: {
    show: vi.fn(() => 'modal-id'),
    dismiss: vi.fn(),
  },
}));

vi.mock('@services/dye-service-wrapper', () => ({
  DyeService: {
    getInstance: vi.fn(() => ({
      getDyeById: vi.fn((id: number) => mockDyeData.find((d) => d.id === id) || null),
    })),
  },
}));

vi.mock('@shared/logger', () => ({
  logger: {
    info: vi.fn(),
  },
}));

// ==========================================================================
// Branch Coverage - Tool Integration Actions
// ==========================================================================

describe('Dye Action Dropdown - Tool Integration Actions', () => {
  let container: HTMLElement;
  let testDye: Dye;
  let StorageService: { getItem: ReturnType<typeof vi.fn>; setItem: ReturnType<typeof vi.fn> };
  let RouterService: { navigateTo: ReturnType<typeof vi.fn> };
  let ToastService: {
    success: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    container = createTestContainer();
    testDye = mockDyeData[0] as Dye;

    const services = await import('@services/index');
    StorageService = services.StorageService as unknown as typeof StorageService;
    RouterService = services.RouterService as unknown as typeof RouterService;

    const toastModule = await import('@services/toast-service');
    ToastService = toastModule.ToastService as unknown as typeof ToastService;

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

  describe('Add to Comparison', () => {
    it('should add dye when comparison has space', async () => {
      StorageService.getItem.mockReturnValue([]);

      const dropdown = createDyeActionDropdown(testDye);
      container.appendChild(dropdown);

      const button = dropdown.querySelector('button') as HTMLButtonElement;
      button.click();

      const menuItems = dropdown.querySelectorAll('[role="menuitem"]');
      (menuItems[0] as HTMLElement).click();

      expect(StorageService.setItem).toHaveBeenCalledWith('v3_comparison_selected_dyes', [
        testDye.id,
      ]);
      expect(ToastService.success).toHaveBeenCalled();
      expect(RouterService.navigateTo).toHaveBeenCalledWith('comparison');
    });

    it('should show info toast when dye already in comparison', async () => {
      StorageService.getItem.mockReturnValue([testDye.id]);

      const dropdown = createDyeActionDropdown(testDye);
      container.appendChild(dropdown);

      const button = dropdown.querySelector('button') as HTMLButtonElement;
      button.click();

      const menuItems = dropdown.querySelectorAll('[role="menuitem"]');
      (menuItems[0] as HTMLElement).click();

      expect(ToastService.info).toHaveBeenCalled();
      expect(StorageService.setItem).not.toHaveBeenCalled();
    });

    it('should add to existing dyes in comparison', async () => {
      StorageService.getItem.mockReturnValue([2]); // One existing dye

      const dropdown = createDyeActionDropdown(testDye);
      container.appendChild(dropdown);

      const button = dropdown.querySelector('button') as HTMLButtonElement;
      button.click();

      const menuItems = dropdown.querySelectorAll('[role="menuitem"]');
      (menuItems[0] as HTMLElement).click();

      expect(StorageService.setItem).toHaveBeenCalledWith('v3_comparison_selected_dyes', [
        2,
        testDye.id,
      ]);
    });
  });

  describe('Add to Mixer', () => {
    it('should add dye when mixer has space', async () => {
      StorageService.getItem.mockReturnValue([]);

      const dropdown = createDyeActionDropdown(testDye);
      container.appendChild(dropdown);

      const button = dropdown.querySelector('button') as HTMLButtonElement;
      button.click();

      const menuItems = dropdown.querySelectorAll('[role="menuitem"]');
      (menuItems[1] as HTMLElement).click();

      expect(StorageService.setItem).toHaveBeenCalledWith('v3_mixer_selected_dyes', [testDye.id]);
      expect(ToastService.success).toHaveBeenCalled();
      expect(RouterService.navigateTo).toHaveBeenCalledWith('mixer');
    });

    it('should show info toast when dye already in mixer', async () => {
      StorageService.getItem.mockReturnValue([testDye.id]);

      const dropdown = createDyeActionDropdown(testDye);
      container.appendChild(dropdown);

      const button = dropdown.querySelector('button') as HTMLButtonElement;
      button.click();

      const menuItems = dropdown.querySelectorAll('[role="menuitem"]');
      (menuItems[1] as HTMLElement).click();

      expect(ToastService.info).toHaveBeenCalled();
      expect(StorageService.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Add to Accessibility', () => {
    it('should add dye when accessibility has space', async () => {
      StorageService.getItem.mockReturnValue([]);

      const dropdown = createDyeActionDropdown(testDye);
      container.appendChild(dropdown);

      const button = dropdown.querySelector('button') as HTMLButtonElement;
      button.click();

      const menuItems = dropdown.querySelectorAll('[role="menuitem"]');
      (menuItems[2] as HTMLElement).click();

      expect(StorageService.setItem).toHaveBeenCalledWith('v3_accessibility_selected_dyes', [
        testDye.id,
      ]);
      expect(ToastService.success).toHaveBeenCalled();
      expect(RouterService.navigateTo).toHaveBeenCalledWith('accessibility');
    });

    it('should show info toast when dye already in accessibility', async () => {
      StorageService.getItem.mockReturnValue([testDye.id]);

      const dropdown = createDyeActionDropdown(testDye);
      container.appendChild(dropdown);

      const button = dropdown.querySelector('button') as HTMLButtonElement;
      button.click();

      const menuItems = dropdown.querySelectorAll('[role="menuitem"]');
      (menuItems[2] as HTMLElement).click();

      expect(ToastService.info).toHaveBeenCalled();
      expect(StorageService.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Set as Budget Target', () => {
    it('should set dye as budget target and navigate', async () => {
      const dropdown = createDyeActionDropdown(testDye);
      container.appendChild(dropdown);

      const button = dropdown.querySelector('button') as HTMLButtonElement;
      button.click();

      const menuItems = dropdown.querySelectorAll('[role="menuitem"]');
      (menuItems[4] as HTMLElement).click();

      expect(StorageService.setItem).toHaveBeenCalledWith('v3_budget_target', testDye.id);
      expect(RouterService.navigateTo).toHaveBeenCalledWith('budget');
    });
  });

  describe('Navigate to Harmony', () => {
    it('should navigate to harmony with dye itemID', async () => {
      const dropdown = createDyeActionDropdown(testDye);
      container.appendChild(dropdown);

      const button = dropdown.querySelector('button') as HTMLButtonElement;
      button.click();

      const menuItems = dropdown.querySelectorAll('[role="menuitem"]');
      (menuItems[3] as HTMLElement).click();

      expect(RouterService.navigateTo).toHaveBeenCalledWith('harmony', {
        dyeId: String(testDye.itemID),
      });
    });
  });
});

// ==========================================================================
// Branch Coverage - Hover Effects
// ==========================================================================

describe('Dye Action Dropdown - Hover Effects', () => {
  let container: HTMLElement;
  let testDye: Dye;

  beforeEach(() => {
    container = createTestContainer();
    testDye = mockDyeData[0] as Dye;

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

  it('should apply hover styles on trigger button mouseenter', () => {
    const dropdown = createDyeActionDropdown(testDye);
    container.appendChild(dropdown);

    const button = dropdown.querySelector('button') as HTMLButtonElement;
    button.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

    expect(button.style.backgroundColor).toBe('var(--theme-card-hover)');
  });

  it('should remove hover styles on trigger button mouseleave', () => {
    const dropdown = createDyeActionDropdown(testDye);
    container.appendChild(dropdown);

    const button = dropdown.querySelector('button') as HTMLButtonElement;
    button.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    button.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));

    expect(button.style.backgroundColor).toBe('');
  });

  it('should apply hover styles on menu item mouseenter', () => {
    const dropdown = createDyeActionDropdown(testDye);
    container.appendChild(dropdown);

    const button = dropdown.querySelector('button') as HTMLButtonElement;
    button.click();

    const menuItem = dropdown.querySelector('[role="menuitem"]') as HTMLButtonElement;
    menuItem.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

    expect(menuItem.style.backgroundColor).toBe('var(--theme-card-hover)');
  });

  it('should remove hover styles on menu item mouseleave', () => {
    const dropdown = createDyeActionDropdown(testDye);
    container.appendChild(dropdown);

    const button = dropdown.querySelector('button') as HTMLButtonElement;
    button.click();

    const menuItem = dropdown.querySelector('[role="menuitem"]') as HTMLButtonElement;
    menuItem.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    menuItem.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));

    expect(menuItem.style.backgroundColor).toBe('');
  });
});

// ==========================================================================
// Branch Coverage - Edge Cases
// ==========================================================================

describe('Dye Action Dropdown - Edge Cases', () => {
  let container: HTMLElement;
  let testDye: Dye;

  beforeEach(() => {
    container = createTestContainer();
    testDye = mockDyeData[0] as Dye;

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

  it('should work without onAction callback', () => {
    const dropdown = createDyeActionDropdown(testDye);
    container.appendChild(dropdown);

    const button = dropdown.querySelector('button') as HTMLButtonElement;
    button.click();

    const menuItems = dropdown.querySelectorAll('[role="menuitem"]');
    expect(() => (menuItems[0] as HTMLElement).click()).not.toThrow();
  });

  it('should ignore escape key when menu is closed', () => {
    const dropdown = createDyeActionDropdown(testDye);
    container.appendChild(dropdown);

    const menu = dropdown.querySelector('[role="menu"]') as HTMLElement;
    expect(menu.className).toContain('invisible');

    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    dropdown.dispatchEvent(escapeEvent);

    expect(menu.className).toContain('invisible');
  });

  it('should focus button after closing with escape', () => {
    const dropdown = createDyeActionDropdown(testDye);
    container.appendChild(dropdown);

    const button = dropdown.querySelector('button') as HTMLButtonElement;
    button.click();

    const focusSpy = vi.spyOn(button, 'focus');
    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    dropdown.dispatchEvent(escapeEvent);

    expect(focusSpy).toHaveBeenCalled();
  });

  it('should handle close-all event for detached container', () => {
    const dropdown = createDyeActionDropdown(testDye);
    container.appendChild(dropdown);

    const button = dropdown.querySelector('button') as HTMLButtonElement;
    button.click();

    dropdown.remove();

    expect(() => {
      document.dispatchEvent(
        new CustomEvent('dye-dropdown-close-all', {
          detail: { except: document.createElement('div') },
        })
      );
    }).not.toThrow();
  });

  it('should generate unique menu IDs for multiple dropdowns', () => {
    const dropdown1 = createDyeActionDropdown(testDye);
    const dropdown2 = createDyeActionDropdown(mockDyeData[1] as Dye);
    container.appendChild(dropdown1);
    container.appendChild(dropdown2);

    const menu1 = dropdown1.querySelector('[role="menu"]');
    const menu2 = dropdown2.querySelector('[role="menu"]');

    expect(menu1?.id).not.toBe(menu2?.id);
    expect(menu1?.id).toMatch(/^dye-action-menu-\d+$/);
    expect(menu2?.id).toMatch(/^dye-action-menu-\d+$/);
  });
});

// ==========================================================================
// Branch Coverage - Clipboard Fallback Error
// ==========================================================================

describe('Dye Action Dropdown - Clipboard Fallback Error', () => {
  let container: HTMLElement;
  let testDye: Dye;

  beforeEach(async () => {
    container = createTestContainer();
    testDye = mockDyeData[0] as Dye;
  });

  afterEach(() => {
    cleanupTestContainer(container);
    vi.clearAllMocks();
  });

  it('should show error toast when fallback copy fails', async () => {
    const toastModule = await import('@services/toast-service');
    const ToastService = toastModule.ToastService;

    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('Clipboard denied')),
      },
    });

    document.execCommand = vi.fn().mockImplementation(() => {
      throw new Error('execCommand failed');
    });

    const dropdown = createDyeActionDropdown(testDye);
    container.appendChild(dropdown);

    const button = dropdown.querySelector('button') as HTMLButtonElement;
    button.click();

    const menuItems = dropdown.querySelectorAll('[role="menuitem"]');
    (menuItems[5] as HTMLElement).click();

    await new Promise((r) => setTimeout(r, 50));
    expect(ToastService.error).toHaveBeenCalled();
  });
});

// ==========================================================================
// Branch Coverage - Slot Selection Modal
// ==========================================================================

describe('Dye Action Dropdown - Full Slots (Modal)', () => {
  let container: HTMLElement;
  let testDye: Dye;
  let StorageService: { getItem: ReturnType<typeof vi.fn>; setItem: ReturnType<typeof vi.fn> };
  let ModalService: { show: ReturnType<typeof vi.fn>; dismiss: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    container = createTestContainer();
    testDye = mockDyeData[0] as Dye;

    const services = await import('@services/index');
    StorageService = services.StorageService as unknown as typeof StorageService;

    const modalModule = await import('@services/modal-service');
    ModalService = modalModule.ModalService as unknown as typeof ModalService;

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

  it('should show slot selection modal when comparison is full', async () => {
    StorageService.getItem.mockReturnValue([2, 3, 4, 5]); // 4 dyes = full

    const dropdown = createDyeActionDropdown(testDye);
    container.appendChild(dropdown);

    const button = dropdown.querySelector('button') as HTMLButtonElement;
    button.click();

    const menuItems = dropdown.querySelectorAll('[role="menuitem"]');
    (menuItems[0] as HTMLElement).click();

    expect(ModalService.show).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'custom',
        closable: true,
        closeOnBackdrop: true,
      })
    );
  });

  it('should show slot selection modal when mixer is full', async () => {
    StorageService.getItem.mockReturnValue([2, 3]); // 2 dyes = full for mixer

    const dropdown = createDyeActionDropdown(testDye);
    container.appendChild(dropdown);

    const button = dropdown.querySelector('button') as HTMLButtonElement;
    button.click();

    const menuItems = dropdown.querySelectorAll('[role="menuitem"]');
    (menuItems[1] as HTMLElement).click();

    expect(ModalService.show).toHaveBeenCalled();
  });

  it('should show slot selection modal when accessibility is full', async () => {
    StorageService.getItem.mockReturnValue([2, 3, 4, 5]); // 4 dyes = full

    const dropdown = createDyeActionDropdown(testDye);
    container.appendChild(dropdown);

    const button = dropdown.querySelector('button') as HTMLButtonElement;
    button.click();

    const menuItems = dropdown.querySelectorAll('[role="menuitem"]');
    (menuItems[2] as HTMLElement).click();

    expect(ModalService.show).toHaveBeenCalled();
  });
});
