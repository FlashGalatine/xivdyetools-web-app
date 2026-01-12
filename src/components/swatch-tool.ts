/**
 * XIV Dye Tools v4.0.0 - Swatch Tool Component (Swatch Matcher)
 *
 * V4 Renamed: character-tool.ts → swatch-tool.ts
 * Match character customization colors to FFXIV dyes.
 * Allows players to find dyes that match their character's hair, eyes, skin, etc.
 *
 * Left Panel: Race/gender selection, color category selector
 * Right Panel: Color grid, matched dye results
 *
 * @module components/tools/swatch-tool
 */

import { BaseComponent } from '@components/base-component';
import { CollapsiblePanel } from '@components/collapsible-panel';
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
} from '@services/index';
import { CharacterColorService } from '@xivdyetools/core';
import type { CharacterColor, CharacterColorMatch, SubRace, Gender } from '@xivdyetools/types';
import { ICON_TOOL_CHARACTER } from '@shared/tool-icons';
import { ICON_PALETTE, ICON_MARKET } from '@shared/ui-icons';
import { logger } from '@shared/logger';
import { clearContainer } from '@shared/utils';
import type { Dye, PriceData } from '@shared/types';
import type { SwatchConfig, DisplayOptionsConfig } from '@shared/tool-config-types';
import { DEFAULT_DISPLAY_OPTIONS } from '@shared/tool-config-types';
import type { ResultCardData, ContextAction } from '@components/v4/result-card';
// Import v4-result-card custom element to ensure it's registered
import '@components/v4/result-card';

// ============================================================================
// Types and Constants
// ============================================================================

export interface SwatchToolOptions {
  leftPanel: HTMLElement;
  rightPanel: HTMLElement;
  drawerContent?: HTMLElement | null;
}

/**
 * Color category options
 */
type ColorCategory =
  | 'eyeColors'
  | 'hairColors'
  | 'skinColors'
  | 'highlightColors'
  | 'lipColorsDark'
  | 'lipColorsLight'
  | 'tattooColors'
  | 'facePaintColorsDark'
  | 'facePaintColorsLight';

/**
 * Storage keys for character tool
 */
const STORAGE_KEYS = {
  subrace: 'v3_character_subrace',
  gender: 'v3_character_gender',
  colorCategory: 'v3_character_category',
  selectedColorIndex: 'v3_character_color_index',
  maxResults: 'v3_character_max_results',
} as const;

/**
 * Subrace display names (for UI)
 */
const SUBRACE_DISPLAY_NAMES: Record<SubRace, string> = {
  Midlander: 'Midlander',
  Highlander: 'Highlander',
  Wildwood: 'Wildwood',
  Duskwight: 'Duskwight',
  Plainsfolk: 'Plainsfolk',
  Dunesfolk: 'Dunesfolk',
  SeekerOfTheSun: 'Seeker of the Sun',
  KeeperOfTheMoon: 'Keeper of the Moon',
  SeaWolf: 'Sea Wolf',
  Hellsguard: 'Hellsguard',
  Raen: 'Raen',
  Xaela: 'Xaela',
  Helion: 'Helion',
  TheLost: 'The Lost',
  Rava: 'Rava',
  Veena: 'Veena',
};

/**
 * Race groups with their subraces
 */
const RACE_GROUPS: Array<{ name: string; subraces: SubRace[] }> = [
  { name: 'Hyur', subraces: ['Midlander', 'Highlander'] },
  { name: 'Elezen', subraces: ['Wildwood', 'Duskwight'] },
  { name: 'Lalafell', subraces: ['Plainsfolk', 'Dunesfolk'] },
  { name: "Miqo'te", subraces: ['SeekerOfTheSun', 'KeeperOfTheMoon'] },
  { name: 'Roegadyn', subraces: ['SeaWolf', 'Hellsguard'] },
  { name: 'Au Ra', subraces: ['Raen', 'Xaela'] },
  { name: 'Hrothgar', subraces: ['Helion', 'TheLost'] },
  { name: 'Viera', subraces: ['Rava', 'Veena'] },
];

/**
 * Categories that are race-specific (need subrace/gender)
 */
const RACE_SPECIFIC_CATEGORIES: ColorCategory[] = ['hairColors', 'skinColors'];

/**
 * Default values
 */
const DEFAULTS = {
  subrace: 'Midlander' as SubRace,
  gender: 'Male' as Gender,
  colorCategory: 'eyeColors' as ColorCategory,
  matchCount: 3,
};

// ============================================================================
// CharacterTool Component
// ============================================================================

/**
 * Character Tool - v3 Two-Panel Layout
 *
 * Match character customization colors to FFXIV dyes.
 */
export class SwatchTool extends BaseComponent {
  private options: SwatchToolOptions;
  private characterColorService: CharacterColorService;
  private marketBoardService: MarketBoardService;

  // State
  private subrace: SubRace;
  private gender: Gender;
  private colorCategory: ColorCategory;
  private maxResults: number;
  private selectedColor: CharacterColor | null = null;
  private matchedDyes: CharacterColorMatch[] = [];
  private colors: CharacterColor[] = [];
  private priceData: Map<number, PriceData> = new Map();
  private showPrices: boolean = false;

  // Display options (from ConfigController) - for v4-result-card
  private displayOptions: DisplayOptionsConfig = { ...DEFAULT_DISPLAY_OPTIONS };

  // Child components
  private marketBoard: MarketBoard | null = null;
  private marketPanel: CollapsiblePanel | null = null;
  private racePanel: CollapsiblePanel | null = null;
  private categoryPanel: CollapsiblePanel | null = null;

  // Mobile components
  private mobileMarketBoard: MarketBoard | null = null;
  private mobileRacePanel: CollapsiblePanel | null = null;
  private mobileCategoryPanel: CollapsiblePanel | null = null;
  private mobileMarketPanel: CollapsiblePanel | null = null;

  // DOM References
  private colorGridContainer: HTMLElement | null = null;
  private matchResultsContainer: HTMLElement | null = null;
  private selectedColorDisplay: HTMLElement | null = null;
  private emptyStateContainer: HTMLElement | null = null;
  private subraceSelect: HTMLSelectElement | null = null;
  private genderSelect: HTMLSelectElement | null = null;
  private categorySelect: HTMLSelectElement | null = null;

  // Mobile DOM References
  private mobileSubraceSelect: HTMLSelectElement | null = null;
  private mobileGenderSelect: HTMLSelectElement | null = null;
  private mobileCategorySelect: HTMLSelectElement | null = null;

  // Subscriptions
  private languageUnsubscribe: (() => void) | null = null;
  private configUnsubscribe: (() => void) | null = null;
  private resultsPanelMediaQueryCleanup: (() => void) | null = null;

