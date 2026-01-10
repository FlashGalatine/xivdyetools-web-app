/**
 * XIV Dye Tools v3.0.0 - Comparison Tool Component
 *
 * Phase 5: Dye Comparison migration to v3 two-panel layout.
 * Orchestrates dye comparison with visual charts and distance matrix.
 *
 * Left Panel: Dye selector (up to 4), comparison options
 * Right Panel: Statistics summary, Hue-Saturation plot, Brightness chart, Distance matrix
 *
 * @module components/tools/comparison-tool
 */

import { BaseComponent } from '@components/base-component';
import { CollapsiblePanel } from '@components/collapsible-panel';
import { DyeSelector } from '@components/dye-selector';
import { ColorService, ConfigController, DyeService, LanguageService, RouterService, StorageService } from '@services/index';
import { ICON_TOOL_COMPARISON } from '@shared/tool-icons';
import { ICON_BEAKER, ICON_SETTINGS } from '@shared/ui-icons';
import { logger } from '@shared/logger';
import { clearContainer } from '@shared/utils';
import type { Dye } from '@shared/types';
import type { ComparisonConfig } from '@shared/tool-config-types';

// ============================================================================
// Types and Constants
// ============================================================================

export interface ComparisonToolOptions {
  leftPanel: HTMLElement;
  rightPanel: HTMLElement;
  drawerContent?: HTMLElement | null;
}

/**
 * Comparison options state
 */
interface ComparisonOptions {
  showDistanceValues: boolean;
  highlightClosestPair: boolean;
  showRgb: boolean;
  showHsv: boolean;
  showMarketPrices: boolean;
}

/**
 * Dye with HSV values for charting
 */
interface DyeWithHSV {
  dye: Dye;
  h: number;
  s: number;
  v: number;
}

/**
 * Statistics summary
 */
interface ComparisonStats {
  avgSaturation: number;
  avgBrightness: number;
  hueRange: number;
  avgDistance: number;
}

/**
 * Storage keys for v3 comparison tool
 */
const STORAGE_KEYS = {
  showDistanceValues: 'v3_comparison_show_distance',
  highlightClosestPair: 'v3_comparison_highlight_closest',
  selectedDyes: 'v3_comparison_selected_dyes',
  showRgb: 'v3_comparison_show_rgb',
  showHsv: 'v3_comparison_show_hsv',
  showMarketPrices: 'v3_comparison_show_prices',
} as const;

/**
 * Default comparison options
 */
const DEFAULT_OPTIONS: ComparisonOptions = {
  showDistanceValues: true,
  highlightClosestPair: false,
  showRgb: true,
  showHsv: false,
  showMarketPrices: true,
};

// ============================================================================
// ComparisonTool Component
// ============================================================================

/**
 * Comparison Tool - v3 Two-Panel Layout
 *
 * Compares up to 4 selected dyes with visual charts and distance analysis.
 */
export class ComparisonTool extends BaseComponent {
  private options: ComparisonToolOptions;

  // State
  private selectedDyes: Dye[] = [];
  private dyesWithHSV: DyeWithHSV[] = [];
  private comparisonOptions: ComparisonOptions;
  private stats: ComparisonStats | null = null;
  private closestPair: [number, number] | null = null;

  // Child components
  private dyeSelector: DyeSelector | null = null;
  private dyeSelectorPanel: CollapsiblePanel | null = null;
  private optionsPanel: CollapsiblePanel | null = null;

  // Mobile drawer components
  private drawerDyeSelector: DyeSelector | null = null;
  private drawerDyeSelectorPanel: CollapsiblePanel | null = null;
  private drawerOptionsPanel: CollapsiblePanel | null = null;
  private drawerSelectedDyesContainer: HTMLElement | null = null;

  // DOM References
  private selectedDyesContainer: HTMLElement | null = null;
  private optionsContainer: HTMLElement | null = null;
  private emptyStateContainer: HTMLElement | null = null;
  private statsContainer: HTMLElement | null = null;
  private chartsContainer: HTMLElement | null = null;
  private matrixContainer: HTMLElement | null = null;

  // Subscriptions
  private languageUnsubscribe: (() => void) | null = null;
  private configUnsubscribe: (() => void) | null = null;

  constructor(container: HTMLElement, options: ComparisonToolOptions) {
    super(container);
    this.options = options;

    // Load persisted options
    this.comparisonOptions = {
      showDistanceValues:
        StorageService.getItem<boolean>(STORAGE_KEYS.showDistanceValues) ?? DEFAULT_OPTIONS.showDistanceValues,
      highlightClosestPair:
        StorageService.getItem<boolean>(STORAGE_KEYS.highlightClosestPair) ?? DEFAULT_OPTIONS.highlightClosestPair,
      showRgb: StorageService.getItem<boolean>(STORAGE_KEYS.showRgb) ?? DEFAULT_OPTIONS.showRgb,
      showHsv: StorageService.getItem<boolean>(STORAGE_KEYS.showHsv) ?? DEFAULT_OPTIONS.showHsv,
      showMarketPrices: StorageService.getItem<boolean>(STORAGE_KEYS.showMarketPrices) ?? DEFAULT_OPTIONS.showMarketPrices,
    };
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
    this.configUnsubscribe = ConfigController.getInstance().subscribe('comparison', (config) => {
      this.setConfig(config);
    });

    // Load persisted dyes after DyeSelector is initialized
    this.loadPersistedDyes();

    logger.info('[ComparisonTool] Mounted');
  }

