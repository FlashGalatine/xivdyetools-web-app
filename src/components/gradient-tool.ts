/**
 * XIV Dye Tools v4.0.0 - Gradient Tool Component (Gradient Builder)
 *
 * V4 Renamed: mixer-tool.ts → gradient-tool.ts
 * Creates color gradients between two dyes with intermediate matches.
 *
 * Left Panel: Start/End dye selectors, steps slider, color space toggle, filters, market board
 * Right Panel: Gradient preview, intermediate dye matches, export options
 *
 * @module components/tools/gradient-tool
 */

import { BaseComponent } from '@components/base-component';
import { CollapsiblePanel } from '@components/collapsible-panel';
import { DyeSelector } from '@components/dye-selector';
import { DyeFilters } from '@components/dye-filters';
import { MarketBoard } from '@components/market-board';
import { createDyeActionDropdown } from '@components/dye-action-dropdown';
import {
  ColorService,
  ConfigController,
  dyeService,
  LanguageService,
  MarketBoardService,
  StorageService,
  ToastService,
  WorldService,
} from '@services/index';
import { ICON_TOOL_MIXER } from '@shared/tool-icons';
import {
  ICON_FILTER,
  ICON_MARKET,
  ICON_EXPORT,
  ICON_TEST_TUBE,
  ICON_BEAKER_PIPE,
  ICON_STAIRS,
  ICON_PALETTE,
} from '@shared/ui-icons';
import { logger } from '@shared/logger';
import { clearContainer } from '@shared/utils';
import type { Dye, PriceData } from '@shared/types';
import type { GradientConfig, DisplayOptionsConfig, MarketConfig } from '@shared/tool-config-types';
import { DEFAULT_DISPLAY_OPTIONS } from '@shared/tool-config-types';

// ============================================================================
// Types and Constants
// ============================================================================

export interface GradientToolOptions {
  leftPanel: HTMLElement;
  rightPanel: HTMLElement;
  drawerContent?: HTMLElement | null;
}

/**
 * Interpolation step with dye match
 */
interface InterpolationStep {
  position: number; // 0-1
  theoreticalColor: string;
  matchedDye: Dye | null;
  distance: number;
}

/**
 * Storage keys for v3 mixer tool
 */
const STORAGE_KEYS = {
  stepCount: 'v3_mixer_steps',
  colorSpace: 'v3_mixer_color_space',
  selectedDyes: 'v3_mixer_selected_dyes',
  // Legacy keys for migration
  startDyeId: 'v3_mixer_start_dye_id',
  endDyeId: 'v3_mixer_end_dye_id',
} as const;

/**
 * Default values
 */
const DEFAULTS = {
  stepCount: 8,
  colorSpace: 'hsv' as const,
};

// ============================================================================
// MixerTool Component
// ============================================================================

/**
 * Mixer Tool - v3 Two-Panel Layout
 *
 * Creates smooth color transitions between two dyes with intermediate matches.
 */
export class GradientTool extends BaseComponent {
  private options: GradientToolOptions;

  // State - selectedDyes[0] = start, selectedDyes[1] = end
  private selectedDyes: Dye[] = [];
  private stepCount: number;
  private colorSpace: 'rgb' | 'hsv';
  private currentSteps: InterpolationStep[] = [];

  // Market Board Service integration
  private marketBoardService: MarketBoardService;

  // Computed getters for market data (delegates to shared service)
  private get showPrices(): boolean {
    return this.marketBoardService.getShowPrices();
  }

  private get priceData(): Map<number, PriceData> {
    return this.marketBoardService.getAllPrices();
  }

  // Computed getters for backward compatibility
  private get startDye(): Dye | null {
    return this.selectedDyes[0] || null;
  }

