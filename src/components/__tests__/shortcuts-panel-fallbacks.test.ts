/**
 * XIV Dye Tools - Shortcuts Panel Fallback & Platform Tests
 *
 * Tests for fallback values and Mac platform detection
 * Improves branch coverage for shortcuts-panel.ts
 */

import { showShortcutsPanel } from '../shortcuts-panel';
import { ModalService, LanguageService } from '@services/index';

// Mock ModalService
vi.mock('@services/index', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    ModalService: {
      show: vi.fn().mockReturnValue('modal-id-123'),
    },
  };
});

describe('shortcuts-panel fallbacks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Translation Fallbacks', () => {
    it('should use fallback for shortcuts.navigation when translation is empty', () => {
      vi.spyOn(LanguageService, 't').mockImplementation((key: string) => {
        if (key === 'shortcuts.navigation') return '';
        return key;
      });

      showShortcutsPanel();
      
      const call = vi.mocked(ModalService.show).mock.calls[0][0];
      const content = call.content as HTMLElement;
      expect(content.textContent).toContain('Navigation');
    });

    it('should use fallback for shortcuts.switchTool when translation is empty', () => {
      vi.spyOn(LanguageService, 't').mockImplementation((key: string) => {
        if (key === 'shortcuts.switchTool') return '';
        return key;
      });

      showShortcutsPanel();
      
      const call = vi.mocked(ModalService.show).mock.calls[0][0];
      const content = call.content as HTMLElement;
      expect(content.textContent).toContain('Switch between tools');
    });

    it('should use fallback for shortcuts.closeModal when translation is empty', () => {
      vi.spyOn(LanguageService, 't').mockImplementation((key: string) => {
        if (key === 'shortcuts.closeModal') return '';
        return key;
      });

      showShortcutsPanel();
      
      const call = vi.mocked(ModalService.show).mock.calls[0][0];
      const content = call.content as HTMLElement;
      expect(content.textContent).toContain('Close modal or dropdown');
    });

    it('should use fallback for shortcuts.quickActions when translation is empty', () => {
      vi.spyOn(LanguageService, 't').mockImplementation((key: string) => {
        if (key === 'shortcuts.quickActions') return '';
        return key;
      });

      showShortcutsPanel();
      
      const call = vi.mocked(ModalService.show).mock.calls[0][0];
      const content = call.content as HTMLElement;
      expect(content.textContent).toContain('Quick Actions');
    });

    it('should use fallback for shortcuts.toggleTheme when translation is empty', () => {
      vi.spyOn(LanguageService, 't').mockImplementation((key: string) => {
        if (key === 'shortcuts.toggleTheme') return '';
        return key;
      });

      showShortcutsPanel();
      
      const call = vi.mocked(ModalService.show).mock.calls[0][0];
      const content = call.content as HTMLElement;
      expect(content.textContent).toContain('Toggle theme');
    });

    it('should use fallback for shortcuts.title when translation is empty', () => {
      vi.spyOn(LanguageService, 't').mockImplementation((key: string) => {
        if (key === 'shortcuts.title') return '';
        return key;
      });

      showShortcutsPanel();
      
      expect(ModalService.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Keyboard Shortcuts',
        })
      );
    });
  });

  describe('Platform Detection', () => {
    it('should include platform-appropriate modifier hint in content', () => {
      showShortcutsPanel();

      const call = vi.mocked(ModalService.show).mock.calls[0][0];
      const content = call.content as HTMLElement;

      // Should contain either Ctrl or Cmd depending on platform
      const hasModifier = content.textContent?.includes('Ctrl') || content.textContent?.includes('Cmd');
      expect(hasModifier).toBe(true);
    });

    it('should use fallback for shortcuts.useModifier when translation is empty', () => {
      vi.spyOn(LanguageService, 't').mockImplementation((key: string) => {
        if (key === 'shortcuts.useModifier') return '';
        return key;
      });

      showShortcutsPanel();

      const call = vi.mocked(ModalService.show).mock.calls[0][0];
      const content = call.content as HTMLElement;

      // Should contain the default text with modifier key
      expect(content.textContent).toContain('for system shortcuts');
    });
  });
});