  constructor(container: HTMLElement, options: SwatchToolOptions) {
    super(container);
    this.options = options;
    this.characterColorService = new CharacterColorService();
    this.marketBoardService = MarketBoardService.getInstance();

    // Load persisted settings
    this.subrace = StorageService.getItem<SubRace>(STORAGE_KEYS.subrace) ?? DEFAULTS.subrace;
    this.gender = StorageService.getItem<Gender>(STORAGE_KEYS.gender) ?? DEFAULTS.gender;
    this.colorCategory =
      StorageService.getItem<ColorCategory>(STORAGE_KEYS.colorCategory) ?? DEFAULTS.colorCategory;
    this.maxResults =
      StorageService.getItem<number>(STORAGE_KEYS.maxResults) ?? DEFAULTS.matchCount;

    // Load initial colors
    this.loadColors();
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
    // Event bindings handled in render methods
  }

  onMount(): void {
    this.languageUnsubscribe = LanguageService.subscribe(() => {
      this.update();
    });

    // Subscribe to config changes from V4 ConfigSidebar
    this.configUnsubscribe = ConfigController.getInstance().subscribe('swatch', (config) => {
      this.setConfig(config);
    });

    logger.info('[CharacterTool] Mounted');
  }

  destroy(): void {
    this.languageUnsubscribe?.();
    this.configUnsubscribe?.();
    this.resultsPanelMediaQueryCleanup?.();

    this.marketBoard?.destroy();
    this.marketPanel?.destroy();
    this.racePanel?.destroy();
    this.categoryPanel?.destroy();

    this.mobileMarketBoard?.destroy();
    this.mobileRacePanel?.destroy();
    this.mobileCategoryPanel?.destroy();
    this.mobileMarketPanel?.destroy();

    this.selectedColor = null;
    this.matchedDyes = [];
    this.colors = [];
    this.priceData.clear();

    super.destroy();
    logger.info('[CharacterTool] Destroyed');
  }

  // ============================================================================
  // V4 Integration
  // ============================================================================

  /**
   * Update tool configuration from external source (V4 ConfigSidebar)
   */
  public setConfig(config: Partial<SwatchConfig>): void {
    let needsReload = false;
    let needsRematch = false;
    let needsRedraw = false;

    // Handle race (now receives SubRace values directly like 'Midlander')
    if (config.race !== undefined && config.race !== this.subrace) {
      this.subrace = config.race as SubRace;
      StorageService.setItem(STORAGE_KEYS.subrace, config.race);
      needsReload = true;
      logger.info(`[SwatchTool] setConfig: race -> ${config.race}`);
    }

    // Handle gender
    if (config.gender !== undefined && config.gender !== this.gender) {
      this.gender = config.gender as Gender;
      StorageService.setItem(STORAGE_KEYS.gender, config.gender);
      needsReload = true;
      logger.info(`[SwatchTool] setConfig: gender -> ${config.gender}`);
    }

    // Handle colorSheet (now receives category keys directly like 'eyeColors')
    if (config.colorSheet !== undefined && config.colorSheet !== this.colorCategory) {
      // ConfigSidebar now sends category keys directly (e.g., 'eyeColors', 'hairColors')
      this.colorCategory = config.colorSheet as ColorCategory;
      StorageService.setItem(STORAGE_KEYS.colorCategory, config.colorSheet);
      needsReload = true;
      logger.info(`[SwatchTool] setConfig: colorSheet -> ${config.colorSheet}`);
    }

    // Handle maxResults
    if (config.maxResults !== undefined && config.maxResults !== this.maxResults) {
      this.maxResults = config.maxResults;
      StorageService.setItem(STORAGE_KEYS.maxResults, config.maxResults);
      needsRematch = true;
      logger.info(`[SwatchTool] setConfig: maxResults -> ${config.maxResults}`);
    }

    // Handle displayOptions (for v4-result-card display settings)
    if (config.displayOptions !== undefined) {
      this.displayOptions = { ...this.displayOptions, ...config.displayOptions };
      needsRedraw = true;
      logger.info(`[SwatchTool] setConfig: displayOptions updated`);
    }

    // Sync UI selectors (both desktop and mobile)
    if (needsReload || needsRematch) {
      // Update desktop selectors
      if (this.subraceSelect) this.subraceSelect.value = this.subrace;
      if (this.genderSelect) this.genderSelect.value = this.gender;
      if (this.categorySelect) this.categorySelect.value = this.colorCategory;
      // Update mobile selectors
      if (this.mobileSubraceSelect) this.mobileSubraceSelect.value = this.subrace;
      if (this.mobileGenderSelect) this.mobileGenderSelect.value = this.gender;
      if (this.mobileCategorySelect) this.mobileCategorySelect.value = this.colorCategory;
    }

    // Reload colors if race/gender/category changed
    if (needsReload) {
      this.selectedColor = null;
      this.loadColors();
      // Update the grid header title
      this.updateColorGrid();
    } else if (needsRematch && this.selectedColor) {
      // Just re-match if only maxResults changed
      this.findMatchingDyes();
    } else if (needsRedraw && this.matchedDyes.length > 0) {
      // Just redraw results if only display options changed
      this.updateMatchResults();
    }
  }

  // ============================================================================
  // Left Panel Rendering
  // ============================================================================

