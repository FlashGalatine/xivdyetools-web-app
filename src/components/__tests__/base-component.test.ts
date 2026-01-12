/**
 * XIV Dye Tools - BaseComponent Tests
 *
 * Tests for the BaseComponent abstract class
 * Covers lifecycle, DOM utilities, event handling, and state management
 */

import { BaseComponent } from '../base-component';
import {
  createTestContainer,
  cleanupTestContainer,
  cleanupComponent,
  expectElement,
} from './test-utils';
import { logger } from '@shared/logger';

// ============================================================================
// Test Component Implementation
// ============================================================================

/**
 * Simple test component for testing BaseComponent functionality
 */
class TestComponent extends BaseComponent {
  private renderCount = 0;
  private bindCount = 0;
  private buttonClickCount = 0;

  renderContent(): void {
    this.renderCount++;
    const wrapper = this.createElement('div', {
      className: 'test-component',
      dataAttributes: { testid: 'test-component' },
    });

    const button = this.createElement('button', {
      className: 'test-button',
      textContent: 'Click Me',
      dataAttributes: { testid: 'test-button' },
    });

    const counter = this.createElement('span', {
      className: 'counter',
      textContent: String(this.buttonClickCount),
      dataAttributes: { testid: 'counter' },
    });

    wrapper.appendChild(button);
    wrapper.appendChild(counter);

    this.container.innerHTML = '';
    this.element = wrapper;
    this.container.appendChild(this.element);
  }

  bindEvents(): void {
    this.bindCount++;
    const button = this.querySelector<HTMLButtonElement>('[data-testid="test-button"]');
    if (button) {
      this.on(button, 'click', this.handleButtonClick);
    }
  }

  private handleButtonClick(): void {
    this.buttonClickCount++;
    const counter = this.querySelector<HTMLSpanElement>('[data-testid="counter"]');
    if (counter) {
      counter.textContent = String(this.buttonClickCount);
    }
  }

  // Expose protected methods for testing
  public testCreateElement = this.createElement.bind(this);
  public testQuerySelector = this.querySelector.bind(this);
  public testQuerySelectorAll = this.querySelectorAll.bind(this);
  public testOn = this.on.bind(this);
  public testOff = this.off.bind(this);
  public testOnCustom = this.onCustom.bind(this);
  public testEmit = this.emit.bind(this);
  public testSetContent = this.setContent.bind(this);
  public getRenderCount = () => this.renderCount;
  public getBindCount = () => this.bindCount;
  public getButtonClickCount = () => this.buttonClickCount;
  public getListeners = () => this.listeners;
}

// ============================================================================
// Tests
// ============================================================================