  /**
   * Load persisted dyes from LocalStorage
   */
  private loadPersistedDyes(): void {
    const savedIds = StorageService.getItem<number[]>(STORAGE_KEYS.selectedDyes);
    if (savedIds && savedIds.length > 0 && this.dyeSelector) {
      const dyeService = DyeService.getInstance();
      const dyes = savedIds
        .map((id) => dyeService.getDyeById(id))
        .filter((d): d is Dye => d !== undefined);

      if (dyes.length > 0) {
        this.dyeSelector.setSelectedDyes(dyes);
        this.selectedDyes = dyes;
        this.calculateHSVValues();
        this.updateSelectedDyesDisplay();
        this.updateResults();
        this.updateDrawerSelectedDyesDisplay();
        logger.info(`[ComparisonTool] Loaded ${dyes.length} persisted dyes`);
      }
    }
  }

  /**
   * Save selected dyes to LocalStorage
   */
  private saveSelectedDyes(): void {
    const dyeIds = this.selectedDyes.map((d) => d.id);
    StorageService.setItem(STORAGE_KEYS.selectedDyes, dyeIds);
  }

  destroy(): void {
    this.languageUnsubscribe?.();
    this.configUnsubscribe?.();
    this.dyeSelector?.destroy();
    this.dyeSelectorPanel?.destroy();
    this.optionsPanel?.destroy();

    // Clean up drawer components
    this.drawerDyeSelector?.destroy();
    this.drawerDyeSelectorPanel?.destroy();
    this.drawerOptionsPanel?.destroy();

    this.selectedDyes = [];
    this.dyesWithHSV = [];

    super.destroy();
    logger.info('[ComparisonTool] Destroyed');
  }

  // ============================================================================
  // V4 Integration
  // ============================================================================

  /**
   * Update tool configuration from external source (V4 ConfigSidebar)
   */
  public setConfig(config: Partial<ComparisonConfig>): void {
    let needsRerender = false;

    // Handle showDeltaE (maps to showDistanceValues)
    if (config.showDeltaE !== undefined && config.showDeltaE !== this.comparisonOptions.showDistanceValues) {
      this.comparisonOptions.showDistanceValues = config.showDeltaE;
      StorageService.setItem(STORAGE_KEYS.showDistanceValues, config.showDeltaE);
      needsRerender = true;
      logger.info(`[ComparisonTool] setConfig: showDeltaE -> ${config.showDeltaE}`);
    }

    // Handle showRgb
    if (config.showRgb !== undefined && config.showRgb !== this.comparisonOptions.showRgb) {
      this.comparisonOptions.showRgb = config.showRgb;
      StorageService.setItem(STORAGE_KEYS.showRgb, config.showRgb);
      needsRerender = true;
      logger.info(`[ComparisonTool] setConfig: showRgb -> ${config.showRgb}`);
    }

    // Handle showHsv
    if (config.showHsv !== undefined && config.showHsv !== this.comparisonOptions.showHsv) {
      this.comparisonOptions.showHsv = config.showHsv;
      StorageService.setItem(STORAGE_KEYS.showHsv, config.showHsv);
      needsRerender = true;
      logger.info(`[ComparisonTool] setConfig: showHsv -> ${config.showHsv}`);
    }

    // Handle showMarketPrices
    if (config.showMarketPrices !== undefined && config.showMarketPrices !== this.comparisonOptions.showMarketPrices) {
      this.comparisonOptions.showMarketPrices = config.showMarketPrices;
      StorageService.setItem(STORAGE_KEYS.showMarketPrices, config.showMarketPrices);
      needsRerender = true;
      logger.info(`[ComparisonTool] setConfig: showMarketPrices -> ${config.showMarketPrices}`);
    }

    // Re-render if config changed and we have dyes selected
    if (needsRerender && this.selectedDyes.length > 0) {
      this.updateResults();
    }
  }

  // ============================================================================
  // Left Panel Rendering
  // ============================================================================

