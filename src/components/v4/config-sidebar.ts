/**
 * XIV Dye Tools v4.0 - Config Sidebar Component
 *
 * 320px glassmorphism sidebar containing all tool configurations.
 * Uses all-in-one approach: contains all configs internally,
 * shows/hides sections based on activeTool property.
 *
 * Phase 6: Wired to ConfigController for reactive state management.
 * Uses ToggleSwitchV4 and RangeSliderV4 for interactive controls.
 *
 * @module components/v4/config-sidebar
 */

import { html, css, CSSResultGroup, TemplateResult, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { BaseLitComponent } from './base-lit-component';
import { ConfigController } from '@services/config-controller';
import type { ToolId } from '@services/router-service';
import type {
  HarmonyConfig,
  ExtractorConfig,
  AccessibilityConfig,
  ComparisonConfig,
  GradientConfig,
  MixerConfig,
  PresetsConfig,
  BudgetConfig,
  SwatchConfig,
  MarketConfig,
  ConfigKey,
  DisplayOptionsConfig,
} from '@shared/tool-config-types';
import { DEFAULT_DISPLAY_OPTIONS } from '@shared/tool-config-types';
import type { DataCenter, World } from '@shared/types';
import { logger } from '@shared/logger';

// Import child components to ensure registration
import './toggle-switch-v4';
import './range-slider-v4';
import './display-options-v4';
import type { DisplayOptionsChangeDetail } from './display-options-v4';

/**
 * V4 Config Sidebar - Tool configuration panel
 *
 * @fires sidebar-collapse - When collapse button is clicked (mobile)
 * @fires config-change - When any config value changes
 *   - detail.tool: The tool ID or 'global'
 *   - detail.key: The config property key
 *   - detail.value: The new value
 *
 * @example
 * ```html
 * <v4-config-sidebar
 *   .activeTool=${'harmony'}
 *   .collapsed=${false}
 *   @sidebar-collapse=${this.handleCollapse}
 *   @config-change=${this.handleConfigChange}
 * ></v4-config-sidebar>
 * ```
 */
@customElement('v4-config-sidebar')
export class ConfigSidebar extends BaseLitComponent {
  /**
   * Currently active tool ID - determines which config section is visible
   */
  @property({ type: String, attribute: 'active-tool' })
  activeTool: ToolId = 'harmony';

  /**
   * Whether sidebar is collapsed (mobile drawer mode)
   */
  @property({ type: Boolean, reflect: true })
  collapsed = false;

  // =========================================================================
  // Tool Configuration State
  // =========================================================================

  @state() private harmonyConfig: HarmonyConfig = {
    harmonyType: 'tetradic',
    strictMatching: false,
    displayOptions: { ...DEFAULT_DISPLAY_OPTIONS },
  };
  @state() private extractorConfig: ExtractorConfig = {
    vibrancyBoost: true,
    maxColors: 8,
  };
  @state() private accessibilityConfig: AccessibilityConfig = {
    normalVision: true,
    deuteranopia: true,
    protanopia: true,
    tritanopia: true,
    achromatopsia: true,
    showLabels: true,
    showHexValues: false,
    highContrastMode: false,
    displayOptions: {
      ...DEFAULT_DISPLAY_OPTIONS,
      showPrice: false,
      showDeltaE: false,
      showAcquisition: false,
    },
  };
  @state() private comparisonConfig: ComparisonConfig = {
    showDeltaE: true,
    showRgb: true,
    showHsv: false,
    showMarketPrices: true,
    displayOptions: { ...DEFAULT_DISPLAY_OPTIONS },
  };
  @state() private gradientConfig: GradientConfig = {
    stepCount: 8,
    interpolation: 'linear',
    displayOptions: { ...DEFAULT_DISPLAY_OPTIONS },
  };
  @state() private mixerConfig: MixerConfig = {
    maxResults: 3,
    displayOptions: { ...DEFAULT_DISPLAY_OPTIONS },
  };
  @state() private presetsConfig: PresetsConfig = {
    showMyPresetsOnly: false,
    showFavorites: false,
    sortBy: 'newest',
  };
  @state() private budgetConfig: BudgetConfig = {
    maxPrice: 200000,
    maxResults: 8,
    maxDeltaE: 75,
    displayOptions: { ...DEFAULT_DISPLAY_OPTIONS },
  };
  @state() private swatchConfig: SwatchConfig = {
    colorSheet: 'eyeColors',
    race: 'Midlander',
    gender: 'Male',
    maxResults: 3,
    displayOptions: { ...DEFAULT_DISPLAY_OPTIONS },
  };

  // Global display options shared across all tools
  @state() private globalDisplayOptions: DisplayOptionsConfig = { ...DEFAULT_DISPLAY_OPTIONS };

  @state() private marketConfig: MarketConfig = {
    selectedServer: 'Crystal',
    showPrices: false,
  };

  // Server data for market config dropdown
  @state() private dataCenters: DataCenter[] = [];
  @state() private worlds: World[] = [];

  // Collapsible section state
  @state() private marketBoardCollapsed: boolean = false;

  private configController: ConfigController | null = null;

  static override styles: CSSResultGroup = [
    BaseLitComponent.baseStyles,
    css`
      :host {
        display: block;
        width: var(--v4-sidebar-width, 320px);
        height: 100%;
        flex-shrink: 0;
      }

      :host([collapsed]) {
        display: none;
      }

      .v4-config-sidebar {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--v4-glass-bg, rgba(30, 30, 30, 0.7));
        backdrop-filter: var(--v4-glass-blur, blur(12px));
        -webkit-backdrop-filter: var(--v4-glass-blur, blur(12px));
        border-right: 1px solid var(--v4-glass-border, rgba(255, 255, 255, 0.1));
      }

      /* Sidebar Header */
      .v4-sidebar-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        border-bottom: 1px solid var(--v4-glass-border, rgba(255, 255, 255, 0.1));
      }

      .v4-sidebar-title {
        font-weight: 600;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: var(--theme-text, #e0e0e0);
      }

      .v4-sidebar-collapse {
        display: none;
        width: 28px;
        height: 28px;
        padding: 0;
        border: none;
        border-radius: 4px;
        background: transparent;
        color: var(--theme-text-muted, #a0a0a0);
        cursor: pointer;
        font-size: 18px;
        line-height: 1;
      }

      .v4-sidebar-collapse:hover {
        background: rgba(255, 255, 255, 0.1);
        color: var(--theme-text, #e0e0e0);
      }

      /* Sidebar Content */
      .v4-sidebar-content {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        scrollbar-width: thin;
      }

      .v4-sidebar-content::-webkit-scrollbar {
        width: 6px;
      }

      .v4-sidebar-content::-webkit-scrollbar-track {
        background: transparent;
      }

      .v4-sidebar-content::-webkit-scrollbar-thumb {
        background: var(--theme-border, rgba(255, 255, 255, 0.2));
        border-radius: 3px;
      }

      /* Config Group */
      .config-group {
        margin-bottom: 24px;
      }

      .config-label {
        font-size: 12px;
        color: var(--theme-text-muted, #a0a0a0);
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 12px;
      }

      /* Config Row (for toggle switches) */
      .config-row {
        margin-bottom: 12px;
      }

      /* Config Description (for explanatory text below toggles) */
      .config-description {
        font-size: 11px;
        color: var(--theme-text-muted, #888888);
        margin-top: 4px;
        line-height: 1.4;
      }

      /* Collapsible header styles */
      .config-label-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
        user-select: none;
        padding: 4px 0;
        margin-bottom: 8px;
        border-radius: 4px;
        transition: background-color 150ms ease;
      }

      .config-label-header:hover {
        background-color: rgba(255, 255, 255, 0.05);
      }

      .config-label-header .config-label {
        margin-bottom: 0;
      }

      .collapse-icon {
        font-size: 10px;
        color: var(--theme-text-muted, #888888);
        transition: transform 150ms ease;
        margin-right: 4px;
      }

      .collapse-icon.collapsed {
        transform: rotate(180deg);
      }

      /* Collapsible content */
      .config-group-content {
        overflow: hidden;
        max-height: 500px;
        transition:
          max-height 200ms ease-out,
          opacity 150ms ease;
        opacity: 1;
      }

      .config-group-content.collapsed {
        max-height: 0;
        opacity: 0;
        pointer-events: none;
      }

      /* Market config section - match display-options group gap */
      .market-config {
        margin-top: var(--v4-display-options-group-gap, 20px);
      }

      /* Select Dropdown */
      .config-select {
        width: 100%;
        padding: 10px 12px;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid var(--v4-glass-border, rgba(255, 255, 255, 0.1));
        color: var(--theme-text, #e0e0e0);
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        margin-bottom: 8px;
      }

      .config-select:focus {
        outline: 2px solid var(--theme-primary, #d4af37);
        outline-offset: 1px;
      }

      .config-select option {
        background: var(--theme-card-background, #2a2a2a);
        color: var(--theme-text, #e0e0e0);
      }

      /* Slider wrapper */
      .slider-wrapper {
        margin-bottom: 16px;
      }

      /* Config Section (tool-specific) */
      .config-section {
        display: block;
      }

      .config-section[hidden] {
        display: none;
      }

      /* Mobile Styles */
      @media (max-width: 768px) {
        :host {
          position: fixed;
          top: calc(var(--v4-header-height, 48px) + var(--v4-tool-bar-height, 64px));
          left: 0;
          bottom: 0;
          z-index: 100;
          transform: translateX(-100%);
          transition: transform 0.3s ease-out;
        }

        :host([collapsed='false']),
        :host(:not([collapsed])) {
          transform: translateX(0);
        }

        :host([collapsed]) {
          transform: translateX(-100%);
        }

        .v4-sidebar-collapse {
          display: flex;
          align-items: center;
          justify-content: center;
        }
      }

      /* Reduced motion */
      @media (prefers-reduced-motion: reduce) {
        :host {
          transition: none;
        }
      }
    `,
  ];

  override connectedCallback(): void {
    super.connectedCallback();
    this.loadConfigsFromController();
    this.loadServerData();
  }

  /**
   * Load data centers and worlds for market dropdown
   */
  private async loadServerData(): Promise<void> {
    try {
      const [dcResponse, worldsResponse] = await Promise.all([
        fetch('/json/data-centers.json'),
        fetch('/json/worlds.json'),
      ]);

      if (!dcResponse.ok || !worldsResponse.ok) {
        throw new Error(
          `Failed to load server data: ${dcResponse.status}, ${worldsResponse.status}`
        );
      }

      this.dataCenters = await dcResponse.json();
      this.worlds = await worldsResponse.json();
      logger.info(
        '[ConfigSidebar] Loaded server data:',
        this.dataCenters.length,
        'DCs,',
        this.worlds.length,
        'worlds'
      );
    } catch (error) {
      logger.error('[ConfigSidebar] Error loading server data:', error);
      this.dataCenters = [];
      this.worlds = [];
    }
  }

  /**
   * Load all configs from ConfigController
   */
  private loadConfigsFromController(): void {
    this.configController = ConfigController.getInstance();

    // Load global display options first
    const globalConfig = this.configController.getConfig('global');
    this.globalDisplayOptions = globalConfig.displayOptions || { ...DEFAULT_DISPLAY_OPTIONS };

    this.harmonyConfig = this.configController.getConfig('harmony');
    this.extractorConfig = this.configController.getConfig('extractor');
    this.accessibilityConfig = this.configController.getConfig('accessibility');
    this.comparisonConfig = this.configController.getConfig('comparison');
    this.gradientConfig = this.configController.getConfig('gradient');
    this.mixerConfig = this.configController.getConfig('mixer');
    this.presetsConfig = this.configController.getConfig('presets');
    this.budgetConfig = this.configController.getConfig('budget');
    this.swatchConfig = this.configController.getConfig('swatch');
    this.marketConfig = this.configController.getConfig('market');
  }

  /**
   * Handle config change from any control
   */
  private handleConfigChange<K extends ConfigKey>(tool: K, key: string, value: unknown): void {
    // Update local state based on tool
    switch (tool) {
      case 'harmony':
        this.harmonyConfig = { ...this.harmonyConfig, [key]: value };
        break;
      case 'extractor':
        this.extractorConfig = { ...this.extractorConfig, [key]: value };
        break;
      case 'accessibility':
        this.accessibilityConfig = { ...this.accessibilityConfig, [key]: value };
        break;
      case 'comparison':
        this.comparisonConfig = { ...this.comparisonConfig, [key]: value };
        break;
      case 'gradient':
        this.gradientConfig = { ...this.gradientConfig, [key]: value };
        break;
      case 'mixer':
        this.mixerConfig = { ...this.mixerConfig, [key]: value };
        break;
      case 'presets':
        this.presetsConfig = { ...this.presetsConfig, [key]: value };
        break;
      case 'budget':
        this.budgetConfig = { ...this.budgetConfig, [key]: value };
        break;
      case 'swatch':
        this.swatchConfig = { ...this.swatchConfig, [key]: value };
        break;
      case 'market':
        this.marketConfig = { ...this.marketConfig, [key]: value };
        break;
    }

    // Update ConfigController
    if (this.configController) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // Type assertion needed because computed property keys lose type safety
      (this.configController as any).setConfig(tool, { [key]: value });
    }

    // Emit event for parent components
    this.emit('config-change', { tool, key, value });
  }

  /**
   * Handle collapse button click
   */
  private handleCollapseClick(): void {
    this.emit('sidebar-collapse');
  }

  /**
   * Toggle Market Board section collapsed state
   */
  private toggleMarketBoard(): void {
    this.marketBoardCollapsed = !this.marketBoardCollapsed;
  }

  /**
   * Handle display options change from v4-display-options component.
   * Updates global display options that are shared across all tools.
   */
  private handleDisplayOptionsChange(
    _tool: 'harmony' | 'mixer' | 'gradient' | 'swatch' | 'accessibility' | 'comparison' | 'budget',
    e: CustomEvent<DisplayOptionsChangeDetail>
  ): void {
    const { option, value, allOptions } = e.detail;

    // Update global display options (shared across all tools)
    this.globalDisplayOptions = allOptions;

    // Save to global config via ConfigController
    if (this.configController) {
      (this.configController as ConfigController).setConfig('global', { displayOptions: allOptions });

      // Broadcast to all tools so they pick up the new display options
      const toolsWithDisplayOptions = [
        'harmony',
        'mixer',
        'gradient',
        'swatch',
        'accessibility',
        'comparison',
        'budget',
      ] as const;
      for (const tool of toolsWithDisplayOptions) {
        (this.configController as ConfigController).setConfig(tool, { displayOptions: allOptions });
      }
    }

    // Emit event for parent components
    this.emit('config-change', { tool: 'global', key: `displayOptions.${option}`, value });
  }

  /**
   * Render Harmony Explorer config
   */
  private renderHarmonyConfig(): TemplateResult {
    return html`
      <div class="config-section" ?hidden=${this.activeTool !== 'harmony'}>
        <div class="config-group">
          <div class="config-label">Harmony Type</div>
          <select
            class="config-select"
            .value=${this.harmonyConfig.harmonyType}
            @change=${(e: Event) => {
              const value = (e.target as HTMLSelectElement).value;
              this.handleConfigChange('harmony', 'harmonyType', value);
            }}
          >
            <option value="complementary">Complementary</option>
            <option value="analogous">Analogous</option>
            <option value="triadic">Triadic</option>
            <option value="split-complementary">Split-Complementary</option>
            <option value="tetradic">Tetradic</option>
            <option value="square">Square</option>
            <option value="monochromatic">Monochromatic</option>
            <option value="compound">Compound</option>
            <option value="shades">Shades</option>
          </select>
        </div>

        <div class="config-group">
          <div class="config-label">Matching Algorithm</div>
          <div class="config-row">
            <v4-toggle-switch
              label="Perceptual Matching"
              .checked=${this.harmonyConfig.strictMatching}
              @toggle-change=${(e: CustomEvent<{ checked: boolean }>) =>
                this.handleConfigChange('harmony', 'strictMatching', e.detail.checked)}
            ></v4-toggle-switch>
          </div>
          <div class="config-description">
            ${this.harmonyConfig.strictMatching
              ? 'Uses DeltaE for perceptually accurate color matching'
              : 'Uses hue angles for artistic color harmony'}
          </div>
        </div>

        <v4-display-options
          .showHex=${this.globalDisplayOptions.showHex}
          .showRgb=${this.globalDisplayOptions.showRgb}
          .showHsv=${this.globalDisplayOptions.showHsv}
          .showLab=${this.globalDisplayOptions.showLab}
          .showPrice=${this.globalDisplayOptions.showPrice}
          .showDeltaE=${this.globalDisplayOptions.showDeltaE}
          .showAcquisition=${this.globalDisplayOptions.showAcquisition}
          .visibleGroups=${['colorFormats', 'resultMetadata']}
          @display-options-change=${(e: CustomEvent<DisplayOptionsChangeDetail>) =>
            this.handleDisplayOptionsChange('harmony', e)}
        ></v4-display-options>
      </div>
    `;
  }

  /**
   * Render Palette Extractor config
   */
  private renderExtractorConfig(): TemplateResult {
    return html`
      <div class="config-section" ?hidden=${this.activeTool !== 'extractor'}>
        <div class="config-group">
          <div class="config-label">Extraction Settings</div>
          <div class="config-row">
            <v4-toggle-switch
              label="Vibrancy Boost"
              .checked=${this.extractorConfig.vibrancyBoost}
              @toggle-change=${(e: CustomEvent<{ checked: boolean }>) =>
                this.handleConfigChange('extractor', 'vibrancyBoost', e.detail.checked)}
            ></v4-toggle-switch>
          </div>
          <div class="slider-wrapper">
            <v4-range-slider
              label="Max Colors"
              .value=${this.extractorConfig.maxColors}
              .min=${3}
              .max=${10}
              @slider-change=${(e: CustomEvent<{ value: number }>) =>
                this.handleConfigChange('extractor', 'maxColors', e.detail.value)}
            ></v4-range-slider>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render Accessibility Checker config
   */
  private renderAccessibilityConfig(): TemplateResult {
    return html`
      <div class="config-section" ?hidden=${this.activeTool !== 'accessibility'}>
        <div class="config-group">
          <div class="config-label">Vision Types</div>
          <div class="config-row">
            <v4-toggle-switch
              label="Deuteranopia"
              .checked=${this.accessibilityConfig.deuteranopia}
              @toggle-change=${(e: CustomEvent<{ checked: boolean }>) =>
                this.handleConfigChange('accessibility', 'deuteranopia', e.detail.checked)}
            ></v4-toggle-switch>
          </div>
          <div class="config-row">
            <v4-toggle-switch
              label="Protanopia"
              .checked=${this.accessibilityConfig.protanopia}
              @toggle-change=${(e: CustomEvent<{ checked: boolean }>) =>
                this.handleConfigChange('accessibility', 'protanopia', e.detail.checked)}
            ></v4-toggle-switch>
          </div>
          <div class="config-row">
            <v4-toggle-switch
              label="Tritanopia"
              .checked=${this.accessibilityConfig.tritanopia}
              @toggle-change=${(e: CustomEvent<{ checked: boolean }>) =>
                this.handleConfigChange('accessibility', 'tritanopia', e.detail.checked)}
            ></v4-toggle-switch>
          </div>
          <div class="config-row">
            <v4-toggle-switch
              label="Achromatopsia"
              .checked=${this.accessibilityConfig.achromatopsia}
              @toggle-change=${(e: CustomEvent<{ checked: boolean }>) =>
                this.handleConfigChange('accessibility', 'achromatopsia', e.detail.checked)}
            ></v4-toggle-switch>
          </div>
        </div>

        <div class="config-group">
          <div class="config-label">Simulation Display</div>
          <div class="config-row">
            <v4-toggle-switch
              label="Show Labels"
              .checked=${this.accessibilityConfig.showLabels}
              @toggle-change=${(e: CustomEvent<{ checked: boolean }>) =>
                this.handleConfigChange('accessibility', 'showLabels', e.detail.checked)}
            ></v4-toggle-switch>
          </div>
          <div class="config-row">
            <v4-toggle-switch
              label="Show Hex Values"
              .checked=${this.accessibilityConfig.showHexValues}
              @toggle-change=${(e: CustomEvent<{ checked: boolean }>) =>
                this.handleConfigChange('accessibility', 'showHexValues', e.detail.checked)}
            ></v4-toggle-switch>
          </div>
          <div class="config-row">
            <v4-toggle-switch
              label="High Contrast Mode"
              .checked=${this.accessibilityConfig.highContrastMode}
              @toggle-change=${(e: CustomEvent<{ checked: boolean }>) =>
                this.handleConfigChange('accessibility', 'highContrastMode', e.detail.checked)}
            ></v4-toggle-switch>
          </div>
        </div>

        <v4-display-options
          .showHex=${this.globalDisplayOptions.showHex}
          .showRgb=${this.globalDisplayOptions.showRgb}
          .showHsv=${this.globalDisplayOptions.showHsv}
          .showLab=${this.globalDisplayOptions.showLab}
          .showPrice=${this.globalDisplayOptions.showPrice}
          .showDeltaE=${this.globalDisplayOptions.showDeltaE}
          .showAcquisition=${this.globalDisplayOptions.showAcquisition}
          .visibleGroups=${['colorFormats']}
          @display-options-change=${(e: CustomEvent<DisplayOptionsChangeDetail>) =>
            this.handleDisplayOptionsChange('accessibility', e)}
        ></v4-display-options>
      </div>
    `;
  }

  /**
   * Render Dye Comparison config
   */
  private renderComparisonConfig(): TemplateResult {
    return html`
      <div class="config-section" ?hidden=${this.activeTool !== 'comparison'}>
        <div class="config-group">
          <div class="config-label">Display Options</div>
          <div class="config-row">
            <v4-toggle-switch
              label="Show Delta-E"
              .checked=${this.comparisonConfig.showDeltaE}
              @toggle-change=${(e: CustomEvent<{ checked: boolean }>) =>
                this.handleConfigChange('comparison', 'showDeltaE', e.detail.checked)}
            ></v4-toggle-switch>
          </div>
          <div class="config-row">
            <v4-toggle-switch
              label="Show Market Prices"
              .checked=${this.comparisonConfig.showMarketPrices}
              @toggle-change=${(e: CustomEvent<{ checked: boolean }>) =>
                this.handleConfigChange('comparison', 'showMarketPrices', e.detail.checked)}
            ></v4-toggle-switch>
          </div>
        </div>

        <v4-display-options
          .showHex=${this.globalDisplayOptions.showHex}
          .showRgb=${this.globalDisplayOptions.showRgb}
          .showHsv=${this.globalDisplayOptions.showHsv}
          .showLab=${this.globalDisplayOptions.showLab}
          .showPrice=${this.globalDisplayOptions.showPrice}
          .showDeltaE=${this.globalDisplayOptions.showDeltaE}
          .showAcquisition=${this.globalDisplayOptions.showAcquisition}
          .visibleGroups=${['colorFormats']}
          @display-options-change=${(e: CustomEvent<DisplayOptionsChangeDetail>) =>
            this.handleDisplayOptionsChange('comparison', e)}
        ></v4-display-options>
      </div>
    `;
  }

  /**
   * Render Gradient Builder config
   */
  private renderGradientConfig(): TemplateResult {
    return html`
      <div class="config-section" ?hidden=${this.activeTool !== 'gradient'}>
        <div class="config-group">
          <div class="config-label">Gradient Steps</div>
          <div class="slider-wrapper">
            <v4-range-slider
              label="Count"
              .value=${this.gradientConfig.stepCount}
              .min=${3}
              .max=${12}
              @slider-change=${(e: CustomEvent<{ value: number }>) =>
                this.handleConfigChange('gradient', 'stepCount', e.detail.value)}
            ></v4-range-slider>
          </div>
        </div>

        <div class="config-group">
          <div class="config-label">Color Space</div>
          <select
            class="config-select"
            .value=${this.gradientConfig.interpolation}
            @change=${(e: Event) => {
              const value = (e.target as HTMLSelectElement).value;
              this.handleConfigChange('gradient', 'interpolation', value);
            }}
          >
            <option value="hsv">HSV (Hue-based)</option>
            <option value="rgb">RGB (Direct)</option>
          </select>
        </div>

        <v4-display-options
          .showHex=${this.globalDisplayOptions.showHex}
          .showRgb=${this.globalDisplayOptions.showRgb}
          .showHsv=${this.globalDisplayOptions.showHsv}
          .showLab=${this.globalDisplayOptions.showLab}
          .showPrice=${this.globalDisplayOptions.showPrice}
          .showDeltaE=${this.globalDisplayOptions.showDeltaE}
          .showAcquisition=${this.globalDisplayOptions.showAcquisition}
          .visibleGroups=${['colorFormats', 'resultMetadata']}
          @display-options-change=${(e: CustomEvent<DisplayOptionsChangeDetail>) =>
            this.handleDisplayOptionsChange('gradient', e)}
        ></v4-display-options>
      </div>
    `;
  }

  /**
   * Render Dye Mixer config (NEW tool)
   */
  private renderMixerConfig(): TemplateResult {
    return html`
      <div class="config-section" ?hidden=${this.activeTool !== 'mixer'}>
        <div class="config-group">
          <div class="config-label">Result Settings</div>
          <div class="slider-wrapper">
            <v4-range-slider
              label="Max Results"
              .value=${this.mixerConfig.maxResults}
              .min=${3}
              .max=${8}
              @slider-change=${(e: CustomEvent<{ value: number }>) =>
                this.handleConfigChange('mixer', 'maxResults', e.detail.value)}
            ></v4-range-slider>
          </div>
        </div>

        <v4-display-options
          .showHex=${this.globalDisplayOptions.showHex}
          .showRgb=${this.globalDisplayOptions.showRgb}
          .showHsv=${this.globalDisplayOptions.showHsv}
          .showLab=${this.globalDisplayOptions.showLab}
          .showPrice=${this.globalDisplayOptions.showPrice}
          .showDeltaE=${this.globalDisplayOptions.showDeltaE}
          .showAcquisition=${this.globalDisplayOptions.showAcquisition}
          .visibleGroups=${['colorFormats', 'resultMetadata']}
          @display-options-change=${(e: CustomEvent<DisplayOptionsChangeDetail>) =>
            this.handleDisplayOptionsChange('mixer', e)}
        ></v4-display-options>
      </div>
    `;
  }

  /**
   * Render Community Presets config
   */
  private renderPresetsConfig(): TemplateResult {
    return html`
      <div class="config-section" ?hidden=${this.activeTool !== 'presets'}>
        <div class="config-group">
          <div class="config-label">Display Options</div>
          <div class="config-row">
            <v4-toggle-switch
              label="Show My Presets Only"
              .checked=${this.presetsConfig.showMyPresetsOnly}
              @toggle-change=${(e: CustomEvent<{ checked: boolean }>) =>
                this.handleConfigChange('presets', 'showMyPresetsOnly', e.detail.checked)}
            ></v4-toggle-switch>
          </div>
          <div class="config-row">
            <v4-toggle-switch
              label="Show Favorites"
              .checked=${this.presetsConfig.showFavorites}
              @toggle-change=${(e: CustomEvent<{ checked: boolean }>) =>
                this.handleConfigChange('presets', 'showFavorites', e.detail.checked)}
            ></v4-toggle-switch>
          </div>
        </div>

        <div class="config-group">
          <div class="config-label">Sort By</div>
          <select
            class="config-select"
            .value=${this.presetsConfig.sortBy}
            @change=${(e: Event) => {
              const value = (e.target as HTMLSelectElement).value;
              this.handleConfigChange('presets', 'sortBy', value);
            }}
          >
            <option value="newest">Newest First</option>
            <option value="popular">Most Popular</option>
            <option value="votes">Most Votes</option>
            <option value="alphabetical">Alphabetical</option>
          </select>
        </div>
      </div>
    `;
  }

  /**
   * Render Budget Suggestions config
   */
  private renderBudgetConfig(): TemplateResult {
    return html`
      <div class="config-section" ?hidden=${this.activeTool !== 'budget'}>
        <div class="config-group">
          <div class="config-label">Budget Limit</div>
          <div class="slider-wrapper">
            <v4-range-slider
              label="Max Price"
              .value=${this.budgetConfig.maxPrice}
              .min=${0}
              .max=${200000}
              .step=${5000}
              .valueFormatter=${(v: number) => `${v.toLocaleString()} gil`}
              @slider-change=${(e: CustomEvent<{ value: number }>) =>
                this.handleConfigChange('budget', 'maxPrice', e.detail.value)}
            ></v4-range-slider>
          </div>
          <div class="slider-wrapper">
            <v4-range-slider
              label="Max Results"
              .value=${this.budgetConfig.maxResults}
              .min=${1}
              .max=${20}
              @slider-change=${(e: CustomEvent<{ value: number }>) =>
                this.handleConfigChange('budget', 'maxResults', e.detail.value)}
            ></v4-range-slider>
          </div>
        </div>

        <div class="config-group">
          <div class="config-label">Color Distance</div>
          <div class="slider-wrapper">
            <v4-range-slider
              label="Max Delta-E"
              .value=${this.budgetConfig.maxDeltaE}
              .min=${0}
              .max=${100}
              @slider-change=${(e: CustomEvent<{ value: number }>) =>
                this.handleConfigChange('budget', 'maxDeltaE', e.detail.value)}
            ></v4-range-slider>
          </div>
        </div>

        <v4-display-options
          .showHex=${this.globalDisplayOptions.showHex}
          .showRgb=${this.globalDisplayOptions.showRgb}
          .showHsv=${this.globalDisplayOptions.showHsv}
          .showLab=${this.globalDisplayOptions.showLab}
          .showDeltaE=${this.globalDisplayOptions.showDeltaE}
          .showAcquisition=${this.globalDisplayOptions.showAcquisition}
          .visibleGroups=${['colorFormats']}
          @display-options-change=${(e: CustomEvent<DisplayOptionsChangeDetail>) =>
            this.handleDisplayOptionsChange('budget', e)}
        ></v4-display-options>
      </div>
    `;
  }

  /**
   * Check if current color sheet requires race/gender selection
   */
  private isRaceSpecificColorSheet(): boolean {
    return (
      this.swatchConfig.colorSheet === 'hairColors' || this.swatchConfig.colorSheet === 'skinColors'
    );
  }

  /**
   * Render Swatch Matcher config
   */
  private renderSwatchConfig(): TemplateResult {
    const showCharacterSection = this.isRaceSpecificColorSheet();

    return html`
      <div class="config-section" ?hidden=${this.activeTool !== 'swatch'}>
        <div class="config-group">
          <div class="config-label">Color Sheet</div>
          <select
            class="config-select"
            .value=${this.swatchConfig.colorSheet}
            @change=${(e: Event) => {
              const value = (e.target as HTMLSelectElement).value;
              this.handleConfigChange('swatch', 'colorSheet', value);
            }}
          >
            <option value="eyeColors">Eye Colors</option>
            <option value="hairColors">Hair Colors</option>
            <option value="skinColors">Skin Colors</option>
            <option value="highlightColors">Highlight Colors</option>
            <option value="lipColorsDark">Lip Colors (Dark)</option>
            <option value="lipColorsLight">Lip Colors (Light)</option>
            <option value="tattooColors">Tattoo/Limbal Colors</option>
            <option value="facePaintColorsDark">Face Paint (Dark)</option>
            <option value="facePaintColorsLight">Face Paint (Light)</option>
          </select>
        </div>

        <div class="config-group" ?hidden=${!showCharacterSection}>
          <div class="config-label">Character</div>
          <select
            class="config-select"
            .value=${this.swatchConfig.race}
            @change=${(e: Event) => {
              const value = (e.target as HTMLSelectElement).value;
              this.handleConfigChange('swatch', 'race', value);
            }}
          >
            <optgroup label="Hyur">
              <option value="Midlander">Midlander</option>
              <option value="Highlander">Highlander</option>
            </optgroup>
            <optgroup label="Elezen">
              <option value="Wildwood">Wildwood</option>
              <option value="Duskwight">Duskwight</option>
            </optgroup>
            <optgroup label="Lalafell">
              <option value="Plainsfolk">Plainsfolk</option>
              <option value="Dunesfolk">Dunesfolk</option>
            </optgroup>
            <optgroup label="Miqo'te">
              <option value="SeekerOfTheSun">Seeker of the Sun</option>
              <option value="KeeperOfTheMoon">Keeper of the Moon</option>
            </optgroup>
            <optgroup label="Roegadyn">
              <option value="SeaWolf">Sea Wolf</option>
              <option value="Hellsguard">Hellsguard</option>
            </optgroup>
            <optgroup label="Au Ra">
              <option value="Raen">Raen</option>
              <option value="Xaela">Xaela</option>
            </optgroup>
            <optgroup label="Hrothgar">
              <option value="Helion">Helion</option>
              <option value="TheLost">The Lost</option>
            </optgroup>
            <optgroup label="Viera">
              <option value="Rava">Rava</option>
              <option value="Veena">Veena</option>
            </optgroup>
          </select>
          <select
            class="config-select"
            .value=${this.swatchConfig.gender}
            @change=${(e: Event) => {
              const value = (e.target as HTMLSelectElement).value;
              this.handleConfigChange('swatch', 'gender', value);
            }}
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>

        <div class="config-group">
          <div class="config-label">Search Settings</div>
          <div class="slider-wrapper">
            <v4-range-slider
              label="Max Results"
              .value=${this.swatchConfig.maxResults}
              .min=${1}
              .max=${6}
              @slider-change=${(e: CustomEvent<{ value: number }>) =>
                this.handleConfigChange('swatch', 'maxResults', e.detail.value)}
            ></v4-range-slider>
          </div>
        </div>

        <div class="config-group">
          <div class="config-label">Display Options</div>
          <v4-display-options
            .showHex=${this.globalDisplayOptions.showHex}
            .showRgb=${this.globalDisplayOptions.showRgb}
            .showHsv=${this.globalDisplayOptions.showHsv}
            .showLab=${this.globalDisplayOptions.showLab}
            .showPrice=${this.globalDisplayOptions.showPrice}
            .showDeltaE=${this.globalDisplayOptions.showDeltaE}
            .showAcquisition=${this.globalDisplayOptions.showAcquisition}
            .visibleGroups=${['colorFormats', 'resultMetadata']}
            @display-options-change=${(e: CustomEvent<DisplayOptionsChangeDetail>) =>
              this.handleDisplayOptionsChange('swatch', e)}
          ></v4-display-options>
        </div>
      </div>
    `;
  }

  /**
   * Check if current tool supports market data
   */
  private toolSupportsMarket(): boolean {
    return ['harmony', 'comparison', 'budget', 'mixer', 'extractor', 'gradient'].includes(
      this.activeTool
    );
  }

  /**
   * Render Market Board config (shown for tools that support market data)
   */
  private renderMarketConfig(): TemplateResult {
    // Only show for tools that support market data
    if (!this.toolSupportsMarket()) {
      return html``;
    }

    // Sort data centers alphabetically
    const sortedDataCenters = [...this.dataCenters].sort((a, b) => a.name.localeCompare(b.name));

    return html`
      <div class="config-section market-config">
        <div class="config-group">
          <div
            class="config-label-header"
            @click=${this.toggleMarketBoard}
            role="button"
            aria-expanded=${!this.marketBoardCollapsed}
            tabindex="0"
            @keydown=${(e: KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggleMarketBoard();
              }
            }}
          >
            <div class="config-label">Market Board</div>
            <span class="collapse-icon ${this.marketBoardCollapsed ? 'collapsed' : ''}"
              >${this.marketBoardCollapsed ? '▼' : '▲'}</span
            >
          </div>
          <div class="config-group-content ${this.marketBoardCollapsed ? 'collapsed' : ''}">
            <div class="config-row">
              <v4-toggle-switch
                label="Enable Market Board"
                .checked=${this.marketConfig.showPrices}
                @toggle-change=${(e: CustomEvent<{ checked: boolean }>) =>
                  this.handleConfigChange('market', 'showPrices', e.detail.checked)}
              ></v4-toggle-switch>
            </div>
            <select
              class="config-select"
              .value=${this.marketConfig.selectedServer}
              ?disabled=${this.dataCenters.length === 0}
              @change=${(e: Event) => {
                const value = (e.target as HTMLSelectElement).value;
                this.handleConfigChange('market', 'selectedServer', value);
              }}
            >
              ${this.dataCenters.length === 0
                ? html`<option value="Crystal">Loading servers...</option>`
                : sortedDataCenters.map(
                    (dc) => html`
                      <optgroup label="${dc.name} (${dc.region})">
                        <option
                          value="${dc.name}"
                          ?selected=${this.marketConfig.selectedServer === dc.name}
                        >
                          ${dc.name} - All Worlds
                        </option>
                        ${this.worlds
                          .filter((w) => dc.worlds.includes(w.id))
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map(
                            (world) => html`
                              <option
                                value="${world.name}"
                                ?selected=${this.marketConfig.selectedServer === world.name}
                              >
                                &nbsp;&nbsp;${world.name}
                              </option>
                            `
                          )}
                      </optgroup>
                    `
                  )}
            </select>
            <div class="config-description">
              Prices fetched from Universalis for ${this.marketConfig.selectedServer}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  protected override render(): TemplateResult {
    return html`
      <aside class="v4-config-sidebar" role="complementary" aria-label="Tool configuration">
        <!-- Sidebar Header -->
        <header class="v4-sidebar-header">
          <span class="v4-sidebar-title">Configuration</span>
          <button
            class="v4-sidebar-collapse"
            type="button"
            title="Close sidebar"
            aria-label="Close sidebar"
            @click=${this.handleCollapseClick}
          >
            ×
          </button>
        </header>

        <!-- Sidebar Content -->
        <div class="v4-sidebar-content">
          ${this.renderHarmonyConfig()} ${this.renderExtractorConfig()}
          ${this.renderAccessibilityConfig()} ${this.renderComparisonConfig()}
          ${this.renderGradientConfig()} ${this.renderMixerConfig()} ${this.renderPresetsConfig()}
          ${this.renderBudgetConfig()} ${this.renderSwatchConfig()} ${this.renderMarketConfig()}
        </div>
      </aside>
    `;
  }
}

// TypeScript declaration for custom element
declare global {
  interface HTMLElementTagNameMap {
    'v4-config-sidebar': ConfigSidebar;
  }
}
