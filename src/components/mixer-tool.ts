/**
 * XIV Dye Tools v4.0.0 - Mixer Tool Component (Dye Mixer)
 *
 * V4 NEW: Dye Mixer - Blend two dyes together to find matching FFXIV dyes.
 * This is a completely different tool from the old Mixer (now Gradient Builder).
 *
 * Features:
 * - Crafting-style interface with two input slots
 * - RGB averaging to create blended color
 * - Find closest matching FFXIV dyes to the blend
 * - Configurable number of results (3-8)
 *
 * Left Panel: Dye selection, mix settings, filters, market board
 * Right Panel: Crafting UI with slots, matched dye results grid
 *
 * @module components/tools/mixer-tool
 */

import { BaseComponent } from '@components/base-component';
import { CollapsiblePanel } from '@components/collapsible-panel';
import { DyeSelector } from '@components/dye-selector';
import { DyeFilters } from '@components/dye-filters';
import { MarketBoard } from '@components/market-board';
import { createDyeActionDropdown } from '@components/dye-action-dropdown';
import {
  ColorService,
  dyeService,
  LanguageService,
  StorageService,
  ToastService,
  MarketBoardService,
} from '@services/index';
import { ConfigController } from '@services/config-controller';
import { setupMarketBoardListeners } from '@services/pricing-mixin';
import { ICON_TOOL_DYE_MIXER } from '@shared/tool-icons';
import {
  ICON_FILTER,
  ICON_MARKET,
  ICON_PALETTE,
  ICON_BEAKER,
  ICON_SLIDERS,
} from '@shared/ui-icons';
import { logger } from '@shared/logger';
import { clearContainer } from '@shared/utils';
import type { Dye, PriceData } from '@shared/types';
import type { MixerConfig, DisplayOptionsConfig } from '@shared/tool-config-types';
import { DEFAULT_DISPLAY_OPTIONS } from '@shared/tool-config-types';
import '@components/v4/result-card';
import type { ResultCardData, ContextAction } from '@components/v4/result-card';

// ============================================================================
// Types and Constants
// ============================================================================

export interface MixerToolOptions {
  leftPanel: HTMLElement;
  rightPanel: HTMLElement;
  drawerContent?: HTMLElement | null;
}

/**
 * Mixed color result with matched dye
 */
interface MixedColorResult {
  blendedHex: string;
  matchedDye: Dye;
  distance: number;
}

/**
 * Storage keys for Dye Mixer tool
 */
const STORAGE_KEYS = {
  selectedDyes: 'v4_mixer_selected_dyes',
} as const;

/**
 * Slot dimensions in pixels
 */
const SLOT_SIZE = {
  input: 100, // 100x100px for input slots
  result: 120, // 120x120px for result slot
} as const;

// ============================================================================
// Component
// ============================================================================

/**
 * Dye Mixer Tool - v4 New Tool
 *
 * Blend two dyes together to find matching FFXIV dyes.
 */
export class MixerTool extends BaseComponent {
  private options: MixerToolOptions;

  // State
  private selectedDyes: [Dye | null, Dye | null] = [null, null];
  private blendedColor: string | null = null;
  private matchedResults: MixedColorResult[] = [];
  private maxResults: number = 5;

  // Market Board Service (shared price cache with race condition protection)
  private marketBoardService: MarketBoardService;

  // Getters for service state
  private get showPrices(): boolean {
    return this.marketBoardService.getShowPrices();
  }
  private get priceData(): Map<number, PriceData> {
    return this.marketBoardService.getAllPrices();
  }

  // Child components (desktop)
  private dyeSelector: DyeSelector | null = null;
  private dyeFilters: DyeFilters | null = null;
  private marketBoard: MarketBoard | null = null;
  private dyeSelectionPanel: CollapsiblePanel | null = null;
  private settingsPanel: CollapsiblePanel | null = null;
  private filtersPanel: CollapsiblePanel | null = null;
  private marketPanel: CollapsiblePanel | null = null;

  // Child components (mobile drawer - separate instances for independent panel states)
  private mobileDyeSelectionPanel: CollapsiblePanel | null = null;
  private mobileSettingsPanel: CollapsiblePanel | null = null;
  private mobileFiltersPanel: CollapsiblePanel | null = null;
  private mobileMarketPanel: CollapsiblePanel | null = null;
  private mobileDyeSelector: DyeSelector | null = null;
  private mobileDyeFilters: DyeFilters | null = null;
  private mobileMarketBoard: MarketBoard | null = null;
  private mobileMaxResultsDisplay: HTMLElement | null = null;

  // DOM References
  private selectedDyesContainer: HTMLElement | null = null;
  private mobileSelectedDyesContainer: HTMLElement | null = null;
  private maxResultsValueDisplay: HTMLElement | null = null;
  private emptyStateContainer: HTMLElement | null = null;
  private craftingContainer: HTMLElement | null = null;
  private resultsSection: HTMLElement | null = null;
  private resultsGridContainer: HTMLElement | null = null;
  private slot1Element: HTMLElement | null = null;
  private slot2Element: HTMLElement | null = null;
  private resultSlotElement: HTMLElement | null = null;
  private emptyStateMessage: HTMLElement | null = null;
  private emptyStateIcon: HTMLElement | null = null;

  // Subscriptions
  private languageUnsubscribe: (() => void) | null = null;
  private configUnsubscribe: (() => void) | null = null;

  // Display options (from ConfigController)
  private displayOptions: DisplayOptionsConfig = { ...DEFAULT_DISPLAY_OPTIONS };

  constructor(container: HTMLElement, options: MixerToolOptions) {
    super(container);
    this.options = options;

    // Initialize MarketBoardService (shared price cache)
    this.marketBoardService = MarketBoardService.getInstance();

    // Load config from ConfigController (v4 unified config)
    const config = ConfigController.getInstance().getConfig('mixer');
    this.maxResults = config.maxResults;
    this.displayOptions = config.displayOptions ?? { ...DEFAULT_DISPLAY_OPTIONS };

    // Load persisted dye selections
    this.loadSelectedDyes();

    logger.info('[MixerTool] Initializing Dye Mixer');
  }

  /**
   * Load selected dyes from storage
   */
  private loadSelectedDyes(): void {
    const savedDyeIds = StorageService.getItem<[number | null, number | null]>(
      STORAGE_KEYS.selectedDyes
    );

    if (savedDyeIds) {
      this.selectedDyes = [
        savedDyeIds[0] ? (dyeService.getDyeById(savedDyeIds[0]) ?? null) : null,
        savedDyeIds[1] ? (dyeService.getDyeById(savedDyeIds[1]) ?? null) : null,
      ];

      // Recalculate blend if both dyes present
      if (this.selectedDyes[0] && this.selectedDyes[1]) {
        this.blendedColor = this.blendColors(this.selectedDyes[0].hex, this.selectedDyes[1].hex);
      }
    }
  }

  /**
   * Save selected dyes to storage
   */
  private saveSelectedDyes(): void {
    const ids: [number | null, number | null] = [
      this.selectedDyes[0]?.id ?? null,
      this.selectedDyes[1]?.id ?? null,
    ];
    StorageService.setItem(STORAGE_KEYS.selectedDyes, ids);
  }

