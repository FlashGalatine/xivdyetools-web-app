/**
 * XIV Dye Tools v3.0.0 - Accessibility Tool Component
 *
 * Phase 4: Accessibility Checker migration to v3 two-panel layout.
 * Orchestrates colorblindness simulation and accessibility analysis.
 *
 * Left Panel: Dye selector (up to 4), vision type toggles, display options
 * Right Panel: Vision simulations, contrast analysis, distinguishability matrix
 *
 * @module components/tools/accessibility-tool
 */

import { BaseComponent } from '@components/base-component';
import { DyeSelector } from '@components/dye-selector';
import { CollapsiblePanel } from '@mockups/CollapsiblePanel';
import { ColorService, ConfigController, LanguageService, StorageService, dyeService } from '@services/index';
import { logger } from '@shared/logger';
import { clearContainer } from '@shared/utils';
import type { Dye } from '@shared/types';
import type { AccessibilityConfig } from '@shared/tool-config-types';
import { ICON_TOOL_ACCESSIBILITY } from '@shared/tool-icons';
import { ICON_WARNING, ICON_BEAKER, ICON_EYE, ICON_SLIDERS } from '@shared/ui-icons';

// ============================================================================
// Types and Constants
// ============================================================================

export interface AccessibilityToolOptions {
  leftPanel: HTMLElement;
  rightPanel: HTMLElement;
  drawerContent?: HTMLElement | null;
}

/**
 * Contrast result for a single background
 */
interface ContrastResult {
  ratio: number;
  wcagLevel: 'AAA' | 'AA' | 'Fail';
}

/**
 * Individual dye accessibility analysis
 */
interface DyeAccessibilityResult {
  dyeId: number;
  dyeName: string;
  hex: string;
  contrastVsWhite: ContrastResult;
  contrastVsBlack: ContrastResult;
  warnings: string[];
  colorblindnessSimulations: {
    normal: string;
    deuteranopia: string;
    protanopia: string;
    tritanopia: string;
    achromatopsia: string;
  };
}

/**
 * Dye pair comparison result
 */
interface DyePairResult {
  dye1Id: number;
  dye1Name: string;
  dye1Hex: string;
  dye2Id: number;
  dye2Name: string;
  dye2Hex: string;
  contrastRatio: number;
  wcagLevel: 'AAA' | 'AA' | 'Fail';
  distinguishability: number;
  colorblindnessDistinguishability: {
    normal: number;
    deuteranopia: number;
    protanopia: number;
    tritanopia: number;
  };
  warnings: string[];
}

/**
 * Display options state
 */
interface DisplayOptions {
  showLabels: boolean;
  showHexValues: boolean;
  highContrastMode: boolean;
}

/**
 * Vision type configuration
 */
const VISION_TYPES = [
  { id: 'normal', localeKey: 'normal', prevalence: '~92%' },
  { id: 'deuteranopia', localeKey: 'deuteranopia', prevalence: '~6% males' },
  { id: 'protanopia', localeKey: 'protanopia', prevalence: '~2% males' },
  { id: 'tritanopia', localeKey: 'tritanopia', prevalence: '~0.01%' },
  { id: 'achromatopsia', localeKey: 'achromatopsia', prevalence: '~0.003%' },
] as const;

type VisionTypeId = (typeof VISION_TYPES)[number]['id'];

/**
 * Storage keys for v3 accessibility tool
 */
const STORAGE_KEYS = {
  selectedDyes: 'v3_accessibility_selected_dyes',
  enabledVisionTypes: 'v3_accessibility_vision_types',
  displayOptions: 'v3_accessibility_display_options',
} as const;

/**
 * Default enabled vision types
 */
const DEFAULT_VISION_TYPES: VisionTypeId[] = ['normal', 'deuteranopia', 'protanopia'];

/**
 * Default display options
 */
const DEFAULT_DISPLAY_OPTIONS: DisplayOptions = {
  showLabels: true,
  showHexValues: false,
  highContrastMode: false,
};

// ============================================================================
// AccessibilityTool Component
// ============================================================================

/**
 * Accessibility Tool - v3 Two-Panel Layout
 *
 * Simulates colorblindness and analyzes dye distinguishability
 * for up to 4 selected dyes.
 */
export class AccessibilityTool extends BaseComponent {
  private options: AccessibilityToolOptions;

  // State
  private selectedDyes: Dye[] = [];
  private enabledVisionTypes: Set<VisionTypeId>;
  private displayOptions: DisplayOptions;
  private dyeResults: DyeAccessibilityResult[] = [];
  private pairResults: DyePairResult[] = [];

  // Child components (Desktop)
  private dyeSelector: DyeSelector | null = null;
  private dyePanel: CollapsiblePanel | null = null;
  private visionPanel: CollapsiblePanel | null = null;
  private displayPanel: CollapsiblePanel | null = null;

  // Child components (Mobile Drawer) - separate instances for drawer vs desktop
  private drawerDyeSelector: DyeSelector | null = null;
  private drawerDyePanel: CollapsiblePanel | null = null;
  private drawerVisionPanel: CollapsiblePanel | null = null;
  private drawerDisplayPanel: CollapsiblePanel | null = null;

  // DOM References
  private visionTogglesContainer: HTMLElement | null = null;
  private displayOptionsContainer: HTMLElement | null = null;
  private visionSimulationsContainer: HTMLElement | null = null;
  private contrastTableContainer: HTMLElement | null = null;
  private matrixContainer: HTMLElement | null = null;
  private emptyStateContainer: HTMLElement | null = null;

  // Subscriptions
  private languageUnsubscribe: (() => void) | null = null;
  private configUnsubscribe: (() => void) | null = null;

