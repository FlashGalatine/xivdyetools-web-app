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
  dyeService,
  LanguageService,
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

  // State
  private subrace: SubRace;
  private gender: Gender;
  private colorCategory: ColorCategory;
  private selectedColor: CharacterColor | null = null;
  private matchedDyes: CharacterColorMatch[] = [];
  private colors: CharacterColor[] = [];
  private priceData: Map<number, PriceData> = new Map();
  private showPrices: boolean = false;

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
  private resultsPanelMediaQueryCleanup: (() => void) | null = null;

  constructor(container: HTMLElement, options: SwatchToolOptions) {
    super(container);
    this.options = options;
    this.characterColorService = new CharacterColorService();

    // Load persisted settings
    this.subrace = StorageService.getItem<SubRace>(STORAGE_KEYS.subrace) ?? DEFAULTS.subrace;
    this.gender = StorageService.getItem<Gender>(STORAGE_KEYS.gender) ?? DEFAULTS.gender;
    this.colorCategory = StorageService.getItem<ColorCategory>(STORAGE_KEYS.colorCategory) ?? DEFAULTS.colorCategory;

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

    logger.info('[CharacterTool] Mounted');
  }

  destroy(): void {
    this.languageUnsubscribe?.();
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
        this.fetchPrices(this.matchedDyes.map(m => m.dye));
      } else {
        this.updateMatchResults();
      }
    }) as EventListener);

    marketContent.addEventListener('categories-changed', () => {
      if (this.showPrices && this.matchedDyes.length > 0) {
        this.fetchPrices(this.matchedDyes.map(m => m.dye));
      }
    });

    marketContent.addEventListener('refresh-requested', () => {
      if (this.showPrices && this.matchedDyes.length > 0) {
        this.priceData.clear();
        this.fetchPrices(this.matchedDyes.map(m => m.dye));
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
      { value: 'hairColors', label: LanguageService.t('tools.character.hairColors') || 'Hair Colors' },
      { value: 'skinColors', label: LanguageService.t('tools.character.skinColors') || 'Skin Colors' },
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
      const genderGroup = this.subraceSelect?.parentElement?.nextElementSibling as HTMLElement | null;
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
  // Right Panel Rendering
  // ============================================================================

  private renderRightPanel(): void {
    const right = this.options.rightPanel;
    clearContainer(right);

    // Sticky results panel at TOP (two-column layout: Selected Color | Matching Dyes)
    // The parent has p-4 (1rem) on mobile and p-6 (1.5rem) on desktop.
    // We use negative margins to extend edge-to-edge and negative top to stick to the visual top.
    const resultsPanel = this.createElement('div', {
      className: 'border-b',
      attributes: {
        style: 'background: var(--theme-card-background); border-color: var(--theme-border);',
      },
    });

    // On larger screens (md+), adjust margins/padding for p-6
    // For sticky to work inside an overflow-y-auto container:
    // - Use negative margins to extend edge-to-edge (cancel parent padding)
    // - Use margin-top: -padding to pull element to the container's edge
    // - Use top: 0 so the element sticks at the container's scroll viewport top
    // On mobile: page-level scrolling is used, so we don't use sticky (it would need
    // to account for the header height which varies). Instead, let it scroll naturally.
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const updateResultsPanelSpacing = () => {
      if (mediaQuery.matches) {
        // Desktop: parent has p-6 (1.5rem), internal scrolling in rightPanelContent
        resultsPanel.style.cssText = `
          position: -webkit-sticky;
          position: sticky;
          top: 0;
          z-index: 10;
          background: var(--theme-card-background);
          border-color: var(--theme-border);
          margin: -1.5rem -1.5rem 0 -1.5rem;
          padding: 1.5rem;
          padding-bottom: 1rem;
        `;
      } else {
        // Mobile: page-level scrolling, no sticky (would conflict with sticky header)
        // Just style it as a regular panel with negative margins for edge-to-edge look
        resultsPanel.style.cssText = `
          position: relative;
          z-index: 10;
          background: var(--theme-card-background);
          border-color: var(--theme-border);
          margin: -1rem -1rem 0 -1rem;
          padding: 1rem;
          padding-bottom: 0.75rem;
        `;
      }
    };
    updateResultsPanelSpacing();
    mediaQuery.addEventListener('change', updateResultsPanelSpacing);

    // Store the cleanup function
    this.resultsPanelMediaQueryCleanup = () => {
      mediaQuery.removeEventListener('change', updateResultsPanelSpacing);
    };

    // Two-column grid layout
    const resultsGrid = this.createElement('div', {
      className: 'grid gap-4',
      attributes: {
        style: 'grid-template-columns: 1fr 1fr;',
      },
    });

    // Left column: Selected color display
    this.selectedColorDisplay = this.createElement('div');
    resultsGrid.appendChild(this.selectedColorDisplay);

    // Right column: Matched dyes section
    const matchSection = this.createElement('div', { className: 'space-y-2' });
    const matchLabel = this.createElement('h3', {
      className: 'text-sm font-semibold uppercase tracking-wider mb-2',
      textContent: LanguageService.t('tools.character.matchingDyes') || 'Matching Dyes',
      attributes: { style: 'color: var(--theme-text-muted);' },
    });
    matchSection.appendChild(matchLabel);

    this.matchResultsContainer = this.createElement('div', {
      className: 'space-y-2',
    });
    matchSection.appendChild(this.matchResultsContainer);
    resultsGrid.appendChild(matchSection);

    // Empty state (shown in match results when no color selected)
    this.emptyStateContainer = this.createElement('div', {
      className: 'text-center py-4',
      attributes: { style: 'color: var(--theme-text-muted); font-size: 0.875rem;' },
    });
    this.emptyStateContainer.textContent =
      LanguageService.t('tools.character.noColorSelected') ||
      'Select a color from the grid to find matching dyes';
    this.matchResultsContainer.appendChild(this.emptyStateContainer);

    resultsPanel.appendChild(resultsGrid);
    right.appendChild(resultsPanel);

    // Color grid section (scrolls naturally with the page)
    // Parent already provides padding, so we just need top spacing after the sticky panel
    const gridSection = this.createElement('div', { className: 'space-y-3 pt-4' });
    const gridLabel = this.createElement('h3', {
      className: 'text-sm font-semibold uppercase tracking-wider',
      textContent: this.getCategoryDisplayName(this.colorCategory),
      attributes: { style: 'color: var(--theme-text-muted);' },
    });
    gridSection.appendChild(gridLabel);

    this.colorGridContainer = this.createElement('div', {
      className: 'grid gap-1',
      attributes: {
        style: 'grid-template-columns: repeat(8, 1fr);',
      },
    });
    gridSection.appendChild(this.colorGridContainer);
    right.appendChild(gridSection);

    // Update the selected color display and render color grid
    this.updateSelectedColorDisplay();
    this.updateColorGrid();
  }

  /**
   * Update the color grid
   */
  private updateColorGrid(): void {
    if (!this.colorGridContainer) return;
    clearContainer(this.colorGridContainer);

    // Update the label
    const label = this.colorGridContainer.previousElementSibling as HTMLElement;
    if (label) {
      label.textContent = this.getCategoryDisplayName(this.colorCategory);
    }

    for (const color of this.colors) {
      const swatch = this.createElement('button', {
        className:
          'aspect-square rounded-sm cursor-pointer transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1',
        attributes: {
          style: `background-color: ${color.hex}; border: 1px solid var(--theme-border);`,
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
   * Update selected color display
   */
  private updateSelectedColorDisplay(): void {
    if (!this.selectedColorDisplay) return;
    clearContainer(this.selectedColorDisplay);

    // Header for selected color section
    const header = this.createElement('h3', {
      className: 'text-sm font-semibold uppercase tracking-wider mb-2',
      textContent: LanguageService.t('tools.character.selectedColor') || 'Selected Color',
      attributes: { style: 'color: var(--theme-text-muted);' },
    });
    this.selectedColorDisplay.appendChild(header);

    if (!this.selectedColor) {
      // Empty state for left column
      const emptyState = this.createElement('div', {
        className: 'flex items-center gap-3 p-3 rounded-lg',
        attributes: {
          style: 'background: var(--theme-input-background); border: 1px dashed var(--theme-border);',
        },
      });
      const placeholder = this.createElement('div', {
        className: 'w-12 h-12 rounded-lg flex-shrink-0',
        attributes: {
          style: 'background: var(--theme-border); border: 1px dashed var(--theme-text-muted);',
        },
      });
      emptyState.appendChild(placeholder);
      const text = this.createElement('p', {
        className: 'text-sm',
        textContent: LanguageService.t('tools.character.clickToSelect') || 'Click a color below',
        attributes: { style: 'color: var(--theme-text-muted);' },
      });
      emptyState.appendChild(text);
      this.selectedColorDisplay.appendChild(emptyState);
      return;
    }

    const card = this.createElement('div', {
      className: 'flex items-start gap-3 p-3 rounded-lg',
      attributes: {
        style: 'background: var(--theme-card-background); border: 1px solid var(--theme-border);',
      },
    });

    // Color swatch
    const swatch = this.createElement('div', {
      className: 'w-12 h-12 rounded-lg flex-shrink-0',
      attributes: {
        style: `background-color: ${this.selectedColor.hex}; border: 2px solid var(--theme-border);`,
      },
    });
    card.appendChild(swatch);

    // Color info (compact)
    const info = this.createElement('div', { className: 'flex-1 min-w-0' });

    // Calculate grid position (8 columns per row, 1-indexed)
    const gridRow = Math.floor(this.selectedColor.index / 8) + 1;
    const gridCol = (this.selectedColor.index % 8) + 1;

    // Calculate HSV values
    const hsv = ColorService.rgbToHsv(
      this.selectedColor.rgb.r,
      this.selectedColor.rgb.g,
      this.selectedColor.rgb.b
    );

    // Index and Grid Position
    const indexLabel = LanguageService.t('tools.character.colorIndex') || 'Index';
    const indexRow = this.createElement('p', {
      className: 'text-sm font-medium',
      attributes: { style: 'color: var(--theme-text);' },
    });
    indexRow.appendChild(document.createTextNode(`${indexLabel}: `));
    const indexValue = this.createElement('span', {
      className: 'number',
      textContent: String(this.selectedColor.index),
    });
    indexRow.appendChild(indexValue);
    indexRow.appendChild(document.createTextNode(` (R`));
    const rowValue = this.createElement('span', {
      className: 'number',
      textContent: String(gridRow),
    });
    indexRow.appendChild(rowValue);
    indexRow.appendChild(document.createTextNode(`, C`));
    const colValue = this.createElement('span', {
      className: 'number',
      textContent: String(gridCol),
    });
    indexRow.appendChild(colValue);
    indexRow.appendChild(document.createTextNode(`)`));
    info.appendChild(indexRow);

    // Hex value
    const hex = this.createElement('p', {
      className: 'text-sm font-mono number',
      textContent: this.selectedColor.hex.toUpperCase(),
      attributes: { style: 'color: var(--theme-text-muted);' },
    });
    info.appendChild(hex);

    // RGB values
    const rgb = this.createElement('p', {
      className: 'text-xs',
      attributes: { style: 'color: var(--theme-text-muted);' },
    });
    rgb.appendChild(document.createTextNode('RGB('));
    const rValue = this.createElement('span', { className: 'number', textContent: String(this.selectedColor.rgb.r) });
    rgb.appendChild(rValue);
    rgb.appendChild(document.createTextNode(', '));
    const gValue = this.createElement('span', { className: 'number', textContent: String(this.selectedColor.rgb.g) });
    rgb.appendChild(gValue);
    rgb.appendChild(document.createTextNode(', '));
    const bValue = this.createElement('span', { className: 'number', textContent: String(this.selectedColor.rgb.b) });
    rgb.appendChild(bValue);
    rgb.appendChild(document.createTextNode(')'));
    info.appendChild(rgb);

    // HSV values
    const hsvRow = this.createElement('p', {
      className: 'text-xs',
      attributes: { style: 'color: var(--theme-text-muted);' },
    });
    hsvRow.appendChild(document.createTextNode('HSV('));
    const hValue = this.createElement('span', { className: 'number', textContent: String(Math.round(hsv.h)) });
    hsvRow.appendChild(hValue);
    hsvRow.appendChild(document.createTextNode('°, '));
    const sValue = this.createElement('span', { className: 'number', textContent: String(Math.round(hsv.s)) });
    hsvRow.appendChild(sValue);
    hsvRow.appendChild(document.createTextNode('%, '));
    const vValue = this.createElement('span', { className: 'number', textContent: String(Math.round(hsv.v)) });
    hsvRow.appendChild(vValue);
    hsvRow.appendChild(document.createTextNode('%)'));
    info.appendChild(hsvRow);

    card.appendChild(info);

    // Copy button
    const copyBtn = this.createElement('button', {
      className: 'p-1.5 rounded hover:opacity-80 transition-opacity flex-shrink-0',
      attributes: {
        style: 'background: var(--theme-input-background); color: var(--theme-text-muted);',
        title: LanguageService.t('actions.copyToClipboard') || 'Copy to clipboard',
        'aria-label': LanguageService.t('actions.copyToClipboard') || 'Copy to clipboard',
      },
    });
    copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
    copyBtn.addEventListener('click', () => this.copySelectedColorInfo());
    card.appendChild(copyBtn);

    this.selectedColorDisplay.appendChild(card);
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

    const info = [
      `Index: ${this.selectedColor.index} (R${gridRow}, C${gridCol})`,
      `Hex: ${this.selectedColor.hex.toUpperCase()}`,
      `RGB: ${this.selectedColor.rgb.r}, ${this.selectedColor.rgb.g}, ${this.selectedColor.rgb.b}`,
      `HSV: ${Math.round(hsv.h)}°, ${Math.round(hsv.s)}%, ${Math.round(hsv.v)}%`,
    ].join('\n');

    navigator.clipboard.writeText(info).then(() => {
      ToastService.success(LanguageService.t('actions.copiedToClipboard') || 'Copied to clipboard');
    }).catch(() => {
      ToastService.error(LanguageService.t('actions.copyFailed') || 'Failed to copy');
    });
  }

  /**
   * Update match results display
   */
  private updateMatchResults(): void {
    if (!this.matchResultsContainer) return;
    clearContainer(this.matchResultsContainer);

    if (this.matchedDyes.length === 0) {
      this.matchResultsContainer.appendChild(this.emptyStateContainer!);
      return;
    }

    for (const match of this.matchedDyes) {
      const card = this.renderDyeMatchCard(match);
      this.matchResultsContainer.appendChild(card);
    }
  }

  /**
   * Render a dye match card (compact version for two-column layout)
   */
  private renderDyeMatchCard(match: CharacterColorMatch): HTMLElement {
    const card = this.createElement('div', {
      className: 'flex items-center gap-2 p-2 rounded-lg hover:opacity-90 transition-opacity',
      attributes: {
        style: 'background: var(--theme-card-background); border: 1px solid var(--theme-border);',
      },
    });

    // Dye color swatch (smaller)
    const swatch = this.createElement('div', {
      className: 'w-8 h-8 rounded flex-shrink-0',
      attributes: {
        style: `background-color: ${match.dye.hex}; border: 1px solid var(--theme-border);`,
      },
    });
    card.appendChild(swatch);

    // Dye info (compact)
    const info = this.createElement('div', { className: 'flex-1 min-w-0' });
    const name = this.createElement('p', {
      className: 'text-sm font-medium truncate',
      textContent: LanguageService.getDyeName(match.dye.itemID) || match.dye.name,
      attributes: { style: 'color: var(--theme-text);' },
    });
    info.appendChild(name);

    // Category and distance with Habibi font for numbers
    const details = this.createElement('p', {
      className: 'text-xs truncate',
      attributes: { style: 'color: var(--theme-text-muted);' },
    });
    details.appendChild(document.createTextNode(`${match.dye.category} • Δ`));
    const distanceValue = this.createElement('span', {
      className: 'number',
      textContent: match.distance.toFixed(1),
    });
    details.appendChild(distanceValue);
    info.appendChild(details);

    // Price display (if available)
    const priceData = this.priceData.get(match.dye.itemID);
    if (this.showPrices && priceData && priceData.currentMinPrice > 0) {
      const priceRow = this.createElement('p', {
        className: 'text-xs',
        attributes: { style: 'color: var(--theme-text-muted);' },
      });
      const priceValue = this.createElement('span', {
        className: 'number',
        textContent: `${MarketBoard.formatPrice(priceData.currentMinPrice)} gil`,
      });
      priceRow.appendChild(priceValue);
      info.appendChild(priceRow);
    }

    card.appendChild(info);

    // Action dropdown
    const actions = this.createElement('div', { className: 'flex-shrink-0' });
    const dropdown = createDyeActionDropdown(match.dye);
    actions.appendChild(dropdown);
    card.appendChild(actions);

    return card;
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
        this.fetchPrices(this.matchedDyes.map(m => m.dye));
      } else {
        this.updateMatchResults();
      }
    }) as EventListener);

    mobileMarketContent.addEventListener('categories-changed', () => {
      if (this.showPrices && this.matchedDyes.length > 0) {
        this.fetchPrices(this.matchedDyes.map(m => m.dye));
      }
    });

    mobileMarketContent.addEventListener('refresh-requested', () => {
      if (this.showPrices && this.matchedDyes.length > 0) {
        this.priceData.clear();
        this.fetchPrices(this.matchedDyes.map(m => m.dye));
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
      { value: 'hairColors', label: LanguageService.t('tools.character.hairColors') || 'Hair Colors' },
      { value: 'skinColors', label: LanguageService.t('tools.character.skinColors') || 'Skin Colors' },
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
      DEFAULTS.matchCount
    );

    logger.info(`[CharacterTool] Found ${this.matchedDyes.length} matching dyes`);
    this.updateMatchResults();

    // Fetch prices if enabled
    if (this.showPrices && this.matchedDyes.length > 0) {
      this.fetchPrices(this.matchedDyes.map(m => m.dye));
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
      facePaintColorsDark: LanguageService.t('tools.character.facePaintDark') || 'Face Paint (Dark)',
      facePaintColorsLight: LanguageService.t('tools.character.facePaintLight') || 'Face Paint (Light)',
    };
    return labels[category];
  }
}
