import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RecentColorsPanel } from '../recent-colors-panel';
import { StorageService } from '@services/storage-service';
import { AnnouncerService } from '@services/announcer-service';
import { logger } from '@shared/logger';

// Mock services
vi.mock('@services/storage-service', () => ({
  StorageService: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

vi.mock('@services/announcer-service', () => ({
  AnnouncerService: {
    announce: vi.fn(),
  },
}));

vi.mock('@shared/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('RecentColorsPanel', () => {
  let container: HTMLElement;
  let panel: RecentColorsPanel;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    // Reset mocks
    vi.clearAllMocks();
    vi.mocked(StorageService.getItem).mockReturnValue([]);

    panel = new RecentColorsPanel(container);
    panel.init();
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should render hidden initially if no recent colors', () => {
    expect(container.style.display).toBe('none');
  });

  it('should load recent colors from storage on init', () => {
    const mockColors = [{ hex: '#FF0000', timestamp: 123 }];
    vi.mocked(StorageService.getItem).mockReturnValue(mockColors);

    panel = new RecentColorsPanel(container);
    panel.init();

    expect(StorageService.getItem).toHaveBeenCalled();
    expect(container.style.display).toBe('block');
    expect(container.querySelectorAll('button[data-recent-index]').length).toBe(1);
  });

  it('should add recent color and save to storage', () => {
    panel.addRecentColor('#00FF00');

    expect(container.style.display).toBe('block');
    expect(container.querySelectorAll('button[data-recent-index]').length).toBe(1);
    expect(StorageService.setItem).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([expect.objectContaining({ hex: '#00FF00' })])
    );
  });

  it('should limit recent colors to max', () => {
    // Add 15 colors
    for (let i = 0; i < 15; i++) {
      panel.addRecentColor(`#${i.toString(16).padStart(6, '0')}`);
    }

    const buttons = container.querySelectorAll('button[data-recent-index]');
    expect(buttons.length).toBe(10); // Default max is 10
  });

  it('should emit callback when color clicked', () => {
    const onColorSelected = vi.fn();
    panel = new RecentColorsPanel(container, { onColorSelected });
    panel.init();

    panel.addRecentColor('#0000FF');

    const button = container.querySelector('button[data-recent-index="0"]') as HTMLButtonElement;
    button.click();

    expect(onColorSelected).toHaveBeenCalledWith('#0000FF');
    expect(AnnouncerService.announce).toHaveBeenCalled();
  });

  it('should clear history', () => {
    panel.addRecentColor('#FF00FF');
    expect(container.querySelectorAll('button[data-recent-index]').length).toBe(1);

    const clearBtn = container.querySelector(
      'button[title="Clear recent colors history"]'
    ) as HTMLButtonElement;
    clearBtn.click();

    expect(container.style.display).toBe('none');
    expect(StorageService.setItem).toHaveBeenCalledWith(expect.any(String), []);
    expect(AnnouncerService.announce).toHaveBeenCalledWith('Recent colors cleared');
  });

  it('should handle storage error when loading recent colors', () => {
    vi.mocked(StorageService.getItem).mockImplementation(() => {
      throw new Error('Storage error');
    });

    panel = new RecentColorsPanel(container);
    panel.init();

    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to load recent colors from storage:',
      expect.any(Error)
    );
    expect(container.style.display).toBe('none');
  });

  it('should handle storage error when saving recent colors', () => {
    vi.mocked(StorageService.setItem).mockImplementation(() => {
      throw new Error('Storage full');
    });

    panel = new RecentColorsPanel(container);
    panel.init();

    panel.addRecentColor('#123456');

    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to save recent colors to storage:',
      expect.any(Error)
    );
  });

  it('should handle invalid storage data (non-array)', () => {
    vi.mocked(StorageService.getItem).mockReturnValue('invalid');

    panel = new RecentColorsPanel(container);
    panel.init();

    // Should treat invalid data as no colors
    expect(container.style.display).toBe('none');
  });

  it('should re-order existing color to front when added again', () => {
    vi.mocked(StorageService.getItem).mockReturnValue([]);

    panel = new RecentColorsPanel(container);
    panel.init();

    panel.addRecentColor('#FF0000');
    panel.addRecentColor('#00FF00');
    panel.addRecentColor('#0000FF');

    // First button should be blue (most recent)
    let firstButton = container.querySelector('button[data-recent-index="0"]') as HTMLButtonElement;
    expect(firstButton.style.backgroundColor).toBe('rgb(0, 0, 255)');

    // Now add red again - it should move to front
    panel.addRecentColor('#FF0000');

    firstButton = container.querySelector('button[data-recent-index="0"]') as HTMLButtonElement;
    expect(firstButton.style.backgroundColor).toBe('rgb(255, 0, 0)');
  });

  it('should normalize hex colors to uppercase', () => {
    panel.addRecentColor('#aabbcc');

    expect(StorageService.setItem).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([expect.objectContaining({ hex: '#AABBCC' })])
    );
  });

  it('should update data-recent-index attributes when adding color', () => {
    panel.addRecentColor('#FF0000');
    panel.addRecentColor('#00FF00');

    const buttons = container.querySelectorAll('button[data-recent-index]');
    expect(buttons.length).toBe(2);
    expect(buttons[0].getAttribute('data-recent-index')).toBe('0');
    expect(buttons[1].getAttribute('data-recent-index')).toBe('1');
  });

  it('should support custom storage key', () => {
    panel = new RecentColorsPanel(container, { storageKey: 'custom_key' });
    panel.init();
    panel.addRecentColor('#ABCDEF');

    expect(StorageService.setItem).toHaveBeenCalledWith('custom_key', expect.any(Array));
  });

  it('should support custom max colors', () => {
    panel = new RecentColorsPanel(container, { maxColors: 3 });
    panel.init();

    panel.addRecentColor('#111111');
    panel.addRecentColor('#222222');
    panel.addRecentColor('#333333');
    panel.addRecentColor('#444444');
    panel.addRecentColor('#555555');

    const buttons = container.querySelectorAll('button[data-recent-index]');
    expect(buttons.length).toBe(3);
  });

  it('should return state with recentColorsCount', () => {
    panel.addRecentColor('#FF0000');
    panel.addRecentColor('#00FF00');

    const state = panel.getState();
    expect(state.recentColorsCount).toBe(2);
  });

  it('should limit loaded colors to maxRecentColors', () => {
    const tooManyColors = Array.from({ length: 20 }, (_, i) => ({
      hex: `#${i.toString(16).padStart(6, '0')}`,
      timestamp: Date.now() + i,
    }));
    vi.mocked(StorageService.getItem).mockReturnValue(tooManyColors);

    panel = new RecentColorsPanel(container);
    panel.init();

    const buttons = container.querySelectorAll('button[data-recent-index]');
    expect(buttons.length).toBe(10); // Default max
  });

  it('should render section with correct id and class', () => {
    expect(container.id).toBe('recent-colors-section');
    expect(container.className).toContain('bg-white');
    expect(container.className).toContain('rounded-lg');
  });

  it('should render title with correct text', () => {
    const title = container.querySelector('h3');
    expect(title).not.toBeNull();
    expect(title?.textContent).toContain('Recent Picks');
  });
});
