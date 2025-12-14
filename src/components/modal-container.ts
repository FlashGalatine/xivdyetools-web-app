/**
 * XIV Dye Tools v2.1.0 - Modal Container Component
 *
 * Renders modal dialogs with animations, backdrop, and accessibility support
 * Extends BaseComponent for consistent lifecycle management
 *
 * @module components/modal-container
 */

import { BaseComponent } from './base-component';
import { ModalService, Modal } from '@services/modal-service';
import { clearContainer } from '@shared/utils';

// ============================================================================
// Modal Size Configuration
// ============================================================================

const MODAL_SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
} as const;

// ============================================================================
// Modal Container Component
// ============================================================================

export class ModalContainer extends BaseComponent {
  private modals: Modal[] = [];
  private unsubscribe: (() => void) | null = null;
  private previousActiveElement: HTMLElement | null = null;
  private focusTrapElements: HTMLElement[] = [];

  constructor(container: HTMLElement) {
    super(container);
  }

  /**
   * Lifecycle: Called after initialization
   */
  onMount(): void {
    // Subscribe to modal service
    this.unsubscribe = ModalService.subscribe((modals) => {
      console.log('[ModalContainer] subscription callback, received modals:', modals.length);
      const hadModals = this.modals.length > 0;
      const hasModals = modals.length > 0;

      // Store active element before opening first modal
      if (!hadModals && hasModals) {
        this.previousActiveElement = document.activeElement as HTMLElement;
      }

      this.modals = modals;
      console.log('[ModalContainer] calling update()');
      this.update();

      // Restore focus after closing last modal
      if (hadModals && !hasModals && this.previousActiveElement) {
        this.previousActiveElement.focus();
        this.previousActiveElement = null;
      }
    });

    // Listen for Escape key to close modals
    this.on(document, 'keydown', this.handleKeyDown);
  }