  // ============================================================================
  // Color Blending Logic
  // ============================================================================

  /**
   * Blend two hex colors using RGB averaging
   */
  private blendColors(hex1: string, hex2: string): string {
    const rgb1 = ColorService.hexToRgb(hex1);
    const rgb2 = ColorService.hexToRgb(hex2);

    // Simple RGB average
    const r = Math.round((rgb1.r + rgb2.r) / 2);
    const g = Math.round((rgb1.g + rgb2.g) / 2);
    const b = Math.round((rgb1.b + rgb2.b) / 2);

    return ColorService.rgbToHex(r, g, b);
  }

  /**
   * Find the closest matching dyes to the blended color
   */
  private findMatchingDyes(): void {
    if (!this.blendedColor) {
      this.matchedResults = [];
      return;
    }

    // Get exclude IDs (the two input dyes)
    const excludeIds = this.selectedDyes
      .filter((dye): dye is Dye => dye !== null)
      .map((dye) => dye.id);

    // Get all dyes and calculate distances
    const allDyes = dyeService.getAllDyes();
    const results: MixedColorResult[] = [];

    for (const dye of allDyes) {
      // Skip input dyes and Facewear
      if (excludeIds.includes(dye.id) || dye.category === 'Facewear') {
        continue;
      }

      // Apply filters if available
      if (this.dyeFilters?.isDyeExcluded(dye)) {
        continue;
      }

      const distance = ColorService.getColorDistance(this.blendedColor, dye.hex);
      results.push({
        blendedHex: this.blendedColor,
        matchedDye: dye,
        distance,
      });
    }

    // Sort by distance and take top maxResults
    results.sort((a, b) => a.distance - b.distance);
    this.matchedResults = results.slice(0, this.maxResults);
  }

  // ============================================================================
  // Lifecycle Methods
  // ============================================================================

  renderContent(): void {
    this.renderLeftPanel();
    this.renderRightPanel();

    if (this.options.drawerContent) {
      this.renderDrawerContent();
    }

    this.element = this.container;
  }

  bindEvents(): void {
    // Event bindings handled in child components
  }

  onMount(): void {
    // Subscribe to language changes
    this.languageUnsubscribe = LanguageService.subscribe(() => {
      this.update();
    });

    // Subscribe to config changes from v4 sidebar
    this.configUnsubscribe = ConfigController.getInstance().subscribe('mixer', (config) => {
      this.setConfig(config);
    });

    // If dyes were loaded from storage, calculate blend and matches
    if (this.selectedDyes[0] && this.selectedDyes[1]) {
      this.blendedColor = this.blendColors(this.selectedDyes[0].hex, this.selectedDyes[1].hex);
      this.findMatchingDyes();
      this.showEmptyState(false);
      this.updateCraftingUI();
      this.renderResultsGrid();
    }

    logger.info('[MixerTool] Mounted');
  }

  destroy(): void {
    this.languageUnsubscribe?.();
    this.configUnsubscribe?.();

    // Destroy desktop components
    this.dyeSelector?.destroy();
    this.dyeFilters?.destroy();
    this.marketBoard?.destroy();
    this.dyeSelectionPanel?.destroy();
    this.settingsPanel?.destroy();
    this.filtersPanel?.destroy();
    this.marketPanel?.destroy();

    // Destroy mobile drawer components
    this.mobileDyeSelector?.destroy();
    this.mobileDyeFilters?.destroy();
    this.mobileMarketBoard?.destroy();
    this.mobileDyeSelectionPanel?.destroy();
    this.mobileSettingsPanel?.destroy();
    this.mobileFiltersPanel?.destroy();
    this.mobileMarketPanel?.destroy();

    this.selectedDyes = [null, null];
    this.matchedResults = [];

    super.destroy();
    logger.info('[MixerTool] Destroyed');
  }

  // ============================================================================
  // V4 Integration
  // ============================================================================

  /**
   * Clear all dye selections and return to empty state.
   * Called when "Clear All Dyes" button is clicked in Color Palette.
   */
  public clearDyes(): void {
    this.selectedDyes = [null, null];
    this.blendedColor = null;
    this.matchedResults = [];

    // Clear from storage
    StorageService.removeItem(STORAGE_KEYS.selectedDyes);
    logger.info('[MixerTool] All dyes cleared');

    // Update dye selectors
    this.dyeSelector?.setSelectedDyes([]);
    this.mobileDyeSelector?.setSelectedDyes([]);

    // Clear results grid
    if (this.resultsGridContainer) {
      clearContainer(this.resultsGridContainer);
    }

    // Update UI to show empty slots with plus signs
    this.showEmptyState(true);
    this.updateCraftingUI();
    this.updateDrawerContent();
  }

  /**
   * Select a dye from the Color Palette drawer
   * Adds to first empty slot, or shifts dyes if both slots are full
   */
  public selectDye(dye: Dye): void {
    if (!dye) return;

    // Don't add duplicates
    if (this.selectedDyes.some((d) => d?.id === dye.id)) {
      return;
    }

    // Add to first empty slot, or shift if both full
    if (!this.selectedDyes[0]) {
      this.selectedDyes[0] = dye;
    } else if (!this.selectedDyes[1]) {
      this.selectedDyes[1] = dye;
    } else {
      // Both slots full - shift dye 2 to dye 1, add new as dye 2
      this.selectedDyes[0] = this.selectedDyes[1];
      this.selectedDyes[1] = dye;
    }

    // Update selectors
    const selectedDyes = this.selectedDyes.filter((d): d is Dye => d !== null);
    this.dyeSelector?.setSelectedDyes(selectedDyes);
    this.mobileDyeSelector?.setSelectedDyes(selectedDyes);

    // Save and update
    this.saveSelectedDyes();
    this.updateSelectedDyesDisplay();

    // Calculate blend if both dyes selected
    if (this.selectedDyes[0] && this.selectedDyes[1]) {
      this.blendedColor = this.blendColors(this.selectedDyes[0].hex, this.selectedDyes[1].hex);
      this.findMatchingDyes();
      this.showEmptyState(false);
      this.updateCraftingUI();
      this.renderResultsGrid();
      if (this.showPrices) {
        void this.fetchPricesForDisplayedDyes();
      }
    } else {
      this.updateCraftingUI();
    }

    this.updateDrawerContent();
    logger.info(`[MixerTool] Selected dye from palette: ${dye.name}`);
  }

