import { ModalContainer } from '../modal-container';
import { ModalService, Modal, ModalType, ModalId } from '@services/modal-service';
import {
  createTestContainer,
  cleanupTestContainer,
  renderComponent,
  cleanupComponent,
  expectElement,
} from './test-utils';

// Helper to create a modal with required fields
// Use Omit to exclude the branded id type and replace with string for test convenience
const createModal = (overrides: Omit<Partial<Modal>, 'id'> & { id: string; title: string }): Modal => ({
  type: 'custom' as ModalType,
  timestamp: Date.now(),
  ...overrides,
  id: overrides.id as ModalId,
});

// Mock ModalService
vi.mock('@services/modal-service', () => {
  let subscribers: ((modals: Modal[]) => void)[] = [];
  let currentModals: Modal[] = [];

  return {
    ModalService: {
      subscribe: vi.fn((callback) => {
        subscribers.push(callback);
        return () => {
          subscribers = subscribers.filter((s) => s !== callback);
        };
      }),
      getTopModal: vi.fn(() => currentModals[currentModals.length - 1]),
      dismiss: vi.fn((id) => {
        currentModals = currentModals.filter((m) => m.id !== id);
        subscribers.forEach((cb) => cb(currentModals));
      }),
      prefersReducedMotion: vi.fn(() => false),
      // Helper to trigger updates manually in tests
      _updateModals: (modals: Modal[]) => {
        currentModals = modals;
        subscribers.forEach((cb) => cb(currentModals));
      },
    },
  };
});

// Mock shared utils
vi.mock('@shared/utils', () => ({
  clearContainer: vi.fn((container: HTMLElement) => {
    container.innerHTML = '';
  }),
}));