  private renderLeftPanel(): void {
    const left = this.options.leftPanel;
    clearContainer(left);

    // Section 1: Race & Gender Selection
    const raceContainer = this.createElement('div');
    left.appendChild(raceContainer);
    this.racePanel = new CollapsiblePanel(raceContainer, {
      title: LanguageService.t('tools.character.selectSubrace') || 'Select Subrace',
      storageKey: 'v3_character_race_panel',
      defaultOpen: true,
      icon: ICON_TOOL_CHARACTER,
    });
    this.racePanel.init();
    const raceContent = this.createElement('div');
    this.renderRaceSection(raceContent);
    this.racePanel.setContent(raceContent);

    // Section 2: Color Category Selection
    const categoryContainer = this.createElement('div');
    left.appendChild(categoryContainer);
    this.categoryPanel = new CollapsiblePanel(categoryContainer, {
      title: LanguageService.t('tools.character.colorCategory') || 'Color Category',
      storageKey: 'v3_character_category_panel',
      defaultOpen: true,
      icon: ICON_PALETTE,
    });
    this.categoryPanel.init();
    const categoryContent = this.createElement('div');
    this.renderCategorySection(categoryContent);
    this.categoryPanel.setContent(categoryContent);

    // Section 3: Market Board
    const marketContainer = this.createElement('div');
    left.appendChild(marketContainer);
    this.marketPanel = new CollapsiblePanel(marketContainer, {
      title: LanguageService.t('marketBoard.title') || 'Market Board',
      storageKey: 'v3_character_market',
      defaultOpen: false,
      icon: ICON_MARKET,
    });
    this.marketPanel.init();

    const marketContent = this.createElement('div');
    this.marketBoard = new MarketBoard(marketContent);
    this.marketBoard.init();

    // Listen to market board events
    marketContent.addEventListener('server-changed', () => {
      if (this.selectedColor) {
        this.findMatchingDyes();
      }
    });

    marketContent.addEventListener('showPricesChanged', ((e: CustomEvent) => {
      this.showPrices = e.detail?.showPrices ?? false;
      if (this.showPrices && this.matchedDyes.length > 0) {
        this.fetchPrices(this.matchedDyes.map((m) => m.dye));
      } else {
        this.updateMatchResults();
      }
    }) as EventListener);

    marketContent.addEventListener('categories-changed', () => {
      if (this.showPrices && this.matchedDyes.length > 0) {
        this.fetchPrices(this.matchedDyes.map((m) => m.dye));
      }
    });

    marketContent.addEventListener('refresh-requested', () => {
      if (this.showPrices && this.matchedDyes.length > 0) {
        this.priceData.clear();
        this.fetchPrices(this.matchedDyes.map((m) => m.dye));
      }
    });

    // Initialize showPrices from MarketBoard state
    this.showPrices = this.marketBoard.getShowPrices();

    this.marketPanel.setContent(marketContent);
  }

  /**
   * Render race/gender selection
   */
  private renderRaceSection(container: HTMLElement): void {
    const section = this.createElement('div', { className: 'space-y-4 p-2' });

    // Subrace selector
    const subraceGroup = this.createElement('div', { className: 'space-y-2' });
    const subraceLabel = this.createElement('label', {
      className: 'block text-sm font-medium',
      textContent: LanguageService.t('tools.character.selectSubrace') || 'Subrace',
      attributes: { style: 'color: var(--theme-text);' },
    });
    subraceGroup.appendChild(subraceLabel);

    this.subraceSelect = this.createElement('select', {
      className: 'w-full p-2 rounded-lg border text-sm',
      attributes: {
        style:
          'background: var(--theme-input-background); color: var(--theme-text); border-color: var(--theme-border);',
      },
    }) as HTMLSelectElement;

    // Group subraces by race
    for (const group of RACE_GROUPS) {
      const optgroup = this.createElement('optgroup', {
        attributes: { label: group.name },
      }) as HTMLOptGroupElement;

      for (const subrace of group.subraces) {
        const option = this.createElement('option', {
          textContent: SUBRACE_DISPLAY_NAMES[subrace],
          attributes: { value: subrace },
        }) as HTMLOptionElement;
        if (subrace === this.subrace) {
          option.selected = true;
        }
        optgroup.appendChild(option);
      }
      this.subraceSelect.appendChild(optgroup);
    }

    this.subraceSelect.addEventListener('change', () => {
      this.subrace = this.subraceSelect!.value as SubRace;
      StorageService.setItem(STORAGE_KEYS.subrace, this.subrace);
      this.syncMobileSelectors();
      this.loadColors();
      this.updateColorGrid();
      this.clearSelection();
    });

    subraceGroup.appendChild(this.subraceSelect);
    section.appendChild(subraceGroup);

    // Gender selector
    const genderGroup = this.createElement('div', { className: 'space-y-2' });
    const genderLabel = this.createElement('label', {
      className: 'block text-sm font-medium',
      textContent: LanguageService.t('tools.character.selectGender') || 'Gender',
      attributes: { style: 'color: var(--theme-text);' },
    });
    genderGroup.appendChild(genderLabel);

    this.genderSelect = this.createElement('select', {
      className: 'w-full p-2 rounded-lg border text-sm',
      attributes: {
        style:
          'background: var(--theme-input-background); color: var(--theme-text); border-color: var(--theme-border);',
      },
    }) as HTMLSelectElement;

    const maleOption = this.createElement('option', {
      textContent: LanguageService.t('tools.character.male') || 'Male',
      attributes: { value: 'Male' },
    }) as HTMLOptionElement;
    if (this.gender === 'Male') maleOption.selected = true;

    const femaleOption = this.createElement('option', {
      textContent: LanguageService.t('tools.character.female') || 'Female',
      attributes: { value: 'Female' },
    }) as HTMLOptionElement;
    if (this.gender === 'Female') femaleOption.selected = true;

    this.genderSelect.appendChild(maleOption);
    this.genderSelect.appendChild(femaleOption);

    this.genderSelect.addEventListener('change', () => {
      this.gender = this.genderSelect!.value as Gender;
      StorageService.setItem(STORAGE_KEYS.gender, this.gender);
      this.syncMobileSelectors();
      this.loadColors();
      this.updateColorGrid();
      this.clearSelection();
    });

    genderGroup.appendChild(this.genderSelect);
    section.appendChild(genderGroup);

    // Show/hide gender based on category
    this.updateGenderVisibility(genderGroup);

    container.appendChild(section);
  }

  /**
   * Render color category selection
   */
  private renderCategorySection(container: HTMLElement): void {
    const section = this.createElement('div', { className: 'space-y-2 p-2' });

    this.categorySelect = this.createElement('select', {
      className: 'w-full p-2 rounded-lg border text-sm',
      attributes: {
        style:
          'background: var(--theme-input-background); color: var(--theme-text); border-color: var(--theme-border);',
      },
    }) as HTMLSelectElement;

    const categories: Array<{ value: ColorCategory; label: string }> = [
      { value: 'eyeColors', label: LanguageService.t('tools.character.eyeColors') || 'Eye Colors' },
      {
        value: 'hairColors',
        label: LanguageService.t('tools.character.hairColors') || 'Hair Colors',
      },
      {
        value: 'skinColors',
        label: LanguageService.t('tools.character.skinColors') || 'Skin Colors',
      },
      {
        value: 'highlightColors',
        label: LanguageService.t('tools.character.highlightColors') || 'Highlight Colors',
      },
      {
        value: 'lipColorsDark',
        label: LanguageService.t('tools.character.lipColorsDark') || 'Lip Colors (Dark)',
      },
      {
        value: 'lipColorsLight',
        label: LanguageService.t('tools.character.lipColorsLight') || 'Lip Colors (Light)',
      },
      {
        value: 'tattooColors',
        label: LanguageService.t('tools.character.tattooColors') || 'Tattoo/Limbal Colors',
      },
      {
        value: 'facePaintColorsDark',
        label: LanguageService.t('tools.character.facePaintDark') || 'Face Paint (Dark)',
      },
      {
        value: 'facePaintColorsLight',
        label: LanguageService.t('tools.character.facePaintLight') || 'Face Paint (Light)',
      },
    ];

    for (const cat of categories) {
      const option = this.createElement('option', {
        textContent: cat.label,
        attributes: { value: cat.value },
      }) as HTMLOptionElement;
      if (cat.value === this.colorCategory) {
        option.selected = true;
      }
      this.categorySelect.appendChild(option);
    }

    this.categorySelect.addEventListener('change', () => {
      this.colorCategory = this.categorySelect!.value as ColorCategory;
      StorageService.setItem(STORAGE_KEYS.colorCategory, this.colorCategory);
      this.syncMobileSelectors();
      this.loadColors();
      this.updateColorGrid();
      this.clearSelection();

      // Update gender visibility
      const genderGroup = this.subraceSelect?.parentElement
        ?.nextElementSibling as HTMLElement | null;
      if (genderGroup) {
        this.updateGenderVisibility(genderGroup);
      }
    });

    section.appendChild(this.categorySelect);
    container.appendChild(section);
  }