  constructor(container: HTMLElement, options: AccessibilityToolOptions) {
    super(container);
    this.options = options;

    // Load persisted state
    const savedVisionTypes = StorageService.getItem<VisionTypeId[]>(STORAGE_KEYS.enabledVisionTypes);
    this.enabledVisionTypes = new Set(savedVisionTypes ?? DEFAULT_VISION_TYPES);

    this.displayOptions =
      StorageService.getItem<DisplayOptions>(STORAGE_KEYS.displayOptions) ?? { ...DEFAULT_DISPLAY_OPTIONS };
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
    this.configUnsubscribe = ConfigController.getInstance().subscribe('accessibility', (config) => {
      this.setConfig(config);
    });

    // If dyes were restored from localStorage, update results now that containers exist
    if (this.selectedDyes.length > 0) {
      this.updateResults();
      this.updateDrawerContent();
      logger.info(`[AccessibilityTool] Populated results for ${this.selectedDyes.length} restored dyes`);
    }

    logger.info('[AccessibilityTool] Mounted');
  }

  destroy(): void {
    this.languageUnsubscribe?.();
    this.configUnsubscribe?.();

    // Destroy desktop components
    this.dyeSelector?.destroy();
    this.dyePanel?.destroy();
    this.visionPanel?.destroy();
    this.displayPanel?.destroy();

    // Destroy drawer components
    this.drawerDyeSelector?.destroy();
    this.drawerDyePanel?.destroy();
    this.drawerVisionPanel?.destroy();
    this.drawerDisplayPanel?.destroy();

    this.selectedDyes = [];
    this.dyeResults = [];
    this.pairResults = [];

    super.destroy();
    logger.info('[AccessibilityTool] Destroyed');
  }

  // ============================================================================
  // V4 Integration
  // ============================================================================

  /**
   * Select a dye from the Color Palette drawer
   * Adds to the selection if there's room (max 4 dyes)
   */
  public selectDye(dye: Dye): void {
    if (!dye) return;

    // Don't add duplicates
    if (this.selectedDyes.some((d) => d.id === dye.id)) {
      return;
    }

    // Check max selection limit
    if (this.selectedDyes.length >= 4) {
      // Remove oldest dye and add new one
      this.selectedDyes.shift();
    }

    // Add the dye
    this.selectedDyes.push(dye);

    // Save to storage
    const dyeIds = this.selectedDyes.map((d) => d.id);
    StorageService.setItem(STORAGE_KEYS.selectedDyes, dyeIds);

    // Update selectors
    this.dyeSelector?.setSelectedDyes(this.selectedDyes);
    this.drawerDyeSelector?.setSelectedDyes(this.selectedDyes);

    // Update displays
    this.updateResults();
    this.updateDrawerContent();

    logger.info(`[AccessibilityTool] Selected dye from palette: ${dye.name}`);
  }

  /**
   * Alias for selectDye - some tools use addDye naming
   */
  public addDye(dye: Dye): void {
    this.selectDye(dye);
  }

  /**
   * Update tool configuration from external source (V4 ConfigSidebar)
   */
  public setConfig(config: Partial<AccessibilityConfig>): void {
    let needsRerender = false;

    // Map config properties to vision type IDs
    const visionTypeMap: Record<string, VisionTypeId> = {
      normalVision: 'normal',
      deuteranopia: 'deuteranopia',
      protanopia: 'protanopia',
      tritanopia: 'tritanopia',
      achromatopsia: 'achromatopsia',
    };

    // Handle vision type toggles
    for (const [configKey, visionId] of Object.entries(visionTypeMap)) {
      const configValue = config[configKey as keyof AccessibilityConfig] as boolean | undefined;
      if (configValue !== undefined) {
        const isEnabled = this.enabledVisionTypes.has(visionId);
        if (configValue !== isEnabled) {
          if (configValue) {
            this.enabledVisionTypes.add(visionId);
          } else {
            this.enabledVisionTypes.delete(visionId);
          }
          needsRerender = true;
          logger.info(`[AccessibilityTool] setConfig: ${configKey} -> ${configValue}`);
        }
      }
    }

    // Handle display options
    if (config.showLabels !== undefined && config.showLabels !== this.displayOptions.showLabels) {
      this.displayOptions.showLabels = config.showLabels;
      needsRerender = true;
      logger.info(`[AccessibilityTool] setConfig: showLabels -> ${config.showLabels}`);
    }

    if (config.showHexValues !== undefined && config.showHexValues !== this.displayOptions.showHexValues) {
      this.displayOptions.showHexValues = config.showHexValues;
      needsRerender = true;
      logger.info(`[AccessibilityTool] setConfig: showHexValues -> ${config.showHexValues}`);
    }

    if (config.highContrastMode !== undefined && config.highContrastMode !== this.displayOptions.highContrastMode) {
      this.displayOptions.highContrastMode = config.highContrastMode;
      needsRerender = true;
      logger.info(`[AccessibilityTool] setConfig: highContrastMode -> ${config.highContrastMode}`);
    }

    if (needsRerender) {
      // Save to storage
      StorageService.setItem(STORAGE_KEYS.enabledVisionTypes, Array.from(this.enabledVisionTypes));
      StorageService.setItem(STORAGE_KEYS.displayOptions, this.displayOptions);

      // Sync desktop and drawer checkboxes
      this.syncDesktopVisionCheckboxes();
      this.syncDesktopDisplayCheckboxes();

      // Re-render results if we have data
      if (this.selectedDyes.length > 0) {
        this.updateResults();
        this.updateDrawerContent();
      }
    }
  }

  // ============================================================================
  // Left Panel Rendering
  // ============================================================================