  private get endDye(): Dye | null {
    return this.selectedDyes[1] || null;
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
  private mobileStepValueDisplay: HTMLElement | null = null;

  // DOM References
  private selectedDyesContainer: HTMLElement | null = null;
  private mobileSelectedDyesContainer: HTMLElement | null = null;
  private stepValueDisplay: HTMLElement | null = null;
  private emptyStateContainer: HTMLElement | null = null;
  private gradientContainer: HTMLElement | null = null;
  private matchesContainer: HTMLElement | null = null;
  private exportContainer: HTMLElement | null = null;
  private resultsHeader: HTMLElement | null = null;

  // Subscriptions
  private languageUnsubscribe: (() => void) | null = null;
  private configUnsubscribe: (() => void) | null = null;
  private marketConfigUnsubscribe: (() => void) | null = null;

  // Display options (from ConfigController) - for future v4-result-card migration
  private displayOptions: DisplayOptionsConfig = { ...DEFAULT_DISPLAY_OPTIONS };

  // Guard flag to prevent selection-changed event from overwriting state during external selection
  private isExternalSelection = false;

  constructor(container: HTMLElement, options: GradientToolOptions) {
    super(container);
    this.options = options;

    // Initialize shared MarketBoardService
    this.marketBoardService = MarketBoardService.getInstance();

    // Load persisted settings
    this.stepCount = StorageService.getItem<number>(STORAGE_KEYS.stepCount) ?? DEFAULTS.stepCount;
    this.colorSpace =
      StorageService.getItem<'rgb' | 'hsv'>(STORAGE_KEYS.colorSpace) ?? DEFAULTS.colorSpace;

    // Load display options from ConfigController
    const configController = ConfigController.getInstance();
    const gradientConfig = configController.getConfig('gradient');
    this.displayOptions = gradientConfig.displayOptions ?? { ...DEFAULT_DISPLAY_OPTIONS };

    // Note: showPrices now comes from MarketBoardService getter

    // Load persisted dye selections (with migration from old format)
    this.loadSelectedDyes();
  }

  /**
   * Load selected dyes from storage, migrating from old format if needed
   */
  private loadSelectedDyes(): void {
    // Try new storage format first
    const savedDyeIds = StorageService.getItem<number[]>(STORAGE_KEYS.selectedDyes);

    if (savedDyeIds && savedDyeIds.length > 0) {
      // Load from new format
      this.selectedDyes = savedDyeIds
        .map((id) => dyeService.getDyeById(id))
        .filter((dye): dye is Dye => dye !== null);
    } else {
      // Migrate from old format (separate start/end dye IDs)
      const startDyeId = StorageService.getItem<number>(STORAGE_KEYS.startDyeId);
      const endDyeId = StorageService.getItem<number>(STORAGE_KEYS.endDyeId);

      const dyes: Dye[] = [];
      if (startDyeId) {
        const startDye = dyeService.getDyeById(startDyeId);
        if (startDye) dyes.push(startDye);
      }
      if (endDyeId) {
        const endDye = dyeService.getDyeById(endDyeId);
        if (endDye) dyes.push(endDye);
      }

      if (dyes.length > 0) {
        this.selectedDyes = dyes;
        // Save to new format
        this.saveSelectedDyes();
        // Clean up old keys
        StorageService.removeItem(STORAGE_KEYS.startDyeId);
        StorageService.removeItem(STORAGE_KEYS.endDyeId);
        logger.info('[MixerTool] Migrated dye selection from old storage format');
      }
    }
  }

  /**
   * Save selected dyes to storage
   */
  private saveSelectedDyes(): void {
    const dyeIds = this.selectedDyes.map((d) => d.id);
    StorageService.setItem(STORAGE_KEYS.selectedDyes, dyeIds);
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
    // Subscribe to language changes (only in onMount, NOT bindEvents - avoids infinite loop)
    this.languageUnsubscribe = LanguageService.subscribe(() => {
      this.update();
    });

    // Subscribe to config changes from V4 ConfigSidebar
    const configController = ConfigController.getInstance();
    this.configUnsubscribe = configController.subscribe('gradient', (config) => {
      this.setConfig(config);
    });

    // Subscribe to market config changes
    this.marketConfigUnsubscribe = configController.subscribe('market', (config) => {
      this.setConfig(config);
    });

    // Sync MarketBoard components with ConfigController on initial load
    const marketConfig = configController.getConfig('market');
    if (this.marketBoard) {
      this.marketBoard.setSelectedServer(marketConfig.selectedServer);
      this.marketBoard.setShowPrices(marketConfig.showPrices);
    }
    if (this.mobileMarketBoard) {
      this.mobileMarketBoard.setSelectedServer(marketConfig.selectedServer);
      this.mobileMarketBoard.setShowPrices(marketConfig.showPrices);
    }

    // If dyes were loaded from storage, calculate interpolation
    if (this.startDye && this.endDye) {
      this.updateInterpolation();
      this.updateDrawerContent();
    }

    logger.info('[MixerTool] Mounted');
  }

  destroy(): void {
    this.languageUnsubscribe?.();
    this.configUnsubscribe?.();
    this.marketConfigUnsubscribe?.();

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

    this.selectedDyes = [];
    this.currentSteps = [];

    super.destroy();
    logger.info('[MixerTool] Destroyed');
  }

  // ============================================================================
  // V4 Integration
  // ============================================================================

  /**
   * Update tool configuration from external source (V4 ConfigSidebar)
   * Accepts both GradientConfig and MarketConfig properties
   */
  public setConfig(config: Partial<GradientConfig> & Partial<MarketConfig>): void {
    let needsUpdate = false;

    // Handle stepCount
    if (config.stepCount !== undefined && config.stepCount !== this.stepCount) {
      this.stepCount = config.stepCount;
      StorageService.setItem(STORAGE_KEYS.stepCount, config.stepCount);
      needsUpdate = true;
      logger.info(`[GradientTool] setConfig: stepCount -> ${config.stepCount}`);

      // Update desktop display
      if (this.stepValueDisplay) {
        this.stepValueDisplay.textContent = String(config.stepCount);
      }
      // Update mobile display
      if (this.mobileStepValueDisplay) {
        this.mobileStepValueDisplay.textContent = String(config.stepCount);
      }
    }

    // Handle interpolation (maps to colorSpace)
    if (config.interpolation !== undefined) {
      const newColorSpace = config.interpolation === 'rgb' ? 'rgb' : 'hsv';
      if (newColorSpace !== this.colorSpace) {
        this.colorSpace = newColorSpace;
        StorageService.setItem(STORAGE_KEYS.colorSpace, newColorSpace);
        needsUpdate = true;
        logger.info(
          `[GradientTool] setConfig: interpolation -> ${config.interpolation} (colorSpace: ${newColorSpace})`
        );
      }
    }

    // Handle display options changes - re-render results when these change
    if (config.displayOptions) {
      const oldOptions = this.displayOptions;
      this.displayOptions = { ...this.displayOptions, ...config.displayOptions };
      logger.info('[GradientTool] setConfig: displayOptions updated', config.displayOptions);

      // Check if any display option actually changed
      const hasChanged = Object.keys(config.displayOptions).some(
        (key) =>
          oldOptions[key as keyof typeof oldOptions] !==
          config.displayOptions![key as keyof typeof config.displayOptions]
      );

      if (hasChanged) {
        // Re-render results to reflect new display options
        this.renderIntermediateMatches();
        logger.info('[GradientTool] Re-rendered results with new display options');
      }
    }

    // Handle market config changes (showPrices, selectedServer)
    // Note: MarketBoardService manages state via ConfigController subscription
    if ('showPrices' in config) {
      const showPrices = config.showPrices as boolean;
      logger.info(`[GradientTool] setConfig: showPrices -> ${showPrices}`);

      // Update both MarketBoard UI instances
      if (this.marketBoard) {
        this.marketBoard.setShowPrices(showPrices);
      }
      if (this.mobileMarketBoard) {
        this.mobileMarketBoard.setShowPrices(showPrices);
      }

      // Fetch prices if enabled, or re-render to hide them
      if (showPrices) {
        this.fetchPricesForDisplayedDyes();
      } else {
        this.renderIntermediateMatches();
      }
    }

    if ('selectedServer' in config) {
      const selectedServer = config.selectedServer as string;
      logger.info(`[GradientTool] setConfig: selectedServer -> ${selectedServer}`);

      // Update both MarketBoard UI instances with the new server
      if (this.marketBoard) {
        this.marketBoard.setSelectedServer(selectedServer);
      }
      if (this.mobileMarketBoard) {
        this.mobileMarketBoard.setSelectedServer(selectedServer);
      }

      // Re-fetch prices with the new server (service clears cache automatically on server change)
      if (this.showPrices) {
        this.fetchPricesForDisplayedDyes();
      }
    }

    // Re-interpolate if any config changed and we have data
    if (needsUpdate && this.startDye && this.endDye) {
      this.updateInterpolation();
      this.updateDrawerContent();
    }
  }

  // ============================================================================
  // Left Panel Rendering
  // ============================================================================

  private renderLeftPanel(): void {
    const left = this.options.leftPanel;
    clearContainer(left);

    // Section 1: Dye Selection (consolidated - select 2 dyes)
    const dyeSelectionContainer = this.createElement('div');
    left.appendChild(dyeSelectionContainer);
    this.dyeSelectionPanel = new CollapsiblePanel(dyeSelectionContainer, {
      title: LanguageService.t('mixer.dyeSelection') || 'Dye Selection',
      storageKey: 'v3_mixer_dye_selection_panel',
      defaultOpen: true,
      icon: ICON_PALETTE,
    });
    this.dyeSelectionPanel.init();
    const dyeSelectionContent = this.createElement('div', { className: 'p-4' });
    this.renderDyeSelector(dyeSelectionContent);
    this.dyeSelectionPanel.setContent(dyeSelectionContent);

    // Section 2: Interpolation Settings (collapsible)
    const settingsContainer = this.createElement('div');
    left.appendChild(settingsContainer);
    this.settingsPanel = new CollapsiblePanel(settingsContainer, {
      title: LanguageService.t('mixer.interpolationSettings') || 'Interpolation Settings',
      storageKey: 'v3_mixer_settings_panel',
      defaultOpen: true,
      icon: ICON_STAIRS,
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
      storageKey: 'v3_mixer_filters',
      defaultOpen: false,
      icon: ICON_FILTER,
    });
    this.filtersPanel.init();

    const filtersContent = this.createElement('div');
    this.dyeFilters = new DyeFilters(filtersContent, {
      storageKeyPrefix: 'v3_mixer',
      hideHeader: true,
      onFilterChange: () => {
        this.updateInterpolation();
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
      storageKey: 'v3_mixer_market',
      defaultOpen: false,
      icon: ICON_MARKET,
    });
    this.marketPanel.init();

    const marketContent = this.createElement('div');
    this.marketBoard = new MarketBoard(marketContent);
    this.marketBoard.init();

    // Listen for price toggle changes (service manages state, we just react)
    marketContent.addEventListener('showPricesChanged', ((_event: Event) => {
      if (this.showPrices) {
        // Fetch prices - this will update displays after fetching
        void this.fetchPricesForDisplayedDyes();
      } else {
        // Prices disabled - update displays to remove price indicators
        this.updateSelectedDyesDisplay();
        this.renderIntermediateMatches();
      }
    }) as EventListener);

    // Listen for server changes
    marketContent.addEventListener('server-changed', (() => {
      if (this.showPrices) {
        this.fetchPricesForDisplayedDyes();
      }
    }) as EventListener);

    // Listen for category changes
    marketContent.addEventListener('categories-changed', (() => {
      if (this.showPrices) {
        this.fetchPricesForDisplayedDyes();
      }
    }) as EventListener);

    // Listen for refresh requests
    marketContent.addEventListener('refresh-requested', (() => {
      if (this.showPrices) {
        this.fetchPricesForDisplayedDyes();
      }
    }) as EventListener);

    this.marketPanel.setContent(marketContent);
  }

  /**
   * Create a section with label
   */
  private createSection(label: string): HTMLElement {
    const section = this.createElement('div', {
      className: 'p-4 border-b',
      attributes: { style: 'border-color: var(--theme-border);' },
    });
    const sectionLabel = this.createElement('h3', {
      className: 'text-sm font-semibold uppercase tracking-wider mb-3',
      textContent: label,
      attributes: { style: 'color: var(--theme-text-muted);' },
    });
    section.appendChild(sectionLabel);
    return section;
  }

  /**
   * Create a header for right panel sections
   */
  private createHeader(text: string): HTMLElement {
    return this.createElement('h3', {
      className: 'text-sm font-semibold uppercase tracking-wider mb-3',
      textContent: text,
      attributes: { style: 'color: var(--theme-text-muted);' },
    });
  }

  /**
   * Render consolidated dye selector section (select 2 dyes: start and end)
   */
  private renderDyeSelector(container: HTMLElement): void {
    const dyeContainer = this.createElement('div', { className: 'space-y-3' });

    // Instruction text
    const instruction = this.createElement('p', {
      className: 'text-sm mb-2',
      textContent:
        LanguageService.t('mixer.selectTwoDyes') ||
        'Select two dyes to create a gradient (first = start, second = end)',
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
      hideSelectedChips: true, // We show selections above with Start/End labels
    });
    selector.init();

    // Store reference
    this.dyeSelector = selector;

    // Listen for selection changes
    selectorContainer.addEventListener('selection-changed', () => {
      // Skip if this change was triggered by external selection (e.g., from Color Palette drawer)
      if (this.isExternalSelection) {
        return;
      }
      this.selectedDyes = selector.getSelectedDyes();
      this.saveSelectedDyes();
      this.updateSelectedDyesDisplay();
      this.updateInterpolation();
      this.updateDrawerContent();
    });

    // Set initial selection if dyes were loaded from storage
    if (this.selectedDyes.length > 0) {
      selector.setSelectedDyes(this.selectedDyes);
    }

    container.appendChild(dyeContainer);
  }

  /**
   * Update the selected dyes display with Start/End labels and remove buttons
   */
  private updateSelectedDyesDisplay(): void {
    if (!this.selectedDyesContainer) return;
    clearContainer(this.selectedDyesContainer);

    if (this.selectedDyes.length === 0) {
      // Empty state - dashed border placeholder
      const placeholder = this.createElement('div', {
        className: 'p-3 rounded-lg border-2 border-dashed text-center text-sm',
        textContent: LanguageService.t('mixer.selectDyes') || 'Select dyes below',
        attributes: {
          style: 'border-color: var(--theme-border); color: var(--theme-text-muted);',
        },
      });
      this.selectedDyesContainer.appendChild(placeholder);
      return;
    }

    // Display each selected dye with role label
    const labels = [
      LanguageService.t('mixer.startDye') || 'Start',
      LanguageService.t('mixer.endDye') || 'End',
    ];

    for (let i = 0; i < this.selectedDyes.length; i++) {
      const dye = this.selectedDyes[i];
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

      this.on(removeBtn, 'click', () => {
        // Remove this dye from selection
        const newSelection = this.selectedDyes.filter((d) => d.id !== dye.id);
        this.selectedDyes = newSelection;
        this.dyeSelector?.setSelectedDyes(newSelection);
        this.saveSelectedDyes();
        this.updateSelectedDyesDisplay();
        this.updateInterpolation();
        this.updateDrawerContent();
      });

      card.appendChild(removeBtn);
      this.selectedDyesContainer.appendChild(card);
    }
  }

  /**
   * Render interpolation settings
   */
  private renderSettings(container: HTMLElement): void {
    const settingsContainer = this.createElement('div', { className: 'space-y-4' });

    // Steps slider
    const stepsGroup = this.createElement('div');
    const stepsLabel = this.createElement('label', {
      className: 'flex items-center justify-between text-sm mb-2',
    });
    const stepsText = this.createElement('span', {
      textContent: LanguageService.t('mixer.steps') || 'Steps',
      attributes: { style: 'color: var(--theme-text);' },
    });
    this.stepValueDisplay = this.createElement('span', {
      className: 'number',
      textContent: String(this.stepCount),
      attributes: { style: 'color: var(--theme-text-muted);' },
    });
    stepsLabel.appendChild(stepsText);
    stepsLabel.appendChild(this.stepValueDisplay);
    stepsGroup.appendChild(stepsLabel);

    const stepsInput = this.createElement('input', {
      className: 'w-full',
      attributes: {
        type: 'range',
        min: '2',
        max: '10',
        value: String(this.stepCount),
        style: 'accent-color: var(--theme-primary);',
      },
    }) as HTMLInputElement;

    this.on(stepsInput, 'input', () => {
      this.stepCount = parseInt(stepsInput.value, 10);
      if (this.stepValueDisplay) {
        this.stepValueDisplay.textContent = String(this.stepCount);
      }
      StorageService.setItem(STORAGE_KEYS.stepCount, this.stepCount);
      this.updateInterpolation();
      this.updateDrawerContent();
    });

    stepsGroup.appendChild(stepsInput);
    settingsContainer.appendChild(stepsGroup);

    // Color space toggle
    const colorSpaceGroup = this.createElement('div');
    const colorSpaceLabel = this.createElement('label', {
      className: 'block text-sm mb-2',
      textContent: LanguageService.t('mixer.colorSpace') || 'Color Space',
      attributes: { style: 'color: var(--theme-text);' },
    });
    colorSpaceGroup.appendChild(colorSpaceLabel);

    const buttonContainer = this.createElement('div', { className: 'flex gap-2' });

    const rgbBtn = this.createElement('button', {
      className: 'flex-1 px-3 py-2 text-sm rounded-lg transition-colors',
      textContent: 'RGB',
      attributes: {
        style:
          this.colorSpace === 'rgb'
            ? 'background: var(--theme-primary); color: var(--theme-text-header);'
            : 'background: var(--theme-background-secondary); color: var(--theme-text);',
      },
    });

    const hsvBtn = this.createElement('button', {
      className: 'flex-1 px-3 py-2 text-sm rounded-lg transition-colors',
      textContent: 'HSV',
      attributes: {
        style:
          this.colorSpace === 'hsv'
            ? 'background: var(--theme-primary); color: var(--theme-text-header);'
            : 'background: var(--theme-background-secondary); color: var(--theme-text);',
      },
    });

    this.on(rgbBtn, 'click', () => {
      this.colorSpace = 'rgb';
      StorageService.setItem(STORAGE_KEYS.colorSpace, 'rgb');
      rgbBtn.setAttribute(
        'style',
        'background: var(--theme-primary); color: var(--theme-text-header);'
      );
      hsvBtn.setAttribute(
        'style',
        'background: var(--theme-background-secondary); color: var(--theme-text);'
      );
      this.updateInterpolation();
      this.updateDrawerContent();
    });

    this.on(hsvBtn, 'click', () => {
      this.colorSpace = 'hsv';
      StorageService.setItem(STORAGE_KEYS.colorSpace, 'hsv');
      hsvBtn.setAttribute(
        'style',
        'background: var(--theme-primary); color: var(--theme-text-header);'
      );
      rgbBtn.setAttribute(
        'style',
        'background: var(--theme-background-secondary); color: var(--theme-text);'
      );
      this.updateInterpolation();
      this.updateDrawerContent();
    });

    buttonContainer.appendChild(rgbBtn);
    buttonContainer.appendChild(hsvBtn);
    colorSpaceGroup.appendChild(buttonContainer);
    settingsContainer.appendChild(colorSpaceGroup);

    container.appendChild(settingsContainer);
  }

  // ============================================================================
  // Right Panel Rendering
  // ============================================================================

  private renderRightPanel(): void {
    const right = this.options.rightPanel;
    clearContainer(right);

    // Apply gradient-view styling to the right panel
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
        style: 'max-width: 1200px; margin: 0 auto; width: 100%; display: flex; flex-direction: column; gap: 32px; flex: 1;',
      },
    });

