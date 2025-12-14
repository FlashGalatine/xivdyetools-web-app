/**
 * XIV Dye Tools v3.0.0 - Budget Tool Component
 *
 * Phase 8: Budget Suggestions - Find affordable dye alternatives.
 * Helps players find cheaper alternatives to expensive dyes within their budget.
 *
 * Left Panel: Target dye selector, quick picks, budget slider, sort options, filters, market board
 * Right Panel: Target overview, alternatives list with price/savings display
 *
 * @module components/tools/budget-tool
 */

import { BaseComponent } from '@components/base-component';
import { CollapsiblePanel } from '@components/collapsible-panel';
import { DyeSelector } from '@components/dye-selector';
import { DyeFilters } from '@components/dye-filters';
import { MarketBoard } from '@components/market-board';
import { ColorService, dyeService, LanguageService, StorageService, ToastService } from '@services/index';
import { RouterService } from '@services/router-service';
import { ICON_TOOL_BUDGET } from '@shared/tool-icons';
import { logger } from '@shared/logger';
import { clearContainer } from '@shared/utils';
import type { Dye, PriceData } from '@shared/types';

// ============================================================================
// Types and Constants
// ============================================================================

export interface BudgetToolOptions {
  leftPanel: HTMLElement;
  rightPanel: HTMLElement;
  drawerContent?: HTMLElement | null;
}

/**
 * Alternative dye with price and savings data
 */
interface AlternativeDye {
  dye: Dye;
  distance: number;
  price: number;
  savings: number;
  valueScore: number;
}

/**
 * Storage keys for v3 budget tool
 */
const STORAGE_KEYS = {
  targetDyeId: 'v3_budget_target',
  budgetLimit: 'v3_budget_limit',
  sortBy: 'v3_budget_sort',
  colorDistance: 'v3_budget_distance',
} as const;

/**
 * Default values
 */
const DEFAULTS = {
  budgetLimit: 50000,
  sortBy: 'match' as const,
  colorDistance: 50,
};

/**
 * Popular expensive dyes for quick picks
 */
const POPULAR_EXPENSIVE_DYE_NAMES = [
  'Pure White',
  'Jet Black',
  'Carmine Red',
  'Violet Purple',
  'Azure Blue',
  'Bright Orange',
];

const ICON_FILTER = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path stroke-linecap="round" stroke-linejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
</svg>`;

const ICON_MARKET = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
</svg>`;

const ICON_TARGET = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
</svg>`;

const ICON_SPARKLES = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"/>
</svg>`;

const ICON_COINS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
</svg>`;

const ICON_SORT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path stroke-linecap="round" stroke-linejoin="round" d="M3 7h6M3 12h10M3 17h4m11-10l-4 4m0 0l4 4m-4-4h8"/>
</svg>`;

