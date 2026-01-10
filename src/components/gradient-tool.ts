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
import { ColorService, dyeService, LanguageService, StorageService, ToastService } from '@services/index';
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
  stepCount: 5,
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
  private showPrices: boolean = false;
  private priceData: Map<number, PriceData> = new Map();

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

  // Subscriptions
  private languageUnsubscribe: (() => void) | null = null;

  constructor(container: HTMLElement, options: GradientToolOptions) {
    super(container);
    this.options = options;

    // Load persisted settings
    this.stepCount = StorageService.getItem<number>(STORAGE_KEYS.stepCount) ?? DEFAULTS.stepCount;
    this.colorSpace = StorageService.getItem<'rgb' | 'hsv'>(STORAGE_KEYS.colorSpace) ?? DEFAULTS.colorSpace;

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

    // If dyes were loaded from storage, calculate interpolation
    if (this.startDye && this.endDye) {
      this.updateInterpolation();
      this.updateDrawerContent();
    }

    logger.info('[MixerTool] Mounted');
  }

  destroy(): void {
    this.languageUnsubscribe?.();

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

    // Listen for price toggle changes
    marketContent.addEventListener('showPricesChanged', ((event: Event) => {
      const customEvent = event as CustomEvent<{ showPrices: boolean }>;
      this.showPrices = customEvent.detail.showPrices;
      if (this.showPrices) {
        // Fetch prices - this will update displays after fetching
        void this.fetchPricesForDisplayedDyes();
      } else {
        // Prices disabled - clear price data and update displays to remove prices
        this.priceData.clear();
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
      textContent: LanguageService.t('mixer.selectTwoDyes') || 'Select two dyes to create a gradient (first = start, second = end)',
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
          style: 'background: var(--theme-card-hover); color: var(--theme-text-muted); font-size: 1.25rem;',
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
        style: this.colorSpace === 'rgb'
          ? 'background: var(--theme-primary); color: var(--theme-text-header);'
          : 'background: var(--theme-background-secondary); color: var(--theme-text);',
      },
    });

    const hsvBtn = this.createElement('button', {
      className: 'flex-1 px-3 py-2 text-sm rounded-lg transition-colors',
      textContent: 'HSV',
      attributes: {
        style: this.colorSpace === 'hsv'
          ? 'background: var(--theme-primary); color: var(--theme-text-header);'
          : 'background: var(--theme-background-secondary); color: var(--theme-text);',
      },
    });

    this.on(rgbBtn, 'click', () => {
      this.colorSpace = 'rgb';
      StorageService.setItem(STORAGE_KEYS.colorSpace, 'rgb');
      rgbBtn.setAttribute('style', 'background: var(--theme-primary); color: var(--theme-text-header);');
      hsvBtn.setAttribute('style', 'background: var(--theme-background-secondary); color: var(--theme-text);');
      this.updateInterpolation();
      this.updateDrawerContent();
    });

    this.on(hsvBtn, 'click', () => {
      this.colorSpace = 'hsv';
      StorageService.setItem(STORAGE_KEYS.colorSpace, 'hsv');
      hsvBtn.setAttribute('style', 'background: var(--theme-primary); color: var(--theme-text-header);');
      rgbBtn.setAttribute('style', 'background: var(--theme-background-secondary); color: var(--theme-text);');
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

    // Empty state (shown when dyes not selected)
    this.emptyStateContainer = this.createElement('div');
    this.renderEmptyState();
    right.appendChild(this.emptyStateContainer);

    // Gradient Preview section
    const gradientSection = this.createElement('div', { className: 'mb-6 hidden' });
    gradientSection.appendChild(this.createHeader(LanguageService.t('mixer.interpolationPreview') || 'Interpolation Preview'));
    this.gradientContainer = this.createElement('div');
    gradientSection.appendChild(this.gradientContainer);
    right.appendChild(gradientSection);

    // Intermediate Matches section
    const matchesSection = this.createElement('div', { className: 'mb-6 hidden' });
    matchesSection.appendChild(this.createHeader(LanguageService.t('mixer.intermediateDyeMatches') || 'Intermediate Dye Matches'));
    this.matchesContainer = this.createElement('div');
    matchesSection.appendChild(this.matchesContainer);
    right.appendChild(matchesSection);

    // Export section
    this.exportContainer = this.createElement('div', { className: 'hidden' });
    right.appendChild(this.exportContainer);
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
      <span class="inline-block w-12 h-12 mx-auto mb-3 opacity-30" style="color: var(--theme-text);">${ICON_TOOL_MIXER}</span>
      <p style="color: var(--theme-text);">${LanguageService.t('mixer.selectStartEndDyes') || 'Select start and end dyes to create a color transition'}</p>
    `;

    this.emptyStateContainer.appendChild(empty);
  }

  /**
   * Update all results
   */
  private updateInterpolation(): void {
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
        matchedDye = filteredDyes.length > 0
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
   * Render gradient preview with step markers
   */
  private renderGradientPreview(): void {
    if (!this.gradientContainer || !this.startDye || !this.endDye) return;
    clearContainer(this.gradientContainer);

    const card = this.createElement('div', {
      className: 'p-4 rounded-lg',
      attributes: { style: 'background: var(--theme-card-background); border: 1px solid var(--theme-border);' },
    });

    // Gradient bar
    const gradient = this.createElement('div', {
      className: 'h-16 rounded-lg mb-3',
      attributes: { style: `background: linear-gradient(to right, ${this.startDye.hex}, ${this.endDye.hex});` },
    });
    card.appendChild(gradient);

    // Step markers
    const markers = this.createElement('div', { className: 'flex justify-between' });
    for (let i = 0; i < this.currentSteps.length; i++) {
      const step = this.currentSteps[i];
      const marker = this.createElement('div', { className: 'text-center' });
      marker.innerHTML = `
        <div class="w-8 h-8 rounded mx-auto mb-1" style="background: ${step.theoreticalColor}; border: 1px solid var(--theme-border);"></div>
        <span class="text-xs number" style="color: var(--theme-text-muted);">${i}</span>
      `;
      markers.appendChild(marker);
    }
    card.appendChild(markers);

    this.gradientContainer.appendChild(card);
  }

  /**
   * Render intermediate dye matches list
   */
  private renderIntermediateMatches(): void {
    if (!this.matchesContainer) return;
    clearContainer(this.matchesContainer);

    const container = this.createElement('div', { className: 'space-y-2' });

    // Only show intermediate steps (skip first and last which are the start/end dyes)
    for (let i = 1; i < this.currentSteps.length - 1; i++) {
      const step = this.currentSteps[i];
      const row = this.createElement('div', {
        className: 'flex items-center gap-3 p-3 rounded-lg',
        attributes: { style: 'background: var(--theme-card-background); border: 1px solid var(--theme-border);' },
      });

      // Step number
      const stepNum = this.createElement('span', {
        className: 'w-6 text-center font-medium',
        textContent: String(i),
        attributes: { style: 'color: var(--theme-text-muted);' },
      });
      row.appendChild(stepNum);

      // Theoretical color swatch
      const theoreticalSwatch = this.createElement('div', {
        className: 'w-10 h-10 rounded border',
        attributes: {
          style: `background: ${step.theoreticalColor}; border-color: var(--theme-border);`,
          title: LanguageService.t('mixer.targetColor') || 'Target',
        },
      });
      row.appendChild(theoreticalSwatch);

      // Arrow
      const arrow = this.createElement('span', {
        textContent: '\u2192',
        attributes: { style: 'color: var(--theme-text-muted);' },
      });
      row.appendChild(arrow);

      // Matched dye swatch
      if (step.matchedDye) {
        const matchedSwatch = this.createElement('div', {
          className: 'w-10 h-10 rounded',
          attributes: {
            style: `background: ${step.matchedDye.hex};`,
            title: LanguageService.t('mixer.bestMatch') || 'Best Match',
          },
        });
        row.appendChild(matchedSwatch);

        // Dye info
        const info = this.createElement('div', { className: 'flex-1' });
        const dyeName = this.createElement('p', {
          className: 'text-sm font-medium',
          textContent: LanguageService.getDyeName(step.matchedDye.itemID) || step.matchedDye.name,
          attributes: { style: 'color: var(--theme-text);' },
        });
        const distance = this.createElement('p', {
          className: 'text-xs number',
          textContent: `${LanguageService.t('mixer.distance') || 'Distance'}: ${step.distance.toFixed(1)}`,
          attributes: { style: 'color: var(--theme-text-muted);' },
        });
        info.appendChild(dyeName);
        info.appendChild(distance);

        // Add price if enabled
        const priceText = this.formatPrice(step.matchedDye);
        if (priceText) {
          const price = this.createElement('p', {
            className: 'text-xs number',
            textContent: priceText,
            attributes: { style: 'color: var(--theme-text-muted);' },
          });
          info.appendChild(price);
        }

        row.appendChild(info);

        // Action dropdown menu
        const dropdown = createDyeActionDropdown(step.matchedDye);
        row.appendChild(dropdown);
      } else {
        // No match found
        const noMatch = this.createElement('span', {
          className: 'text-sm italic',
          textContent: LanguageService.t('mixer.noMatchFound') || 'No match found',
          attributes: { style: 'color: var(--theme-text-muted);' },
        });
        row.appendChild(noMatch);
      }

      container.appendChild(row);
    }

    // If no intermediate steps (only 2 steps total)
    if (this.currentSteps.length <= 2) {
      const noSteps = this.createElement('div', {
        className: 'p-4 text-center text-sm',
        textContent: LanguageService.t('mixer.increaseSteps') || 'Increase steps to see intermediate matches',
        attributes: { style: 'color: var(--theme-text-muted);' },
      });
      container.appendChild(noSteps);
    }

    this.matchesContainer.appendChild(container);
  }

  /**
   * Render export options
   */
  private renderExportOptions(): void {
    if (!this.exportContainer) return;
    clearContainer(this.exportContainer);

    const card = this.createElement('div', {
      className: 'p-4 rounded-lg flex items-center justify-between',
      attributes: { style: 'background: var(--theme-card-background); border: 1px solid var(--theme-border);' },
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
      attributes: { style: 'background: var(--theme-background-secondary); color: var(--theme-text);' },
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
    downloadBtn.appendChild(document.createTextNode(LanguageService.t('common.download') || 'Download'));

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
        lines.push(`  ${i}. ${step.matchedDye.name} (${step.matchedDye.hex}) - Distance: ${step.distance.toFixed(1)}`);
      }
    }

    navigator.clipboard.writeText(lines.join('\n'))
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
        matchedDye: step.matchedDye ? {
          name: step.matchedDye.name,
          hex: step.matchedDye.hex,
          id: step.matchedDye.id,
        } : null,
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

    // Listen for price toggle changes (mobile)
    mobileMarketContent.addEventListener('showPricesChanged', ((event: Event) => {
      const customEvent = event as CustomEvent<{ showPrices: boolean }>;
      this.showPrices = customEvent.detail.showPrices;
      if (this.showPrices) {
        void this.fetchPricesForDisplayedDyes();
      } else {
        this.priceData.clear();
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
      textContent: LanguageService.t('mixer.selectTwoDyes') || 'Select two dyes to create a gradient',
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
          style: 'background: var(--theme-card-hover); color: var(--theme-text-muted); font-size: 1rem;',
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
        style: this.colorSpace === 'rgb'
          ? 'background: var(--theme-primary); color: var(--theme-text-header);'
          : 'background: var(--theme-background-secondary); color: var(--theme-text);',
      },
    });

    const hsvBtn = this.createElement('button', {
      className: 'flex-1 px-3 py-2 text-sm rounded-lg transition-colors',
      textContent: 'HSV',
      attributes: {
        style: this.colorSpace === 'hsv'
          ? 'background: var(--theme-primary); color: var(--theme-text-header);'
          : 'background: var(--theme-background-secondary); color: var(--theme-text);',
      },
    });

    this.on(rgbBtn, 'click', () => {
      this.colorSpace = 'rgb';
      StorageService.setItem(STORAGE_KEYS.colorSpace, 'rgb');
      rgbBtn.setAttribute('style', 'background: var(--theme-primary); color: var(--theme-text-header);');
      hsvBtn.setAttribute('style', 'background: var(--theme-background-secondary); color: var(--theme-text);');
      this.updateInterpolation();
    });

    this.on(hsvBtn, 'click', () => {
      this.colorSpace = 'hsv';
      StorageService.setItem(STORAGE_KEYS.colorSpace, 'hsv');
      hsvBtn.setAttribute('style', 'background: var(--theme-primary); color: var(--theme-text-header);');
      rgbBtn.setAttribute('style', 'background: var(--theme-background-secondary); color: var(--theme-text);');
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
    if (this.mobileDyeSelector && this.selectedDyes.length > 0) {
      this.mobileDyeSelector.setSelectedDyes(this.selectedDyes);
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
   */
  private async fetchPricesForDisplayedDyes(): Promise<void> {
    if (!this.showPrices) {
      return;
    }

    // Get whichever MarketBoard instance is active (desktop or mobile)
    const activeMarketBoard = this.getActiveMarketBoard();
    if (!activeMarketBoard) {
      logger.warn('[MixerTool] No active MarketBoard found for price fetching');
      return;
    }

    const dyesToFetch: Dye[] = [];

    // Add start dye if selected
    if (this.startDye && activeMarketBoard.shouldFetchPrice(this.startDye)) {
      dyesToFetch.push(this.startDye);
    }

    // Add end dye if selected
    if (this.endDye && activeMarketBoard.shouldFetchPrice(this.endDye)) {
      dyesToFetch.push(this.endDye);
    }

    // Add intermediate dyes from interpolation steps
    for (const step of this.currentSteps) {
      if (step.matchedDye && activeMarketBoard.shouldFetchPrice(step.matchedDye)) {
        // Avoid duplicates
        if (!dyesToFetch.some((d) => d.id === step.matchedDye!.id)) {
          dyesToFetch.push(step.matchedDye);
        }
      }
    }

    if (dyesToFetch.length > 0) {
      try {
        const prices = await activeMarketBoard.fetchPricesForDyes(dyesToFetch);
        this.priceData = prices;
        logger.info(`[MixerTool] Fetched prices for ${prices.size} dyes`);
      } catch (error) {
        logger.error('[MixerTool] Failed to fetch prices:', error);
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
}