  /**
   * Update gender selector visibility based on category
   */
  private updateGenderVisibility(genderGroup: HTMLElement): void {
    const needsGender = RACE_SPECIFIC_CATEGORIES.includes(this.colorCategory);
    genderGroup.style.display = needsGender ? 'block' : 'none';
  }

  // ============================================================================
  // Right Panel Rendering (V4 Layout)
  // ============================================================================

  private renderRightPanel(): void {
    const right = this.options.rightPanel;
    // In V4, leftPanel and rightPanel are the same element.
    // Clear to remove leftPanel content (V4 uses ConfigSidebar instead).
    clearContainer(right);

    // Apply V4-style layout to the panel
    // Use min-height instead of height to allow container to grow with content
    right.setAttribute(
      'style',
      `
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
      min-height: 100%;
      height: auto;
      padding: 32px;
      gap: 24px;
      box-sizing: border-box;
      overflow-y: auto;
    `
    );

    // Main layout container: Color Grid (LEFT) | Results Area (RIGHT)
    // Use align-items: flex-start so children size to their content, not stretch to fill
    const mainLayout = this.createElement('div', {
      attributes: {
        style: `
          display: flex;
          gap: 24px;
          min-height: 500px;
          justify-content: center;
          align-items: flex-start;
          width: 100%;
          max-width: 1400px;
        `,
      },
    });

    // LEFT: Color Grid Panel (glassmorphism container)
    // height: fit-content ensures panel sizes to contain all swatches (96 or 192)
    const gridPanel = this.createElement('div', {
      className: 'glass',
      attributes: {
        style: `
          flex: 0 0 auto;
          width: 420px;
          height: fit-content;
          background: var(--v4-glass-bg, rgba(30, 30, 30, 0.7));
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid var(--theme-border, rgba(255, 255, 255, 0.1));
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
          display: flex;
          flex-direction: column;
          align-items: center;
        `,
      },
    });

    // Grid header
    const gridHeader = this.createElement('div', {
      attributes: {
        style: `
          width: 100%;
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
        `,
      },
    });
    const gridTitle = this.createElement('span', {
      className: 'section-title',
      textContent: `${this.getCategoryDisplayName(this.colorCategory)} (${this.colors.length})`,
      attributes: {
        style: `
          font-size: 14px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--theme-text-muted, #a0a0a0);
        `,
      },
    });
    gridHeader.appendChild(gridTitle);
    gridPanel.appendChild(gridHeader);

    // Color grid (8 columns with larger swatches)
    this.colorGridContainer = this.createElement('div', {
      attributes: {
        style: `
          display: grid;
          grid-template-columns: repeat(8, 44px);
          gap: 4px;
          width: fit-content;
        `,
      },
    });
    gridPanel.appendChild(this.colorGridContainer);
    mainLayout.appendChild(gridPanel);

    // RIGHT: Results Area (wider to accommodate 4 cards per row)
    const resultsArea = this.createElement('div', {
      attributes: {
        style: `
          display: flex;
          flex-direction: column;
          gap: 24px;
          flex: 1;
          min-width: 0;
        `,
      },
    });

    // Selected Color Section (shows technical info of selected swatch)
    const selectedSection = this.createElement('div', {
      attributes: {
        style: `
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 12px;
        `,
      },
    });

    // Section header (using consistent section-header/section-title pattern)
    const selectedHeader = this.createElement('div', {
      className: 'section-header',
      attributes: { style: 'width: 100%;' },
    });
    const selectedTitle = this.createElement('span', {
      className: 'section-title',
      textContent: LanguageService.t('tools.character.selectedColor') || 'Selected Color',
    });
    selectedHeader.appendChild(selectedTitle);
    selectedSection.appendChild(selectedHeader);

    // Selected Color Card (V4 style matching result cards)
    this.selectedColorDisplay = this.createElement('div', {
      attributes: {
        style: `
          background: var(--theme-card-background, #2a2a2a);
          border: 1px solid var(--theme-border, rgba(255, 255, 255, 0.1));
          border-radius: 12px;
          overflow: hidden;
          max-width: 320px;
        `,
      },
    });
    selectedSection.appendChild(this.selectedColorDisplay);
    resultsArea.appendChild(selectedSection);

    // Matching Dyes Section
    const matchSection = this.createElement('div', {
      attributes: {
        style: `
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 16px;
        `,
      },
    });

    // Section header (using consistent section-header/section-title pattern)
    const matchHeader = this.createElement('div', {
      className: 'section-header',
      attributes: { style: 'width: 100%;' },
    });
    const matchTitle = this.createElement('span', {
      className: 'section-title',
      textContent: LanguageService.t('tools.character.matchingDyes') || 'Matching Dyes',
    });
    matchHeader.appendChild(matchTitle);
    matchSection.appendChild(matchHeader);

    // Match results container (CSS grid with max 4 columns)
    this.matchResultsContainer = this.createElement('div', {
      attributes: {
        style: `
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
          width: 100%;
        `,
      },
    });
    matchSection.appendChild(this.matchResultsContainer);
    resultsArea.appendChild(matchSection);

    // Empty state (shown when no color selected)
    this.emptyStateContainer = this.createElement('div', {
      attributes: {
        style: `
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
          background: var(--theme-card-background, #2a2a2a);
          border: 1px solid var(--theme-border, rgba(255, 255, 255, 0.1));
          border-radius: 12px;
          min-width: 320px;
        `,
      },
    });
    // Empty state icon
    const emptyIcon = this.createElement('div', {
      attributes: {
        style: `
          width: 64px;
          height: 64px;
          opacity: 0.3;
          margin-bottom: 16px;
          color: var(--theme-text-muted, #888888);
        `,
      },
    });
    emptyIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" width="64" height="64">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" opacity="0.3"/>
      <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.5"/>
    </svg>`;
    this.emptyStateContainer.appendChild(emptyIcon);

    const emptyText = this.createElement('span', {
      textContent:
        LanguageService.t('tools.character.noColorSelected') ||
        'Select a color from the grid to find matching dyes',
      attributes: {
        style: `
          color: var(--theme-text-muted, #888888);
          font-size: 14px;
          text-align: center;
          max-width: 280px;
        `,
      },
    });
    this.emptyStateContainer.appendChild(emptyText);

    // Add empty state to results area (will be shown/hidden by updateMatchResults)
    resultsArea.appendChild(this.emptyStateContainer);

    mainLayout.appendChild(resultsArea);
    right.appendChild(mainLayout);

    // Initialize displays
    this.updateSelectedColorDisplay();
    this.updateEmptyState();
    this.updateColorGrid();
  }

  /**
   * Update empty state visibility based on selection
   */
  private updateEmptyState(): void {
    if (!this.emptyStateContainer || !this.matchResultsContainer) return;

    const hasSelection = this.selectedColor !== null;
    const hasResults = this.matchedDyes.length > 0;

    // Show empty state when no color selected OR when selected but no results yet
    this.emptyStateContainer.style.display = hasSelection && hasResults ? 'none' : 'flex';

    // Hide match section header when showing empty state
    const matchSection = this.matchResultsContainer.parentElement;
    if (matchSection) {
      const matchHeader = matchSection.querySelector('div:first-child') as HTMLElement;
      if (matchHeader && matchHeader !== this.matchResultsContainer) {
        matchHeader.style.display = hasSelection && hasResults ? 'flex' : 'none';
      }
    }
  }

  /**
   * Update the color grid
   */
  private updateColorGrid(): void {
    if (!this.colorGridContainer) return;
    clearContainer(this.colorGridContainer);

    // Update the header label with category name and color count
    const gridHeader = this.colorGridContainer.previousElementSibling as HTMLElement;
    if (gridHeader) {
      const titleSpan = gridHeader.querySelector('.section-title');
      if (titleSpan) {
        titleSpan.textContent = `${this.getCategoryDisplayName(this.colorCategory)} (${this.colors.length})`;
      }
    }

    for (const color of this.colors) {
      const swatch = this.createElement('button', {
        className:
          'cursor-pointer transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1',
        attributes: {
          style: `
            width: 44px;
            height: 44px;
            background-color: ${color.hex};
            border: 1px solid var(--theme-border);
            border-radius: 4px;
          `,
          title: `${color.hex} (Index: ${color.index})`,
          'data-index': String(color.index),
          'aria-label': `Color ${color.index + 1}: ${color.hex}`,
        },
      });

      swatch.addEventListener('click', () => {
        this.selectColor(color);
      });

      this.colorGridContainer.appendChild(swatch);
    }
  }

  /**
   * Update selected color display (V4 style card)
   */
  private updateSelectedColorDisplay(): void {
    if (!this.selectedColorDisplay) return;
    clearContainer(this.selectedColorDisplay);

    // Get parent section to show/hide header
    const parentSection = this.selectedColorDisplay.parentElement;

    if (!this.selectedColor) {
      // Hide the entire section when no color selected
      if (parentSection) {
        parentSection.style.display = 'none';
      }
      return;
    }

    // Show section when color is selected
    if (parentSection) {
      parentSection.style.display = 'flex';
    }

    // Calculate grid position (8 columns per row, 1-indexed)
    const gridRow = Math.floor(this.selectedColor.index / 8) + 1;
    const gridCol = (this.selectedColor.index % 8) + 1;

    // Calculate HSV values
    const hsv = ColorService.rgbToHsv(
      this.selectedColor.rgb.r,
      this.selectedColor.rgb.g,
      this.selectedColor.rgb.b
    );

    // Calculate LAB values
    const lab = ColorService.rgbToLab(
      this.selectedColor.rgb.r,
      this.selectedColor.rgb.g,
      this.selectedColor.rgb.b
    );

    // Card title (grid position)
    const titleBar = this.createElement('div', {
      attributes: {
        style: `
          padding: 12px 16px;
          background: var(--theme-card-header, rgba(0, 0, 0, 0.2));
          border-bottom: 1px solid var(--theme-border, rgba(255, 255, 255, 0.1));
          text-align: center;
        `,
      },
    });
    const title = this.createElement('span', {
      textContent: `Row ${gridRow}, Column ${gridCol}`,
      attributes: {
        style: `
          font-size: 14px;
          font-weight: 600;
          color: var(--theme-text, #e0e0e0);
        `,
      },
    });
    titleBar.appendChild(title);
    this.selectedColorDisplay.appendChild(titleBar);

    // Large color swatch preview
    const swatchPreview = this.createElement('div', {
      attributes: {
        style: `
          width: 100%;
          height: 80px;
          background-color: ${this.selectedColor.hex};
        `,
      },
    });
    this.selectedColorDisplay.appendChild(swatchPreview);

    // Technical data section
    const dataSection = this.createElement('div', {
      attributes: {
        style: `
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        `,
      },
    });

    // Two-column layout for technical data
    const dataGrid = this.createElement('div', {
      attributes: {
        style: `
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 16px;
          font-size: 12px;
        `,
      },
    });

    // Helper to create data rows
    const createDataRow = (label: string, value: string): HTMLElement => {
      const row = this.createElement('div', {
        attributes: {
          style: `
            display: flex;
            justify-content: space-between;
            align-items: center;
          `,
        },
      });
      const labelEl = this.createElement('span', {
        textContent: label,
        attributes: { style: 'color: var(--theme-text-muted, #a0a0a0);' },
      });
      const valueEl = this.createElement('span', {
        className: 'number',
        textContent: value,
        attributes: { style: 'color: var(--theme-text, #e0e0e0); font-weight: 500;' },
      });
      row.appendChild(labelEl);
      row.appendChild(valueEl);
      return row;
    };

    // Add data rows
    dataGrid.appendChild(createDataRow('HEX', this.selectedColor.hex.toUpperCase()));
    dataGrid.appendChild(createDataRow('Index', String(this.selectedColor.index)));
    dataGrid.appendChild(
      createDataRow(
        'RGB',
        `${this.selectedColor.rgb.r},${this.selectedColor.rgb.g},${this.selectedColor.rgb.b}`
      )
    );
    dataGrid.appendChild(
      createDataRow('HSV', `${Math.round(hsv.h)},${Math.round(hsv.s)},${Math.round(hsv.v)}`)
    );
    dataGrid.appendChild(
      createDataRow('LAB', `${Math.round(lab.L)},${Math.round(lab.a)},${Math.round(lab.b)}`)
    );

    dataSection.appendChild(dataGrid);
    this.selectedColorDisplay.appendChild(dataSection);

    // Copy button
    const copyBtn = this.createElement('button', {
      attributes: {
        style: `
          width: 100%;
          padding: 10px 16px;
          background: var(--theme-primary, #d4a857);
          color: var(--theme-primary-text, #1a1a1a);
          border: none;
          border-radius: 0 0 11px 11px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s;
        `,
      },
      textContent: 'Copy Color Info',
    });
    copyBtn.addEventListener('mouseenter', () => {
      copyBtn.style.opacity = '0.9';
    });
    copyBtn.addEventListener('mouseleave', () => {
      copyBtn.style.opacity = '1';
    });
    copyBtn.addEventListener('click', () => this.copySelectedColorInfo());
    this.selectedColorDisplay.appendChild(copyBtn);
  }

  /**
   * Copy selected color information to clipboard
   */
  private copySelectedColorInfo(): void {
    if (!this.selectedColor) return;

    const gridRow = Math.floor(this.selectedColor.index / 8) + 1;
    const gridCol = (this.selectedColor.index % 8) + 1;
    const hsv = ColorService.rgbToHsv(
      this.selectedColor.rgb.r,
      this.selectedColor.rgb.g,
      this.selectedColor.rgb.b
    );
    const lab = ColorService.rgbToLab(
      this.selectedColor.rgb.r,
      this.selectedColor.rgb.g,
      this.selectedColor.rgb.b
    );

    const info = [
      `Grid Position: Row ${gridRow}, Column ${gridCol}`,
      `Index: ${this.selectedColor.index}`,
      `HEX: ${this.selectedColor.hex.toUpperCase()}`,
      `RGB: ${this.selectedColor.rgb.r}, ${this.selectedColor.rgb.g}, ${this.selectedColor.rgb.b}`,
      `HSV: ${Math.round(hsv.h)}, ${Math.round(hsv.s)}, ${Math.round(hsv.v)}`,
      `LAB: ${Math.round(lab.L)}, ${Math.round(lab.a)}, ${Math.round(lab.b)}`,
    ].join('\n');

    navigator.clipboard
      .writeText(info)
      .then(() => {
        ToastService.success(
          LanguageService.t('actions.copiedToClipboard') || 'Copied to clipboard'
        );
      })
      .catch(() => {
        ToastService.error(LanguageService.t('actions.copyFailed') || 'Failed to copy');
      });
  }

  /**
   * Update match results display using v4-result-card components
   */
  private updateMatchResults(): void {
    if (!this.matchResultsContainer) return;
    clearContainer(this.matchResultsContainer);

    // Update empty state visibility
    this.updateEmptyState();

    if (this.matchedDyes.length === 0) {
      return;
    }

    for (const match of this.matchedDyes) {
      // Create v4-result-card element
      const card = document.createElement('v4-result-card') as HTMLElement;
      card.setAttribute('show-actions', 'true');
      // Make primary button open context menu (same as the ... button)
      card.setAttribute('primary-opens-menu', 'true');
      card.setAttribute('primary-action-label', 'Explore Dye');

      // Get price data for this dye
      const priceDataForDye = this.priceData.get(match.dye.itemID);

      // Set data property (ResultCardData interface)
      const cardData: ResultCardData = {
        dye: match.dye,
        originalColor: this.selectedColor?.hex || match.dye.hex,
        matchedColor: match.dye.hex,
        deltaE: match.distance,
        // Resolve worldId to actual world name
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

      // Listen for context actions (both primary button and context menu trigger this)
      card.addEventListener('context-action', ((
        e: CustomEvent<{ action: ContextAction; dye: Dye }>
      ) => {
        this.handleContextAction(e.detail.action, e.detail.dye);
      }) as EventListener);

      this.matchResultsContainer.appendChild(card);
    }
  }

  /**
   * Handle context menu actions from result cards
   */
  private handleContextAction(action: ContextAction, dye: Dye): void {
    switch (action) {
      case 'add-comparison':
        window.dispatchEvent(
          new CustomEvent('navigate-to-tool', {
            detail: { toolId: 'comparison', dye },
          })
        );
        ToastService.success(LanguageService.t('toast.addedToComparison') || 'Added to comparison');
        break;

      case 'add-mixer':
        window.dispatchEvent(
          new CustomEvent('navigate-to-tool', {
            detail: { toolId: 'mixer', dye },
          })
        );
        ToastService.success(LanguageService.t('toast.addedToMixer') || 'Added to mixer');
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

  private renderDrawerContent(): void {
    const drawer = this.options.drawerContent;
    if (!drawer) return;

    // Race section
    const raceContainer = this.createElement('div');
    drawer.appendChild(raceContainer);
    this.mobileRacePanel = new CollapsiblePanel(raceContainer, {
      title: LanguageService.t('tools.character.selectSubrace') || 'Select Subrace',
      storageKey: 'v3_character_mobile_race_panel',
      defaultOpen: true,
      icon: ICON_TOOL_CHARACTER,
    });
    this.mobileRacePanel.init();
    const mobileRaceContent = this.createElement('div');
    this.renderMobileRaceSection(mobileRaceContent);
    this.mobileRacePanel.setContent(mobileRaceContent);

    // Category section
    const categoryContainer = this.createElement('div');
    drawer.appendChild(categoryContainer);
    this.mobileCategoryPanel = new CollapsiblePanel(categoryContainer, {
      title: LanguageService.t('tools.character.colorCategory') || 'Color Category',
      storageKey: 'v3_character_mobile_category_panel',
      defaultOpen: true,
      icon: ICON_PALETTE,
    });
    this.mobileCategoryPanel.init();
    const mobileCategoryContent = this.createElement('div');
    this.renderMobileCategorySection(mobileCategoryContent);
    this.mobileCategoryPanel.setContent(mobileCategoryContent);

    // Market Board
    const marketContainer = this.createElement('div');
    drawer.appendChild(marketContainer);
    this.mobileMarketPanel = new CollapsiblePanel(marketContainer, {
      title: LanguageService.t('marketBoard.title') || 'Market Board',
      storageKey: 'v3_character_mobile_market',
      defaultOpen: false,
      icon: ICON_MARKET,
    });
    this.mobileMarketPanel.init();

    const mobileMarketContent = this.createElement('div');
    this.mobileMarketBoard = new MarketBoard(mobileMarketContent);
    this.mobileMarketBoard.init();

    // Listen to mobile market board events
    mobileMarketContent.addEventListener('server-changed', () => {
      if (this.selectedColor) {
        this.findMatchingDyes();
      }
    });

    mobileMarketContent.addEventListener('showPricesChanged', ((e: CustomEvent) => {
      this.showPrices = e.detail?.showPrices ?? false;
      if (this.showPrices && this.matchedDyes.length > 0) {
        this.fetchPrices(this.matchedDyes.map((m) => m.dye));
      } else {
        this.updateMatchResults();
      }
    }) as EventListener);

    mobileMarketContent.addEventListener('categories-changed', () => {
      if (this.showPrices && this.matchedDyes.length > 0) {
        this.fetchPrices(this.matchedDyes.map((m) => m.dye));
      }
    });

    mobileMarketContent.addEventListener('refresh-requested', () => {
      if (this.showPrices && this.matchedDyes.length > 0) {
        this.priceData.clear();
        this.fetchPrices(this.matchedDyes.map((m) => m.dye));
      }
    });

    this.mobileMarketPanel.setContent(mobileMarketContent);
  }

  /**
   * Render mobile race section (mirrors desktop)
   */
  private renderMobileRaceSection(container: HTMLElement): void {
    const section = this.createElement('div', { className: 'space-y-4 p-2' });

    // Subrace selector
    const subraceGroup = this.createElement('div', { className: 'space-y-2' });
    const subraceLabel = this.createElement('label', {
      className: 'block text-sm font-medium',
      textContent: LanguageService.t('tools.character.selectSubrace') || 'Subrace',
      attributes: { style: 'color: var(--theme-text);' },
    });
    subraceGroup.appendChild(subraceLabel);

    this.mobileSubraceSelect = this.createElement('select', {
      className: 'w-full p-2 rounded-lg border text-sm',
      attributes: {
        style:
          'background: var(--theme-input-background); color: var(--theme-text); border-color: var(--theme-border);',
      },
    }) as HTMLSelectElement;

    for (const group of RACE_GROUPS) {
      const optgroup = this.createElement('optgroup', {
        attributes: { label: group.name },
      }) as HTMLOptGroupElement;

      for (const subrace of group.subraces) {
        const option = this.createElement('option', {
          textContent: SUBRACE_DISPLAY_NAMES[subrace],
          attributes: { value: subrace },
        }) as HTMLOptionElement;
        if (subrace === this.subrace) {
          option.selected = true;
        }
        optgroup.appendChild(option);
      }
      this.mobileSubraceSelect.appendChild(optgroup);
    }

    this.mobileSubraceSelect.addEventListener('change', () => {
      this.subrace = this.mobileSubraceSelect!.value as SubRace;
      StorageService.setItem(STORAGE_KEYS.subrace, this.subrace);
      this.syncDesktopSelectors();
      this.loadColors();
      this.updateColorGrid();
      this.clearSelection();
    });

    subraceGroup.appendChild(this.mobileSubraceSelect);
    section.appendChild(subraceGroup);

    // Gender selector
    const genderGroup = this.createElement('div', { className: 'space-y-2' });
    const genderLabel = this.createElement('label', {
      className: 'block text-sm font-medium',
      textContent: LanguageService.t('tools.character.selectGender') || 'Gender',
      attributes: { style: 'color: var(--theme-text);' },
    });
    genderGroup.appendChild(genderLabel);

    this.mobileGenderSelect = this.createElement('select', {
      className: 'w-full p-2 rounded-lg border text-sm',
      attributes: {
        style:
          'background: var(--theme-input-background); color: var(--theme-text); border-color: var(--theme-border);',
      },
    }) as HTMLSelectElement;

    const maleOption = this.createElement('option', {
      textContent: LanguageService.t('tools.character.male') || 'Male',
      attributes: { value: 'Male' },
    }) as HTMLOptionElement;
    if (this.gender === 'Male') maleOption.selected = true;

    const femaleOption = this.createElement('option', {
      textContent: LanguageService.t('tools.character.female') || 'Female',
      attributes: { value: 'Female' },
    }) as HTMLOptionElement;
    if (this.gender === 'Female') femaleOption.selected = true;

    this.mobileGenderSelect.appendChild(maleOption);
    this.mobileGenderSelect.appendChild(femaleOption);

    this.mobileGenderSelect.addEventListener('change', () => {
      this.gender = this.mobileGenderSelect!.value as Gender;
      StorageService.setItem(STORAGE_KEYS.gender, this.gender);
      this.syncDesktopSelectors();
      this.loadColors();
      this.updateColorGrid();
      this.clearSelection();
    });

    genderGroup.appendChild(this.mobileGenderSelect);
    section.appendChild(genderGroup);

    this.updateGenderVisibility(genderGroup);
    container.appendChild(section);
  }

  /**
   * Render mobile category section
   */
  private renderMobileCategorySection(container: HTMLElement): void {
    const section = this.createElement('div', { className: 'space-y-2 p-2' });

    this.mobileCategorySelect = this.createElement('select', {
      className: 'w-full p-2 rounded-lg border text-sm',
      attributes: {
        style:
          'background: var(--theme-input-background); color: var(--theme-text); border-color: var(--theme-border);',
      },
    }) as HTMLSelectElement;

    const categories: Array<{ value: ColorCategory; label: string }> = [
      { value: 'eyeColors', label: LanguageService.t('tools.character.eyeColors') || 'Eye Colors' },
      {
        value: 'hairColors',
        label: LanguageService.t('tools.character.hairColors') || 'Hair Colors',
      },
      {
        value: 'skinColors',
        label: LanguageService.t('tools.character.skinColors') || 'Skin Colors',
      },
      {
        value: 'highlightColors',
        label: LanguageService.t('tools.character.highlightColors') || 'Highlight Colors',
      },
      {
        value: 'lipColorsDark',
        label: LanguageService.t('tools.character.lipColorsDark') || 'Lip Colors (Dark)',
      },
      {
        value: 'lipColorsLight',
        label: LanguageService.t('tools.character.lipColorsLight') || 'Lip Colors (Light)',
      },
      {
        value: 'tattooColors',
        label: LanguageService.t('tools.character.tattooColors') || 'Tattoo/Limbal Colors',
      },
      {
        value: 'facePaintColorsDark',
        label: LanguageService.t('tools.character.facePaintDark') || 'Face Paint (Dark)',
      },
      {
        value: 'facePaintColorsLight',
        label: LanguageService.t('tools.character.facePaintLight') || 'Face Paint (Light)',
      },
    ];

    for (const cat of categories) {
      const option = this.createElement('option', {
        textContent: cat.label,
        attributes: { value: cat.value },
      }) as HTMLOptionElement;
      if (cat.value === this.colorCategory) {
        option.selected = true;
      }
      this.mobileCategorySelect.appendChild(option);
    }

    this.mobileCategorySelect.addEventListener('change', () => {
      this.colorCategory = this.mobileCategorySelect!.value as ColorCategory;
      StorageService.setItem(STORAGE_KEYS.colorCategory, this.colorCategory);
      this.syncDesktopSelectors();
      this.loadColors();
      this.updateColorGrid();
      this.clearSelection();
    });

    section.appendChild(this.mobileCategorySelect);
    container.appendChild(section);
  }

  // ============================================================================
  // Data Loading & Matching
  // ============================================================================

  /**
   * Load colors based on current category/race/gender
   */
  private loadColors(): void {
    if (RACE_SPECIFIC_CATEGORIES.includes(this.colorCategory)) {
      if (this.colorCategory === 'hairColors') {
        this.colors = this.characterColorService.getHairColors(this.subrace, this.gender);
      } else if (this.colorCategory === 'skinColors') {
        this.colors = this.characterColorService.getSkinColors(this.subrace, this.gender);
      }
    } else {
      // Shared colors
      switch (this.colorCategory) {
        case 'eyeColors':
          this.colors = this.characterColorService.getEyeColors();
          break;
        case 'highlightColors':
          this.colors = this.characterColorService.getHighlightColors();
          break;
        case 'lipColorsDark':
          this.colors = this.characterColorService.getLipColorsDark();
          break;
        case 'lipColorsLight':
          this.colors = this.characterColorService.getLipColorsLight();
          break;
        case 'tattooColors':
          this.colors = this.characterColorService.getTattooColors();
          break;
        case 'facePaintColorsDark':
          this.colors = this.characterColorService.getFacePaintColorsDark();
          break;
        case 'facePaintColorsLight':
          this.colors = this.characterColorService.getFacePaintColorsLight();
          break;
      }
    }

    logger.info(`[CharacterTool] Loaded ${this.colors.length} colors for ${this.colorCategory}`);
  }

  /**
   * Select a color and find matching dyes
   */
  private selectColor(color: CharacterColor): void {
    this.selectedColor = color;
    StorageService.setItem(STORAGE_KEYS.selectedColorIndex, color.index);

    // Highlight selected swatch
    this.updateSwatchSelection();
    this.updateSelectedColorDisplay();
    this.findMatchingDyes();
  }

  /**
   * Update swatch selection highlighting
   */
  private updateSwatchSelection(): void {
    if (!this.colorGridContainer) return;

    const swatches = this.colorGridContainer.querySelectorAll('button');
    swatches.forEach((swatch) => {
      const index = parseInt(swatch.getAttribute('data-index') || '-1', 10);
      if (index === this.selectedColor?.index) {
        swatch.style.outline = '3px solid var(--theme-primary)';
        swatch.style.outlineOffset = '2px';
        swatch.style.zIndex = '10';
      } else {
        swatch.style.outline = 'none';
        swatch.style.outlineOffset = '0';
        swatch.style.zIndex = 'auto';
      }
    });
  }

  /**
   * Find dyes matching the selected color
   */
  private findMatchingDyes(): void {
    if (!this.selectedColor) {
      this.matchedDyes = [];
      this.updateMatchResults();
      return;
    }

    this.matchedDyes = this.characterColorService.findClosestDyes(
      this.selectedColor,
      dyeService,
      this.maxResults
    );

    logger.info(`[CharacterTool] Found ${this.matchedDyes.length} matching dyes`);
    this.updateMatchResults();

    // Fetch prices if enabled
    if (this.showPrices && this.matchedDyes.length > 0) {
      this.fetchPrices(this.matchedDyes.map((m) => m.dye));
    }
  }

  /**
   * Fetch prices for matched dyes
   */
  private async fetchPrices(dyes: Dye[]): Promise<void> {
    const marketBoard = this.marketBoard || this.mobileMarketBoard;
    if (!marketBoard) return;

    try {
      const prices = await marketBoard.fetchPricesForDyes(dyes);
      prices.forEach((data, itemId) => {
        this.priceData.set(itemId, data);
      });
      this.updateMatchResults();
    } catch (error) {
      logger.warn('[CharacterTool] Error fetching prices:', error);
    }
  }

  /**
   * Clear the current selection
   */
  private clearSelection(): void {
    this.selectedColor = null;
    this.matchedDyes = [];
    this.updateSelectedColorDisplay();
    this.updateMatchResults();
  }

  // ============================================================================
  // Sync Helpers
  // ============================================================================

  /**
   * Sync mobile selectors with desktop values
   */
  private syncMobileSelectors(): void {
    if (this.mobileSubraceSelect) {
      this.mobileSubraceSelect.value = this.subrace;
    }
    if (this.mobileGenderSelect) {
      this.mobileGenderSelect.value = this.gender;
    }
    if (this.mobileCategorySelect) {
      this.mobileCategorySelect.value = this.colorCategory;
    }
  }

  /**
   * Sync desktop selectors with mobile values
   */
  private syncDesktopSelectors(): void {
    if (this.subraceSelect) {
      this.subraceSelect.value = this.subrace;
    }
    if (this.genderSelect) {
      this.genderSelect.value = this.gender;
    }
    if (this.categorySelect) {
      this.categorySelect.value = this.colorCategory;
    }
  }

  /**
   * Get localized category display name
   */
  private getCategoryDisplayName(category: ColorCategory): string {
    const key = `tools.character.${category.replace(/Colors?$/, 'Colors')}`;
    const labels: Record<ColorCategory, string> = {
      eyeColors: LanguageService.t('tools.character.eyeColors') || 'Eye Colors',
      hairColors: LanguageService.t('tools.character.hairColors') || 'Hair Colors',
      skinColors: LanguageService.t('tools.character.skinColors') || 'Skin Colors',
      highlightColors: LanguageService.t('tools.character.highlightColors') || 'Highlight Colors',
      lipColorsDark: LanguageService.t('tools.character.lipColorsDark') || 'Lip Colors (Dark)',
      lipColorsLight: LanguageService.t('tools.character.lipColorsLight') || 'Lip Colors (Light)',
      tattooColors: LanguageService.t('tools.character.tattooColors') || 'Tattoo/Limbal Colors',
      facePaintColorsDark:
        LanguageService.t('tools.character.facePaintDark') || 'Face Paint (Dark)',
      facePaintColorsLight:
        LanguageService.t('tools.character.facePaintLight') || 'Face Paint (Light)',
    };
    return labels[category];
  }
}
