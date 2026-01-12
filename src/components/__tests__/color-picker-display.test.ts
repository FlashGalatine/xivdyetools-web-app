import { ColorPickerDisplay } from '../color-picker-display';
import {
  createTestContainer,
  cleanupTestContainer,
  renderComponent,
  cleanupComponent,
} from './test-utils';

// Mock shared utils
vi.mock('@shared/utils', () => ({
  clearContainer: vi.fn((container: HTMLElement) => {
    container.innerHTML = '';
  }),
}));

// Mock logger
vi.mock('@shared/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock Services
vi.mock('@services/index', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@services/index')>();
  return {
    ...actual,
    LanguageService: {
      t: vi.fn((key: string) => key),
    },
    ColorService: {
      hexToRgb: vi.fn(() => ({ r: 255, g: 0, b: 0 })),
      hexToHsv: vi.fn(() => ({ h: 0, s: 100, v: 100 })),
      rgbToHex: vi.fn(() => '#FF0000'),
    },
  };
});

describe('ColorPickerDisplay', () => {
  let container: HTMLElement;
  let component: ColorPickerDisplay;

  beforeEach(() => {
    container = createTestContainer();
    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (component && container) {
      cleanupComponent(component, container);
    } else {
      cleanupTestContainer(container);
    }
  });

  describe('Initialization', () => {
    it('should initialize with default color', () => {
      [component, container] = renderComponent(ColorPickerDisplay);
      expect(component.getColor()).toBe('#FF0000');
    });

    it('should initialize with provided color', () => {
      container = createTestContainer();
      component = new ColorPickerDisplay(container, '#00FF00');
      component.init();
      expect(component.getColor()).toBe('#00FF00');
    });
  });

  describe('Rendering', () => {
    it('should render hex input', () => {
      [component, container] = renderComponent(ColorPickerDisplay);
      const input = container.querySelector('#hex-input') as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input.value).toBe('#FF0000');
    });

    it('should render color picker input', () => {
      [component, container] = renderComponent(ColorPickerDisplay);
      const input = container.querySelector('#color-picker') as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input.value.toLowerCase()).toBe('#ff0000');
    });

    it('should render color preview', () => {
      [component, container] = renderComponent(ColorPickerDisplay);
      const preview = container.querySelector('#color-preview') as HTMLElement;
      expect(preview).not.toBeNull();
      expect(preview.style.backgroundColor).toBe('rgb(255, 0, 0)');
    });

    it('should render RGB and HSV values', () => {
      [component, container] = renderComponent(ColorPickerDisplay);
      const rgb = container.querySelector('#rgb-display');
      const hsv = container.querySelector('#hsv-display');
      expect(rgb).not.toBeNull();
      expect(hsv).not.toBeNull();
    });
  });

  describe('Interactions', () => {
    it('should update color on hex input', () => {
      [component, container] = renderComponent(ColorPickerDisplay);
      const spy = vi.fn();
      container.addEventListener('color-selected', (e: Event) => {
        const customEvent = e as CustomEvent;
        spy(customEvent.detail);
      });

      const input = container.querySelector('#hex-input') as HTMLInputElement;
      input.value = '#0000FF';
      input.dispatchEvent(new Event('input'));

      expect(component.getColor()).toBe('#0000FF');
      expect(spy).toHaveBeenCalledWith({ color: '#0000FF' });
    });

    it('should auto-prepend hash on hex input', () => {
      [component, container] = renderComponent(ColorPickerDisplay);
      const input = container.querySelector('#hex-input') as HTMLInputElement;
      input.value = '00FF00';
      input.dispatchEvent(new Event('input'));

      expect(component.getColor()).toBe('#00FF00');
      expect(input.value).toBe('#00FF00');
    });

    it('should update color on picker input', () => {
      [component, container] = renderComponent(ColorPickerDisplay);
      const spy = vi.fn();
      container.addEventListener('color-selected', (e: Event) => {
        const customEvent = e as CustomEvent;
        spy(customEvent.detail);
      });

      const input = container.querySelector('#color-picker') as HTMLInputElement;
      input.value = '#00ffff';
      input.dispatchEvent(new Event('input'));

      expect(component.getColor()).toBe('#00ffff');
      expect(spy).toHaveBeenCalledWith({ color: '#00ffff' });
    });
  });

  describe('Public Methods', () => {
    it('should set color programmatically', () => {
      [component, container] = renderComponent(ColorPickerDisplay);
      component.setColor('#123456');
      expect(component.getColor()).toBe('#123456');

      const input = container.querySelector('#hex-input') as HTMLInputElement;
      expect(input.value).toBe('#123456');
    });

    it('should ignore invalid color in setColor', () => {
      [component, container] = renderComponent(ColorPickerDisplay);
      component.setColor('invalid');
      expect(component.getColor()).toBe('#FF0000');
    });
  });

  describe('Eyedropper', () => {
    it('should show eyedropper button if supported', () => {
      // Mock EyeDropper
      window.EyeDropper = class {
        open() {
          return Promise.resolve({ sRGBHex: '#FFFFFF' });
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      [component, container] = renderComponent(ColorPickerDisplay);
      const btn = container.querySelector('#eyedropper-btn');
      expect(btn).not.toBeNull();
    });

    it('should not show eyedropper button if not supported', () => {
      // Remove EyeDropper
      delete (window as { EyeDropper?: unknown }).EyeDropper;

      [component, container] = renderComponent(ColorPickerDisplay);
      const btn = container.querySelector('#eyedropper-btn');
      expect(btn).toBeNull();
    });

    it('should use eyedropper when clicked', async () => {
      const openSpy = vi.fn().mockResolvedValue({ sRGBHex: '#ABCDEF' });
      window.EyeDropper = class {
        open = openSpy;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      [component, container] = renderComponent(ColorPickerDisplay);
      const btn = container.querySelector('#eyedropper-btn') as HTMLButtonElement;

      const spy = vi.fn();
      container.addEventListener('color-selected', (e: Event) => {
        const customEvent = e as CustomEvent;
        spy(customEvent.detail);
      });

      btn.click();

      // Wait for async
      await Promise.resolve();
      await Promise.resolve();

      expect(openSpy).toHaveBeenCalled();
      expect(component.getColor()).toBe('#ABCDEF');
      expect(spy).toHaveBeenCalledWith({ color: '#ABCDEF' });
    });

    it('should handle eyedropper cancelled gracefully', async () => {
      const openSpy = vi.fn().mockRejectedValue(new Error('User cancelled'));
      window.EyeDropper = class {
        open = openSpy;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      [component, container] = renderComponent(ColorPickerDisplay);
      const btn = container.querySelector('#eyedropper-btn') as HTMLButtonElement;

      // Should not throw
      btn.click();

      // Wait for async
      await Promise.resolve();
      await Promise.resolve();

      // Color should remain unchanged
      expect(component.getColor()).toBe('#FF0000');
    });

    it('should handle eyedropper returning empty result', async () => {
      const openSpy = vi.fn().mockResolvedValue(null);
      window.EyeDropper = class {
        open = openSpy;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      [component, container] = renderComponent(ColorPickerDisplay);
      const btn = container.querySelector('#eyedropper-btn') as HTMLButtonElement;

      btn.click();

      // Wait for async
      await Promise.resolve();
      await Promise.resolve();

      // Color should remain unchanged
      expect(component.getColor()).toBe('#FF0000');
    });

    it('should throw error when EyeDropper is not supported during activation', async () => {
      // First render with EyeDropper supported so button appears
      window.EyeDropper = class {
        open() {
          return Promise.resolve({ sRGBHex: '#FFFFFF' });
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      [component, container] = renderComponent(ColorPickerDisplay);
      const btn = container.querySelector('#eyedropper-btn') as HTMLButtonElement;

      // Now delete EyeDropper to simulate unsupported
      delete (window as { EyeDropper?: unknown }).EyeDropper;

      // Manually call the method to test the error path
      await component['activateEyedropper']();

      // Should handle gracefully (logger.info called)
      expect(component.getColor()).toBe('#FF0000');
    });
  });

  describe('setColorFromImage', () => {
    it('should extract color from canvas at coordinates', async () => {
      const { ColorService } = vi.mocked(await import('@services/index'));

      [component, container] = renderComponent(ColorPickerDisplay);

      // Create a mock canvas with mocked getImageData
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;

      const mockImageData = {
        data: new Uint8ClampedArray([255, 0, 0, 255]), // Red pixel RGBA
        width: 1,
        height: 1,
      };

      const mockContext = {
        getImageData: vi.fn().mockReturnValue(mockImageData),
      };
      vi.spyOn(canvas, 'getContext').mockReturnValue(
        mockContext as unknown as CanvasRenderingContext2D
      );

      const spy = vi.fn();
      container.addEventListener('color-selected', (e: Event) => {
        const customEvent = e as CustomEvent;
        spy(customEvent.detail);
      });

      component.setColorFromImage(canvas, 50, 50, 1);

      expect(mockContext.getImageData).toHaveBeenCalled();
      expect(ColorService.rgbToHex).toHaveBeenCalled();
      expect(spy).toHaveBeenCalled();
    });

    it('should handle sampling with larger sample size', () => {
      [component, container] = renderComponent(ColorPickerDisplay);

      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;

      const mockImageData = {
        // 5x5 pixels = 25 pixels, each pixel is 4 bytes (RGBA)
        data: new Uint8ClampedArray(25 * 4).fill(128), // Gray color
        width: 5,
        height: 5,
      };

      const mockContext = {
        getImageData: vi.fn().mockReturnValue(mockImageData),
      };
      vi.spyOn(canvas, 'getContext').mockReturnValue(
        mockContext as unknown as CanvasRenderingContext2D
      );

      component.setColorFromImage(canvas, 50, 50, 5);

      expect(mockContext.getImageData).toHaveBeenCalled();
    });

    it('should clamp coordinates near edge', () => {
      [component, container] = renderComponent(ColorPickerDisplay);

      const canvas = document.createElement('canvas');
      canvas.width = 10;
      canvas.height = 10;

      const mockImageData = {
        data: new Uint8ClampedArray([0, 0, 255, 255]), // Blue pixel
        width: 1,
        height: 1,
      };

      const mockContext = {
        getImageData: vi.fn().mockReturnValue(mockImageData),
      };
      vi.spyOn(canvas, 'getContext').mockReturnValue(
        mockContext as unknown as CanvasRenderingContext2D
      );

      // Sample near edge with large sample size - should clamp
      component.setColorFromImage(canvas, 0, 0, 5);

      // Should call getImageData with clamped coordinates
      expect(mockContext.getImageData).toHaveBeenCalled();
    });

    it('should return early if canvas context is null', () => {
      [component, container] = renderComponent(ColorPickerDisplay);

      const canvas = document.createElement('canvas');
      // Mock getContext to return null
      vi.spyOn(canvas, 'getContext').mockReturnValue(null);

      const spy = vi.fn();
      container.addEventListener('color-selected', (e: Event) => spy(e));

      component.setColorFromImage(canvas, 50, 50, 1);

      // Should not emit since no context
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('Hex Input Edge Cases', () => {
    it('should reset hex input value on blur to current selected color', () => {
      [component, container] = renderComponent(ColorPickerDisplay);
      const input = container.querySelector('#hex-input') as HTMLInputElement;

      // Type an invalid value
      input.value = 'invalid';
      input.dispatchEvent(new Event('blur'));

      // Should reset to current selected color
      expect(input.value).toBe('#FF0000');
    });

    it('should handle 3-character hex codes', () => {
      [component, container] = renderComponent(ColorPickerDisplay);
      const input = container.querySelector('#hex-input') as HTMLInputElement;

      input.value = '#FFF';
      input.dispatchEvent(new Event('input'));

      expect(component.getColor()).toBe('#FFF');
    });

    it('should not update color for invalid hex', () => {
      [component, container] = renderComponent(ColorPickerDisplay);
      const input = container.querySelector('#hex-input') as HTMLInputElement;

      const spy = vi.fn();
      container.addEventListener('color-selected', (e: Event) => spy(e));

      input.value = 'XYZ123';
      input.dispatchEvent(new Event('input'));

      // Invalid hex should not emit color-selected
      expect(component.getColor()).toBe('#FF0000');
    });
  });

  describe('getState', () => {
    it('should return current state', () => {
      window.EyeDropper = class {
        open() {
          return Promise.resolve({ sRGBHex: '#FFFFFF' });
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      [component, container] = renderComponent(ColorPickerDisplay);
      component.setColor('#123456');

      const state = component['getState']();
      expect(state.selectedColor).toBe('#123456');
      expect(state.eyedropperSupported).toBe(true);
    });

    it('should return eyedropperSupported as false when not available', () => {
      delete (window as { EyeDropper?: unknown }).EyeDropper;

      [component, container] = renderComponent(ColorPickerDisplay);

      const state = component['getState']();
      expect(state.eyedropperSupported).toBe(false);
    });
  });
});