  /**
   * Update tool configuration from external source (V4 ConfigSidebar)
   * Handles both tool-specific config (maxResults, displayOptions) and
   * shared market config (showPrices, selectedServer)
   * Note: Market state is managed by MarketBoardService
   */
  public setConfig(
    config: Partial<MixerConfig> & { _tool?: string; showPrices?: boolean; selectedServer?: string }
  ): void {
    let needsUpdate = false;
    let needsRerender = false;
    let needsPriceFetch = false;

    // Handle market config changes (_tool === 'market')
    // Note: MarketBoardService handles state persistence and cache clearing
    if (config._tool === 'market') {
      if (config.showPrices !== undefined) {
        logger.info(`[MixerTool] setConfig: showPrices -> ${config.showPrices}`);
        if (config.showPrices) {
          needsPriceFetch = true;
        } else {
          needsRerender = true;
        }
      }

      if (config.selectedServer !== undefined) {
        logger.info(`[MixerTool] setConfig: selectedServer -> ${config.selectedServer}`);
        // Service clears cache on server change
        needsRerender = true;
        if (this.showPrices && this.matchedResults.length > 0) {
          needsPriceFetch = true;
        }
      }
    }

    // Handle tool-specific config
    if (config.maxResults !== undefined && config.maxResults !== this.maxResults) {
      this.maxResults = config.maxResults;
      needsUpdate = true;
      logger.info(`[MixerTool] setConfig: maxResults -> ${config.maxResults}`);

      // Update slider displays
      if (this.maxResultsValueDisplay) {
        this.maxResultsValueDisplay.textContent = String(this.maxResults);
      }
      if (this.mobileMaxResultsDisplay) {
        this.mobileMaxResultsDisplay.textContent = String(this.maxResults);
      }
    }

    // Handle display options changes
    if (config.displayOptions) {
      const newOpts = config.displayOptions;
      const oldOpts = this.displayOptions;
      if (
        newOpts.showHex !== oldOpts.showHex ||
        newOpts.showRgb !== oldOpts.showRgb ||
        newOpts.showHsv !== oldOpts.showHsv ||
        newOpts.showLab !== oldOpts.showLab ||
        newOpts.showPrice !== oldOpts.showPrice ||
        newOpts.showDeltaE !== oldOpts.showDeltaE ||
        newOpts.showAcquisition !== oldOpts.showAcquisition
      ) {
        this.displayOptions = newOpts;
        needsRerender = true;
        logger.info('[MixerTool] setConfig: displayOptions updated');
      }
    }

    // Apply updates
    if (needsUpdate && this.blendedColor) {
      this.findMatchingDyes();
      this.renderResultsGrid();
      if (this.showPrices) {
        void this.fetchPricesForDisplayedDyes();
      }
    } else if (needsRerender && this.blendedColor) {
      // Only re-render cards (no need to recalculate matches)
      this.renderResultsGrid();
    }

    // Fetch prices if needed (after render so cards exist)
    if (needsPriceFetch && this.blendedColor && this.matchedResults.length > 0) {
      void this.fetchPricesForDisplayedDyes();
    }
  }

  // ============================================================================
  // Left Panel Rendering
  // ============================================================================

  private renderLeftPanel(): void {
    const left = this.options.leftPanel;
    clearContainer(left);

    // Section 1: Dye Selection
    const dyeSelectionContainer = this.createElement('div');
    left.appendChild(dyeSelectionContainer);
    this.dyeSelectionPanel = new CollapsiblePanel(dyeSelectionContainer, {
      title: LanguageService.t('mixer.dyeSelection') || 'Dye Selection',
      storageKey: 'v4_mixer_dye_selection_panel',
      defaultOpen: true,
      icon: ICON_PALETTE,
    });
    this.dyeSelectionPanel.init();
    const dyeSelectionContent = this.createElement('div', { className: 'p-4' });
    this.renderDyeSelector(dyeSelectionContent);
    this.dyeSelectionPanel.setContent(dyeSelectionContent);

    // Section 2: Mix Settings
    const settingsContainer = this.createElement('div');
    left.appendChild(settingsContainer);
    this.settingsPanel = new CollapsiblePanel(settingsContainer, {
      title: LanguageService.t('mixer.mixSettings') || 'Mix Settings',
      storageKey: 'v4_mixer_settings_panel',
      defaultOpen: true,
      icon: ICON_SLIDERS,
    });
    this.settingsPanel.init();
    const settingsContent = this.createElement('div', { className: 'p-4' });
    this.renderSettings(settingsContent);
    this.settingsPanel.setContent(settingsContent);

    // Section 3: Dye Filters (collapsible)
    const filtersContainer = this.createElement('div');
    left.appendChild(filtersContainer);
    this.filtersPanel = new CollapsiblePanel(filtersContainer, {
      title: LanguageService.t('filters.advancedFilters') || 'Advanced Dye Filters',
      storageKey: 'v4_mixer_filters',
      defaultOpen: false,
      icon: ICON_FILTER,
    });
    this.filtersPanel.init();

    const filtersContent = this.createElement('div');
    this.dyeFilters = new DyeFilters(filtersContent, {
      storageKeyPrefix: 'v4_mixer',
      hideHeader: true,
      onFilterChange: () => {
        this.findMatchingDyes();
        this.renderResultsGrid();
        if (this.showPrices) {
          void this.fetchPricesForDisplayedDyes();
        }
      },
    });
    this.dyeFilters.render();
    this.dyeFilters.bindEvents();
    this.filtersPanel.setContent(filtersContent);

    // Section 4: Market Board (collapsible)
    const marketContainer = this.createElement('div');
    left.appendChild(marketContainer);
    this.marketPanel = new CollapsiblePanel(marketContainer, {
      title: LanguageService.t('marketBoard.title') || 'Market Board',
      storageKey: 'v4_mixer_market',
      defaultOpen: false,
      icon: ICON_MARKET,
    });
    this.marketPanel.init();

    // Create market board content
    // Note: MarketBoard delegates to MarketBoardService for state management
    const marketContent = this.createElement('div');
    this.marketBoard = new MarketBoard(marketContent);
    this.marketBoard.init();

    // Set up market board event listeners using shared utility
    setupMarketBoardListeners(
      marketContent,
      () => this.showPrices,
      () => this.fetchPricesForDisplayedDyes(),
      {
        onPricesToggled: () => {
          if (this.showPrices) {
            void this.fetchPricesForDisplayedDyes();
          } else {
            this.renderResultsGrid();
          }
        },
        onServerChanged: () => {
          this.renderResultsGrid();
          if (this.showPrices && this.matchedResults.length > 0) {
            void this.fetchPricesForDisplayedDyes();
          }
        },
      }
    );

    this.marketPanel.setContent(marketContent);
  }

  /**
   * Render dye selector section
   */
  private renderDyeSelector(container: HTMLElement): void {
    const dyeContainer = this.createElement('div', { className: 'space-y-3' });

    // Instruction text
    const instruction = this.createElement('p', {
      className: 'text-sm mb-2',
      textContent: LanguageService.t('mixer.selectTwoDyes') || 'Select two dyes to blend together',
      attributes: { style: 'color: var(--theme-text-muted);' },
    });
    dyeContainer.appendChild(instruction);

    // Selected dyes display
    const displayContainer = this.createElement('div', {
      className: 'selected-dyes-display space-y-2',
    });
    dyeContainer.appendChild(displayContainer);
    this.selectedDyesContainer = displayContainer;

    this.updateSelectedDyesDisplay();

    // Dye selector component
    const selectorContainer = this.createElement('div', { className: 'mt-3' });
    dyeContainer.appendChild(selectorContainer);

    const selector = new DyeSelector(selectorContainer, {
      maxSelections: 2,
      allowMultiple: true,
      allowDuplicates: false,
      showCategories: true,
      showPrices: true,
      excludeFacewear: true,
      showFavorites: true,
      compactMode: true,
      hideSelectedChips: true, // We show selections above with Dye 1/Dye 2 labels
    });
    selector.init();

    // Store reference
    this.dyeSelector = selector;

    // Listen for selection changes
    selectorContainer.addEventListener('selection-changed', () => {
      const selectedDyes = selector.getSelectedDyes();
      this.handleDyeSelection(selectedDyes);
    });

    // Set initial selection if dyes were loaded from storage
    const initialDyes = this.selectedDyes.filter((d): d is Dye => d !== null);
    if (initialDyes.length > 0) {
      selector.setSelectedDyes(initialDyes);
    }

    container.appendChild(dyeContainer);
  }

