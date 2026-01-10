/**
 * XIV Dye Tools v4.0 - Result Card Component
 *
 * Unified 320px result card for displaying dye match results.
 * Used across Harmony, Gradient, Budget, Swatch, Extractor, and other tools.
 *
 * @module components/v4/result-card
 */

import { html, css, CSSResultGroup, TemplateResult, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { BaseLitComponent } from './base-lit-component';
import { ICON_CONTEXT_MENU } from '@shared/ui-icons';
import type { Dye, DyeWithDistance } from '@shared/types';

/**
 * Data structure for the result card
 */
export interface ResultCardData {
  /** The dye being displayed */
  dye: Dye | DyeWithDistance;
  /** HEX color of the original/input color (with #) */
  originalColor: string;
  /** HEX color of the matched dye (with #) */
  matchedColor: string;
  /** Delta-E color difference (optional) */
  deltaE?: number;
  /** Market server name (optional) */
  marketServer?: string;
  /** Price in Gil (optional) */
  price?: number;
}

/**
 * Context menu action identifiers
 */
export type ContextAction =
  | 'add-comparison'
  | 'add-mixer'
  | 'add-accessibility'
  | 'see-harmonies'
  | 'budget'
  | 'copy-hex';

/**
 * V4 Result Card - Unified dye result display
 *
 * Features:
 * - Fixed 320px width for consistent grid layouts
 * - Split color preview (original vs match)
 * - Two-column details grid (Technical + Acquisition)
 * - Delta-E color coding for match quality
 * - Context menu with 6 standard actions
 *
 * @fires card-select - Emits when card is clicked
 *   - `detail.dye`: The selected dye
 * @fires context-action - Emits when context menu action is selected
 *   - `detail.action`: The action identifier
 *   - `detail.dye`: The associated dye
 *
 * @example
 * ```html
 * <v4-result-card
 *   .data=${{
 *     dye: someDye,
 *     originalColor: '#ff0000',
 *     matchedColor: '#e01010',
 *     deltaE: 2.5
 *   }}
 *   @card-select=${(e) => this.handleSelect(e.detail.dye)}
 *   @context-action=${(e) => this.handleAction(e.detail)}
 * ></v4-result-card>
 * ```
 */
@customElement('v4-result-card')
export class ResultCard extends BaseLitComponent {
  /**
   * Card data containing dye info and colors
   */
  @property({ attribute: false })
  data?: ResultCardData;

  /**
   * Show the context menu button
   */
  @property({ type: Boolean, attribute: 'show-actions' })
  showActions: boolean = true;

  /**
   * Label for primary action (future use)
   */
  @property({ type: String, attribute: 'primary-action-label' })
  primaryActionLabel: string = 'Select Dye';

  /**
   * Selected state styling
   */
  @property({ type: Boolean, reflect: true })
  selected: boolean = false;

  /**
   * Context menu open state
   */
  @state()
  private menuOpen: boolean = false;

  static override styles: CSSResultGroup = [
    BaseLitComponent.baseStyles,
    css`
      :host {
        display: block;
        width: var(--v4-result-card-width, 320px);
      }

      .result-card {
        background: linear-gradient(
          to bottom,
          var(--theme-card-background, #2a2a2a),
          var(--v4-card-gradient-end, #1a1a1a)
        );
        border: 1px solid var(--theme-border, #3a3a3a);
        border-radius: 8px;
        overflow: hidden;
        cursor: pointer;
        transition: transform var(--v4-transition-fast, 150ms),
          box-shadow var(--v4-transition-fast, 150ms);
        position: relative;
      }

      .result-card:hover {
        transform: translateY(-2px);
        box-shadow: var(--v4-shadow-soft, 0 4px 24px rgba(0, 0, 0, 0.2));
      }

      :host([selected]) .result-card {
        border-color: var(--theme-primary, #d4af37);
        box-shadow: 0 0 0 2px var(--theme-primary, #d4af37);
      }

      /* Header */
      .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background: var(--theme-primary, #8b1a1a);
        color: var(--theme-text-header, #ffffff);
      }

      .dye-name {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex: 1;
        margin-right: 8px;
      }

      .menu-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        padding: 0;
        border: none;
        border-radius: 4px;
        background: transparent;
        color: inherit;
        cursor: pointer;
        opacity: 0.7;
        transition: opacity var(--v4-transition-fast, 150ms),
          background-color var(--v4-transition-fast, 150ms);
        flex-shrink: 0;
      }

      .menu-btn:hover {
        opacity: 1;
        background: rgba(255, 255, 255, 0.15);
      }

      .menu-btn:focus-visible {
        opacity: 1;
        outline: 2px solid currentColor;
        outline-offset: 2px;
      }

      .menu-btn svg {
        width: 16px;
        height: 16px;
        fill: currentColor;
      }

      /* Color Preview */
      .color-preview {
        display: flex;
        height: 60px;
      }

      .preview-half {
        flex: 1;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        padding-bottom: 8px;
        position: relative;
      }

      .preview-label {
        font-size: 10px;
        font-weight: 500;
        background: rgba(0, 0, 0, 0.6);
        color: #ffffff;
        padding: 2px 8px;
        border-radius: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      /* Details Grid */
      .details-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        padding: 16px;
      }

      .detail-column {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .column-header {
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--theme-text-muted, #888888);
        margin-bottom: 4px;
      }

      .detail-row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        font-size: 12px;
      }

      .detail-label {
        color: var(--theme-text-muted, #888888);
      }

      .detail-value {
        font-family: 'Consolas', 'Monaco', monospace;
        color: var(--theme-text, #e0e0e0);
      }

      .detail-value.large {
        font-size: 16px;
        font-weight: 600;
      }

      /* Delta-E color coding */
      .delta-excellent {
        color: #4caf50;
      }
      .delta-good {
        color: #8bc34a;
      }
      .delta-acceptable {
        color: #ffc107;
      }
      .delta-noticeable {
        color: #ff9800;
      }
      .delta-poor {
        color: #f44336;
      }

      /* Context Menu */
      .context-menu {
        position: absolute;
        top: 48px;
        right: 8px;
        min-width: 200px;
        background: var(--theme-card-background, #2a2a2a);
        border: 1px solid var(--theme-border, #3a3a3a);
        border-radius: 8px;
        box-shadow: var(--v4-shadow-soft, 0 4px 24px rgba(0, 0, 0, 0.3));
        z-index: 100;
        opacity: 0;
        visibility: hidden;
        transform: translateY(-8px);
        transition: opacity 0.15s, transform 0.15s, visibility 0.15s;
      }

      .context-menu.open {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
      }

      .menu-item {
        display: block;
        width: 100%;
        padding: 10px 16px;
        border: none;
        background: transparent;
        color: var(--theme-text, #e0e0e0);
        text-align: left;
        font-size: 13px;
        cursor: pointer;
        transition: background-color 0.15s;
      }

      .menu-item:first-child {
        border-radius: 8px 8px 0 0;
      }

      .menu-item:last-child {
        border-radius: 0 0 8px 8px;
      }

      .menu-item:only-child {
        border-radius: 8px;
      }

      .menu-item:hover {
        background: var(--theme-card-hover, #3a3a3a);
      }

      .menu-item:focus-visible {
        outline: 2px solid var(--theme-primary, #d4af37);
        outline-offset: -2px;
      }

      /* Reduced motion */
      @media (prefers-reduced-motion: reduce) {
        .result-card,
        .menu-btn,
        .context-menu {
          transition: none;
        }
        .result-card:hover {
          transform: none;
        }
      }
    `,
  ];

  /**
   * Get Delta-E color class based on value
   */
  private getDeltaEClass(deltaE?: number): string {
    if (deltaE === undefined) return '';
    if (deltaE <= 1) return 'delta-excellent';
    if (deltaE <= 3) return 'delta-good';
    if (deltaE <= 5) return 'delta-acceptable';
    if (deltaE <= 10) return 'delta-noticeable';
    return 'delta-poor';
  }

  /**
   * Format price with commas
   */
  private formatPrice(price?: number): string {
    if (price === undefined || price === null) return '—';
    return `${price.toLocaleString()} Gil`;
  }

  /**
   * Handle card click (not on menu)
   */
  private handleCardClick(e: Event): void {
    // Don't trigger if clicking menu button or menu
    const target = e.target as HTMLElement;
    if (target.closest('.menu-btn') || target.closest('.context-menu')) {
      return;
    }

    if (this.data) {
      this.emit<{ dye: Dye }>('card-select', { dye: this.data.dye });
    }
  }

  /**
   * Toggle context menu
   */
  private handleMenuClick(e: Event): void {
    e.stopPropagation();
    this.menuOpen = !this.menuOpen;
  }

  /**
   * Handle context menu action
   */
  private handleMenuAction(action: ContextAction): void {
    if (this.data) {
      this.emit<{ action: ContextAction; dye: Dye }>('context-action', {
        action,
        dye: this.data.dye,
      });
    }
    this.menuOpen = false;
  }

  /**
   * Close menu on click outside
   */
  private handleDocumentClick = (): void => {
    if (this.menuOpen) {
      this.menuOpen = false;
    }
  };

  /**
   * Close menu on Escape
   */
  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.menuOpen) {
      this.menuOpen = false;
    }
  };

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('click', this.handleDocumentClick);
    document.addEventListener('keydown', this.handleKeyDown);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('click', this.handleDocumentClick);
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  protected override render(): TemplateResult {
    if (!this.data) {
      return html`<div class="result-card">No data</div>`;
    }

    const { dye, originalColor, matchedColor, deltaE, marketServer, price } =
      this.data;
    const dyeWithDistance = dye as DyeWithDistance;

    return html`
      <article
        class="result-card"
        role="article"
        aria-label="Dye result: ${dye.name}"
        @click=${this.handleCardClick}
      >
        <!-- Header -->
        <header class="card-header">
          <h3 class="dye-name">${dye.name}</h3>
          ${this.showActions
            ? html`
                <button
                  class="menu-btn"
                  type="button"
                  aria-label="More actions"
                  aria-haspopup="true"
                  aria-expanded=${this.menuOpen}
                  @click=${this.handleMenuClick}
                >
                  ${unsafeHTML(ICON_CONTEXT_MENU)}
                </button>
              `
            : nothing}
        </header>

        <!-- Color Preview -->
        <div class="color-preview">
          <div class="preview-half" style="background-color: ${originalColor}">
            <span class="preview-label">Original</span>
          </div>
          <div class="preview-half" style="background-color: ${matchedColor}">
            <span class="preview-label">Match</span>
          </div>
        </div>

        <!-- Details Grid -->
        <div class="details-grid">
          <!-- Technical Column -->
          <div class="detail-column">
            <div class="column-header">Technical</div>
            <div class="detail-row">
              <span class="detail-label">ΔE</span>
              <span class="detail-value ${this.getDeltaEClass(deltaE)}">
                ${deltaE !== undefined ? deltaE.toFixed(2) : '—'}
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">HEX</span>
              <span class="detail-value">${matchedColor.toUpperCase()}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">RGB</span>
              <span class="detail-value">
                ${dye.rgb.r}, ${dye.rgb.g}, ${dye.rgb.b}
              </span>
            </div>
          </div>

          <!-- Acquisition Column -->
          <div class="detail-column">
            <div class="column-header">Acquisition</div>
            <div class="detail-row">
              <span class="detail-label">Source</span>
              <span class="detail-value">${dye.source ?? 'Unknown'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Market</span>
              <span class="detail-value">${marketServer ?? 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Price</span>
              <span class="detail-value large">${this.formatPrice(price)}</span>
            </div>
          </div>
        </div>

        <!-- Context Menu -->
        ${this.showActions
          ? html`
              <div
                class="context-menu ${this.menuOpen ? 'open' : ''}"
                role="menu"
                aria-hidden=${!this.menuOpen}
              >
                <button
                  class="menu-item"
                  role="menuitem"
                  @click=${() => this.handleMenuAction('add-comparison')}
                >
                  Add to Comparison
                </button>
                <button
                  class="menu-item"
                  role="menuitem"
                  @click=${() => this.handleMenuAction('add-mixer')}
                >
                  Add to Mixer
                </button>
                <button
                  class="menu-item"
                  role="menuitem"
                  @click=${() => this.handleMenuAction('add-accessibility')}
                >
                  Add to Accessibility Check
                </button>
                <button
                  class="menu-item"
                  role="menuitem"
                  @click=${() => this.handleMenuAction('see-harmonies')}
                >
                  See Color Harmonies
                </button>
                <button
                  class="menu-item"
                  role="menuitem"
                  @click=${() => this.handleMenuAction('budget')}
                >
                  Budget Suggestions
                </button>
                <button
                  class="menu-item"
                  role="menuitem"
                  @click=${() => this.handleMenuAction('copy-hex')}
                >
                  Copy Hex Code
                </button>
              </div>
            `
          : nothing}
      </article>
    `;
  }
}

// TypeScript declaration for custom element
declare global {
  interface HTMLElementTagNameMap {
    'v4-result-card': ResultCard;
  }
}
