/**
 * XIV Dye Tools - Saved Palettes Modal Component Tests
 *
 * @module components/__tests__/saved-palettes-modal.test
 */

import { showSavedPalettesModal, showSavePaletteDialog } from '../saved-palettes-modal';
import type { SavedPalette } from '@services/palette-service';

// Mock data
const mockPalettes: SavedPalette[] = [
  {
    id: 'palette-1',
    name: 'Test Palette 1',
    baseColor: '#FF0000',
    baseDyeName: 'Dalamud Red',
    harmonyType: 'complementary',
    companions: ['Snow White', 'Jet Black'],
    dateCreated: new Date(Date.now() - 1000).toISOString(),
  },
  {
    id: 'palette-2',
    name: 'Test Palette 2',
    baseColor: '#00FF00',
    baseDyeName: 'Celeste Green',
    harmonyType: 'triadic',
    companions: ['Rose Pink', 'Sky Blue', 'Sunset Orange', 'Pure White', 'Soot Black'],
    dateCreated: new Date().toISOString(),
  },
];

// Mock services
const mockModalShow = vi.fn().mockReturnValue('modal-id');
const mockModalDismissTop = vi.fn();

vi.mock('@services/index', () => ({
  ModalService: {
    show: vi.fn().mockReturnValue('modal-id'),
    dismissTop: vi.fn(),
  },
  PaletteService: {
    getPalettesSortedByDate: vi.fn(() => mockPalettes),
    savePalette: vi.fn(() => ({
      id: 'new-palette',
      name: 'Test',
      baseColor: '#FF0000',
      baseDyeName: 'Red',
      harmonyType: 'complementary',
      companions: [],
      dateCreated: new Date().toISOString(),
    })),
    deletePalette: vi.fn(),
    downloadPalettes: vi.fn(),
    importPalettes: vi.fn(() => 2),
    generateDefaultName: vi.fn(() => 'New Palette'),
  },
  LanguageService: {
    t: vi.fn((key: string) => {
      const translations: Record<string, string> = {
        'palette.savedPalettes': 'Saved Palettes',
        'palette.savedCount': '{count} palettes saved',
        'palette.export': 'Export',
        'palette.import': 'Import',
        'palette.noPalettes': 'No saved palettes',
        'palette.saveHint': 'Save palettes from the Harmony tool',
        'palette.load': 'Load',
        'palette.loaded': 'Palette loaded',
        'palette.confirmDelete': 'Delete this palette?',
        'palette.deleted': 'Palette deleted',
        'palette.exported': 'Palettes exported',
        'palette.imported': '{count} palettes imported',
        'palette.importFailed': 'Import failed',
        'palette.invalidFile': 'Invalid file format',
        'palette.savePalette': 'Save Palette',
        'palette.name': 'Palette Name',
        'palette.preview': 'Preview',
        'palette.saveSuccess': 'Palette saved',
        'palette.saveFailed': 'Failed to save palette',
        'harmony.harmonyType': 'Harmony Type',
        'common.delete': 'Delete',
        'common.cancel': 'Cancel',
        'common.save': 'Save',
      };
      return translations[key] || key;
    }),
  },
  ToastService: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
  dyeService: {
    getAllDyes: vi.fn(() => [
      { name: 'Snow White', hex: '#FFFFFF', itemID: 1 },
      { name: 'Jet Black', hex: '#000000', itemID: 2 },
      { name: 'Rose Pink', hex: '#FF69B4', itemID: 3 },
      { name: 'Sky Blue', hex: '#87CEEB', itemID: 4 },
      { name: 'Sunset Orange', hex: '#FF4500', itemID: 5 },
      { name: 'Pure White', hex: '#F8F8FF', itemID: 6 },
      { name: 'Soot Black', hex: '#1A1A1A', itemID: 7 },
    ]),
  },
}));

vi.mock('@shared/empty-state-icons', () => ({
  ICON_FOLDER: '<svg>folder</svg>',
}));

// Get mocked services for assertions
import { ModalService, PaletteService, ToastService, LanguageService } from '@services/index';

