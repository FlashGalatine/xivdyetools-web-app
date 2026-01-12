/**
 * XIV Dye Tools v4.0.0 - Extractor Tool Component (Palette Extractor)
 *
 * V4 Renamed: matcher-tool.ts → extractor-tool.ts
 * Extracts color palettes from uploaded images and finds matching FFXIV dyes.
 *
 * Left Panel: Image upload, color picker, sample settings, filters, market board
 * Right Panel: Image canvas with zoom, matched dye results, recent colors
 *
 * @module components/tools/extractor-tool
 */

import { BaseComponent } from '@components/base-component';
import { CollapsiblePanel } from '@components/collapsible-panel';
import { ImageUploadDisplay } from '@components/image-upload-display';
import { ColorPickerDisplay } from '@components/color-picker-display';
import { ImageZoomController } from '@components/image-zoom-controller';
import { RecentColorsPanel } from '@components/recent-colors-panel';
import { DyeFilters, type DyeFilterConfig } from '@components/dye-filters';
import { MarketBoard } from '@components/market-board';
import { DyeCardRenderer } from '@components/dye-card-renderer';
import { createDyeActionDropdown } from '@components/dye-action-dropdown';
import {
  ColorService,
  ConfigController,
  dyeService,
  LanguageService,
  RouterService,
  StorageService,
  ToastService,
} from '@services/index';
import {
  ICON_FILTER,
  ICON_MARKET,
  ICON_IMAGE,
  ICON_PALETTE,
  ICON_SETTINGS,
  ICON_COINS,
} from '@shared/ui-icons';
import { logger } from '@shared/logger';
import { clearContainer } from '@shared/utils';
import type { Dye, DyeWithDistance, PriceData } from '@shared/types';
import type { ExtractorConfig } from '@shared/tool-config-types';
import { PaletteService, type PaletteMatch } from '@xivdyetools/core';

// ============================================================================
// Types and Constants
// ============================================================================

export interface ExtractorToolOptions {
  leftPanel: HTMLElement;
  rightPanel: HTMLElement;
  drawerContent?: HTMLElement | null;
}

/**
 * Storage keys for v3 matcher tool
 */
const STORAGE_KEYS = {
  sampleSize: 'v3_matcher_sample_size',
  paletteMode: 'v3_matcher_palette_mode',
  paletteColorCount: 'v3_matcher_palette_count',
  vibrancyBoost: 'v3_matcher_vibrancy_boost',
  imageDataUrl: 'v3_matcher_image',
  selectedColor: 'v3_matcher_color',
} as const;

// Maximum image size to store in localStorage (2MB to be safe)
const MAX_IMAGE_STORAGE_SIZE = 2 * 1024 * 1024;

// Alias for backward compatibility
const ICON_UPLOAD = ICON_IMAGE;

// ============================================================================
// MatcherTool Component
// ============================================================================

/**
 * Matcher Tool - v3 Two-Panel Layout
 *
 * Match colors from images to FFXIV dyes.
 * Integrates existing v2 components into the new panel structure.
 */
export class ExtractorTool extends BaseComponent {
  private options: ExtractorToolOptions;

  // State
  private selectedColor: string | null = null;
  private sampleSize: number;
  private paletteMode: boolean;
  private paletteColorCount: number = 4;
  private vibrancyBoost: boolean = true;
  private matchedDyes: DyeWithDistance[] = [];
  private showPrices: boolean = false;
  private priceData: Map<number, PriceData> = new Map();
  private filterConfig: DyeFilterConfig | null = null;
  private currentImage: HTMLImageElement | null = null;
  private currentImageDataUrl: string | null = null;

  // Child components
  private imageUpload: ImageUploadDisplay | null = null;
  private colorPicker: ColorPickerDisplay | null = null;
  private imageZoom: ImageZoomController | null = null;
  private recentColors: RecentColorsPanel | null = null;
  private dyeFilters: DyeFilters | null = null;
  private marketBoard: MarketBoard | null = null;
  private filtersPanel: CollapsiblePanel | null = null;
  private marketPanel: CollapsiblePanel | null = null;
  private paletteService: PaletteService;

  // Collapsible section panels
  private imageSourcePanel: CollapsiblePanel | null = null;
  private colorSelectionPanel: CollapsiblePanel | null = null;
  private optionsPanel: CollapsiblePanel | null = null;

  // DOM References
  private sampleSlider: HTMLInputElement | null = null;
  private sampleDisplay: HTMLElement | null = null;
  private paletteModeCheckbox: HTMLInputElement | null = null;
  private paletteOptionsContainer: HTMLElement | null = null;
  private colorCountSlider: HTMLInputElement | null = null;
  private colorCountDisplay: HTMLElement | null = null;
  private extractPaletteBtn: HTMLButtonElement | null = null;
  private resultsContainer: HTMLElement | null = null;
  private canvasContainer: HTMLElement | null = null;
  private emptyStateContainer: HTMLElement | null = null;

  // Mobile-specific DOM References (separate from desktop to avoid conflicts)
  private mobileSampleSlider: HTMLInputElement | null = null;
  private mobileSampleDisplay: HTMLElement | null = null;
  private mobilePaletteModeCheckbox: HTMLInputElement | null = null;
  private mobilePaletteOptionsContainer: HTMLElement | null = null;
  private mobileColorCountSlider: HTMLInputElement | null = null;
  private mobileColorCountDisplay: HTMLElement | null = null;
  private mobileExtractPaletteBtn: HTMLButtonElement | null = null;
  private mobileDyeFilters: DyeFilters | null = null;
  private mobileImageUpload: ImageUploadDisplay | null = null;
  private mobileColorPicker: ColorPickerDisplay | null = null;
  private mobileMarketBoard: MarketBoard | null = null;
  private mobileImageSourceExpanded: boolean = true;
  private mobileColorSelectionExpanded: boolean = true;
  private mobileOptionsExpanded: boolean = false;
  private mobileFiltersExpanded: boolean = false;
  private mobileMarketExpanded: boolean = false;

  // Palette extraction state
  private lastPaletteResults: PaletteMatch[] = [];

  // Subscriptions
  private languageUnsubscribe: (() => void) | null = null;
  private configUnsubscribe: (() => void) | null = null;

  constructor(container: HTMLElement, options: ExtractorToolOptions) {
    super(container);
    this.options = options;

    // Load persisted state
    this.sampleSize = StorageService.getItem<number>(STORAGE_KEYS.sampleSize) ?? 5;
    this.paletteMode = StorageService.getItem<boolean>(STORAGE_KEYS.paletteMode) ?? false;
    this.paletteColorCount = StorageService.getItem<number>(STORAGE_KEYS.paletteColorCount) ?? 4;
    this.vibrancyBoost = StorageService.getItem<boolean>(STORAGE_KEYS.vibrancyBoost) ?? true;

    // Initialize palette service
    this.paletteService = new PaletteService();
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
    // FIX: Events from child components bubble through leftPanel, not this.container
    // The container is a detached div, so we must listen on the actual panel elements
    const leftPanel = this.options.leftPanel;

    // Image upload events - listen on leftPanel where ImageUploadDisplay is rendered
    this.onPanelEvent(leftPanel, 'image-loaded', (event: CustomEvent) => {
      const { image, dataUrl } = event.detail;
      this.currentImage = image;
      this.currentImageDataUrl = dataUrl;

      // Persist image to storage if it's small enough
      if (dataUrl && dataUrl.length < MAX_IMAGE_STORAGE_SIZE) {
        StorageService.setItem(STORAGE_KEYS.imageDataUrl, dataUrl);
        logger.info('[MatcherTool] Image saved to storage');
      } else if (dataUrl) {
        // Clear any previously stored image if new one is too large
        StorageService.removeItem(STORAGE_KEYS.imageDataUrl);
        logger.info('[MatcherTool] Image too large to persist, cleared storage');
      }

      ToastService.success(LanguageService.t('matcher.imageLoaded') || 'Image loaded');

      if (this.imageZoom) {
        this.imageZoom.setImage(image);
      }

      this.showEmptyState(false);
      this.updateDrawerContent();
    });

    this.onPanelEvent(leftPanel, 'error', (event: CustomEvent) => {
      const message = event.detail?.message || 'Failed to load image';
      logger.error('[MatcherTool] Image upload error:', event.detail);
      ToastService.error(message);
    });

    // Color picker events
    this.onPanelEvent(leftPanel, 'color-selected', (event: CustomEvent) => {
      const { color } = event.detail;
      this.matchColor(color);
    });

    // Market board events
    this.onPanelEvent(leftPanel, 'showPricesChanged', (event: CustomEvent) => {
      this.showPrices = event.detail.showPrices;
      if (this.showPrices) {
        // Fetch prices when enabled
        void this.fetchPricesForMatches();
      } else {
        // Clear prices when disabled and re-render
        this.priceData.clear();
        if (this.lastPaletteResults.length > 0) {
          this.renderPaletteResults(this.lastPaletteResults);
        } else {
          this.renderMatchedResults();
        }
      }
    });

    // Re-fetch prices when server changes
    this.onPanelEvent(leftPanel, 'server-changed', () => {
      if (this.showPrices) {
        void this.fetchPricesForMatches();
      }
    });

    // Re-fetch prices when category filters change
    this.onPanelEvent(leftPanel, 'categories-changed', () => {
      if (this.showPrices) {
        void this.fetchPricesForMatches();
      }
    });

    // Re-fetch prices when refresh button is clicked
    this.onPanelEvent(leftPanel, 'refresh-requested', () => {
      if (this.showPrices) {
        void this.fetchPricesForMatches();
      }
    });
  }