    // Gradient Builder UI section (Start node -> Path -> End node)
    const gradientBuilderUI = this.createElement('div', {
      className: 'gradient-builder-ui',
      attributes: {
        style: `
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          position: relative;
          min-height: 150px;
          background: radial-gradient(circle at center, rgba(255, 255, 255, 0.03) 0%, transparent 70%);
          border-radius: 20px;
          padding: 20px;
        `,
      },
    });

    // Start Node
    const startNode = this.createElement('div', {
      className: 'gradient-node main start',
      attributes: {
        style: `
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          z-index: 2;
          cursor: pointer;
          transition: transform 0.2s;
        `,
      },
    });
    const startCircle = this.createElement('div', {
      className: 'node-circle start-circle',
      attributes: {
        style: `
          width: 80px;
          height: 80px;
          border-radius: 50%;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          border: 4px solid rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border-style: dashed;
          border-color: rgba(255, 255, 255, 0.3);
        `,
        title: LanguageService.t('gradient.clickToSelectStart') || 'Click to select start color',
      },
    });
    startCircle.innerHTML =
      '<span style="font-size: 32px; color: rgba(255, 255, 255, 0.4); font-weight: 300;">+</span>';
    const startLabel = this.createElement('span', {
      className: 'node-label',
      textContent: LanguageService.t('gradient.selectColor') || 'Select Color',
      attributes: {
        style:
          'font-size: 12px; color: var(--theme-text-muted); text-transform: uppercase; font-weight: 500;',
      },
    });
    startNode.appendChild(startCircle);
    startNode.appendChild(startLabel);
    gradientBuilderUI.appendChild(startNode);

    // Gradient Path Container
    const pathContainer = this.createElement('div', {
      className: 'gradient-path-container',
      attributes: {
        style: `
          flex: 1;
          height: 6px;
          background: rgba(255, 255, 255, 0.05);
          margin: 0 16px;
          position: relative;
          border-radius: 3px;
          max-width: 400px;
        `,
      },
    });

    // Gradient Track (filled gradient)
    const gradientTrack = this.createElement('div', {
      className: 'gradient-track',
      attributes: {
        style: `
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: 3px;
          opacity: 0.8;
          background: repeating-linear-gradient(90deg, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 4px, transparent 4px, transparent 8px);
        `,
      },
    });
    pathContainer.appendChild(gradientTrack);

    // Step markers container (we'll update these dynamically)
    this.gradientContainer = pathContainer; // Repurpose for step markers
    gradientBuilderUI.appendChild(pathContainer);

    // End Node
    const endNode = this.createElement('div', {
      className: 'gradient-node main end',
      attributes: {
        style: `
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          z-index: 2;
          cursor: pointer;
          transition: transform 0.2s;
        `,
      },
    });
    const endCircle = this.createElement('div', {
      className: 'node-circle end-circle',
      attributes: {
        style: `
          width: 80px;
          height: 80px;
          border-radius: 50%;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          border: 4px solid rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border-style: dashed;
          border-color: rgba(255, 255, 255, 0.3);
        `,
        title: LanguageService.t('gradient.clickToSelectEnd') || 'Click to select end color',
      },
    });
    endCircle.innerHTML =
      '<span style="font-size: 32px; color: rgba(255, 255, 255, 0.4); font-weight: 300;">+</span>';
    const endLabel = this.createElement('span', {
      className: 'node-label',
      textContent: LanguageService.t('gradient.selectColor') || 'Select Color',
      attributes: {
        style:
          'font-size: 12px; color: var(--theme-text-muted); text-transform: uppercase; font-weight: 500;',
      },
    });
    endNode.appendChild(endCircle);
    endNode.appendChild(endLabel);
    gradientBuilderUI.appendChild(endNode);

    contentWrapper.appendChild(gradientBuilderUI);

    // Results section container
    const resultsSection = this.createElement('div', {
      attributes: {
        style:
          'width: 100%; overflow: hidden; display: flex; flex-direction: column; position: relative; flex: 1;',
      },
    });

    // Results header (using consistent section-header/section-title pattern from other tools)
    // Hidden by default - shown when dyes are selected via showEmptyState(false)
    const resultsHeader = this.createElement('div', {
      className: 'section-header',
      attributes: { style: 'width: 100%; display: none;' },
    });
    this.resultsHeader = this.createElement('span', {
      className: 'section-title',
      textContent: `${LanguageService.t('gradient.gradientResults') || 'Gradient Results'} (${this.stepCount} Steps)`,
    });
    resultsHeader.appendChild(this.resultsHeader);
    resultsSection.appendChild(resultsHeader);

    // Matches container (for harmony-cards)
    this.matchesContainer = this.createElement('div', {
      className: 'gradient-results-list',
      attributes: {
        style: `
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
          justify-content: center;
          gap: 16px;
          overflow-y: auto;
          width: 100%;
          padding: 20px 0;
          --v4-result-card-width: 280px;
        `,
      },
    });

