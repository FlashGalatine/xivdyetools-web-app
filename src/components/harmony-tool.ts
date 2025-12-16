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
import { ColorService, dyeService, LanguageService, RouterService, StorageService } from '@services/index';
import { logger } from '@shared/logger';
import { clearContainer } from '@shared/utils';
import type { Dye, PriceData } from '@shared/types';
import { HARMONY_ICONS } from '@shared/harmony-icons';
import {
  COMPANION_DYES_MIN,
  COMPANION_DYES_MAX,
  COMPANION_DYES_DEFAULT,
} from '@shared/constants';

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

// SVG Icons
const ICON_FILTER = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path stroke-linecap="round" stroke-linejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
</svg>`;

const ICON_MARKET = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
</svg>`;

const ICON_EXPORT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
</svg>`;

const ICON_BUDGET = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <ellipse cx="12" cy="7" rx="7" ry="3" />
  <path d="M5 7v4c0 1.66 3.13 3 7 3s7-1.34 7-3V7" />
  <path d="M5 11v4c0 1.66 3.13 3 7 3s7-1.34 7-3v-4" />
  <path d="M5 15v2c0 1.66 3.13 3 7 3s7-1.34 7-3v-2" />
</svg>`;

// Beaker icon for Base Dye
const ICON_BEAKER = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M9 3h6v5l4 9a2 2 0 01-2 3H7a2 2 0 01-2-3l4-9V3z" />
  <path d="M9 3h6" />
  <path d="M7 17h10" />