  private renderLeftPanel(): void {
    const left = this.options.leftPanel;
    clearContainer(left);

    // Section 1: Dye Selection (Collapsible)
    const dyeContainer = this.createElement('div');
    left.appendChild(dyeContainer);
    this.dyeSelectorPanel = new CollapsiblePanel(dyeContainer, {
      title: LanguageService.t('comparison.compareDyes') || 'Compare Dyes',
      storageKey: 'v3_comparison_dyes',
      defaultOpen: true,
      icon: ICON_BEAKER,
    });
    this.dyeSelectorPanel.init();
    const dyeContent = this.createElement('div');
    this.renderDyeSelector(dyeContent);
    this.dyeSelectorPanel.setContent(dyeContent);

    // Section 2: Options (Collapsible)
    const optionsContainer = this.createElement('div');
    left.appendChild(optionsContainer);
    this.optionsPanel = new CollapsiblePanel(optionsContainer, {
      title: LanguageService.t('common.options') || 'Options',
      storageKey: 'v3_comparison_options',
      defaultOpen: true,
      icon: ICON_SETTINGS,
    });
    this.optionsPanel.init();
    const optionsContent = this.createElement('div');
    this.renderOptions(optionsContent);
    this.optionsPanel.setContent(optionsContent);
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
   * Render dye selector section
   */
  private renderDyeSelector(container: HTMLElement): void {
    const dyeContainer = this.createElement('div', { className: 'space-y-3' });

    // Show selected dyes
    this.selectedDyesContainer = this.createElement('div', {
      className: 'selected-dyes-display space-y-2',
    });
    this.updateSelectedDyesDisplay();
    dyeContainer.appendChild(this.selectedDyesContainer);

    // Dye selector component
    const selectorContainer = this.createElement('div');
    dyeContainer.appendChild(selectorContainer);

    this.dyeSelector = new DyeSelector(selectorContainer, {
      maxSelections: 4,
      allowMultiple: true,
      allowDuplicates: false,
      showCategories: true,
      showPrices: false,
      excludeFacewear: true,
      showFavorites: true,
      compactMode: true,
      hideSelectedChips: true, // Selections shown above in dedicated display
    });
    this.dyeSelector.init();

    // Listen for selection changes
    selectorContainer.addEventListener('selection-changed', () => {
      if (this.dyeSelector) {
        this.selectedDyes = this.dyeSelector.getSelectedDyes();
        this.calculateHSVValues();
        this.updateSelectedDyesDisplay();
        this.updateResults();
        this.updateDrawerSelectedDyesDisplay();
        this.saveSelectedDyes();
      }
    });

    container.appendChild(dyeContainer);
  }

  /**
   * Update the selected dyes display
   */
  private updateSelectedDyesDisplay(): void {
    if (!this.selectedDyesContainer) return;
    clearContainer(this.selectedDyesContainer);

    if (this.selectedDyes.length === 0) {
      const placeholder = this.createElement('div', {
        className: 'p-3 rounded-lg border-2 border-dashed text-center text-sm',
        textContent: LanguageService.t('comparison.selectDyesToCompare') || 'Select dyes to compare',
        attributes: {
          style: 'border-color: var(--theme-border); color: var(--theme-text-muted);',
        },
      });
      this.selectedDyesContainer.appendChild(placeholder);
      return;
    }

    for (const dye of this.selectedDyes) {
      const dyeItem = this.createElement('div', {
        className: 'flex items-center gap-3 p-2 rounded-lg',
        attributes: { style: 'background: var(--theme-background-secondary);' },
      });

      const swatch = this.createElement('div', {
        className: 'w-8 h-8 rounded border',
        attributes: {
          style: `background: ${dye.hex}; border-color: var(--theme-border);`,
        },
      });

      const name = this.createElement('span', {
        className: 'flex-1 text-sm font-medium truncate',
        textContent: LanguageService.getDyeName(dye.itemID) || dye.name,
        attributes: { style: 'color: var(--theme-text);' },
      });

      const removeBtn = this.createElement('button', {
        className: 'text-xs px-2 py-1 rounded transition-colors',
        textContent: '\u00D7',
        attributes: {
          style: 'background: var(--theme-card-hover); color: var(--theme-text-muted);',
        },
      });

      this.on(removeBtn, 'click', () => {
        const newSelection = this.selectedDyes.filter((d) => d.id !== dye.id);
        this.dyeSelector?.setSelectedDyes(newSelection);
        this.selectedDyes = newSelection;
        this.calculateHSVValues();
        this.updateSelectedDyesDisplay();
        this.updateResults();
        this.updateDrawerSelectedDyesDisplay();
        this.saveSelectedDyes();
      });

      dyeItem.appendChild(swatch);
      dyeItem.appendChild(name);
      dyeItem.appendChild(removeBtn);
      this.selectedDyesContainer.appendChild(dyeItem);
    }

    // Add dye button if under max
    if (this.selectedDyes.length < 4) {
      const addBtn = this.createElement('button', {
        className: 'w-full p-3 rounded-lg border-2 border-dashed text-sm',
        textContent: `+ ${LanguageService.t('comparison.addDye') || 'Add Dye'}`,
        attributes: { style: 'border-color: var(--theme-border); color: var(--theme-text-muted);' },
      });
      // The DyeSelector below handles actual adding
      this.selectedDyesContainer.appendChild(addBtn);
    }
  }

  /**
   * Render comparison options
   */
  private renderOptions(container: HTMLElement): void {
    this.optionsContainer = this.createElement('div', { className: 'space-y-2' });

    const options = [
      {
        key: 'showDistanceValues' as const,
        label: LanguageService.t('comparison.showDistanceValues') || 'Show Distance Values',
      },
      {
        key: 'highlightClosestPair' as const,
        label: LanguageService.t('comparison.highlightClosestPair') || 'Highlight Closest Pair',
      },
    ];

    for (const option of options) {
      const label = this.createElement('label', {
        className: 'flex items-center gap-2 cursor-pointer',
      });

      const checkbox = this.createElement('input', {
        attributes: {
          type: 'checkbox',
          'data-option': option.key,
        },
        className: 'w-4 h-4 rounded',
      }) as HTMLInputElement;
      checkbox.checked = this.comparisonOptions[option.key];

      this.on(checkbox, 'change', () => {
        this.comparisonOptions[option.key] = checkbox.checked;
        StorageService.setItem(STORAGE_KEYS[option.key], checkbox.checked);
        this.updateResults();
      });

      const text = this.createElement('span', {
        className: 'text-sm',
        textContent: option.label,
        attributes: { style: 'color: var(--theme-text);' },
      });

      label.appendChild(checkbox);
      label.appendChild(text);
      this.optionsContainer.appendChild(label);
    }

    container.appendChild(this.optionsContainer);
  }

  // ============================================================================
  // Right Panel Rendering
  // ============================================================================

  private renderRightPanel(): void {
    const right = this.options.rightPanel;
    clearContainer(right);

    // Empty state (shown when < 2 dyes selected)
    this.emptyStateContainer = this.createElement('div');
    this.renderEmptyState();
    right.appendChild(this.emptyStateContainer);

    // Statistics Summary
    const statsSection = this.createElement('div', { className: 'mb-6 hidden' });
    statsSection.appendChild(this.createHeader(LanguageService.t('comparison.statistics') || 'Statistics'));
    this.statsContainer = this.createElement('div');
    statsSection.appendChild(this.statsContainer);
    right.appendChild(statsSection);

    // Charts Grid
    const chartsSection = this.createElement('div', { className: 'mb-6 hidden' });
    this.chartsContainer = this.createElement('div', { className: 'grid gap-4 lg:grid-cols-2' });
    chartsSection.appendChild(this.chartsContainer);
    right.appendChild(chartsSection);

    // Distance Matrix
    const matrixSection = this.createElement('div', { className: 'hidden' });
    matrixSection.appendChild(this.createHeader(LanguageService.t('comparison.colorDistanceMatrix') || 'Color Distance Matrix'));
    this.matrixContainer = this.createElement('div');
    matrixSection.appendChild(this.matrixContainer);
    right.appendChild(matrixSection);
  }

  /**
   * Render empty state
   */
  private renderEmptyState(): void {
    if (!this.emptyStateContainer) return;
    clearContainer(this.emptyStateContainer);

    const empty = this.createElement('div', {
      className: 'p-8 rounded-lg border-2 border-dashed text-center',
      attributes: {
        style: 'border-color: var(--theme-border); background: var(--theme-card-background);',
      },
    });

    empty.innerHTML = `
      <span class="inline-block w-12 h-12 mx-auto mb-3 opacity-30" style="color: var(--theme-text);">${ICON_TOOL_COMPARISON}</span>
      <p style="color: var(--theme-text);">${LanguageService.t('comparison.selectAtLeastTwoDyes') || 'Select at least 2 dyes to compare'}</p>
    `;

    this.emptyStateContainer.appendChild(empty);
  }

  /**
   * Update all results
   */
  private updateResults(): void {
    if (this.selectedDyes.length < 2) {
      this.showEmptyState(true);
      return;
    }

    this.showEmptyState(false);
    this.calculateStats();
    this.findClosestPair();
    this.renderStats();
    this.renderCharts();
    this.renderDistanceMatrix();
  }

  /**
   * Show/hide empty state
   */
  private showEmptyState(show: boolean): void {
    if (this.emptyStateContainer) {
      this.emptyStateContainer.classList.toggle('hidden', !show);
    }

    // Toggle all result sections
    const rightPanel = this.options.rightPanel;
    const sections = rightPanel.querySelectorAll(':scope > div:not(:first-child)');
    sections.forEach((section) => {
      section.classList.toggle('hidden', show);
    });
  }

  /**
   * Calculate HSV values for all selected dyes
   */
  private calculateHSVValues(): void {
    this.dyesWithHSV = this.selectedDyes.map((dye) => {
      const hsv = ColorService.hexToHsv(dye.hex);
      return {
        dye,
        h: hsv.h,
        s: hsv.s,
        v: hsv.v,
      };
    });
  }

  /**
   * Calculate comparison statistics
   */
  private calculateStats(): void {
    if (this.dyesWithHSV.length < 2) {
      this.stats = null;
      return;
    }

    // Calculate averages
    const avgSaturation = this.dyesWithHSV.reduce((sum, d) => sum + d.s, 0) / this.dyesWithHSV.length;
    const avgBrightness = this.dyesWithHSV.reduce((sum, d) => sum + d.v, 0) / this.dyesWithHSV.length;

    // Calculate hue range (considering hue wrapping)
    const hues = this.dyesWithHSV.map((d) => d.h).sort((a, b) => a - b);
    let maxGap = 0;
    let gapStart = 0;
    for (let i = 0; i < hues.length; i++) {
      const next = (i + 1) % hues.length;
      const gap = next === 0 ? 360 - hues[i] + hues[0] : hues[next] - hues[i];
      if (gap > maxGap) {
        maxGap = gap;
        gapStart = hues[next === 0 ? 0 : next];
      }
    }
    const hueRange = 360 - maxGap;

    // Calculate average pairwise distance
    let totalDistance = 0;
    let pairCount = 0;
    for (let i = 0; i < this.selectedDyes.length; i++) {
      for (let j = i + 1; j < this.selectedDyes.length; j++) {
        totalDistance += ColorService.getColorDistance(this.selectedDyes[i].hex, this.selectedDyes[j].hex);
        pairCount++;
      }
    }
    const avgDistance = pairCount > 0 ? totalDistance / pairCount : 0;

    this.stats = {
      avgSaturation: Math.round(avgSaturation),
      avgBrightness: Math.round(avgBrightness),
      hueRange: Math.round(hueRange),
      avgDistance: Math.round(avgDistance * 10) / 10,
    };
  }

  /**
   * Find the closest pair of dyes
   */
  private findClosestPair(): void {
    if (this.selectedDyes.length < 2) {
      this.closestPair = null;
      return;
    }

    let minDistance = Infinity;
    let closest: [number, number] = [0, 1];

    for (let i = 0; i < this.selectedDyes.length; i++) {
      for (let j = i + 1; j < this.selectedDyes.length; j++) {
        const distance = ColorService.getColorDistance(this.selectedDyes[i].hex, this.selectedDyes[j].hex);
        if (distance < minDistance) {
          minDistance = distance;
          closest = [i, j];
        }
      }
    }

    this.closestPair = closest;
  }

  /**
   * Render statistics summary
   */
  private renderStats(): void {
    if (!this.statsContainer || !this.stats) return;
    clearContainer(this.statsContainer);

    const grid = this.createElement('div', {
      className: 'grid grid-cols-2 gap-3 p-4 rounded-lg md:grid-cols-4',
      attributes: {
        style: 'background: var(--theme-card-background); border: 1px solid var(--theme-border);',
      },
    });

    const statItems = [
      { label: LanguageService.t('comparison.avgSaturation') || 'Avg Saturation', value: `${this.stats.avgSaturation}%` },
      { label: LanguageService.t('comparison.avgBrightness') || 'Avg Brightness', value: `${this.stats.avgBrightness}%` },
      { label: LanguageService.t('comparison.hueRange') || 'Hue Range', value: `${this.stats.hueRange}\u00B0` },
      { label: LanguageService.t('comparison.avgDistance') || 'Avg Distance', value: this.stats.avgDistance.toFixed(1) },
    ];

    for (const stat of statItems) {
      const item = this.createElement('div', { className: 'text-center' });
      item.innerHTML = `
        <p class="text-lg font-semibold number" style="color: var(--theme-text);">${stat.value}</p>
        <p class="text-xs" style="color: var(--theme-text-muted);">${stat.label}</p>
      `;
      grid.appendChild(item);
    }

    this.statsContainer.appendChild(grid);
  }

  /**
   * Render charts (Hue-Saturation plot and Brightness distribution)
   */
  private renderCharts(): void {
    if (!this.chartsContainer) return;
    clearContainer(this.chartsContainer);

    // Hue-Saturation Plot
    this.chartsContainer.appendChild(this.createChartCard(
      LanguageService.t('comparison.hueSaturationPlot') || 'Hue-Saturation Plot',
      this.createHueSatPlot()
    ));

    // Brightness Distribution
    this.chartsContainer.appendChild(this.createChartCard(
      LanguageService.t('comparison.brightnessDistribution') || 'Brightness Distribution',
      this.createBrightnessChart()
    ));
  }

  /**
   * Create a chart card wrapper
   */
  private createChartCard(title: string, content: HTMLElement): HTMLElement {
    const card = this.createElement('div', {
      className: 'p-4 rounded-lg flex flex-col',
      attributes: { style: 'background: var(--theme-card-background); border: 1px solid var(--theme-border);' },
    });
    card.appendChild(this.createElement('h4', {
      className: 'text-sm font-medium mb-3 flex-shrink-0',
      textContent: title,
      attributes: { style: 'color: var(--theme-text);' },
    }));
    const contentWrapper = this.createElement('div', { className: 'flex-1 flex flex-col min-h-0' });
    contentWrapper.appendChild(content);
    card.appendChild(contentWrapper);
    return card;
  }

  /**
   * Create Hue-Saturation SVG plot
   */
  private createHueSatPlot(): HTMLElement {
    // Use smaller max-height on mobile to save vertical space
    const plot = this.createElement('div', { className: 'relative aspect-square max-h-[200px] md:max-h-none mx-auto' });

    // Generate data points
    const points = this.dyesWithHSV.map((d, index) => {
      const x = (d.h / 360) * 100;
      const y = 100 - d.s;
      const isClosest = this.comparisonOptions.highlightClosestPair &&
        this.closestPair &&
        (index === this.closestPair[0] || index === this.closestPair[1]);
      return `
        <circle
          cx="${x}"
          cy="${y}"
          r="${isClosest ? 6 : 4}"
          fill="${d.dye.hex}"
          stroke="${isClosest ? 'var(--theme-primary)' : 'white'}"
          stroke-width="${isClosest ? 2.5 : 1.5}"
        />
        <text
          x="${x}"
          y="${y - 8}"
          text-anchor="middle"
          font-size="4"
          fill="var(--theme-text)"
        >${index + 1}</text>
      `;
    }).join('');

    plot.innerHTML = `
      <svg viewBox="0 0 130 120" class="w-full h-full">
        <!-- Chart area with padding for axis labels -->
        <g transform="translate(26, 4)">
          <!-- Background -->
          <rect width="100" height="100" fill="var(--theme-background-secondary)" rx="4" />
          <!-- Grid lines -->
          <line x1="0" y1="25" x2="100" y2="25" stroke="var(--theme-border)" stroke-dasharray="2" opacity="0.5" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="var(--theme-border)" stroke-dasharray="2" opacity="0.5" />
          <line x1="0" y1="75" x2="100" y2="75" stroke="var(--theme-border)" stroke-dasharray="2" opacity="0.5" />
          <line x1="25" y1="0" x2="25" y2="100" stroke="var(--theme-border)" stroke-dasharray="2" opacity="0.5" />
          <line x1="50" y1="0" x2="50" y2="100" stroke="var(--theme-border)" stroke-dasharray="2" opacity="0.5" />
          <line x1="75" y1="0" x2="75" y2="100" stroke="var(--theme-border)" stroke-dasharray="2" opacity="0.5" />
          <!-- Data points -->
          ${points}
          <!-- X-axis tick labels (Hue: 0° to 360°) -->
          <text x="0" y="108" text-anchor="middle" font-size="4" fill="var(--theme-text-muted)">0\u00B0</text>
          <text x="25" y="108" text-anchor="middle" font-size="4" fill="var(--theme-text-muted)">90\u00B0</text>
          <text x="50" y="108" text-anchor="middle" font-size="4" fill="var(--theme-text-muted)">180\u00B0</text>
          <text x="75" y="108" text-anchor="middle" font-size="4" fill="var(--theme-text-muted)">270\u00B0</text>
          <text x="100" y="108" text-anchor="middle" font-size="4" fill="var(--theme-text-muted)">360\u00B0</text>
          <!-- Y-axis tick labels (Saturation: 0% to 100%) -->
          <text x="-4" y="102" text-anchor="end" font-size="4" fill="var(--theme-text-muted)">0%</text>
          <text x="-4" y="77" text-anchor="end" font-size="4" fill="var(--theme-text-muted)">25%</text>
          <text x="-4" y="52" text-anchor="end" font-size="4" fill="var(--theme-text-muted)">50%</text>
          <text x="-4" y="27" text-anchor="end" font-size="4" fill="var(--theme-text-muted)">75%</text>
          <text x="-4" y="2" text-anchor="end" font-size="4" fill="var(--theme-text-muted)">100%</text>
        </g>
        <!-- Axis titles -->
        <text x="76" y="118" text-anchor="middle" font-size="5" fill="var(--theme-text-muted)">Hue</text>
        <text x="6" y="54" text-anchor="middle" font-size="5" fill="var(--theme-text-muted)" transform="rotate(-90 6 54)">Saturation</text>
      </svg>
    `;
    return plot;
  }

  /**
   * Create Brightness Distribution bar chart
   */
  private createBrightnessChart(): HTMLElement {
    // Smaller min-height on mobile to save vertical space
    const container = this.createElement('div', { className: 'flex flex-col flex-1 h-full min-h-[120px] md:min-h-[150px]' });

    // Bar chart area - smaller gap on mobile
    const chart = this.createElement('div', { className: 'flex items-end gap-2 md:gap-4 flex-1 h-full' });

    for (let i = 0; i < this.dyesWithHSV.length; i++) {
      const d = this.dyesWithHSV[i];
      const isClosest = this.comparisonOptions.highlightClosestPair &&
        this.closestPair &&
        (i === this.closestPair[0] || i === this.closestPair[1]);

      const bar = this.createElement('div', { className: 'flex-1 h-full flex items-end' });
      bar.innerHTML = `
        <div
          class="w-full rounded-t transition-all"
          style="height: ${d.v}%; background: ${d.dye.hex}; ${isClosest ? 'box-shadow: 0 0 0 3px var(--theme-primary);' : ''}"
        ></div>
      `;
      chart.appendChild(bar);
    }
    container.appendChild(chart);

    // Labels row - smaller gap on mobile to match bars
    const labels = this.createElement('div', {
      className: 'flex gap-2 md:gap-4 mt-2 pt-2 border-t flex-shrink-0',
      attributes: { style: 'border-color: var(--theme-border);' },
    });

    for (const d of this.dyesWithHSV) {
      const dyeName = LanguageService.getDyeName(d.dye.itemID) || d.dye.name;
      const label = this.createElement('div', { className: 'flex-1 text-center min-w-0' });
      label.innerHTML = `
        <span class="text-xs font-medium block truncate max-w-24 md:max-w-20 mx-auto" style="color: var(--theme-text);" title="${dyeName}">${dyeName}</span>
        <span class="text-xs" style="color: var(--theme-text-muted);">${Math.round(d.v)}%</span>
      `;
      labels.appendChild(label);
    }
    container.appendChild(labels);

    return container;
  }

  /**
   * Render distance matrix
   */
  private renderDistanceMatrix(): void {
    if (!this.matrixContainer) return;
    clearContainer(this.matrixContainer);

    if (this.selectedDyes.length < 2) return;

    const matrix = this.createElement('div', {
      className: 'rounded-lg overflow-hidden',
      attributes: { style: 'background: var(--theme-card-background); border: 1px solid var(--theme-border);' },
    });

    // Build table HTML - use sticky first column for row labels
    let html = '<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr><th class="sticky left-0 z-10" style="background: var(--theme-card-background);"></th>';

    // Column headers
    for (const dye of this.selectedDyes) {
      const dyeName = LanguageService.getDyeName(dye.itemID) || dye.name;
      html += `
        <th class="p-2 text-center">
          <div class="w-6 h-6 rounded mx-auto mb-1" style="background: ${dye.hex};"></div>
          <span class="text-xs font-normal block truncate max-w-16 md:max-w-20" style="color: var(--theme-text-muted);">${dyeName}</span>
        </th>
      `;
    }
    html += '</tr></thead><tbody>';

    // Data rows
    for (let i = 0; i < this.selectedDyes.length; i++) {
      const rowDye = this.selectedDyes[i];
      const rowDyeName = LanguageService.getDyeName(rowDye.itemID) || rowDye.name;
      const isRowClosest = this.comparisonOptions.highlightClosestPair &&
        this.closestPair &&
        (i === this.closestPair[0] || i === this.closestPair[1]);

      // Use sticky positioning for the first column so row labels stay visible when scrolling
      const rowBgColor = isRowClosest ? 'var(--theme-background-secondary)' : 'var(--theme-card-background)';
      html += `
        <tr>
          <td class="p-2 sticky left-0 z-10" style="background: ${rowBgColor};">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded shrink-0" style="background: ${rowDye.hex};"></div>
              <span class="text-xs truncate max-w-16 md:max-w-20" style="color: var(--theme-text);">${rowDyeName}</span>
            </div>
          </td>
      `;

      for (let j = 0; j < this.selectedDyes.length; j++) {
        const isColClosest = this.comparisonOptions.highlightClosestPair &&
          this.closestPair &&
          (j === this.closestPair[0] || j === this.closestPair[1]);
        const isPair = this.comparisonOptions.highlightClosestPair &&
          this.closestPair &&
          ((i === this.closestPair[0] && j === this.closestPair[1]) ||
           (i === this.closestPair[1] && j === this.closestPair[0]));

        if (i === j) {
          html += `<td class="p-2 text-center" style="color: var(--theme-text-muted);">-</td>`;
        } else {
          const distance = ColorService.getColorDistance(rowDye.hex, this.selectedDyes[j].hex);
          const distStr = distance.toFixed(1);
          const color = this.getDistanceColor(distance);
          const bgStyle = isPair ? 'background: var(--theme-primary); color: var(--theme-text-header);' :
            (isRowClosest && isColClosest ? 'background: var(--theme-background-secondary);' : '');

          if (this.comparisonOptions.showDistanceValues) {
            html += `<td class="p-2 text-center number" style="${bgStyle || `color: ${color};`}">${distStr}</td>`;
          } else {
            html += `<td class="p-2 text-center"><div class="w-4 h-4 rounded mx-auto" style="background: ${color};"></div></td>`;
          }
        }
      }

      html += '</tr>';
    }

    html += '</tbody></table></div>';
    matrix.innerHTML = html;
    this.matrixContainer.appendChild(matrix);
  }

  /**
   * Get color based on distance value
   */
  private getDistanceColor(distance: number): string {
    // Normalize to 0-1 range (max theoretical distance is ~441.67)
    const normalized = distance / 441.67;

    if (normalized >= 0.6) return '#22c55e'; // Very different (green - good)
    if (normalized >= 0.4) return '#3b82f6'; // Different (blue)
    if (normalized >= 0.2) return '#eab308'; // Somewhat similar (yellow)
    return '#ef4444'; // Very similar (red - warning)
  }

  // ============================================================================
  // Mobile Drawer Content
  // ============================================================================

  private renderDrawerContent(): void {
    if (!this.options.drawerContent) return;
    const drawer = this.options.drawerContent;
    clearContainer(drawer);

    // Clean up previous drawer components
    this.drawerDyeSelector?.destroy();
    this.drawerDyeSelectorPanel?.destroy();
    this.drawerOptionsPanel?.destroy();
    this.drawerDyeSelector = null;
    this.drawerDyeSelectorPanel = null;
    this.drawerOptionsPanel = null;

    // Section 1: Dye Selection (Collapsible)
    const dyeContainer = this.createElement('div');
    drawer.appendChild(dyeContainer);
    this.renderDrawerDyePanel(dyeContainer);

    // Section 2: Options (Collapsible)
    const optionsContainer = this.createElement('div');
    drawer.appendChild(optionsContainer);
    this.renderDrawerOptionsPanel(optionsContainer);
  }

  /**
   * Render collapsible Dye Selection panel for mobile drawer
   */
  private renderDrawerDyePanel(container: HTMLElement): void {
    this.drawerDyeSelectorPanel = new CollapsiblePanel(container, {
      title: LanguageService.t('comparison.compareDyes') || 'Compare Dyes',
      defaultOpen: true,
      storageKey: 'v3_comparison_dyes_drawer',
      icon: ICON_BEAKER,
    });
    this.drawerDyeSelectorPanel.init();

    const contentContainer = this.drawerDyeSelectorPanel.getContentContainer();
    if (contentContainer) {
      this.renderDrawerDyeSelector(contentContainer);
    }
  }

  /**
   * Render dye selector for mobile drawer
   */
  private renderDrawerDyeSelector(container: HTMLElement): void {
    const dyeContainer = this.createElement('div', { className: 'space-y-3' });

    // Selected dyes display
    this.drawerSelectedDyesContainer = this.createElement('div', {
      className: 'selected-dyes-display space-y-2',
    });
    this.updateDrawerSelectedDyesDisplay();
    dyeContainer.appendChild(this.drawerSelectedDyesContainer);

    // DyeSelector component
    const selectorContainer = this.createElement('div');
    dyeContainer.appendChild(selectorContainer);

    this.drawerDyeSelector = new DyeSelector(selectorContainer, {
      maxSelections: 4,
      allowMultiple: true,
      allowDuplicates: false,
      showCategories: true,
      showPrices: false,
      excludeFacewear: true,
      showFavorites: true,
      compactMode: true,
      hideSelectedChips: true, // Selections shown above in dedicated display
    });
    this.drawerDyeSelector.init();

    // Pre-select current dyes
    if (this.selectedDyes.length > 0) {
      this.drawerDyeSelector.setSelectedDyes(this.selectedDyes);
    }

    // Listen for selection changes
    selectorContainer.addEventListener('selection-changed', () => {
      if (this.drawerDyeSelector) {
        this.selectedDyes = this.drawerDyeSelector.getSelectedDyes();
        this.calculateHSVValues();

        // Sync desktop selector
        this.dyeSelector?.setSelectedDyes(this.selectedDyes);

        // Update displays
        this.updateSelectedDyesDisplay();
        this.updateDrawerSelectedDyesDisplay();
        this.updateResults();
        this.saveSelectedDyes();
      }
    });

    container.appendChild(dyeContainer);
  }

  /**
   * Update the selected dyes display in mobile drawer
   */
  private updateDrawerSelectedDyesDisplay(): void {
    if (!this.drawerSelectedDyesContainer) return;
    clearContainer(this.drawerSelectedDyesContainer);

    if (this.selectedDyes.length === 0) {
      // Show placeholder
      const placeholder = this.createElement('div', {
        className: 'p-3 rounded-lg border-2 border-dashed text-center text-sm',
        textContent: LanguageService.t('comparison.selectDyesToCompare') || 'Select dyes to compare',
        attributes: {
          style: 'border-color: var(--theme-border); color: var(--theme-text-muted);',
        },
      });
      this.drawerSelectedDyesContainer.appendChild(placeholder);
      return;
    }

    // Show selected dyes with remove buttons
    for (const dye of this.selectedDyes) {
      const dyeItem = this.createElement('div', {
        className: 'flex items-center gap-3 p-2 rounded-lg',
        attributes: { style: 'background: var(--theme-background-secondary);' },
      });

      const swatch = this.createElement('div', {
        className: 'w-8 h-8 rounded border flex-shrink-0',
        attributes: { style: `background: ${dye.hex}; border-color: var(--theme-border);` },
      });

      const name = this.createElement('span', {
        className: 'flex-1 text-sm font-medium truncate',
        textContent: LanguageService.getDyeName(dye.itemID) || dye.name,
        attributes: { style: 'color: var(--theme-text);' },
      });

      const removeBtn = this.createElement('button', {
        className: 'text-xs px-2 py-1 rounded transition-colors flex-shrink-0',
        textContent: '\u00D7',
        attributes: {
          style: 'background: var(--theme-card-hover); color: var(--theme-text-muted);',
        },
      });

      this.on(removeBtn, 'click', () => this.handleDrawerRemoveDye(dye));

      dyeItem.appendChild(swatch);
      dyeItem.appendChild(name);
      dyeItem.appendChild(removeBtn);
      this.drawerSelectedDyesContainer.appendChild(dyeItem);
    }
  }

  /**
   * Handle removing a dye from the mobile drawer
   */
  private handleDrawerRemoveDye(dye: Dye): void {
    const newSelection = this.selectedDyes.filter((d) => d.id !== dye.id);

    // Update both selectors
    this.drawerDyeSelector?.setSelectedDyes(newSelection);
    this.dyeSelector?.setSelectedDyes(newSelection);

    this.selectedDyes = newSelection;
    this.calculateHSVValues();
    this.updateSelectedDyesDisplay();
    this.updateDrawerSelectedDyesDisplay();
    this.updateResults();
    this.saveSelectedDyes();
  }

  /**
   * Render collapsible Options panel for mobile drawer
   */
  private renderDrawerOptionsPanel(container: HTMLElement): void {
    this.drawerOptionsPanel = new CollapsiblePanel(container, {
      title: LanguageService.t('common.options') || 'Options',
      defaultOpen: true,
      storageKey: 'v3_comparison_options_drawer',
      icon: ICON_SETTINGS,
    });
    this.drawerOptionsPanel.init();

    const contentContainer = this.drawerOptionsPanel.getContentContainer();
    if (contentContainer) {
      this.renderDrawerOptions(contentContainer);
    }
  }

  /**
   * Render option checkboxes in the mobile drawer
   */
  private renderDrawerOptions(container: HTMLElement): void {
    const optionsContainer = this.createElement('div', { className: 'space-y-2' });

    const options = [
      {
        key: 'showDistanceValues' as const,
        label: LanguageService.t('comparison.showDistanceValues') || 'Show Distance Values',
      },
      {
        key: 'highlightClosestPair' as const,
        label: LanguageService.t('comparison.highlightClosestPair') || 'Highlight Closest Pair',
      },
    ];

    for (const option of options) {
      const label = this.createElement('label', {
        className: 'flex items-center gap-2 cursor-pointer',
      });

      const checkbox = this.createElement('input', {
        attributes: {
          type: 'checkbox',
          'data-option': option.key,
        },
        className: 'w-4 h-4 rounded',
      }) as HTMLInputElement;
      checkbox.checked = this.comparisonOptions[option.key];

      this.on(checkbox, 'change', () => {
        this.comparisonOptions[option.key] = checkbox.checked;
        StorageService.setItem(STORAGE_KEYS[option.key], checkbox.checked);
        this.updateResults();
      });

      const text = this.createElement('span', {
        className: 'text-sm',
        textContent: option.label,
        attributes: { style: 'color: var(--theme-text);' },
      });

      label.appendChild(checkbox);
      label.appendChild(text);
      optionsContainer.appendChild(label);
    }

    container.appendChild(optionsContainer);
  }
}