  /**
   * Handle dye selection from DyeSelector
   */
  private handleDyeSelection(dyes: Dye[]): void {
    // Update selectedDyes array (limit to 2)
    this.selectedDyes = [dyes[0] ?? null, dyes[1] ?? null];

    this.saveSelectedDyes();
    this.updateSelectedDyesDisplay();

    // Calculate blend if both dyes selected
    if (this.selectedDyes[0] && this.selectedDyes[1]) {
      this.blendedColor = this.blendColors(this.selectedDyes[0].hex, this.selectedDyes[1].hex);
      this.findMatchingDyes();
      this.showEmptyState(false);
      this.updateCraftingUI();
      this.renderResultsGrid();
      if (this.showPrices) {
        void this.fetchPricesForDisplayedDyes();
      }
    } else {
      this.blendedColor = null;
      this.matchedResults = [];
      this.showEmptyState(true);
      this.updateCraftingUI();
    }

    this.updateDrawerContent();
  }

  /**
   * Update the selected dyes display with Dye 1/Dye 2 labels and remove buttons
   */
  private updateSelectedDyesDisplay(): void {
    if (!this.selectedDyesContainer) return;
    clearContainer(this.selectedDyesContainer);

    const filledSlots = this.selectedDyes.filter((d): d is Dye => d !== null);

    if (filledSlots.length === 0) {
      // Empty state - dashed border placeholder
      const placeholder = this.createElement('div', {
        className: 'p-3 rounded-lg border-2 border-dashed text-center text-sm',
        textContent: LanguageService.t('mixer.selectDyes') || 'Select dyes below to blend',
        attributes: {
          style: 'border-color: var(--theme-border); color: var(--theme-text-muted);',
        },
      });
      this.selectedDyesContainer.appendChild(placeholder);
      return;
    }

    // Display each selected dye with role label
    const labels = [
      LanguageService.t('mixer.dye1') || 'Dye 1',
      LanguageService.t('mixer.dye2') || 'Dye 2',
    ];

    for (let i = 0; i < 2; i++) {
      const dye = this.selectedDyes[i];
      if (!dye) continue;

      const label = labels[i];

      const card = this.createElement('div', {
        className: 'flex items-center gap-3 p-3 rounded-lg',
        attributes: { style: 'background: var(--theme-background-secondary);' },
      });

      // Color swatch
      const swatch = this.createElement('div', {
        className: 'w-10 h-10 rounded border',
        attributes: {
          style: `background: ${dye.hex}; border-color: var(--theme-border);`,
        },
      });
      card.appendChild(swatch);

      // Info section
      const info = this.createElement('div', { className: 'flex-1 min-w-0' });

      // Role label
      const roleLabel = this.createElement('p', {
        className: 'text-xs font-semibold uppercase tracking-wider',
        textContent: label,
        attributes: { style: 'color: var(--theme-primary);' },
      });
      info.appendChild(roleLabel);

      // Dye name
      const name = this.createElement('p', {
        className: 'font-medium truncate',
        textContent: LanguageService.getDyeName(dye.itemID) || dye.name,
        attributes: { style: 'color: var(--theme-text);' },
      });
      info.appendChild(name);

      // Hex and price
      const details = this.createElement('p', {
        className: 'text-xs number',
        attributes: { style: 'color: var(--theme-text-muted);' },
      });
      let detailText = dye.hex;
      const priceText = this.formatPrice(dye);
      if (priceText) {
        detailText += ` • ${priceText}`;
      }
      details.textContent = detailText;
      info.appendChild(details);

      card.appendChild(info);

      // Remove button
      const removeBtn = this.createElement('button', {
        className: 'w-8 h-8 flex items-center justify-center rounded-full transition-colors',
        textContent: '\u00D7',
        attributes: {
          style:
            'background: var(--theme-card-hover); color: var(--theme-text-muted); font-size: 1.25rem;',
          title: LanguageService.t('common.remove') || 'Remove',
        },
      });

      const slotIndex = i;
      this.on(removeBtn, 'click', () => {
        this.handleSlotRemove(slotIndex as 0 | 1);
      });

      card.appendChild(removeBtn);
      this.selectedDyesContainer.appendChild(card);
    }
  }

  /**
   * Handle removing a dye from a slot
   */
  private handleSlotRemove(index: 0 | 1): void {
    this.selectedDyes[index] = null;
    this.saveSelectedDyes();

    // Update DyeSelector
    const remainingDyes = this.selectedDyes.filter((d): d is Dye => d !== null);
    this.dyeSelector?.setSelectedDyes(remainingDyes);
    this.mobileDyeSelector?.setSelectedDyes(remainingDyes);

    // Recalculate
    if (this.selectedDyes[0] && this.selectedDyes[1]) {
      this.blendedColor = this.blendColors(this.selectedDyes[0].hex, this.selectedDyes[1].hex);
      this.findMatchingDyes();
      this.showEmptyState(false);
    } else {
      this.blendedColor = null;
      this.matchedResults = [];
      this.showEmptyState(true);
    }

    this.updateSelectedDyesDisplay();
    this.updateCraftingUI();
    this.renderResultsGrid();
    this.updateDrawerContent();
  }

  /**
   * Render mix settings (maxResults slider)
   */
  private renderSettings(container: HTMLElement): void {
    const settingsContainer = this.createElement('div', { className: 'space-y-4' });

    // Max Results slider (3-8 range)
    const sliderGroup = this.createElement('div');
    const sliderLabel = this.createElement('label', {
      className: 'flex items-center justify-between text-sm mb-2',
    });

    const labelText = this.createElement('span', {
      textContent: LanguageService.t('mixer.maxResults') || 'Max Results',
      attributes: { style: 'color: var(--theme-text);' },
    });

    this.maxResultsValueDisplay = this.createElement('span', {
      className: 'number',
      textContent: String(this.maxResults),
      attributes: { style: 'color: var(--theme-text-muted);' },
    });

    sliderLabel.appendChild(labelText);
    sliderLabel.appendChild(this.maxResultsValueDisplay);
    sliderGroup.appendChild(sliderLabel);

    const slider = this.createElement('input', {
      attributes: {
        type: 'range',
        min: '3',
        max: '8',
        value: String(this.maxResults),
        style: 'width: 100%; accent-color: var(--theme-primary);',
      },
    }) as HTMLInputElement;

    this.on(slider, 'input', () => {
      this.maxResults = parseInt(slider.value, 10);
      if (this.maxResultsValueDisplay) {
        this.maxResultsValueDisplay.textContent = String(this.maxResults);
      }
      if (this.mobileMaxResultsDisplay) {
        this.mobileMaxResultsDisplay.textContent = String(this.maxResults);
      }
    });

    this.on(slider, 'change', () => {
      // Update ConfigController for v4 sidebar sync
      ConfigController.getInstance().setConfig('mixer', { maxResults: this.maxResults });

      this.findMatchingDyes();
      this.renderResultsGrid();
      if (this.showPrices) {
        void this.fetchPricesForDisplayedDyes();
      }
      this.updateDrawerContent();
    });

    sliderGroup.appendChild(slider);
    settingsContainer.appendChild(sliderGroup);
    container.appendChild(settingsContainer);
  }

