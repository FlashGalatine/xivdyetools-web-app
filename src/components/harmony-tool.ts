/**
 * XIV Dye Tools v3.0.0 - Harmony Tool Component
 *
 * Phase 2: Color Harmony Explorer migration to v3 two-panel layout.
 * Orchestrates existing v2 components within the new shell structure.
 *
 * Left Panel: Dye selector, harmony type selector, companion slider, filters, market board
 * Right Panel: Color wheel visualization, harmony cards grid
 *
 * @module components/tools/harmony-tool
 */

import { BaseComponent } from '@components/base-component';
import { CollapsiblePanel } from '@components/collapsible-panel';
import { DyeSelector } from '@components/dye-selector';
import { DyeFilters, type DyeFilterConfig } from '@components/dye-filters';
import { MarketBoard } from '@components/market-board';
import { HarmonyType, type HarmonyTypeInfo } from '@components/harmony-type';
import { HarmonyResultPanel } from '@components/harmony-result-panel';
import { ColorWheelDisplay } from '@components/color-wheel-display';
import { PaletteExporter, type PaletteData } from '@components/palette-exporter';
import { ColorService, dyeService, LanguageService, RouterService, StorageService, WorldService, MarketBoardService } from '@services/index';
import { ConfigController } from '@services/config-controller';
import { logger } from '@shared/logger';
import { clearContainer } from '@shared/utils';
import type { Dye, PriceData } from '@shared/types';
import { DisplayOptionsConfig, DEFAULT_DISPLAY_OPTIONS } from '@shared/tool-config-types';
import { HARMONY_ICONS } from '@shared/harmony-icons';
import {
  ICON_FILTER,
  ICON_MARKET,
  ICON_EXPORT,
  ICON_COINS,
  ICON_BEAKER,
  ICON_MUSIC,
} from '@shared/ui-icons';
import {
  COMPANION_DYES_MIN,
  COMPANION_DYES_MAX,
  COMPANION_DYES_DEFAULT,
} from '@shared/constants';
import { SubscriptionManager } from '@shared/subscription-manager';

// V4 Components - Import to register custom elements
import '@components/v4/v4-color-wheel';
import '@components/v4/result-card';
import type { V4ColorWheel } from '@components/v4/v4-color-wheel';
import type { ResultCard, ResultCardData, ContextAction } from '@components/v4/result-card';

// ============================================================================
// Types and Constants
// ============================================================================

export interface HarmonyToolOptions {
  leftPanel: HTMLElement;
  rightPanel: HTMLElement;
  drawerContent?: HTMLElement | null;
}

/**
 * Suggestions mode type
 */
type SuggestionsMode = 'simple' | 'expanded';

/**
 * Harmony type IDs with their SVG icon names
 */
const HARMONY_TYPE_IDS = [
  { id: 'complementary', icon: 'complementary' },
  { id: 'analogous', icon: 'analogous' },
  { id: 'triadic', icon: 'triadic' },
  { id: 'split-complementary', icon: 'split-complementary' },
  { id: 'tetradic', icon: 'tetradic' },
  { id: 'square', icon: 'square' },
  { id: 'monochromatic', icon: 'monochromatic' },
  { id: 'compound', icon: 'compound' },
  { id: 'shades', icon: 'shades' },
] as const;

/**
 * Harmony offsets (in degrees) for each harmony type
 */
const HARMONY_OFFSETS: Record<string, number[]> = {
  complementary: [180],
  analogous: [30, 330],
  triadic: [120, 240],
  'split-complementary': [150, 210],
  tetradic: [60, 180, 240],
  square: [90, 180, 270],
  monochromatic: [0],
  compound: [30, 180, 330],
  shades: [15, 345],
};

/**
 * Storage keys for v3 harmony tool
 */