  /**
   * Listen for custom events on a specific panel element
   * This is needed because child components emit events that bubble through their
   * panel containers, not through this.container (which may be detached from DOM)
   */
  private onPanelEvent(
    panel: HTMLElement,
    eventName: string,
    handler: (event: CustomEvent) => void
  ): void {
    const boundHandler = (event: Event) => {
      if (event instanceof CustomEvent) {
        handler.call(this, event);
      }
    };

    panel.addEventListener(eventName, boundHandler);

    // Track for cleanup using unique key
    const listenerKey = `panel_${eventName}_${Date.now()}_${this.listeners.size}`;
    this.listeners.set(listenerKey, {
      target: panel,
      event: eventName,
      handler: boundHandler,
    });
  }

  onMount(): void {
    // Subscribe to language changes (only in onMount, NOT bindEvents - avoids infinite loop)
    this.languageUnsubscribe = LanguageService.subscribe(() => {
      this.update();
    });

    // Subscribe to config changes from V4 ConfigSidebar
    this.configUnsubscribe = ConfigController.getInstance().subscribe('extractor', (config) => {
      this.setConfig(config);
    });

    // Restore saved image from storage
    const savedImageDataUrl = StorageService.getItem<string>(STORAGE_KEYS.imageDataUrl);
    if (savedImageDataUrl) {
      this.restoreSavedImage(savedImageDataUrl);
    }

    // Restore saved color from storage
    const savedColor = StorageService.getItem<string>(STORAGE_KEYS.selectedColor);
    if (savedColor) {
      // Use safeTimeout to ensure components are fully initialized
      this.safeTimeout(() => {
        this.matchColor(savedColor);
        logger.info('[MatcherTool] Restored saved color:', savedColor);
      }, 100);
    }

    logger.info('[MatcherTool] Mounted');
  }

  /**
   * Restore a saved image from storage
   */
  private restoreSavedImage(dataUrl: string): void {
    const img = new Image();

    img.onload = () => {
      this.currentImage = img;
      this.currentImageDataUrl = dataUrl;

      if (this.imageZoom) {
        this.imageZoom.setImage(img);
      }

      this.showEmptyState(false);
      this.updateDrawerContent();

      logger.info('[MatcherTool] Restored saved image from storage');

      // Clear handlers
      img.onload = null;
      img.onerror = null;
    };

    img.onerror = () => {
      // Failed to load saved image, clear it from storage
      StorageService.removeItem(STORAGE_KEYS.imageDataUrl);
      logger.warn('[MatcherTool] Failed to restore saved image, cleared storage');
      img.onload = null;
      img.onerror = null;
    };

    img.src = dataUrl;
  }

  destroy(): void {
    // Cleanup subscriptions
    this.languageUnsubscribe?.();
    this.configUnsubscribe?.();

    // Cleanup child components
    this.imageUpload?.destroy();
    this.colorPicker?.destroy();
    this.imageZoom?.destroy();
    this.recentColors?.destroy();
    this.dyeFilters?.destroy();
    this.marketBoard?.destroy();
    this.filtersPanel?.destroy();
    this.marketPanel?.destroy();

    // Cleanup collapsible section panels
    this.imageSourcePanel?.destroy();
    this.colorSelectionPanel?.destroy();
    this.optionsPanel?.destroy();

    // Cleanup mobile components
    this.mobileDyeFilters?.destroy();
    this.mobileImageUpload?.destroy();
    this.mobileColorPicker?.destroy();
    this.mobileMarketBoard?.destroy();

    super.destroy();
    logger.info('[MatcherTool] Destroyed');
  }

  // ============================================================================
  // V4 Integration
  // ============================================================================

  /**
   * Update tool configuration from external source (V4 ConfigSidebar)
   */
  public setConfig(config: Partial<ExtractorConfig>): void {
    let needsReextract = false;

    // Handle vibrancyBoost
    if (config.vibrancyBoost !== undefined && config.vibrancyBoost !== this.vibrancyBoost) {
      this.vibrancyBoost = config.vibrancyBoost;
      StorageService.setItem(STORAGE_KEYS.vibrancyBoost, config.vibrancyBoost);
      needsReextract = true;
      logger.info(`[ExtractorTool] setConfig: vibrancyBoost -> ${config.vibrancyBoost}`);
    }

    // Handle maxColors (maps to paletteColorCount)
    if (config.maxColors !== undefined && config.maxColors !== this.paletteColorCount) {
      this.paletteColorCount = config.maxColors;
      StorageService.setItem(STORAGE_KEYS.paletteColorCount, config.maxColors);
      needsReextract = true;
      logger.info(`[ExtractorTool] setConfig: maxColors -> ${config.maxColors}`);

      // Update desktop display
      if (this.colorCountSlider) {
        this.colorCountSlider.value = String(config.maxColors);
      }
      if (this.colorCountDisplay) {
        this.colorCountDisplay.textContent = String(config.maxColors);
      }
      // Update mobile display
      if (this.mobileColorCountSlider) {
        this.mobileColorCountSlider.value = String(config.maxColors);
      }
      if (this.mobileColorCountDisplay) {
        this.mobileColorCountDisplay.textContent = String(config.maxColors);
      }
    }

    // Re-extract palette if config changed and we're in palette mode with an image
    if (needsReextract && this.paletteMode && this.currentImage) {
      void this.extractPalette();
    }
  }

  // ============================================================================
  // Left Panel Rendering
  // ============================================================================