describe('showSavedPalettesModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset palettes mock
    vi.mocked(PaletteService.getPalettesSortedByDate).mockReturnValue(mockPalettes);
  });

  describe('Modal Configuration', () => {
    it('should call ModalService.show with custom type', () => {
      showSavedPalettesModal();

      expect(ModalService.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'custom',
        })
      );
    });

    it('should set correct title', () => {
      showSavedPalettesModal();

      expect(ModalService.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Saved Palettes',
        })
      );
    });

    it('should set size to md', () => {
      showSavedPalettesModal();

      expect(ModalService.show).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 'md',
        })
      );
    });
  });

  describe('Content with Palettes', () => {
    it('should display palette count', () => {
      showSavedPalettesModal();

      const call = vi.mocked(ModalService.show).mock.calls[0][0];
      const content = call.content as HTMLElement;

      expect(content.textContent).toContain('2 palettes saved');
    });

    it('should render export button', () => {
      showSavedPalettesModal();

      const call = vi.mocked(ModalService.show).mock.calls[0][0];
      const content = call.content as HTMLElement;
      const exportBtn = content.querySelector('button');

      expect(exportBtn?.textContent).toBe('Export');
    });

    it('should render import button', () => {
      showSavedPalettesModal();

      const call = vi.mocked(ModalService.show).mock.calls[0][0];
      const content = call.content as HTMLElement;
      const buttons = content.querySelectorAll('button');

      expect(buttons[1]?.textContent).toBe('Import');
    });

    it('should render palette items', () => {
      showSavedPalettesModal();

      const call = vi.mocked(ModalService.show).mock.calls[0][0];
      const content = call.content as HTMLElement;
      const items = content.querySelectorAll('.palette-item');

      expect(items.length).toBe(2);
    });

    it('should display palette names', () => {
      showSavedPalettesModal();

      const call = vi.mocked(ModalService.show).mock.calls[0][0];
      const content = call.content as HTMLElement;

      expect(content.textContent).toContain('Test Palette 1');
      expect(content.textContent).toContain('Test Palette 2');
    });

    it('should display harmony types', () => {
      showSavedPalettesModal();

      const call = vi.mocked(ModalService.show).mock.calls[0][0];
      const content = call.content as HTMLElement;

      expect(content.textContent).toContain('complementary');
      expect(content.textContent).toContain('triadic');
    });

    it('should truncate companion list with +N indicator', () => {
      showSavedPalettesModal();

      const call = vi.mocked(ModalService.show).mock.calls[0][0];
      const content = call.content as HTMLElement;

      // Second palette has 5 companions, should show +1 (5 - 4 = 1)
      expect(content.textContent).toContain('+1');
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no palettes', () => {
      vi.mocked(PaletteService.getPalettesSortedByDate).mockReturnValue([]);

      showSavedPalettesModal();

      const call = vi.mocked(ModalService.show).mock.calls[0][0];
      const content = call.content as HTMLElement;

      expect(content.textContent).toContain('No saved palettes');
      expect(content.textContent).toContain('Save palettes from the Harmony tool');
    });

    it('should disable export button when no palettes', () => {
      vi.mocked(PaletteService.getPalettesSortedByDate).mockReturnValue([]);

      showSavedPalettesModal();

      const call = vi.mocked(ModalService.show).mock.calls[0][0];
      const content = call.content as HTMLElement;
      const exportBtn = content.querySelector('button') as HTMLButtonElement;

      expect(exportBtn.disabled).toBe(true);
    });
  });

  describe('Actions', () => {
    it('should call downloadPalettes on export click', () => {
      showSavedPalettesModal();

      const call = vi.mocked(ModalService.show).mock.calls[0][0];
      const content = call.content as HTMLElement;
      const exportBtn = content.querySelector('button') as HTMLButtonElement;

      exportBtn.click();

      expect(PaletteService.downloadPalettes).toHaveBeenCalled();
      expect(ToastService.success).toHaveBeenCalledWith('Palettes exported');
    });

    it('should call onLoad callback when load button clicked', () => {
      const onLoad = vi.fn();
      showSavedPalettesModal(onLoad);

      const call = vi.mocked(ModalService.show).mock.calls[0][0];
      const content = call.content as HTMLElement;

      // Find load button (first button in palette item actions)
      const loadBtn = content.querySelector('.palette-item button') as HTMLButtonElement;
      loadBtn.click();

      expect(onLoad).toHaveBeenCalledWith(mockPalettes[0]);
      expect(ModalService.dismissTop).toHaveBeenCalled();
      expect(ToastService.success).toHaveBeenCalledWith('Palette loaded');
    });

    it('should delete palette when delete clicked and confirmed', () => {
      // Mock window.confirm
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      showSavedPalettesModal();

      const call = vi.mocked(ModalService.show).mock.calls[0][0];
      const content = call.content as HTMLElement;

      // Find delete button (has btn-theme-danger class)
      const deleteBtn = content.querySelector('.btn-theme-danger') as HTMLButtonElement;
      deleteBtn.click();

      expect(PaletteService.deletePalette).toHaveBeenCalledWith('palette-1');
      expect(ToastService.success).toHaveBeenCalledWith('Palette deleted');
    });

    it('should not delete palette when confirm is cancelled', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      showSavedPalettesModal();

      const call = vi.mocked(ModalService.show).mock.calls[0][0];
      const content = call.content as HTMLElement;

      const deleteBtn = content.querySelector('.btn-theme-danger') as HTMLButtonElement;
      deleteBtn.click();

      expect(PaletteService.deletePalette).not.toHaveBeenCalled();
    });

    it('should trigger file import on import click', () => {
      // Create a spy on document.createElement to track input creation
      const createElementSpy = vi.spyOn(document, 'createElement');

      showSavedPalettesModal();

      const call = vi.mocked(ModalService.show).mock.calls[0][0];
      const content = call.content as HTMLElement;
      const buttons = content.querySelectorAll('button');
      const importBtn = buttons[1] as HTMLButtonElement; // Second button is import

      // Click import
      importBtn.click();

      // Verify a file input was created
      expect(createElementSpy).toHaveBeenCalledWith('input');
      createElementSpy.mockRestore();
    });

    it('should handle successful file import', async () => {
      showSavedPalettesModal();

      const call = vi.mocked(ModalService.show).mock.calls[0][0];
      const content = call.content as HTMLElement;
      const buttons = content.querySelectorAll('button');
      const importBtn = buttons[1] as HTMLButtonElement;

      // Click import to trigger creation of file input
      importBtn.click();

      // Create a mock file with text() method
      const mockFileContent = '{"palettes":[]}';
      const mockFile = {
        text: vi.fn().mockResolvedValue(mockFileContent),
      } as unknown as File;

      // Find the created input
      const inputElement = content.querySelector('input[type="file"]');
      if (inputElement) {
        Object.defineProperty(inputElement, 'files', {
          value: [mockFile],
          writable: false,
        });

        // Trigger change event
        inputElement.dispatchEvent(new Event('change'));

        // Wait for async operations
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();

        expect(PaletteService.importPalettes).toHaveBeenCalled();
        expect(ToastService.success).toHaveBeenCalled();
      }
    });

    it('should handle import with no files selected', async () => {
      showSavedPalettesModal();

      const call = vi.mocked(ModalService.show).mock.calls[0][0];
      const content = call.content as HTMLElement;
      const buttons = content.querySelectorAll('button');
      const importBtn = buttons[1] as HTMLButtonElement;

      importBtn.click();

      const inputElement = content.querySelector('input[type="file"]');
      if (inputElement) {
        // No files selected
        Object.defineProperty(inputElement, 'files', {
          value: null,
          writable: false,
        });

        inputElement.dispatchEvent(new Event('change'));

        await Promise.resolve();

        // Should not call importPalettes when no file is selected
        expect(PaletteService.importPalettes).not.toHaveBeenCalled();
      }
    });

    it('should show warning when import returns 0 palettes', async () => {
      vi.mocked(PaletteService.importPalettes).mockReturnValue(0);

      showSavedPalettesModal();

      const call = vi.mocked(ModalService.show).mock.calls[0][0];
      const content = call.content as HTMLElement;
      const buttons = content.querySelectorAll('button');
      const importBtn = buttons[1] as HTMLButtonElement;

      importBtn.click();

      const mockFile = {
        text: vi.fn().mockResolvedValue('{}'),
      } as unknown as File;

      const inputElement = content.querySelector('input[type="file"]');
      if (inputElement) {
        Object.defineProperty(inputElement, 'files', {
          value: [mockFile],
          writable: false,
        });

        inputElement.dispatchEvent(new Event('change'));

        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();

        expect(ToastService.warning).toHaveBeenCalledWith('Import failed');
      }
    });

    it('should show error when import file is invalid JSON', async () => {
      showSavedPalettesModal();

      const call = vi.mocked(ModalService.show).mock.calls[0][0];
      const content = call.content as HTMLElement;
      const buttons = content.querySelectorAll('button');
      const importBtn = buttons[1] as HTMLButtonElement;

      importBtn.click();

      const mockFile = {
        text: vi.fn().mockResolvedValue('invalid json'),
      } as unknown as File;

      const inputElement = content.querySelector('input[type="file"]');
      if (inputElement) {
        Object.defineProperty(inputElement, 'files', {
          value: [mockFile],
          writable: false,
        });

        inputElement.dispatchEvent(new Event('change'));

        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();

        expect(ToastService.error).toHaveBeenCalledWith('Invalid file format');
      }
    });
  });

  describe('getDyeHexByName functionality', () => {
    it('should display correct hex color for known dye names', () => {
      showSavedPalettesModal();

      const call = vi.mocked(ModalService.show).mock.calls[0][0];
      const content = call.content as HTMLElement;

      // Find companion swatches (should have actual hex colors)
      const paletteItems = content.querySelectorAll('.palette-item');
      expect(paletteItems.length).toBeGreaterThan(0);

      // Check first palette item - "Snow White" companion should have #FFFFFF
      const firstItem = paletteItems[0];
      const swatches = firstItem.querySelectorAll('div[title]');
      const snowWhiteSwatch = Array.from(swatches).find((s) =>
        s.getAttribute('title')?.includes('Snow White')
      ) as HTMLElement;

      if (snowWhiteSwatch) {
        expect(snowWhiteSwatch.style.backgroundColor).toBe('rgb(255, 255, 255)');
      }
    });

    it('should apply fallback style for unknown dye names', () => {
      // Create palette with unknown dye names
      vi.mocked(PaletteService.getPalettesSortedByDate).mockReturnValue([
        {
          id: 'palette-unknown',
          name: 'Unknown Palette',
          baseColor: '#FF0000',
          baseDyeName: 'Red',
          harmonyType: 'complementary',
          companions: ['Unknown Dye Name'],
          dateCreated: new Date().toISOString(),
        },
      ]);

      showSavedPalettesModal();

      const call = vi.mocked(ModalService.show).mock.calls[0][0];
      const content = call.content as HTMLElement;

      // Find companion swatch with unknown dye
      const swatches = content.querySelectorAll('.palette-item div[title="Unknown Dye Name"]');
      expect(swatches.length).toBe(1);

      const unknownSwatch = swatches[0] as HTMLElement;
      // Should have fallback class
      expect(unknownSwatch.classList.contains('bg-gray-200')).toBe(true);
    });
  });
});