const STORAGE_KEYS = {
  harmonyType: 'v3_harmony_type',
  companionCount: 'v3_harmony_companions',
  suggestionsMode: 'v3_harmony_mode',
  selectedDyeId: 'v3_harmony_selected_dye',
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get harmony types with localized names and descriptions
 */
function getHarmonyTypes(): HarmonyTypeInfo[] {
  return HARMONY_TYPE_IDS.map(({ id, icon }) => {
    // Convert id with hyphen to camelCase for core library lookups
    const camelCaseKey = id.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
    return {
      id,
      name: LanguageService.getHarmonyType(camelCaseKey),
      description: LanguageService.t(`harmony.types.${camelCaseKey}Desc`),
      icon,
    };
  });
}

// ============================================================================
// HarmonyTool Component
// ============================================================================

/**
 * Harmony Tool - v3 Two-Panel Layout
 *
 * Generates color harmony palettes from a base dye selection.
 * Integrates existing v2 components into the new panel structure.
 */
export class HarmonyTool extends BaseComponent {
  private options: HarmonyToolOptions;

  // State
  private selectedDye: Dye | null = null;
  private selectedHarmonyType: string;
  private companionDyesCount: number;
  private suggestionsMode: SuggestionsMode;
  private filterConfig: DyeFilterConfig | null = null;
  /** Tracks user-swapped dyes per harmony slot (harmonyIndex -> swapped dye) */
  private swappedDyes: Map<number, Dye> = new Map();
  /** V4 result card elements for updating prices after fetch */
  private v4ResultCards: ResultCard[] = [];

  // Market Board Service (shared price cache with race condition protection)
  private marketBoardService: MarketBoardService;

  // Getters for service state
  private get showPrices(): boolean {
    return this.marketBoardService.getShowPrices();
  }
  private get priceData(): Map<number, PriceData> {
    return this.marketBoardService.getAllPrices();
  }

  // Display options (from ConfigController)
  private displayOptions: DisplayOptionsConfig = { ...DEFAULT_DISPLAY_OPTIONS };
  private usePerceptualMatching: boolean = false;

  // Child components (desktop left panel)
  private dyeSelector: DyeSelector | null = null;
  private dyeFilters: DyeFilters | null = null;
  private marketBoard: MarketBoard | null = null;
  private filtersPanel: CollapsiblePanel | null = null;
  private marketPanel: CollapsiblePanel | null = null;
  private colorWheel: ColorWheelDisplay | null = null;
  private harmonyDisplays: Map<string, HarmonyType> = new Map();
  private resultPanels: HarmonyResultPanel[] = [];
  private paletteExporter: PaletteExporter | null = null;

  // Child components (mobile drawer) - separate instances for mobile config
  private drawerDyeSelector: DyeSelector | null = null;
  private drawerDyeFilters: DyeFilters | null = null;
  private drawerMarketBoard: MarketBoard | null = null;
  private drawerFiltersPanel: CollapsiblePanel | null = null;
  private drawerMarketPanel: CollapsiblePanel | null = null;
  private drawerHarmonyTypesContainer: HTMLElement | null = null;
  private drawerCompanionSlider: HTMLInputElement | null = null;
  private drawerCompanionDisplay: HTMLElement | null = null;

  // DOM References
  private harmonyTypesContainer: HTMLElement | null = null;
  private companionSlider: HTMLInputElement | null = null;
  private companionDisplay: HTMLElement | null = null;
  private colorWheelContainer: HTMLElement | null = null;
  private harmonyGridContainer: HTMLElement | null = null;
  private emptyStateContainer: HTMLElement | null = null;

  // Subscriptions
  private subs = new SubscriptionManager();

  constructor(container: HTMLElement, options: HarmonyToolOptions) {
    super(container);
    this.options = options;

    // Initialize MarketBoardService (shared price cache)
    this.marketBoardService = MarketBoardService.getInstance();

    // Load persisted state
    this.selectedHarmonyType = StorageService.getItem<string>(STORAGE_KEYS.harmonyType) ?? 'complementary';
    this.companionDyesCount = StorageService.getItem<number>(STORAGE_KEYS.companionCount) ?? COMPANION_DYES_DEFAULT;
    this.suggestionsMode = StorageService.getItem<SuggestionsMode>(STORAGE_KEYS.suggestionsMode) ?? 'simple';

    // Load persisted selected dye
    const savedDyeId = StorageService.getItem<number>(STORAGE_KEYS.selectedDyeId);
    if (savedDyeId !== null) {
      // Debug: Check database status
      const allDyes = dyeService.getAllDyes();
      const dyeCount = allDyes.length;
      const minItemId = allDyes.length > 0 ? Math.min(...allDyes.map(d => d.itemID)) : 0;
      const maxItemId = allDyes.length > 0 ? Math.max(...allDyes.map(d => d.itemID)) : 0;
      logger.info(`[HarmonyTool] Database has ${dyeCount} dyes, itemID range: ${minItemId}-${maxItemId}`);
      logger.info(`[HarmonyTool] Attempting to restore dye with ID: ${savedDyeId}`);

      const dye = dyeService.getDyeById(savedDyeId);
      if (dye) {
        this.selectedDye = dye;
        logger.info(`[HarmonyTool] Restored persisted dye: ${dye.name} (itemID=${dye.itemID})`);
      } else {
        // Check if dye exists with itemID lookup (diagnostic)
        const foundBySearch = allDyes.find(d => d.itemID === savedDyeId);
        if (foundBySearch) {
          logger.warn(`[HarmonyTool] Dye found by search (${foundBySearch.name}) but getDyeById(${savedDyeId}) returned null!`);
          // Use the dye we found manually
          this.selectedDye = foundBySearch;
          logger.info(`[HarmonyTool] Using fallback search to restore: ${foundBySearch.name}`);
        } else {
          logger.warn(`[HarmonyTool] Dye ID ${savedDyeId} not found in database (range: ${minItemId}-${maxItemId})`);
          StorageService.removeItem(STORAGE_KEYS.selectedDyeId);
        }
      }
    }
  }

  // ============================================================================
  // Lifecycle Methods
  // ============================================================================

  renderContent(): void {
    // CRITICAL: Destroy existing child components before re-rendering
    // This prevents orphaned components and memory leaks during update()
    this.destroyChildComponents();

    this.renderLeftPanel();
    this.renderRightPanel();

    if (this.options.drawerContent) {
      this.renderDrawerContent();
    }

    this.element = this.container;
  }

  /**
   * Clean up child components before re-rendering
   * Called automatically during render() to prevent memory leaks
   */
  private destroyChildComponents(): void {
    // Desktop left panel components
    this.dyeSelector?.destroy();
    this.dyeSelector = null;

    this.dyeFilters?.destroy();
    this.dyeFilters = null;

    this.marketBoard?.destroy();
    this.marketBoard = null;

    this.filtersPanel?.destroy();
    this.filtersPanel = null;

    this.marketPanel?.destroy();
    this.marketPanel = null;

    this.colorWheel?.destroy();
    this.colorWheel = null;

    this.paletteExporter?.destroy();
    this.paletteExporter = null;

    for (const display of this.harmonyDisplays.values()) {
      display.destroy();
    }
    this.harmonyDisplays.clear();

    for (const panel of this.resultPanels) {
      panel.destroy();
    }
    this.resultPanels = [];

    // Mobile drawer components
    this.drawerDyeSelector?.destroy();
    this.drawerDyeSelector = null;

    this.drawerDyeFilters?.destroy();
    this.drawerDyeFilters = null;

    this.drawerMarketBoard?.destroy();
    this.drawerMarketBoard = null;

    this.drawerFiltersPanel?.destroy();
    this.drawerFiltersPanel = null;

    this.drawerMarketPanel?.destroy();
    this.drawerMarketPanel = null;

    this.drawerHarmonyTypesContainer = null;
    this.drawerCompanionSlider = null;
    this.drawerCompanionDisplay = null;
  }

  bindEvents(): void {
    // Event bindings handled in child components
  }

  onMount(): void {
    // Subscribe to language changes (only in onMount, NOT bindEvents - avoids infinite loop)
    this.subs.add(LanguageService.subscribe(() => {
      this.update();
    }));

    // Subscribe to route changes to handle deep links when navigating to harmony
    this.subs.add(RouterService.subscribe((state) => {
      if (state.toolId === 'harmony') {
        this.handleDeepLink();
      }
    }));

    // Handle deep link (e.g., ?dyeId=5729 from context menu)
    this.handleDeepLink();

    // Load display options from ConfigController
    const configController = ConfigController.getInstance();
    const harmonyConfig = configController.getConfig('harmony');
    this.displayOptions = harmonyConfig.displayOptions ?? { ...DEFAULT_DISPLAY_OPTIONS };
    this.usePerceptualMatching = harmonyConfig.strictMatching;

    // Note: Market config (showPrices, server) is now managed by MarketBoardService
    // which subscribes to ConfigController automatically. MarketBoard components
    // delegate to the service, so no manual sync is needed here.

    // Subscribe to harmony config changes
    this.subs.add(configController.subscribe('harmony', (config) => {
      const newDisplayOptions = config.displayOptions ?? { ...DEFAULT_DISPLAY_OPTIONS };
      const needsRerender =
        this.displayOptions.showHex !== newDisplayOptions.showHex ||
        this.displayOptions.showRgb !== newDisplayOptions.showRgb ||
        this.displayOptions.showHsv !== newDisplayOptions.showHsv ||
        this.displayOptions.showLab !== newDisplayOptions.showLab ||
        this.displayOptions.showPrice !== newDisplayOptions.showPrice ||
        this.displayOptions.showDeltaE !== newDisplayOptions.showDeltaE ||
        this.displayOptions.showAcquisition !== newDisplayOptions.showAcquisition;

      // Perceptual matching changes require regenerating harmonies
      const algorithmChanged = this.usePerceptualMatching !== config.strictMatching;

      this.displayOptions = newDisplayOptions;
      this.usePerceptualMatching = config.strictMatching;

      if ((needsRerender || algorithmChanged) && this.selectedDye) {
        this.generateHarmonies();
      }
    }));

    // Subscribe to market config changes (from ConfigSidebar)
    // Note: MarketBoardService handles state updates and cache clearing.
    // We just need to regenerate UI when settings change.
    this.subs.add(configController.subscribe('market', (config) => {
      // Regenerate harmonies and fetch prices if needed
      if (this.selectedDye) {
        this.generateHarmonies();
        if (config.showPrices) {
          this.fetchPricesForDisplayedDyes();
        }
      }
    }));

    // Generate initial harmonies if a dye is selected, otherwise show empty state
    if (this.selectedDye) {
      this.generateHarmonies();
      // Fetch prices on initial load if enabled
      if (this.showPrices) {
        this.fetchPricesForDisplayedDyes();
      }
    } else {
      // No dye selected - show empty state message
      this.showEmptyState(true);
    }

    logger.info('[HarmonyTool] Mounted');
  }

  destroy(): void {
    // Cleanup subscriptions
    this.subs.unsubscribeAll();

    // Cleanup child components
    this.destroyChildComponents();

    super.destroy();
    logger.info('[HarmonyTool] Destroyed');
  }

  // ============================================================================
  // Deep Link Handling
  // ============================================================================

  /**
   * Handle deep links from URL parameters (e.g., ?dyeId=5729)
   * Used when navigating from context menus like "See Color Harmonies"
   */
  private handleDeepLink(): void {
    const params = new URLSearchParams(window.location.search);
    const dyeIdParam = params.get('dyeId');

    // Debug: Log what we're reading from the URL
    logger.info(`[HarmonyTool] handleDeepLink called - URL search: "${window.location.search}", dyeIdParam: "${dyeIdParam}"`);

    if (dyeIdParam) {
      const dyeId = parseInt(dyeIdParam, 10);
      if (!isNaN(dyeId)) {
        // Find dye by itemID (FFXIV item ID)
        const allDyes = dyeService.getAllDyes();
        const dye = allDyes.find(d => d.itemID === dyeId);

        if (dye) {
          this.selectedDye = dye;
          StorageService.setItem(STORAGE_KEYS.selectedDyeId, dye.itemID);
          logger.info(`[HarmonyTool] Deep link loaded dye: ${dye.name} (itemID=${dye.itemID})`);

          // Update the desktop dye selector if it exists
          if (this.dyeSelector) {
            this.dyeSelector.setSelectedDyes([dye]);
          }

          // Update the mobile drawer dye selector if it exists
          if (this.drawerDyeSelector) {
            this.drawerDyeSelector.setSelectedDyes([dye]);
          }

          // Clear any previously swapped dyes since we're selecting a new base
          this.swappedDyes.clear();

          // Re-render to update the current dye display elements
          this.update();

          // Generate harmonies for the newly selected dye
          this.generateHarmonies();

          // Fetch prices if enabled
          if (this.showPrices) {
            this.fetchPricesForDisplayedDyes();
          }
        } else {
          logger.warn(`[HarmonyTool] Deep link dye not found: itemID=${dyeId}`);
        }
      }
    }
  }

  // ============================================================================
  // Left Panel Rendering
  // ============================================================================

  private renderLeftPanel(): void {
    const left = this.options.leftPanel;
    clearContainer(left);

    // Section 1: Base Dye (Collapsible)
    const dyeContainer = this.createElement('div');
    left.appendChild(dyeContainer);
    this.renderBaseDyePanel(dyeContainer);

    // Section 2: Harmony Type + Companion Slider (Collapsible)
    const harmonyContainer = this.createElement('div');
    left.appendChild(harmonyContainer);
    this.renderHarmonyTypePanel(harmonyContainer);

    // Collapsible: Dye Filters
    const filtersContainer = this.createElement('div');
    left.appendChild(filtersContainer);
    this.renderFiltersPanel(filtersContainer);

    // Collapsible: Market Board
    const marketContainer = this.createElement('div');
    left.appendChild(marketContainer);
    this.renderMarketPanel(marketContainer);
  }

  /**
   * Render collapsible Base Dye panel
   */
  private renderBaseDyePanel(container: HTMLElement): void {
    const panel = new CollapsiblePanel(container, {
      title: LanguageService.t('harmony.baseDye') || 'Base Dye',
      defaultOpen: true,
      storageKey: 'harmony_base_dye',
      icon: ICON_BEAKER,
    });
    panel.init();

    const contentContainer = panel.getContentContainer();
    if (contentContainer) {
      this.renderDyeSelector(contentContainer);
    }
  }

  /**
   * Render collapsible Harmony Type panel (includes harmony selector and companion slider)
   */
  private renderHarmonyTypePanel(container: HTMLElement): void {
    const panel = new CollapsiblePanel(container, {
      title: LanguageService.t('harmony.harmonyType') || 'Harmony Type',
      defaultOpen: true,
      storageKey: 'harmony_type',
      icon: ICON_MUSIC,
    });
    panel.init();

    const contentContainer = panel.getContentContainer();
    if (contentContainer) {
      this.renderHarmonyTypeSelector(contentContainer);

      // Companion Dyes slider (inside Harmony Type panel)
      const companionSection = this.createElement('div', {
        className: 'mt-4 pt-4 border-t',
        attributes: { style: 'border-color: var(--theme-border);' },
      });
      const companionLabel = this.createElement('div', {
        className: 'text-sm mb-2',
        textContent: LanguageService.t('harmony.companionDyes') || 'Additional Dyes Per Harmony Color',
        attributes: { style: 'color: var(--theme-text-muted);' },
      });
      companionSection.appendChild(companionLabel);
      this.renderCompanionSlider(companionSection);
      contentContainer.appendChild(companionSection);
    }
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
   * Render dye selector section
   */
  private renderDyeSelector(container: HTMLElement): void {
    const dyeContainer = this.createElement('div', { className: 'space-y-3' });

    // Current selection display
    const currentDisplay = this.createElement('div', {
      className: 'current-dye-display',
    });
    this.updateCurrentDyeDisplay(currentDisplay);
    dyeContainer.appendChild(currentDisplay);

    // Dye selector component
    const selectorContainer = this.createElement('div');
    dyeContainer.appendChild(selectorContainer);

    this.dyeSelector = new DyeSelector(selectorContainer, {
      maxSelections: 1,
      allowMultiple: false,
      showCategories: true,
      showPrices: this.showPrices,
      excludeFacewear: true,
      showFavorites: true,
      compactMode: true, // Use 3-column layout for narrow left panel
    });
    this.dyeSelector.init();

    // Pre-select persisted dye if available
    if (this.selectedDye) {
      this.dyeSelector.setSelectedDyes([this.selectedDye]);
    }

    // Listen for dye selection (custom event from DyeSelector)
    selectorContainer.addEventListener('selection-changed', ((event: CustomEvent<{ selectedDyes: Dye[] }>) => {
      const selectedDyes = event.detail.selectedDyes;
      this.selectedDye = selectedDyes.length > 0 ? selectedDyes[0] : null;

      // Persist selected dye itemID for restoration when returning to this tool
      // Use itemID which is the FFXIV standard identifier (5729-48227 range)
      if (this.selectedDye) {
        const dyeIdToSave = this.selectedDye.itemID;
        StorageService.setItem(STORAGE_KEYS.selectedDyeId, dyeIdToSave);
        logger.info(`[HarmonyTool] Saved dye: ${this.selectedDye.name} (itemID=${dyeIdToSave})`);
      } else {
        StorageService.removeItem(STORAGE_KEYS.selectedDyeId);
        logger.info('[HarmonyTool] Cleared saved dye');
      }

      // Clear swapped dyes when base dye changes
      this.swappedDyes.clear();

      this.updateCurrentDyeDisplay(currentDisplay);
      this.generateHarmonies();
      this.updateDrawerContent();
    }) as EventListener);

    container.appendChild(dyeContainer);
  }

  /**
   * Update the current dye display
   */
  private updateCurrentDyeDisplay(container: HTMLElement): void {
    clearContainer(container);

    if (this.selectedDye) {
      const display = this.createElement('div', {
        className: 'flex items-center gap-3 p-3 rounded-lg',
        attributes: { style: 'background: var(--theme-primary); color: var(--theme-text-header);' },
      });

      const swatch = this.createElement('div', {
        className: 'w-8 h-8 rounded border-2 border-white/30',
        attributes: { style: `background: ${this.selectedDye.hex};` },
      });

      const name = this.createElement('span', {
        className: 'font-medium',
        textContent: LanguageService.getDyeName(this.selectedDye.itemID) ?? this.selectedDye.name,
      });

      display.appendChild(swatch);
      display.appendChild(name);
      container.appendChild(display);
    } else {
      const placeholder = this.createElement('div', {
        className: 'p-3 rounded-lg border-2 border-dashed text-center text-sm',
        textContent: LanguageService.t('harmony.selectDye'),
        attributes: {
          style: 'border-color: var(--theme-border); color: var(--theme-text-muted);',
        },
      });
      container.appendChild(placeholder);
    }
  }

  /**
   * Render harmony type selector
   */
  private renderHarmonyTypeSelector(container: HTMLElement): void {
    this.harmonyTypesContainer = this.createElement('div', {
      className: 'space-y-1 max-h-48 overflow-y-auto',
    });

    const harmonyTypes = getHarmonyTypes();

    for (const type of harmonyTypes) {
      const isSelected = this.selectedHarmonyType === type.id;
      const btn = this.createElement('button', {
        className: 'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all text-sm',
        attributes: {
          style: isSelected
            ? 'background: var(--theme-primary); color: var(--theme-text-header);'
            : 'background: transparent; color: var(--theme-text);',
          'data-harmony-type': type.id,
        },
      });

      // Icon
      const iconSpan = this.createElement('span', {
        className: 'w-5 h-5 flex-shrink-0',
        innerHTML: HARMONY_ICONS[type.icon] || '',
      });

      const nameSpan = this.createElement('span', { textContent: type.name });

      btn.appendChild(iconSpan);
      btn.appendChild(nameSpan);

      this.on(btn, 'click', () => {
        this.selectHarmonyType(type.id);
      });

      this.harmonyTypesContainer.appendChild(btn);
    }

    container.appendChild(this.harmonyTypesContainer);
  }

  /**
   * Select a harmony type
   */
  private selectHarmonyType(typeId: string): void {
    this.selectedHarmonyType = typeId;
    StorageService.setItem(STORAGE_KEYS.harmonyType, typeId);

    // Clear swapped dyes when harmony type changes
    this.swappedDyes.clear();

    // Update button styles
    if (this.harmonyTypesContainer) {
      const buttons = this.harmonyTypesContainer.querySelectorAll('button');
      buttons.forEach((btn) => {
        const isSelected = btn.getAttribute('data-harmony-type') === typeId;
        btn.setAttribute(
          'style',
          isSelected
            ? 'background: var(--theme-primary); color: var(--theme-text-header);'
            : 'background: transparent; color: var(--theme-text);'
        );
      });
    }

    this.generateHarmonies();
    this.updateDrawerContent();
  }

  /**
   * Render companion dyes slider
   */
  private renderCompanionSlider(container: HTMLElement): void {
    const sliderContainer = this.createElement('div', { className: 'flex items-center gap-3' });

    this.companionSlider = this.createElement('input', {
      attributes: {
        type: 'range',
        min: String(COMPANION_DYES_MIN),
        max: String(COMPANION_DYES_MAX),
        value: String(this.companionDyesCount),
      },
      className: 'flex-1',
    }) as HTMLInputElement;

    this.companionDisplay = this.createElement('span', {
      className: 'text-sm number w-6 text-center',
      textContent: String(this.companionDyesCount),
      attributes: { style: 'color: var(--theme-text);' },
    });

    this.on(this.companionSlider, 'input', () => {
      if (this.companionSlider && this.companionDisplay) {
        this.companionDyesCount = parseInt(this.companionSlider.value, 10);
        this.companionDisplay.textContent = String(this.companionDyesCount);
        StorageService.setItem(STORAGE_KEYS.companionCount, this.companionDyesCount);
      }
    });

    this.on(this.companionSlider, 'change', () => {
      this.generateHarmonies();
    });

    sliderContainer.appendChild(this.companionSlider);
    sliderContainer.appendChild(this.companionDisplay);
    container.appendChild(sliderContainer);
  }

  /**
   * Render dye filters collapsible panel
   */
  private renderFiltersPanel(container: HTMLElement): void {
    this.filtersPanel = new CollapsiblePanel(container, {
      title: LanguageService.t('filters.advancedFilters'),
      storageKey: 'harmony_filters',
      defaultOpen: false,
      icon: ICON_FILTER,
    });
    this.filtersPanel.init();

    // Create filters content
    const filtersContent = this.createElement('div');
    this.dyeFilters = new DyeFilters(filtersContent, {
      storageKeyPrefix: 'v3_harmony',
      hideHeader: true, // Header is provided by the outer CollapsiblePanel
      onFilterChange: (filters) => {
        this.filterConfig = filters;
        this.generateHarmonies();
      },
    });
    this.dyeFilters.init();

    this.filtersPanel.setContent(filtersContent);
  }

  /**
   * Render market board collapsible panel
   */
  private renderMarketPanel(container: HTMLElement): void {
    this.marketPanel = new CollapsiblePanel(container, {
      title: LanguageService.t('marketBoard.title'),
      storageKey: 'harmony_market',
      defaultOpen: false,
      icon: ICON_MARKET,
    });
    this.marketPanel.init();

    // Create market board content
    // Note: MarketBoard delegates to MarketBoardService for state management
    const marketContent = this.createElement('div');
    this.marketBoard = new MarketBoard(marketContent);
    this.marketBoard.init();

    // Listen for price toggle changes - regenerate harmonies
    marketContent.addEventListener('showPricesChanged', (() => {
      this.generateHarmonies();
      if (this.showPrices) {
        this.fetchPricesForDisplayedDyes();
      }
    }) as EventListener);

    // Listen for server changes - regenerate to show new server name and refetch prices
    marketContent.addEventListener('server-changed', (() => {
      if (this.selectedDye) {
        this.generateHarmonies();
      }
      if (this.showPrices) {
        this.fetchPricesForDisplayedDyes();
      }
    }) as EventListener);

    // Listen for category changes - refetch prices when price categories change
    marketContent.addEventListener('categories-changed', (() => {
      if (this.showPrices) {
        this.fetchPricesForDisplayedDyes();
      }
    }) as EventListener);

    // Listen for refresh requests - refetch prices when user clicks refresh
    marketContent.addEventListener('refresh-requested', (() => {
      if (this.showPrices) {
        this.fetchPricesForDisplayedDyes();
      }
    }) as EventListener);

    this.marketPanel.setContent(marketContent);
  }

  // ============================================================================
  // Right Panel Rendering
  // ============================================================================

  private renderRightPanel(): void {
    const right = this.options.rightPanel;
    clearContainer(right);

    // Color Wheel Section - centered with inline styles for reliability
    this.colorWheelContainer = this.createElement('div', {
      className: 'color-wheel-container',
      attributes: {
        style: 'display: flex; justify-content: center; align-items: center; width: 100%; margin-bottom: 1.5rem;',
      },
    });
    right.appendChild(this.colorWheelContainer);

    // Results Header
    const resultsHeader = this.createElement('div', {
      className: 'section-header', // Uses new global class in V4LayoutShell
      attributes: {
        style: 'width: 100%;', // Keep width: 100% just in case flex behavior needs it, but section-header handles the rest
      },
    });

    const resultsTitle = this.createElement('span', {
      className: 'section-title', // Uses new global class in V4LayoutShell
      textContent: LanguageService.t('harmony.results'),
    });

    resultsHeader.appendChild(resultsTitle);
    right.appendChild(resultsHeader);

    // Harmony Results - horizontal row layout with inline styles for reliability
    this.harmonyGridContainer = this.createElement('div', {
      className: 'harmony-results-container',
      attributes: {
        style: 'display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center; --v4-result-card-width: 290px;',
      },
    });
    right.appendChild(this.harmonyGridContainer);

    // Empty state (shown when no dye selected)
    this.emptyStateContainer = this.createElement('div', {
      className: 'hidden',
    });
    right.appendChild(this.emptyStateContainer);

    // Initial render
    this.renderColorWheel();
    this.renderEmptyState();
  }

  /**
   * Render color wheel visualization using v4-color-wheel component
   */
  private renderColorWheel(): void {
    if (!this.colorWheelContainer) return;
    clearContainer(this.colorWheelContainer);

    // Create v4-color-wheel custom element
    const wheel = document.createElement('v4-color-wheel') as V4ColorWheel;
    wheel.setAttribute('harmony-type', this.selectedHarmonyType);
    wheel.setAttribute('size', '300');

    if (this.selectedDye) {
      // Get matched dyes for the selected harmony type
      const matchedDyes = this.getMatchedDyesForCurrentHarmony();

      wheel.setAttribute('base-color', this.selectedDye.hex);
      wheel.harmonyColors = matchedDyes.map(dye => dye.hex);
      wheel.harmonyDyes = matchedDyes;
    } else {
      // Empty state - show placeholder wheel
      wheel.setAttribute('empty', '');
    }

    this.colorWheelContainer.appendChild(wheel);
  }

  /**
   * Render empty state when no dye selected (v4 design)
   */
  private renderEmptyState(): void {
    if (!this.emptyStateContainer) return;
    clearContainer(this.emptyStateContainer);

    const empty = this.createElement('div', {
      className: 'harmony-results-empty',
      attributes: {
        style: `
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
          padding: 40px;
          text-align: center;
          color: var(--theme-text-muted, #a0a0a0);
        `,
      },
    });

    // Harmony tool icon (triangles/wheel)
    empty.innerHTML = `
      <svg style="width: 80px; height: 80px; margin-bottom: 24px; opacity: 0.4;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" opacity="0.3" />
        <circle cx="12" cy="3" r="2" fill="currentColor" stroke="none" opacity="0.5" />
        <circle cx="20.66" cy="16.5" r="2" fill="currentColor" stroke="none" opacity="0.5" />
        <circle cx="3.34" cy="16.5" r="2" fill="currentColor" stroke="none" opacity="0.5" />
        <polygon points="12,3 20.66,16.5 3.34,16.5" fill="none" opacity="0.3" />
      </svg>
      <div style="font-size: 18px; font-weight: 500; color: var(--theme-text, #e0e0e0); margin-bottom: 12px;">
        ${LanguageService.t('harmony.noColorSelected') || 'No Color Selected'}
      </div>
      <div style="font-size: 14px; color: var(--theme-text-muted, #a0a0a0); max-width: 300px; line-height: 1.5;">
        ${LanguageService.t('harmony.selectDyePrompt') || 'Select a base color from the Color Palette to explore harmonies and discover complementary dyes for your glamour.'}
      </div>
    `;

    this.emptyStateContainer.appendChild(empty);
  }

  // ============================================================================
  // Mobile Drawer Content
  // ============================================================================

  /**
   * Render full interactive configuration controls in the mobile drawer
   * Mirrors the left panel configuration but uses drawer-specific component instances
   */
  private renderDrawerContent(): void {
    if (!this.options.drawerContent) return;
    const drawer = this.options.drawerContent;
    clearContainer(drawer);

    // Section 1: Base Dye (Collapsible)
    const dyeContainer = this.createElement('div');
    drawer.appendChild(dyeContainer);
    this.renderDrawerBaseDyePanel(dyeContainer);

    // Section 2: Harmony Type + Companion Slider (Collapsible)
    const harmonyContainer = this.createElement('div');
    drawer.appendChild(harmonyContainer);
    this.renderDrawerHarmonyTypePanel(harmonyContainer);

    // Collapsible: Dye Filters
    const filtersContainer = this.createElement('div');
    drawer.appendChild(filtersContainer);
    this.renderDrawerFiltersPanel(filtersContainer);

    // Collapsible: Market Board
    const marketContainer = this.createElement('div');
    drawer.appendChild(marketContainer);
    this.renderDrawerMarketPanel(marketContainer);
  }

  /**
   * Render collapsible Base Dye panel for mobile drawer
   */
  private renderDrawerBaseDyePanel(container: HTMLElement): void {
    const panel = new CollapsiblePanel(container, {
      title: LanguageService.t('harmony.baseDye') || 'Base Dye',
      defaultOpen: true,
      storageKey: 'harmony_base_dye_drawer',
      icon: ICON_BEAKER,
    });
    panel.init();

    const contentContainer = panel.getContentContainer();
    if (contentContainer) {
      this.renderDrawerDyeSelector(contentContainer);
    }
  }

  /**
   * Render dye selector for mobile drawer
   */
  private renderDrawerDyeSelector(container: HTMLElement): void {
    const dyeContainer = this.createElement('div', { className: 'space-y-3' });

    // Current selection display
    const currentDisplay = this.createElement('div', {
      className: 'drawer-current-dye-display',
    });
    this.updateDrawerCurrentDyeDisplay(currentDisplay);
    dyeContainer.appendChild(currentDisplay);

    // Dye selector component
    const selectorContainer = this.createElement('div');
    dyeContainer.appendChild(selectorContainer);

    this.drawerDyeSelector = new DyeSelector(selectorContainer, {
      maxSelections: 1,
      allowMultiple: false,
      showCategories: true,
      showPrices: this.showPrices,
      excludeFacewear: true,
      showFavorites: true,
      compactMode: true,
    });
    this.drawerDyeSelector.init();

    // Pre-select persisted dye if available
    if (this.selectedDye) {
      this.drawerDyeSelector.setSelectedDyes([this.selectedDye]);
    }

    // Listen for dye selection
    selectorContainer.addEventListener('selection-changed', ((event: CustomEvent<{ selectedDyes: Dye[] }>) => {
      const selectedDyes = event.detail.selectedDyes;
      this.selectedDye = selectedDyes.length > 0 ? selectedDyes[0] : null;

      // Persist selected dye
      if (this.selectedDye) {
        StorageService.setItem(STORAGE_KEYS.selectedDyeId, this.selectedDye.itemID);
        logger.info(`[HarmonyTool] Saved dye from drawer: ${this.selectedDye.name}`);
      } else {
        StorageService.removeItem(STORAGE_KEYS.selectedDyeId);
      }

      // Clear swapped dyes when base dye changes
      this.swappedDyes.clear();

      // Sync desktop selector if it exists
      if (this.dyeSelector && this.selectedDye) {
        this.dyeSelector.setSelectedDyes([this.selectedDye]);
      } else if (this.dyeSelector) {
        this.dyeSelector.setSelectedDyes([]);
      }

      // Update displays and regenerate
      this.updateDrawerCurrentDyeDisplay(currentDisplay);
      this.generateHarmonies();
    }) as EventListener);

    container.appendChild(dyeContainer);
  }

  /**
   * Update the current dye display in mobile drawer
   */
  private updateDrawerCurrentDyeDisplay(container: HTMLElement): void {
    clearContainer(container);

    if (this.selectedDye) {
      const display = this.createElement('div', {
        className: 'flex items-center gap-3 p-3 rounded-lg',
        attributes: { style: 'background: var(--theme-primary); color: var(--theme-text-header);' },
      });

      const swatch = this.createElement('div', {
        className: 'w-8 h-8 rounded border-2 border-white/30',
        attributes: { style: `background: ${this.selectedDye.hex};` },
      });

      const name = this.createElement('span', {
        className: 'font-medium',
        textContent: LanguageService.getDyeName(this.selectedDye.itemID) ?? this.selectedDye.name,
      });

      display.appendChild(swatch);
      display.appendChild(name);
      container.appendChild(display);
    } else {
      const placeholder = this.createElement('div', {
        className: 'p-3 rounded-lg border-2 border-dashed text-center text-sm',
        textContent: LanguageService.t('harmony.selectDye'),
        attributes: {
          style: 'border-color: var(--theme-border); color: var(--theme-text-muted);',
        },
      });
      container.appendChild(placeholder);
    }
  }

  /**
   * Render collapsible Harmony Type panel for mobile drawer
   */
  private renderDrawerHarmonyTypePanel(container: HTMLElement): void {
    const panel = new CollapsiblePanel(container, {
      title: LanguageService.t('harmony.harmonyType') || 'Harmony Type',
      defaultOpen: true,
      storageKey: 'harmony_type_drawer',
      icon: ICON_MUSIC,
    });
    panel.init();

    const contentContainer = panel.getContentContainer();
    if (contentContainer) {
      this.renderDrawerHarmonyTypeSelector(contentContainer);

      // Companion Dyes slider
      const companionSection = this.createElement('div', {
        className: 'mt-4 pt-4 border-t',
        attributes: { style: 'border-color: var(--theme-border);' },
      });
      const companionLabel = this.createElement('div', {
        className: 'text-sm mb-2',
        textContent: LanguageService.t('harmony.companionDyes') || 'Additional Dyes Per Harmony Color',
        attributes: { style: 'color: var(--theme-text-muted);' },
      });
      companionSection.appendChild(companionLabel);
      this.renderDrawerCompanionSlider(companionSection);
      contentContainer.appendChild(companionSection);
    }
  }

  /**
   * Render harmony type selector for mobile drawer
   */
  private renderDrawerHarmonyTypeSelector(container: HTMLElement): void {
    this.drawerHarmonyTypesContainer = this.createElement('div', {
      className: 'space-y-1 max-h-48 overflow-y-auto',
    });

    const harmonyTypes = getHarmonyTypes();

    for (const type of harmonyTypes) {
      const isSelected = this.selectedHarmonyType === type.id;
      const btn = this.createElement('button', {
        className: 'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all text-sm',
        attributes: {
          style: isSelected
            ? 'background: var(--theme-primary); color: var(--theme-text-header);'
            : 'background: transparent; color: var(--theme-text);',
          'data-harmony-type': type.id,
        },
      });

      const iconSpan = this.createElement('span', {
        className: 'w-5 h-5 flex-shrink-0',
        innerHTML: HARMONY_ICONS[type.icon] || '',
      });

      const nameSpan = this.createElement('span', { textContent: type.name });

      btn.appendChild(iconSpan);
      btn.appendChild(nameSpan);

      this.on(btn, 'click', () => {
        this.selectHarmonyTypeFromDrawer(type.id);
      });

      this.drawerHarmonyTypesContainer.appendChild(btn);
    }

    container.appendChild(this.drawerHarmonyTypesContainer);
  }

  /**
   * Select harmony type from mobile drawer (syncs with desktop)
   */
  private selectHarmonyTypeFromDrawer(typeId: string): void {
    this.selectedHarmonyType = typeId;
    StorageService.setItem(STORAGE_KEYS.harmonyType, typeId);

    // Clear swapped dyes when harmony type changes
    this.swappedDyes.clear();

    // Update drawer button styles
    if (this.drawerHarmonyTypesContainer) {
      const buttons = this.drawerHarmonyTypesContainer.querySelectorAll('button');
      buttons.forEach((btn) => {
        const isSelected = btn.getAttribute('data-harmony-type') === typeId;
        btn.setAttribute(
          'style',
          isSelected
            ? 'background: var(--theme-primary); color: var(--theme-text-header);'
            : 'background: transparent; color: var(--theme-text);'
        );
      });
    }

    // Sync desktop harmony type selector
    if (this.harmonyTypesContainer) {
      const buttons = this.harmonyTypesContainer.querySelectorAll('button');
      buttons.forEach((btn) => {
        const isSelected = btn.getAttribute('data-harmony-type') === typeId;
        btn.setAttribute(
          'style',
          isSelected
            ? 'background: var(--theme-primary); color: var(--theme-text-header);'
            : 'background: transparent; color: var(--theme-text);'
        );
      });
    }

    this.generateHarmonies();
  }

  /**
   * Render companion dyes slider for mobile drawer
   */
  private renderDrawerCompanionSlider(container: HTMLElement): void {
    const sliderContainer = this.createElement('div', { className: 'flex items-center gap-3' });

    this.drawerCompanionSlider = this.createElement('input', {
      attributes: {
        type: 'range',
        min: String(COMPANION_DYES_MIN),
        max: String(COMPANION_DYES_MAX),
        value: String(this.companionDyesCount),
      },
      className: 'flex-1',
    }) as HTMLInputElement;

    this.drawerCompanionDisplay = this.createElement('span', {
      className: 'text-sm number w-6 text-center',
      textContent: String(this.companionDyesCount),
      attributes: { style: 'color: var(--theme-text);' },
    });

    this.on(this.drawerCompanionSlider, 'input', () => {
      if (this.drawerCompanionSlider && this.drawerCompanionDisplay) {
        this.companionDyesCount = parseInt(this.drawerCompanionSlider.value, 10);
        this.drawerCompanionDisplay.textContent = String(this.companionDyesCount);
        StorageService.setItem(STORAGE_KEYS.companionCount, this.companionDyesCount);

        // Sync desktop slider
        if (this.companionSlider) {
          this.companionSlider.value = String(this.companionDyesCount);
        }
        if (this.companionDisplay) {
          this.companionDisplay.textContent = String(this.companionDyesCount);
        }
      }
    });

    this.on(this.drawerCompanionSlider, 'change', () => {
      this.generateHarmonies();
    });

    sliderContainer.appendChild(this.drawerCompanionSlider);
    sliderContainer.appendChild(this.drawerCompanionDisplay);
    container.appendChild(sliderContainer);
  }

  /**
   * Render dye filters panel for mobile drawer
   */
  private renderDrawerFiltersPanel(container: HTMLElement): void {
    this.drawerFiltersPanel = new CollapsiblePanel(container, {
      title: LanguageService.t('filters.advancedFilters'),
      storageKey: 'harmony_filters_drawer',
      defaultOpen: false,
      icon: ICON_FILTER,
    });
    this.drawerFiltersPanel.init();

    const filtersContent = this.createElement('div');
    this.drawerDyeFilters = new DyeFilters(filtersContent, {
      storageKeyPrefix: 'v3_harmony',
      hideHeader: true,
      onFilterChange: (filters) => {
        this.filterConfig = filters;
        this.generateHarmonies();
      },
    });
    this.drawerDyeFilters.init();

    this.drawerFiltersPanel.setContent(filtersContent);
  }

  /**
   * Render market board panel for mobile drawer
   * Note: MarketBoard delegates to MarketBoardService for state management
   */
  private renderDrawerMarketPanel(container: HTMLElement): void {
    this.drawerMarketPanel = new CollapsiblePanel(container, {
      title: LanguageService.t('marketBoard.title'),
      storageKey: 'harmony_market_drawer',
      defaultOpen: false,
      icon: ICON_MARKET,
    });
    this.drawerMarketPanel.init();

    const marketContent = this.createElement('div');
    this.drawerMarketBoard = new MarketBoard(marketContent);
    this.drawerMarketBoard.init();

    // Listen for price toggle changes - regenerate harmonies
    marketContent.addEventListener('showPricesChanged', (() => {
      this.generateHarmonies();
      if (this.showPrices) {
        this.fetchPricesForDisplayedDyes();
      }
    }) as EventListener);

    marketContent.addEventListener('server-changed', (() => {
      // Regenerate harmonies to update cards with new server name
      if (this.selectedDye) {
        this.generateHarmonies();
      }
      if (this.showPrices) {
        this.fetchPricesForDisplayedDyes();
      }
    }) as EventListener);

    marketContent.addEventListener('categories-changed', (() => {
      if (this.showPrices) {
        this.fetchPricesForDisplayedDyes();
      }
    }) as EventListener);

    marketContent.addEventListener('refresh-requested', (() => {
      if (this.showPrices) {
        this.fetchPricesForDisplayedDyes();
      }
    }) as EventListener);

    this.drawerMarketPanel.setContent(marketContent);
  }

  /**
   * Update drawer content - no longer needed since drawer has full interactive controls
   * Kept for backwards compatibility but now just syncs the current dye display
   */
  private updateDrawerContent(): void {
    // The drawer now has full interactive controls that sync via state
    // No need to rebuild the entire drawer content on every change
  }

  // ============================================================================
  // Harmony Generation
  // ============================================================================

  /**
   * Generate harmony results for the SELECTED harmony type only
   * Displays Base panel + Harmony 1, 2, etc. panels
   */
  private generateHarmonies(): void {
    if (!this.selectedDye || !this.harmonyGridContainer) {
      this.showEmptyState(true);
      return;
    }

    this.showEmptyState(false);

    // Clear existing result panels
    for (const panel of this.resultPanels) {
      panel.destroy();
    }
    this.resultPanels = [];
    this.v4ResultCards = []; // Clear v4 card references
    clearContainer(this.harmonyGridContainer);

    // Update color wheel
    this.renderColorWheel();

    // Get offsets for the SELECTED harmony type only
    const offsets = HARMONY_OFFSETS[this.selectedHarmonyType] || [];
    const baseHsv = ColorService.hexToHsv(this.selectedDye.hex);
    const allDyes = dyeService.getAllDyes();

    // Render Base panel (no closest dyes section)
    this.renderResultPanel({
      label: LanguageService.t('harmony.base') || 'Base',
      matchedDye: this.selectedDye,
      targetColor: this.selectedDye.hex,
      deviance: 0,
      closestDyes: [],
      isBase: true,
    });

    // Render Harmony panels for each offset in the selected harmony type
    offsets.forEach((offset, index) => {
      const targetHue = (baseHsv.h + offset) % 360;
      const targetColor = ColorService.hsvToHex(targetHue, baseHsv.s, baseHsv.v);

      // Get extra candidates to allow for filter replacements, then apply filters
      let matches = this.findClosestDyesToHue(allDyes, targetHue, this.companionDyesCount + 10);
      matches = this.replaceExcludedDyes(matches, targetHue);

      // Use swapped dye if user has selected one, otherwise use best match
      const swappedDye = this.swappedDyes.get(index);
      const displayDye = swappedDye || matches[0].dye;
      const deviance = swappedDye
        ? this.calculateHueDeviance(swappedDye, targetHue)
        : matches[0].deviance;

      // Closest dyes excludes the currently displayed dye
      const closestDyes = matches
        .filter((m) => m.dye.itemID !== displayDye.itemID)
        .slice(0, this.companionDyesCount)
        .map((m) => m.dye);

      this.renderResultPanel({
        label: `${LanguageService.t('harmony.harmony') || 'Harmony'} ${index + 1}`,
        matchedDye: displayDye,
        targetColor,
        deviance,
        closestDyes,
        isBase: false,
        harmonyIndex: index,
        onSwapDye: (dye) => this.handleSwapDye(index, dye),
      });
    });

    logger.info('[HarmonyTool] Generated harmonies for:', this.selectedDye.name, 'type:', this.selectedHarmonyType);

    // Fetch prices for displayed dyes if prices are enabled
    if (this.showPrices) {
      this.fetchPricesForDisplayedDyes();
    }
  }

  /**
   * Render an individual result panel (Base or Harmony N) using v4-result-card
   */
  private renderResultPanel(options: {
    label: string;
    matchedDye: Dye;
    targetColor: string;
    deviance: number;
    closestDyes: Dye[];
    isBase: boolean;
    harmonyIndex?: number;
    onSwapDye?: (dye: Dye) => void;
  }): void {
    if (!this.harmonyGridContainer) return;

    // Create v4-result-card custom element
    const card = document.createElement('v4-result-card') as ResultCard;

    // Get price data for this dye
    const priceInfo = this.priceData.get(options.matchedDye.itemID);

    // Calculate Delta-E between target color and matched dye
    const deltaE = ColorService.getDeltaE?.(options.targetColor, options.matchedDye.hex) ?? undefined;

    // Get market server name - prefer worldId from price data (actual listing location)
    // Fall back to selected server if worldId not available or can't be resolved
    let marketServer: string | undefined;
    if (priceInfo?.worldId) {
      // Resolve worldId to world name (e.g., 34 -> "Brynhildr")
      marketServer = WorldService.getWorldName(priceInfo.worldId);
    }
    if (!marketServer) {
      // Fall back to selected server (data center name)
      marketServer = this.marketBoard?.getSelectedServer?.();
    }

    // Build ResultCardData
    const cardData: ResultCardData = {
      dye: options.matchedDye,
      originalColor: options.targetColor,
      matchedColor: options.matchedDye.hex,
      deltaE: deltaE,
      hueDeviance: options.deviance,
      marketServer: marketServer,
      price: this.showPrices && priceInfo ? priceInfo.currentAverage : undefined,
      vendorCost: options.matchedDye.cost,
    };

    card.data = cardData;
    card.setAttribute('data-harmony-panel', options.label);

    // Set display options from tool state
    card.showHex = this.displayOptions.showHex;
    card.showRgb = this.displayOptions.showRgb;
    card.showHsv = this.displayOptions.showHsv;
    card.showLab = this.displayOptions.showLab;
    card.showDeltaE = this.displayOptions.showDeltaE;
    card.showPrice = this.displayOptions.showPrice;
    card.showAcquisition = this.displayOptions.showAcquisition;

    // Handle card selection - set as new base dye and regenerate harmonies
    card.addEventListener('card-select', ((e: CustomEvent<{ dye: Dye }>) => {
      logger.info(`[HarmonyTool] Card selected: ${e.detail.dye.name}`);
      this.selectDye(e.detail.dye);
    }) as EventListener);

    // Handle context menu actions
    card.addEventListener('context-action', ((e: CustomEvent<{ action: ContextAction; dye: Dye }>) => {
      this.handleContextAction(e.detail.action, e.detail.dye);
    }) as EventListener);

    // Store reference for later price updates
    this.v4ResultCards.push(card);

    this.harmonyGridContainer.appendChild(card);
  }

  /**
   * Handle context menu action from v4-result-card
   */
  private handleContextAction(action: ContextAction, dye: Dye): void {
    logger.info(`[HarmonyTool] Context action: ${action} for dye: ${dye.name}`);

    switch (action) {
      case 'add-comparison':
        RouterService.navigateTo('comparison', { add: String(dye.itemID) });
        break;
      case 'add-mixer':
        RouterService.navigateTo('mixer', { add: String(dye.itemID) });
        break;
      case 'add-accessibility':
        RouterService.navigateTo('accessibility', { add: String(dye.itemID) });
        break;
      case 'see-harmonies':
        // Select this dye as base and regenerate harmonies
        this.selectDye(dye);
        break;
      case 'budget':
        RouterService.navigateTo('budget', { base: dye.hex.replace('#', '') });
        break;
      case 'copy-hex':
        navigator.clipboard.writeText(dye.hex).then(() => {
          logger.info(`[HarmonyTool] Copied hex: ${dye.hex}`);
        });
        break;
    }
  }

  /**
   * Handle swap dye action from result panel
   */
  private handleSwapDye(harmonyIndex: number, dye: Dye): void {
    this.swappedDyes.set(harmonyIndex, dye);
    this.generateHarmonies(); // Re-render with new selection
  }

  /**
   * Calculate hue deviance between a dye and target hue
   */
  private calculateHueDeviance(dye: Dye, targetHue: number): number {
    const dyeHsv = ColorService.hexToHsv(dye.hex);
    const hueDiff = Math.abs(dyeHsv.h - targetHue);
    return Math.min(hueDiff, 360 - hueDiff);
  }

  /**
   * Replace excluded dyes with alternatives that don't match exclusion criteria.
   * This ensures harmony panels always show the expected number of qualifying dyes.
   * Ported from v2 harmony-generator-tool.ts
   */
  private replaceExcludedDyes(
    dyes: Array<{ dye: Dye; deviance: number }>,
    targetHue: number
  ): Array<{ dye: Dye; deviance: number }> {
    if (!this.filterConfig || !this.dyeFilters) {
      return dyes; // No filters active
    }

    const result: Array<{ dye: Dye; deviance: number }> = [];
    const usedDyeIds = new Set<number>();
    const allDyes = dyeService.getAllDyes();

    for (const item of dyes) {
      // If dye is not excluded, keep it
      if (!this.dyeFilters.isDyeExcluded(item.dye)) {
        result.push(item);
        usedDyeIds.add(item.dye.itemID);
        continue;
      }

      // Dye is excluded, find alternative using color distance
      const targetColor = item.dye.hex;
      let bestAlternative: Dye | null = null;
      let bestDistance = Infinity;

      for (const dye of allDyes) {
        if (
          usedDyeIds.has(dye.itemID) ||
          dye.category === 'Facewear' ||
          this.dyeFilters.isDyeExcluded(dye)
        ) {
          continue;
        }

        const distance = ColorService.getColorDistance(targetColor, dye.hex);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestAlternative = dye;
        }
      }

      if (bestAlternative) {
        const deviance = this.calculateHueDeviance(bestAlternative, targetHue);
        result.push({ dye: bestAlternative, deviance });
        usedDyeIds.add(bestAlternative.itemID);
      }
    }

    return result;
  }

  /**
   * Find matching dyes for a specific harmony type
   */
  private findHarmonyDyes(typeId: string): Array<{ dye: Dye; deviance: number }> {
    if (!this.selectedDye) return [];

    const offsets = HARMONY_OFFSETS[typeId] || [];
    const baseHsv = ColorService.hexToHsv(this.selectedDye.hex);
    const results: Array<{ dye: Dye; deviance: number }> = [];

    // Get all dyes from service
    const allDyes = dyeService.getAllDyes();

    for (const offset of offsets) {
      const targetHue = (baseHsv.h + offset) % 360;

      // Find closest dyes to the target hue
      const matches = this.findClosestDyesToHue(allDyes, targetHue, this.companionDyesCount);

      for (const match of matches) {
        // Apply filters if configured
        if (this.filterConfig && this.dyeFilters?.isDyeExcluded(match.dye)) {
          continue;
        }
        results.push(match);
      }
    }

    return results.slice(0, this.companionDyesCount * offsets.length);
  }

  /**
   * Find dyes closest to a target hue
   * Excludes Facewear dyes (generic names like "Red", "Blue")
   * Supports both hue-based (fast) and DeltaE-based (perceptual) matching
   */
  private findClosestDyesToHue(
    dyes: Dye[],
    targetHue: number,
    count: number
  ): Array<{ dye: Dye; deviance: number }> {
    const scored: Array<{ dye: Dye; deviance: number }> = [];

    // For DeltaE matching, generate target color from hue
    // Use selected dye's saturation and value as base for consistent matching
    let targetHex: string | undefined;
    if (this.usePerceptualMatching && this.selectedDye) {
      const baseSaturation = this.selectedDye.hsv?.s ?? 50;
      const baseValue = this.selectedDye.hsv?.v ?? 50;
      targetHex = ColorService.hsvToHex(targetHue, baseSaturation, baseValue);
    }

    for (const dye of dyes) {
      // Skip Facewear dyes - they have generic names and shouldn't appear in harmony results
      if (dye.category === 'Facewear') {
        continue;
      }

      let deviance: number;

      if (this.usePerceptualMatching && targetHex) {
        // DeltaE-based matching: use perceptual color difference
        deviance = ColorService.getDeltaE(targetHex, dye.hex);
      } else {
        // Hue-based matching: use angular distance on color wheel
        const dyeHsv = ColorService.hexToHsv(dye.hex);
        const hueDiff = Math.abs(dyeHsv.h - targetHue);
        deviance = Math.min(hueDiff, 360 - hueDiff);
      }

      scored.push({ dye, deviance });
    }

    scored.sort((a, b) => a.deviance - b.deviance);
    return scored.slice(0, count);
  }

  /**
   * Get matched dyes for the current harmony type (for color wheel)
   */
  private getMatchedDyesForCurrentHarmony(): Dye[] {
    const matches = this.findHarmonyDyes(this.selectedHarmonyType);
    return matches.map((m) => m.dye);
  }

  /**
   * Show/hide empty state
   */
  private showEmptyState(show: boolean): void {
    if (this.emptyStateContainer) {
      this.emptyStateContainer.style.display = show ? 'flex' : 'none';
    }
    if (this.harmonyGridContainer) {
      this.harmonyGridContainer.style.display = show ? 'none' : 'flex';
    }
  }

  /**
   * Update price data on harmony displays and result panels
   */
  private updateHarmonyDisplayPrices(): void {
    for (const display of this.harmonyDisplays.values()) {
      display.setPriceData(this.priceData);
    }
    for (const panel of this.resultPanels) {
      panel.setPriceData(this.priceData);
    }
  }

  /**
   * Fetch prices for all displayed dyes (base + harmony dyes)
   * Called when prices are enabled, server changes, or categories change
   * Delegates to MarketBoardService which handles race condition protection
   */
  private async fetchPricesForDisplayedDyes(): Promise<void> {
    if (!this.showPrices || !this.selectedDye) {
      return;
    }

    // Collect all dyes that need price fetching
    const dyesToFetch: Dye[] = [this.selectedDye];

    // Get harmony dyes from the current harmony type
    const offsets = HARMONY_OFFSETS[this.selectedHarmonyType] || [];
    const baseHsv = ColorService.hexToHsv(this.selectedDye.hex);
    const allDyes = dyeService.getAllDyes();

    for (let i = 0; i < offsets.length; i++) {
      const offset = offsets[i];
      const targetHue = (baseHsv.h + offset) % 360;

      // Get matches (same logic as generateHarmonies)
      let matches = this.findClosestDyesToHue(allDyes, targetHue, this.companionDyesCount + 10);
      matches = this.replaceExcludedDyes(matches, targetHue);

      // Use swapped dye if available, otherwise best match
      const swappedDye = this.swappedDyes.get(i);
      const displayDye = swappedDye || matches[0]?.dye;

      if (displayDye) {
        dyesToFetch.push(displayDye);
      }

      // Also add closest dyes (companion dyes)
      const closestDyes = matches
        .filter((m) => displayDye && m.dye.itemID !== displayDye.itemID)
        .slice(0, this.companionDyesCount)
        .map((m) => m.dye);

      dyesToFetch.push(...closestDyes);
    }

    // Fetch prices via MarketBoardService (handles race conditions internally)
    try {
      const prices = await this.marketBoardService.fetchPricesForDyes(dyesToFetch);

      // If prices were returned (not discarded as stale), update UI
      if (prices.size > 0) {
        this.updateHarmonyDisplayPrices();
        this.updateV4ResultCardPrices();
        logger.info(`[HarmonyTool] Fetched prices for ${prices.size} dyes`);
      }
    } catch (error) {
      logger.error('[HarmonyTool] Failed to fetch prices:', error);
    }
  }

  /**
   * Update v4 result cards with newly fetched price data
   * Called after fetchPricesForDisplayedDyes() completes
   */
  private updateV4ResultCardPrices(): void {
    for (const card of this.v4ResultCards) {
      const currentData = card.data;
      if (!currentData?.dye) continue;

      const priceInfo = this.priceData.get(currentData.dye.itemID);

      // Resolve worldId to world name via MarketBoardService
      const marketServer = this.marketBoardService.getWorldNameForPrice(priceInfo);

      // Update card data with new price info (triggers Lit re-render)
      card.data = {
        dye: currentData.dye,
        originalColor: currentData.originalColor,
        matchedColor: currentData.matchedColor,
        deltaE: currentData.deltaE,
        hueDeviance: currentData.hueDeviance,
        vendorCost: currentData.vendorCost,
        price: this.showPrices && priceInfo ? priceInfo.currentAverage : undefined,
        marketServer: marketServer,
      };
    }
  }

  // ============================================================================
  // Export Functionality
  // ============================================================================

  private handleExport(): void {
    if (!this.selectedDye) {
      logger.warn('[HarmonyTool] No dye selected for export');
      return;
    }

    const matchedDyes = this.getMatchedDyesForCurrentHarmony();
    const paletteData: PaletteData = {
      base: this.selectedDye,
      groups: {
        [this.selectedHarmonyType]: matchedDyes,
      },
      metadata: {
        harmonyType: this.selectedHarmonyType,
        generatedAt: new Date().toISOString(),
      },
    };

    // For now, just log - full export implementation deferred
    logger.info('[HarmonyTool] Export palette:', paletteData);

    // TODO: Integrate PaletteExporter component
    // this.paletteExporter?.exportPalette(paletteData);
  }

  // ============================================================================
  // V4 Config Integration
  // ============================================================================

  /**
   * Update tool configuration from external source (V4 ConfigSidebar)
   * This method allows the V4 layout to control tool settings.
   *
   * @param config Partial HarmonyConfig with updated values
   */
  public setConfig(config: Partial<{
    harmonyType: string;
    showNames: boolean;
    showHex: boolean;
    showRgb: boolean;
    showHsv: boolean;
    strictMatching: boolean;
  }>): void {
    let needsRerender = false;

    // Handle harmony type change
    if (config.harmonyType !== undefined && config.harmonyType !== this.selectedHarmonyType) {
      this.selectedHarmonyType = config.harmonyType;
      StorageService.setItem(STORAGE_KEYS.harmonyType, config.harmonyType);
      this.swappedDyes.clear();
      needsRerender = true;
      logger.info(`[HarmonyTool] setConfig: harmonyType -> ${config.harmonyType}`);
    }

    // Handle perceptual matching (strictMatching) change
    // Note: This is now handled by ConfigController subscription in onMount()
    // which triggers regenerateHarmonies() with the updated usePerceptualMatching flag
    if (config.strictMatching !== undefined) {
      logger.info(`[HarmonyTool] setConfig: strictMatching -> ${config.strictMatching}`);
    }

    // Handle display option changes (showNames, showHex, showRgb, showHsv)
    // These would require updating result panel rendering
    // For now, log them - full integration in Phase 8
    if (config.showNames !== undefined) {
      logger.debug(`[HarmonyTool] setConfig: showNames -> ${config.showNames}`);
    }
    if (config.showHex !== undefined) {
      logger.debug(`[HarmonyTool] setConfig: showHex -> ${config.showHex}`);
    }
    if (config.showRgb !== undefined) {
      logger.debug(`[HarmonyTool] setConfig: showRgb -> ${config.showRgb}`);
    }
    if (config.showHsv !== undefined) {
      logger.debug(`[HarmonyTool] setConfig: showHsv -> ${config.showHsv}`);
    }

    // Re-render if needed
    if (needsRerender && this.selectedDye) {
      this.generateHarmonies();
      this.updateDrawerContent();

      // Update harmony type buttons if they exist
      if (this.harmonyTypesContainer) {
        const buttons = this.harmonyTypesContainer.querySelectorAll('button');
        buttons.forEach((btn) => {
          const isSelected = btn.getAttribute('data-harmony-type') === this.selectedHarmonyType;
          btn.setAttribute(
            'style',
            isSelected
              ? 'background: var(--theme-primary); color: var(--theme-text-header);'
              : 'background: transparent; color: var(--theme-text);'
          );
        });
      }
    }
  }

  /**
   * Select a dye from external source (Color Palette drawer)
   * Sets the dye as the base color and updates the UI.
   *
   * @param dye The dye to select as the base color
   */
  public selectDye(dye: Dye): void {
    if (!dye) return;

    this.selectedDye = dye;

    // Persist to storage
    StorageService.setItem(STORAGE_KEYS.selectedDyeId, dye.itemID);
    logger.info(`[HarmonyTool] External dye selected: ${dye.name} (itemID=${dye.itemID})`);

    // Update the DyeSelector if it exists
    if (this.dyeSelector) {
      this.dyeSelector.setSelectedDyes([dye]);
    }

    // Generate harmonies and update UI
    this.generateHarmonies();
    this.updateDrawerContent();
  }
}