  // ============================================================================
  // Right Panel Rendering
  // ============================================================================

  private renderRightPanel(): void {
    const right = this.options.rightPanel;
    // In V4, leftPanel and rightPanel are the same element.
    // Clear to remove leftPanel content (V4 uses ConfigSidebar instead).
    clearContainer(right);

    // Apply flex styling to the right panel for proper layout
    right.setAttribute(
      'style',
      `
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      padding: 32px;
      gap: 32px;
      box-sizing: border-box;
      overflow-y: auto;
    `
    );

    // Content wrapper with max-width to prevent over-expansion on ultrawide monitors
    const contentWrapper = this.createElement('div', {
      attributes: {
        style: 'max-width: 1200px; margin: 0 auto; width: 100%; display: flex; flex-direction: column; gap: 32px;',
      },
    });

    // Empty state (hidden - replaced by crafting UI with empty slots)
    this.emptyStateContainer = this.createElement('div', {
      attributes: { style: 'display: none; width: 100%; justify-content: center;' },
    });
    this.renderEmptyState();
    contentWrapper.appendChild(this.emptyStateContainer);

    // Crafting UI section (shown by default with empty slots)
    this.craftingContainer = this.createElement('div', {
      className: 'mb-6',
      attributes: { style: 'display: block; width: 100%;' },
    });
    this.renderCraftingUI();
    contentWrapper.appendChild(this.craftingContainer);

    // Results grid section (hidden initially)
    this.resultsSection = this.createElement('div', {
      attributes: { style: 'display: none; width: 100%;' },
    });
    // Results header (using consistent section-header/section-title pattern from other tools)
    const resultsHeader = this.createElement('div', {
      className: 'section-header',
    });
    const resultsTitle = this.createElement('span', {
      className: 'section-title',
      textContent: LanguageService.t('mixer.matchingDyes') || 'Matching Dyes',
    });
    resultsHeader.appendChild(resultsTitle);
    this.resultsSection.appendChild(resultsHeader);
    this.resultsGridContainer = this.createElement('div', {
      attributes: {
        style: `
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 16px;
          --v4-result-card-width: 280px;
        `,
      },
    });
    this.resultsSection.appendChild(this.resultsGridContainer);
    contentWrapper.appendChild(this.resultsSection);

    right.appendChild(contentWrapper);
  }

  /**
   * Render empty state
   */
  private renderEmptyState(): void {
    if (!this.emptyStateContainer) return;
    clearContainer(this.emptyStateContainer);

    const empty = this.createElement('div', {
      className: 'flex flex-col items-center justify-center text-center',
      attributes: {
        style: 'min-height: 400px; padding: 3rem 2rem;',
      },
    });

    empty.innerHTML = `
      <span style="display: block; width: 150px; height: 150px; margin: 0 auto 1.5rem; opacity: 0.25; color: var(--theme-text);">${ICON_TOOL_DYE_MIXER}</span>
      <p style="color: var(--theme-text); font-size: 1.125rem;">${LanguageService.t('mixer.selectTwoDyesToMix') || 'Select two dyes to blend and find matching colors'}</p>
    `;

    this.emptyStateContainer.appendChild(empty);
  }

  /**
   * Render the crafting UI with slots
   */
  private renderCraftingUI(): void {
    if (!this.craftingContainer) return;
    clearContainer(this.craftingContainer);

    // Main container with centered layout
    const craftingArea = this.createElement('div', {
      attributes: {
        style: `
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 24px 0;
          gap: 16px;
        `,
      },
    });

    // Equation row: [Slot1] + [Slot2] → [Result]
    const equationRow = this.createElement('div', {
      attributes: {
        style: `
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 24px;
        `,
      },
    });

    // Slot 1
    this.slot1Element = this.createDyeSlot(0);
    equationRow.appendChild(this.slot1Element);

    // Plus sign
    const plusSign = this.createElement('span', {
      className: 'mixer-operator',
      textContent: '+',
      attributes: {
        style: 'font-size: 28px; font-weight: bold; color: var(--theme-text-muted);',
      },
    });
    equationRow.appendChild(plusSign);

    // Slot 2
    this.slot2Element = this.createDyeSlot(1);
    equationRow.appendChild(this.slot2Element);

    // Arrow
    const arrow = this.createElement('span', {
      className: 'mixer-operator',
      textContent: '→',
      attributes: {
        style: 'font-size: 28px; font-weight: bold; color: var(--theme-primary);',
      },
    });
    equationRow.appendChild(arrow);

    // Result slot
    this.resultSlotElement = this.createResultSlot();
    equationRow.appendChild(this.resultSlotElement);

    craftingArea.appendChild(equationRow);

    // Tool icon (shown when no dyes selected, between equation and message)
    const hasDyes = this.selectedDyes[0] !== null || this.selectedDyes[1] !== null;
    this.emptyStateIcon = this.createElement('div', {
      attributes: {
        style: `
          width: 150px;
          height: 150px;
          margin-top: 24px;
          opacity: 0.25;
          color: var(--theme-text);
          display: ${hasDyes ? 'none' : 'block'};
        `,
      },
    });
    this.emptyStateIcon.innerHTML = ICON_TOOL_DYE_MIXER;
    craftingArea.appendChild(this.emptyStateIcon);

    // Empty state message (shown when no dyes selected)
    this.emptyStateMessage = this.createElement('p', {
      textContent: LanguageService.t('mixer.selectTwoDyesToMix') || 'Select two dyes to blend and find matching colors',
      attributes: {
        style: `
          color: var(--theme-text-muted);
          font-size: 1rem;
          margin-top: 16px;
          text-align: center;
          display: ${hasDyes ? 'none' : 'block'};
        `,
      },
    });
    craftingArea.appendChild(this.emptyStateMessage);

    this.craftingContainer.appendChild(craftingArea);
  }

