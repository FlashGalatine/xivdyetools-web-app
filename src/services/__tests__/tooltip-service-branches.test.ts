/**
 * XIV Dye Tools - Tooltip Service Branch Coverage Tests
 *
 * Additional tests for uncovered branches in tooltip-service.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('TooltipService Branch Coverage', () => {
  let targetElement: HTMLElement;
  let TooltipService: typeof import('../tooltip-service').TooltipService;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();
    const module = await import('../tooltip-service');
    TooltipService = module.TooltipService;

    const existingContainer = document.getElementById('tooltip-container');
    if (existingContainer) {
      existingContainer.remove();
    }

    targetElement = document.createElement('button');
    targetElement.id = 'test-target';
    document.body.appendChild(targetElement);

    vi.spyOn(targetElement, 'getBoundingClientRect').mockReturnValue({
      x: 100,
      y: 100,
      width: 100,
      height: 30,
      top: 100,
      left: 100,
      right: 200,
      bottom: 130,
      toJSON: () => ({}),
    });
  });

  afterEach(() => {
    TooltipService.stopOrphanCleanup();
    TooltipService.detachAll();
    targetElement.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
    const container = document.getElementById('tooltip-container');
    if (container) container.remove();
  });

  describe('Orphan Cleanup', () => {
    it('should start orphan cleanup interval', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');
      TooltipService.startOrphanCleanup(1000);
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
    });

    it('should not start multiple cleanup intervals', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');
      TooltipService.startOrphanCleanup(1000);
      TooltipService.startOrphanCleanup(1000);
      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    });

    it('should stop orphan cleanup interval', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      TooltipService.startOrphanCleanup(1000);
      TooltipService.stopOrphanCleanup();
      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should handle stopping when no interval is running', () => {
      expect(() => TooltipService.stopOrphanCleanup()).not.toThrow();
    });

    it('should clean up orphaned tooltips when element is removed', () => {
      TooltipService.attach(targetElement, { content: 'Test tooltip' });
      TooltipService.startOrphanCleanup(100);
      targetElement.remove();
      vi.advanceTimersByTime(150);
      expect(() => TooltipService.show(targetElement)).not.toThrow();
    });
  });

  describe('Positioning Edge Cases', () => {
    it('should handle bottom position', () => {
      TooltipService.attach(targetElement, { content: 'Test', position: 'bottom' });
      TooltipService.show(targetElement);
      const tooltipId = targetElement.getAttribute('aria-describedby');
      const tooltip = tooltipId ? document.getElementById(tooltipId) : null;
      expect(tooltip?.getAttribute('data-position')).toBe('bottom');
    });

    it('should handle left position', () => {
      TooltipService.attach(targetElement, { content: 'Test', position: 'left' });
      TooltipService.show(targetElement);
      const tooltipId = targetElement.getAttribute('aria-describedby');
      const tooltip = tooltipId ? document.getElementById(tooltipId) : null;
      expect(tooltip?.getAttribute('data-position')).toBe('left');
    });

    it('should handle right position', () => {
      TooltipService.attach(targetElement, { content: 'Test', position: 'right' });
      TooltipService.show(targetElement);
      const tooltipId = targetElement.getAttribute('aria-describedby');
      const tooltip = tooltipId ? document.getElementById(tooltipId) : null;
      expect(tooltip?.getAttribute('data-position')).toBe('right');
    });
  });

  describe('updateContent Edge Cases', () => {
    it('should update content when tooltip is shown', () => {
      TooltipService.attach(targetElement, { content: 'Original' });
      TooltipService.show(targetElement);
      TooltipService.updateContent(targetElement, 'Updated');
      const tooltipId = targetElement.getAttribute('aria-describedby');
      const tooltip = tooltipId ? document.getElementById(tooltipId) : null;
      expect(tooltip?.textContent).toContain('Updated');
    });

    it('should handle updateContent when tooltip element does not exist', () => {
      TooltipService.attach(targetElement, { content: 'Original' });
      expect(() => TooltipService.updateContent(targetElement, 'Updated')).not.toThrow();
    });

    it('should handle updateContent for non-attached target', () => {
      const otherElement = document.createElement('div');
      expect(() => TooltipService.updateContent(otherElement, 'Test')).not.toThrow();
    });
  });

  describe('Timeout Clearing', () => {
    it('should clear pending hide timeout on show', () => {
      TooltipService.attach(targetElement, { content: 'Test', delay: 0 });
      TooltipService.show(targetElement);
      targetElement.dispatchEvent(new MouseEvent('mouseleave'));
      vi.advanceTimersByTime(50);
      TooltipService.show(targetElement);
      const tooltipId = targetElement.getAttribute('aria-describedby');
      const tooltip = tooltipId ? document.getElementById(tooltipId) : null;
      expect(tooltip?.classList.contains('tooltip-visible')).toBe(true);
    });

    it('should clear pending show timeout on hide', () => {
      TooltipService.attach(targetElement, { content: 'Test', delay: 500 });
      targetElement.dispatchEvent(new MouseEvent('mouseenter'));
      vi.advanceTimersByTime(100);
      TooltipService.hide(targetElement);
      vi.advanceTimersByTime(500);
      const container = document.getElementById('tooltip-container');
      expect(container).toBeNull();
    });
  });
});