const ICON_DISTANCE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path stroke-linecap="round" stroke-linejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/>
</svg>`;

// ============================================================================
// BudgetTool Component
// ============================================================================

/**
 * Budget Tool - v3 Two-Panel Layout
 *
 * Find affordable alternatives to expensive dyes within budget constraints.
 */
export class BudgetTool extends BaseComponent {
  private options: BudgetToolOptions;

  // State
  private targetDye: Dye | null = null;
  private budgetLimit: number;
  private sortBy: 'match' | 'price' | 'value';
  private colorDistance: number;
  private alternatives: AlternativeDye[] = [];
  private priceData: Map<number, PriceData> = new Map();
  private targetPrice: number = 0;
  private isLoading: boolean = false;

  // Child components
  private dyeSelector: DyeSelector | null = null;
  private dyeFilters: DyeFilters | null = null;
  private marketBoard: MarketBoard | null = null;
  private filtersPanel: CollapsiblePanel | null = null;
  private marketPanel: CollapsiblePanel | null = null;
  private targetDyePanel: CollapsiblePanel | null = null;
  private quickPicksPanel: CollapsiblePanel | null = null;
  private budgetLimitPanel: CollapsiblePanel | null = null;
  private sortByPanel: CollapsiblePanel | null = null;
  private colorDistancePanel: CollapsiblePanel | null = null;

  // DOM References
  private targetDyeContainer: HTMLElement | null = null;
  private budgetValueDisplay: HTMLElement | null = null;
  private distanceValueDisplay: HTMLElement | null = null;
  private emptyStateContainer: HTMLElement | null = null;
  private targetOverviewContainer: HTMLElement | null = null;
  private alternativesHeaderContainer: HTMLElement | null = null;
  private alternativesListContainer: HTMLElement | null = null;
  private quickPickButtons: HTMLButtonElement[] = [];

  // Mobile drawer components (separate from desktop)
  private mobileDyeSelector: DyeSelector | null = null;
  private mobileDyeFilters: DyeFilters | null = null;
  private mobileMarketBoard: MarketBoard | null = null;
  private mobileTargetDyePanel: CollapsiblePanel | null = null;
  private mobileQuickPicksPanel: CollapsiblePanel | null = null;
  private mobileBudgetLimitPanel: CollapsiblePanel | null = null;
  private mobileSortByPanel: CollapsiblePanel | null = null;
  private mobileColorDistancePanel: CollapsiblePanel | null = null;
  private mobileFiltersPanel: CollapsiblePanel | null = null;
  private mobileMarketPanel: CollapsiblePanel | null = null;
  private mobileTargetDyeContainer: HTMLElement | null = null;
  private mobileBudgetValueDisplay: HTMLElement | null = null;
  private mobileDistanceValueDisplay: HTMLElement | null = null;
  private mobileQuickPickButtons: HTMLButtonElement[] = [];

  // Subscriptions
  private languageUnsubscribe: (() => void) | null = null;

  constructor(container: HTMLElement, options: BudgetToolOptions) {
    super(container);
    this.options = options;

    // Load persisted settings
    this.budgetLimit = StorageService.getItem<number>(STORAGE_KEYS.budgetLimit) ?? DEFAULTS.budgetLimit;
    this.sortBy = StorageService.getItem<'match' | 'price' | 'value'>(STORAGE_KEYS.sortBy) ?? DEFAULTS.sortBy;
    this.colorDistance = StorageService.getItem<number>(STORAGE_KEYS.colorDistance) ?? DEFAULTS.colorDistance;

    // Load persisted target dye
    const savedDyeId = StorageService.getItem<number>(STORAGE_KEYS.targetDyeId);
    if (savedDyeId) {
      this.targetDye = dyeService.getDyeById(savedDyeId) || null;
    }
  }

  // ============================================================================
  // Lifecycle Methods
  // ============================================================================

  render(): void {
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

    logger.info('[BudgetTool] Mounted');

    // Handle deep linking
    this.handleDeepLink();

    // Load initial data if target dye is set
    if (this.targetDye) {
      this.findAlternatives();
    }
  }

  destroy(): void {
    this.languageUnsubscribe?.();

    // Desktop components
    this.dyeSelector?.destroy();
    this.dyeFilters?.destroy();
    this.marketBoard?.destroy();
    this.filtersPanel?.destroy();
    this.marketPanel?.destroy();
    this.targetDyePanel?.destroy();
    this.quickPicksPanel?.destroy();
    this.budgetLimitPanel?.destroy();
    this.sortByPanel?.destroy();
    this.colorDistancePanel?.destroy();

    // Mobile components
    this.mobileDyeSelector?.destroy();
    this.mobileDyeFilters?.destroy();
    this.mobileMarketBoard?.destroy();
    this.mobileTargetDyePanel?.destroy();
    this.mobileQuickPicksPanel?.destroy();
    this.mobileBudgetLimitPanel?.destroy();
    this.mobileSortByPanel?.destroy();
    this.mobileColorDistancePanel?.destroy();
    this.mobileFiltersPanel?.destroy();
    this.mobileMarketPanel?.destroy();

    this.targetDye = null;
    this.alternatives = [];
    this.priceData.clear();
    this.quickPickButtons = [];
    this.mobileQuickPickButtons = [];

    super.destroy();
    logger.info('[BudgetTool] Destroyed');
  }

  // ============================================================================
  // Deep Linking Support
  // ============================================================================

  /**
   * Handle URL parameters for cross-tool navigation
   */
  private handleDeepLink(): void {
    const params = new URLSearchParams(window.location.search);
    const dyeName = params.get('dye');

    if (dyeName) {
      // Search for dye by name (exact match preferred)
      const matches = dyeService.searchByName(dyeName);
      const dye = matches.find(d => d.name.toLowerCase() === dyeName.toLowerCase()) || matches[0];
      if (dye) {
        this.targetDye = dye;
        this.updateTargetDyeDisplay();
        this.updateQuickPickSelection();
        StorageService.setItem(STORAGE_KEYS.targetDyeId, dye.id);
        this.findAlternatives();
      }
    }
  }

  // ============================================================================
  // Left Panel Rendering
  // ============================================================================

  private renderLeftPanel(): void {
    const left = this.options.leftPanel;
    clearContainer(left);

    // Section 1: Target Dye (collapsible, default open)
    const targetContainer = this.createElement('div');
    left.appendChild(targetContainer);
    this.targetDyePanel = new CollapsiblePanel(targetContainer, {
      title: LanguageService.t('budget.targetDye') || 'Target Dye',
      storageKey: 'v3_budget_target_panel',
      defaultOpen: true,
      icon: ICON_TARGET,
    });
    this.targetDyePanel.init();
    const targetContent = this.createElement('div');
    this.renderTargetDyeSection(targetContent);
    this.targetDyePanel.setContent(targetContent);

    // Section 2: Quick Picks (collapsible, default open)
    const quickContainer = this.createElement('div');
    left.appendChild(quickContainer);
    this.quickPicksPanel = new CollapsiblePanel(quickContainer, {
      title: LanguageService.t('budget.quickPicks') || 'Quick Picks',
      storageKey: 'v3_budget_quickpicks_panel',
      defaultOpen: true,
      icon: ICON_SPARKLES,
    });
    this.quickPicksPanel.init();
    const quickContent = this.createElement('div');
    this.renderQuickPicksSection(quickContent);
    this.quickPicksPanel.setContent(quickContent);

    // Section 3: Budget Limit (collapsible, default open)
    const budgetContainer = this.createElement('div');
    left.appendChild(budgetContainer);
    this.budgetLimitPanel = new CollapsiblePanel(budgetContainer, {
      title: LanguageService.t('budget.budgetLimit') || 'Budget Limit',
      storageKey: 'v3_budget_limit_panel',
      defaultOpen: true,
      icon: ICON_COINS,
    });
    this.budgetLimitPanel.init();
    const budgetContent = this.createElement('div');
    this.renderBudgetSection(budgetContent);
    this.budgetLimitPanel.setContent(budgetContent);

    // Section 4: Color Distance (collapsible, default closed)
    const distanceContainer = this.createElement('div');
    left.appendChild(distanceContainer);
    this.colorDistancePanel = new CollapsiblePanel(distanceContainer, {
      title: LanguageService.t('budget.colorDistance') || 'Color Distance',
      storageKey: 'v3_budget_distance_panel',
      defaultOpen: false,
      icon: ICON_DISTANCE,
    });
    this.colorDistancePanel.init();
    const distanceContent = this.createElement('div');
    this.renderColorDistanceSection(distanceContent);
    this.colorDistancePanel.setContent(distanceContent);

    // Section 5: Sort Options (collapsible, default closed)
    const sortContainer = this.createElement('div');
    left.appendChild(sortContainer);
    this.sortByPanel = new CollapsiblePanel(sortContainer, {
      title: LanguageService.t('budget.sortBy') || 'Sort By',
      storageKey: 'v3_budget_sort_panel',
      defaultOpen: false,
      icon: ICON_SORT,
    });
    this.sortByPanel.init();
    const sortContent = this.createElement('div');
    this.renderSortSection(sortContent);
    this.sortByPanel.setContent(sortContent);

    // Section 6: Dye Filters (collapsible)
    const filtersContainer = this.createElement('div');
    left.appendChild(filtersContainer);
    this.filtersPanel = new CollapsiblePanel(filtersContainer, {
      title: LanguageService.t('filters.title') || 'Dye Filters',
      storageKey: 'v3_budget_filters',
      defaultOpen: false,
      icon: ICON_FILTER,
    });
    this.filtersPanel.init();

    const filtersContent = this.createElement('div');
    this.dyeFilters = new DyeFilters(filtersContent, {
      storageKeyPrefix: 'v3_budget',
      onFilterChange: () => {
        this.findAlternatives();
      },
      hideHeader: true, // Prevent double-nesting with external CollapsiblePanel
    });
    this.dyeFilters.render();
    this.dyeFilters.bindEvents();
    this.filtersPanel.setContent(filtersContent);

    // Section 7: Market Board (collapsible)
    const marketContainer = this.createElement('div');
    left.appendChild(marketContainer);
    this.marketPanel = new CollapsiblePanel(marketContainer, {
      title: LanguageService.t('marketBoard.title') || 'Market Board',
      storageKey: 'v3_budget_market',
      defaultOpen: false,
      icon: ICON_MARKET,
    });
    this.marketPanel.init();

    const marketContent = this.createElement('div');
    this.marketBoard = new MarketBoard(marketContent);
    this.marketBoard.init();

    // Listen for server changes to refresh prices
    marketContent.addEventListener('server-changed', () => {
      this.findAlternatives();
    });

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
   * Render target dye display and selector
   */
  private renderTargetDyeSection(container: HTMLElement): void {
    const dyeContainer = this.createElement('div', { className: 'space-y-3' });

    // Selected dye display
    this.targetDyeContainer = this.createElement('div');
    dyeContainer.appendChild(this.targetDyeContainer);
    this.updateTargetDyeDisplay();

    // Dye selector component
    const selectorContainer = this.createElement('div', { className: 'mt-2' });
    dyeContainer.appendChild(selectorContainer);

    this.dyeSelector = new DyeSelector(selectorContainer, {
      maxSelections: 1,
      allowMultiple: false,
      allowDuplicates: false,
      showCategories: true,
      showPrices: true,
      excludeFacewear: true,
      showFavorites: true,
      compactMode: true,
    });
    this.dyeSelector.init();

    // Listen for selection changes
    selectorContainer.addEventListener('selection-changed', () => {
      const selectedDyes = this.dyeSelector?.getSelectedDyes() || [];
      this.targetDye = selectedDyes[0] || null;
      this.updateTargetDyeDisplay();
      this.updateQuickPickSelection();

      if (this.targetDye) {
        StorageService.setItem(STORAGE_KEYS.targetDyeId, this.targetDye.id);
      }

      this.findAlternatives();
      this.updateDrawerContent();
    });

    container.appendChild(dyeContainer);
  }

  /**
   * Update target dye display card
   */
  private updateTargetDyeDisplay(): void {
    if (!this.targetDyeContainer) return;
    clearContainer(this.targetDyeContainer);

    if (!this.targetDye) {
      // Empty state
      const placeholder = this.createElement('div', {
        className: 'p-4 rounded-lg border-2 border-dashed text-center',
        textContent: LanguageService.t('budget.selectTargetDye') || 'Select a target dye',
        attributes: {
          style: 'border-color: var(--theme-border); color: var(--theme-text-muted);',
        },
      });
      this.targetDyeContainer.appendChild(placeholder);
      return;
    }

    // Display card with dye color as background
    // Dynamically set text color based on background luminance for optimal readability
    const isLight = this.isLightColor(this.targetDye.hex);
    const textColor = isLight ? '#1A1A1A' : '#FFFFFF';
    // Add subtle text shadow for better contrast on mid-range colors
    const textShadow = isLight
      ? '0 1px 2px rgba(255, 255, 255, 0.3)'
      : '0 1px 2px rgba(0, 0, 0, 0.3)';

    const card = this.createElement('div', {
      className: 'p-4 rounded-lg',
      attributes: {
        style: `background: ${this.targetDye.hex}; border: 1px solid var(--theme-border);`,
      },
    });

    const name = this.createElement('p', {
      className: 'font-semibold text-lg mb-1',
      textContent: LanguageService.getDyeName(this.targetDye.itemID) || this.targetDye.name,
      attributes: { style: `color: ${textColor} !important; text-shadow: ${textShadow};` },
    });

    const hex = this.createElement('p', {
      className: 'text-sm font-mono mb-2',
      textContent: this.targetDye.hex,
      attributes: { style: `color: ${textColor} !important; opacity: 0.8; text-shadow: ${textShadow};` },
    });

    const price = this.createElement('p', {
      className: 'text-sm font-medium',
      textContent: this.targetPrice > 0
        ? `~${this.targetPrice.toLocaleString()} gil`
        : LanguageService.t('budget.loadingPrice') || 'Loading price...',
      attributes: { style: `color: ${textColor} !important; text-shadow: ${textShadow};` },
    });

    card.appendChild(name);
    card.appendChild(hex);
    card.appendChild(price);
    this.targetDyeContainer.appendChild(card);
  }

  /**
   * Render quick picks grid
   */
  private renderQuickPicksSection(container: HTMLElement): void {
    const grid = this.createElement('div', {
      className: 'grid grid-cols-3 gap-2',
    });

    this.quickPickButtons = [];

    POPULAR_EXPENSIVE_DYE_NAMES.forEach(dyeName => {
      const matches = dyeService.searchByName(dyeName);
      const dye = matches.find(d => d.name === dyeName) || matches[0];
      if (!dye) return;

      const isSelected = this.targetDye?.id === dye.id;
      const btn = this.createElement('button', {
        className: 'flex flex-col items-center gap-1 p-2 rounded-lg transition-colors',
        attributes: {
          style: isSelected
            ? 'background: var(--theme-primary); color: var(--theme-text-header);'
            : 'background: var(--theme-card-background); color: var(--theme-text);',
          type: 'button',
          title: LanguageService.getDyeName(dye.itemID) || dye.name,
        },
      }) as HTMLButtonElement;

      const swatch = this.createElement('div', {
        className: 'w-6 h-6 rounded',
        attributes: { style: `background: ${dye.hex}; border: 1px solid var(--theme-border);` },
      });

      const label = this.createElement('span', {
        className: 'text-xs truncate w-full text-center',
        textContent: dyeName.split(' ')[0],
      });

      btn.appendChild(swatch);
      btn.appendChild(label);

      this.on(btn, 'click', () => {
        this.targetDye = dye;
        this.updateTargetDyeDisplay();
        this.updateQuickPickSelection();
        StorageService.setItem(STORAGE_KEYS.targetDyeId, dye.id);
        this.findAlternatives();
        this.updateDrawerContent();
      });

      this.quickPickButtons.push(btn);
      grid.appendChild(btn);
    });

    container.appendChild(grid);
  }

  /**
   * Update quick pick button selection state
   */
  private updateQuickPickSelection(): void {
    this.quickPickButtons.forEach((btn, index) => {
      const dyeName = POPULAR_EXPENSIVE_DYE_NAMES[index];
      const matches = dyeService.searchByName(dyeName);
      const dye = matches.find(d => d.name === dyeName) || matches[0];
      const isSelected = dye && this.targetDye?.id === dye.id;

      btn.setAttribute('style', isSelected
        ? 'background: var(--theme-primary); color: var(--theme-text-header);'
        : 'background: var(--theme-card-background); color: var(--theme-text);');
    });
  }

  /**
   * Render budget limit slider
   */
  private renderBudgetSection(container: HTMLElement): void {
    // Current value display
    const valueDisplay = this.createElement('div', {
      className: 'flex items-center justify-between mb-3',
    });

    const labelSpan = this.createElement('span', {
      className: 'text-sm',
      textContent: LanguageService.t('budget.maxPrice') || 'Max Price',
      attributes: { style: 'color: var(--theme-text-muted);' },
    });

    this.budgetValueDisplay = this.createElement('span', {
      className: 'font-semibold',
      textContent: `${this.budgetLimit.toLocaleString()} gil`,
      attributes: { style: 'color: var(--theme-text);' },
    });

    valueDisplay.appendChild(labelSpan);
    valueDisplay.appendChild(this.budgetValueDisplay);
    container.appendChild(valueDisplay);

    // Slider
    const slider = this.createElement('input', {
      className: 'w-full',
      attributes: {
        type: 'range',
        min: '0',
        max: '1000000',
        value: String(this.budgetLimit),
        step: '1000',
        style: 'accent-color: var(--theme-primary);',
      },
    }) as HTMLInputElement;

    this.on(slider, 'input', () => {
      this.budgetLimit = parseInt(slider.value, 10);
      if (this.budgetValueDisplay) {
        this.budgetValueDisplay.textContent = `${this.budgetLimit.toLocaleString()} gil`;
      }
      StorageService.setItem(STORAGE_KEYS.budgetLimit, this.budgetLimit);
      this.filterAndSortAlternatives();
      this.updateDrawerContent();
    });

    container.appendChild(slider);

    // Tick labels
    const ticksContainer = this.createElement('div', {
      className: 'flex justify-between mt-1',
    });
    ['0', '100K', '500K', '1M'].forEach(tick => {
      const tickLabel = this.createElement('span', {
        className: 'text-xs',
        textContent: tick,
        attributes: { style: 'color: var(--theme-text-muted);' },
      });
      ticksContainer.appendChild(tickLabel);
    });
    container.appendChild(ticksContainer);
  }

  /**
   * Render color distance (Delta-E) slider
   */
  private renderColorDistanceSection(container: HTMLElement): void {
    // Current value display
    const valueDisplay = this.createElement('div', {
      className: 'flex items-center justify-between mb-3',
    });

    const labelSpan = this.createElement('span', {
      className: 'text-sm',
      textContent: LanguageService.t('budget.maxDistance') || 'Max Delta-E',
      attributes: { style: 'color: var(--theme-text-muted);' },
    });

    this.distanceValueDisplay = this.createElement('span', {
      className: 'font-semibold',
      textContent: String(this.colorDistance),
      attributes: { style: 'color: var(--theme-text);' },
    });

    valueDisplay.appendChild(labelSpan);
    valueDisplay.appendChild(this.distanceValueDisplay);
    container.appendChild(valueDisplay);

    // Description text
    const description = this.createElement('p', {
      className: 'text-xs mb-3',
      textContent: LanguageService.t('budget.distanceDesc') || 'Higher values show more alternatives, lower values show closer matches',
      attributes: { style: 'color: var(--theme-text-muted);' },
    });
    container.appendChild(description);

    // Slider
    const slider = this.createElement('input', {
      className: 'w-full',
      attributes: {
        type: 'range',
        min: '25',
        max: '100',
        value: String(this.colorDistance),
        step: '5',
        style: 'accent-color: var(--theme-primary);',
      },
    }) as HTMLInputElement;

    this.on(slider, 'input', () => {
      this.colorDistance = parseInt(slider.value, 10);
      if (this.distanceValueDisplay) {
        this.distanceValueDisplay.textContent = String(this.colorDistance);
      }
      StorageService.setItem(STORAGE_KEYS.colorDistance, this.colorDistance);
      this.findAlternatives();
      this.updateDrawerContent();
    });

    container.appendChild(slider);

    // Tick labels
    const ticksContainer = this.createElement('div', {
      className: 'flex justify-between mt-1',
    });
    ['25', '50', '75', '100'].forEach(tick => {
      const tickLabel = this.createElement('span', {
        className: 'text-xs',
        textContent: tick,
        attributes: { style: 'color: var(--theme-text-muted);' },
      });
      ticksContainer.appendChild(tickLabel);
    });
    container.appendChild(ticksContainer);
  }

  /**
   * Render sort options
   */
  private renderSortSection(container: HTMLElement): void {
    const options = [
      { id: 'match', label: LanguageService.t('budget.sortMatch') || 'Best Match', desc: LanguageService.t('budget.sortMatchDesc') || 'Closest color first' },
      { id: 'price', label: LanguageService.t('budget.sortPrice') || 'Lowest Price', desc: LanguageService.t('budget.sortPriceDesc') || 'Cheapest first' },
      { id: 'value', label: LanguageService.t('budget.sortValue') || 'Best Value', desc: LanguageService.t('budget.sortValueDesc') || 'Balance of match + price' },
    ];

    const optionsContainer = this.createElement('div', { className: 'space-y-2' });

    options.forEach(opt => {
      const isSelected = this.sortBy === opt.id;
      const label = this.createElement('label', {
        className: 'flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors',
        attributes: {
          style: isSelected
            ? 'background: var(--theme-primary); color: var(--theme-text-header);'
            : 'background: transparent;',
        },
      });

      const radio = this.createElement('input', {
        className: 'mt-1',
        attributes: {
          type: 'radio',
          name: 'sortBy',
          value: opt.id,
          ...(isSelected && { checked: '' }),
        },
      }) as HTMLInputElement;

      const text = this.createElement('div');
      const labelText = this.createElement('span', {
        className: 'font-medium text-sm',
        textContent: opt.label,
      });
      const descText = this.createElement('p', {
        className: 'text-xs',
        textContent: opt.desc,
        attributes: { style: isSelected ? '' : 'color: var(--theme-text-muted);' },
      });
      text.appendChild(labelText);
      text.appendChild(descText);

      this.on(radio, 'change', () => {
        this.sortBy = opt.id as 'match' | 'price' | 'value';
        StorageService.setItem(STORAGE_KEYS.sortBy, this.sortBy);

        // Update all label styles
        optionsContainer.querySelectorAll('label').forEach((lbl, idx) => {
          const selected = options[idx].id === opt.id;
          lbl.setAttribute('style', selected
            ? 'background: var(--theme-primary); color: var(--theme-text-header);'
            : 'background: transparent;');
          const pEl = lbl.querySelector('p');
          if (pEl) {
            pEl.setAttribute('style', selected ? '' : 'color: var(--theme-text-muted);');
          }
        });

        this.filterAndSortAlternatives();
        this.updateDrawerContent();
      });

      label.appendChild(radio);
      label.appendChild(text);
      optionsContainer.appendChild(label);
    });

    container.appendChild(optionsContainer);
  }

  // ============================================================================
  // Right Panel Rendering
  // ============================================================================

  private renderRightPanel(): void {
    const right = this.options.rightPanel;
    clearContainer(right);

    // Empty state
    this.emptyStateContainer = this.createElement('div');
    this.renderEmptyState();
    right.appendChild(this.emptyStateContainer);

    // Target Overview Card
    this.targetOverviewContainer = this.createElement('div', { className: 'mb-6 hidden' });
    right.appendChild(this.targetOverviewContainer);

    // Alternatives Header
    this.alternativesHeaderContainer = this.createElement('div', { className: 'mb-4 hidden' });
    right.appendChild(this.alternativesHeaderContainer);

    // Alternatives List
    this.alternativesListContainer = this.createElement('div', { className: 'hidden' });
    right.appendChild(this.alternativesListContainer);
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
      <span class="inline-block w-12 h-12 mx-auto mb-3 opacity-30" style="color: var(--theme-text);">${ICON_TOOL_BUDGET}</span>
      <p style="color: var(--theme-text);">${LanguageService.t('budget.selectTargetToStart') || 'Select a target dye to find affordable alternatives'}</p>
    `;

    this.emptyStateContainer.appendChild(empty);
  }

  /**
   * Show/hide empty state
   */
  private showEmptyState(show: boolean): void {
    if (this.emptyStateContainer) {
      this.emptyStateContainer.classList.toggle('hidden', !show);
    }
    if (this.targetOverviewContainer) {
      this.targetOverviewContainer.classList.toggle('hidden', show);
    }
    if (this.alternativesHeaderContainer) {
      this.alternativesHeaderContainer.classList.toggle('hidden', show);
    }
    if (this.alternativesListContainer) {
      this.alternativesListContainer.classList.toggle('hidden', show);
    }
  }

  /**
   * Render target overview card
   */
  private renderTargetOverview(): void {
    if (!this.targetOverviewContainer || !this.targetDye) return;
    clearContainer(this.targetOverviewContainer);

    const card = this.createElement('div', {
      className: 'p-4 rounded-lg',
      attributes: {
        style: 'background: var(--theme-card-background); border: 1px solid var(--theme-border);',
      },
    });

    const content = this.createElement('div', { className: 'flex items-center gap-4' });

    // Color swatch
    const swatch = this.createElement('div', {
      className: 'w-16 h-16 rounded-lg flex-shrink-0',
      attributes: { style: `background: ${this.targetDye.hex}; border: 2px solid var(--theme-border);` },
    });

    // Dye info
    const info = this.createElement('div', { className: 'flex-1' });
    const name = this.createElement('h3', {
      className: 'font-semibold text-lg',
      textContent: LanguageService.getDyeName(this.targetDye.itemID) || this.targetDye.name,
      attributes: { style: 'color: var(--theme-text);' },
    });
    const hex = this.createElement('p', {
      className: 'text-sm font-mono',
      textContent: this.targetDye.hex,
      attributes: { style: 'color: var(--theme-text-muted);' },
    });
    info.appendChild(name);
    info.appendChild(hex);

    // Price info
    const priceInfo = this.createElement('div', { className: 'text-right' });
    const priceLabel = this.createElement('p', {
      className: 'text-sm',
      textContent: LanguageService.t('budget.marketPrice') || 'Market Price',
      attributes: { style: 'color: var(--theme-text-muted);' },
    });
    const priceValue = this.createElement('p', {
      className: 'font-semibold text-lg',
      textContent: this.targetPrice > 0 ? `~${this.targetPrice.toLocaleString()} gil` : '---',
      attributes: { style: 'color: var(--theme-text);' },
    });
    priceInfo.appendChild(priceLabel);
    priceInfo.appendChild(priceValue);

    content.appendChild(swatch);
    content.appendChild(info);
    content.appendChild(priceInfo);
    card.appendChild(content);
    this.targetOverviewContainer.appendChild(card);
  }

  /**
   * Render alternatives header
   */
  private renderAlternativesHeader(): void {
    if (!this.alternativesHeaderContainer) return;
    clearContainer(this.alternativesHeaderContainer);

    const header = this.createElement('div', {
      className: 'flex items-center justify-between',
    });

    const count = this.alternatives.length;
    const countText = this.createElement('h3', {
      className: 'font-semibold',
      textContent: `${count} ${LanguageService.t('budget.alternativesWithinBudget') || 'alternatives within budget'}`,
      attributes: { style: 'color: var(--theme-text);' },
    });

    const sortLabels: Record<string, string> = {
      match: LanguageService.t('budget.sortMatch') || 'Best Match',
      price: LanguageService.t('budget.sortPrice') || 'Lowest Price',
      value: LanguageService.t('budget.sortValue') || 'Best Value',
    };

    const sortBadge = this.createElement('span', {
      className: 'text-sm px-2 py-1 rounded',
      textContent: `${LanguageService.t('budget.sortedBy') || 'Sorted by'}: ${sortLabels[this.sortBy]}`,
      attributes: { style: 'background: var(--theme-background-secondary); color: var(--theme-text-muted);' },
    });

    header.appendChild(countText);
    header.appendChild(sortBadge);
    this.alternativesHeaderContainer.appendChild(header);
  }

  /**
   * Render alternatives list
   */
  private renderAlternativesList(): void {
    if (!this.alternativesListContainer || !this.targetDye) return;
    clearContainer(this.alternativesListContainer);

    if (this.isLoading) {
      const loading = this.createElement('div', {
        className: 'text-center py-8 flex flex-col items-center gap-3',
      });
      loading.innerHTML = `
        <svg class="animate-spin h-8 w-8" style="color: var(--theme-primary);" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p style="color: var(--theme-text-muted);">${LanguageService.t('budget.loading') || 'Loading alternatives...'}</p>
      `;
      this.alternativesListContainer.appendChild(loading);
      return;
    }

    if (this.alternatives.length === 0) {
      const emptyState = this.createElement('div', {
        className: 'text-center py-8',
      });
      emptyState.innerHTML = `
        <p class="text-lg font-medium mb-2" style="color: var(--theme-text);">${LanguageService.t('budget.noDyesWithinBudget') || 'No dyes within budget'}</p>
        <p class="text-sm mb-4" style="color: var(--theme-text-muted);">${LanguageService.t('budget.tryIncreasingBudget') || 'Try increasing your budget limit'}</p>
      `;
      this.alternativesListContainer.appendChild(emptyState);
      return;
    }

    const container = this.createElement('div', { className: 'space-y-3' });

    this.alternatives.forEach((alt, index) => {
      const card = this.createElement('div', {
        className: 'flex items-center gap-3 p-3 rounded-lg transition-colors',
        attributes: {
          style: 'background: var(--theme-card-background); border: 1px solid var(--theme-border);',
        },
      });

      // Rank badge
      const rankBadge = this.createElement('div', {
        className: 'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
        textContent: String(index + 1),
        attributes: {
          style: 'background: var(--theme-background-secondary); color: var(--theme-text-muted);',
        },
      });

      // Color comparison
      const colorCompare = this.createElement('div', {
        className: 'flex gap-1 flex-shrink-0',
      });
      const targetSwatch = this.createElement('div', {
        className: 'w-8 h-8 rounded',
        attributes: {
          style: `background: ${this.targetDye!.hex}; border: 1px solid var(--theme-border);`,
          title: LanguageService.t('budget.target') || 'Target',
        },
      });
      const altSwatch = this.createElement('div', {
        className: 'w-8 h-8 rounded',
        attributes: {
          style: `background: ${alt.dye.hex}; border: 1px solid var(--theme-border);`,
          title: LanguageService.getDyeName(alt.dye.itemID) || alt.dye.name,
        },
      });
      colorCompare.appendChild(targetSwatch);
      colorCompare.appendChild(altSwatch);

      // Dye info
      const info = this.createElement('div', {
        className: 'flex-1 min-w-0',
      });
      const dyeName = this.createElement('p', {
        className: 'font-medium truncate',
        textContent: LanguageService.getDyeName(alt.dye.itemID) || alt.dye.name,
        attributes: { style: 'color: var(--theme-text);' },
      });
      const dyeDetails = this.createElement('p', {
        className: 'text-xs',
        attributes: { style: 'color: var(--theme-text-muted);' },
      });
      dyeDetails.innerHTML = `<span class="font-mono">${alt.dye.hex}</span> · Δ${alt.distance.toFixed(1)}`;
      info.appendChild(dyeName);
      info.appendChild(dyeDetails);

      // Distance bar (hidden on mobile)
      const distanceBar = this.createElement('div', {
        className: 'w-20 flex-shrink-0 hidden sm:block',
      });
      const barWidth = Math.min(100, (alt.distance / this.colorDistance) * 100);
      const barOuter = this.createElement('div', {
        className: 'h-2 rounded-full',
        attributes: { style: 'background: var(--theme-background-secondary);' },
      });
      const barInner = this.createElement('div', {
        className: 'h-full rounded-full',
        attributes: { style: `background: var(--theme-primary); width: ${barWidth}%;` },
      });
      barOuter.appendChild(barInner);
      distanceBar.appendChild(barOuter);

      // Price & Savings
      const priceInfo = this.createElement('div', {
        className: 'text-right flex-shrink-0',
      });
      const priceText = this.createElement('p', {
        className: 'font-semibold',
        textContent: `${alt.price.toLocaleString()} gil`,
        attributes: { style: 'color: var(--theme-text);' },
      });
      const savingsText = this.createElement('p', {
        className: 'text-xs font-bold',
        textContent: alt.savings > 0 ? `${LanguageService.t('budget.save') || 'Save'} ${alt.savings.toLocaleString()}` : '',
        attributes: { style: 'color: #22C55E;' },
      });
      priceInfo.appendChild(priceText);
      priceInfo.appendChild(savingsText);

      card.appendChild(rankBadge);
      card.appendChild(colorCompare);
      card.appendChild(info);
      card.appendChild(distanceBar);
      card.appendChild(priceInfo);

      container.appendChild(card);
    });

    this.alternativesListContainer.appendChild(container);
  }

  // ============================================================================
  // Core Business Logic
  // ============================================================================

  /**
   * Find alternatives for the target dye
   */
  private async findAlternatives(): Promise<void> {
    if (!this.targetDye) {
      this.showEmptyState(true);
      this.alternatives = [];
      return;
    }

    this.showEmptyState(false);
    this.isLoading = true;
    this.renderAlternativesList();

    try {
      // 1. Get all dyes within user-configurable color distance threshold
      const candidates = dyeService.findDyesWithinDistance(this.targetDye.hex, this.colorDistance, 50);

      // 2. Apply filters
      let filtered = candidates.filter(dye => dye.id !== this.targetDye?.id);
      if (this.dyeFilters) {
        filtered = this.dyeFilters.filterDyes(filtered);
      }

      // 3. Fetch prices
      await this.fetchPrices([this.targetDye, ...filtered]);

      // 4. Get target price
      const targetPriceData = this.priceData.get(this.targetDye.itemID);
      this.targetPrice = targetPriceData?.currentMinPrice ?? 0;

      // 5. Build alternatives with price data
      this.alternatives = filtered.map(dye => {
        const priceData = this.priceData.get(dye.itemID);
        const price = priceData?.currentMinPrice ?? Infinity;
        const distance = ColorService.getColorDistance(this.targetDye!.hex, dye.hex);
        const savings = Math.max(0, this.targetPrice - price);
        const valueScore = this.calculateValueScore(distance, price);

        return { dye, distance, price, savings, valueScore };
      });

      // 6. Mark loading complete before filtering/sorting (so render shows results, not spinner)
      this.isLoading = false;

      // 7. Filter and sort
      this.filterAndSortAlternatives();

    } catch (error) {
      logger.error('[BudgetTool] Error finding alternatives:', error);
      ToastService.error(LanguageService.t('budget.errorFindingAlternatives') || 'Error finding alternatives');
      this.isLoading = false;
      this.renderAlternativesList(); // Show error state, not loading spinner
    } finally {
      this.renderTargetOverview();
      this.updateTargetDyeDisplay();
    }
  }

  /**
   * Filter by budget and sort alternatives
   */
  private filterAndSortAlternatives(): void {
    // Filter by budget
    const affordable = this.alternatives.filter(alt => alt.price <= this.budgetLimit);

    // Sort by selected criteria
    affordable.sort((a, b) => {
      switch (this.sortBy) {
        case 'price':
          return a.price - b.price;
        case 'value':
          return a.valueScore - b.valueScore;
        case 'match':
        default:
          return a.distance - b.distance;
      }
    });

    this.alternatives = affordable;
    this.renderAlternativesHeader();
    this.renderAlternativesList();
  }

  /**
   * Calculate value score (lower is better)
   */
  private calculateValueScore(distance: number, price: number): number {
    const maxDistance = 50;
    const maxPrice = 1000000;
    const normalizedDistance = (distance / maxDistance) * 100;
    const normalizedPrice = (price / maxPrice) * 100;
    return (normalizedDistance * 0.7) + (normalizedPrice * 0.3);
  }

  /**
   * Fetch prices for dyes
   */
  private async fetchPrices(dyes: Dye[]): Promise<void> {
    if (!this.marketBoard) return;

    try {
      const prices = await this.marketBoard.fetchPricesForDyes(dyes);
      prices.forEach((data, itemId) => {
        this.priceData.set(itemId, data);
      });
    } catch (error) {
      logger.warn('[BudgetTool] Error fetching prices:', error);
    }
  }

  // ============================================================================
  // Mobile Drawer Content
  // ============================================================================

  private renderDrawerContent(): void {
    if (!this.options.drawerContent) return;
    const drawer = this.options.drawerContent;
    clearContainer(drawer);

    // Section 1: Target Dye (collapsible, default open)
    const targetContainer = this.createElement('div');
    drawer.appendChild(targetContainer);
    this.mobileTargetDyePanel = new CollapsiblePanel(targetContainer, {
      title: LanguageService.t('budget.targetDye') || 'Target Dye',
      storageKey: 'v3_budget_mobile_target_panel',
      defaultOpen: true,
      icon: ICON_TARGET,
    });
    this.mobileTargetDyePanel.init();
    const targetContent = this.createElement('div');
    this.renderMobileTargetDyeSection(targetContent);
    this.mobileTargetDyePanel.setContent(targetContent);

    // Section 2: Quick Picks (collapsible, default open)
    const quickContainer = this.createElement('div');
    drawer.appendChild(quickContainer);
    this.mobileQuickPicksPanel = new CollapsiblePanel(quickContainer, {
      title: LanguageService.t('budget.quickPicks') || 'Quick Picks',
      storageKey: 'v3_budget_mobile_quickpicks_panel',
      defaultOpen: true,
      icon: ICON_SPARKLES,
    });
    this.mobileQuickPicksPanel.init();
    const quickContent = this.createElement('div');
    this.renderMobileQuickPicksSection(quickContent);
    this.mobileQuickPicksPanel.setContent(quickContent);

    // Section 3: Budget Limit (collapsible, default open)
    const budgetContainer = this.createElement('div');
    drawer.appendChild(budgetContainer);
    this.mobileBudgetLimitPanel = new CollapsiblePanel(budgetContainer, {
      title: LanguageService.t('budget.budgetLimit') || 'Budget Limit',
      storageKey: 'v3_budget_mobile_limit_panel',
      defaultOpen: true,
      icon: ICON_COINS,
    });
    this.mobileBudgetLimitPanel.init();
    const budgetContent = this.createElement('div');
    this.renderMobileBudgetSection(budgetContent);
    this.mobileBudgetLimitPanel.setContent(budgetContent);

    // Section 4: Color Distance (collapsible, default closed)
    const distanceContainer = this.createElement('div');
    drawer.appendChild(distanceContainer);
    this.mobileColorDistancePanel = new CollapsiblePanel(distanceContainer, {
      title: LanguageService.t('budget.colorDistance') || 'Color Distance',
      storageKey: 'v3_budget_mobile_distance_panel',
      defaultOpen: false,
      icon: ICON_DISTANCE,
    });
    this.mobileColorDistancePanel.init();
    const distanceContent = this.createElement('div');
    this.renderMobileColorDistanceSection(distanceContent);
    this.mobileColorDistancePanel.setContent(distanceContent);

    // Section 5: Sort Options (collapsible, default closed)
    const sortContainer = this.createElement('div');
    drawer.appendChild(sortContainer);
    this.mobileSortByPanel = new CollapsiblePanel(sortContainer, {
      title: LanguageService.t('budget.sortBy') || 'Sort By',
      storageKey: 'v3_budget_mobile_sort_panel',
      defaultOpen: false,
      icon: ICON_SORT,
    });
    this.mobileSortByPanel.init();
    const sortContent = this.createElement('div');
    this.renderMobileSortSection(sortContent);
    this.mobileSortByPanel.setContent(sortContent);

    // Section 6: Dye Filters (collapsible)
    const filtersContainer = this.createElement('div');
    drawer.appendChild(filtersContainer);
    this.mobileFiltersPanel = new CollapsiblePanel(filtersContainer, {
      title: LanguageService.t('filters.title') || 'Dye Filters',
      storageKey: 'v3_budget_mobile_filters',
      defaultOpen: false,
      icon: ICON_FILTER,
    });
    this.mobileFiltersPanel.init();

    const filtersContent = this.createElement('div');
    this.mobileDyeFilters = new DyeFilters(filtersContent, {
      storageKeyPrefix: 'v3_budget', // Share filter state with desktop
      onFilterChange: () => {
        this.findAlternatives();
      },
      hideHeader: true,
    });
    this.mobileDyeFilters.render();
    this.mobileDyeFilters.bindEvents();
    this.mobileFiltersPanel.setContent(filtersContent);

    // Section 7: Market Board (collapsible)
    const marketContainer = this.createElement('div');
    drawer.appendChild(marketContainer);
    this.mobileMarketPanel = new CollapsiblePanel(marketContainer, {
      title: LanguageService.t('marketBoard.title') || 'Market Board',
      storageKey: 'v3_budget_mobile_market',
      defaultOpen: false,
      icon: ICON_MARKET,
    });
    this.mobileMarketPanel.init();

    const marketContent = this.createElement('div');
    this.mobileMarketBoard = new MarketBoard(marketContent);
    this.mobileMarketBoard.init();

    // Listen for server changes to refresh prices
    marketContent.addEventListener('server-changed', () => {
      this.findAlternatives();
    });

    this.mobileMarketPanel.setContent(marketContent);
  }

  /**
   * Render mobile target dye display and selector
   */
  private renderMobileTargetDyeSection(container: HTMLElement): void {
    const dyeContainer = this.createElement('div', { className: 'space-y-3' });

    // Selected dye display
    this.mobileTargetDyeContainer = this.createElement('div');
    dyeContainer.appendChild(this.mobileTargetDyeContainer);
    this.updateMobileTargetDyeDisplay();

    // Dye selector component
    const selectorContainer = this.createElement('div', { className: 'mt-2' });
    dyeContainer.appendChild(selectorContainer);

    this.mobileDyeSelector = new DyeSelector(selectorContainer, {
      maxSelections: 1,
      allowMultiple: false,
      allowDuplicates: false,
      showCategories: true,
      showPrices: true,
      excludeFacewear: true,
      showFavorites: true,
      compactMode: true,
    });
    this.mobileDyeSelector.init();

    // Listen for selection changes
    selectorContainer.addEventListener('selection-changed', () => {
      const selectedDyes = this.mobileDyeSelector?.getSelectedDyes() || [];
      this.targetDye = selectedDyes[0] || null;
      this.updateTargetDyeDisplay();
      this.updateMobileTargetDyeDisplay();
      this.updateQuickPickSelection();
      this.updateMobileQuickPickSelection();

      if (this.targetDye) {
        StorageService.setItem(STORAGE_KEYS.targetDyeId, this.targetDye.id);
      }

      this.findAlternatives();
    });

    container.appendChild(dyeContainer);
  }

  /**
   * Update mobile target dye display card
   */
  private updateMobileTargetDyeDisplay(): void {
    if (!this.mobileTargetDyeContainer) return;
    clearContainer(this.mobileTargetDyeContainer);

    if (!this.targetDye) {
      const placeholder = this.createElement('div', {
        className: 'p-4 rounded-lg border-2 border-dashed text-center',
        textContent: LanguageService.t('budget.selectTargetDye') || 'Select a target dye',
        attributes: {
          style: 'border-color: var(--theme-border); color: var(--theme-text-muted);',
        },
      });
      this.mobileTargetDyeContainer.appendChild(placeholder);
      return;
    }

    const isLight = this.isLightColor(this.targetDye.hex);
    const textColor = isLight ? '#1A1A1A' : '#FFFFFF';
    const textShadow = isLight
      ? '0 1px 2px rgba(255, 255, 255, 0.3)'
      : '0 1px 2px rgba(0, 0, 0, 0.3)';

    const card = this.createElement('div', {
      className: 'p-4 rounded-lg',
      attributes: {
        style: `background: ${this.targetDye.hex}; border: 1px solid var(--theme-border);`,
      },
    });

    const name = this.createElement('p', {
      className: 'font-semibold text-lg mb-1',
      textContent: LanguageService.getDyeName(this.targetDye.itemID) || this.targetDye.name,
      attributes: { style: `color: ${textColor} !important; text-shadow: ${textShadow};` },
    });

    const hex = this.createElement('p', {
      className: 'text-sm font-mono mb-2',
      textContent: this.targetDye.hex,
      attributes: { style: `color: ${textColor} !important; opacity: 0.8; text-shadow: ${textShadow};` },
    });

    const price = this.createElement('p', {
      className: 'text-sm font-medium',
      textContent: this.targetPrice > 0
        ? `~${this.targetPrice.toLocaleString()} gil`
        : LanguageService.t('budget.loadingPrice') || 'Loading price...',
      attributes: { style: `color: ${textColor} !important; text-shadow: ${textShadow};` },
    });

    card.appendChild(name);
    card.appendChild(hex);
    card.appendChild(price);
    this.mobileTargetDyeContainer.appendChild(card);
  }

  /**
   * Render mobile quick picks grid
   */
  private renderMobileQuickPicksSection(container: HTMLElement): void {
    const grid = this.createElement('div', {
      className: 'grid grid-cols-3 gap-2',
    });

    this.mobileQuickPickButtons = [];

    POPULAR_EXPENSIVE_DYE_NAMES.forEach(dyeName => {
      const matches = dyeService.searchByName(dyeName);
      const dye = matches.find(d => d.name === dyeName) || matches[0];
      if (!dye) return;

      const isSelected = this.targetDye?.id === dye.id;
      const btn = this.createElement('button', {
        className: 'flex flex-col items-center gap-1 p-2 rounded-lg transition-colors',
        attributes: {
          style: isSelected
            ? 'background: var(--theme-primary); color: var(--theme-text-header);'
            : 'background: var(--theme-card-background); color: var(--theme-text);',
          type: 'button',
          title: LanguageService.getDyeName(dye.itemID) || dye.name,
        },
      }) as HTMLButtonElement;

      const swatch = this.createElement('div', {
        className: 'w-6 h-6 rounded',
        attributes: { style: `background: ${dye.hex}; border: 1px solid var(--theme-border);` },
      });

      const label = this.createElement('span', {
        className: 'text-xs truncate w-full text-center',
        textContent: dyeName.split(' ')[0],
      });

      btn.appendChild(swatch);
      btn.appendChild(label);

      this.on(btn, 'click', () => {
        this.targetDye = dye;
        this.updateTargetDyeDisplay();
        this.updateMobileTargetDyeDisplay();
        this.updateQuickPickSelection();
        this.updateMobileQuickPickSelection();
        StorageService.setItem(STORAGE_KEYS.targetDyeId, dye.id);
        this.findAlternatives();
      });

      this.mobileQuickPickButtons.push(btn);
      grid.appendChild(btn);
    });

    container.appendChild(grid);
  }

  /**
   * Update mobile quick pick button selection state
   */
  private updateMobileQuickPickSelection(): void {
    this.mobileQuickPickButtons.forEach((btn, index) => {
      const dyeName = POPULAR_EXPENSIVE_DYE_NAMES[index];
      const matches = dyeService.searchByName(dyeName);
      const dye = matches.find(d => d.name === dyeName) || matches[0];
      const isSelected = dye && this.targetDye?.id === dye.id;

      btn.setAttribute('style', isSelected
        ? 'background: var(--theme-primary); color: var(--theme-text-header);'
        : 'background: var(--theme-card-background); color: var(--theme-text);');
    });
  }

  /**
   * Render mobile budget limit slider
   */
  private renderMobileBudgetSection(container: HTMLElement): void {
    const valueDisplay = this.createElement('div', {
      className: 'flex items-center justify-between mb-3',
    });

    const labelSpan = this.createElement('span', {
      className: 'text-sm',
      textContent: LanguageService.t('budget.maxPrice') || 'Max Price',
      attributes: { style: 'color: var(--theme-text-muted);' },
    });

    this.mobileBudgetValueDisplay = this.createElement('span', {
      className: 'font-semibold',
      textContent: `${this.budgetLimit.toLocaleString()} gil`,
      attributes: { style: 'color: var(--theme-text);' },
    });

    valueDisplay.appendChild(labelSpan);
    valueDisplay.appendChild(this.mobileBudgetValueDisplay);
    container.appendChild(valueDisplay);

    const slider = this.createElement('input', {
      className: 'w-full',
      attributes: {
        type: 'range',
        min: '0',
        max: '1000000',
        value: String(this.budgetLimit),
        step: '1000',
        style: 'accent-color: var(--theme-primary);',
      },
    }) as HTMLInputElement;

    this.on(slider, 'input', () => {
      this.budgetLimit = parseInt(slider.value, 10);
      if (this.mobileBudgetValueDisplay) {
        this.mobileBudgetValueDisplay.textContent = `${this.budgetLimit.toLocaleString()} gil`;
      }
      if (this.budgetValueDisplay) {
        this.budgetValueDisplay.textContent = `${this.budgetLimit.toLocaleString()} gil`;
      }
      StorageService.setItem(STORAGE_KEYS.budgetLimit, this.budgetLimit);
      this.filterAndSortAlternatives();
    });

    container.appendChild(slider);

    const ticksContainer = this.createElement('div', {
      className: 'flex justify-between mt-1',
    });
    ['0', '100K', '500K', '1M'].forEach(tick => {
      const tickLabel = this.createElement('span', {
        className: 'text-xs',
        textContent: tick,
        attributes: { style: 'color: var(--theme-text-muted);' },
      });
      ticksContainer.appendChild(tickLabel);
    });
    container.appendChild(ticksContainer);
  }

  /**
   * Render mobile color distance slider
   */
  private renderMobileColorDistanceSection(container: HTMLElement): void {
    const valueDisplay = this.createElement('div', {
      className: 'flex items-center justify-between mb-3',
    });

    const labelSpan = this.createElement('span', {
      className: 'text-sm',
      textContent: LanguageService.t('budget.maxDistance') || 'Max Delta-E',
      attributes: { style: 'color: var(--theme-text-muted);' },
    });

    this.mobileDistanceValueDisplay = this.createElement('span', {
      className: 'font-semibold',
      textContent: String(this.colorDistance),
      attributes: { style: 'color: var(--theme-text);' },
    });

    valueDisplay.appendChild(labelSpan);
    valueDisplay.appendChild(this.mobileDistanceValueDisplay);
    container.appendChild(valueDisplay);

    const description = this.createElement('p', {
      className: 'text-xs mb-3',
      textContent: LanguageService.t('budget.distanceDesc') || 'Higher values show more alternatives, lower values show closer matches',
      attributes: { style: 'color: var(--theme-text-muted);' },
    });
    container.appendChild(description);

    const slider = this.createElement('input', {
      className: 'w-full',
      attributes: {
        type: 'range',
        min: '25',
        max: '100',
        value: String(this.colorDistance),
        step: '5',
        style: 'accent-color: var(--theme-primary);',
      },
    }) as HTMLInputElement;

    this.on(slider, 'input', () => {
      this.colorDistance = parseInt(slider.value, 10);
      if (this.mobileDistanceValueDisplay) {
        this.mobileDistanceValueDisplay.textContent = String(this.colorDistance);
      }
      if (this.distanceValueDisplay) {
        this.distanceValueDisplay.textContent = String(this.colorDistance);
      }
      StorageService.setItem(STORAGE_KEYS.colorDistance, this.colorDistance);
      this.findAlternatives();
    });

    container.appendChild(slider);

    const ticksContainer = this.createElement('div', {
      className: 'flex justify-between mt-1',
    });
    ['25', '50', '75', '100'].forEach(tick => {
      const tickLabel = this.createElement('span', {
        className: 'text-xs',
        textContent: tick,
        attributes: { style: 'color: var(--theme-text-muted);' },
      });
      ticksContainer.appendChild(tickLabel);
    });
    container.appendChild(ticksContainer);
  }

  /**
   * Render mobile sort options
   */
  private renderMobileSortSection(container: HTMLElement): void {
    const options = [
      { id: 'match', label: LanguageService.t('budget.sortMatch') || 'Best Match', desc: LanguageService.t('budget.sortMatchDesc') || 'Closest color first' },
      { id: 'price', label: LanguageService.t('budget.sortPrice') || 'Lowest Price', desc: LanguageService.t('budget.sortPriceDesc') || 'Cheapest first' },
      { id: 'value', label: LanguageService.t('budget.sortValue') || 'Best Value', desc: LanguageService.t('budget.sortValueDesc') || 'Balance of match + price' },
    ];

    const optionsContainer = this.createElement('div', { className: 'space-y-2' });

    options.forEach(opt => {
      const isSelected = this.sortBy === opt.id;
      const label = this.createElement('label', {
        className: 'flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors',
        attributes: {
          style: isSelected
            ? 'background: var(--theme-primary); color: var(--theme-text-header);'
            : 'background: transparent;',
        },
      });

      const radio = this.createElement('input', {
        className: 'mt-1',
        attributes: {
          type: 'radio',
          name: 'mobileSortBy',
          value: opt.id,
          ...(isSelected && { checked: '' }),
        },
      }) as HTMLInputElement;

      const text = this.createElement('div');
      const labelText = this.createElement('span', {
        className: 'font-medium text-sm',
        textContent: opt.label,
      });
      const descText = this.createElement('p', {
        className: 'text-xs',
        textContent: opt.desc,
        attributes: { style: isSelected ? '' : 'color: var(--theme-text-muted);' },
      });
      text.appendChild(labelText);
      text.appendChild(descText);

      this.on(radio, 'change', () => {
        this.sortBy = opt.id as 'match' | 'price' | 'value';
        StorageService.setItem(STORAGE_KEYS.sortBy, this.sortBy);

        // Update mobile label styles
        optionsContainer.querySelectorAll('label').forEach((lbl, idx) => {
          const selected = options[idx].id === opt.id;
          lbl.setAttribute('style', selected
            ? 'background: var(--theme-primary); color: var(--theme-text-header);'
            : 'background: transparent;');
          const pEl = lbl.querySelector('p');
          if (pEl) {
            pEl.setAttribute('style', selected ? '' : 'color: var(--theme-text-muted);');
          }
        });

        this.filterAndSortAlternatives();
      });

      label.appendChild(radio);
      label.appendChild(text);
      optionsContainer.appendChild(label);
    });

    container.appendChild(optionsContainer);
  }

  /**
   * Update drawer content (lightweight update for dynamic data only)
   */
  private updateDrawerContent(): void {
    this.updateMobileTargetDyeDisplay();
    this.updateMobileQuickPickSelection();
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  /**
   * Check if a color is light (for text contrast)
   */
  private isLightColor(hex: string): boolean {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
  }
}
