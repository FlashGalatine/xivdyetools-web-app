/**
 * XIV Dye Tools v4.0 - Result Card Component
 *
 * Unified 320px result card for displaying dye match results.
 * Used across Harmony, Gradient, Budget, Swatch, Extractor, and other tools.
 *
 * V4 Design Updates:
 * - Dark header background (rgba(0, 0, 0, 0.4)) with centered dye name
 * - Preview labels: "Original" / "Match"
 * - Taller preview area (100px)
 * - HSV values in Technical column
 * - Hue Deviance (°) displayed alongside Delta-E
 * - Action bar at bottom with "Select Dye" button + context menu
 * - Context menu pops UP from action bar
 *
 * @module components/v4/result-card
 */

import { html, css, CSSResultGroup, TemplateResult, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { BaseLitComponent } from './base-lit-component';
import { ICON_CONTEXT_MENU } from '@shared/ui-icons';
import type { Dye, DyeWithDistance } from '@shared/types';
import { ColorService } from '@xivdyetools/core';

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
  /** Hue deviance in degrees from ideal (optional) */
  hueDeviance?: number;
  /** Market server name (optional) */
  marketServer?: string;
  /** Price in Gil (optional) */
  price?: number;
  /** Vendor cost in Gil (optional) */
  vendorCost?: number;
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
 * - Split color preview (Original vs Match) - 100px tall
 * - Two-column details grid (Technical + Acquisition)
 * - Delta-E and Hue Deviance color coding for match quality
 * - HSV values in Technical column
 * - Action bar at bottom with Select Dye button + context menu
 * - Context menu pops UP from action bar
 *
 * @fires card-select - Emits when "Select Dye" button is clicked
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
 *     deltaE: 2.5,
 *     hueDeviance: 1.2
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
   * Show the action bar and context menu
   */
  @property({ type: Boolean, attribute: 'show-actions' })
  showActions: boolean = true;

  /**
   * Label for primary action button
   */
  @property({ type: String, attribute: 'primary-action-label' })
  primaryActionLabel: string = 'Select Dye';

  /**
   * Selected state styling
   */
  @property({ type: Boolean, reflect: true })
  selected: boolean = false;

  /**
   * Show HEX code in technical details
   */
  @property({ type: Boolean, attribute: 'show-hex' })
  showHex: boolean = true;

  /**
   * Show RGB values in technical details
   */
  @property({ type: Boolean, attribute: 'show-rgb' })
  showRgb: boolean = true;

  /**
   * Show HSV values in technical details
   */
  @property({ type: Boolean, attribute: 'show-hsv' })
  showHsv: boolean = true;

  /**
   * Show LAB values in technical details
   */
  @property({ type: Boolean, attribute: 'show-lab' })
  showLab: boolean = false;

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
          var(--v4-card-gradient-end, #151515)
        );
        border: 1px solid var(--theme-border, rgba(255, 255, 255, 0.1));
        border-radius: 12px;
        overflow: hidden;
        transition: transform var(--v4-transition-fast, 150ms),
          box-shadow var(--v4-transition-fast, 150ms),
          border-color var(--v4-transition-fast, 150ms);
        position: relative;
      }

      .result-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
        border-color: var(--theme-text-muted, #888888);
      }

      :host([selected]) .result-card {
        border-color: var(--theme-primary, #d4af37);
        box-shadow: 0 0 0 2px var(--theme-primary, #d4af37);
      }

      /* Header - Dark background, centered name */
      .card-header {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 10px 16px;
        background: rgba(0, 0, 0, 0.4);
        border-bottom: 1px solid var(--theme-border, rgba(255, 255, 255, 0.1));
      }

      .dye-name {
        margin: 0;
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 0.5px;
        color: var(--theme-text, #e0e0e0);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-align: center;
      }

      /* Color Preview - 100px tall */
      .color-preview {
        display: flex;
        height: 100px;
        width: 100%;
        position: relative;
        flex-shrink: 0;
      }

      .preview-half {
        flex: 1;
        height: 100%;
        position: relative;
      }

      .preview-label {
        position: absolute;
        bottom: 4px;
        width: 100%;
        text-align: center;
        font-size: 9px;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.8);
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
        pointer-events: none;
      }

      /* Details Grid */
      .details-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        padding: 12px;
        background: linear-gradient(
          to bottom,
          var(--theme-card-background, #2a2a2a),
          var(--v4-card-gradient-end, #151515)
        );
      }

      .detail-column {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .column-header {
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        color: var(--theme-text-muted, #888888);
        margin-bottom: 4px;
        border-bottom: 1px solid var(--theme-border, rgba(255, 255, 255, 0.1));
        padding-bottom: 2px;
      }

      .detail-row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        font-size: 11px;
      }

      .detail-label {
        color: var(--theme-text-muted, #888888);
      }

      .detail-value {
        font-family: 'Consolas', 'Monaco', monospace;
        color: var(--theme-text, #e0e0e0);
        text-align: right;
      }

      .detail-value.large {
        font-size: 13px;
        font-weight: 600;
        color: var(--theme-primary, #d4af37);
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

      /* Action Bar at Bottom */
      .card-actions {
        padding: 8px;
        display: flex;
        justify-content: center;
        border-top: 1px solid var(--theme-border, rgba(255, 255, 255, 0.1));
        background: rgba(0, 0, 0, 0.2);
      }

      .action-row {
        display: flex;
        gap: 8px;
        width: 100%;
        align-items: center;
      }

      .primary-action-btn {
        flex: 1;
        text-align: center;
        padding: 8px;
        font-size: 12px;
        font-weight: 600;
        color: var(--theme-card-background, #121212);
        background: var(--theme-primary, #d4af37);
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color var(--v4-transition-fast, 150ms);
      }

      .primary-action-btn:hover {
        background: var(--theme-accent-hover, #f0c040);
      }

      .primary-action-btn:focus-visible {
        outline: 2px solid var(--theme-text, #e0e0e0);
        outline-offset: 2px;
      }

      /* Context Menu Container */
      .context-menu-container {
        position: relative;
        display: inline-block;
      }

      .menu-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        padding: 6px;
        border: 1px solid var(--theme-border, rgba(255, 255, 255, 0.1));
        border-radius: 4px;
        background: transparent;
        color: var(--theme-text-muted, #888888);
        cursor: pointer;
        transition: all var(--v4-transition-fast, 150ms);
      }

      .menu-btn:hover,
      .menu-btn.active {
        background: rgba(255, 255, 255, 0.1);
        color: var(--theme-text, #e0e0e0);
        border-color: var(--theme-text-muted, #888888);
      }

      .menu-btn:focus-visible {
        outline: 2px solid var(--theme-primary, #d4af37);
        outline-offset: 2px;
      }

      .menu-btn svg {
        width: 18px;
        height: 18px;
        fill: currentColor;
      }

      /* Context Menu - Pops UP from action bar */
      .context-menu {
        position: absolute;
        bottom: 100%;
        right: 0;
        width: 200px;
        background: var(--theme-card-background, #2a2a2a);
        border: 1px solid var(--theme-border, #3a3a3a);
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        padding: 6px 0;
        z-index: 100;
        margin-bottom: 8px;
        opacity: 0;
        visibility: hidden;
        transform: translateY(8px);
        transition: opacity 0.15s, transform 0.15s, visibility 0.15s;
      }

      .context-menu.open {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
      }

      .menu-item {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        padding: 10px 16px;
        border: none;
        background: transparent;
        color: var(--theme-text-muted, #888888);
        text-align: left;
        font-size: 13px;
        cursor: pointer;
        transition: background-color 0.1s;
      }

      .menu-item:hover {
        background: rgba(255, 255, 255, 0.05);
        color: var(--theme-text, #e0e0e0);
      }

      .menu-item:focus-visible {
        outline: 2px solid var(--theme-primary, #d4af37);
        outline-offset: -2px;
      }

      /* Reduced motion */
      @media (prefers-reduced-motion: reduce) {
        .result-card,
        .menu-btn,
        .context-menu,
        .primary-action-btn {
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
   * Format price with commas and "G" suffix
   */
  private formatPrice(price?: number): string {
    if (price === undefined || price === null) return '—';
    return `${price.toLocaleString()} G`;
  }

  /**
   * Format vendor cost with "G" suffix
   */
  private formatVendorCost(cost?: number): string {
    if (cost === undefined || cost === null) return '—';
    return `${cost.toLocaleString()} G`;
  }

  /**
   * Format LAB values for display (rounded to integers)
   */
  private formatLabValues(): string {
    if (!this.data) return '—';
    const lab = ColorService.hexToLab(this.data.matchedColor);
    return `${Math.round(lab.L)},${Math.round(lab.a)},${Math.round(lab.b)}`;
  }

  /**
   * Handle primary action (Select Dye) click
   */
  private handleSelectClick(e: Event): void {
    e.stopPropagation();
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

    const { dye, originalColor, matchedColor, deltaE, hueDeviance, marketServer, price, vendorCost } =
      this.data;

    // Get HSV values from dye (may be undefined for some dye types)
    const hsv = dye.hsv;

    return html`
      <article
        class="result-card"
        role="article"
        aria-label="Dye result: ${dye.name}"
      >
        <!-- Header - Dark bg, centered name -->
        <header class="card-header">
          <h3 class="dye-name">${dye.name}</h3>
        </header>

        <!-- Color Preview - 100px tall -->
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
            ${hueDeviance !== undefined
        ? html`
                  <div class="detail-row">
                    <span class="detail-label">Hue°</span>
                    <span class="detail-value">${hueDeviance.toFixed(1)}°</span>
                  </div>
                `
        : nothing}
            ${this.showHex
        ? html`
            <div class="detail-row">
              <span class="detail-label">HEX</span>
              <span class="detail-value">${matchedColor.toUpperCase()}</span>
            </div>
                `
        : nothing}
            ${this.showRgb
        ? html`
            <div class="detail-row">
              <span class="detail-label">RGB</span>
              <span class="detail-value">
                ${dye.rgb.r},${dye.rgb.g},${dye.rgb.b}
              </span>
            </div>
                `
        : nothing}
            ${this.showHsv && hsv
        ? html`
                  <div class="detail-row">
                    <span class="detail-label">HSV</span>
                    <span class="detail-value">
                      ${Math.round(hsv.h)},${Math.round(hsv.s)},${Math.round(hsv.v)}
                    </span>
                  </div>
                `
        : nothing}
            ${this.showLab
        ? html`
                  <div class="detail-row">
                    <span class="detail-label">LAB</span>
                    <span class="detail-value">${this.formatLabValues()}</span>
                  </div>
                `
        : nothing}
          </div>

          <!-- Acquisition Column -->
          <div class="detail-column">
            <div class="column-header">Acquisition</div>
            <div class="detail-row">
              <span class="detail-label">Source</span>
              <span class="detail-value">${dye.acquisition ?? 'Unknown'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Cost</span>
              <span class="detail-value">${this.formatVendorCost(vendorCost)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Market</span>
              <span class="detail-value">${marketServer ?? 'N/A'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-value large">${this.formatPrice(price)}</span>
            </div>
          </div>
        </div>

        <!-- Action Bar at Bottom -->
        ${this.showActions
        ? html`
              <div class="card-actions">
                <div class="action-row">
                  <button
                    class="primary-action-btn"
                    type="button"
                    @click=${this.handleSelectClick}
                  >
                    ${this.primaryActionLabel}
                  </button>
                  <div class="context-menu-container">
                    <button
                      class="menu-btn ${this.menuOpen ? 'active' : ''}"
                      type="button"
                      aria-label="More actions"
                      aria-haspopup="true"
                      aria-expanded=${this.menuOpen}
                      @click=${this.handleMenuClick}
                    >
                      ${unsafeHTML(ICON_CONTEXT_MENU)}
                    </button>
                    <!-- Context Menu - Pops UP -->
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
                        Add to Access. Check
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
                  </div>
                </div>
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
