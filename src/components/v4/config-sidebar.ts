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
  GlobalConfig,
  ConfigKey,
} from '@shared/tool-config-types';

// Import child components to ensure registration
import './toggle-switch-v4';
import './range-slider-v4';

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

  @state() private globalConfig: GlobalConfig = { theme: '' };
  @state() private harmonyConfig: HarmonyConfig = {
    harmonyType: 'tetradic',
    showNames: true,
    showHex: true,
    showRgb: false,
    showHsv: true,
    strictMatching: false,
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
  };
  @state() private comparisonConfig: ComparisonConfig = {
    showDeltaE: true,
    showRgb: true,
    showHsv: false,
    showMarketPrices: true,
  };
  @state() private gradientConfig: GradientConfig = {
    stepCount: 8,
    interpolation: 'linear',
  };
  @state() private mixerConfig: MixerConfig = {
    maxResults: 3,
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
  };
  @state() private swatchConfig: SwatchConfig = {
    colorSheet: 'EyeColors.csv',
    race: 'Hyur (Midlander)',
    gender: 'Male',
    maxResults: 3,
  };

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
  }

  /**
   * Load all configs from ConfigController
   */
  private loadConfigsFromController(): void {
    this.configController = ConfigController.getInstance();

    this.globalConfig = this.configController.getConfig('global');
    this.harmonyConfig = this.configController.getConfig('harmony');
    this.extractorConfig = this.configController.getConfig('extractor');
    this.accessibilityConfig = this.configController.getConfig('accessibility');
    this.comparisonConfig = this.configController.getConfig('comparison');
    this.gradientConfig = this.configController.getConfig('gradient');
    this.mixerConfig = this.configController.getConfig('mixer');
    this.presetsConfig = this.configController.getConfig('presets');
    this.budgetConfig = this.configController.getConfig('budget');
    this.swatchConfig = this.configController.getConfig('swatch');
  }

  /**
   * Handle config change from any control
   */
  private handleConfigChange<K extends ConfigKey>(
    tool: K,
    key: string,
    value: unknown,
  ): void {
    // Update local state based on tool
    switch (tool) {
      case 'global':
        this.globalConfig = { ...this.globalConfig, [key]: value };
        break;
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
   * Render the global config section (always visible)
   */
  private renderGlobalConfig(): TemplateResult {
    return html`
      <div class="config-section config-global">
        <div class="config-group">
          <div class="config-label">Theme</div>
          <select
            class="config-select"
            .value=${this.globalConfig.theme}
            @change=${(e: Event) => {
              const value = (e.target as HTMLSelectElement).value;
              this.handleConfigChange('global', 'theme', value);
            }}
          >
            <option value="">Default (Premium Dark)</option>
            <option value="standard-light">Standard Light</option>
            <option value="standard-dark">Standard Dark</option>
            <option value="hydaelyn-light">Hydaelyn</option>
            <option value="og-classic-dark">OG Classic</option>
            <option value="parchment-light">Parchment</option>
            <option value="cotton-candy">Cotton Candy</option>
            <option value="sugar-riot">Sugar Riot</option>
            <option value="grayscale-dark">Grayscale</option>
            <option value="high-contrast-light">High Contrast Light</option>
            <option value="high-contrast-dark">High Contrast Dark</option>
          </select>
        </div>
      </div>
    `;
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
          <div class="config-label">Display Options</div>
          <div class="config-row">
            <v4-toggle-switch
              label="Color Names"
              .checked=${this.harmonyConfig.showNames}
              @toggle-change=${(e: CustomEvent<{ checked: boolean }>) =>
                this.handleConfigChange('harmony', 'showNames', e.detail.checked)}
            ></v4-toggle-switch>
          </div>
          <div class="config-row">
            <v4-toggle-switch
              label="Hex Codes"
              .checked=${this.harmonyConfig.showHex}
              @toggle-change=${(e: CustomEvent<{ checked: boolean }>) =>
                this.handleConfigChange('harmony', 'showHex', e.detail.checked)}
            ></v4-toggle-switch>
          </div>
          <div class="config-row">
            <v4-toggle-switch
              label="RGB Values"
              .checked=${this.harmonyConfig.showRgb}
              @toggle-change=${(e: CustomEvent<{ checked: boolean }>) =>
                this.handleConfigChange('harmony', 'showRgb', e.detail.checked)}
            ></v4-toggle-switch>
          </div>
          <div class="config-row">
            <v4-toggle-switch
              label="HSV Values"
              .checked=${this.harmonyConfig.showHsv}
              @toggle-change=${(e: CustomEvent<{ checked: boolean }>) =>
                this.handleConfigChange('harmony', 'showHsv', e.detail.checked)}
            ></v4-toggle-switch>
          </div>
        </div>

        <div class="config-group">
          <div class="config-label">Filters</div>
          <div class="config-row">
            <v4-toggle-switch
              label="Strict Matching"
              .checked=${this.harmonyConfig.strictMatching}
              @toggle-change=${(e: CustomEvent<{ checked: boolean }>) =>
                this.handleConfigChange('harmony', 'strictMatching', e.detail.checked)}
            ></v4-toggle-switch>
          </div>
        </div>
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
              label="Normal Vision"
              .checked=${this.accessibilityConfig.normalVision}
              @toggle-change=${(e: CustomEvent<{ checked: boolean }>) =>
                this.handleConfigChange('accessibility', 'normalVision', e.detail.checked)}
            ></v4-toggle-switch>
          </div>
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
          <div class="config-label">Display Options</div>
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
              label="Show RGB"
              .checked=${this.comparisonConfig.showRgb}
              @toggle-change=${(e: CustomEvent<{ checked: boolean }>) =>
                this.handleConfigChange('comparison', 'showRgb', e.detail.checked)}
            ></v4-toggle-switch>
          </div>
          <div class="config-row">
            <v4-toggle-switch
              label="Show HSV"
              .checked=${this.comparisonConfig.showHsv}
              @toggle-change=${(e: CustomEvent<{ checked: boolean }>) =>
                this.handleConfigChange('comparison', 'showHsv', e.detail.checked)}
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
      </div>
    `;
  }

  /**
   * Render Swatch Matcher config
   */
  private renderSwatchConfig(): TemplateResult {
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
            <option value="EyeColors.csv">Eye Colors</option>
            <option value="HairColors.csv" disabled>Hair Colors (N/A)</option>
            <option value="SkinColors.csv" disabled>Skin Colors (N/A)</option>
          </select>
        </div>

        <div class="config-group">
          <div class="config-label">Character</div>
          <select
            class="config-select"
            .value=${this.swatchConfig.race}
            @change=${(e: Event) => {
              const value = (e.target as HTMLSelectElement).value;
              this.handleConfigChange('swatch', 'race', value);
            }}
          >
            <option value="Hyur (Midlander)">Hyur (Midlander)</option>
            <option value="Hyur (Highlander)">Hyur (Highlander)</option>
            <option value="Elezen">Elezen</option>
            <option value="Lalafell">Lalafell</option>
            <option value="Miqo'te">Miqo'te</option>
            <option value="Roegadyn">Roegadyn</option>
            <option value="Au Ra">Au Ra</option>
            <option value="Hrothgar">Hrothgar</option>
            <option value="Viera">Viera</option>
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
              .max=${8}
              @slider-change=${(e: CustomEvent<{ value: number }>) =>
                this.handleConfigChange('swatch', 'maxResults', e.detail.value)}
            ></v4-range-slider>
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
          ${this.renderGlobalConfig()}
          ${this.renderHarmonyConfig()}
          ${this.renderExtractorConfig()}
          ${this.renderAccessibilityConfig()}
          ${this.renderComparisonConfig()}
          ${this.renderGradientConfig()}
          ${this.renderMixerConfig()}
          ${this.renderPresetsConfig()}
          ${this.renderBudgetConfig()}
          ${this.renderSwatchConfig()}
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