  /**
   * Lifecycle: Called before destruction
   */
  onUnmount(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  /**
   * Handle keyboard events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      const topModal = ModalService.getTopModal();
      if (topModal?.closeOnEscape && topModal.closable) {
        event.preventDefault();
        ModalService.dismiss(topModal.id);
      }
    }

    // Tab key focus trap
    if (event.key === 'Tab' && this.modals.length > 0) {
      this.handleFocusTrap(event);
    }
  }

  /**
   * Handle focus trap within modal
   */
  private handleFocusTrap(event: KeyboardEvent): void {
    if (this.focusTrapElements.length === 0) return;

    const firstElement = this.focusTrapElements[0];
    const lastElement = this.focusTrapElements[this.focusTrapElements.length - 1];

    if (event.shiftKey) {
      // Shift + Tab: if on first element, go to last
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab: if on last element, go to first
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }

  /**
   * Get focusable elements within a container
   */
  private getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selector = [
      'button:not([disabled])',
      'a[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    return Array.from(container.querySelectorAll<HTMLElement>(selector));
  }

  /**
   * Handle backdrop click
   */
  private handleBackdropClick(event: MouseEvent, modal: Modal): void {
    if (
      modal.closeOnBackdrop &&
      modal.closable &&
      (event.target as HTMLElement).classList.contains('modal-backdrop')
    ) {
      ModalService.dismiss(modal.id);
    }
  }

  /**
   * Create the modal element
   */
  private createModalElement(modal: Modal, index: number): HTMLElement {
    const isTopModal = index === this.modals.length - 1;

    // Backdrop
    const backdrop = this.createElement('div', {
      className: `
        modal-backdrop fixed inset-0 flex items-center justify-center p-4
        ${isTopModal ? 'bg-black/50' : 'bg-transparent'}
        ${!ModalService.prefersReducedMotion() ? 'modal-backdrop-animate-in' : ''}
      `
        .replace(/\s+/g, ' ')
        .trim(),
      attributes: {
        role: 'presentation',
        'data-modal-id': modal.id,
        style: `z-index: ${50 + index}`,
      },
    });

    // Modal dialog
    const dialogAttributes: Record<string, string> = {
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': `modal-title-${modal.id}`,
    };
    if (modal.content) {
      dialogAttributes['aria-describedby'] = `modal-content-${modal.id}`;
    }

    const dialog = this.createElement('div', {
      className: `
        modal-dialog relative w-full ${MODAL_SIZES[modal.size || 'md']}
        bg-white dark:bg-gray-800 rounded-lg shadow-xl
        border border-gray-200 dark:border-gray-700
        ${!ModalService.prefersReducedMotion() ? 'modal-animate-in' : ''}
      `
        .replace(/\s+/g, ' ')
        .trim(),
      attributes: dialogAttributes,
    });

    // Header
    const header = this.createElement('div', {
      className:
        'flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700',
    });

    const title = this.createElement('h2', {
      id: `modal-title-${modal.id}`,
      className: 'text-lg font-semibold text-gray-900 dark:text-white',
      textContent: modal.title,
    });
    header.appendChild(title);

    // Close button (if closable)
    if (modal.closable) {
      const closeBtn = this.createElement('button', {
        className: `
          p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
          hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
        `
          .replace(/\s+/g, ' ')
          .trim(),
        attributes: {
          type: 'button',
          'aria-label': 'Close modal',
        },
        innerHTML: `
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        `,
      });
      this.on(closeBtn, 'click', () => ModalService.dismiss(modal.id));
      header.appendChild(closeBtn);
    }

    dialog.appendChild(header);

    // Content area
    const content = this.createElement('div', {
      id: `modal-content-${modal.id}`,
      className: 'p-4 max-h-[60vh] overflow-y-auto',
    });

    if (modal.content) {
      if (typeof modal.content === 'string') {
        // Render trusted modal string content as HTML (callers control input)
        content.innerHTML = modal.content;
      } else {
        content.appendChild(modal.content);
      }
    }

    dialog.appendChild(content);

    // Footer with action buttons (for confirm type or custom buttons)
    if (modal.type === 'confirm' || modal.confirmText || modal.cancelText) {
      const footer = this.createElement('div', {
        className: 'flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700',
      });

      // Cancel button
      if (modal.cancelText || modal.type === 'confirm') {
        const cancelBtn = this.createElement('button', {
          className: `
            px-4 py-2 text-sm font-medium rounded-lg
            text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700
            hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors
            focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1
          `
            .replace(/\s+/g, ' ')
            .trim(),
          attributes: { type: 'button' },
          textContent: modal.cancelText || 'Cancel',
        });
        this.on(cancelBtn, 'click', () => ModalService.dismiss(modal.id));
        footer.appendChild(cancelBtn);
      }

      // Confirm button
      if (modal.confirmText || modal.type === 'confirm') {
        const confirmBtn = this.createElement('button', {
          className: `
            px-4 py-2 text-sm font-medium rounded-lg
            text-white bg-blue-600 hover:bg-blue-700 transition-colors
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
          `
            .replace(/\s+/g, ' ')
            .trim(),
          attributes: { type: 'button' },
          textContent: modal.confirmText || 'Confirm',
        });
        this.on(confirmBtn, 'click', () => {
          if (modal.onConfirm) {
            modal.onConfirm();
          }
          ModalService.dismiss(modal.id);
        });
        footer.appendChild(confirmBtn);
      }

      dialog.appendChild(footer);
    }

    backdrop.appendChild(dialog);

    // Handle backdrop click
    this.on(backdrop, 'click', (e) => this.handleBackdropClick(e, modal));

    return backdrop;
  }

  /**
   * Render the modal container
   */
  render(): void {
    console.log('[ModalContainer] render() called, modals.length:', this.modals.length);
    console.log('[ModalContainer] container children before clear:', this.container.children.length);
    clearContainer(this.container);
    console.log('[ModalContainer] container children after clear:', this.container.children.length);

    // If no modals, don't render anything
    if (this.modals.length === 0) {
      console.log('[ModalContainer] no modals, setting element to null and returning');
      this.element = null;
      return;
    }

    // Create container wrapper
    this.element = this.createElement('div', {
      id: 'modal-container',
      className: 'modal-container',
      attributes: {
        'aria-label': 'Modal dialogs',
      },
    });

    // Render each modal
    this.modals.forEach((modal, index) => {
      const modalEl = this.createModalElement(modal, index);
      this.element!.appendChild(modalEl);
    });

    this.container.appendChild(this.element);

    // WEB-BUG-005: Apply inert to background modals for proper focus containment
    // This prevents screen readers and keyboard navigation from reaching hidden modals
    this.modals.forEach((modal, index) => {
      const modalWrapper = this.element?.querySelector(`[data-modal-id="${modal.id}"]`);
      if (modalWrapper) {
        if (index < this.modals.length - 1) {
          // Background modal - mark as inert
          modalWrapper.setAttribute('inert', '');
        } else {
          // Top modal - ensure inert is removed
          modalWrapper.removeAttribute('inert');
        }
      }
    });

    // Set up focus trap for topmost modal
    const topModalEl = this.element.querySelector(
      `[data-modal-id="${this.modals[this.modals.length - 1].id}"] .modal-dialog`
    );
    if (topModalEl) {
      this.focusTrapElements = this.getFocusableElements(topModalEl as HTMLElement);
      // Focus first focusable element (use safeTimeout for cleanup on destroy)
      if (this.focusTrapElements.length > 0) {
        this.safeTimeout(() => this.focusTrapElements[0]?.focus(), 50);
      }
    }

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
  }

  /**
   * Called after update
   */
  onUpdate(): void {
    console.log('[ModalContainer] onUpdate() called, modals.length:', this.modals.length);
    // Restore body scroll when no modals
    if (this.modals.length === 0) {
      console.log('[ModalContainer] restoring body scroll');
      document.body.style.overflow = '';
      // Debug: verify DOM state
      console.log('[ModalContainer] container final state:', {
        containerChildren: this.container.children.length,
        hasModalBackdrop: !!document.querySelector('.modal-backdrop'),
        bodyOverflow: document.body.style.overflow,
      });
    }
  }

  /**
   * Bind event listeners
   */
  bindEvents(): void {
    // Events are bound in createModalElement
  }
}