  /**
   * Create a dye input slot (100x100px)
   */
  private createDyeSlot(index: 0 | 1): HTMLElement {
    const dye = this.selectedDyes[index];
    const size = SLOT_SIZE.input;

    const slot = this.createElement('div', {
      className: 'mixer-dye-slot',
      attributes: {
        'data-slot-index': String(index),
        style: `
          width: ${size}px;
          height: ${size}px;
          border-radius: 12px;
          background: ${dye ? dye.hex : 'var(--v4-glass-bg, rgba(30, 30, 30, 0.7))'};
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 2px ${dye ? 'solid' : 'dashed'} var(--v4-glass-border, rgba(255, 255, 255, 0.1));
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
        `,
      },
    });

    if (dye) {
      // Dye name label
      const label = this.createElement('span', {
        className: 'mixer-slot-label',
        textContent: LanguageService.getDyeName(dye.itemID) || dye.name,
        attributes: {
          style: `
            font-size: 10px;
            font-weight: 500;
            color: ${this.getContrastColor(dye.hex)};
            text-align: center;
            padding: 4px 6px;
            background: rgba(0, 0, 0, 0.5);
            border-radius: 4px;
            max-width: 90%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            position: absolute;
            bottom: 6px;
          `,
        },
      });
      slot.appendChild(label);

      // Slot number at top
      const slotNumber = this.createElement('span', {
        textContent: String(index + 1),
        attributes: {
          style: `
            font-size: 12px;
            font-weight: 600;
            color: ${this.getContrastColor(dye.hex)};
            position: absolute;
            top: 6px;
            left: 8px;
            background: rgba(0, 0, 0, 0.4);
            width: 18px;
            height: 18px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
          `,
        },
      });
      slot.appendChild(slotNumber);
    } else {
      // Empty slot placeholder with plus sign (matching Gradient Tool style)
      const plusSign = this.createElement('span', {
        textContent: '+',
        attributes: {
          style: `
            font-size: 32px;
            font-weight: 300;
            color: rgba(255, 255, 255, 0.4);
          `,
        },
      });
      slot.appendChild(plusSign);
    }

    // Hover effect
    this.on(slot, 'mouseenter', () => {
      slot.style.transform = 'scale(1.03)';
      slot.style.boxShadow = 'var(--v4-shadow-soft, 0 4px 24px rgba(0, 0, 0, 0.3))';
    });
    this.on(slot, 'mouseleave', () => {
      slot.style.transform = 'scale(1)';
      slot.style.boxShadow = 'none';
    });

    return slot;
  }

  /**
   * Create the result slot (120x120px)
   */
  private createResultSlot(): HTMLElement {
    const size = SLOT_SIZE.result;

    const slot = this.createElement('div', {
      className: 'mixer-result-slot',
      attributes: {
        style: `
          width: ${size}px;
          height: ${size}px;
          border-radius: 16px;
          background: ${this.blendedColor || 'var(--v4-glass-bg, rgba(30, 30, 30, 0.5))'};
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 3px solid var(--theme-primary, #d4af37);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 20px rgba(212, 175, 55, 0.3);
          position: relative;
          flex-shrink: 0;
        `,
      },
    });

    if (this.blendedColor) {
      // "Blend" label at top
      const blendLabel = this.createElement('span', {
        textContent: LanguageService.t('mixer.blend') || 'Blend',
        attributes: {
          style: `
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: ${this.getContrastColor(this.blendedColor)};
            position: absolute;
            top: 8px;
            background: rgba(0, 0, 0, 0.4);
            padding: 2px 8px;
            border-radius: 4px;
          `,
        },
      });
      slot.appendChild(blendLabel);

      // Hex value at bottom
      const hexLabel = this.createElement('span', {
        className: 'number',
        textContent: this.blendedColor.toUpperCase(),
        attributes: {
          style: `
            font-size: 12px;
            font-weight: 600;
            color: ${this.getContrastColor(this.blendedColor)};
            background: rgba(0, 0, 0, 0.5);
            padding: 4px 10px;
            border-radius: 4px;
            position: absolute;
            bottom: 8px;
          `,
        },
      });
      slot.appendChild(hexLabel);
    } else {
      // Empty state with question mark (indicates result will appear here)
      const placeholder = this.createElement('span', {
        textContent: '?',
        attributes: {
          style: `
            font-size: 36px;
            font-weight: 300;
            color: rgba(255, 255, 255, 0.4);
          `,
        },
      });
      slot.appendChild(placeholder);
    }

    return slot;
  }

  /**
   * Update the crafting UI slots
   */
  private updateCraftingUI(): void {
    if (!this.craftingContainer) return;

    // Re-render the crafting UI
    this.renderCraftingUI();
  }

  /**
   * Show/hide empty state
   */
  private showEmptyState(show: boolean): void {
    // Hide old icon+text empty state (replaced by slots with plus signs)
    if (this.emptyStateContainer) {
      this.emptyStateContainer.style.display = 'none';
    }

    // Always show crafting UI (slots visible with "+" when empty)
    if (this.craftingContainer) {
      this.craftingContainer.style.display = 'block';
    }

    // Show/hide the empty state icon above the slots
    if (this.emptyStateIcon) {
      this.emptyStateIcon.style.display = show ? 'block' : 'none';
    }

    // Show/hide the empty state message below the slots
    if (this.emptyStateMessage) {
      this.emptyStateMessage.style.display = show ? 'block' : 'none';
    }

    // Only show results section when we have matching dyes
    if (this.resultsSection) {
      this.resultsSection.style.display = show ? 'none' : 'block';
    }
  }

  /**
   * Render the results grid with v4-result-cards
   */
  private renderResultsGrid(): void {
    if (!this.resultsGridContainer) return;
    clearContainer(this.resultsGridContainer);

    if (this.matchedResults.length === 0) {
      return;
    }

    for (const result of this.matchedResults) {
      // Create v4-result-card
      const card = document.createElement('v4-result-card') as HTMLElement;
      card.setAttribute('show-actions', 'true');
      card.setAttribute('show-slot-picker', 'true');
      card.setAttribute('primary-action-label', LanguageService.t('mixer.replaceSlot') || 'Replace Slot');

      // Set data property (ResultCardData interface)
      // Get price data to resolve both price and world name
      const priceDataForDye = this.priceData.get(result.matchedDye.itemID);
      const cardData: ResultCardData = {
        dye: result.matchedDye,
        originalColor: result.blendedHex,
        matchedColor: result.matchedDye.hex,
        deltaE: result.distance,
        // Resolve worldId to actual world name (e.g., "Balmung" instead of "Crystal")
        marketServer: this.marketBoardService.getWorldNameForPrice(priceDataForDye),
        price: priceDataForDye?.currentMinPrice,
      };
      (card as unknown as { data: ResultCardData }).data = cardData;

      // Set display options from tool state
      (card as unknown as { showHex: boolean }).showHex = this.displayOptions.showHex;
      (card as unknown as { showRgb: boolean }).showRgb = this.displayOptions.showRgb;
      (card as unknown as { showHsv: boolean }).showHsv = this.displayOptions.showHsv;
      (card as unknown as { showLab: boolean }).showLab = this.displayOptions.showLab;
      (card as unknown as { showDeltaE: boolean }).showDeltaE = this.displayOptions.showDeltaE;
      (card as unknown as { showPrice: boolean }).showPrice = this.displayOptions.showPrice;
      (card as unknown as { showAcquisition: boolean }).showAcquisition =
        this.displayOptions.showAcquisition;

      // Listen for context actions
      card.addEventListener('context-action', ((
        e: CustomEvent<{ action: ContextAction; dye: Dye }>
      ) => {
        this.handleContextAction(e.detail.action, e.detail.dye);
      }) as EventListener);

      this.resultsGridContainer.appendChild(card);
    }
  }