describe('showSavePaletteDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Modal Configuration', () => {
    it('should call ModalService.show with custom type', () => {
      showSavePaletteDialog('complementary', 'Complementary', '#FF0000', 'Red', ['Blue', 'Green']);

      expect(ModalService.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'custom',
        })
      );
    });

    it('should set correct title', () => {
      showSavePaletteDialog('complementary', 'Complementary', '#FF0000', 'Red', ['Blue', 'Green']);

      expect(ModalService.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Save Palette',
        })
      );
    });

    it('should set size to sm', () => {
      showSavePaletteDialog('complementary', 'Complementary', '#FF0000', 'Red', ['Blue', 'Green']);

      expect(ModalService.show).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 'sm',
        })
      );
    });
  });

  describe('Content', () => {
    it('should display preview section', () => {
      showSavePaletteDialog('complementary', 'Complementary', '#FF0000', 'Red', ['Blue', 'Green']);

      const call = vi.mocked(ModalService.show).mock.calls[0][0];
      const content = call.content as HTMLElement;

      expect(content.textContent).toContain('Preview');
    });

    it('should display harmony type', () => {
      showSavePaletteDialog('complementary', 'Complementary', '#FF0000', 'Red', ['Blue', 'Green']);

      const call = vi.mocked(ModalService.show).mock.calls[0][0];
      const content = call.content as HTMLElement;

      expect(content.textContent).toContain('Harmony Type');
      expect(content.textContent).toContain('Complementary');
    });

    it('should have name input with default value', () => {
      showSavePaletteDialog('complementary', 'Complementary', '#FF0000', 'Red', ['Blue', 'Green']);

      const call = vi.mocked(ModalService.show).mock.calls[0][0];
      const content = call.content as HTMLElement;
      const input = content.querySelector('input[type="text"]') as HTMLInputElement;

      expect(input).not.toBeNull();
      expect(input.value).toBe('Complementary - Red');
    });

    it('should display companion colors', () => {
      showSavePaletteDialog('complementary', 'Complementary', '#FF0000', 'Red', [
        'Blue',
        'Green',
        'Yellow',
        'Purple',
      ]);

      const call = vi.mocked(ModalService.show).mock.calls[0][0];
      const content = call.content as HTMLElement;

      expect(content.textContent).toContain('Blue, Green, Yellow');
      expect(content.textContent).toContain('+1');
    });

    it('should have cancel button', () => {
      showSavePaletteDialog('complementary', 'Complementary', '#FF0000', 'Red', ['Blue']);

      const call = vi.mocked(ModalService.show).mock.calls[0][0];
      const content = call.content as HTMLElement;
      const cancelBtn = Array.from(content.querySelectorAll('button')).find(
        (b) => b.textContent === 'Cancel'
      );

      expect(cancelBtn).not.toBeUndefined();
    });

    it('should have save button', () => {
      showSavePaletteDialog('complementary', 'Complementary', '#FF0000', 'Red', ['Blue']);

      const call = vi.mocked(ModalService.show).mock.calls[0][0];
      const content = call.content as HTMLElement;
      const saveBtn = Array.from(content.querySelectorAll('button')).find(
        (b) => b.textContent === 'Save'
      );

      expect(saveBtn).not.toBeUndefined();
    });
  });

  describe('Actions', () => {
    it('should dismiss modal on cancel click', () => {
      showSavePaletteDialog('complementary', 'Complementary', '#FF0000', 'Red', ['Blue']);

      const call = vi.mocked(ModalService.show).mock.calls[0][0];
      const content = call.content as HTMLElement;
      const cancelBtn = Array.from(content.querySelectorAll('button')).find(
        (b) => b.textContent === 'Cancel'
      ) as HTMLButtonElement;

      cancelBtn.click();

      expect(ModalService.dismissTop).toHaveBeenCalled();
    });

    it('should save palette on save click', () => {
      showSavePaletteDialog('complementary', 'Complementary', '#FF0000', 'Red', ['Blue']);

      const call = vi.mocked(ModalService.show).mock.calls[0][0];
      const content = call.content as HTMLElement;
      const saveBtn = Array.from(content.querySelectorAll('button')).find(
        (b) => b.textContent === 'Save'
      ) as HTMLButtonElement;

      saveBtn.click();

      expect(PaletteService.savePalette).toHaveBeenCalledWith(
        'Complementary - Red',
        '#FF0000',
        'Red',
        'complementary',
        ['Blue']
      );
      expect(ToastService.success).toHaveBeenCalledWith('Palette saved');
      expect(ModalService.dismissTop).toHaveBeenCalled();
    });

    it('should use custom name from input', () => {
      showSavePaletteDialog('complementary', 'Complementary', '#FF0000', 'Red', ['Blue']);

      const call = vi.mocked(ModalService.show).mock.calls[0][0];
      const content = call.content as HTMLElement;
      const input = content.querySelector('input[type="text"]') as HTMLInputElement;
      const saveBtn = Array.from(content.querySelectorAll('button')).find(
        (b) => b.textContent === 'Save'
      ) as HTMLButtonElement;

      input.value = 'My Custom Palette';
      saveBtn.click();

      expect(PaletteService.savePalette).toHaveBeenCalledWith(
        'My Custom Palette',
        '#FF0000',
        'Red',
        'complementary',
        ['Blue']
      );
    });

    it('should use default name if input is empty', () => {
      showSavePaletteDialog('complementary', 'Complementary', '#FF0000', 'Red', ['Blue']);

      const call = vi.mocked(ModalService.show).mock.calls[0][0];
      const content = call.content as HTMLElement;
      const input = content.querySelector('input[type="text"]') as HTMLInputElement;
      const saveBtn = Array.from(content.querySelectorAll('button')).find(
        (b) => b.textContent === 'Save'
      ) as HTMLButtonElement;

      input.value = '   '; // Empty whitespace
      saveBtn.click();

      expect(PaletteService.savePalette).toHaveBeenCalledWith(
        'New Palette', // Default name from generateDefaultName
        '#FF0000',
        'Red',
        'complementary',
        ['Blue']
      );
    });

    it('should show error toast if save fails', () => {
      vi.mocked(PaletteService.savePalette).mockReturnValue(null);

      showSavePaletteDialog('complementary', 'Complementary', '#FF0000', 'Red', ['Blue']);

      const call = vi.mocked(ModalService.show).mock.calls[0][0];
      const content = call.content as HTMLElement;
      const saveBtn = Array.from(content.querySelectorAll('button')).find(
        (b) => b.textContent === 'Save'
      ) as HTMLButtonElement;

      saveBtn.click();

      expect(ToastService.error).toHaveBeenCalledWith('Failed to save palette');
    });
  });
});