</svg>`;

// Music note icon for Harmony Type
const ICON_MUSIC = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="8" cy="18" r="4" />
  <path d="M12 18V2l7 4" />
</svg>`;

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
  private showPrices: boolean = false;
  private priceData: Map<number, PriceData> = new Map();
  private filterConfig: DyeFilterConfig | null = null;
  /** Tracks user-swapped dyes per harmony slot (harmonyIndex -> swapped dye) */
  private swappedDyes: Map<number, Dye> = new Map();

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
  private languageUnsubscribe: (() => void) | null = null;

  constructor(container: HTMLElement, options: HarmonyToolOptions) {
    super(container);
    this.options = options;

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
    this.languageUnsubscribe = LanguageService.subscribe(() => {
      this.update();
    });

    // Generate initial harmonies if a dye is selected
    if (this.selectedDye) {
      this.generateHarmonies();
      // Fetch prices on initial load if enabled
      if (this.showPrices) {
        this.fetchPricesForDisplayedDyes();
      }
    }

    logger.info('[HarmonyTool] Mounted');
  }

  destroy(): void {
    // Cleanup subscriptions
    this.languageUnsubscribe?.();

    // Cleanup child components
    this.destroyChildComponents();

    super.destroy();
    logger.info('[HarmonyTool] Destroyed');
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
    const marketContent = this.createElement('div');
    this.marketBoard = new MarketBoard(marketContent);
    this.marketBoard.init();

    // Sync initial showPrices state from MarketBoard (loaded from localStorage)
    this.showPrices = this.marketBoard.getShowPrices();

    // Listen for price toggle changes (custom event)
    marketContent.addEventListener('showPricesChanged', ((event: Event) => {
      const customEvent = event as CustomEvent<{ showPrices: boolean }>;
      this.showPrices = customEvent.detail.showPrices;
      this.generateHarmonies();
      if (this.showPrices) {
        this.fetchPricesForDisplayedDyes();
      }
    }) as EventListener);

    // Listen for server changes - refetch prices when server selection changes
    marketContent.addEventListener('server-changed', (() => {
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

    // Color Wheel Section
    this.colorWheelContainer = this.createElement('div', {
      className: 'flex justify-center mb-6',
    });
    right.appendChild(this.colorWheelContainer);

    // Results Header
    const resultsHeader = this.createElement('div', {
      className: 'flex items-center justify-between mb-4',
    });

    const resultsTitle = this.createElement('h3', {
      className: 'text-sm font-semibold uppercase tracking-wider',
      textContent: LanguageService.t('harmony.results'),
      attributes: { style: 'color: var(--theme-text-muted);' },
    });

    // Button container for multiple actions
    const btnGroup = this.createElement('div', {
      className: 'flex items-center gap-2',
    });

    // Budget Options button
    const budgetBtn = this.createElement('button', {
      className: 'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors',
      attributes: {
        style: 'background: var(--theme-background-secondary); color: var(--theme-text); border: 1px solid var(--theme-border);',
        title: LanguageService.t('budget.findCheaperTooltip') || 'Find cheaper alternatives',
      },
      innerHTML: `<span class="w-4 h-4">${ICON_BUDGET}</span> ${LanguageService.t('budget.budgetOptions') || 'Budget Options'}`,
    });

    this.on(budgetBtn, 'click', () => {
      if (this.selectedDye) {
        RouterService.navigateTo('budget', { dye: this.selectedDye.name });
      }
    });

    const exportBtn = this.createElement('button', {
      className: 'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors',
      attributes: {
        style: 'background: var(--theme-background-secondary); color: var(--theme-text); border: 1px solid var(--theme-border);',
      },
      innerHTML: `<span class="w-4 h-4">${ICON_EXPORT}</span> ${LanguageService.t('export.button')}`,
    });

    this.on(exportBtn, 'click', () => this.handleExport());

    btnGroup.appendChild(budgetBtn);
    btnGroup.appendChild(exportBtn);

    resultsHeader.appendChild(resultsTitle);
    resultsHeader.appendChild(btnGroup);
    right.appendChild(resultsHeader);

    // Harmony Results Grid (2-column for larger result panels)
    this.harmonyGridContainer = this.createElement('div', {
      className: 'grid gap-4 md:grid-cols-2',
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
   * Render color wheel visualization
   */
  private renderColorWheel(): void {
    if (!this.colorWheelContainer) return;
    clearContainer(this.colorWheelContainer);

    if (this.selectedDye) {
      // Get matched dyes for the selected harmony type
      const matchedDyes = this.getMatchedDyesForCurrentHarmony();

      this.colorWheel = new ColorWheelDisplay(
        this.colorWheelContainer,
        this.selectedDye.hex,
        matchedDyes,
        this.selectedHarmonyType,
        200
      );
      this.colorWheel.init();
    } else {
      // Placeholder wheel
      const placeholder = this.createElement('div', {
        className: 'w-48 h-48 rounded-full border-2 border-dashed flex items-center justify-center',
        attributes: {
          style: 'border-color: var(--theme-border); color: var(--theme-text-muted);',
        },
      });
      placeholder.innerHTML = `
        <svg class="w-12 h-12 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke-width="1.5" />
          <path stroke-width="1.5" d="M12 2v20M2 12h20" />
        </svg>
      `;
      this.colorWheelContainer.appendChild(placeholder);
    }
  }

  /**
   * Render empty state when no dye selected
   */
  private renderEmptyState(): void {
    if (!this.emptyStateContainer) return;
    clearContainer(this.emptyStateContainer);

    const empty = this.createElement('div', {
      className: 'col-span-full p-8 rounded-lg border-2 border-dashed text-center',
      attributes: {
        style: 'border-color: var(--theme-border); background: var(--theme-card-background);',
      },
    });

    empty.innerHTML = `
      <svg class="w-12 h-12 mx-auto mb-3 opacity-30" style="color: var(--theme-text);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
      <p style="color: var(--theme-text);">${LanguageService.t('harmony.selectDyePrompt')}</p>
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

    // Sync initial showPrices state from MarketBoard (loaded from localStorage)
    // Only sync if desktop marketBoard hasn't already set it
    if (!this.showPrices) {
      this.showPrices = this.drawerMarketBoard.getShowPrices();
    }

    // Listen for price toggle changes
    marketContent.addEventListener('showPricesChanged', ((event: Event) => {
      const customEvent = event as CustomEvent<{ showPrices: boolean }>;
      this.showPrices = customEvent.detail.showPrices;
      this.generateHarmonies();
      if (this.showPrices) {
        this.fetchPricesForDisplayedDyes();
      }
    }) as EventListener);

    marketContent.addEventListener('server-changed', (() => {
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
   * Render an individual result panel (Base or Harmony N)
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

    const panelContainer = this.createElement('div', {
      attributes: { 'data-harmony-panel': options.label },
    });

    const panel = new HarmonyResultPanel(panelContainer, {
      ...options,
      showPrices: this.showPrices,
      priceData: this.priceData,
    });
    panel.init();

    this.resultPanels.push(panel);
    this.harmonyGridContainer.appendChild(panelContainer);
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
   */
  private findClosestDyesToHue(
    dyes: Dye[],
    targetHue: number,
    count: number
  ): Array<{ dye: Dye; deviance: number }> {
    const scored = dyes.map((dye) => {
      const dyeHsv = ColorService.hexToHsv(dye.hex);
      const hueDiff = Math.abs(dyeHsv.h - targetHue);
      const deviance = Math.min(hueDiff, 360 - hueDiff);
      return { dye, deviance };
    });

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
      this.emptyStateContainer.classList.toggle('hidden', !show);
    }
    if (this.harmonyGridContainer) {
      this.harmonyGridContainer.classList.toggle('hidden', show);
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
   */
  private async fetchPricesForDisplayedDyes(): Promise<void> {
    if (!this.showPrices || !this.marketBoard || !this.selectedDye) {
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

    // Fetch prices from market board
    try {
      const prices = await this.marketBoard.fetchPricesForDyes(dyesToFetch);
      this.priceData = prices;
      this.updateHarmonyDisplayPrices();
      logger.info(`[HarmonyTool] Fetched prices for ${prices.size} dyes`);
    } catch (error) {
      logger.error('[HarmonyTool] Failed to fetch prices:', error);
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
}