    // Empty state message (inside results area, positioned near the gradient nodes)
    this.emptyStateContainer = this.createElement('div', {
      className: 'empty-state-message',
      attributes: {
        style: `
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          height: 100%;
          min-height: 200px;
          color: var(--theme-text-muted);
          text-align: center;
          padding: 60px 40px 40px 40px;
        `,
      },
    });
    this.emptyStateContainer.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor" style="width: 150px; height: 150px; opacity: 0.3; margin-bottom: 16px;">
        <path d="M 4 8 C 4 6 5 5 7 5 L 17 5 C 19 5 20 6 20 8 L 20 16 C 20 18 19 19 17 19 L 7 19 C 5 19 4 18 4 16 Z" fill="none" stroke="currentColor" stroke-width="1.5"/>
        <circle cx="8" cy="10" r="2" opacity="0.5" />
        <circle cx="12" cy="10" r="2" opacity="0.5" />
        <circle cx="16" cy="10" r="2" opacity="0.5" />
        <line x1="6" y1="15" x2="10" y2="15" stroke="currentColor" stroke-width="2" />
        <path d="M 10 15 L 12 13 L 12 17 Z" opacity="0.7" />
      </svg>
      <div style="font-size: 16px; color: var(--theme-text); margin-bottom: 8px;">${LanguageService.t('gradient.setStartAndEnd') || 'Set a start and end color to generate gradient steps'}</div>
      <div style="font-size: 14px; opacity: 0.7;">${LanguageService.t('gradient.clickPlusButtons') || 'Select dyes from the Color Palette to set gradient colors'}</div>
    `;

    resultsSection.appendChild(this.emptyStateContainer);
    resultsSection.appendChild(this.matchesContainer);
    contentWrapper.appendChild(resultsSection);

    // Export container (hidden by default)
    this.exportContainer = this.createElement('div', { attributes: { style: 'display: none;' } });
    contentWrapper.appendChild(this.exportContainer);

    right.appendChild(contentWrapper);

    // Store references to update dynamically
    this.startCircleElement = startCircle;
    this.startLabelElement = startLabel;
    this.endCircleElement = endCircle;
    this.endLabelElement = endLabel;
    this.gradientTrackElement = gradientTrack;
  }

  // DOM element references for dynamic updates
  private startCircleElement: HTMLElement | null = null;
  private startLabelElement: HTMLElement | null = null;
  private endCircleElement: HTMLElement | null = null;
  private endLabelElement: HTMLElement | null = null;
  private gradientTrackElement: HTMLElement | null = null;

  /**
   * Update gradient nodes and track based on current dye selections
   */
  private updateGradientNodes(): void {
    // Update Start node
    if (this.startCircleElement && this.startLabelElement) {
      if (this.startDye) {
        this.startCircleElement.style.background = this.startDye.hex;
        this.startCircleElement.style.borderStyle = 'solid';
        this.startCircleElement.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        this.startCircleElement.innerHTML = '';
        this.startLabelElement.textContent = `Start (${LanguageService.getDyeName(this.startDye.itemID) || this.startDye.name})`;
      } else {
        this.startCircleElement.style.background = 'transparent';
        this.startCircleElement.style.borderStyle = 'dashed';
        this.startCircleElement.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        this.startCircleElement.innerHTML =
          '<span style="font-size: 32px; color: rgba(255, 255, 255, 0.4); font-weight: 300;">+</span>';
        this.startLabelElement.textContent =
          LanguageService.t('gradient.selectColor') || 'Select Color';
      }
    }

    // Update End node
    if (this.endCircleElement && this.endLabelElement) {
      if (this.endDye) {
        this.endCircleElement.style.background = this.endDye.hex;
        this.endCircleElement.style.borderStyle = 'solid';
        this.endCircleElement.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        this.endCircleElement.innerHTML = '';
        this.endLabelElement.textContent = `End (${LanguageService.getDyeName(this.endDye.itemID) || this.endDye.name})`;
      } else {
        this.endCircleElement.style.background = 'transparent';
        this.endCircleElement.style.borderStyle = 'dashed';
        this.endCircleElement.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        this.endCircleElement.innerHTML =
          '<span style="font-size: 32px; color: rgba(255, 255, 255, 0.4); font-weight: 300;">+</span>';
        this.endLabelElement.textContent =
          LanguageService.t('gradient.selectColor') || 'Select Color';
      }
    }

    // Update gradient track
    if (this.gradientTrackElement) {
      if (this.startDye && this.endDye) {
        this.gradientTrackElement.style.background = `linear-gradient(to right, ${this.startDye.hex}, ${this.endDye.hex})`;
      } else if (this.startDye) {
        this.gradientTrackElement.style.background = `linear-gradient(to right, ${this.startDye.hex}, rgba(255,255,255,0.1))`;
      } else if (this.endDye) {
        this.gradientTrackElement.style.background = `linear-gradient(to right, rgba(255,255,255,0.1), ${this.endDye.hex})`;
      } else {
        this.gradientTrackElement.style.background =
          'repeating-linear-gradient(90deg, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 4px, transparent 4px, transparent 8px)';
      }
    }
  }

  /**
   * Update all results
   */
  private updateInterpolation(): void {
    // Always update gradient nodes to reflect current selection state
    this.updateGradientNodes();

    // Update results header with current step count
    if (this.resultsHeader) {
      this.resultsHeader.textContent = `${LanguageService.t('gradient.gradientResults') || 'Gradient Results'} (${this.stepCount} Steps)`;
    }

    if (!this.startDye || !this.endDye) {
      this.showEmptyState(true);
      this.currentSteps = [];
      return;
    }

    this.showEmptyState(false);
    this.calculateInterpolation();
    this.renderGradientPreview();
    this.renderIntermediateMatches();
    this.renderExportOptions();
  }

  /**
   * Show/hide empty state and matches container
   */
  private showEmptyState(show: boolean): void {
    if (this.emptyStateContainer) {
      this.emptyStateContainer.style.display = show ? 'flex' : 'none';
    }
    if (this.matchesContainer) {
      this.matchesContainer.style.display = show ? 'none' : 'flex';
    }
    // Hide results header when showing empty state
    if (this.resultsHeader?.parentElement) {
      this.resultsHeader.parentElement.style.display = show ? 'none' : 'block';
    }
  }

  /**
   * Calculate interpolation steps
   */
  private calculateInterpolation(): void {
    if (!this.startDye || !this.endDye) {
      this.currentSteps = [];
      return;
    }

    const result: InterpolationStep[] = [];
    const steps = this.stepCount;

    for (let i = 0; i < steps; i++) {
      const t = steps === 1 ? 0 : i / (steps - 1);

      let theoreticalColor: string;

      if (this.colorSpace === 'rgb') {
        // RGB interpolation (linear)
        const startRgb = ColorService.hexToRgb(this.startDye.hex);
        const endRgb = ColorService.hexToRgb(this.endDye.hex);

        const r = Math.round(startRgb.r + (endRgb.r - startRgb.r) * t);
        const g = Math.round(startRgb.g + (endRgb.g - startRgb.g) * t);
        const b = Math.round(startRgb.b + (endRgb.b - startRgb.b) * t);

        theoreticalColor = ColorService.rgbToHex(r, g, b);
      } else {
        // HSV interpolation (perceptual, with hue wraparound)
        const startHsv = ColorService.hexToHsv(this.startDye.hex);
        const endHsv = ColorService.hexToHsv(this.endDye.hex);

        // Handle hue wraparound
        let hueDiff = endHsv.h - startHsv.h;
        if (hueDiff > 180) hueDiff -= 360;
        if (hueDiff < -180) hueDiff += 360;

        const h = (startHsv.h + hueDiff * t + 360) % 360;
        const s = startHsv.s + (endHsv.s - startHsv.s) * t;
        const v = startHsv.v + (endHsv.v - startHsv.v) * t;

        theoreticalColor = ColorService.hsvToHex(h, s, v);
      }

      // Find closest dye (excluding start and end)
      const excludeIds = [this.startDye.id, this.endDye.id];
      let matchedDye = dyeService.findClosestDye(theoreticalColor, excludeIds);

      // Apply filters if available
      if (this.dyeFilters && matchedDye && this.dyeFilters.isDyeExcluded(matchedDye)) {
        // Find next closest non-excluded dye
        const allDyes = dyeService.getAllDyes();
        const filteredDyes = this.dyeFilters
          .filterDyes(allDyes)
          .filter((dye) => !excludeIds.includes(dye.id) && dye.category !== 'Facewear');
        matchedDye =
          filteredDyes.length > 0
            ? filteredDyes.reduce((best, dye) => {
                const bestDist = ColorService.getColorDistance(theoreticalColor, best.hex);
                const dyeDist = ColorService.getColorDistance(theoreticalColor, dye.hex);
                return dyeDist < bestDist ? dye : best;
              })
            : null;
      }

      const distance = matchedDye
        ? ColorService.getColorDistance(theoreticalColor, matchedDye.hex)
        : Infinity;

      result.push({
        position: t,
        theoreticalColor,
        matchedDye: matchedDye || null,
        distance: distance === Infinity ? 0 : distance,
      });
    }

    this.currentSteps = result;
  }

  /**
   * Render gradient preview with step markers on the gradient track
   */
  private renderGradientPreview(): void {
    if (!this.gradientContainer || !this.startDye || !this.endDye) return;

    // Remove existing step markers (but keep the gradient track element)
    const existingSteps = this.gradientContainer.querySelectorAll('.gradient-step');
    existingSteps.forEach((el) => el.remove());

    // Add step markers for each interpolation step
    for (let i = 0; i < this.currentSteps.length; i++) {
      const step = this.currentSteps[i];
      // Calculate position as percentage (0 to 100)
      const leftPercent = step.position * 100;

      const stepMarker = this.createElement('div', {
        className: 'gradient-step',
        attributes: {
          style: `
            position: absolute;
            top: 50%;
            left: ${leftPercent}%;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            transform: translate(-50%, -50%);
            border: 2px solid rgba(255, 255, 255, 0.8);
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
            cursor: pointer;
            z-index: 1;
            transition: transform 0.1s;
            background: ${step.theoreticalColor};
          `,
          title: `Step ${i}: ${step.matchedDye ? LanguageService.getDyeName(step.matchedDye.itemID) || step.matchedDye.name : 'No match'}`,
        },
      });

      // Hover effect
      this.on(stepMarker, 'mouseenter', () => {
        stepMarker.style.transform = 'translate(-50%, -50%) scale(1.2)';
      });
      this.on(stepMarker, 'mouseleave', () => {
        stepMarker.style.transform = 'translate(-50%, -50%)';
      });

      this.gradientContainer.appendChild(stepMarker);
    }
  }

  /**
   * Render intermediate dye matches as harmony-card styled cards
   */
  private renderIntermediateMatches(): void {
    if (!this.matchesContainer) return;
    clearContainer(this.matchesContainer);

    // Render ALL steps as cards (including start and end for complete gradient view)
    for (let i = 0; i < this.currentSteps.length; i++) {
      const step = this.currentSteps[i];
      if (!step.matchedDye) continue;

      const dye = step.matchedDye;

      // Create harmony-card
      const card = this.createElement('div', {
        className: 'harmony-card',
        attributes: {
          style: `
            flex-shrink: 0;
            width: 280px;
            background: var(--theme-card-background);
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
            display: flex;
            flex-direction: column;
            border: 1px solid var(--theme-border);
            transition: transform 0.2s, box-shadow 0.2s;
          `,
        },
      });

      // Card header
      const header = this.createElement('div', {
        className: 'card-header',
        attributes: {
          style:
            'background: rgba(0, 0, 0, 0.4); padding: 10px 16px; border-bottom: 1px solid var(--theme-border); text-align: center;',
        },
      });
      const dyeName = this.createElement('span', {
        className: 'dye-name',
        textContent: `Step ${i + 1}: ${LanguageService.getDyeName(dye.itemID) || dye.name}`,
        attributes: {
          style:
            'font-size: 14px; font-weight: 700; letter-spacing: 0.5px; color: var(--theme-text);',
        },
      });
      header.appendChild(dyeName);
      card.appendChild(header);

      // Card preview (split - shows target vs matched)
      const preview = this.createElement('div', {
        className: 'card-preview',
        attributes: {
          style: 'height: 100px; width: 100%; display: flex; position: relative; flex-shrink: 0;',
        },
      });

      // Left half - theoretical/target color
      const leftHalf = this.createElement('div', {
        className: 'preview-half',
        attributes: {
          style: `flex: 1; height: 100%; position: relative; background-color: ${step.theoreticalColor};`,
        },
      });
      const leftLabel = this.createElement('span', {
        className: 'preview-label',
        textContent: LanguageService.t('common.original') || 'Original',
        attributes: {
          style:
            'position: absolute; bottom: 4px; width: 100%; text-align: center; font-size: 9px; text-transform: uppercase; color: rgba(255, 255, 255, 0.8); text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);',
        },
      });
      leftHalf.appendChild(leftLabel);
      preview.appendChild(leftHalf);

      // Right half - matched dye color
      const rightHalf = this.createElement('div', {
        className: 'preview-half',
        attributes: {
          style: `flex: 1; height: 100%; position: relative; background-color: ${dye.hex};`,
        },
      });
      const rightLabel = this.createElement('span', {
        className: 'preview-label',
        textContent: LanguageService.t('common.match') || 'Match',
        attributes: {
          style:
            'position: absolute; bottom: 4px; width: 100%; text-align: center; font-size: 9px; text-transform: uppercase; color: rgba(255, 255, 255, 0.8); text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);',
        },
      });
      rightHalf.appendChild(rightLabel);
      preview.appendChild(rightHalf);
      card.appendChild(preview);

      // Card details (technical + acquisition)
      // Check if we need two columns or just one
      const hasAcquisitionCol =
        this.displayOptions.showAcquisition || this.displayOptions.showPrice;
      const gridCols = hasAcquisitionCol ? '1fr 1fr' : '1fr';
      const details = this.createElement('div', {
        className: 'card-details',
        attributes: {
          style: `padding: 12px; display: grid; grid-template-columns: ${gridCols}; gap: 12px; background: linear-gradient(to bottom, var(--theme-card-background), var(--theme-background));`,
        },
      });

      // Build technical column content based on displayOptions
      // Using styles that match v4-result-card for consistency
      const techCol = this.createElement('div', {
        className: 'detail-col',
        attributes: { style: 'display: flex; flex-direction: column; gap: 4px;' },
      });
      const techHeader = `<div style="font-size: 10px; font-weight: 600; text-transform: uppercase; color: var(--theme-text-muted); margin-bottom: 4px; border-bottom: 1px solid var(--theme-border); padding-bottom: 2px;">${LanguageService.t('common.technical') || 'Technical'}</div>`;
      const rowStyle =
        'font-size: 11px; display: flex; justify-content: space-between; align-items: baseline;';
      const labelStyle = 'color: var(--theme-text-muted);';
      const valueStyle =
        "color: var(--theme-text); font-family: 'Consolas', 'Monaco', monospace; text-align: right;";

      // Build format rows based on displayOptions
      const formatRows: string[] = [];

      // Delta-E (always important for gradient matching)
      if (this.displayOptions.showDeltaE) {
        const deltaColor =
          step.distance < 2 ? '#4caf50' : step.distance < 5 ? '#ffc107' : '#f44336';
        formatRows.push(
          `<div style="${rowStyle}"><span style="${labelStyle}">ΔE</span><span style="color: ${deltaColor};">${step.distance.toFixed(2)}</span></div>`
        );
      }

      // HEX
      if (this.displayOptions.showHex) {
        formatRows.push(
          `<div style="${rowStyle}"><span style="${labelStyle}">HEX</span><span style="${valueStyle}">${dye.hex.toUpperCase()}</span></div>`
        );
      }

      // RGB
      if (this.displayOptions.showRgb) {
        formatRows.push(
          `<div style="${rowStyle}"><span style="${labelStyle}">RGB</span><span style="${valueStyle}">${this.hexToRgbString(dye.hex)}</span></div>`
        );
      }

      // HSV
      if (this.displayOptions.showHsv) {
        const hsv = ColorService.hexToHsv(dye.hex);
        formatRows.push(
          `<div style="${rowStyle}"><span style="${labelStyle}">HSV</span><span style="${valueStyle}">${Math.round(hsv.h)}°, ${Math.round(hsv.s)}%, ${Math.round(hsv.v)}%</span></div>`
        );
      }

      // LAB
      if (this.displayOptions.showLab) {
        const lab = ColorService.hexToLab(dye.hex);
        formatRows.push(
          `<div style="${rowStyle}"><span style="${labelStyle}">LAB</span><span style="${valueStyle}">${lab.L.toFixed(0)}, ${lab.a.toFixed(0)}, ${lab.b.toFixed(0)}</span></div>`
        );
      }

      techCol.innerHTML = techHeader + formatRows.join('');
      details.appendChild(techCol);

      // Acquisition column (conditionally rendered)
      const showAcquisition = this.displayOptions.showAcquisition;
      const showPrice = this.displayOptions.showPrice;

      if (showAcquisition || showPrice) {
        const acqCol = this.createElement('div', {
          className: 'detail-col',
          attributes: { style: 'display: flex; flex-direction: column; gap: 4px;' },
        });

        const acqHeader = `<div style="font-size: 10px; font-weight: 600; text-transform: uppercase; color: var(--theme-text-muted); margin-bottom: 4px; border-bottom: 1px solid var(--theme-border); padding-bottom: 2px;">${LanguageService.t('common.acquisition') || 'Acquisition'}</div>`;

        // Build acquisition rows
        const acqRows: string[] = [];

        // Source and Cost rows (when showAcquisition is true)
        if (showAcquisition) {
          const source = dye.acquisition || 'Vendor';
          const vendorCost = dye.cost !== undefined ? `${dye.cost.toLocaleString()} G` : '—';
          acqRows.push(
            `<div style="${rowStyle}"><span style="${labelStyle}">${LanguageService.t('common.source') || 'Source'}</span><span style="${valueStyle}">${source}</span></div>`
          );
          acqRows.push(
            `<div style="${rowStyle}"><span style="${labelStyle}">${LanguageService.t('common.cost') || 'Cost'}</span><span style="${valueStyle}">${vendorCost}</span></div>`
          );
        }

        // Market server and price rows (when showPrice is true)
        if (showPrice) {
          const priceInfo = this.priceData.get(dye.itemID);
          // Resolve worldId to world name using WorldService
          // Fall back to selected datacenter/server if worldId not available
          const worldName = priceInfo?.worldId
            ? WorldService.getWorldName(priceInfo.worldId)
            : undefined;
          const marketServer =
            worldName || this.getActiveMarketBoard()?.getSelectedServer() || 'N/A';
          const marketPrice = priceInfo ? `${priceInfo.currentMinPrice.toLocaleString()} G` : null;

          acqRows.push(
            `<div style="${rowStyle}"><span style="${labelStyle}">${LanguageService.t('common.market') || 'Market'}</span><span style="${valueStyle}">${marketServer}</span></div>`
          );

          if (marketPrice) {
            acqRows.push(
              `<div style="font-size: 13px; font-weight: 600; color: var(--theme-primary); text-align: right;">${marketPrice}</div>`
            );
          }
        }

        acqCol.innerHTML = acqHeader + acqRows.join('');
        details.appendChild(acqCol);
      }

      card.appendChild(details);

      // Card actions
      const actions = this.createElement('div', {
        className: 'card-actions',
        attributes: {
          style:
            'padding: 8px; display: flex; justify-content: center; border-top: 1px solid var(--theme-border); background: rgba(0, 0, 0, 0.2);',
        },
      });
      const actionRow = this.createElement('div', {
        className: 'action-row',
        attributes: { style: 'display: flex; gap: 8px; align-items: center; width: 100%;' },
      });

      // Primary action button with smart slot selection dropdown
      const selectBtnContainer = this.createElement('div', {
        className: 'select-dye-container',
        attributes: { style: 'position: relative; flex: 1;' },
      });

      const selectBtn = this.createElement('button', {
        className: 'primary-action-btn',
        textContent: LanguageService.t('common.selectDye') || 'Select Dye',
        attributes: {
          style: `
            width: 100%;
            padding: 8px;
            font-size: 12px;
            font-weight: 600;
            background: var(--theme-primary);
            color: var(--theme-card-background, #121212);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.15s;
          `,
        },
      });

      // Create dropdown menu for slot selection
      const selectMenu = this.createElement('div', {
        className: 'select-dye-menu',
        attributes: {
          style: `
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            margin-bottom: 4px;
            min-width: 160px;
            padding: 4px 0;
            background: var(--theme-card-background);
            border: 1px solid var(--theme-border);
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 100;
            display: none;
          `,
        },
      });

      // Determine recommended option based on step position
      const isEarlyStep = i < this.currentSteps.length / 2;
      const startLabel = LanguageService.t('mixer.startDye') || 'Start Dye';
      const endLabel = LanguageService.t('mixer.endDye') || 'End Dye';
      const recommendedLabel = ` (${LanguageService.t('common.recommended') || 'Recommended'})`;

      // Create menu options (recommended option first)
      const options = isEarlyStep
        ? [
            { label: `Set as ${startLabel}${recommendedLabel}`, slot: 'start' as const },
            { label: `Set as ${endLabel}`, slot: 'end' as const },
          ]
        : [
            { label: `Set as ${endLabel}${recommendedLabel}`, slot: 'end' as const },
            { label: `Set as ${startLabel}`, slot: 'start' as const },
          ];

      options.forEach((option, optIndex) => {
        const menuItem = this.createElement('button', {
          textContent: option.label,
          attributes: {
            style: `
              display: block;
              width: 100%;
              padding: 8px 12px;
              text-align: left;
              font-size: 12px;
              background: transparent;
              border: none;
              color: var(--theme-text);
              cursor: pointer;
              transition: background 0.15s;
              ${optIndex === 0 ? 'font-weight: 600;' : ''}
            `,
          },
        });

        // Hover effect
        this.on(menuItem, 'mouseenter', () => {
          menuItem.style.background = 'rgba(255, 255, 255, 0.1)';
        });
        this.on(menuItem, 'mouseleave', () => {
          menuItem.style.background = 'transparent';
        });

        // Click handler for slot selection
        this.on(menuItem, 'click', (e) => {
          e.stopPropagation();
          if (option.slot === 'start') {
            this.selectedDyes[0] = dye;
            logger.info(`[GradientTool] Set ${dye.name} as start dye from result card`);
          } else {
            this.selectedDyes[1] = dye;
            logger.info(`[GradientTool] Set ${dye.name} as end dye from result card`);
          }

          // Update UI
          this.isExternalSelection = true;
          try {
            if (this.dyeSelector) {
              this.dyeSelector.setSelectedDyes(this.selectedDyes);
            }
          } finally {
            this.isExternalSelection = false;
          }
          this.saveSelectedDyes();
          this.updateSelectedDyesDisplay();
          this.updateMobileSelectedDyesDisplay();
          this.updateInterpolation();
          this.updateDrawerContent();

          // Hide menu
          selectMenu.style.display = 'none';
        });

        selectMenu.appendChild(menuItem);
      });

      // Toggle menu on button click
      this.on(selectBtn, 'click', (e) => {
        e.stopPropagation();
        const isVisible = selectMenu.style.display === 'block';
        // Hide all other select menus first
        document.querySelectorAll('.select-dye-menu').forEach((menu) => {
          (menu as HTMLElement).style.display = 'none';
        });
        selectMenu.style.display = isVisible ? 'none' : 'block';
      });

      // Close menu when clicking outside
      this.on(document, 'click', () => {
        selectMenu.style.display = 'none';
      });

      selectBtnContainer.appendChild(selectBtn);
      selectBtnContainer.appendChild(selectMenu);
      actionRow.appendChild(selectBtnContainer);

      // Context menu button (matching mockup structure)
      const contextMenuContainer = this.createElement('div', {
        className: 'context-menu-container',
        attributes: { style: 'position: relative;' },
      });

      const contextMenuBtn = this.createElement('button', {
        className: 'context-menu-btn',
        attributes: {
          style: `
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border-radius: 8px;
            border: none;
            background: transparent;
            cursor: pointer;
            color: var(--theme-text-muted);
            transition: color 0.2s, background-color 0.2s;
          `,
          title: LanguageService.t('harmony.actions') || 'Actions',
        },
      });

      // Three-dot vertical icon (matching mockup's SVG path)
      contextMenuBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor" style="width: 18px; height: 18px;">
          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
        </svg>
      `;

      // Hover effects for context menu button
      this.on(contextMenuBtn, 'mouseenter', () => {
        contextMenuBtn.style.color = 'var(--theme-text)';
        contextMenuBtn.style.background = 'var(--theme-card-hover, rgba(255,255,255,0.1))';
      });
      this.on(contextMenuBtn, 'mouseleave', () => {
        contextMenuBtn.style.color = 'var(--theme-text-muted)';
        contextMenuBtn.style.background = 'transparent';
      });

      // Create dropdown menu for context actions
      const contextMenu = this.createElement('div', {
        className: 'context-dropdown-menu',
        attributes: {
          style: `
            position: absolute;
            bottom: 100%;
            right: 0;
            margin-bottom: 4px;
            min-width: 180px;
            padding: 4px 0;
            background: var(--theme-card-background);
            border: 1px solid var(--theme-border);
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 100;
            display: none;
          `,
        },
      });

      // Context menu actions
      const contextActions = [
        {
          label: LanguageService.t('harmony.addToComparison') || 'Add to Comparison',
          action: 'comparison',
        },
        { label: LanguageService.t('harmony.addToMixer') || 'Add to Mixer', action: 'mixer' },
        { label: LanguageService.t('harmony.copyHex') || 'Copy Hex Code', action: 'copy' },
      ];

      contextActions.forEach((item) => {
        const menuItem = this.createElement('button', {
          textContent: item.label,
          attributes: {
            style: `
              display: block;
              width: 100%;
              padding: 8px 12px;
              text-align: left;
              font-size: 12px;
              background: transparent;
              border: none;
              color: var(--theme-text);
              cursor: pointer;
              transition: background 0.15s;
            `,
          },
        });

        this.on(menuItem, 'mouseenter', () => {
          menuItem.style.background = 'rgba(255, 255, 255, 0.1)';
        });
        this.on(menuItem, 'mouseleave', () => {
          menuItem.style.background = 'transparent';
        });

        this.on(menuItem, 'click', (e) => {
          e.stopPropagation();
          contextMenu.style.display = 'none';

          if (item.action === 'copy') {
            navigator.clipboard.writeText(dye.hex).then(() => {
              ToastService.success(LanguageService.t('common.copied') || 'Copied to clipboard!');
            });
          } else if (item.action === 'comparison') {
            // Store in localStorage and navigate
            const existing = StorageService.getItem<number[]>('v3_comparison_selected_dyes') || [];
            if (!existing.includes(dye.id) && existing.length < 4) {
              existing.push(dye.id);
              StorageService.setItem('v3_comparison_selected_dyes', existing);
              ToastService.success(`${dye.name} added to comparison`);
            }
          } else if (item.action === 'mixer') {
            const existing = StorageService.getItem<number[]>('v3_mixer_selected_dyes') || [];
            if (!existing.includes(dye.id) && existing.length < 2) {
              existing.push(dye.id);
              StorageService.setItem('v3_mixer_selected_dyes', existing);
              ToastService.success(`${dye.name} added to mixer`);
            }
          }
        });

        contextMenu.appendChild(menuItem);
      });

      // Toggle context menu on button click
      this.on(contextMenuBtn, 'click', (e) => {
        e.stopPropagation();
        const isVisible = contextMenu.style.display === 'block';
        // Hide all other context menus first
        document.querySelectorAll('.context-dropdown-menu').forEach((menu) => {
          (menu as HTMLElement).style.display = 'none';
        });
        contextMenu.style.display = isVisible ? 'none' : 'block';
      });

      // Close context menu when clicking outside
      this.on(document, 'click', () => {
        contextMenu.style.display = 'none';
      });

      contextMenuContainer.appendChild(contextMenuBtn);
      contextMenuContainer.appendChild(contextMenu);
      actionRow.appendChild(contextMenuContainer);

      actions.appendChild(actionRow);
      card.appendChild(actions);

      // Hover effects
      this.on(card, 'mouseenter', () => {
        card.style.transform = 'translateY(-4px)';
        card.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.4)';
        card.style.borderColor = 'var(--theme-text-muted)';
      });
      this.on(card, 'mouseleave', () => {
        card.style.transform = '';
        card.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)';
        card.style.borderColor = 'var(--theme-border)';
      });

      this.matchesContainer.appendChild(card);
    }

    // If no steps have matches
    if (this.currentSteps.every((s) => !s.matchedDye)) {
      const noSteps = this.createElement('div', {
        textContent: LanguageService.t('gradient.noMatchesFound') || 'No matching dyes found',
        attributes: {
          style:
            'padding: 24px; text-align: center; font-size: 14px; color: var(--theme-text-muted);',
        },
      });
      this.matchesContainer.appendChild(noSteps);
    }
  }

  /**
   * Helper to convert hex to RGB string
   */
  private hexToRgbString(hex: string): string {
    const rgb = ColorService.hexToRgb(hex);
    return `${rgb.r},${rgb.g},${rgb.b}`;
  }

  /**
   * Render export options
   */
  private renderExportOptions(): void {
    if (!this.exportContainer) return;
    clearContainer(this.exportContainer);

    const card = this.createElement('div', {
      className: 'p-4 rounded-lg flex items-center justify-between',
      attributes: {
        style: 'background: var(--theme-card-background); border: 1px solid var(--theme-border);',
      },
    });

    const label = this.createElement('span', {
      className: 'text-sm font-medium',
      textContent: LanguageService.t('mixer.exportPalette') || 'Export Palette',
      attributes: { style: 'color: var(--theme-text);' },
    });
    card.appendChild(label);

    const buttonGroup = this.createElement('div', { className: 'flex gap-2' });

    // Copy button
    const copyBtn = this.createElement('button', {
      className: 'flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors',
      attributes: {
        style: 'background: var(--theme-background-secondary); color: var(--theme-text);',
      },
    });
    const copyIcon = this.createElement('span', { className: 'w-4 h-4' });
    copyIcon.innerHTML = ICON_EXPORT;
    copyBtn.appendChild(copyIcon);
    copyBtn.appendChild(document.createTextNode(LanguageService.t('common.copy') || 'Copy'));

    this.on(copyBtn, 'click', () => this.copyPalette());
    buttonGroup.appendChild(copyBtn);

    // Download button
    const downloadBtn = this.createElement('button', {
      className: 'flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors',
      attributes: { style: 'background: var(--theme-primary); color: var(--theme-text-header);' },
    });
    const downloadIcon = this.createElement('span', { className: 'w-4 h-4' });
    downloadIcon.innerHTML = ICON_EXPORT;
    downloadBtn.appendChild(downloadIcon);
    downloadBtn.appendChild(
      document.createTextNode(LanguageService.t('common.download') || 'Download')
    );

    this.on(downloadBtn, 'click', () => this.downloadPalette());
    buttonGroup.appendChild(downloadBtn);

    card.appendChild(buttonGroup);
    this.exportContainer.appendChild(card);
  }

  /**
   * Copy palette to clipboard
   */
  private copyPalette(): void {
    if (!this.startDye || !this.endDye) return;

    const lines: string[] = [
      `Start: ${this.startDye.name} (${this.startDye.hex})`,
      `End: ${this.endDye.name} (${this.endDye.hex})`,
      `Steps: ${this.stepCount}, Color Space: ${this.colorSpace.toUpperCase()}`,
      '',
      'Intermediate Matches:',
    ];

    for (let i = 1; i < this.currentSteps.length - 1; i++) {
      const step = this.currentSteps[i];
      if (step.matchedDye) {
        lines.push(
          `  ${i}. ${step.matchedDye.name} (${step.matchedDye.hex}) - Distance: ${step.distance.toFixed(1)}`
        );
      }
    }

    navigator.clipboard
      .writeText(lines.join('\n'))
      .then(() => {
        ToastService.success(LanguageService.t('common.copied') || 'Copied to clipboard');
      })
      .catch(() => {
        ToastService.error(LanguageService.t('common.copyFailed') || 'Failed to copy');
      });
  }

  /**
   * Download palette as JSON
   */
  private downloadPalette(): void {
    if (!this.startDye || !this.endDye) return;

    const data = {
      startDye: { name: this.startDye.name, hex: this.startDye.hex, id: this.startDye.id },
      endDye: { name: this.endDye.name, hex: this.endDye.hex, id: this.endDye.id },
      stepCount: this.stepCount,
      colorSpace: this.colorSpace,
      intermediates: this.currentSteps.slice(1, -1).map((step, i) => ({
        index: i + 1,
        theoreticalColor: step.theoreticalColor,
        matchedDye: step.matchedDye
          ? {
              name: step.matchedDye.name,
              hex: step.matchedDye.hex,
              id: step.matchedDye.id,
            }
          : null,
        distance: step.distance,
      })),
      generatedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dye-gradient-${this.startDye.name}-to-${this.endDye.name}.json`;
    a.click();
    URL.revokeObjectURL(url);

    ToastService.success(LanguageService.t('common.downloaded') || 'Downloaded');
  }

  // ============================================================================
  // Mobile Drawer Content
  // ============================================================================

  private renderDrawerContent(): void {
    if (!this.options.drawerContent) return;

    const drawer = this.options.drawerContent;
    clearContainer(drawer);

    // Section 1: Dye Selection (consolidated - select 2 dyes)
    const dyeSelectionContainer = this.createElement('div');
    drawer.appendChild(dyeSelectionContainer);
    this.mobileDyeSelectionPanel = new CollapsiblePanel(dyeSelectionContainer, {
      title: LanguageService.t('mixer.dyeSelection') || 'Dye Selection',
      storageKey: 'v3_mixer_mobile_dye_selection_panel',
      defaultOpen: true,
      icon: ICON_PALETTE,
    });
    this.mobileDyeSelectionPanel.init();
    const mobileDyeSelectionContent = this.createElement('div', { className: 'p-4' });
    this.renderMobileDyeSelector(mobileDyeSelectionContent);
    this.mobileDyeSelectionPanel.setContent(mobileDyeSelectionContent);

    // Section 2: Interpolation Settings (collapsible)
    const settingsContainer = this.createElement('div');
    drawer.appendChild(settingsContainer);
    this.mobileSettingsPanel = new CollapsiblePanel(settingsContainer, {
      title: LanguageService.t('mixer.interpolationSettings') || 'Interpolation Settings',
      storageKey: 'v3_mixer_mobile_settings_panel',
      defaultOpen: true,
      icon: ICON_STAIRS,
    });
    this.mobileSettingsPanel.init();
    const mobileSettingsContent = this.createElement('div', { className: 'p-4' });
    this.renderMobileSettings(mobileSettingsContent);
    this.mobileSettingsPanel.setContent(mobileSettingsContent);

    // Section 3: Dye Filters (collapsible)
    const filtersContainer = this.createElement('div');
    drawer.appendChild(filtersContainer);
    this.mobileFiltersPanel = new CollapsiblePanel(filtersContainer, {
      title: LanguageService.t('filters.advancedFilters') || 'Advanced Dye Filters',
      storageKey: 'v3_mixer_mobile_filters',
      defaultOpen: false,
      icon: ICON_FILTER,
    });
    this.mobileFiltersPanel.init();

    const mobileFiltersContent = this.createElement('div');
    this.mobileDyeFilters = new DyeFilters(mobileFiltersContent, {
      storageKeyPrefix: 'v3_mixer', // Share filter state with desktop
      hideHeader: true,
      onFilterChange: () => {
        this.updateInterpolation();
      },
    });
    this.mobileDyeFilters.render();
    this.mobileDyeFilters.bindEvents();
    this.mobileFiltersPanel.setContent(mobileFiltersContent);

    // Section 4: Market Board (collapsible)
    const marketContainer = this.createElement('div');
    drawer.appendChild(marketContainer);
    this.mobileMarketPanel = new CollapsiblePanel(marketContainer, {
      title: LanguageService.t('marketBoard.title') || 'Market Board',
      storageKey: 'v3_mixer_mobile_market',
      defaultOpen: false,
      icon: ICON_MARKET,
    });
    this.mobileMarketPanel.init();

    const mobileMarketContent = this.createElement('div');
    this.mobileMarketBoard = new MarketBoard(mobileMarketContent);
    this.mobileMarketBoard.init();

    // Listen for price toggle changes (mobile - service manages state, we just react)
    mobileMarketContent.addEventListener('showPricesChanged', ((_event: Event) => {
      if (this.showPrices) {
        void this.fetchPricesForDisplayedDyes();
      } else {
        // Prices disabled - update displays to remove price indicators
        this.updateSelectedDyesDisplay();
        this.updateMobileSelectedDyesDisplay();
        this.renderIntermediateMatches();
      }
    }) as EventListener);

    // Listen for server changes (mobile)
    mobileMarketContent.addEventListener('server-changed', (() => {
      if (this.showPrices) {
        this.fetchPricesForDisplayedDyes();
      }
    }) as EventListener);

    // Listen for category changes (mobile)
    mobileMarketContent.addEventListener('categories-changed', (() => {
      if (this.showPrices) {
        this.fetchPricesForDisplayedDyes();
      }
    }) as EventListener);

    // Listen for refresh requests (mobile)
    mobileMarketContent.addEventListener('refresh-requested', (() => {
      if (this.showPrices) {
        this.fetchPricesForDisplayedDyes();
      }
    }) as EventListener);

    this.mobileMarketPanel.setContent(mobileMarketContent);
  }

  /**
   * Render consolidated mobile dye selector section (select 2 dyes: start and end)
   */
  private renderMobileDyeSelector(container: HTMLElement): void {
    const dyeContainer = this.createElement('div', { className: 'space-y-3' });

    // Instruction text
    const instruction = this.createElement('p', {
      className: 'text-sm mb-2',
      textContent:
        LanguageService.t('mixer.selectTwoDyes') || 'Select two dyes to create a gradient',
      attributes: { style: 'color: var(--theme-text-muted);' },
    });
    dyeContainer.appendChild(instruction);

    // Selected dyes display
    const displayContainer = this.createElement('div', {
      className: 'mobile-selected-dyes-display space-y-2',
    });
    dyeContainer.appendChild(displayContainer);
    this.mobileSelectedDyesContainer = displayContainer;

    this.updateMobileSelectedDyesDisplay();

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
      hideSelectedChips: true, // We show selections above with Start/End labels
    });
    selector.init();

    // Store reference
    this.mobileDyeSelector = selector;

    // Listen for selection changes
    selectorContainer.addEventListener('selection-changed', () => {
      // Skip if this change was triggered by external selection (e.g., from Color Palette drawer)
      if (this.isExternalSelection) {
        return;
      }
      this.selectedDyes = selector.getSelectedDyes();
      this.saveSelectedDyes();
      // Sync to desktop selector
      this.dyeSelector?.setSelectedDyes(this.selectedDyes);
      this.updateSelectedDyesDisplay();
      this.updateMobileSelectedDyesDisplay();
      this.updateInterpolation();
    });

    // Set initial selection if dyes were loaded from storage
    if (this.selectedDyes.length > 0) {
      selector.setSelectedDyes(this.selectedDyes);
    }

    container.appendChild(dyeContainer);
  }

  /**
   * Update mobile selected dyes display with Start/End labels and remove buttons
   */
  private updateMobileSelectedDyesDisplay(): void {
    if (!this.mobileSelectedDyesContainer) return;
    clearContainer(this.mobileSelectedDyesContainer);

    if (this.selectedDyes.length === 0) {
      // Empty state - dashed border placeholder
      const placeholder = this.createElement('div', {
        className: 'p-2 rounded-lg border-2 border-dashed text-center text-sm',
        textContent: LanguageService.t('mixer.selectDyes') || 'Select dyes below',
        attributes: {
          style: 'border-color: var(--theme-border); color: var(--theme-text-muted);',
        },
      });
      this.mobileSelectedDyesContainer.appendChild(placeholder);
      return;
    }

    // Display each selected dye with role label
    const labels = [
      LanguageService.t('mixer.startDye') || 'Start',
      LanguageService.t('mixer.endDye') || 'End',
    ];

    for (let i = 0; i < this.selectedDyes.length; i++) {
      const dye = this.selectedDyes[i];
      const label = labels[i];

      const card = this.createElement('div', {
        className: 'flex items-center gap-2 p-2 rounded-lg',
        attributes: { style: 'background: var(--theme-background-secondary);' },
      });

      // Color swatch
      const swatch = this.createElement('div', {
        className: 'w-8 h-8 rounded border',
        attributes: {
          style: `background: ${dye.hex}; border-color: var(--theme-border);`,
        },
      });
      card.appendChild(swatch);

      // Info section
      const info = this.createElement('div', { className: 'flex-1 min-w-0' });

      // Role label and dye name on same line for mobile
      const labelAndName = this.createElement('div', { className: 'flex items-center gap-2' });
      const roleLabel = this.createElement('span', {
        className: 'text-xs font-semibold uppercase',
        textContent: label,
        attributes: { style: 'color: var(--theme-primary);' },
      });
      const name = this.createElement('span', {
        className: 'text-sm font-medium truncate',
        textContent: LanguageService.getDyeName(dye.itemID) || dye.name,
        attributes: { style: 'color: var(--theme-text);' },
      });
      labelAndName.appendChild(roleLabel);
      labelAndName.appendChild(name);
      info.appendChild(labelAndName);

      card.appendChild(info);

      // Remove button
      const removeBtn = this.createElement('button', {
        className: 'w-6 h-6 flex items-center justify-center rounded-full transition-colors',
        textContent: '\u00D7',
        attributes: {
          style:
            'background: var(--theme-card-hover); color: var(--theme-text-muted); font-size: 1rem;',
          title: LanguageService.t('common.remove') || 'Remove',
        },
      });

      this.on(removeBtn, 'click', () => {
        // Remove this dye from selection
        const newSelection = this.selectedDyes.filter((d) => d.id !== dye.id);
        this.selectedDyes = newSelection;
        this.mobileDyeSelector?.setSelectedDyes(newSelection);
        this.dyeSelector?.setSelectedDyes(newSelection);
        this.saveSelectedDyes();
        this.updateSelectedDyesDisplay();
        this.updateMobileSelectedDyesDisplay();
        this.updateInterpolation();
      });

      card.appendChild(removeBtn);
      this.mobileSelectedDyesContainer.appendChild(card);
    }
  }

  /**
   * Render mobile interpolation settings
   */
  private renderMobileSettings(container: HTMLElement): void {
    const settingsContainer = this.createElement('div', { className: 'space-y-4' });

    // Steps slider
    const stepsGroup = this.createElement('div');
    const stepsLabel = this.createElement('label', {
      className: 'flex items-center justify-between text-sm mb-2',
    });
    const stepsText = this.createElement('span', {
      textContent: LanguageService.t('mixer.steps') || 'Steps',
      attributes: { style: 'color: var(--theme-text);' },
    });
    this.mobileStepValueDisplay = this.createElement('span', {
      className: 'number',
      textContent: String(this.stepCount),
      attributes: { style: 'color: var(--theme-text-muted);' },
    });
    stepsLabel.appendChild(stepsText);
    stepsLabel.appendChild(this.mobileStepValueDisplay);
    stepsGroup.appendChild(stepsLabel);

    const stepsInput = this.createElement('input', {
      className: 'w-full',
      attributes: {
        type: 'range',
        min: '2',
        max: '10',
        value: String(this.stepCount),
        style: 'accent-color: var(--theme-primary);',
      },
    }) as HTMLInputElement;

    this.on(stepsInput, 'input', () => {
      this.stepCount = parseInt(stepsInput.value, 10);
      // Update both displays
      if (this.mobileStepValueDisplay) {
        this.mobileStepValueDisplay.textContent = String(this.stepCount);
      }
      if (this.stepValueDisplay) {
        this.stepValueDisplay.textContent = String(this.stepCount);
      }
      StorageService.setItem(STORAGE_KEYS.stepCount, this.stepCount);
      this.updateInterpolation();
    });

    stepsGroup.appendChild(stepsInput);
    settingsContainer.appendChild(stepsGroup);

    // Color space toggle
    const colorSpaceGroup = this.createElement('div');
    const colorSpaceLabel = this.createElement('label', {
      className: 'block text-sm mb-2',
      textContent: LanguageService.t('mixer.colorSpace') || 'Color Space',
      attributes: { style: 'color: var(--theme-text);' },
    });
    colorSpaceGroup.appendChild(colorSpaceLabel);

    const buttonContainer = this.createElement('div', { className: 'flex gap-2' });

    const rgbBtn = this.createElement('button', {
      className: 'flex-1 px-3 py-2 text-sm rounded-lg transition-colors',
      textContent: 'RGB',
      attributes: {
        style:
          this.colorSpace === 'rgb'
            ? 'background: var(--theme-primary); color: var(--theme-text-header);'
            : 'background: var(--theme-background-secondary); color: var(--theme-text);',
      },
    });

    const hsvBtn = this.createElement('button', {
      className: 'flex-1 px-3 py-2 text-sm rounded-lg transition-colors',
      textContent: 'HSV',
      attributes: {
        style:
          this.colorSpace === 'hsv'
            ? 'background: var(--theme-primary); color: var(--theme-text-header);'
            : 'background: var(--theme-background-secondary); color: var(--theme-text);',
      },
    });

    this.on(rgbBtn, 'click', () => {
      this.colorSpace = 'rgb';
      StorageService.setItem(STORAGE_KEYS.colorSpace, 'rgb');
      rgbBtn.setAttribute(
        'style',
        'background: var(--theme-primary); color: var(--theme-text-header);'
      );
      hsvBtn.setAttribute(
        'style',
        'background: var(--theme-background-secondary); color: var(--theme-text);'
      );
      this.updateInterpolation();
    });

    this.on(hsvBtn, 'click', () => {
      this.colorSpace = 'hsv';
      StorageService.setItem(STORAGE_KEYS.colorSpace, 'hsv');
      hsvBtn.setAttribute(
        'style',
        'background: var(--theme-primary); color: var(--theme-text-header);'
      );
      rgbBtn.setAttribute(
        'style',
        'background: var(--theme-background-secondary); color: var(--theme-text);'
      );
      this.updateInterpolation();
    });

    buttonContainer.appendChild(rgbBtn);
    buttonContainer.appendChild(hsvBtn);
    colorSpaceGroup.appendChild(buttonContainer);
    settingsContainer.appendChild(colorSpaceGroup);

    container.appendChild(settingsContainer);
  }

  /**
   * Update drawer content (called when state changes from desktop)
   * Syncs mobile selector with current state
   */
  private updateDrawerContent(): void {
    // Sync mobile selector with current state (if it exists)
    // Use guard flag to prevent event handler from overwriting state
    if (this.mobileDyeSelector && this.selectedDyes.length > 0) {
      this.isExternalSelection = true;
      try {
        this.mobileDyeSelector.setSelectedDyes(this.selectedDyes);
      } finally {
        this.isExternalSelection = false;
      }
    }
    // Update the mobile display
    this.updateMobileSelectedDyesDisplay();
  }

  // ============================================================================
  // Market Board Integration
  // ============================================================================

  /**
   * Get an active MarketBoard instance that has showPrices enabled.
   * This handles the case where prices are enabled on mobile vs desktop.
   */
  private getActiveMarketBoard(): MarketBoard | null {
    // Check desktop MarketBoard first
    if (this.marketBoard?.getShowPrices()) {
      return this.marketBoard;
    }
    // Fall back to mobile MarketBoard
    if (this.mobileMarketBoard?.getShowPrices()) {
      return this.mobileMarketBoard;
    }
    // If showPrices is enabled but neither MarketBoard reports it,
    // use desktop as fallback (this handles the case where the event
    // was just fired and the MarketBoard state is in sync)
    if (this.showPrices && this.marketBoard) {
      return this.marketBoard;
    }
    if (this.showPrices && this.mobileMarketBoard) {
      return this.mobileMarketBoard;
    }
    return null;
  }

  /**
   * Fetch prices for all displayed dyes (start, end, and intermediate matches)
   * Uses shared MarketBoardService for centralized price caching.
   */
  private async fetchPricesForDisplayedDyes(): Promise<void> {
    if (!this.showPrices) {
      return;
    }

    const dyesToFetch: Dye[] = [];

    // Add start dye if selected
    if (this.startDye && this.marketBoardService.shouldFetchPrice(this.startDye)) {
      dyesToFetch.push(this.startDye);
    }

    // Add end dye if selected
    if (this.endDye && this.marketBoardService.shouldFetchPrice(this.endDye)) {
      dyesToFetch.push(this.endDye);
    }

    // Add intermediate dyes from interpolation steps
    for (const step of this.currentSteps) {
      if (step.matchedDye && this.marketBoardService.shouldFetchPrice(step.matchedDye)) {
        // Avoid duplicates
        if (!dyesToFetch.some((d) => d.id === step.matchedDye!.id)) {
          dyesToFetch.push(step.matchedDye);
        }
      }
    }

    if (dyesToFetch.length > 0) {
      try {
        const prices = await this.marketBoardService.fetchPricesForDyes(dyesToFetch);
        // Note: Service updates its shared cache, priceData getter returns latest
        logger.info(`[GradientTool] Fetched prices for ${prices.size} dyes`);
      } catch (error) {
        logger.error('[GradientTool] Failed to fetch prices:', error);
      }
    }

    // Always update displays (even if no prices were fetched)
    this.updateSelectedDyesDisplay();
    this.updateMobileSelectedDyesDisplay();
    this.renderIntermediateMatches();
  }

  /**
   * Format price for display
   */
  private formatPrice(dye: Dye): string | null {
    if (!this.showPrices) return null;

    const price = this.priceData.get(dye.itemID);
    if (!price) return null;

    return MarketBoard.formatPrice(price.currentMinPrice);
  }

  /**
   * Clear all dye selections and return to empty state.
   * Called when "Clear All Dyes" button is clicked in Color Palette.
   */
  public clearDyes(): void {
    this.selectedDyes = [];
    this.currentSteps = [];

    // Clear from storage (main key used for persistence)
    StorageService.removeItem(STORAGE_KEYS.selectedDyes);
    logger.info('[GradientTool] All dyes cleared');

    // Update dye selectors
    this.dyeSelector?.setSelectedDyes([]);
    this.mobileDyeSelector?.setSelectedDyes([]);

    // Clear UI containers
    if (this.matchesContainer) {
      clearContainer(this.matchesContainer);
    }

    // Show empty state
    this.showEmptyState(true);
    this.updateSelectedDyesDisplay();
    this.updateMobileSelectedDyesDisplay();
    this.updateDrawerContent();
  }

  /**
   * Add a dye from external source (Color Palette drawer)
   * Sets the dye as start (if empty) or end color for gradient.
   *
   * @param dye The dye to add to the gradient
   */
  public selectDye(dye: Dye): void {
    if (!dye) return;

    // Prevent selecting the same dye for both Start and End
    // Check if the dye is already selected in either slot
    const isAlreadyStart = this.startDye && this.startDye.id === dye.id;
    const isAlreadyEnd = this.endDye && this.endDye.id === dye.id;

    if (isAlreadyStart || isAlreadyEnd) {
      // Show a toast message to inform the user
      ToastService.warning(
        LanguageService.t('gradient.sameDyeWarning') ||
          'This dye is already selected. Choose a different dye for the gradient.'
      );
      logger.info(`[GradientTool] Prevented duplicate dye selection: ${dye.name}`);
      return;
    }

    // If no start dye, set as start
    if (!this.startDye) {
      this.selectedDyes[0] = dye;
      logger.info(`[GradientTool] External dye set as start: ${dye.name}`);
    }
    // If no end dye, set as end
    else if (!this.endDye) {
      this.selectedDyes[1] = dye;
      logger.info(`[GradientTool] External dye set as end: ${dye.name}`);
    }
    // If both are set: old Start → new End, new dye → new Start
    else {
      this.selectedDyes[1] = this.selectedDyes[0]; // Old start becomes new end
      this.selectedDyes[0] = dye; // New dye becomes new start
      logger.info(`[GradientTool] Shifted dyes: ${dye.name} is now start`);
    }

    // Update DyeSelector if it exists (with guard flag to prevent event handler loop)
    if (this.dyeSelector) {
      this.isExternalSelection = true;
      try {
        this.dyeSelector.setSelectedDyes(this.selectedDyes);
      } finally {
        this.isExternalSelection = false;
      }
    }

    // Persist and update UI
    this.saveSelectedDyes();
    this.updateSelectedDyesDisplay();
    this.updateMobileSelectedDyesDisplay();
    this.updateInterpolation();
    this.updateDrawerContent();
  }
}