describe('BaseComponent', () => {
  let container: HTMLElement;
  let component: TestComponent;

  beforeEach(() => {
    container = createTestContainer();
  });

  afterEach(() => {
    if (component) {
      cleanupComponent(component, container);
    } else {
      cleanupTestContainer(container);
    }
  });

  // ==========================================================================
  // Lifecycle Tests
  // ==========================================================================

  describe('Lifecycle', () => {
    it('should initialize component when init() is called', () => {
      component = new TestComponent(container);
      expect(component['isInitialized']).toBe(false);

      component.init();

      expect(component['isInitialized']).toBe(true);
      expect(component.getRenderCount()).toBe(1);
      expect(component.getBindCount()).toBe(1);
    });

    it('should not double-initialize component', () => {
      component = new TestComponent(container);
      component.init();
      const firstRenderCount = component.getRenderCount();

      // Try to init again (should warn and return early)
      const loggerSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
      component.init();

      expect(component.getRenderCount()).toBe(firstRenderCount);
      expect(loggerSpy).toHaveBeenCalledWith('Component already initialized');
      loggerSpy.mockRestore();
    });

    it('should call onMount lifecycle hook', () => {
      const onMountSpy = vi.fn();
      component = new TestComponent(container);
      component.onMount = onMountSpy;

      component.init();

      expect(onMountSpy).toHaveBeenCalledTimes(1);
    });

    it('should update component when update() is called', () => {
      component = new TestComponent(container);
      component.init();
      const initialRenderCount = component.getRenderCount();

      component.update();

      expect(component.getRenderCount()).toBe(initialRenderCount + 1);
      expect(component.getBindCount()).toBe(2); // Rebinds events
    });

    it('should call onUpdate lifecycle hook', () => {
      const onUpdateSpy = vi.fn();
      component = new TestComponent(container);
      component.init();
      component.onUpdate = onUpdateSpy;

      component.update();

      expect(onUpdateSpy).toHaveBeenCalledTimes(1);
    });

    it('should warn when update() called before init()', () => {
      component = new TestComponent(container);
      const loggerSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});

      component.update();

      expect(loggerSpy).toHaveBeenCalledWith('Component not initialized');
      loggerSpy.mockRestore();
    });

    it('should destroy component and clean up', () => {
      component = new TestComponent(container);
      component.init();

      expect(component['isDestroyed']).toBe(false);

      component.destroy();

      expect(component['isDestroyed']).toBe(true);
      expect(component['listeners'].size).toBe(0);
    });

    it('should call onUnmount lifecycle hook', () => {
      const onUnmountSpy = vi.fn();
      component = new TestComponent(container);
      component.init();
      component.onUnmount = onUnmountSpy;

      component.destroy();

      expect(onUnmountSpy).toHaveBeenCalledTimes(1);
    });

    it('should not double-destroy component', () => {
      const onUnmountSpy = vi.fn();
      component = new TestComponent(container);
      component.init();
      component.onUnmount = onUnmountSpy;

      component.destroy();
      component.destroy(); // Second destroy should be no-op

      expect(onUnmountSpy).toHaveBeenCalledTimes(1); // Only called once
    });
  });

  // ==========================================================================
  // DOM Creation Utilities
  // ==========================================================================

  describe('DOM Creation', () => {
    beforeEach(() => {
      component = new TestComponent(container);
      component.init();
    });

    it('should create element with className', () => {
      const element = component.testCreateElement('div', { className: 'test-class' });
      expect(element.className).toBe('test-class');
    });

    it('should create element with id', () => {
      const element = component.testCreateElement('div', { id: 'test-id' });
      expect(element.id).toBe('test-id');
    });

    it('should create element with innerHTML', () => {
      const element = component.testCreateElement('div', {
        innerHTML: '<span>Test</span>',
      });
      expect(element.innerHTML).toBe('<span>Test</span>');
    });

    it('should create element with textContent', () => {
      const element = component.testCreateElement('div', { textContent: 'Test Text' });
      expect(element.textContent).toBe('Test Text');
    });

    it('should create element with attributes', () => {
      const element = component.testCreateElement('div', {
        attributes: { 'data-test': 'value', role: 'button' },
      });
      expect(element.getAttribute('data-test')).toBe('value');
      expect(element.getAttribute('role')).toBe('button');
    });

    it('should create element with data attributes', () => {
      const element = component.testCreateElement('div', {
        dataAttributes: { testid: 'test', value: '123' },
      });
      expect(element.dataset.testid).toBe('test');
      expect(element.dataset.value).toBe('123');
    });

    it('should create element with all options combined', () => {
      const element = component.testCreateElement('button', {
        className: 'btn btn-primary',
        id: 'submit-btn',
        textContent: 'Submit',
        attributes: { type: 'submit', disabled: 'true' },
        dataAttributes: { action: 'submit' },
      });

      expect(element.className).toBe('btn btn-primary');
      expect(element.id).toBe('submit-btn');
      expect(element.textContent).toBe('Submit');
      expect(element.getAttribute('type')).toBe('submit');
      expect(element.getAttribute('disabled')).toBe('true');
      expect(element.dataset.action).toBe('submit');
    });
  });

  // ==========================================================================
  // Query Selectors
  // ==========================================================================

  describe('Query Selectors', () => {
    beforeEach(() => {
      component = new TestComponent(container);
      component.init();
    });

    it('should query single element', () => {
      const button = component.testQuerySelector<HTMLButtonElement>('[data-testid="test-button"]');
      expect(button).not.toBeNull();
      expect(button?.textContent).toBe('Click Me');
    });

    it('should return null for non-existent element', () => {
      const element = component.testQuerySelector('.non-existent');
      expect(element).toBeNull();
    });

    it('should query all elements', () => {
      // Add more buttons for testing querySelectorAll
      const wrapper = component['element'];
      if (wrapper) {
        const button2 = component.testCreateElement('button', {
          className: 'test-button',
          textContent: 'Button 2',
        });
        const button3 = component.testCreateElement('button', {
          className: 'test-button',
          textContent: 'Button 3',
        });
        wrapper.appendChild(button2);
        wrapper.appendChild(button3);
      }

      const buttons = component.testQuerySelectorAll<HTMLButtonElement>('.test-button');
      expect(buttons.length).toBe(3);
    });

    it('should return empty array for non-existent elements', () => {
      const elements = component.testQuerySelectorAll('.non-existent');
      expect(elements).toEqual([]);
    });
  });

  // ==========================================================================
  // Class Manipulation
  // ==========================================================================

  describe('Class Manipulation', () => {
    beforeEach(() => {
      component = new TestComponent(container);
      component.init();
    });

    it('should add class to element', () => {
      const button = component.testQuerySelector<HTMLButtonElement>('[data-testid="test-button"]');
      expect(button).not.toBeNull();

      component['addClass'](button!, 'active');
      expectElement.toHaveClass(button, 'active');
    });

    it('should remove class from element', () => {
      const button = component.testQuerySelector<HTMLButtonElement>('[data-testid="test-button"]');
      expect(button).not.toBeNull();

      button!.classList.add('active');
      component['removeClass'](button!, 'active');
      expectElement.toNotHaveClass(button, 'active');
    });

    it('should toggle class on element', () => {
      const button = component.testQuerySelector<HTMLButtonElement>('[data-testid="test-button"]');
      expect(button).not.toBeNull();

      component['toggleClass'](button!, 'active');
      expectElement.toHaveClass(button, 'active');

      component['toggleClass'](button!, 'active');
      expectElement.toNotHaveClass(button, 'active');
    });

    it('should check if element has class', () => {
      const button = component.testQuerySelector<HTMLButtonElement>('[data-testid="test-button"]');
      expect(button).not.toBeNull();

      expect(component['hasClass'](button!, 'active')).toBe(false);

      button!.classList.add('active');
      expect(component['hasClass'](button!, 'active')).toBe(true);
    });
  });

  // ==========================================================================
  // Event Handling
  // ==========================================================================

  describe('Event Handling', () => {
    beforeEach(() => {
      component = new TestComponent(container);
      component.init();
    });

    it('should handle button click events', () => {
      const button = component.testQuerySelector<HTMLButtonElement>('[data-testid="test-button"]');
      expect(button).not.toBeNull();

      button!.click();
      expect(component.getButtonClickCount()).toBe(1);

      button!.click();
      expect(component.getButtonClickCount()).toBe(2);
    });

    it('should update UI when button is clicked', () => {
      const button = component.testQuerySelector<HTMLButtonElement>('[data-testid="test-button"]');
      const counter = component.testQuerySelector<HTMLSpanElement>('[data-testid="counter"]');

      expect(counter?.textContent).toBe('0');

      button!.click();
      expect(counter?.textContent).toBe('1');

      button!.click();
      expect(counter?.textContent).toBe('2');
    });

    it('should emit custom events', () => {
      const eventHandler = vi.fn();
      container.addEventListener('custom-event', eventHandler);

      component.testEmit('custom-event', { data: 'test' });

      expect(eventHandler).toHaveBeenCalledTimes(1);
    });

    it('should clean up event listeners on destroy', () => {
      const button = component.testQuerySelector<HTMLButtonElement>('[data-testid="test-button"]');

      component.destroy();

      // Click should not increment counter after destroy
      const initialCount = component.getButtonClickCount();
      button!.click();
      expect(component.getButtonClickCount()).toBe(initialCount);
    });

    it('should clean up event listeners on update', () => {
      const initialListenerCount = component['listeners'].size;

      component.update();

      // Update should unbind and rebind events, keeping the same listener count
      expect(component['listeners'].size).toBe(initialListenerCount);
    });
  });

  // ==========================================================================
  // Visibility and Styling
  // ==========================================================================

  describe('Visibility and Styling', () => {
    beforeEach(() => {
      component = new TestComponent(container);
      component.init();
    });

    it('should show component', () => {
      component.hide();
      component.show();
      expect(component.isVisible()).toBe(true);
    });

    it('should hide component', () => {
      component.hide();
      expect(component.isVisible()).toBe(false);
      expectElement.toBeHidden(component['element']);
    });

    it('should check visibility correctly', () => {
      expect(component.isVisible()).toBe(true);

      component.hide();
      expect(component.isVisible()).toBe(false);

      component.show();
      expect(component.isVisible()).toBe(true);
    });

    it('should set component styles', () => {
      component.setStyle({ color: 'red', backgroundColor: 'blue' });

      const element = component['element'];
      expect(element?.style.color).toBe('red');
      expect(element?.style.backgroundColor).toBe('blue');
    });
  });

  // ==========================================================================
  // State Management
  // ==========================================================================

  describe('State Management', () => {
    beforeEach(() => {
      component = new TestComponent(container);
      component.init();
    });

    it('should get component state', () => {
      const state = component['getState']();
      expect(state).toBeDefined();
      expect(typeof state).toBe('object');
    });

    it('should allow setState to be called (base implementation is no-op)', () => {
      expect(() => {
        component['setState']({ test: 'value' });
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // Debug Utilities
  // ==========================================================================

  describe('Debug Utilities', () => {
    beforeEach(() => {
      component = new TestComponent(container);
      component.init();
    });

    it('should provide debug info', () => {
      const debugInfo = component.getDebugInfo();

      expect(debugInfo.name).toBe('TestComponent');
      expect(debugInfo.initialized).toBe(true);
      expect(debugInfo.destroyed).toBe(false);
      expect(debugInfo.element).toBe('DIV');
      expect(debugInfo.container).toBe('DIV');
      expect(typeof debugInfo.listeners).toBe('number');
    });

    it('should log debug info', () => {
      const loggerSpy = vi.spyOn(logger, 'info').mockImplementation(() => {});

      component.debug();

      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('TestComponent Debug Info'));
      loggerSpy.mockRestore();
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle render errors gracefully with error boundary', () => {
      class BrokenComponent extends BaseComponent {
        renderContent(): void {
          throw new Error('Render error');
        }
        bindEvents(): void {
          // No events
        }
      }

      const brokenComponent = new BrokenComponent(container);

      // Error boundary catches errors and renders fallback UI instead of throwing
      expect(() => {
        brokenComponent.init();
      }).not.toThrow();

      // Should show error state
      expect(brokenComponent.hasErrorState()).toBe(true);
      expect(brokenComponent.getError()?.message).toBe('Render error');

      // Should render error fallback UI
      const errorBoundary = container.querySelector('.component-error-boundary');
      expect(errorBoundary).not.toBeNull();

      cleanupComponent(brokenComponent, container);
      container = createTestContainer(); // Reset for afterEach
    });

    it('should handle update errors gracefully', () => {
      class BrokenUpdateComponent extends BaseComponent {
        private shouldThrow = false;

        renderContent(): void {
          if (this.shouldThrow) {
            throw new Error('Update error');
          }
          this.element = this.createElement('div', { textContent: 'Content' });
          this.container.appendChild(this.element);
        }

        bindEvents(): void {
          // No events
        }

        triggerError(): void {
          this.shouldThrow = true;
        }
      }

      const brokenComponent = new BrokenUpdateComponent(container);
      brokenComponent.init();

      brokenComponent.triggerError();

      // Update should not throw - error boundary catches it
      expect(() => {
        brokenComponent.update();
      }).not.toThrow();

      // Should show error state after failed update
      expect(brokenComponent.hasErrorState()).toBe(true);
      expect(brokenComponent.getError()?.message).toBe('Update error');

      cleanupComponent(brokenComponent, container);
      container = createTestContainer(); // Reset for afterEach
    });
  });

  // ==========================================================================
  // Error Boundary Tests
  // ==========================================================================

  describe('Error Boundary', () => {
    it('should render fallback UI with retry and reset buttons', () => {
      class ErrorComponent extends BaseComponent {
        renderContent(): void {
          throw new Error('Test error');
        }
        bindEvents(): void {
          // No events
        }
      }

      const errorComponent = new ErrorComponent(container);
      errorComponent.init();

      // Check fallback UI structure
      const errorBoundary = container.querySelector('.component-error-boundary');
      expect(errorBoundary).not.toBeNull();

      const errorTitle = container.querySelector('.component-error-title');
      expect(errorTitle?.textContent).toContain('Something went wrong');

      const errorDetails = container.querySelector('.component-error-details');
      expect(errorDetails?.textContent).toContain('Test error');

      const retryBtn = container.querySelector('[data-action="retry"]');
      expect(retryBtn).not.toBeNull();

      const resetBtn = container.querySelector('[data-action="reset"]');
      expect(resetBtn).not.toBeNull();

      cleanupComponent(errorComponent, container);
      container = createTestContainer();
    });

    it('should retry on retry button click', () => {
      let renderAttempts = 0;

      class RetryableComponent extends BaseComponent {
        renderContent(): void {
          renderAttempts++;
          if (renderAttempts < 3) {
            throw new Error('Not ready yet');
          }
          this.element = this.createElement('div', { textContent: 'Success!' });
          this.container.appendChild(this.element);
        }
        bindEvents(): void {
          // No events
        }
      }

      const retryComponent = new RetryableComponent(container);
      retryComponent.init();

      // First render failed
      expect(renderAttempts).toBe(1);
      expect(retryComponent.hasErrorState()).toBe(true);

      // Click retry - second attempt
      const retryBtn = container.querySelector('[data-action="retry"]') as HTMLButtonElement;
      retryBtn?.click();

      expect(renderAttempts).toBe(2);
      expect(retryComponent.hasErrorState()).toBe(true);

      // Click retry - third attempt (should succeed)
      const retryBtn2 = container.querySelector('[data-action="retry"]') as HTMLButtonElement;
      retryBtn2?.click();

      expect(renderAttempts).toBe(3);
      expect(retryComponent.hasErrorState()).toBe(false);
      expect(container.textContent).toContain('Success!');

      cleanupComponent(retryComponent, container);
      container = createTestContainer();
    });

    it('should hide retry button after max retries (3)', () => {
      class AlwaysFailComponent extends BaseComponent {
        renderContent(): void {
          throw new Error('Always fails');
        }
        bindEvents(): void {
          // No events
        }
      }

      const failComponent = new AlwaysFailComponent(container);
      failComponent.init();

      // Initial render failed (retryCount = 0)
      let retryBtn = container.querySelector('[data-action="retry"]') as HTMLButtonElement;
      expect(retryBtn).not.toBeNull();

      // Retry 1: retryCount increments to 1, then render fails
      retryBtn?.click();
      retryBtn = container.querySelector('[data-action="retry"]') as HTMLButtonElement;
      expect(retryBtn).not.toBeNull();

      // Retry 2: retryCount increments to 2, then render fails
      retryBtn?.click();
      retryBtn = container.querySelector('[data-action="retry"]') as HTMLButtonElement;
      expect(retryBtn).not.toBeNull();

      // Retry 3: retryCount increments to 3, then render fails
      retryBtn?.click();
      retryBtn = container.querySelector('[data-action="retry"]') as HTMLButtonElement;

      // After 3 retries (retryCount = 3), retry button should be hidden (3 < 3 = false)
      expect(retryBtn).toBeNull();

      // Reset button should still be visible
      const resetBtn = container.querySelector('[data-action="reset"]');
      expect(resetBtn).not.toBeNull();

      cleanupComponent(failComponent, container);
      container = createTestContainer();
    });

    it('should reset component state on reset button click', () => {
      let renderAttempts = 0;

      class ResettableComponent extends BaseComponent {
        renderContent(): void {
          renderAttempts++;
          if (renderAttempts < 2) {
            throw new Error('First attempt fails');
          }
          this.element = this.createElement('div', { textContent: 'Reset worked!' });
          this.container.appendChild(this.element);
        }
        bindEvents(): void {
          // No events
        }
      }

      const resetComponent = new ResettableComponent(container);
      resetComponent.init();

      // First render failed
      expect(resetComponent.hasErrorState()).toBe(true);

      // Click reset - resets retry count and re-initializes
      const resetBtn = container.querySelector('[data-action="reset"]') as HTMLButtonElement;
      resetBtn?.click();

      // Second render should succeed
      expect(resetComponent.hasErrorState()).toBe(false);
      expect(container.textContent).toContain('Reset worked!');

      cleanupComponent(resetComponent, container);
      container = createTestContainer();
    });

    it('should clear error state on successful render after retry', () => {
      let shouldFail = true;

      class RecoverableComponent extends BaseComponent {
        renderContent(): void {
          if (shouldFail) {
            throw new Error('Temporary failure');
          }
          this.element = this.createElement('div', { textContent: 'Recovered!' });
          this.container.appendChild(this.element);
        }
        bindEvents(): void {
          // No events
        }
      }

      const recoverComponent = new RecoverableComponent(container);
      recoverComponent.init();

      expect(recoverComponent.hasErrorState()).toBe(true);
      expect(recoverComponent.getError()?.message).toBe('Temporary failure');

      // Fix the issue
      shouldFail = false;

      // Retry
      const retryBtn = container.querySelector('[data-action="retry"]') as HTMLButtonElement;
      retryBtn?.click();

      // Should have recovered
      expect(recoverComponent.hasErrorState()).toBe(false);
      expect(recoverComponent.getError()).toBeNull();

      cleanupComponent(recoverComponent, container);
      container = createTestContainer();
    });

    it('should return correct values from error state getters', () => {
      class GetterTestComponent extends BaseComponent {
        renderContent(): void {
          throw new Error('Getter test error');
        }
        bindEvents(): void {
          // No events
        }
      }

      const getterComponent = new GetterTestComponent(container);

      // Before init - no error
      expect(getterComponent.hasErrorState()).toBe(false);
      expect(getterComponent.getError()).toBeNull();

      getterComponent.init();

      // After error
      expect(getterComponent.hasErrorState()).toBe(true);
      expect(getterComponent.getError()).toBeInstanceOf(Error);
      expect(getterComponent.getError()?.message).toBe('Getter test error');

      cleanupComponent(getterComponent, container);
      container = createTestContainer();
    });
  });

  // ==========================================================================
  // Event Listener Removal (off method)
  // ==========================================================================

  describe('Event Listener Removal (off)', () => {
    beforeEach(() => {
      component = new TestComponent(container);
      component.init();
    });

    it('should remove specific event listener using off()', () => {
      const button = component.testQuerySelector<HTMLButtonElement>('[data-testid="test-button"]');
      expect(button).not.toBeNull();

      const handler = vi.fn();
      const boundHandler = handler as EventListener;

      // Add custom event listener
      button!.addEventListener('click', boundHandler);

      // Trigger click - handler should be called
      button!.click();
      expect(handler).toHaveBeenCalledTimes(1);

      // Remove using off() - note: this won't remove unless it was added via on()
      // So let's test the internal path more directly
      component.testOff(button!, 'click', boundHandler);

      // Handler should still be removed via native removeEventListener
      button!.click();
      // Since we removed it, handler should only have been called once
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should remove event listener from stored listeners map', () => {
      const testButton = document.createElement('button');
      container.appendChild(testButton);

      const handler = vi.fn();

      // Add listener via on()
      component.testOn(testButton, 'click', handler);

      const listenersBeforeOff = component.getListeners().size;
      expect(listenersBeforeOff).toBeGreaterThan(1); // Has the existing button listener + our new one

      // Find the handler in the listeners map
      let storedHandler: EventListener | null = null;
      for (const listener of component.getListeners().values()) {
        if (listener.target === testButton && listener.event === 'click') {
          storedHandler = listener.handler;
          break;
        }
      }

      expect(storedHandler).not.toBeNull();

      // Remove using off()
      component.testOff(testButton, 'click', storedHandler!);

      // Listener should be removed from map
      let foundAfterOff = false;
      for (const listener of component.getListeners().values()) {
        if (listener.target === testButton && listener.event === 'click') {
          foundAfterOff = true;
          break;
        }
      }
      expect(foundAfterOff).toBe(false);
    });

    it('should handle off() with non-matching handler', () => {
      const testButton = document.createElement('button');
      container.appendChild(testButton);

      const handler1 = vi.fn();
      const handler2 = vi.fn();

      // Add listener via on()
      component.testOn(testButton, 'click', handler1);
      const listenersCountBefore = component.getListeners().size;

      // Try to remove with different handler - should not remove from stored listeners
      component.testOff(testButton, 'click', handler2 as EventListener);

      // Listener count should be the same (the off() tries to find matching handler)
      expect(component.getListeners().size).toBe(listenersCountBefore);
    });
  });

  // ==========================================================================
  // Custom Event Handling (onCustom method)
  // ==========================================================================

  describe('Custom Event Handling (onCustom)', () => {
    beforeEach(() => {
      component = new TestComponent(container);
      component.init();
    });

    it('should listen for custom events via onCustom()', () => {
      const customHandler = vi.fn();

      component.testOnCustom('my-custom-event', customHandler);

      // Dispatch custom event
      const event = new CustomEvent('my-custom-event', { detail: { data: 'test' } });
      component['element']!.dispatchEvent(event);

      expect(customHandler).toHaveBeenCalledTimes(1);
      expect(customHandler).toHaveBeenCalledWith(expect.any(CustomEvent));
    });

    it('should pass event detail to custom handler', () => {
      const customHandler = vi.fn();

      component.testOnCustom('data-event', customHandler);

      const eventDetail = { value: 123, name: 'test' };
      const event = new CustomEvent('data-event', { detail: eventDetail, bubbles: true });
      component['element']!.dispatchEvent(event);

      expect(customHandler).toHaveBeenCalledTimes(1);
      const calledEvent = customHandler.mock.calls[0][0] as CustomEvent;
      expect(calledEvent.detail).toEqual(eventDetail);
    });

    it('should not call handler for non-CustomEvent events', () => {
      const customHandler = vi.fn();

      component.testOnCustom('mixed-event', customHandler);

      // Dispatch a regular Event (not CustomEvent) - handler should NOT be called
      const regularEvent = new Event('mixed-event', { bubbles: true });
      component['element']!.dispatchEvent(regularEvent);

      // Handler checks instanceof CustomEvent, so should not be called for regular Event
      expect(customHandler).not.toHaveBeenCalled();
    });

    it('should store custom event listener in listeners map', () => {
      const customHandler = vi.fn();
      const initialListenerCount = component.getListeners().size;

      component.testOnCustom('stored-event', customHandler);

      // Should have added one more listener
      expect(component.getListeners().size).toBe(initialListenerCount + 1);

      // Should be stored with custom_ prefix (key format: custom_${eventName}_${timestamp}_${size})
      const keys = Array.from(component.getListeners().keys());
      expect(keys.some((key) => key.startsWith('custom_stored-event_'))).toBe(true);
    });

    it('should clean up custom event listeners on destroy', () => {
      const customHandler = vi.fn();

      component.testOnCustom('cleanup-event', customHandler);

      // Verify listener is added (key format: custom_${eventName}_${timestamp}_${size})
      const keys = Array.from(component.getListeners().keys());
      expect(keys.some((key) => key.startsWith('custom_cleanup-event_'))).toBe(true);

      // Destroy component
      component.destroy();

      // Dispatch event after destroy - should not be called
      const event = new CustomEvent('cleanup-event', { detail: {} });
      container.dispatchEvent(event);

      expect(customHandler).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // setContent Method Tests
  // ==========================================================================

  describe('setContent', () => {
    beforeEach(() => {
      component = new TestComponent(container);
      component.init();
    });

    it('should set string content', () => {
      const testDiv = document.createElement('div');
      testDiv.innerHTML = '<span>Old Content</span>';

      component.testSetContent(testDiv, 'New Text Content');

      expect(testDiv.textContent).toBe('New Text Content');
      expect(testDiv.innerHTML).toBe('New Text Content');
    });

    it('should set HTMLElement content', () => {
      const testDiv = document.createElement('div');
      testDiv.textContent = 'Old Content';

      const newElement = document.createElement('span');
      newElement.textContent = 'New Element';

      component.testSetContent(testDiv, newElement);

      expect(testDiv.children.length).toBe(1);
      expect(testDiv.firstChild).toBe(newElement);
      expect(testDiv.textContent).toBe('New Element');
    });

    it('should clear existing content before setting new content', () => {
      const testDiv = document.createElement('div');
      testDiv.innerHTML = '<p>First</p><p>Second</p><p>Third</p>';

      expect(testDiv.children.length).toBe(3);

      component.testSetContent(testDiv, 'Replaced');

      expect(testDiv.children.length).toBe(0);
      expect(testDiv.textContent).toBe('Replaced');
    });
  });

  // ==========================================================================
  // Edge Cases for Visibility Methods
  // ==========================================================================

  describe('Visibility Edge Cases', () => {
    it('should handle show/hide when element is null', () => {
      component = new TestComponent(container);
      // Don't init - element is null

      // Should not throw
      expect(() => {
        component.show();
        component.hide();
      }).not.toThrow();
    });

    it('should return false for isVisible when element is null', () => {
      component = new TestComponent(container);
      // Don't init - element is null

      expect(component.isVisible()).toBe(false);
    });

    it('should handle setStyle when element is null', () => {
      component = new TestComponent(container);
      // Don't init - element is null

      // Should not throw
      expect(() => {
        component.setStyle({ color: 'red' });
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // Event Handling with Document and Window
  // ==========================================================================

  describe('Event Handling with Document and Window', () => {
    beforeEach(() => {
      component = new TestComponent(container);
      component.init();
    });

    it('should attach events to document', () => {
      const handler = vi.fn();

      component.testOn(document, 'keydown', handler);

      const keyEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(keyEvent);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should store window event listeners in map', () => {
      // jsdom has limited window event support, so we test that listeners are stored
      const handler = vi.fn();
      const initialCount = component.getListeners().size;

      component.testOn(window, 'resize', handler);

      // Listener should be stored
      expect(component.getListeners().size).toBe(initialCount + 1);
    });

    it('should clean up document events on destroy', () => {
      const docHandler = vi.fn();

      component.testOn(document, 'keydown', docHandler);

      component.destroy();

      // Document events should no longer trigger handlers
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(docHandler).not.toHaveBeenCalled();
    });
  });
});