  /**
   * Handle context menu actions from result cards
   */
  private handleContextAction(action: ContextAction, dye: Dye): void {
    switch (action) {
      case 'add-comparison':
        // Navigate to comparison tool with this dye
        window.dispatchEvent(
          new CustomEvent('navigate-to-tool', {
            detail: { toolId: 'comparison', dye },
          })
        );
        ToastService.success(LanguageService.t('toast.addedToComparison') || 'Added to comparison');
        break;

      case 'add-mixer':
        // Add to this tool's selection (if slot available)
        if (!this.selectedDyes[0]) {
          this.selectedDyes[0] = dye;
        } else if (!this.selectedDyes[1]) {
          this.selectedDyes[1] = dye;
        } else {
          ToastService.warning(
            LanguageService.t('mixer.slotsFullReplacing') || 'Both slots full. Replacing first dye.'
          );
          this.selectedDyes[0] = this.selectedDyes[1];
          this.selectedDyes[1] = dye;
        }
        this.handleDyeSelection(this.selectedDyes.filter((d): d is Dye => d !== null));
        break;

      case 'add-mixer-slot-1':
        // Explicitly replace Slot 1
        this.selectedDyes[0] = dye;
        this.handleDyeSelection(this.selectedDyes.filter((d): d is Dye => d !== null));
        ToastService.success(
          LanguageService.t('mixer.replacedSlot1') || 'Replaced Slot 1'
        );
        break;

      case 'add-mixer-slot-2':
        // Explicitly replace Slot 2
        this.selectedDyes[1] = dye;
        this.handleDyeSelection(this.selectedDyes.filter((d): d is Dye => d !== null));
        ToastService.success(
          LanguageService.t('mixer.replacedSlot2') || 'Replaced Slot 2'
        );
        break;

      case 'add-accessibility':
        window.dispatchEvent(
          new CustomEvent('navigate-to-tool', {
            detail: { toolId: 'accessibility', dye },
          })
        );
        ToastService.success(
          LanguageService.t('toast.addedToAccessibility') || 'Added to accessibility check'
        );
        break;

      case 'see-harmonies':
        window.dispatchEvent(
          new CustomEvent('navigate-to-tool', {
            detail: { toolId: 'harmony', dye },
          })
        );
        break;

      case 'budget':
        window.dispatchEvent(
          new CustomEvent('navigate-to-tool', {
            detail: { toolId: 'budget', dye },
          })
        );
        break;

      case 'copy-hex':
        void navigator.clipboard.writeText(dye.hex).then(() => {
          ToastService.success(
            LanguageService.t('toast.copiedToClipboard') || 'Copied to clipboard'
          );
        });
        break;
    }
  }

  // ============================================================================
  // Mobile Drawer
  // ============================================================================

  /**
   * Render mobile drawer content
   */
  private renderDrawerContent(): void {
    const drawer = this.options.drawerContent;
    if (!drawer) return;

    // Preserve any existing nav
    const existingNav = drawer.querySelector('[data-drawer-nav]');
    clearContainer(drawer);
    if (existingNav) {
      drawer.appendChild(existingNav);
    }

    // Section 1: Dye Selection
    const dyeSelectionContainer = this.createElement('div');
    drawer.appendChild(dyeSelectionContainer);
    this.mobileDyeSelectionPanel = new CollapsiblePanel(dyeSelectionContainer, {
      title: LanguageService.t('mixer.dyeSelection') || 'Dye Selection',
      storageKey: 'v4_mixer_mobile_dye_selection_panel',
      defaultOpen: true,
      icon: ICON_PALETTE,
    });
    this.mobileDyeSelectionPanel.init();
    const mobileDyeSelectionContent = this.createElement('div', { className: 'p-4' });
    this.renderMobileDyeSelector(mobileDyeSelectionContent);
    this.mobileDyeSelectionPanel.setContent(mobileDyeSelectionContent);

    // Section 2: Mix Settings
    const settingsContainer = this.createElement('div');
    drawer.appendChild(settingsContainer);
    this.mobileSettingsPanel = new CollapsiblePanel(settingsContainer, {
      title: LanguageService.t('mixer.mixSettings') || 'Mix Settings',
      storageKey: 'v4_mixer_mobile_settings_panel',
      defaultOpen: true,
      icon: ICON_SLIDERS,
    });
    this.mobileSettingsPanel.init();
    const mobileSettingsContent = this.createElement('div', { className: 'p-4' });
    this.renderMobileSettings(mobileSettingsContent);
    this.mobileSettingsPanel.setContent(mobileSettingsContent);

    // Section 3: Filters
    const filtersContainer = this.createElement('div');
    drawer.appendChild(filtersContainer);
    this.mobileFiltersPanel = new CollapsiblePanel(filtersContainer, {
      title: LanguageService.t('filters.advancedFilters') || 'Advanced Dye Filters',
      storageKey: 'v4_mixer_mobile_filters',
      defaultOpen: false,
      icon: ICON_FILTER,
    });
    this.mobileFiltersPanel.init();

    const mobileFiltersContent = this.createElement('div');
    this.mobileDyeFilters = new DyeFilters(mobileFiltersContent, {
      storageKeyPrefix: 'v4_mixer_mobile',
      hideHeader: true,
      onFilterChange: () => {
        this.findMatchingDyes();
        this.renderResultsGrid();
        if (this.showPrices) {
          void this.fetchPricesForDisplayedDyes();
        }
      },
    });
    this.mobileDyeFilters.render();
    this.mobileDyeFilters.bindEvents();
    this.mobileFiltersPanel.setContent(mobileFiltersContent);

    // Section 4: Market Board
    const marketContainer = this.createElement('div');
    drawer.appendChild(marketContainer);
    this.mobileMarketPanel = new CollapsiblePanel(marketContainer, {
      title: LanguageService.t('marketBoard.title') || 'Market Board',
      storageKey: 'v4_mixer_mobile_market',
      defaultOpen: false,
      icon: ICON_MARKET,
    });
    this.mobileMarketPanel.init();

    // Create mobile market board content
    // Note: MarketBoard delegates to MarketBoardService for state management
    const mobileMarketContent = this.createElement('div');
    this.mobileMarketBoard = new MarketBoard(mobileMarketContent);
    this.mobileMarketBoard.init();

    // Set up market board event listeners using shared utility
    setupMarketBoardListeners(
      mobileMarketContent,
      () => this.showPrices,
      () => this.fetchPricesForDisplayedDyes(),
      {
        onPricesToggled: () => {
          if (this.showPrices) {
            void this.fetchPricesForDisplayedDyes();
          } else {
            this.renderResultsGrid();
          }
        },
        onServerChanged: () => {
          this.renderResultsGrid();
          if (this.showPrices && this.matchedResults.length > 0) {
            void this.fetchPricesForDisplayedDyes();
          }
        },
      }
    );

    this.mobileMarketPanel.setContent(mobileMarketContent);
  }