  private renderLeftPanel(): void {
    const left = this.options.leftPanel;
    clearContainer(left);

    // Section 1: Dye Selection (Collapsible with beaker icon)
    this.dyePanel = new CollapsiblePanel(left, {
      title: LanguageService.t('accessibility.inspectDyes') || 'Inspect Dyes',
      storageKey: 'accessibility_dyes',
      defaultOpen: true,
      icon: ICON_BEAKER,
    });
    this.dyePanel.init();
    const dyeContent = this.dyePanel.getContentContainer();
    if (dyeContent) {
      this.renderDyeSelector(dyeContent);
    }

    // Section 2: Vision Types (Collapsible with eye icon)
    this.visionPanel = new CollapsiblePanel(left, {
      title: LanguageService.t('accessibility.visionTypes') || 'Vision Types',
      storageKey: 'accessibility_vision',
      defaultOpen: true,
      icon: ICON_EYE,
    });
    this.visionPanel.init();
    const visionContent = this.visionPanel.getContentContainer();
    if (visionContent) {
      this.renderVisionToggles(visionContent);
    }

    // Section 3: Display Options (Collapsible with sliders icon, default closed)
    this.displayPanel = new CollapsiblePanel(left, {
      title: LanguageService.t('accessibility.displayOptions') || 'Display Options',
      storageKey: 'accessibility_display',
      defaultOpen: false,
      icon: ICON_SLIDERS,
    });
    this.displayPanel.init();
    const displayContent = this.displayPanel.getContentContainer();
    if (displayContent) {
      this.renderDisplayOptions(displayContent);
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
    const selectedDisplay = this.createElement('div', {
      className: 'selected-dyes-display space-y-2',
    });
    this.updateSelectedDyesDisplay(selectedDisplay);
    dyeContainer.appendChild(selectedDisplay);

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

    // Restore saved dye selection from localStorage (UI only - results update in onMount)
    const savedDyeIds = StorageService.getItem<number[]>(STORAGE_KEYS.selectedDyes);
    if (savedDyeIds && savedDyeIds.length > 0) {
      const allDyes = dyeService.getAllDyes();
      const restoredDyes = savedDyeIds
        .map((id) => allDyes.find((d) => d.id === id))
        .filter((d): d is Dye => d !== undefined);

      if (restoredDyes.length > 0) {
        this.dyeSelector.setSelectedDyes(restoredDyes);
        this.selectedDyes = restoredDyes;
        this.updateSelectedDyesDisplay(selectedDisplay);
        // NOTE: updateResults() called in onMount() after right panel containers exist
        logger.info(`[AccessibilityTool] Restored ${restoredDyes.length} saved dyes from localStorage`);
      }
    }

    // Listen for selection changes
    selectorContainer.addEventListener('selection-changed', () => {
      if (this.dyeSelector) {
        this.selectedDyes = this.dyeSelector.getSelectedDyes();
        // Save selected dye IDs to localStorage
        const dyeIds = this.selectedDyes.map((d) => d.id);
        StorageService.setItem(STORAGE_KEYS.selectedDyes, dyeIds);
        this.updateSelectedDyesDisplay(selectedDisplay);
        this.updateResults();
        this.updateDrawerContent();
      }
    });

    container.appendChild(dyeContainer);
  }

  /**
   * Update the selected dyes display
   */
  private updateSelectedDyesDisplay(container: HTMLElement): void {
    clearContainer(container);

    if (this.selectedDyes.length === 0) {
      const placeholder = this.createElement('div', {
        className: 'p-3 rounded-lg border-2 border-dashed text-center text-sm',
        textContent: LanguageService.t('accessibility.selectDyesToSeeAnalysis'),
        attributes: {
          style: 'border-color: var(--theme-border); color: var(--theme-text-muted);',
        },
      });
      container.appendChild(placeholder);
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
        textContent: LanguageService.t('common.remove') || 'Remove',
        attributes: {
          style: 'background: var(--theme-card-hover); color: var(--theme-text-muted);',
        },
      });

      this.on(removeBtn, 'click', () => {
        // Filter out this dye and update the selector
        const newSelection = this.selectedDyes.filter((d) => d.id !== dye.id);
        this.dyeSelector?.setSelectedDyes(newSelection);
        this.selectedDyes = newSelection;
        // Save updated selection to localStorage
        const dyeIds = newSelection.map((d) => d.id);
        StorageService.setItem(STORAGE_KEYS.selectedDyes, dyeIds);
        this.updateSelectedDyesDisplay(container);
        this.updateResults();
        this.updateDrawerContent();
      });

      dyeItem.appendChild(swatch);
      dyeItem.appendChild(name);
      dyeItem.appendChild(removeBtn);
      container.appendChild(dyeItem);
    }
  }

  /**
   * Render vision type toggles
   */
  private renderVisionToggles(container: HTMLElement): void {
    this.visionTogglesContainer = this.createElement('div', { className: 'space-y-2' });

    for (const type of VISION_TYPES) {
      const isEnabled = this.enabledVisionTypes.has(type.id);
      const label = this.createElement('label', {
        className: 'flex items-center gap-3 cursor-pointer',
      });

      const checkbox = this.createElement('input', {
        attributes: {
          type: 'checkbox',
          'data-vision-type': type.id,
        },
        className: 'w-4 h-4 rounded',
      }) as HTMLInputElement;
      checkbox.checked = isEnabled;

      this.on(checkbox, 'change', () => {
        if (checkbox.checked) {
          this.enabledVisionTypes.add(type.id);
        } else {
          this.enabledVisionTypes.delete(type.id);
        }
        StorageService.setItem(STORAGE_KEYS.enabledVisionTypes, Array.from(this.enabledVisionTypes));
        this.updateResults();
        this.updateDrawerContent();
      });

      const textContainer = this.createElement('div', { className: 'flex-1' });
      const typeName = this.createElement('p', {
        className: 'text-sm font-medium',
        textContent: LanguageService.getVisionType(type.localeKey),
        attributes: { style: 'color: var(--theme-text);' },
      });
      const typePrevalence = this.createElement('p', {
        className: 'text-xs',
        textContent: type.prevalence,
        attributes: { style: 'color: var(--theme-text-muted);' },
      });
      textContainer.appendChild(typeName);
      textContainer.appendChild(typePrevalence);

      label.appendChild(checkbox);
      label.appendChild(textContainer);
      this.visionTogglesContainer.appendChild(label);
    }

    container.appendChild(this.visionTogglesContainer);
  }

  /**
   * Render display options
   */
  private renderDisplayOptions(container: HTMLElement): void {
    this.displayOptionsContainer = this.createElement('div', { className: 'space-y-2' });

    const options = [
      { key: 'showLabels', label: LanguageService.t('accessibility.showLabels') || 'Show Labels' },
      { key: 'showHexValues', label: LanguageService.t('accessibility.showHexValues') || 'Show Hex Values' },
      { key: 'highContrastMode', label: LanguageService.t('accessibility.highContrastMode') || 'High Contrast Mode' },
    ] as const;

    for (const option of options) {
      const label = this.createElement('label', {
        className: 'flex items-center gap-2 cursor-pointer',
      });

      const checkbox = this.createElement('input', {
        attributes: {
          type: 'checkbox',
          'data-display-option': option.key,
        },
        className: 'w-4 h-4 rounded',
      }) as HTMLInputElement;
      checkbox.checked = this.displayOptions[option.key];

      this.on(checkbox, 'change', () => {
        this.displayOptions[option.key] = checkbox.checked;
        StorageService.setItem(STORAGE_KEYS.displayOptions, this.displayOptions);
        this.updateResults();
      });

      const text = this.createElement('span', {
        className: 'text-sm',
        textContent: option.label,
        attributes: { style: 'color: var(--theme-text);' },
      });

      label.appendChild(checkbox);
      label.appendChild(text);
      this.displayOptionsContainer.appendChild(label);
    }

    container.appendChild(this.displayOptionsContainer);
  }

  // ============================================================================
  // Right Panel Rendering
  // ============================================================================

  private renderRightPanel(): void {
    const right = this.options.rightPanel;
    clearContainer(right);

    // Empty state (shown when no dyes selected)
    this.emptyStateContainer = this.createElement('div');
    this.renderEmptyState();
    right.appendChild(this.emptyStateContainer);

    // Vision Simulations Section
    const simSection = this.createElement('div', { className: 'mb-6 hidden' });
    simSection.appendChild(this.createHeader(LanguageService.t('accessibility.visionSimulation') || 'Vision Simulations'));
    this.visionSimulationsContainer = this.createElement('div', {
      className: 'grid gap-4 md:grid-cols-2 lg:grid-cols-3',
    });
    simSection.appendChild(this.visionSimulationsContainer);
    right.appendChild(simSection);

    // Contrast Analysis Section
    const contrastSection = this.createElement('div', { className: 'mb-6 hidden' });
    contrastSection.appendChild(this.createHeader(LanguageService.t('accessibility.contrastRatios') || 'Contrast Analysis'));
    this.contrastTableContainer = this.createElement('div');
    contrastSection.appendChild(this.contrastTableContainer);
    right.appendChild(contrastSection);

    // Distinguishability Matrix Section
    const matrixSection = this.createElement('div', { className: 'hidden' });
    matrixSection.appendChild(this.createHeader(LanguageService.t('accessibility.pairComparisons') || 'Pairwise Distinguishability'));
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
      className: 'flex flex-col items-center justify-center text-center',
      attributes: {
        style: 'min-height: 400px; padding: 3rem 2rem;',
      },
    });

    empty.innerHTML = `
      <span style="display: block; width: 180px; height: 180px; margin: 0 auto 1.5rem; opacity: 0.25; color: var(--theme-text);">${ICON_TOOL_ACCESSIBILITY}</span>
      <p style="color: var(--theme-text); font-size: 1.125rem;">${LanguageService.t('accessibility.selectDyesToSeeAnalysis')}</p>
    `;

    this.emptyStateContainer.appendChild(empty);
  }

  /**
   * Update results display
   */
  private updateResults(): void {
    if (this.selectedDyes.length === 0) {
      this.showEmptyState(true);
      return;
    }

    this.showEmptyState(false);

    // Calculate results
    this.dyeResults = this.selectedDyes.map((dye) => this.analyzeDye(dye));

    // Calculate pair results if 2+ dyes
    this.pairResults = [];
    if (this.selectedDyes.length >= 2) {
      for (let i = 0; i < this.selectedDyes.length; i++) {
        for (let j = i + 1; j < this.selectedDyes.length; j++) {
          this.pairResults.push(this.analyzePair(this.selectedDyes[i], this.selectedDyes[j]));
        }
      }
    }

    // Render sections
    this.renderVisionSimulations();
    this.renderContrastTable();
    this.renderDistinguishabilityMatrix();
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
   * Render vision simulation cards
   */
  private renderVisionSimulations(): void {
    if (!this.visionSimulationsContainer) return;
    clearContainer(this.visionSimulationsContainer);

    const enabledTypes = VISION_TYPES.filter((t) => this.enabledVisionTypes.has(t.id));

    for (const type of enabledTypes) {
      const card = this.createElement('div', {
        className: 'p-4 rounded-lg',
        attributes: {
          style: 'background: var(--theme-card-background); border: 1px solid var(--theme-border);',
        },
      });

      // Card header
      const header = this.createElement('p', {
        className: 'text-sm font-medium mb-3',
        textContent: LanguageService.getVisionType(type.localeKey),
        attributes: { style: 'color: var(--theme-text);' },
      });
      card.appendChild(header);

      // Color swatches
      const swatchContainer = this.createElement('div', {
        className: 'flex gap-2 mb-2',
      });

      for (const result of this.dyeResults) {
        const simColor = result.colorblindnessSimulations[type.id as keyof typeof result.colorblindnessSimulations];
        const swatchWrapper = this.createElement('div', { className: 'text-center' });

        const swatch = this.createElement('div', {
          className: 'w-10 h-10 rounded',
          attributes: {
            style: `background: ${simColor};`,
            title: result.dyeName,
          },
        });
        swatchWrapper.appendChild(swatch);

        if (this.displayOptions.showLabels) {
          const label = this.createElement('p', {
            className: 'text-xs mt-1 truncate max-w-[40px]',
            textContent: result.dyeName.split(' ')[0],
            attributes: { style: 'color: var(--theme-text-muted);' },
          });
          swatchWrapper.appendChild(label);
        }

        if (this.displayOptions.showHexValues) {
          const hex = this.createElement('p', {
            className: 'text-xs number',
            textContent: simColor,
            attributes: { style: 'color: var(--theme-text-muted);' },
          });
          swatchWrapper.appendChild(hex);
        }

        swatchContainer.appendChild(swatchWrapper);
      }

      card.appendChild(swatchContainer);

      // Prevalence
      const prevalence = this.createElement('p', {
        className: 'text-xs number',
        textContent: type.prevalence,
        attributes: { style: 'color: var(--theme-text-muted);' },
      });
      card.appendChild(prevalence);

      this.visionSimulationsContainer.appendChild(card);
    }
  }

  /**
   * Render contrast analysis table
   */
  private renderContrastTable(): void {
    if (!this.contrastTableContainer) return;
    clearContainer(this.contrastTableContainer);

    const table = this.createElement('div', {
      className: 'rounded-lg overflow-hidden',
      attributes: {
        style: 'background: var(--theme-card-background); border: 1px solid var(--theme-border);',
      },
    });

    // Header row
    const headerRow = this.createElement('div', {
      className: 'p-3 border-b',
      attributes: { style: 'border-color: var(--theme-border); background: var(--theme-background-secondary);' },
    });
    headerRow.innerHTML = `
      <div class="grid grid-cols-3 gap-2 text-xs font-medium" style="color: var(--theme-text-muted);">
        <span>${LanguageService.t('common.dye') || 'Dye'}</span>
        <span>${LanguageService.t('accessibility.vsWhite')}</span>
        <span>${LanguageService.t('accessibility.vsBlack')}</span>
      </div>
    `;
    table.appendChild(headerRow);

    // Data rows
    for (const result of this.dyeResults) {
      const row = this.createElement('div', {
        className: 'p-3 border-b last:border-b-0',
        attributes: { style: 'border-color: var(--theme-border);' },
      });

      row.innerHTML = `
        <div class="grid grid-cols-3 gap-2 items-center text-sm">
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 rounded" style="background: ${result.hex};"></div>
            <span class="truncate" style="color: var(--theme-text);">${result.dyeName}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="number" style="color: var(--theme-text);">${result.contrastVsWhite.ratio}:1</span>
            <span class="px-1.5 py-0.5 rounded text-xs font-medium" style="${this.getWCAGBadgeStyle(result.contrastVsWhite.wcagLevel)}">${result.contrastVsWhite.wcagLevel}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="number" style="color: var(--theme-text);">${result.contrastVsBlack.ratio}:1</span>
            <span class="px-1.5 py-0.5 rounded text-xs font-medium" style="${this.getWCAGBadgeStyle(result.contrastVsBlack.wcagLevel)}">${result.contrastVsBlack.wcagLevel}</span>
          </div>
        </div>
      `;

      table.appendChild(row);
    }

    this.contrastTableContainer.appendChild(table);
  }

  /**
   * Render distinguishability matrix
   */
  private renderDistinguishabilityMatrix(): void {
    if (!this.matrixContainer) return;
    clearContainer(this.matrixContainer);

    if (this.selectedDyes.length < 2) {
      const notice = this.createElement('p', {
        className: 'text-sm text-center py-4',
        textContent: LanguageService.t('accessibility.selectTwoDyes') || 'Select at least 2 dyes to see comparisons',
        attributes: { style: 'color: var(--theme-text-muted);' },
      });
      this.matrixContainer.appendChild(notice);
      return;
    }

    // Wrapper for scroll shadow effect on mobile
    const matrixWrapper = this.createElement('div', {
      className: 'relative',
    });

    const matrix = this.createElement('div', {
      className: 'rounded-lg p-3 sm:p-4 overflow-x-auto',
      attributes: {
        style: 'background: var(--theme-card-background); border: 1px solid var(--theme-border);',
      },
    });

    // Build table HTML with responsive sizing
    let html = '<table class="w-full text-sm min-w-max"><thead><tr><th></th>';

    // Column headers - larger swatches on mobile for better touch targets
    for (const dye of this.selectedDyes) {
      const dyeName = LanguageService.getDyeName(dye.itemID) || dye.name;
      html += `
        <th class="p-2 text-center min-w-[70px]">
          <div class="w-8 h-8 rounded mx-auto mb-1" style="background: ${dye.hex};"></div>
          <span class="text-xs font-normal block truncate max-w-[60px] sm:max-w-20 mx-auto" style="color: var(--theme-text-muted);">${dyeName}</span>
        </th>
      `;
    }
    html += '</tr></thead><tbody>';

    // Data rows - improved for mobile with larger touch targets
    for (let i = 0; i < this.selectedDyes.length; i++) {
      const rowDye = this.selectedDyes[i];
      const rowDyeName = LanguageService.getDyeName(rowDye.itemID) || rowDye.name;

      html += `
        <tr>
          <td class="p-2 sticky left-0" style="background: var(--theme-card-background);">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded shrink-0" style="background: ${rowDye.hex};"></div>
              <span class="text-xs truncate max-w-[60px] sm:max-w-20" style="color: var(--theme-text);">${rowDyeName}</span>
            </div>
          </td>
      `;

      for (let j = 0; j < this.selectedDyes.length; j++) {
        if (i === j) {
          html += '<td class="p-2 text-center" style="color: var(--theme-text-muted);">-</td>';
        } else {
          // Find the pair result
          const pairResult = this.pairResults.find(
            (p) =>
              (p.dye1Id === rowDye.id && p.dye2Id === this.selectedDyes[j].id) ||
              (p.dye2Id === rowDye.id && p.dye1Id === this.selectedDyes[j].id)
          );

          if (pairResult) {
            const score = pairResult.distinguishability;
            const color = this.getDistinguishabilityColor(score);
            html += `<td class="p-2 text-center number" style="color: ${color};">${score}%</td>`;
          } else {
            html += '<td class="p-2 text-center">-</td>';
          }
        }
      }

      html += '</tr>';
    }

    html += '</tbody></table>';

    // Warnings section
    const allWarnings = this.pairResults.filter((p) => p.warnings.length > 0);
    if (allWarnings.length > 0) {
      html += '<div class="mt-4 pt-4 border-t space-y-2" style="border-color: var(--theme-border);">';
      for (const pair of allWarnings) {
        for (const warning of pair.warnings) {
          html += `
            <div class="flex items-start gap-2 text-xs" style="color: var(--theme-text-muted);">
              <span class="w-4 h-4 shrink-0" style="color: #b45309;">${ICON_WARNING}</span>
              <span><strong>${pair.dye1Name}</strong> & <strong>${pair.dye2Name}</strong>: ${warning}</span>
            </div>
          `;
        }
      }
      html += '</div>';
    }

    matrix.innerHTML = html;
    matrixWrapper.appendChild(matrix);
    this.matrixContainer.appendChild(matrixWrapper);
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

    // Destroy existing drawer components before re-rendering
    this.drawerDyeSelector?.destroy();
    this.drawerDyePanel?.destroy();
    this.drawerVisionPanel?.destroy();
    this.drawerDisplayPanel?.destroy();

    // Section 1: Dye Selection (Collapsible)
    const dyeContainer = this.createElement('div');
    drawer.appendChild(dyeContainer);
    this.renderDrawerDyePanel(dyeContainer);

    // Section 2: Vision Types (Collapsible)
    const visionContainer = this.createElement('div');
    drawer.appendChild(visionContainer);
    this.renderDrawerVisionPanel(visionContainer);

    // Section 3: Display Options (Collapsible)
    const displayContainer = this.createElement('div');
    drawer.appendChild(displayContainer);
    this.renderDrawerDisplayPanel(displayContainer);
  }

  /**
   * Render collapsible Dye Selection panel for mobile drawer
   */
  private renderDrawerDyePanel(container: HTMLElement): void {
    this.drawerDyePanel = new CollapsiblePanel(container, {
      title: LanguageService.t('accessibility.inspectDyes') || 'Inspect Dyes',
      defaultOpen: true,
      storageKey: 'accessibility_dyes_drawer',
      icon: ICON_BEAKER,
    });
    this.drawerDyePanel.init();

    const contentContainer = this.drawerDyePanel.getContentContainer();
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
    const selectedDisplay = this.createElement('div', {
      className: 'drawer-selected-dyes-display space-y-2',
    });
    this.updateDrawerSelectedDyesDisplay(selectedDisplay);
    dyeContainer.appendChild(selectedDisplay);

    // Dye selector component
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

    // Pre-select persisted dyes if available
    if (this.selectedDyes.length > 0) {
      this.drawerDyeSelector.setSelectedDyes(this.selectedDyes);
    }

    // Listen for dye selection changes
    selectorContainer.addEventListener('selection-changed', () => {
      if (this.drawerDyeSelector) {
        this.selectedDyes = this.drawerDyeSelector.getSelectedDyes();
        // Save selected dye IDs to localStorage
        const dyeIds = this.selectedDyes.map((d) => d.id);
        StorageService.setItem(STORAGE_KEYS.selectedDyes, dyeIds);

        // Sync desktop selector if it exists
        this.dyeSelector?.setSelectedDyes(this.selectedDyes);

        // Update displays
        this.updateDrawerSelectedDyesDisplay(selectedDisplay);
        this.updateResults();
        logger.info(`[AccessibilityTool] Drawer: Selected ${this.selectedDyes.length} dyes`);
      }
    });

    container.appendChild(dyeContainer);
  }

  /**
   * Update the selected dyes display in mobile drawer
   */
  private updateDrawerSelectedDyesDisplay(container: HTMLElement): void {
    clearContainer(container);

    if (this.selectedDyes.length === 0) {
      const placeholder = this.createElement('div', {
        className: 'p-3 rounded-lg border-2 border-dashed text-center text-sm',
        textContent: LanguageService.t('accessibility.selectDyesToSeeAnalysis'),
        attributes: {
          style: 'border-color: var(--theme-border); color: var(--theme-text-muted);',
        },
      });
      container.appendChild(placeholder);
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
        textContent: LanguageService.t('common.remove') || 'Remove',
        attributes: {
          style: 'background: var(--theme-card-hover); color: var(--theme-text-muted);',
        },
      });

      this.on(removeBtn, 'click', () => {
        // Filter out this dye and update the selector
        const newSelection = this.selectedDyes.filter((d) => d.id !== dye.id);
        this.drawerDyeSelector?.setSelectedDyes(newSelection);
        this.dyeSelector?.setSelectedDyes(newSelection);
        this.selectedDyes = newSelection;
        // Save updated selection to localStorage
        const dyeIds = newSelection.map((d) => d.id);
        StorageService.setItem(STORAGE_KEYS.selectedDyes, dyeIds);
        this.updateDrawerSelectedDyesDisplay(container);
        this.updateResults();
      });

      dyeItem.appendChild(swatch);
      dyeItem.appendChild(name);
      dyeItem.appendChild(removeBtn);
      container.appendChild(dyeItem);
    }
  }

  /**
   * Render collapsible Vision Types panel for mobile drawer
   */
  private renderDrawerVisionPanel(container: HTMLElement): void {
    this.drawerVisionPanel = new CollapsiblePanel(container, {
      title: LanguageService.t('accessibility.visionTypes') || 'Vision Types',
      defaultOpen: true,
      storageKey: 'accessibility_vision_drawer',
      icon: ICON_EYE,
    });
    this.drawerVisionPanel.init();

    const contentContainer = this.drawerVisionPanel.getContentContainer();
    if (contentContainer) {
      this.renderDrawerVisionToggles(contentContainer);
    }
  }

  /**
   * Render vision type toggles for mobile drawer
   */
  private renderDrawerVisionToggles(container: HTMLElement): void {
    const togglesContainer = this.createElement('div', { className: 'space-y-2' });

    for (const type of VISION_TYPES) {
      const isEnabled = this.enabledVisionTypes.has(type.id);
      const label = this.createElement('label', {
        className: 'flex items-center gap-3 cursor-pointer',
      });

      const checkbox = this.createElement('input', {
        attributes: {
          type: 'checkbox',
          'data-vision-type': type.id,
        },
        className: 'w-4 h-4 rounded',
      }) as HTMLInputElement;
      checkbox.checked = isEnabled;

      this.on(checkbox, 'change', () => {
        if (checkbox.checked) {
          this.enabledVisionTypes.add(type.id);
        } else {
          this.enabledVisionTypes.delete(type.id);
        }
        StorageService.setItem(STORAGE_KEYS.enabledVisionTypes, Array.from(this.enabledVisionTypes));

        // Sync desktop checkboxes
        this.syncDesktopVisionCheckboxes();

        this.updateResults();
      });

      const textContainer = this.createElement('div', { className: 'flex-1' });
      const typeName = this.createElement('p', {
        className: 'text-sm font-medium',
        textContent: LanguageService.getVisionType(type.localeKey),
        attributes: { style: 'color: var(--theme-text);' },
      });
      const typePrevalence = this.createElement('p', {
        className: 'text-xs',
        textContent: type.prevalence,
        attributes: { style: 'color: var(--theme-text-muted);' },
      });
      textContainer.appendChild(typeName);
      textContainer.appendChild(typePrevalence);

      label.appendChild(checkbox);
      label.appendChild(textContainer);
      togglesContainer.appendChild(label);
    }

    container.appendChild(togglesContainer);
  }

  /**
   * Render collapsible Display Options panel for mobile drawer
   */
  private renderDrawerDisplayPanel(container: HTMLElement): void {
    this.drawerDisplayPanel = new CollapsiblePanel(container, {
      title: LanguageService.t('accessibility.displayOptions') || 'Display Options',
      defaultOpen: false,
      storageKey: 'accessibility_display_drawer',
      icon: ICON_SLIDERS,
    });
    this.drawerDisplayPanel.init();

    const contentContainer = this.drawerDisplayPanel.getContentContainer();
    if (contentContainer) {
      this.renderDrawerDisplayOptions(contentContainer);
    }
  }

  /**
   * Render display options for mobile drawer
   */
  private renderDrawerDisplayOptions(container: HTMLElement): void {
    const optionsContainer = this.createElement('div', { className: 'space-y-2' });

    const options = [
      { key: 'showLabels', label: LanguageService.t('accessibility.showLabels') || 'Show Labels' },
      { key: 'showHexValues', label: LanguageService.t('accessibility.showHexValues') || 'Show Hex Values' },
      { key: 'highContrastMode', label: LanguageService.t('accessibility.highContrastMode') || 'High Contrast Mode' },
    ] as const;

    for (const option of options) {
      const label = this.createElement('label', {
        className: 'flex items-center gap-2 cursor-pointer',
      });

      const checkbox = this.createElement('input', {
        attributes: {
          type: 'checkbox',
          'data-display-option': option.key,
        },
        className: 'w-4 h-4 rounded',
      }) as HTMLInputElement;
      checkbox.checked = this.displayOptions[option.key];

      this.on(checkbox, 'change', () => {
        this.displayOptions[option.key] = checkbox.checked;
        StorageService.setItem(STORAGE_KEYS.displayOptions, this.displayOptions);

        // Sync desktop checkboxes
        this.syncDesktopDisplayCheckboxes();

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

  /**
   * Sync desktop vision type checkboxes with current state
   */
  private syncDesktopVisionCheckboxes(): void {
    if (!this.visionTogglesContainer) return;
    const checkboxes = this.visionTogglesContainer.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    checkboxes.forEach((checkbox) => {
      const visionType = checkbox.getAttribute('data-vision-type') as VisionTypeId;
      if (visionType) {
        checkbox.checked = this.enabledVisionTypes.has(visionType);
      }
    });
  }

  /**
   * Sync desktop display options checkboxes with current state
   */
  private syncDesktopDisplayCheckboxes(): void {
    if (!this.displayOptionsContainer) return;
    const checkboxes = this.displayOptionsContainer.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    checkboxes.forEach((checkbox) => {
      const optionKey = checkbox.getAttribute('data-display-option') as keyof DisplayOptions;
      if (optionKey) {
        checkbox.checked = this.displayOptions[optionKey];
      }
    });
  }

  /**
   * Update drawer content when desktop changes (sync drawer components)
   */
  private updateDrawerContent(): void {
    // Sync drawer dye selector with current state
    if (this.drawerDyeSelector) {
      this.drawerDyeSelector.setSelectedDyes(this.selectedDyes);
    }

    // Re-render drawer if components don't exist yet
    if (!this.drawerDyePanel && this.options.drawerContent) {
      this.renderDrawerContent();
    }
  }

  // ============================================================================
  // Analysis Logic (Ported from v2)
  // ============================================================================

  /**
   * Get WCAG level from contrast ratio
   */
  private getWCAGLevel(ratio: number): 'AAA' | 'AA' | 'Fail' {
    if (ratio >= 7) return 'AAA';
    if (ratio >= 4.5) return 'AA';
    return 'Fail';
  }

  /**
   * Analyze a single dye for accessibility
   */
  private analyzeDye(dye: Dye): DyeAccessibilityResult {
    const primaryHex = dye.hex;
    const lightBg = '#FFFFFF';
    const darkBg = '#000000';

    const contrastLight = ColorService.getContrastRatio(primaryHex, lightBg);
    const contrastDark = ColorService.getContrastRatio(primaryHex, darkBg);

    const warnings: string[] = [];

    // Simulate colorblindness for all 5 vision types
    const deuterColor = ColorService.simulateColorblindnessHex(primaryHex, 'deuteranopia');
    const protanColor = ColorService.simulateColorblindnessHex(primaryHex, 'protanopia');
    const tritanColor = ColorService.simulateColorblindnessHex(primaryHex, 'tritanopia');
    const achromColor = ColorService.simulateColorblindnessHex(primaryHex, 'achromatopsia');

    // Generate warnings
    if (deuterColor === protanColor) {
      warnings.push(LanguageService.t('accessibility.redGreenWarning'));
    }

    if (ColorService.getColorDistance(primaryHex, tritanColor) < 30) {
      warnings.push(LanguageService.t('accessibility.tritanopiaWarning'));
    }

    if (ColorService.getColorDistance(primaryHex, achromColor) < 30) {
      warnings.push(LanguageService.t('accessibility.achromatopsiaWarning'));
    }

    return {
      dyeId: dye.id,
      dyeName: LanguageService.getDyeName(dye.itemID) || dye.name,
      hex: primaryHex,
      contrastVsWhite: {
        ratio: Math.round(contrastLight * 100) / 100,
        wcagLevel: this.getWCAGLevel(contrastLight),
      },
      contrastVsBlack: {
        ratio: Math.round(contrastDark * 100) / 100,
        wcagLevel: this.getWCAGLevel(contrastDark),
      },
      warnings,
      colorblindnessSimulations: {
        normal: primaryHex,
        deuteranopia: deuterColor,
        protanopia: protanColor,
        tritanopia: tritanColor,
        achromatopsia: achromColor,
      },
    };
  }

  /**
   * Analyze distinguishability between two dyes
   */
  private analyzePair(dye1: Dye, dye2: Dye): DyePairResult {
    const contrastRatio = ColorService.getContrastRatio(dye1.hex, dye2.hex);
    const distance = ColorService.getColorDistance(dye1.hex, dye2.hex);
    const distinguishability = Math.round((distance / 441.67) * 100);

    // Calculate distinguishability under each vision type
    const normalDist = Math.round((ColorService.getColorDistance(dye1.hex, dye2.hex) / 441.67) * 100);
    const deuterDist = Math.round(
      (ColorService.getColorDistance(
        ColorService.simulateColorblindnessHex(dye1.hex, 'deuteranopia'),
        ColorService.simulateColorblindnessHex(dye2.hex, 'deuteranopia')
      ) / 441.67) * 100
    );
    const protanDist = Math.round(
      (ColorService.getColorDistance(
        ColorService.simulateColorblindnessHex(dye1.hex, 'protanopia'),
        ColorService.simulateColorblindnessHex(dye2.hex, 'protanopia')
      ) / 441.67) * 100
    );
    const tritanDist = Math.round(
      (ColorService.getColorDistance(
        ColorService.simulateColorblindnessHex(dye1.hex, 'tritanopia'),
        ColorService.simulateColorblindnessHex(dye2.hex, 'tritanopia')
      ) / 441.67) * 100
    );

    const warnings: string[] = [];

    if (distinguishability < 20) {
      warnings.push(LanguageService.t('accessibility.verySimular'));
    } else if (distinguishability < 40) {
      warnings.push(LanguageService.t('accessibility.somewhatSimilar'));
    }

    // Colorblindness-specific warnings
    if (deuterDist < 20 && normalDist >= 20) {
      warnings.push(LanguageService.t('accessibility.hardForDeuteranopia'));
    }
    if (protanDist < 20 && normalDist >= 20) {
      warnings.push(LanguageService.t('accessibility.hardForProtanopia'));
    }
    if (tritanDist < 20 && normalDist >= 20) {
      warnings.push(LanguageService.t('accessibility.hardForTritanopia'));
    }

    return {
      dye1Id: dye1.id,
      dye1Name: LanguageService.getDyeName(dye1.itemID) || dye1.name,
      dye1Hex: dye1.hex,
      dye2Id: dye2.id,
      dye2Name: LanguageService.getDyeName(dye2.itemID) || dye2.name,
      dye2Hex: dye2.hex,
      contrastRatio: Math.round(contrastRatio * 100) / 100,
      wcagLevel: this.getWCAGLevel(contrastRatio),
      distinguishability,
      colorblindnessDistinguishability: {
        normal: normalDist,
        deuteranopia: deuterDist,
        protanopia: protanDist,
        tritanopia: tritanDist,
      },
      warnings,
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Get WCAG badge inline style
   */
  private getWCAGBadgeStyle(level: string): string {
    switch (level) {
      case 'AAA':
        return 'background: #22c55e20; color: #22c55e;';
      case 'AA':
        return 'background: #3b82f620; color: #3b82f6;';
      default:
        return 'background: #ef444420; color: #ef4444;';
    }
  }

  /**
   * Get distinguishability color based on score
   */
  private getDistinguishabilityColor(score: number): string {
    if (score >= 60) return '#22c55e';
    if (score >= 40) return '#3b82f6';
    if (score >= 20) return '#eab308';
    return '#ef4444';
  }
}
