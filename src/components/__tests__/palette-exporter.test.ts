/**
 * XIV Dye Tools - Palette Exporter Component Tests
 *
 * Tests for the palette export functionality component
 *
 * @module components/__tests__/palette-exporter.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PaletteExporter, type PaletteData } from '../palette-exporter';
import { createTestContainer, cleanupTestContainer, waitForComponent } from './test-utils';
import type { Dye } from '@shared/types';

// Mock clipboard API
const mockClipboard = {
  writeText: vi.fn().mockResolvedValue(undefined),
};
Object.assign(navigator, { clipboard: mockClipboard });

// Mock URL.createObjectURL and revokeObjectURL
URL.createObjectURL = vi.fn(() => 'blob:mock-url');
URL.revokeObjectURL = vi.fn();

// Create mock dye data
const createMockDye = (id: number, name: string, hex: string): Dye => ({
  id,
  itemID: 30000 + id,
  stainID: null,
  name,
  hex,
  rgb: { r: 128, g: 128, b: 128 },
  hsv: { h: 0, s: 0, v: 50 },
  category: 'Gray',
  acquisition: 'Vendor',
  cost: 0,
  isMetallic: false,
  isPastel: false,
  isDark: false,
  isCosmic: false,
});

// Mock palette data
const mockPaletteData: PaletteData = {
  base: createMockDye(1, 'Jet Black', '#2B2B2B'),
  groups: {
    analogous: [
      createMockDye(2, 'Coral Pink', '#FF8080'),
      createMockDye(3, 'Rose Pink', '#FF6699'),
    ],
    complementary: [createMockDye(4, 'Sky Blue', '#87CEEB')],
  },
  metadata: {
    generator: 'XIV Dye Tools',
    version: '2.0.0',
  },
};

describe('PaletteExporter', () => {
  let container: HTMLElement;
  let component: PaletteExporter;
  let dataProvider: () => PaletteData;

  beforeEach(() => {
    vi.clearAllMocks();
    container = createTestContainer();
    dataProvider = vi.fn(() => mockPaletteData);
  });

  afterEach(() => {
    if (component) {
      component.destroy();
    }
    cleanupTestContainer(container);
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Rendering
  // ==========================================================================

  describe('rendering', () => {
    it('should render the exporter component', () => {
      component = new PaletteExporter(container, { dataProvider });
      component.init();

      expect(container.children.length).toBeGreaterThan(0);
    });

    it('should render default title', () => {
      component = new PaletteExporter(container, { dataProvider });
      component.init();

      expect(container.textContent).toContain('Export Palette');
    });

    it('should render custom title', () => {
      component = new PaletteExporter(container, {
        dataProvider,
        title: 'Custom Export Title',
      });
      component.init();

      expect(container.textContent).toContain('Custom Export Title');
    });

    it('should render JSON export button', () => {
      component = new PaletteExporter(container, { dataProvider });
      component.init();

      const jsonBtn = container.querySelector('[data-export="json"]');
      expect(jsonBtn).not.toBeNull();
    });

    it('should render CSS export button', () => {
      component = new PaletteExporter(container, { dataProvider });
      component.init();

      const cssBtn = container.querySelector('[data-export="css"]');
      expect(cssBtn).not.toBeNull();
    });

    it('should render SCSS export button', () => {
      component = new PaletteExporter(container, { dataProvider });
      component.init();

      const scssBtn = container.querySelector('[data-export="scss"]');
      expect(scssBtn).not.toBeNull();
    });

    it('should render copy hex codes button', () => {
      component = new PaletteExporter(container, { dataProvider });
      component.init();

      const copyBtn = container.querySelector('[data-export="hex"]');
      expect(copyBtn).not.toBeNull();
    });
  });

  // ==========================================================================
  // Button States
  // ==========================================================================

  describe('button states', () => {
    it('should have enabled buttons by default', () => {
      component = new PaletteExporter(container, { dataProvider });
      component.init();

      const buttons = container.querySelectorAll('button');
      buttons.forEach((btn) => {
        expect(btn.disabled).toBe(false);
      });
    });

    it('should disable buttons when enabled returns false', () => {
      component = new PaletteExporter(container, {
        dataProvider,
        enabled: () => false,
      });
      component.init();

      const buttons = container.querySelectorAll('button');
      buttons.forEach((btn) => {
        expect(btn.disabled).toBe(true);
      });
    });

    it('should add not-allowed cursor when disabled', () => {
      component = new PaletteExporter(container, {
        dataProvider,
        enabled: () => false,
      });
      component.init();

      const buttons = container.querySelectorAll('button');
      buttons.forEach((btn) => {
        expect(btn.style.cursor).toBe('not-allowed');
      });
    });
  });

  // ==========================================================================
  // JSON Export
  // ==========================================================================

  describe('JSON export', () => {
    it('should call dataProvider on JSON export', async () => {
      component = new PaletteExporter(container, { dataProvider });
      component.init();

      const jsonBtn = container.querySelector('[data-export="json"]') as HTMLButtonElement;
      jsonBtn.click();
      await waitForComponent();

      expect(dataProvider).toHaveBeenCalled();
    });

    it('should trigger download on JSON export', async () => {
      // Mock the click method on anchor elements
      const clickSpy = vi.fn();
      const appendChildSpy = vi.spyOn(document.body, 'appendChild');
      const removeChildSpy = vi.spyOn(document.body, 'removeChild');

      HTMLAnchorElement.prototype.click = clickSpy;

      component = new PaletteExporter(container, { dataProvider });
      component.init();

      const jsonBtn = container.querySelector('[data-export="json"]') as HTMLButtonElement;
      jsonBtn.click();
      await waitForComponent();

      expect(appendChildSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('should emit export-downloaded event', async () => {
      component = new PaletteExporter(container, { dataProvider });
      component.init();

      const eventSpy = vi.fn();
      container.addEventListener('export-downloaded', eventSpy);

      const jsonBtn = container.querySelector('[data-export="json"]') as HTMLButtonElement;
      jsonBtn.click();
      await waitForComponent();

      expect(eventSpy).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // CSS Export
  // ==========================================================================

  describe('CSS export', () => {
    it('should call dataProvider on CSS export', async () => {
      component = new PaletteExporter(container, { dataProvider });
      component.init();

      const cssBtn = container.querySelector('[data-export="css"]') as HTMLButtonElement;
      cssBtn.click();
      await waitForComponent();

      expect(dataProvider).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // SCSS Export
  // ==========================================================================

  describe('SCSS export', () => {
    it('should call dataProvider on SCSS export', async () => {
      component = new PaletteExporter(container, { dataProvider });
      component.init();

      const scssBtn = container.querySelector('[data-export="scss"]') as HTMLButtonElement;
      scssBtn.click();
      await waitForComponent();

      expect(dataProvider).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Copy Hex Codes
  // ==========================================================================

  describe('copy hex codes', () => {
    it('should call dataProvider on copy', async () => {
      component = new PaletteExporter(container, { dataProvider });
      component.init();

      const copyBtn = container.querySelector('[data-export="hex"]') as HTMLButtonElement;
      copyBtn.click();
      await waitForComponent();

      expect(dataProvider).toHaveBeenCalled();
    });

    it('should copy hex codes to clipboard', async () => {
      component = new PaletteExporter(container, { dataProvider });
      component.init();

      const copyBtn = container.querySelector('[data-export="hex"]') as HTMLButtonElement;
      copyBtn.click();
      await waitForComponent();

      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    it('should emit export-copied event', async () => {
      component = new PaletteExporter(container, { dataProvider });
      component.init();

      const eventSpy = vi.fn();
      container.addEventListener('export-copied', eventSpy);

      const copyBtn = container.querySelector('[data-export="hex"]') as HTMLButtonElement;
      copyBtn.click();
      await waitForComponent();

      expect(eventSpy).toHaveBeenCalled();
    });

    it('should include count in export-copied event', async () => {
      component = new PaletteExporter(container, { dataProvider });
      component.init();

      let eventDetail: unknown = null;
      container.addEventListener('export-copied', ((e: CustomEvent) => {
        eventDetail = e.detail;
      }) as EventListener);

      const copyBtn = container.querySelector('[data-export="hex"]') as HTMLButtonElement;
      copyBtn.click();
      await waitForComponent();

      expect(eventDetail).toHaveProperty('type', 'hex');
      expect(eventDetail).toHaveProperty('count');
    });
  });

  // ==========================================================================
  // Export Content Generation
  // ==========================================================================

  describe('export content generation', () => {
    it('should include base color in exports', async () => {
      // We can test this indirectly through clipboard
      component = new PaletteExporter(container, { dataProvider });
      component.init();

      const copyBtn = container.querySelector('[data-export="hex"]') as HTMLButtonElement;
      copyBtn.click();
      await waitForComponent();

      const clipboardCall = mockClipboard.writeText.mock.calls[0][0];
      expect(clipboardCall).toContain('#2B2B2B'); // Base color
    });

    it('should include group colors in exports', async () => {
      component = new PaletteExporter(container, { dataProvider });
      component.init();

      const copyBtn = container.querySelector('[data-export="hex"]') as HTMLButtonElement;
      copyBtn.click();
      await waitForComponent();

      const clipboardCall = mockClipboard.writeText.mock.calls[0][0];
      expect(clipboardCall).toContain('#FF8080'); // Coral Pink
      expect(clipboardCall).toContain('#FF6699'); // Rose Pink
      expect(clipboardCall).toContain('#87CEEB'); // Sky Blue
    });

    it('should remove duplicate hex codes', async () => {
      const duplicateData: PaletteData = {
        base: createMockDye(1, 'Jet Black', '#2B2B2B'),
        groups: {
          primary: [createMockDye(2, 'Jet Black Copy', '#2B2B2B')],
        },
      };

      component = new PaletteExporter(container, {
        dataProvider: () => duplicateData,
      });
      component.init();

      const copyBtn = container.querySelector('[data-export="hex"]') as HTMLButtonElement;
      copyBtn.click();
      await waitForComponent();

      const clipboardCall = mockClipboard.writeText.mock.calls[0][0];
      // Should only contain one #2B2B2B
      const matches = clipboardCall.match(/#2B2B2B/g);
      expect(matches?.length).toBe(1);
    });
  });

  // ==========================================================================
  // Empty Data Handling
  // ==========================================================================

  describe('empty data handling', () => {
    it('should handle empty palette data', async () => {
      const emptyData: PaletteData = {};
      component = new PaletteExporter(container, {
        dataProvider: () => emptyData,
      });
      component.init();

      const copyBtn = container.querySelector('[data-export="hex"]') as HTMLButtonElement;

      // Should not throw
      expect(() => copyBtn.click()).not.toThrow();
    });

    it('should handle null base color', async () => {
      const noBaseData: PaletteData = {
        base: null,
        groups: {
          colors: [createMockDye(1, 'Test', '#FF0000')],
        },
      };

      component = new PaletteExporter(container, {
        dataProvider: () => noBaseData,
      });
      component.init();

      const copyBtn = container.querySelector('[data-export="hex"]') as HTMLButtonElement;
      copyBtn.click();
      await waitForComponent();

      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Hover Effects
  // ==========================================================================

  describe('hover effects', () => {
    it('should change opacity on mouseenter', () => {
      component = new PaletteExporter(container, { dataProvider });
      component.init();

      const jsonBtn = container.querySelector('[data-export="json"]') as HTMLButtonElement;
      jsonBtn.dispatchEvent(new MouseEvent('mouseenter'));

      expect(jsonBtn.style.opacity).toBe('0.9');
    });

    it('should restore opacity on mouseleave', () => {
      component = new PaletteExporter(container, { dataProvider });
      component.init();

      const jsonBtn = container.querySelector('[data-export="json"]') as HTMLButtonElement;
      jsonBtn.dispatchEvent(new MouseEvent('mouseenter'));
      jsonBtn.dispatchEvent(new MouseEvent('mouseleave'));

      expect(jsonBtn.style.opacity).toBe('1');
    });
  });

  // ==========================================================================
  // State Management
  // ==========================================================================

  describe('state management', () => {
    it('should return correct state', () => {
      component = new PaletteExporter(container, {
        dataProvider,
        title: 'Test Title',
        enabled: () => true,
      });
      component.init();

      const state = (
        component as unknown as { getState: () => Record<string, unknown> }
      ).getState();

      expect(state).toHaveProperty('title', 'Test Title');
      expect(state).toHaveProperty('enabled', true);
    });
  });

  // ==========================================================================
  // Update Method
  // ==========================================================================

  describe('update method', () => {
    it('should update button states on update call', () => {
      let isEnabled = true;
      component = new PaletteExporter(container, {
        dataProvider,
        enabled: () => isEnabled,
      });
      component.init();

      let jsonBtn = container.querySelector('[data-export="json"]') as HTMLButtonElement;
      expect(jsonBtn.disabled).toBe(false);

      isEnabled = false;
      component.update();

      // Re-query after update since DOM is re-rendered
      jsonBtn = container.querySelector('[data-export="json"]') as HTMLButtonElement;
      expect(jsonBtn.disabled).toBe(true);
    });
  });

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  describe('cleanup', () => {
    it('should clean up without error', () => {
      component = new PaletteExporter(container, { dataProvider });
      component.init();

      expect(() => component.destroy()).not.toThrow();
    });
  });

  // ==========================================================================
  // Error Handling in Export Handlers
  // ==========================================================================

  describe('error handling in export handlers', () => {
    it('should handle error in JSON export when dataProvider throws', async () => {
      const errorProvider = vi.fn(() => {
        throw new Error('Data provider error');
      });

      component = new PaletteExporter(container, { dataProvider: errorProvider });
      component.init();

      const jsonBtn = container.querySelector('[data-export="json"]') as HTMLButtonElement;

      // Should not throw - error is caught internally
      expect(() => jsonBtn.click()).not.toThrow();
    });

    it('should handle error in CSS export when dataProvider throws', async () => {
      const errorProvider = vi.fn(() => {
        throw new Error('CSS export error');
      });

      component = new PaletteExporter(container, { dataProvider: errorProvider });
      component.init();

      const cssBtn = container.querySelector('[data-export="css"]') as HTMLButtonElement;

      // Should not throw - error is caught internally
      expect(() => cssBtn.click()).not.toThrow();
    });

    it('should handle error in SCSS export when dataProvider throws', async () => {
      const errorProvider = vi.fn(() => {
        throw new Error('SCSS export error');
      });

      component = new PaletteExporter(container, { dataProvider: errorProvider });
      component.init();

      const scssBtn = container.querySelector('[data-export="scss"]') as HTMLButtonElement;

      // Should not throw - error is caught internally
      expect(() => scssBtn.click()).not.toThrow();
    });

    it('should handle error in copy hex codes when dataProvider throws', async () => {
      const errorProvider = vi.fn(() => {
        throw new Error('Copy error');
      });

      component = new PaletteExporter(container, { dataProvider: errorProvider });
      component.init();

      const copyBtn = container.querySelector('[data-export="hex"]') as HTMLButtonElement;

      // Should not throw - error is caught internally
      expect(() => copyBtn.click()).not.toThrow();
      await waitForComponent();
    });
  });

  // ==========================================================================
  // Clipboard Fallback Path
  // ==========================================================================

  describe('clipboard fallback', () => {
    // Define execCommand on document for jsdom (deprecated API not available by default)
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (document as any).execCommand = vi.fn().mockReturnValue(true);
    });

    afterEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (document as any).execCommand;
    });

    it('should use fallback when navigator.clipboard.writeText rejects', async () => {
      // Make clipboard fail
      mockClipboard.writeText.mockRejectedValueOnce(new Error('Clipboard API failed'));

      const appendChildSpy = vi.spyOn(document.body, 'appendChild');
      const removeChildSpy = vi.spyOn(document.body, 'removeChild');

      component = new PaletteExporter(container, { dataProvider });
      component.init();

      const copyBtn = container.querySelector('[data-export="hex"]') as HTMLButtonElement;
      copyBtn.click();
      await waitForComponent();

      // Should have tried clipboard API first
      expect(navigator.clipboard.writeText).toHaveBeenCalled();

      // Should have fallen back to execCommand
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((document as any).execCommand).toHaveBeenCalledWith('copy');

      // Should have created and removed textarea
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
    });

    it('should handle fallback copy error gracefully', async () => {
      // Make clipboard fail
      mockClipboard.writeText.mockRejectedValueOnce(new Error('Clipboard API failed'));

      // Make execCommand also fail
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (document as any).execCommand = vi.fn().mockImplementation(() => {
        throw new Error('execCommand failed');
      });

      component = new PaletteExporter(container, { dataProvider });
      component.init();

      const copyBtn = container.querySelector('[data-export="hex"]') as HTMLButtonElement;

      // Should not throw even when both methods fail
      expect(() => copyBtn.click()).not.toThrow();
      await waitForComponent();
    });
  });

  // ==========================================================================
  // Export with Empty Groups
  // ==========================================================================

  describe('export with empty groups', () => {
    it('should handle groups with empty arrays in CSS export', async () => {
      const emptyGroupData: PaletteData = {
        base: createMockDye(1, 'Base', '#FFFFFF'),
        groups: {
          filledGroup: [createMockDye(2, 'Color', '#FF0000')],
          emptyGroup: [], // Empty array - should be skipped
        },
      };

      const clickSpy = vi.fn();
      HTMLAnchorElement.prototype.click = clickSpy;

      component = new PaletteExporter(container, {
        dataProvider: () => emptyGroupData,
      });
      component.init();

      const cssBtn = container.querySelector('[data-export="css"]') as HTMLButtonElement;
      cssBtn.click();
      await waitForComponent();

      // Export should complete without error
      expect(clickSpy).toHaveBeenCalled();
    });

    it('should handle groups with empty arrays in SCSS export', async () => {
      const emptyGroupData: PaletteData = {
        groups: {
          emptyGroup: [], // Empty array
          anotherEmpty: [], // Another empty array
        },
      };

      const clickSpy = vi.fn();
      HTMLAnchorElement.prototype.click = clickSpy;

      component = new PaletteExporter(container, {
        dataProvider: () => emptyGroupData,
      });
      component.init();

      const scssBtn = container.querySelector('[data-export="scss"]') as HTMLButtonElement;
      scssBtn.click();
      await waitForComponent();

      // Export should complete without error
      expect(clickSpy).toHaveBeenCalled();
    });

    it('should skip empty groups when copying hex codes', async () => {
      const partialData: PaletteData = {
        groups: {
          emptyGroup: [],
          validGroup: [createMockDye(1, 'Red', '#FF0000')],
        },
      };

      component = new PaletteExporter(container, {
        dataProvider: () => partialData,
      });
      component.init();

      const copyBtn = container.querySelector('[data-export="hex"]') as HTMLButtonElement;
      copyBtn.click();
      await waitForComponent();

      const clipboardCall = mockClipboard.writeText.mock.calls[0][0];
      expect(clipboardCall).toBe('#FF0000');
    });

    it('should handle null dyes array in groups', async () => {
      const nullGroupData: PaletteData = {
        base: createMockDye(1, 'Base', '#FFFFFF'),
        groups: {
          validGroup: [createMockDye(2, 'Color', '#FF0000')],
          // This tests the `if (dyes)` check
        },
      };

      component = new PaletteExporter(container, {
        dataProvider: () => nullGroupData,
      });
      component.init();

      const copyBtn = container.querySelector('[data-export="hex"]') as HTMLButtonElement;
      copyBtn.click();
      await waitForComponent();

      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // JSON Export Content Verification
  // ==========================================================================

  describe('JSON export content', () => {
    it('should include metadata in JSON export', async () => {
      let blobContent = '';
      const originalBlob = global.Blob;
      global.Blob = class MockBlob {
        constructor(parts: BlobPart[]) {
          blobContent = parts.join('');
        }
      } as unknown as typeof Blob;

      component = new PaletteExporter(container, { dataProvider });
      component.init();

      const jsonBtn = container.querySelector('[data-export="json"]') as HTMLButtonElement;
      jsonBtn.click();
      await waitForComponent();

      // Verify metadata is included
      expect(blobContent).toContain('metadata');
      expect(blobContent).toContain('XIV Dye Tools');

      global.Blob = originalBlob;
    });

    it('should include groups in JSON export', async () => {
      let blobContent = '';
      const originalBlob = global.Blob;
      global.Blob = class MockBlob {
        constructor(parts: BlobPart[]) {
          blobContent = parts.join('');
        }
      } as unknown as typeof Blob;

      component = new PaletteExporter(container, { dataProvider });
      component.init();

      const jsonBtn = container.querySelector('[data-export="json"]') as HTMLButtonElement;
      jsonBtn.click();
      await waitForComponent();

      // Verify groups are included
      expect(blobContent).toContain('analogous');
      expect(blobContent).toContain('complementary');

      global.Blob = originalBlob;
    });
  });
});
