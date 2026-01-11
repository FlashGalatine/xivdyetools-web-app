/**
 * XIV Dye Tools v4.0 - Dye Palette Drawer Component
 *
 * 320px right-side drawer containing dye selection palette.
 * Features favorites, search, filter chips, and swatch grid.
 * Emits dye-selected events for context-aware tool integration.
 *
 * @module components/v4/dye-palette-drawer
 */

import { html, css, CSSResultGroup, TemplateResult, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { BaseLitComponent } from './base-lit-component';
import { DyeService, type Dye } from '@services/dye-service-wrapper';
import { CollectionService } from '@services/collection-service';
import { logger } from '@shared/logger';

/**
 * Filter types for dye categories
 */
type DyeFilter = 'all' | 'metallic' | 'pastel' | 'dark' | 'vibrant';

/**
 * Dye categories for grouping
 */
const DYE_CATEGORY_ORDER = [
  'White',
  'Grey',
  'Black',
  'Brown',
  'Red',
  'Orange',
  'Yellow',
  'Green',
  'Blue',
  'Purple',
  'Pink',
] as const;

/**
 * V4 Dye Palette Drawer - Right-side color selection panel
 *
 * @fires dye-selected - When a dye swatch is clicked
 *   - detail.dye: The selected Dye object
 * @fires drawer-toggle - When close button is clicked
 *
 * @example
 * ```html
 * <dye-palette-drawer
 *   .isOpen=${true}
 *   @dye-selected=${this.handleDyeSelected}
 *   @drawer-toggle=${this.handleToggle}
 * ></dye-palette-drawer>
 * ```
 */
@customElement('dye-palette-drawer')
export class DyePaletteDrawer extends BaseLitComponent {
  /**
   * Whether the drawer is open/visible
   */
  @property({ type: Boolean, reflect: true, attribute: 'is-open' })
  isOpen = true;

  // =========================================================================
  // Internal State
  // =========================================================================

  @state() private searchQuery = '';
  @state() private activeFilter: DyeFilter = 'all';
  @state() private favoriteDyes: Dye[] = [];
  @state() private allDyes: Dye[] = [];
  @state() private filteredDyes: Dye[] = [];
  @state() private favoritesExpanded = true;

  private unsubscribeFavorites: (() => void) | null = null;

  static override styles: CSSResultGroup = [
    BaseLitComponent.baseStyles,
    css`
      :host {
        display: block;
        width: var(--v4-drawer-width, 320px);
        height: 100%;
        flex-shrink: 0;
      }

      :host(:not([is-open])) {
        display: none;
      }

      .drawer {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--v4-glass-bg, rgba(30, 30, 30, 0.7));
        backdrop-filter: var(--v4-glass-blur, blur(12px));
        -webkit-backdrop-filter: var(--v4-glass-blur, blur(12px));
        border-left: 1px solid var(--v4-glass-border, rgba(255, 255, 255, 0.1));
      }

      /* Header */
      .drawer-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        border-bottom: 1px solid var(--v4-border-subtle, rgba(255, 255, 255, 0.1));
      }

      .drawer-title {
        font-weight: 600;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: var(--theme-text, #e0e0e0);
      }

      .close-btn {
        background: none;
        border: none;
        color: var(--v4-text-secondary, #a0a0a0);
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.2s, background 0.2s;
      }

      .close-btn:hover {
        color: var(--theme-text, #e0e0e0);
        background: rgba(255, 255, 255, 0.1);
      }

      /* Drawer Content */
      .drawer-content {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        scrollbar-width: thin;
      }

      .drawer-content::-webkit-scrollbar {
        width: 6px;
      }

      .drawer-content::-webkit-scrollbar-track {
        background: transparent;
      }

      .drawer-content::-webkit-scrollbar-thumb {
        background: var(--theme-border, rgba(255, 255, 255, 0.2));
        border-radius: 3px;
      }

      /* Search Box */
      .search-box {
        position: relative;
        margin-bottom: 16px;
      }

      .search-input {
        width: 100%;
        padding: 10px 12px 10px 36px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid var(--v4-border-subtle, rgba(255, 255, 255, 0.1));
        border-radius: 8px;
        color: var(--theme-text, #e0e0e0);
        font-size: 14px;
        outline: none;
        transition: border-color 0.2s, background 0.2s;
      }

      .search-input::placeholder {
        color: var(--v4-text-secondary, #a0a0a0);
      }

      .search-input:focus {
        border-color: var(--theme-primary, #d4af37);
        background: rgba(255, 255, 255, 0.08);
      }

      .search-icon {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        width: 16px;
        height: 16px;
        color: var(--v4-text-secondary, #a0a0a0);
        pointer-events: none;
      }

      /* Filter Chips */
      .filter-bar {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 16px;
      }

      .filter-chip {
        padding: 6px 12px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid var(--v4-border-subtle, rgba(255, 255, 255, 0.1));
        border-radius: 16px;
        color: var(--v4-text-secondary, #a0a0a0);
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .filter-chip:hover {
        background: rgba(255, 255, 255, 0.1);
        color: var(--theme-text, #e0e0e0);
      }

      .filter-chip.active {
        background: var(--theme-primary, #d4af37);
        border-color: var(--theme-primary, #d4af37);
        color: var(--theme-text-on-primary, #000);
      }

      /* Favorites Section */
      .favorites-section {
        margin-bottom: 16px;
        border: 1px solid var(--v4-border-subtle, rgba(255, 255, 255, 0.1));
        border-radius: 8px;
        overflow: hidden;
      }

      .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 12px;
        background: rgba(255, 255, 255, 0.03);
        cursor: pointer;
        user-select: none;
      }

      .section-header:hover {
        background: rgba(255, 255, 255, 0.06);
      }

      .section-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--v4-text-secondary, #a0a0a0);
      }

      .favorites-icon {
        width: 14px;
        height: 14px;
        color: var(--theme-primary, #d4af37);
      }

      .chevron {
        width: 16px;
        height: 16px;
        color: var(--v4-text-secondary, #a0a0a0);
        transition: transform 0.2s;
      }

      .chevron.collapsed {
        transform: rotate(-90deg);
      }

      .favorites-content {
        padding: 12px;
        display: none;
      }

      .favorites-content.expanded {
        display: block;
      }

      .favorites-empty {
        font-size: 12px;
        color: var(--v4-text-secondary, #a0a0a0);
        text-align: center;
        padding: 8px;
        font-style: italic;
      }

      /* Swatch Grid */
      .swatch-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 6px;
      }

      .swatch {
        aspect-ratio: 1;
        border-radius: 6px;
        cursor: pointer;
        border: 2px solid transparent;
        transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
        position: relative;
      }

      .swatch:hover {
        transform: scale(1.1);
        z-index: 10;
        border-color: rgba(255, 255, 255, 0.5);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      }

      .swatch:active {
        transform: scale(1.05);
      }

      .swatch[title]::after {
        content: attr(title);
        position: absolute;
        bottom: calc(100% + 6px);
        left: 50%;
        transform: translateX(-50%);
        padding: 4px 8px;
        background: rgba(0, 0, 0, 0.9);
        border-radius: 4px;
        font-size: 11px;
        color: #fff;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.15s;
        z-index: 100;
      }

      .swatch:hover[title]::after {
        opacity: 1;
      }

      /* Category Sections */
      .category-section {
        margin-bottom: 16px;
      }

      .category-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--v4-text-secondary, #a0a0a0);
        margin-bottom: 8px;
        padding-bottom: 4px;
        border-bottom: 1px solid var(--v4-border-subtle, rgba(255, 255, 255, 0.05));
      }

      /* No Results */
      .no-results {
        text-align: center;
        padding: 24px 16px;
        color: var(--v4-text-secondary, #a0a0a0);
        font-size: 13px;
      }

      .no-results-icon {
        width: 32px;
        height: 32px;
        margin: 0 auto 12px;
        opacity: 0.5;
      }
    `,
  ];

  // =========================================================================
  // Lifecycle
  // =========================================================================

  connectedCallback(): void {
    super.connectedCallback();
    this.loadDyes();
    this.subscribeToFavorites();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.unsubscribeFavorites) {
      this.unsubscribeFavorites();
      this.unsubscribeFavorites = null;
    }
  }

  // =========================================================================
  // Data Loading
  // =========================================================================

  private loadDyes(): void {
    try {
      const dyeService = DyeService.getInstance();
      this.allDyes = dyeService.getAllDyes().filter((d) => d.category !== 'Facewear');
      this.applyFilters();
      logger.debug(`[DyePaletteDrawer] Loaded ${this.allDyes.length} dyes`);
    } catch (error) {
      logger.error('[DyePaletteDrawer] Failed to load dyes:', error);
    }
  }

  private subscribeToFavorites(): void {
    // Load initial favorites
    const favoriteIds = CollectionService.getFavorites();
    this.updateFavoriteDyes(favoriteIds);

    // Subscribe to changes
    this.unsubscribeFavorites = CollectionService.subscribeFavorites((ids) => {
      this.updateFavoriteDyes(ids);
    });
  }

  private updateFavoriteDyes(favoriteIds: number[]): void {
    const dyeService = DyeService.getInstance();
    this.favoriteDyes = favoriteIds
      .map((id) => dyeService.getDyeById(id))
      .filter((dye): dye is Dye => dye !== null);
  }

  // =========================================================================
  // Filtering
  // =========================================================================

  private applyFilters(): void {
    let dyes = [...this.allDyes];

    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      dyes = dyes.filter((d) => d.name.toLowerCase().includes(query));
    }

    // Apply category filter
    if (this.activeFilter !== 'all') {
      dyes = this.filterByType(dyes, this.activeFilter);
    }

    this.filteredDyes = dyes;
  }

  private filterByType(dyes: Dye[], filter: DyeFilter): Dye[] {
    switch (filter) {
      case 'metallic':
        return dyes.filter((d) => d.name.toLowerCase().includes('metallic'));
      case 'pastel':
        return dyes.filter((d) => d.name.toLowerCase().includes('pastel'));
      case 'dark':
        return dyes.filter((d) => d.hsv.v < 40);
      case 'vibrant':
        return dyes.filter((d) => d.hsv.s > 60 && d.hsv.v > 50);
      default:
        return dyes;
    }
  }

  private groupByCategory(dyes: Dye[]): Map<string, Dye[]> {
    const groups = new Map<string, Dye[]>();

    for (const category of DYE_CATEGORY_ORDER) {
      const categoryDyes = dyes.filter((d) => d.category === category);
      if (categoryDyes.length > 0) {
        groups.set(category, categoryDyes);
      }
    }

    // Add any remaining categories not in our order
    for (const dye of dyes) {
      if (!DYE_CATEGORY_ORDER.includes(dye.category as (typeof DYE_CATEGORY_ORDER)[number])) {
        const existing = groups.get(dye.category) || [];
        existing.push(dye);
        groups.set(dye.category, existing);
      }
    }

    return groups;
  }

  // =========================================================================
  // Event Handlers
  // =========================================================================

  private handleSearchInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.searchQuery = input.value;
    this.applyFilters();
  }

  private handleFilterClick(filter: DyeFilter): void {
    this.activeFilter = filter;
    this.applyFilters();
  }

  private handleToggleFavorites(): void {
    this.favoritesExpanded = !this.favoritesExpanded;
  }

  private handleDyeClick(dye: Dye): void {
    this.emit('dye-selected', { dye });
    logger.debug(`[DyePaletteDrawer] Dye selected: ${dye.name}`);
  }

  private handleClose(): void {
    this.emit('drawer-toggle');
  }

  // =========================================================================
  // Render
  // =========================================================================

  protected override render(): TemplateResult {
    const groupedDyes = this.groupByCategory(this.filteredDyes);

    return html`
      <aside class="drawer">
        <div class="drawer-header">
          <span class="drawer-title">Color Palette</span>
          <button class="close-btn" @click=${this.handleClose} title="Close palette">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="drawer-content">
          ${this.renderSearch()} ${this.renderFilters()} ${this.renderFavorites()}
          ${this.renderDyeGrid(groupedDyes)}
        </div>
      </aside>
    `;
  }

  private renderSearch(): TemplateResult {
    return html`
      <div class="search-box">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          class="search-input"
          placeholder="Search dyes..."
          .value=${this.searchQuery}
          @input=${this.handleSearchInput}
        />
      </div>
    `;
  }

  private renderFilters(): TemplateResult {
    const filters: { id: DyeFilter; label: string }[] = [
      { id: 'all', label: 'All' },
      { id: 'metallic', label: 'Metallic' },
      { id: 'pastel', label: 'Pastel' },
      { id: 'dark', label: 'Dark' },
      { id: 'vibrant', label: 'Vibrant' },
    ];

    return html`
      <div class="filter-bar">
        ${filters.map(
          (f) => html`
            <button
              class="filter-chip ${this.activeFilter === f.id ? 'active' : ''}"
              @click=${() => this.handleFilterClick(f.id)}
            >
              ${f.label}
            </button>
          `
        )}
      </div>
    `;
  }

  private renderFavorites(): TemplateResult {
    return html`
      <div class="favorites-section">
        <div class="section-header" @click=${this.handleToggleFavorites}>
          <span class="section-title">
            <svg class="favorites-icon" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              />
            </svg>
            Favorites (${this.favoriteDyes.length})
          </span>
          <svg class="chevron ${this.favoritesExpanded ? '' : 'collapsed'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        <div class="favorites-content ${this.favoritesExpanded ? 'expanded' : ''}">
          ${this.favoriteDyes.length > 0
            ? html`
                <div class="swatch-grid">
                  ${this.favoriteDyes.map(
                    (dye) => html`
                      <div
                        class="swatch"
                        style="background-color: ${dye.hex}"
                        title="${dye.name}"
                        @click=${() => this.handleDyeClick(dye)}
                      ></div>
                    `
                  )}
                </div>
              `
            : html`
                <div class="favorites-empty">
                  Click the ★ on any dye to add favorites
                </div>
              `}
        </div>
      </div>
    `;
  }

  private renderDyeGrid(groupedDyes: Map<string, Dye[]>): TemplateResult {
    if (groupedDyes.size === 0) {
      return html`
        <div class="no-results">
          <svg class="no-results-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
            <path d="M8 8l6 6M14 8l-6 6" />
          </svg>
          <p>No dyes found</p>
        </div>
      `;
    }

    return html`
      ${Array.from(groupedDyes.entries()).map(
        ([category, dyes]) => html`
          <div class="category-section">
            <div class="category-label">${category}</div>
            <div class="swatch-grid">
              ${dyes.map(
                (dye) => html`
                  <div
                    class="swatch"
                    style="background-color: ${dye.hex}"
                    title="${dye.name}"
                    @click=${() => this.handleDyeClick(dye)}
                  ></div>
                `
              )}
            </div>
          </div>
        `
      )}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dye-palette-drawer': DyePaletteDrawer;
  }
}