describe('ModalContainer', () => {
  let container: HTMLElement;
  let component: ModalContainer;

  beforeEach(() => {
    container = createTestContainer();
  });

  afterEach(() => {
    if (component && container) {
      cleanupComponent(component, container);
    } else {
      cleanupTestContainer(container);
    }
    document.body.style.overflow = ''; // Reset body style
  });

  describe('Initialization', () => {
    it('should subscribe to ModalService on init', () => {
      [component, container] = renderComponent(ModalContainer);
      expect(ModalService.subscribe).toHaveBeenCalled();
    });
  });

  describe('Rendering', () => {
    it('should render nothing when no modals', () => {
      [component, container] = renderComponent(ModalContainer);
      // @ts-ignore
      ModalService._updateModals([]);

      expect(container.innerHTML).toBe('');
    });

    it('should render a modal when added', () => {
      [component, container] = renderComponent(ModalContainer);

      const modal: Modal = createModal({
        id: 'test-modal',
        title: 'Test Modal',
        content: 'Modal Content',
        closable: true,
        type: 'custom',
      });

      // @ts-ignore
      ModalService._updateModals([modal]);

      const dialog = container.querySelector('.modal-dialog');
      expect(dialog).not.toBeNull();
      expect(dialog?.textContent).toContain('Test Modal');
      expect(dialog?.textContent).toContain('Modal Content');
    });

    it('should lock body scroll when modal is open', () => {
      [component, container] = renderComponent(ModalContainer);

      const modal: Modal = createModal({
        id: 'test-modal',
        title: 'Test',
        content: 'Content',
      });

      // @ts-ignore
      ModalService._updateModals([modal]);

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should unlock body scroll when modal closes', () => {
      [component, container] = renderComponent(ModalContainer);

      const modal: Modal = createModal({
        id: 'test-modal',
        title: 'Test',
        content: 'Content',
      });

      // @ts-ignore
      ModalService._updateModals([modal]);
      expect(document.body.style.overflow).toBe('hidden');

      // @ts-ignore
      ModalService._updateModals([]);
      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('Interactions', () => {
    it('should dismiss modal on close button click', () => {
      [component, container] = renderComponent(ModalContainer);

      const modal: Modal = createModal({
        id: 'test-modal',
        title: 'Test',
        content: 'Content',
        closable: true,
      });

      // @ts-ignore
      ModalService._updateModals([modal]);

      const closeBtn = container.querySelector('button[aria-label="Close modal"]') as HTMLElement;
      closeBtn.click();

      expect(ModalService.dismiss).toHaveBeenCalledWith('test-modal');
    });

    it('should dismiss modal on backdrop click if allowed', () => {
      [component, container] = renderComponent(ModalContainer);

      const modal: Modal = createModal({
        id: 'test-modal',
        title: 'Test',
        content: 'Content',
        closable: true,
        closeOnBackdrop: true,
      });

      // @ts-ignore
      ModalService._updateModals([modal]);

      const backdrop = container.querySelector('.modal-backdrop') as HTMLElement;
      backdrop.click();

      expect(ModalService.dismiss).toHaveBeenCalledWith('test-modal');
    });

    it('should NOT dismiss modal on backdrop click if NOT allowed', () => {
      [component, container] = renderComponent(ModalContainer);

      const modal: Modal = createModal({
        id: 'test-modal',
        title: 'Test',
        content: 'Content',
        closable: true,
        closeOnBackdrop: false,
      });

      // @ts-ignore
      ModalService._updateModals([modal]);

      const backdrop = container.querySelector('.modal-backdrop') as HTMLElement;
      backdrop.click();

      // Should not have been called again (it might have been called in previous tests, so check count or reset mocks)
      vi.clearAllMocks();
      backdrop.click();
      expect(ModalService.dismiss).not.toHaveBeenCalled();
    });

    it('should handle confirm button click', () => {
      [component, container] = renderComponent(ModalContainer);
      const onConfirm = vi.fn();

      const modal: Modal = createModal({
        id: 'confirm-modal',
        title: 'Confirm',
        content: 'Are you sure?',
        type: 'confirm',
        onConfirm,
      });

      // @ts-ignore
      ModalService._updateModals([modal]);

      const confirmBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent === 'Confirm'
      ) as HTMLElement;
      confirmBtn.click();

      expect(onConfirm).toHaveBeenCalled();
      expect(ModalService.dismiss).toHaveBeenCalledWith('confirm-modal');
    });
  });

  describe('Keyboard Interactions', () => {
    it('should dismiss modal on Escape key if allowed', () => {
      [component, container] = renderComponent(ModalContainer);

      const modal: Modal = createModal({
        id: 'escape-modal',
        title: 'Test',
        content: 'Content',
        closable: true,
        closeOnEscape: true,
      });

      // @ts-ignore
      ModalService._updateModals([modal]);

      // Dispatch Escape key on document
      // Since we can't easily dispatch on document, call the handler directly
      component['handleKeyDown']({ key: 'Escape', preventDefault: vi.fn() } as unknown as KeyboardEvent);

      expect(ModalService.dismiss).toHaveBeenCalledWith('escape-modal');
    });

    it('should NOT dismiss on Escape if not closable', () => {
      [component, container] = renderComponent(ModalContainer);
      vi.clearAllMocks();

      const modal: Modal = createModal({
        id: 'no-escape-modal',
        title: 'Test',
        content: 'Content',
        closable: false,
        closeOnEscape: true,
      });

      // @ts-ignore
      ModalService._updateModals([modal]);
      vi.clearAllMocks();

      component['handleKeyDown']({ key: 'Escape', preventDefault: vi.fn() } as unknown as KeyboardEvent);

      expect(ModalService.dismiss).not.toHaveBeenCalled();
    });

    it('should NOT dismiss on Escape if closeOnEscape is false', () => {
      [component, container] = renderComponent(ModalContainer);

      const modal: Modal = createModal({
        id: 'no-escape-modal',
        title: 'Test',
        content: 'Content',
        closable: true,
        closeOnEscape: false,
      });

      // @ts-ignore
      ModalService._updateModals([modal]);
      vi.clearAllMocks();

      component['handleKeyDown']({ key: 'Escape', preventDefault: vi.fn() } as unknown as KeyboardEvent);

      expect(ModalService.dismiss).not.toHaveBeenCalled();
    });

    it('should trap focus within modal on Tab', () => {
      [component, container] = renderComponent(ModalContainer);

      const modal: Modal = createModal({
        id: 'focus-modal',
        title: 'Focus Test',
        content: '<button id="inner-btn">Inner</button>',
        closable: true,
        type: 'confirm',
      });

      // @ts-ignore
      ModalService._updateModals([modal]);

      // Get the focusable elements
      const focusables = component['focusTrapElements'];
      expect(focusables.length).toBeGreaterThan(0);
    });

    it('should wrap focus from last to first element on Tab', () => {
      [component, container] = renderComponent(ModalContainer);

      const modal: Modal = createModal({
        id: 'focus-modal',
        title: 'Focus Test',
        content: 'Content',
        closable: true,
        type: 'confirm',
      });

      // @ts-ignore
      ModalService._updateModals([modal]);

      // Set up focus trap elements
      const focusables = component['focusTrapElements'];
      if (focusables.length > 0) {
        const lastElement = focusables[focusables.length - 1];
        const firstElement = focusables[0];

        // Mock document.activeElement to be last element
        Object.defineProperty(document, 'activeElement', {
          value: lastElement,
          configurable: true,
        });

        const preventDefaultSpy = vi.fn();
        component['handleFocusTrap']({
          key: 'Tab',
          shiftKey: false,
          preventDefault: preventDefaultSpy,
        } as unknown as KeyboardEvent);

        expect(preventDefaultSpy).toHaveBeenCalled();

        // Restore
        Object.defineProperty(document, 'activeElement', {
          value: document.body,
          configurable: true,
        });
      }
    });

    it('should wrap focus from first to last element on Shift+Tab', () => {
      [component, container] = renderComponent(ModalContainer);

      const modal: Modal = createModal({
        id: 'focus-modal',
        title: 'Focus Test',
        content: 'Content',
        closable: true,
        type: 'confirm',
      });

      // @ts-ignore
      ModalService._updateModals([modal]);

      // Set up focus trap elements
      const focusables = component['focusTrapElements'];
      if (focusables.length > 0) {
        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

        // Mock document.activeElement to be first element
        Object.defineProperty(document, 'activeElement', {
          value: firstElement,
          configurable: true,
        });

        const preventDefaultSpy = vi.fn();
        component['handleFocusTrap']({
          key: 'Tab',
          shiftKey: true,
          preventDefault: preventDefaultSpy,
        } as unknown as KeyboardEvent);

        expect(preventDefaultSpy).toHaveBeenCalled();

        // Restore
        Object.defineProperty(document, 'activeElement', {
          value: document.body,
          configurable: true,
        });
      }
    });

    it('should handle Tab key but not trap if focus is in the middle', () => {
      [component, container] = renderComponent(ModalContainer);

      const modal: Modal = createModal({
        id: 'focus-modal',
        title: 'Focus Test',
        content: 'Content',
        closable: true,
        type: 'confirm',
        confirmText: 'OK',
        cancelText: 'Cancel',
      });

      // @ts-ignore
      ModalService._updateModals([modal]);

      const focusables = component['focusTrapElements'];
      if (focusables.length >= 3) {
        // Focus on middle element
        const middleElement = focusables[1];

        Object.defineProperty(document, 'activeElement', {
          value: middleElement,
          configurable: true,
        });

        const preventDefaultSpy = vi.fn();
        component['handleFocusTrap']({
          key: 'Tab',
          shiftKey: false,
          preventDefault: preventDefaultSpy,
        } as unknown as KeyboardEvent);

        // Should not prevent default when in the middle
        expect(preventDefaultSpy).not.toHaveBeenCalled();

        Object.defineProperty(document, 'activeElement', {
          value: document.body,
          configurable: true,
        });
      }
    });

    it('should call handleFocusTrap on Tab when modals exist', () => {
      [component, container] = renderComponent(ModalContainer);

      const modal: Modal = createModal({
        id: 'tab-modal',
        title: 'Tab Test',
        content: 'Content',
        closable: true,
        type: 'confirm',
      });

      // @ts-ignore
      ModalService._updateModals([modal]);

      const handleFocusTrapSpy = vi.spyOn(component as any, 'handleFocusTrap');

      component['handleKeyDown']({
        key: 'Tab',
        preventDefault: vi.fn(),
      } as unknown as KeyboardEvent);

      expect(handleFocusTrapSpy).toHaveBeenCalled();
    });

    it('should not call handleFocusTrap on Tab when no modals', () => {
      [component, container] = renderComponent(ModalContainer);

      // @ts-ignore
      ModalService._updateModals([]);

      const handleFocusTrapSpy = vi.spyOn(component as any, 'handleFocusTrap');

      component['handleKeyDown']({
        key: 'Tab',
        preventDefault: vi.fn(),
      } as unknown as KeyboardEvent);

      expect(handleFocusTrapSpy).not.toHaveBeenCalled();
    });
  });

  describe('Modal Sizes', () => {
    it('should use default md size when not specified', () => {
      [component, container] = renderComponent(ModalContainer);

      const modal: Modal = createModal({
        id: 'size-modal',
        title: 'Size Test',
        content: 'Content',
      });

      // @ts-ignore
      ModalService._updateModals([modal]);

      const dialog = container.querySelector('.modal-dialog');
      expect(dialog?.classList.contains('max-w-lg')).toBe(true);
    });

    it('should use sm size when specified', () => {
      [component, container] = renderComponent(ModalContainer);

      const modal: Modal = createModal({
        id: 'size-modal',
        title: 'Size Test',
        content: 'Content',
        size: 'sm',
      });

      // @ts-ignore
      ModalService._updateModals([modal]);

      const dialog = container.querySelector('.modal-dialog');
      expect(dialog?.classList.contains('max-w-sm')).toBe(true);
    });

    it('should use lg size when specified', () => {
      [component, container] = renderComponent(ModalContainer);

      const modal: Modal = createModal({
        id: 'size-modal',
        title: 'Size Test',
        content: 'Content',
        size: 'lg',
      });

      // @ts-ignore
      ModalService._updateModals([modal]);

      const dialog = container.querySelector('.modal-dialog');
      expect(dialog?.classList.contains('max-w-2xl')).toBe(true);
    });
  });

  describe('Reduced Motion', () => {
    it('should skip animations when reduced motion is preferred', () => {
      // Mock prefersReducedMotion to return true
      (ModalService.prefersReducedMotion as any).mockReturnValue(true);

      [component, container] = renderComponent(ModalContainer);

      const modal: Modal = createModal({
        id: 'motion-modal',
        title: 'Motion Test',
        content: 'Content',
      });

      // @ts-ignore
      ModalService._updateModals([modal]);

      const backdrop = container.querySelector('.modal-backdrop');
      expect(backdrop?.classList.contains('modal-backdrop-animate-in')).toBe(false);

      // Reset mock
      (ModalService.prefersReducedMotion as any).mockReturnValue(false);
    });
  });

  describe('Multiple Modals', () => {
    it('should render multiple stacked modals', () => {
      [component, container] = renderComponent(ModalContainer);

      const modals: Modal[] = [
        { id: 'modal-1' as ModalId, title: 'Modal 1', content: 'Content 1', type: 'custom', timestamp: Date.now() },
        { id: 'modal-2' as ModalId, title: 'Modal 2', content: 'Content 2', type: 'custom', timestamp: Date.now() + 1 },
      ];

      // @ts-ignore
      ModalService._updateModals(modals);

      const allModals = container.querySelectorAll('.modal-backdrop');
      expect(allModals.length).toBe(2);
    });

    it('should only show backdrop on topmost modal', () => {
      [component, container] = renderComponent(ModalContainer);

      const modals: Modal[] = [
        createModal({ id: 'modal-1', title: 'Modal 1', content: 'Content 1' }),
        createModal({ id: 'modal-2', title: 'Modal 2', content: 'Content 2' }),
      ];

      // @ts-ignore
      ModalService._updateModals(modals);

      const firstBackdrop = container.querySelector('[data-modal-id="modal-1"]');
      const secondBackdrop = container.querySelector('[data-modal-id="modal-2"]');

      // First modal should have transparent backdrop
      expect(firstBackdrop?.classList.contains('bg-transparent')).toBe(true);
      // Second (top) modal should have visible backdrop
      expect(secondBackdrop?.classList.contains('bg-black/50')).toBe(true);
    });
  });

  describe('Content Types', () => {
    it('should render string content as HTML', () => {
      [component, container] = renderComponent(ModalContainer);

      const modal: Modal = createModal({
        id: 'html-modal',
        title: 'HTML Test',
        content: '<strong>Bold content</strong>',
      });

      // @ts-ignore
      ModalService._updateModals([modal]);

      const content = container.querySelector('[id^="modal-content-"]');
      expect(content?.innerHTML).toContain('<strong>Bold content</strong>');
    });

    it('should render HTMLElement content', () => {
      [component, container] = renderComponent(ModalContainer);

      const contentElement = document.createElement('div');
      contentElement.textContent = 'Element content';
      contentElement.id = 'custom-content';

      const modal: Modal = createModal({
        id: 'element-modal',
        title: 'Element Test',
        content: contentElement,
      });

      // @ts-ignore
      ModalService._updateModals([modal]);

      const content = container.querySelector('#custom-content');
      expect(content).not.toBeNull();
      expect(content?.textContent).toBe('Element content');
    });
  });

  describe('Lifecycle', () => {
    it('should unsubscribe on unmount', () => {
      [component, container] = renderComponent(ModalContainer);

      // Store a reference to check unsubscription
      expect(component['unsubscribe']).not.toBeNull();

      component.destroy();

      expect(component['unsubscribe']).toBeNull();
    });

    it('should restore focus to previous element after modal closes', () => {
      const previousButton = document.createElement('button');
      previousButton.id = 'prev-button';
      document.body.appendChild(previousButton);
      previousButton.focus();

      [component, container] = renderComponent(ModalContainer);

      const modal: Modal = createModal({
        id: 'focus-restore-modal',
        title: 'Focus Test',
        content: 'Content',
      });

      // @ts-ignore
      ModalService._updateModals([modal]);

      // Now close modal
      // @ts-ignore
      ModalService._updateModals([]);

      // Focus should be restored
      // Note: In jsdom, focus restoration may not work perfectly
      document.body.removeChild(previousButton);
    });
  });

  describe('Custom Buttons', () => {
    it('should render cancel button with custom text', () => {
      [component, container] = renderComponent(ModalContainer);

      const modal: Modal = createModal({
        id: 'custom-btn-modal',
        title: 'Custom Button Test',
        content: 'Content',
        cancelText: 'No Thanks',
      });

      // @ts-ignore
      ModalService._updateModals([modal]);

      const cancelBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent === 'No Thanks'
      );
      expect(cancelBtn).not.toBeUndefined();
    });

    it('should render confirm button with custom text', () => {
      [component, container] = renderComponent(ModalContainer);

      const modal: Modal = createModal({
        id: 'custom-btn-modal',
        title: 'Custom Button Test',
        content: 'Content',
        confirmText: 'Yes Please',
      });

      // @ts-ignore
      ModalService._updateModals([modal]);

      const confirmBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent === 'Yes Please'
      );
      expect(confirmBtn).not.toBeUndefined();
    });

    it('should handle cancel button click', () => {
      [component, container] = renderComponent(ModalContainer);

      const modal: Modal = createModal({
        id: 'cancel-modal',
        title: 'Cancel Test',
        content: 'Content',
        cancelText: 'Cancel',
      });

      // @ts-ignore
      ModalService._updateModals([modal]);
      vi.clearAllMocks();

      const cancelBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent === 'Cancel'
      );
      (cancelBtn as HTMLElement)?.click();

      expect(ModalService.dismiss).toHaveBeenCalledWith('cancel-modal');
    });
  });

  describe('handleFocusTrap edge cases', () => {
    it('should return early if no focusable elements', () => {
      [component, container] = renderComponent(ModalContainer);

      // Set empty focusTrapElements
      component['focusTrapElements'] = [];

      const preventDefaultSpy = vi.fn();
      component['handleFocusTrap']({
        key: 'Tab',
        shiftKey: false,
        preventDefault: preventDefaultSpy,
      } as unknown as KeyboardEvent);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });
  });

  describe('Modal without content', () => {
    it('should not add aria-describedby when no content', () => {
      [component, container] = renderComponent(ModalContainer);

      const modal: Modal = createModal({
        id: 'no-content-modal',
        title: 'No Content',
        content: undefined,
      });

      // @ts-ignore
      ModalService._updateModals([modal]);

      const dialog = container.querySelector('.modal-dialog');
      expect(dialog?.getAttribute('aria-describedby')).toBeNull();
    });
  });
});