  private renderLeftPanel(): void {
    const left = this.options.leftPanel;
    clearContainer(left);

    // Section 1: Image Upload (Collapsible, default open)
    const uploadContainer = this.createElement('div');
    left.appendChild(uploadContainer);
    this.imageSourcePanel = new CollapsiblePanel(uploadContainer, {
      title: LanguageService.t('matcher.imageSource') || 'Image Source',
      storageKey: 'matcher_imageSource',
      defaultOpen: true,
      icon: ICON_UPLOAD,
    });
    this.imageSourcePanel.init();
    const uploadContent = this.createElement('div');
    this.renderImageUpload(uploadContent);
    this.imageSourcePanel.setContent(uploadContent);

    // Section 2: Color Selection (Collapsible, default open)
    const colorContainer = this.createElement('div');
    left.appendChild(colorContainer);
    this.colorSelectionPanel = new CollapsiblePanel(colorContainer, {
      title: LanguageService.t('matcher.colorSelection') || 'Color Selection',
      storageKey: 'matcher_colorSelection',
      defaultOpen: true,
      icon: ICON_PALETTE,
    });
    this.colorSelectionPanel.init();
    const colorContent = this.createElement('div');
    this.renderColorPicker(colorContent);
    this.colorSelectionPanel.setContent(colorContent);

    // Section 3: Options (Collapsible, default closed)
    const optionsContainer = this.createElement('div');
    left.appendChild(optionsContainer);
    this.optionsPanel = new CollapsiblePanel(optionsContainer, {
      title: LanguageService.t('matcher.options') || 'Options',
      storageKey: 'matcher_options',
      defaultOpen: false,
      icon: ICON_SETTINGS,
    });
    this.optionsPanel.init();
    const optionsContent = this.createElement('div');
    this.renderOptions(optionsContent);
    this.optionsPanel.setContent(optionsContent);

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
   * Render image upload section
   */
  private renderImageUpload(container: HTMLElement): void {
    const uploadContainer = this.createElement('div');
    container.appendChild(uploadContainer);

    this.imageUpload = new ImageUploadDisplay(uploadContainer);
    this.imageUpload.init();
  }

  /**
   * Render color picker section
   */
  private renderColorPicker(container: HTMLElement): void {
    const pickerContainer = this.createElement('div');
    container.appendChild(pickerContainer);

    this.colorPicker = new ColorPickerDisplay(pickerContainer);
    this.colorPicker.init();
  }

  /**
   * Render options section (sample size, palette mode)
   */
  private renderOptions(container: HTMLElement): void {
    const optionsContainer = this.createElement('div', { className: 'space-y-4' });

    // Sample size slider
    const sampleGroup = this.createElement('div');
    const sampleLabel = this.createElement('label', {
      className: 'flex items-center justify-between text-sm mb-2',
    });
    sampleLabel.innerHTML = `
      <span style="color: var(--theme-text);">${LanguageService.t('matcher.sampleSize') || 'Sample Size'}</span>
      <span class="number" style="color: var(--theme-text-muted);">${this.sampleSize}px</span>
    `;
    this.sampleDisplay = sampleLabel.querySelector('span:last-child') as HTMLElement;

    this.sampleSlider = this.createElement('input', {
      attributes: { type: 'range', min: '1', max: '10', value: String(this.sampleSize) },
      className: 'w-full',
    }) as HTMLInputElement;

    this.on(this.sampleSlider, 'input', () => {
      if (this.sampleSlider && this.sampleDisplay) {
        this.sampleSize = parseInt(this.sampleSlider.value, 10);
        this.sampleDisplay.textContent = `${this.sampleSize}px`;
        StorageService.setItem(STORAGE_KEYS.sampleSize, this.sampleSize);
      }
    });

    sampleGroup.appendChild(sampleLabel);
    sampleGroup.appendChild(this.sampleSlider);
    optionsContainer.appendChild(sampleGroup);

    // Palette mode toggle
    const paletteToggle = this.createElement('label', {
      className: 'flex items-center gap-3 cursor-pointer',
    });

    this.paletteModeCheckbox = this.createElement('input', {
      attributes: { type: 'checkbox' },
      className: 'w-5 h-5 rounded',
    }) as HTMLInputElement;
    this.paletteModeCheckbox.checked = this.paletteMode;

    this.on(this.paletteModeCheckbox, 'change', () => {
      if (this.paletteModeCheckbox) {
        this.paletteMode = this.paletteModeCheckbox.checked;
        StorageService.setItem(STORAGE_KEYS.paletteMode, this.paletteMode);
        this.updatePaletteOptionsVisibility();
        this.updateDrawerContent();
      }
    });

    const toggleText = this.createElement('div');
    toggleText.innerHTML = `
      <p class="text-sm font-medium" style="color: var(--theme-text);">${LanguageService.t('matcher.extractPalette') || 'Extract Palette'}</p>
      <p class="text-xs" style="color: var(--theme-text-muted);">${LanguageService.t('matcher.extractPaletteDesc') || 'Get multiple colors from image'}</p>
    `;

    paletteToggle.appendChild(this.paletteModeCheckbox);
    paletteToggle.appendChild(toggleText);
    optionsContainer.appendChild(paletteToggle);

    // Palette options (color count slider + extract button) - shown when palette mode enabled
    this.paletteOptionsContainer = this.createElement('div', {
      className: 'space-y-3 pt-3 border-t',
      attributes: {
        id: 'palette-options-container',
        style: `border-color: var(--theme-border); ${this.paletteMode ? '' : 'display: none;'}`,
      },
    });

    // Color count slider
    const colorCountGroup = this.createElement('div');
    const colorCountLabel = this.createElement('label', {
      className: 'flex items-center justify-between text-sm mb-2',
    });
    colorCountLabel.innerHTML = `
      <span style="color: var(--theme-text);">${LanguageService.t('matcher.colorCount') || 'Colors to Extract'}</span>
      <span class="number font-bold" style="color: var(--theme-primary);">${this.paletteColorCount}</span>
    `;
    this.colorCountDisplay = colorCountLabel.querySelector('span:last-child') as HTMLElement;

    this.colorCountSlider = this.createElement('input', {
      attributes: { type: 'range', min: '3', max: '5', value: String(this.paletteColorCount) },
      className: 'w-full',
    }) as HTMLInputElement;

    this.on(this.colorCountSlider, 'input', () => {
      if (this.colorCountSlider && this.colorCountDisplay) {
        this.paletteColorCount = parseInt(this.colorCountSlider.value, 10);
        this.colorCountDisplay.textContent = String(this.paletteColorCount);
        StorageService.setItem(STORAGE_KEYS.paletteColorCount, this.paletteColorCount);
      }
    });

    colorCountGroup.appendChild(colorCountLabel);
    colorCountGroup.appendChild(this.colorCountSlider);
    this.paletteOptionsContainer.appendChild(colorCountGroup);

    // Extract palette button
    this.extractPaletteBtn = this.createElement('button', {
      className: 'w-full py-2 px-4 rounded-lg font-medium text-sm transition-colors',
      textContent: LanguageService.t('matcher.extractPaletteBtn') || 'Extract Palette from Image',
      attributes: {
        style: 'background: var(--theme-primary); color: white;',
      },
    }) as HTMLButtonElement;

    this.on(this.extractPaletteBtn, 'click', () => {
      void this.extractPalette();
    });

    this.paletteOptionsContainer.appendChild(this.extractPaletteBtn);
    optionsContainer.appendChild(this.paletteOptionsContainer);

    container.appendChild(optionsContainer);
  }

  /**
   * Update palette options visibility based on paletteMode
   */
  private updatePaletteOptionsVisibility(): void {
    if (this.paletteOptionsContainer) {
      this.paletteOptionsContainer.style.display = this.paletteMode ? '' : 'none';
    }
  }

  /**
   * Render dye filters collapsible panel
   */
  private renderFiltersPanel(container: HTMLElement): void {
    this.filtersPanel = new CollapsiblePanel(container, {
      title: LanguageService.t('filters.advancedFilters') || 'Dye Filters',
      storageKey: 'matcher_filters',
      defaultOpen: false,
      icon: ICON_FILTER,
    });
    this.filtersPanel.init();

    // Create filters content
    const filtersContent = this.createElement('div');
    this.dyeFilters = new DyeFilters(filtersContent, {
      storageKeyPrefix: 'v3_matcher',
      hideHeader: true, // FIX: Prevent double-nested collapsible headers
      onFilterChange: (filters) => {
        this.filterConfig = filters;
        if (this.selectedColor) {
          this.matchColor(this.selectedColor);
        }
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
      title: LanguageService.t('marketBoard.title') || 'Market Board',
      storageKey: 'matcher_market',
      defaultOpen: false,
      icon: ICON_MARKET,
    });
    this.marketPanel.init();

    // Create market board content
    const marketContent = this.createElement('div');
    this.marketBoard = new MarketBoard(marketContent);
    this.marketBoard.init();

    // Load server data for the dropdown and get initial showPrices state
    void this.marketBoard.loadServerData();
    this.showPrices = this.marketBoard.getShowPrices();

    this.marketPanel.setContent(marketContent);
  }

  // ============================================================================
  // Right Panel Rendering
  // ============================================================================

  private renderRightPanel(): void {
    const right = this.options.rightPanel;
    clearContainer(right);

    // Image Canvas Section
    this.canvasContainer = this.createElement('div', { className: 'mb-6' });
    this.renderImageCanvas();
    right.appendChild(this.canvasContainer);

    // Results Section
    this.resultsContainer = this.createElement('div', { className: 'mb-6' });
    const resultsHeader = this.createElement('h3', {
      className: 'text-sm font-semibold uppercase tracking-wider mb-3',
      textContent: LanguageService.t('matcher.matchedDyes') || 'Matched Dyes',
      attributes: { style: 'color: var(--theme-text-muted);' },
    });
    this.resultsContainer.appendChild(resultsHeader);
    right.appendChild(this.resultsContainer);

    // Empty state
    this.emptyStateContainer = this.createElement('div');
    this.renderEmptyState();
    right.appendChild(this.emptyStateContainer);

    // Recent Colors Section
    const recentContainer = this.createElement('div', { className: 'mt-6' });
    this.renderRecentColors(recentContainer);
    right.appendChild(recentContainer);
  }

  /**
   * Render image canvas with zoom controller
   */
  private renderImageCanvas(): void {
    if (!this.canvasContainer) return;
    clearContainer(this.canvasContainer);

    const canvasWrapper = this.createElement('div');
    this.canvasContainer.appendChild(canvasWrapper);

    this.imageZoom = new ImageZoomController(canvasWrapper, {
      onColorSampled: (hex, x, y) => {
        this.matchColor(hex);
      },
    });
    this.imageZoom.init();

    // If we already have an image, set it
    if (this.currentImage) {
      this.imageZoom.setImage(this.currentImage);
    }
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
      <span class="w-16 h-16 mx-auto mb-3 block opacity-30" style="color: var(--theme-text);">${ICON_UPLOAD}</span>
      <p style="color: var(--theme-text);">${LanguageService.t('matcher.uploadPrompt') || 'Upload an image to start matching'}</p>
      <p class="text-sm mt-2" style="color: var(--theme-text-muted);">${LanguageService.t('matcher.orEnterHex') || 'Or enter a hex color manually'}</p>
    `;

    this.emptyStateContainer.appendChild(empty);
  }

  /**
   * Render recent colors panel
   */
  private renderRecentColors(container: HTMLElement): void {
    this.recentColors = new RecentColorsPanel(container, {
      onColorSelected: (hex) => {
        this.matchColor(hex);
      },
      storageKey: 'v3_matcher_recent',
      maxColors: 10,
    });
    this.recentColors.init();
  }

  /**
   * Show/hide empty state
   */
  private showEmptyState(show: boolean): void {
    if (this.emptyStateContainer) {
      this.emptyStateContainer.classList.toggle('hidden', !show);
    }
  }

  // ============================================================================
  // Mobile Drawer Content
  // ============================================================================

  private renderDrawerContent(): void {
    if (!this.options.drawerContent) return;
    this.updateDrawerContent();
  }

  private updateDrawerContent(): void {
    if (!this.options.drawerContent) return;
    const drawer = this.options.drawerContent;
    clearContainer(drawer);

    // Destroy previous mobile components if they exist (clean slate)
    this.mobileDyeFilters?.destroy();
    this.mobileDyeFilters = null;
    this.mobileImageUpload?.destroy();
    this.mobileImageUpload = null;
    this.mobileColorPicker?.destroy();
    this.mobileColorPicker = null;
    this.mobileMarketBoard?.destroy();
    this.mobileMarketBoard = null;

    const content = this.createElement('div', { className: 'space-y-0' });

    // === Image Source Accordion Section ===
    const imageSourceSection = this.renderMobileImageSourceAccordion();
    content.appendChild(imageSourceSection);

    // === Color Selection Accordion Section ===
    const colorSelectionSection = this.renderMobileColorSelectionAccordion();
    content.appendChild(colorSelectionSection);

    // === Options Accordion Section ===
    const optionsSection = this.renderMobileOptionsAccordion();
    content.appendChild(optionsSection);

    // === Dye Filters Accordion Section ===
    const filtersSection = this.renderMobileFiltersAccordion();
    content.appendChild(filtersSection);

    // === Market Board Accordion Section ===
    const marketSection = this.renderMobileMarketAccordion();
    content.appendChild(marketSection);

    drawer.appendChild(content);
  }

  /**
   * Render mobile options accordion section
   */
  private renderMobileOptionsAccordion(): HTMLElement {
    const section = this.createElement('div', {
      className: 'border-b',
      attributes: { style: 'border-color: var(--theme-border);' },
    });

    // Accordion header
    const header = this.createElement('button', {
      className: 'w-full flex items-center justify-between px-4 py-3 text-left transition-colors',
      attributes: {
        style: 'background: var(--theme-background-secondary); color: var(--theme-text);',
        type: 'button',
        'aria-expanded': String(this.mobileOptionsExpanded),
      },
    });

    const titleContainer = this.createElement('span', {
      className: 'flex items-center gap-2 font-medium text-sm',
    });
    const iconSpan = this.createElement('span', {
      className: 'w-4 h-4 flex-shrink-0',
      innerHTML: ICON_SETTINGS,
    });
    const titleText = this.createElement('span', {
      textContent: LanguageService.t('matcher.options') || 'Options',
    });
    titleContainer.appendChild(iconSpan);
    titleContainer.appendChild(titleText);
    header.appendChild(titleContainer);

    // Chevron
    const chevron = this.createElement('span', {
      className: 'w-5 h-5 transition-transform duration-200',
      innerHTML: `<svg viewBox="0 0 20 20" fill="currentColor" class="w-full h-full">
        <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
      </svg>`,
      attributes: {
        style: this.mobileOptionsExpanded
          ? 'transform: rotate(0deg);'
          : 'transform: rotate(-90deg);',
      },
    });
    header.appendChild(chevron);
    section.appendChild(header);

    // Content area
    const contentWrapper = this.createElement('div', {
      className: 'overflow-hidden transition-all duration-200',
      attributes: {
        style: this.mobileOptionsExpanded
          ? 'max-height: 500px; opacity: 1;'
          : 'max-height: 0; opacity: 0;',
      },
    });

    const contentInner = this.createElement('div', {
      className: 'px-4 py-3 space-y-4',
      attributes: { style: 'background: var(--theme-card-background);' },
    });

    // Sample size slider
    const sampleGroup = this.createElement('div');
    const sampleLabel = this.createElement('label', {
      className: 'flex items-center justify-between text-sm mb-2',
    });
    sampleLabel.innerHTML = `
      <span style="color: var(--theme-text);">${LanguageService.t('matcher.sampleSize') || 'Sample Size'}</span>
      <span class="number" style="color: var(--theme-text-muted);">${this.sampleSize}px</span>
    `;
    this.mobileSampleDisplay = sampleLabel.querySelector('span:last-child') as HTMLElement;

    this.mobileSampleSlider = this.createElement('input', {
      attributes: { type: 'range', min: '1', max: '10', value: String(this.sampleSize) },
      className: 'w-full',
    }) as HTMLInputElement;

    this.on(this.mobileSampleSlider, 'input', () => {
      if (this.mobileSampleSlider && this.mobileSampleDisplay) {
        this.sampleSize = parseInt(this.mobileSampleSlider.value, 10);
        this.mobileSampleDisplay.textContent = `${this.sampleSize}px`;
        StorageService.setItem(STORAGE_KEYS.sampleSize, this.sampleSize);
        // Sync desktop slider if visible
        if (this.sampleSlider) {
          this.sampleSlider.value = String(this.sampleSize);
        }
        if (this.sampleDisplay) {
          this.sampleDisplay.textContent = `${this.sampleSize}px`;
        }
      }
    });

    sampleGroup.appendChild(sampleLabel);
    sampleGroup.appendChild(this.mobileSampleSlider);
    contentInner.appendChild(sampleGroup);

    // Palette mode toggle
    const paletteToggle = this.createElement('label', {
      className: 'flex items-center gap-3 cursor-pointer',
    });

    this.mobilePaletteModeCheckbox = this.createElement('input', {
      attributes: { type: 'checkbox' },
      className: 'w-5 h-5 rounded',
    }) as HTMLInputElement;
    this.mobilePaletteModeCheckbox.checked = this.paletteMode;

    this.on(this.mobilePaletteModeCheckbox, 'change', () => {
      if (this.mobilePaletteModeCheckbox) {
        this.paletteMode = this.mobilePaletteModeCheckbox.checked;
        StorageService.setItem(STORAGE_KEYS.paletteMode, this.paletteMode);
        // Sync desktop checkbox if visible
        if (this.paletteModeCheckbox) {
          this.paletteModeCheckbox.checked = this.paletteMode;
        }
        this.updatePaletteOptionsVisibility();
        this.updateMobilePaletteOptionsVisibility();
      }
    });

    const toggleText = this.createElement('div');
    toggleText.innerHTML = `
      <p class="text-sm font-medium" style="color: var(--theme-text);">${LanguageService.t('matcher.extractPalette') || 'Extract Palette'}</p>
      <p class="text-xs" style="color: var(--theme-text-muted);">${LanguageService.t('matcher.extractPaletteDesc') || 'Get multiple colors from image'}</p>
    `;

    paletteToggle.appendChild(this.mobilePaletteModeCheckbox);
    paletteToggle.appendChild(toggleText);
    contentInner.appendChild(paletteToggle);

    // Palette options (color count + extract button)
    this.mobilePaletteOptionsContainer = this.createElement('div', {
      className: 'space-y-3 pt-3 border-t',
      attributes: {
        style: `border-color: var(--theme-border); ${this.paletteMode ? '' : 'display: none;'}`,
      },
    });

    // Color count slider
    const colorCountGroup = this.createElement('div');
    const colorCountLabel = this.createElement('label', {
      className: 'flex items-center justify-between text-sm mb-2',
    });
    colorCountLabel.innerHTML = `
      <span style="color: var(--theme-text);">${LanguageService.t('matcher.colorCount') || 'Colors to Extract'}</span>
      <span class="number font-bold" style="color: var(--theme-primary);">${this.paletteColorCount}</span>
    `;
    this.mobileColorCountDisplay = colorCountLabel.querySelector('span:last-child') as HTMLElement;

    this.mobileColorCountSlider = this.createElement('input', {
      attributes: { type: 'range', min: '3', max: '5', value: String(this.paletteColorCount) },
      className: 'w-full',
    }) as HTMLInputElement;

    this.on(this.mobileColorCountSlider, 'input', () => {
      if (this.mobileColorCountSlider && this.mobileColorCountDisplay) {
        this.paletteColorCount = parseInt(this.mobileColorCountSlider.value, 10);
        this.mobileColorCountDisplay.textContent = String(this.paletteColorCount);
        StorageService.setItem(STORAGE_KEYS.paletteColorCount, this.paletteColorCount);
        // Sync desktop slider if visible
        if (this.colorCountSlider) {
          this.colorCountSlider.value = String(this.paletteColorCount);
        }
        if (this.colorCountDisplay) {
          this.colorCountDisplay.textContent = String(this.paletteColorCount);
        }
      }
    });

    colorCountGroup.appendChild(colorCountLabel);
    colorCountGroup.appendChild(this.mobileColorCountSlider);
    this.mobilePaletteOptionsContainer.appendChild(colorCountGroup);

    // Extract palette button
    this.mobileExtractPaletteBtn = this.createElement('button', {
      className: 'w-full py-2 px-4 rounded-lg font-medium text-sm transition-colors',
      textContent: LanguageService.t('matcher.extractPaletteBtn') || 'Extract Palette from Image',
      attributes: {
        style: 'background: var(--theme-primary); color: white;',
      },
    }) as HTMLButtonElement;

    this.on(this.mobileExtractPaletteBtn, 'click', () => {
      void this.extractPalette();
    });

    this.mobilePaletteOptionsContainer.appendChild(this.mobileExtractPaletteBtn);
    contentInner.appendChild(this.mobilePaletteOptionsContainer);

    contentWrapper.appendChild(contentInner);
    section.appendChild(contentWrapper);

    // Toggle event
    this.on(header, 'click', () => {
      this.mobileOptionsExpanded = !this.mobileOptionsExpanded;
      header.setAttribute('aria-expanded', String(this.mobileOptionsExpanded));
      chevron.style.transform = this.mobileOptionsExpanded ? 'rotate(0deg)' : 'rotate(-90deg)';
      contentWrapper.style.maxHeight = this.mobileOptionsExpanded ? '500px' : '0';
      contentWrapper.style.opacity = this.mobileOptionsExpanded ? '1' : '0';
    });

    return section;
  }

  /**
   * Render mobile dye filters accordion section
   */
  private renderMobileFiltersAccordion(): HTMLElement {
    const section = this.createElement('div', {
      className: 'border-b',
      attributes: { style: 'border-color: var(--theme-border);' },
    });

    // Accordion header
    const header = this.createElement('button', {
      className: 'w-full flex items-center justify-between px-4 py-3 text-left transition-colors',
      attributes: {
        style: 'background: var(--theme-background-secondary); color: var(--theme-text);',
        type: 'button',
        'aria-expanded': String(this.mobileFiltersExpanded),
      },
    });

    const titleContainer = this.createElement('span', {
      className: 'flex items-center gap-2 font-medium text-sm',
    });
    const iconSpan = this.createElement('span', {
      className: 'w-4 h-4 flex-shrink-0',
      innerHTML: ICON_FILTER,
    });
    const titleText = this.createElement('span', {
      textContent: LanguageService.t('filters.advancedFilters') || 'Dye Filters',
    });
    titleContainer.appendChild(iconSpan);
    titleContainer.appendChild(titleText);
    header.appendChild(titleContainer);

    // Chevron
    const chevron = this.createElement('span', {
      className: 'w-5 h-5 transition-transform duration-200',
      innerHTML: `<svg viewBox="0 0 20 20" fill="currentColor" class="w-full h-full">
        <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
      </svg>`,
      attributes: {
        style: this.mobileFiltersExpanded
          ? 'transform: rotate(0deg);'
          : 'transform: rotate(-90deg);',
      },
    });
    header.appendChild(chevron);
    section.appendChild(header);

    // Content area
    const contentWrapper = this.createElement('div', {
      className: 'overflow-hidden transition-all duration-200',
      attributes: {
        style: this.mobileFiltersExpanded
          ? 'max-height: 500px; opacity: 1;'
          : 'max-height: 0; opacity: 0;',
      },
    });

    const contentInner = this.createElement('div', {
      className: 'px-4 py-3',
      attributes: { style: 'background: var(--theme-card-background);' },
    });

    // Create mobile DyeFilters instance
    const filtersContainer = this.createElement('div', {
      attributes: { id: 'mobile-dye-filters' },
    });
    contentInner.appendChild(filtersContainer);

    this.mobileDyeFilters = new DyeFilters(filtersContainer, {
      storageKeyPrefix: 'v3_matcher',
      hideHeader: true, // We have our own accordion header
      onFilterChange: (filters) => {
        this.filterConfig = filters;
        if (this.selectedColor) {
          this.matchColor(this.selectedColor);
        }
      },
    });
    this.mobileDyeFilters.init();

    contentWrapper.appendChild(contentInner);
    section.appendChild(contentWrapper);

    // Toggle event
    this.on(header, 'click', () => {
      this.mobileFiltersExpanded = !this.mobileFiltersExpanded;
      header.setAttribute('aria-expanded', String(this.mobileFiltersExpanded));
      chevron.style.transform = this.mobileFiltersExpanded ? 'rotate(0deg)' : 'rotate(-90deg)';
      contentWrapper.style.maxHeight = this.mobileFiltersExpanded ? '500px' : '0';
      contentWrapper.style.opacity = this.mobileFiltersExpanded ? '1' : '0';
    });

    return section;
  }

  /**
   * Update mobile palette options visibility based on paletteMode
   */
  private updateMobilePaletteOptionsVisibility(): void {
    if (this.mobilePaletteOptionsContainer) {
      this.mobilePaletteOptionsContainer.style.display = this.paletteMode ? '' : 'none';
    }
  }

  /**
   * Render mobile image source accordion section
   */
  private renderMobileImageSourceAccordion(): HTMLElement {
    const section = this.createElement('div', {
      className: 'border-b',
      attributes: { style: 'border-color: var(--theme-border);' },
    });

    // Accordion header
    const header = this.createElement('button', {
      className: 'w-full flex items-center justify-between px-4 py-3 text-left transition-colors',
      attributes: {
        style: 'background: var(--theme-background-secondary); color: var(--theme-text);',
        type: 'button',
        'aria-expanded': String(this.mobileImageSourceExpanded),
      },
    });

    const titleContainer = this.createElement('span', {
      className: 'flex items-center gap-2 font-medium text-sm',
    });
    const iconSpan = this.createElement('span', {
      className: 'w-4 h-4 flex-shrink-0',
      innerHTML: ICON_UPLOAD,
    });
    const titleText = this.createElement('span', {
      textContent: LanguageService.t('matcher.imageSource') || 'Image Source',
    });
    titleContainer.appendChild(iconSpan);
    titleContainer.appendChild(titleText);
    header.appendChild(titleContainer);

    // Chevron
    const chevron = this.createElement('span', {
      className: 'w-5 h-5 transition-transform duration-200',
      innerHTML: `<svg viewBox="0 0 20 20" fill="currentColor" class="w-full h-full">
        <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
      </svg>`,
      attributes: {
        style: this.mobileImageSourceExpanded
          ? 'transform: rotate(0deg);'
          : 'transform: rotate(-90deg);',
      },
    });
    header.appendChild(chevron);
    section.appendChild(header);

    // Content area
    const contentWrapper = this.createElement('div', {
      className: 'overflow-hidden transition-all duration-200',
      attributes: {
        style: this.mobileImageSourceExpanded
          ? 'max-height: 800px; opacity: 1;'
          : 'max-height: 0; opacity: 0;',
      },
    });

    const contentInner = this.createElement('div', {
      className: 'px-4 py-3',
      attributes: { style: 'background: var(--theme-card-background);' },
    });

    // Create mobile ImageUploadDisplay instance
    const uploadContainer = this.createElement('div');
    contentInner.appendChild(uploadContainer);

    this.mobileImageUpload = new ImageUploadDisplay(uploadContainer);
    this.mobileImageUpload.init();

    // Listen for image-loaded events from mobile uploader
    this.onPanelEvent(uploadContainer, 'image-loaded', (event: CustomEvent) => {
      const { image, dataUrl } = event.detail;
      this.currentImage = image;
      this.currentImageDataUrl = dataUrl;

      // Persist image to storage if it's small enough
      if (dataUrl && dataUrl.length < MAX_IMAGE_STORAGE_SIZE) {
        StorageService.setItem(STORAGE_KEYS.imageDataUrl, dataUrl);
      } else if (dataUrl) {
        StorageService.removeItem(STORAGE_KEYS.imageDataUrl);
      }

      ToastService.success(LanguageService.t('matcher.imageLoaded') || 'Image loaded');

      if (this.imageZoom) {
        this.imageZoom.setImage(image);
      }

      this.showEmptyState(false);
    });

    contentWrapper.appendChild(contentInner);
    section.appendChild(contentWrapper);

    // Toggle event
    this.on(header, 'click', () => {
      this.mobileImageSourceExpanded = !this.mobileImageSourceExpanded;
      header.setAttribute('aria-expanded', String(this.mobileImageSourceExpanded));
      chevron.style.transform = this.mobileImageSourceExpanded ? 'rotate(0deg)' : 'rotate(-90deg)';
      contentWrapper.style.maxHeight = this.mobileImageSourceExpanded ? '800px' : '0';
      contentWrapper.style.opacity = this.mobileImageSourceExpanded ? '1' : '0';
    });

    return section;
  }

  /**
   * Render mobile color selection accordion section
   */
  private renderMobileColorSelectionAccordion(): HTMLElement {
    const section = this.createElement('div', {
      className: 'border-b',
      attributes: { style: 'border-color: var(--theme-border);' },
    });

    // Accordion header
    const header = this.createElement('button', {
      className: 'w-full flex items-center justify-between px-4 py-3 text-left transition-colors',
      attributes: {
        style: 'background: var(--theme-background-secondary); color: var(--theme-text);',
        type: 'button',
        'aria-expanded': String(this.mobileColorSelectionExpanded),
      },
    });

    const titleContainer = this.createElement('span', {
      className: 'flex items-center gap-2 font-medium text-sm',
    });
    const iconSpan = this.createElement('span', {
      className: 'w-4 h-4 flex-shrink-0',
      innerHTML: ICON_PALETTE,
    });
    const titleText = this.createElement('span', {
      textContent: LanguageService.t('matcher.colorSelection') || 'Color Selection',
    });
    titleContainer.appendChild(iconSpan);
    titleContainer.appendChild(titleText);
    header.appendChild(titleContainer);

    // Chevron
    const chevron = this.createElement('span', {
      className: 'w-5 h-5 transition-transform duration-200',
      innerHTML: `<svg viewBox="0 0 20 20" fill="currentColor" class="w-full h-full">
        <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
      </svg>`,
      attributes: {
        style: this.mobileColorSelectionExpanded
          ? 'transform: rotate(0deg);'
          : 'transform: rotate(-90deg);',
      },
    });
    header.appendChild(chevron);
    section.appendChild(header);

    // Content area
    const contentWrapper = this.createElement('div', {
      className: 'overflow-hidden transition-all duration-200',
      attributes: {
        style: this.mobileColorSelectionExpanded
          ? 'max-height: 500px; opacity: 1;'
          : 'max-height: 0; opacity: 0;',
      },
    });

    const contentInner = this.createElement('div', {
      className: 'px-4 py-3',
      attributes: { style: 'background: var(--theme-card-background);' },
    });

    // Create mobile ColorPickerDisplay instance
    const pickerContainer = this.createElement('div');
    contentInner.appendChild(pickerContainer);

    this.mobileColorPicker = new ColorPickerDisplay(pickerContainer);
    this.mobileColorPicker.init();

    // Listen for color-selected events from mobile picker
    this.onPanelEvent(pickerContainer, 'color-selected', (event: CustomEvent) => {
      const { color } = event.detail;
      this.matchColor(color);
    });

    contentWrapper.appendChild(contentInner);
    section.appendChild(contentWrapper);

    // Toggle event
    this.on(header, 'click', () => {
      this.mobileColorSelectionExpanded = !this.mobileColorSelectionExpanded;
      header.setAttribute('aria-expanded', String(this.mobileColorSelectionExpanded));
      chevron.style.transform = this.mobileColorSelectionExpanded
        ? 'rotate(0deg)'
        : 'rotate(-90deg)';
      contentWrapper.style.maxHeight = this.mobileColorSelectionExpanded ? '500px' : '0';
      contentWrapper.style.opacity = this.mobileColorSelectionExpanded ? '1' : '0';
    });

    return section;
  }

  /**
   * Render mobile market board accordion section
   */
  private renderMobileMarketAccordion(): HTMLElement {
    const section = this.createElement('div', {
      className: 'border-b',
      attributes: { style: 'border-color: var(--theme-border);' },
    });

    // Accordion header
    const header = this.createElement('button', {
      className: 'w-full flex items-center justify-between px-4 py-3 text-left transition-colors',
      attributes: {
        style: 'background: var(--theme-background-secondary); color: var(--theme-text);',
        type: 'button',
        'aria-expanded': String(this.mobileMarketExpanded),
      },
    });

    const titleContainer = this.createElement('span', {
      className: 'flex items-center gap-2 font-medium text-sm',
    });
    const iconSpan = this.createElement('span', {
      className: 'w-4 h-4 flex-shrink-0',
      innerHTML: ICON_MARKET,
    });
    const titleText = this.createElement('span', {
      textContent: LanguageService.t('marketBoard.title') || 'Market Board',
    });
    titleContainer.appendChild(iconSpan);
    titleContainer.appendChild(titleText);
    header.appendChild(titleContainer);

    // Chevron
    const chevron = this.createElement('span', {
      className: 'w-5 h-5 transition-transform duration-200',
      innerHTML: `<svg viewBox="0 0 20 20" fill="currentColor" class="w-full h-full">
        <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
      </svg>`,
      attributes: {
        style: this.mobileMarketExpanded
          ? 'transform: rotate(0deg);'
          : 'transform: rotate(-90deg);',
      },
    });
    header.appendChild(chevron);
    section.appendChild(header);

    // Content area
    const contentWrapper = this.createElement('div', {
      className: 'overflow-hidden transition-all duration-200',
      attributes: {
        style: this.mobileMarketExpanded
          ? 'max-height: 600px; opacity: 1;'
          : 'max-height: 0; opacity: 0;',
      },
    });

    const contentInner = this.createElement('div', {
      className: 'px-4 py-3',
      attributes: { style: 'background: var(--theme-card-background);' },
    });

    // Create mobile MarketBoard instance
    const marketContainer = this.createElement('div');
    contentInner.appendChild(marketContainer);

    this.mobileMarketBoard = new MarketBoard(marketContainer);
    this.mobileMarketBoard.init();

    // Load server data for the dropdown
    void this.mobileMarketBoard.loadServerData();

    // Listen for market board events
    this.onPanelEvent(marketContainer, 'showPricesChanged', (event: CustomEvent) => {
      this.showPrices = event.detail.showPrices;
      if (this.showPrices) {
        void this.fetchPricesForMatches();
      } else {
        this.priceData.clear();
        if (this.lastPaletteResults.length > 0) {
          this.renderPaletteResults(this.lastPaletteResults);
        } else {
          this.renderMatchedResults();
        }
      }
    });

    this.onPanelEvent(marketContainer, 'server-changed', () => {
      if (this.showPrices) {
        void this.fetchPricesForMatches();
      }
    });

    this.onPanelEvent(marketContainer, 'categories-changed', () => {
      if (this.showPrices) {
        void this.fetchPricesForMatches();
      }
    });

    this.onPanelEvent(marketContainer, 'refresh-requested', () => {
      if (this.showPrices) {
        void this.fetchPricesForMatches();
      }
    });

    contentWrapper.appendChild(contentInner);
    section.appendChild(contentWrapper);

    // Toggle event
    this.on(header, 'click', () => {
      this.mobileMarketExpanded = !this.mobileMarketExpanded;
      header.setAttribute('aria-expanded', String(this.mobileMarketExpanded));
      chevron.style.transform = this.mobileMarketExpanded ? 'rotate(0deg)' : 'rotate(-90deg)';
      contentWrapper.style.maxHeight = this.mobileMarketExpanded ? '600px' : '0';
      contentWrapper.style.opacity = this.mobileMarketExpanded ? '1' : '0';
    });

    return section;
  }

  // ============================================================================
  // Color Matching Logic
  // ============================================================================

  /**
   * Match a color to the closest dyes
   */
  private matchColor(hex: string): void {
    this.selectedColor = hex;
    this.showEmptyState(false);

    // Clear palette results when doing single color match
    this.lastPaletteResults = [];

    // Persist selected color to storage
    StorageService.setItem(STORAGE_KEYS.selectedColor, hex);

    // Add to recent colors
    if (this.recentColors) {
      this.recentColors.addRecentColor(hex);
    }

    // Find closest dyes
    let closestDye = dyeService.findClosestDye(hex);
    let withinDistance = dyeService.findDyesWithinDistance(hex, 100, 9);

    // Apply filters if available
    if (this.dyeFilters) {
      // Filter closest dye
      if (closestDye && this.dyeFilters.isDyeExcluded(closestDye)) {
        const allDyes = dyeService.getAllDyes();
        const filteredDyes = this.dyeFilters.filterDyes(allDyes);
        closestDye =
          filteredDyes.length > 0
            ? filteredDyes.reduce((best, dye) => {
                const bestDist = ColorService.getColorDistance(hex, best.hex);
                const dyeDist = ColorService.getColorDistance(hex, dye.hex);
                return dyeDist < bestDist ? dye : best;
              })
            : null;
      }

      // Filter within distance results
      withinDistance = this.dyeFilters.filterDyes(withinDistance);
    }

    if (!closestDye) {
      this.matchedDyes = [];
      this.renderMatchedResults();
      return;
    }

    // Cache distances
    const closestDyeWithDistance: DyeWithDistance = {
      ...closestDye,
      distance: ColorService.getColorDistance(hex, closestDye.hex),
    };

    const withinDistanceWithCache: DyeWithDistance[] = withinDistance.map((dye) => ({
      ...dye,
      distance: ColorService.getColorDistance(hex, dye.hex),
    }));

    // Store matched dyes
    this.matchedDyes = [closestDyeWithDistance, ...withinDistanceWithCache];

    // Render results
    this.renderMatchedResults();
    this.updateDrawerContent();

    // Fetch prices if enabled
    if (this.showPrices && this.marketBoard) {
      void this.fetchPricesForMatches();
    }

    logger.info('[MatcherTool] Matched color:', hex, 'Found:', this.matchedDyes.length, 'dyes');
  }

  /**
   * Render matched dye results
   */
  private renderMatchedResults(): void {
    if (!this.resultsContainer) return;

    // Clear existing results (keep header)
    const header = this.resultsContainer.querySelector('h3');
    clearContainer(this.resultsContainer);
    if (header) {
      this.resultsContainer.appendChild(header);
    }

    if (this.matchedDyes.length === 0) {
      if (this.selectedColor) {
        const noResults = this.createElement('p', {
          className: 'text-sm text-center py-4',
          textContent: LanguageService.t('matcher.noMatchingDyes') || 'No matching dyes found',
          attributes: { style: 'color: var(--theme-text-muted);' },
        });
        this.resultsContainer.appendChild(noResults);
      }
      return;
    }

    const grid = this.createElement('div', { className: 'grid gap-3 sm:grid-cols-2' });

    this.matchedDyes.forEach((dye, index) => {
      const card = this.createDyeCard(dye, index);
      grid.appendChild(card);
    });

    this.resultsContainer.appendChild(grid);
  }

  /**
   * Create a dye result card
   */
  private createDyeCard(dye: DyeWithDistance, index: number): HTMLElement {
    const card = this.createElement('div', {
      className: 'group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
      attributes: {
        style: 'background: var(--theme-card-background); border: 1px solid var(--theme-border);',
      },
    });

    // Rank badge
    const rank = this.createElement('span', {
      className:
        'w-6 h-6 flex items-center justify-center text-xs font-bold rounded-full flex-shrink-0',
      textContent: String(index + 1),
      attributes: {
        style:
          index === 0
            ? 'background: var(--theme-primary); color: var(--theme-text-header);'
            : 'background: var(--theme-background-secondary); color: var(--theme-text-muted);',
      },
    });

    // Color swatches (sampled + dye)
    const swatches = this.createElement('div', { className: 'flex gap-1' });
    if (this.selectedColor) {
      const sampledSwatch = this.createElement('div', {
        className: 'w-5 h-10 rounded-l',
        attributes: { style: `background: ${this.selectedColor};`, title: 'Sampled color' },
      });
      swatches.appendChild(sampledSwatch);
    }
    const dyeSwatch = this.createElement('div', {
      className: 'w-5 h-10 rounded-r',
      attributes: { style: `background: ${dye.hex};`, title: dye.hex },
    });
    swatches.appendChild(dyeSwatch);

    // Dye info
    const info = this.createElement('div', { className: 'flex-1 min-w-0' });
    const dyeName = LanguageService.getDyeName(dye.itemID) ?? dye.name;
    info.innerHTML = `
      <p class="text-sm font-medium truncate" style="color: var(--theme-text);">${dyeName}</p>
      <p class="text-xs number" style="color: var(--theme-text-muted);">
        Δ ${dye.distance.toFixed(1)}
        ${this.showPrices && this.priceData.has(dye.itemID) ? ` · ${this.priceData.get(dye.itemID)!.currentMinPrice.toLocaleString()} gil` : ''}
      </p>
    `;

    card.appendChild(rank);
    card.appendChild(swatches);
    card.appendChild(info);

    // Action dropdown (visible on hover)
    const dropdownContainer = this.createElement('div', {
      className: 'opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0',
    });
    const actionDropdown = createDyeActionDropdown(dye);
    dropdownContainer.appendChild(actionDropdown);
    card.appendChild(dropdownContainer);

    // Hover effect
    this.on(card, 'mouseenter', () => {
      card.style.background = 'var(--theme-card-hover)';
    });
    this.on(card, 'mouseleave', () => {
      card.style.background = 'var(--theme-card-background)';
    });

    return card;
  }

  /**
   * Fetch prices for matched dyes
   */
  private async fetchPricesForMatches(): Promise<void> {
    if (!this.marketBoard || this.matchedDyes.length === 0) return;

    try {
      const prices = await this.marketBoard.fetchPricesForDyes(this.matchedDyes);
      this.priceData.clear();
      for (const [id, price] of prices.entries()) {
        this.priceData.set(id, price);
      }
      // Re-render appropriate results based on mode
      if (this.lastPaletteResults.length > 0) {
        this.renderPaletteResults(this.lastPaletteResults);
      } else {
        this.renderMatchedResults();
      }
    } catch (error) {
      logger.error('[MatcherTool] Failed to fetch prices:', error);
    }
  }

  // ============================================================================
  // Palette Extraction
  // ============================================================================

  /**
   * Extract palette from loaded image using K-Means clustering
   */
  private async extractPalette(): Promise<void> {
    // Get canvas from ImageZoomController
    const canvas = this.imageZoom?.getCanvas();

    if (!canvas || !this.currentImage) {
      ToastService.error(
        LanguageService.t('matcher.noImageForPalette') || 'Please load an image first'
      );
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      ToastService.error('Could not get canvas context');
      return;
    }

    // Update button to show loading state
    if (this.extractPaletteBtn) {
      this.extractPaletteBtn.textContent =
        LanguageService.t('matcher.extractingPalette') || 'Extracting...';
      this.extractPaletteBtn.disabled = true;
      this.extractPaletteBtn.style.opacity = '0.7';
    }

    try {
      // Get pixel data from canvas
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = PaletteService.pixelDataToRGBFiltered(imageData.data);

      if (pixels.length === 0) {
        ToastService.error('No pixels to analyze');
        return;
      }

      // Extract palette and match to dyes
      const matches = this.paletteService.extractAndMatchPalette(pixels, dyeService, {
        colorCount: this.paletteColorCount,
      });

      this.lastPaletteResults = matches;

      // Find representative positions for each extracted color and draw indicators
      const positions = this.findColorPositions(imageData, matches);
      this.drawSampleIndicators(canvas, ctx, matches, positions);

      // Render results
      this.renderPaletteResults(matches);

      // Hide empty state
      this.showEmptyState(false);

      // Fetch prices if enabled
      if (this.showPrices && this.marketBoard) {
        // Convert PaletteMatch to DyeWithDistance for price fetching
        this.matchedDyes = matches.map((m: PaletteMatch) => ({
          ...m.matchedDye,
          distance: m.distance,
        }));
        void this.fetchPricesForMatches();
      }

      ToastService.success(
        LanguageService.tInterpolate('matcher.paletteExtracted', {
          count: String(matches.length),
        }) || `Extracted ${matches.length} colors from image`
      );

      logger.info('[MatcherTool] Palette extracted:', matches.length, 'colors');
    } catch (error) {
      logger.error('[MatcherTool] Palette extraction failed:', error);
      ToastService.error('Failed to extract palette');
    } finally {
      // Restore button state
      if (this.extractPaletteBtn) {
        this.extractPaletteBtn.textContent =
          LanguageService.t('matcher.extractPaletteBtn') || 'Extract Palette from Image';
        this.extractPaletteBtn.disabled = false;
        this.extractPaletteBtn.style.opacity = '1';
      }
    }
  }

  /**
   * Find representative pixel positions for each extracted color
   * Scans the image to find pixels closest to each centroid
   */
  private findColorPositions(
    imageData: ImageData,
    matches: PaletteMatch[]
  ): Array<{ x: number; y: number }> {
    const { data, width, height } = imageData;
    const positions: Array<{ x: number; y: number; distance: number }> = matches.map(() => ({
      x: 0,
      y: 0,
      distance: Infinity,
    }));

    // Sample grid (every 4th pixel for performance on large images)
    const step = Math.max(1, Math.floor(Math.sqrt((width * height) / 10000)));

    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        // Skip transparent pixels
        if (a < 128) continue;

        // Check each extracted color
        for (let i = 0; i < matches.length; i++) {
          const extracted = matches[i].extracted;
          const dr = r - extracted.r;
          const dg = g - extracted.g;
          const db = b - extracted.b;
          const dist = Math.sqrt(dr * dr + dg * dg + db * db);

          if (dist < positions[i].distance) {
            positions[i] = { x, y, distance: dist };
          }
        }
      }
    }

    return positions.map((p) => ({ x: p.x, y: p.y }));
  }

  /**
   * Draw sample indicator circles on the canvas
   */
  private drawSampleIndicators(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    matches: PaletteMatch[],
    positions: Array<{ x: number; y: number }>
  ): void {
    // First redraw the original image to clear any previous indicators
    if (this.currentImage) {
      ctx.drawImage(this.currentImage, 0, 0);
    }

    // Calculate circle radius based on image size (2-4% of smaller dimension)
    const minDimension = Math.min(canvas.width, canvas.height);
    const radius = Math.max(15, Math.min(50, minDimension * 0.03));

    // Draw each indicator
    for (let i = 0; i < matches.length; i++) {
      const pos = positions[i];
      const match = matches[i];

      // Outer white circle (for visibility on dark backgrounds)
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius + 3, 0, Math.PI * 2);
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Inner colored circle matching the extracted color
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgb(${match.extracted.r}, ${match.extracted.g}, ${match.extracted.b})`;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Small center dot
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'white';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${match.extracted.r}, ${match.extracted.g}, ${match.extracted.b})`;
      ctx.fill();

      // Number label
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = 'white';
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 3;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeText(String(i + 1), pos.x, pos.y - radius - 10);
      ctx.fillText(String(i + 1), pos.x, pos.y - radius - 10);
    }
  }

  /**
   * Render extracted palette results
   */
  private renderPaletteResults(matches: PaletteMatch[]): void {
    if (!this.resultsContainer) return;

    // Clear existing results (keep header)
    const header = this.resultsContainer.querySelector('h3');
    clearContainer(this.resultsContainer);

    // Update header text
    const newHeader = this.createElement('h3', {
      className: 'text-sm font-semibold uppercase tracking-wider mb-3',
      textContent: LanguageService.t('matcher.paletteResults') || 'Extracted Palette',
      attributes: { style: 'color: var(--theme-text-muted);' },
    });
    this.resultsContainer.appendChild(newHeader);

    if (matches.length === 0) {
      return;
    }

    // Color bar (visual overview) showing dominance
    const colorBar = this.createElement('div', {
      className: 'flex h-10 rounded-lg overflow-hidden mb-4',
      attributes: { style: 'border: 1px solid var(--theme-border);' },
    });

    for (const match of matches) {
      const colorSegment = this.createElement('div', {
        className: 'transition-all hover:opacity-80 cursor-pointer',
        attributes: {
          style: `flex: ${match.dominance}; background-color: rgb(${match.extracted.r}, ${match.extracted.g}, ${match.extracted.b});`,
          title: `${match.matchedDye.name} (${match.dominance}%)`,
        },
      });
      colorBar.appendChild(colorSegment);
    }
    this.resultsContainer.appendChild(colorBar);

    // Individual palette entries
    const entriesContainer = this.createElement('div', { className: 'space-y-3' });

    matches.forEach((match, index) => {
      const entry = this.renderPaletteEntry(match, index);
      entriesContainer.appendChild(entry);
    });

    this.resultsContainer.appendChild(entriesContainer);
  }

  /**
   * Render a single palette entry showing extracted color → matched dye
   */
  private renderPaletteEntry(match: PaletteMatch, index: number): HTMLElement {
    const entry = this.createElement('div', {
      className: 'flex items-center gap-3 p-3 rounded-lg',
      attributes: {
        style: 'background: var(--theme-card-background); border: 1px solid var(--theme-border);',
      },
    });

    // Index badge
    const badge = this.createElement('span', {
      className:
        'w-6 h-6 flex items-center justify-center text-xs font-bold rounded-full flex-shrink-0',
      textContent: String(index + 1),
      attributes: {
        style: 'background: var(--theme-primary); color: white;',
      },
    });
    entry.appendChild(badge);

    // Extracted color swatch
    const extractedSwatch = this.createElement('div', {
      className: 'w-8 h-8 rounded border-2 flex-shrink-0',
      attributes: {
        style: `background-color: rgb(${match.extracted.r}, ${match.extracted.g}, ${match.extracted.b}); border-color: var(--theme-border);`,
        title: LanguageService.t('matcher.extractedColor') || 'Extracted Color',
      },
    });
    entry.appendChild(extractedSwatch);

    // Arrow
    const arrow = this.createElement('span', {
      className: 'text-lg flex-shrink-0',
      textContent: '→',
      attributes: { style: 'color: var(--theme-text-muted);' },
    });
    entry.appendChild(arrow);

    // Matched dye swatch
    const matchedSwatch = this.createElement('div', {
      className: 'w-8 h-8 rounded border-2 flex-shrink-0',
      attributes: {
        style: `background-color: ${match.matchedDye.hex}; border-color: var(--theme-border);`,
        title: match.matchedDye.name,
      },
    });
    entry.appendChild(matchedSwatch);

    // Dye info
    const dyeName = LanguageService.getDyeName(match.matchedDye.itemID) ?? match.matchedDye.name;
    const info = this.createElement('div', { className: 'flex-1 min-w-0' });

    // Build info text with optional price
    let detailsText = `${match.dominance}% · Δ${match.distance.toFixed(1)} · ${match.matchedDye.hex.toUpperCase()}`;
    if (this.showPrices && this.priceData.has(match.matchedDye.itemID)) {
      const price = this.priceData.get(match.matchedDye.itemID)!;
      detailsText += ` · ${price.currentMinPrice.toLocaleString()} gil`;
    }

    info.innerHTML = `
      <p class="text-sm font-medium truncate" style="color: var(--theme-text);">${dyeName}</p>
      <p class="text-xs number" style="color: var(--theme-text-muted);">
        ${detailsText}
      </p>
    `;
    entry.appendChild(info);

    // Action dropdown (replaces individual Copy and Find Cheaper buttons)
    const actionDropdown = createDyeActionDropdown(match.matchedDye);
    entry.appendChild(actionDropdown);

    return entry;
  }
}
