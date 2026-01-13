/**
 * XIV Dye Tools v4.0 - Preset Tool Component
 *
 * Main orchestrator for the Community Presets feature.
 * Displays a grid of preset cards and handles detail view navigation.
 *
 * Features:
 * - Subscribes to ConfigController for reactive config changes
 * - Loads presets via HybridPresetService
 * - Renders v4-preset-card grid
 * - Shows v4-preset-detail on selection
 * - Handles deep linking for shareable URLs
 *
 * @module components/v4/preset-tool
 */

import { html, css, CSSResultGroup, TemplateResult, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { BaseLitComponent } from './base-lit-component';
import { ConfigController } from '@services/config-controller';
import { hybridPresetService } from '@services/hybrid-preset-service';
import { dyeService, LanguageService } from '@services/index';
import { RouterService } from '@services/router-service';
import { logger } from '@shared/logger';
import type { UnifiedPreset } from '@services/hybrid-preset-service';
import type { PresetsConfig, PresetCategoryFilter, PresetSortOption } from '@shared/tool-config-types';
import { DEFAULT_DISPLAY_OPTIONS } from '@shared/tool-config-types';
import type { PresetCategory } from '@xivdyetools/core';

// Import child components
import './preset-card';
import './preset-detail';
import type { PresetCardData } from './preset-card';

/**
 * V4 Preset Tool - Community Presets browser
 *
 * @example
 * ```html
 * <v4-preset-tool></v4-preset-tool>
 * ```
 */
@customElement('v4-preset-tool')
export class PresetTool extends BaseLitComponent {
  /**
   * All loaded presets
   */
  @state()
  private presets: UnifiedPreset[] = [];

  /**
   * Currently selected preset for detail view
   */
  @state()
  private selectedPreset: UnifiedPreset | null = null;

  /**
   * Loading state
   */
  @state()
  private isLoading: boolean = true;

  /**
   * Error message if loading fails (empty string = no error)
   */
  @state()
  private _presetError: string = '';

  /**
   * Current config from ConfigController
   */
  @state()
  private config: PresetsConfig = {
    showMyPresetsOnly: false,
    showFavorites: false,
    sortBy: 'popular',
    category: 'all',
    displayOptions: { ...DEFAULT_DISPLAY_OPTIONS },
  };

  /**
   * Search query for filtering presets
   */
  @state()
  private searchQuery: string = '';

  private configController: ConfigController | null = null;
  private configUnsubscribe: (() => void) | null = null;

  static override styles: CSSResultGroup = [
    BaseLitComponent.baseStyles,
    css`
      :host {
        display: block;
        width: 100%;
        height: 100%;
        overflow-y: auto;
      }

      .preset-tool {
        padding: 24px;
        min-height: 100%;
      }

      /* Header */
      .tool-header {
        margin-bottom: 24px;
      }

      .tool-title {
        font-size: 24px;
        font-weight: 700;
        color: var(--theme-text, #e0e0e0);
        margin: 0 0 8px 0;
      }

      .tool-description {
        color: var(--theme-text-muted, #888888);
        font-size: 14px;
        margin: 0;
      }

      /* Search bar */
      .search-bar {
        margin-bottom: 24px;
      }

      .search-input {
        width: 100%;
        max-width: 400px;
        padding: 12px 16px;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid var(--v4-glass-border, rgba(255, 255, 255, 0.1));
        border-radius: 8px;
        color: var(--theme-text, #e0e0e0);
        font-size: 14px;
        transition: border-color var(--v4-transition-fast, 150ms);
      }

      .search-input::placeholder {
        color: var(--theme-text-muted, #888888);
      }

      .search-input:focus {
        outline: none;
        border-color: var(--theme-primary, #d4af37);
      }

      /* Results info */
      .results-info {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 16px;
        font-size: 14px;
        color: var(--theme-text-muted, #888888);
      }

      .results-count {
        font-weight: 600;
      }

      .category-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 12px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        font-size: 12px;
      }

      /* Preset grid */
      .preset-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 20px;
      }

      /* Loading state */
      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 300px;
        gap: 16px;
      }

      .spinner {
        width: 40px;
        height: 40px;
        border: 3px solid var(--theme-border, rgba(255, 255, 255, 0.1));
        border-top-color: var(--theme-primary, #d4af37);
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .loading-text {
        color: var(--theme-text-muted, #888888);
        font-size: 14px;
      }

      /* Error state */
      .error-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 300px;
        gap: 16px;
        text-align: center;
      }

      .error-icon {
        font-size: 48px;
      }

      .error-message {
        color: var(--theme-error, #ef4444);
        font-size: 14px;
        max-width: 400px;
      }

      .retry-btn {
        padding: 10px 20px;
        background: var(--theme-primary, #d4af37);
        color: var(--theme-background, #1a1a1a);
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        transition: opacity var(--v4-transition-fast, 150ms);
      }

      .retry-btn:hover {
        opacity: 0.9;
      }

      /* Empty state */
      .empty-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 300px;
        gap: 16px;
        text-align: center;
      }

      .empty-icon {
        font-size: 48px;
        opacity: 0.5;
      }

      .empty-message {
        color: var(--theme-text-muted, #888888);
        font-size: 14px;
      }

      /* Reduced motion */
      @media (prefers-reduced-motion: reduce) {
        .spinner {
          animation: none;
        }
        .search-input {
          transition: none;
        }
      }

      /* Responsive */
      @media (max-width: 768px) {
        .preset-tool {
          padding: 16px;
        }

        .tool-title {
          font-size: 20px;
        }

        .preset-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ];

  override async connectedCallback(): Promise<void> {
    super.connectedCallback();

    // Subscribe to config changes
    this.configController = ConfigController.getInstance();
    this.config = this.configController.getConfig('presets');
    this.configUnsubscribe = this.configController.subscribe('presets', (newConfig) => {
      this.config = newConfig;
      void this.loadPresets();
    });

    // Initialize service and load presets
    await hybridPresetService.initialize();
    await this.loadPresets();

    // Handle deep links (e.g., /presets/community-xxx)
    await this.handleDeepLink();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.configUnsubscribe) {
      this.configUnsubscribe();
      this.configUnsubscribe = null;
    }
  }

  /**
   * Handle deep link navigation
   * If URL has a preset ID (e.g., /presets/community-xxx), load that preset
   */
  private async handleDeepLink(): Promise<void> {
    const presetId = RouterService.getSubPath();
    if (!presetId) return;

    logger.info('[v4-preset-tool] Deep link detected:', presetId);

    try {
      const preset = await hybridPresetService.getPreset(presetId);
      if (preset) {
        this.selectedPreset = preset;
      } else {
        logger.warn('[v4-preset-tool] Preset not found for deep link:', presetId);
      }
    } catch (error) {
      logger.error('[v4-preset-tool] Failed to load deep-linked preset:', error);
    }
  }

  /**
   * Load presets based on current config
   */
  private async loadPresets(): Promise<void> {
    this.isLoading = true;
    this._presetError = '';

    try {
      // Map config category to API category
      const category: PresetCategory | undefined =
        this.config.category === 'all' ? undefined : (this.config.category as PresetCategory);

      // Map config sort to API sort
      const sort: 'popular' | 'recent' | 'name' = this.config.sortBy as PresetSortOption;

      const presets = await hybridPresetService.getPresets({
        category,
        search: this.searchQuery || undefined,
        sort,
        limit: 50,
      });

      this.presets = presets;
      logger.info('[v4-preset-tool] Loaded', presets.length, 'presets');
    } catch (error) {
      logger.error('[v4-preset-tool] Failed to load presets:', error);
      this._presetError = 'Failed to load presets. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Convert a preset to card data with resolved colors
   */
  private presetToCardData(preset: UnifiedPreset): PresetCardData {
    const colors: string[] = [];
    for (const dyeId of preset.dyes.slice(0, 6)) {
      const dye = dyeService.getDyeById(dyeId);
      if (dye) {
        colors.push(dye.hex);
      }
    }
    return { preset, colors };
  }

  /**
   * Handle preset card selection
   */
  private handlePresetSelect(e: CustomEvent<{ preset: UnifiedPreset }>): void {
    this.selectedPreset = e.detail.preset;
    // Update URL for deep linking using history API directly
    const newUrl = `/presets/${this.selectedPreset.id}`;
    window.history.pushState({ preset: this.selectedPreset.id }, '', newUrl);
  }

  /**
   * Handle back from detail view
   */
  private handleBack(): void {
    this.selectedPreset = null;
    // Reset URL to just /presets
    window.history.pushState({}, '', '/presets');
  }

  /**
   * Handle vote update from detail view
   */
  private handleVoteUpdate(e: CustomEvent<{ preset: UnifiedPreset }>): void {
    const updatedPreset = e.detail.preset;
    // Update the preset in the list
    this.presets = this.presets.map((p) =>
      p.id === updatedPreset.id ? updatedPreset : p
    );
    // Update selected preset if it's the one being viewed
    if (this.selectedPreset?.id === updatedPreset.id) {
      this.selectedPreset = updatedPreset;
    }
  }

  /**
   * Handle search input
   */
  private handleSearchInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.searchQuery = input.value;
    // Debounce search
    clearTimeout(this._searchDebounce);
    this._searchDebounce = window.setTimeout(() => {
      void this.loadPresets();
    }, 300);
  }

  private _searchDebounce: number = 0;

  /**
   * Handle retry button click
   */
  private handleRetry(): void {
    void this.loadPresets();
  }

  /**
   * Get display name for current category
   */
  private getCategoryDisplayName(): string {
    const categoryNames: Record<PresetCategoryFilter, string> = {
      all: 'All Categories',
      jobs: 'Jobs',
      'grand-companies': 'Grand Companies',
      seasons: 'Seasons',
      events: 'Events',
      aesthetics: 'Aesthetics',
      community: 'Community',
    };
    return categoryNames[this.config.category] || 'All';
  }

  /**
   * Render loading state
   */
  private renderLoading(): TemplateResult {
    return html`
      <div class="loading-container">
        <div class="spinner"></div>
        <span class="loading-text">Loading presets...</span>
      </div>
    `;
  }

  /**
   * Render error state
   */
  private renderError(): TemplateResult {
    return html`
      <div class="error-container">
        <span class="error-icon">⚠️</span>
        <p class="error-message">${this._presetError}</p>
        <button class="retry-btn" @click=${this.handleRetry}>Try Again</button>
      </div>
    `;
  }

  /**
   * Render empty state
   */
  private renderEmpty(): TemplateResult {
    return html`
      <div class="empty-container">
        <span class="empty-icon">📭</span>
        <p class="empty-message">
          ${this.searchQuery
            ? `No presets found matching "${this.searchQuery}"`
            : 'No presets found in this category'}
        </p>
      </div>
    `;
  }

  /**
   * Render preset grid
   */
  private renderGrid(): TemplateResult {
    if (this.isLoading) {
      return this.renderLoading();
    }

    if (this._presetError) {
      return this.renderError();
    }

    if (this.presets.length === 0) {
      return this.renderEmpty();
    }

    return html`
      <div class="results-info">
        <span class="results-count">${this.presets.length} preset${this.presets.length !== 1 ? 's' : ''}</span>
        ${this.config.category !== 'all'
          ? html`<span class="category-badge">${this.getCategoryDisplayName()}</span>`
          : nothing}
      </div>

      <div class="preset-grid">
        ${this.presets.map((preset) => {
          const cardData = this.presetToCardData(preset);
          return html`
            <v4-preset-card
              .data=${cardData}
              @preset-select=${this.handlePresetSelect}
            ></v4-preset-card>
          `;
        })}
      </div>
    `;
  }

  protected override render(): TemplateResult {
    // If a preset is selected, show detail view
    if (this.selectedPreset) {
      return html`
        <v4-preset-detail
          .preset=${this.selectedPreset}
          @back=${this.handleBack}
          @vote-update=${this.handleVoteUpdate}
        ></v4-preset-detail>
      `;
    }

    // Show grid view
    return html`
      <div class="preset-tool">
        <header class="tool-header">
          <h1 class="tool-title">${LanguageService.t('tools.presets.communityTitle')}</h1>
          <p class="tool-description">
            ${LanguageService.t('tools.presets.communityDescription')}
          </p>
        </header>

        <div class="search-bar">
          <input
            type="text"
            class="search-input"
            placeholder="${LanguageService.t('tools.presets.searchPlaceholder')}"
            .value=${this.searchQuery}
            @input=${this.handleSearchInput}
          />
        </div>

        ${this.renderGrid()}
      </div>
    `;
  }
}

// TypeScript declaration for custom element
declare global {
  interface HTMLElementTagNameMap {
    'v4-preset-tool': PresetTool;
  }
}