  /**
   * Render mobile dye selector
   */
  private renderMobileDyeSelector(container: HTMLElement): void {
    const dyeContainer = this.createElement('div', { className: 'space-y-3' });

    // Instruction
    const instruction = this.createElement('p', {
      className: 'text-sm mb-2',
      textContent: LanguageService.t('mixer.selectTwoDyes') || 'Select two dyes to blend together',
      attributes: { style: 'color: var(--theme-text-muted);' },
    });
    dyeContainer.appendChild(instruction);

    // Selected dyes display
    const displayContainer = this.createElement('div', {
      className: 'selected-dyes-display space-y-2',
    });
    dyeContainer.appendChild(displayContainer);
    this.mobileSelectedDyesContainer = displayContainer;

    // Mirror the desktop display
    this.updateMobileSelectedDyesDisplay();

    // Dye selector
    const selectorContainer = this.createElement('div', { className: 'mt-3' });
    dyeContainer.appendChild(selectorContainer);

    this.mobileDyeSelector = new DyeSelector(selectorContainer, {
      maxSelections: 2,
      allowMultiple: true,
      allowDuplicates: false,
      showCategories: true,
      showPrices: true,
      excludeFacewear: true,
      showFavorites: true,
      compactMode: true,
      hideSelectedChips: true,
    });
    this.mobileDyeSelector.init();

    // Sync with desktop
    selectorContainer.addEventListener('selection-changed', () => {
      const selectedDyes = this.mobileDyeSelector!.getSelectedDyes();
      this.handleDyeSelection(selectedDyes);
      this.dyeSelector?.setSelectedDyes(selectedDyes);
    });

    // Set initial selection
    const initialDyes = this.selectedDyes.filter((d): d is Dye => d !== null);
    if (initialDyes.length > 0) {
      this.mobileDyeSelector.setSelectedDyes(initialDyes);
    }

    container.appendChild(dyeContainer);
  }

  /**
   * Update mobile selected dyes display
   */
  private updateMobileSelectedDyesDisplay(): void {
    if (!this.mobileSelectedDyesContainer) return;
    clearContainer(this.mobileSelectedDyesContainer);

    const filledSlots = this.selectedDyes.filter((d): d is Dye => d !== null);

    if (filledSlots.length === 0) {
      const placeholder = this.createElement('div', {
        className: 'p-3 rounded-lg border-2 border-dashed text-center text-sm',
        textContent: LanguageService.t('mixer.selectDyes') || 'Select dyes below to blend',
        attributes: {
          style: 'border-color: var(--theme-border); color: var(--theme-text-muted);',
        },
      });
      this.mobileSelectedDyesContainer.appendChild(placeholder);
      return;
    }

    // Same display as desktop
    const labels = [
      LanguageService.t('mixer.dye1') || 'Dye 1',
      LanguageService.t('mixer.dye2') || 'Dye 2',
    ];

    for (let i = 0; i < 2; i++) {
      const dye = this.selectedDyes[i];
      if (!dye) continue;

      const card = this.createElement('div', {
        className: 'flex items-center gap-3 p-3 rounded-lg',
        attributes: { style: 'background: var(--theme-background-secondary);' },
      });

      const swatch = this.createElement('div', {
        className: 'w-8 h-8 rounded border',
        attributes: {
          style: `background: ${dye.hex}; border-color: var(--theme-border);`,
        },
      });
      card.appendChild(swatch);

      const info = this.createElement('div', { className: 'flex-1 min-w-0' });
      info.innerHTML = `
        <p class="text-xs font-semibold uppercase tracking-wider" style="color: var(--theme-primary);">${labels[i]}</p>
        <p class="font-medium truncate text-sm" style="color: var(--theme-text);">${LanguageService.getDyeName(dye.itemID) || dye.name}</p>
      `;
      card.appendChild(info);

      this.mobileSelectedDyesContainer.appendChild(card);
    }
  }

  /**
   * Render mobile settings
   */
  private renderMobileSettings(container: HTMLElement): void {
    const settingsContainer = this.createElement('div', { className: 'space-y-4' });

    const sliderGroup = this.createElement('div');
    const sliderLabel = this.createElement('label', {
      className: 'flex items-center justify-between text-sm mb-2',
    });

    const labelText = this.createElement('span', {
      textContent: LanguageService.t('mixer.maxResults') || 'Max Results',
      attributes: { style: 'color: var(--theme-text);' },
    });

    this.mobileMaxResultsDisplay = this.createElement('span', {
      className: 'number',
      textContent: String(this.maxResults),
      attributes: { style: 'color: var(--theme-text-muted);' },
    });

    sliderLabel.appendChild(labelText);
    sliderLabel.appendChild(this.mobileMaxResultsDisplay);
    sliderGroup.appendChild(sliderLabel);

    const slider = this.createElement('input', {
      attributes: {
        type: 'range',
        min: '3',
        max: '8',
        value: String(this.maxResults),
        style: 'width: 100%; accent-color: var(--theme-primary);',
      },
    }) as HTMLInputElement;

    this.on(slider, 'input', () => {
      this.maxResults = parseInt(slider.value, 10);
      if (this.mobileMaxResultsDisplay) {
        this.mobileMaxResultsDisplay.textContent = String(this.maxResults);
      }
      if (this.maxResultsValueDisplay) {
        this.maxResultsValueDisplay.textContent = String(this.maxResults);
      }
    });

    this.on(slider, 'change', () => {
      ConfigController.getInstance().setConfig('mixer', { maxResults: this.maxResults });
      this.findMatchingDyes();
      this.renderResultsGrid();
      if (this.showPrices) {
        void this.fetchPricesForDisplayedDyes();
      }
    });

    sliderGroup.appendChild(slider);
    settingsContainer.appendChild(sliderGroup);
    container.appendChild(settingsContainer);
  }

  /**
   * Update drawer content (called when state changes)
   */
  private updateDrawerContent(): void {
    this.updateMobileSelectedDyesDisplay();

    // Sync mobile DyeSelector with desktop
    const selectedDyes = this.selectedDyes.filter((d): d is Dye => d !== null);
    this.mobileDyeSelector?.setSelectedDyes(selectedDyes);

    // Sync slider
    if (this.mobileMaxResultsDisplay) {
      this.mobileMaxResultsDisplay.textContent = String(this.maxResults);
    }
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Format price for display
   */
  private formatPrice(dye: Dye): string | null {
    if (!this.showPrices) return null;
    const price = this.priceData.get(dye.itemID);
    if (!price?.currentMinPrice) return null;
    return `${price.currentMinPrice.toLocaleString()} gil`;
  }

  /**
   * Fetch prices for displayed dyes
   * Delegates to MarketBoardService with race condition protection
   */
  private async fetchPricesForDisplayedDyes(): Promise<void> {
    if (!this.showPrices) return;

    const dyes = this.matchedResults.map((r) => r.matchedDye);
    if (dyes.length === 0) return;

    try {
      const prices = await this.marketBoardService.fetchPricesForDyes(dyes);
      if (prices.size > 0) {
        this.renderResultsGrid();
      }
    } catch (error) {
      logger.error('[MixerTool] Failed to fetch prices:', error);
    }
  }

  /**
   * Get contrasting text color for a background
   */
  private getContrastColor(hex: string): string {
    const rgb = ColorService.hexToRgb(hex);
    // Calculate luminance
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }
}
