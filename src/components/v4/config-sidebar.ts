/**
 * XIV Dye Tools v4.0 - Config Sidebar Component
 *
 * 320px glassmorphism sidebar containing all tool configurations.
 * Uses all-in-one approach: contains all configs internally,
 * shows/hides sections based on activeTool property.
 *
 * Note: Config controls are visual placeholders in Phase 4.
 * Actual data binding will be wired up in Phase 6 tool migration.
 *
 * @module components/v4/config-sidebar
 */

import { html, css, CSSResultGroup, TemplateResult, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { BaseLitComponent } from './base-lit-component';
import type { ToolId } from '@services/router-service';

/**
 * V4 Config Sidebar - Tool configuration panel
 *
 * @fires sidebar-collapse - When collapse button is clicked (mobile)
 * @fires config-change - When any config value changes, with detail: { tool, key, value }
 *
 * @example
 * ```html
 * <v4-config-sidebar
 *   .activeTool=${'harmony'}
 *   .collapsed=${false}
 *   @sidebar-collapse=${this.handleCollapse}
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

  /**
   * Internal state for theme selection (placeholder)
   */
  @state()
  private selectedTheme = '';

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

      /* Config Control */
      .config-control {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid var(--v4-glass-border, rgba(255, 255, 255, 0.1));
        border-radius: 6px;
        padding: 12px;
        color: var(--theme-text, #e0e0e0);
        width: 100%;
        margin-bottom: 8px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: background var(--v4-transition-fast, 150ms);
      }

      .config-control:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      .config-control-column {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
      }

      /* Select Dropdown */
      .config-select {
        width: 100%;
        padding: 8px 12px;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid var(--v4-glass-border, rgba(255, 255, 255, 0.1));
        color: var(--theme-text, #e0e0e0);
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
      }

      .config-select:focus {
        outline: 2px solid var(--theme-primary, #d4af37);
        outline-offset: 1px;
      }

      /* Toggle Switch */
      .toggle-switch {
        width: 36px;
        height: 20px;
        background: #333;
        border-radius: 10px;
        position: relative;
        cursor: pointer;
        flex-shrink: 0;
        transition: background var(--v4-transition-fast, 150ms);
      }

      .toggle-switch::after {
        content: '';
        position: absolute;
        top: 2px;
        left: 2px;
        width: 16px;
        height: 16px;
        background: #fff;
        border-radius: 50%;
        transition: transform var(--v4-transition-fast, 150ms);
      }

      .toggle-switch.active {
        background: var(--theme-primary, #d4af37);
      }

      .toggle-switch.active::after {
        transform: translateX(16px);
      }

      /* Range Slider */
      .config-slider {
        width: 100%;
        height: 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
        outline: none;
        -webkit-appearance: none;
        appearance: none;
      }

      .config-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 16px;
        height: 16px;
        background: var(--theme-primary, #d4af37);
        border-radius: 50%;
        cursor: pointer;
      }

      .config-slider::-moz-range-thumb {
        width: 16px;
        height: 16px;
        background: var(--theme-primary, #d4af37);
        border-radius: 50%;
        cursor: pointer;
        border: none;
      }

      .slider-header {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        color: var(--theme-text-muted, #a0a0a0);
      }

      .slider-value {
        font-weight: 600;
        color: var(--theme-text, #e0e0e0);
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
        .toggle-switch,
        .toggle-switch::after,
        .config-control {
          transition: none;
        }
      }
    `,
  ];

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
          <div class="config-control config-control-column">
            <select
              class="config-select"
              .value=${this.selectedTheme}
              @change=${(e: Event) => {
                this.selectedTheme = (e.target as HTMLSelectElement).value;
                this.emit('config-change', {
                  tool: 'global',
                  key: 'theme',
                  value: this.selectedTheme,
                });
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
          <div class="config-control">
            <span>Tetradic</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 10l5 5 5-5z" />
            </svg>
          </div>
        </div>

        <div class="config-group">
          <div class="config-label">Display Options</div>
          <div class="config-control">
            <span>Color Names</span>
            <div class="toggle-switch active"></div>
          </div>
          <div class="config-control">
            <span>Hex Codes</span>
            <div class="toggle-switch active"></div>
          </div>
          <div class="config-control">
            <span>RGB Values</span>
            <div class="toggle-switch"></div>
          </div>
          <div class="config-control">
            <span>HSV Values</span>
            <div class="toggle-switch active"></div>
          </div>
        </div>

        <div class="config-group">
          <div class="config-label">Filters</div>
          <div class="config-control">
            <span>Strict Matching</span>
            <div class="toggle-switch"></div>
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
          <div class="config-control">
            <span>Vibrancy Boost</span>
            <div class="toggle-switch active"></div>
          </div>
          <div class="config-control config-control-column">
            <div class="slider-header">
              <span>Max Colors</span>
              <span class="slider-value">8</span>
            </div>
            <input type="range" class="config-slider" min="3" max="10" value="8" />
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
          <div class="config-control">
            <span>Normal Vision</span>
            <div class="toggle-switch active"></div>
          </div>
          <div class="config-control">
            <span>Deuteranopia</span>
            <div class="toggle-switch active"></div>
          </div>
          <div class="config-control">
            <span>Protanopia</span>
            <div class="toggle-switch active"></div>
          </div>
          <div class="config-control">
            <span>Tritanopia</span>
            <div class="toggle-switch active"></div>
          </div>
          <div class="config-control">
            <span>Achromatopsia</span>
            <div class="toggle-switch active"></div>
          </div>
        </div>

        <div class="config-group">
          <div class="config-label">Display Options</div>
          <div class="config-control">
            <span>Show Labels</span>
            <div class="toggle-switch active"></div>
          </div>
          <div class="config-control">
            <span>Show Hex Values</span>
            <div class="toggle-switch"></div>
          </div>
          <div class="config-control">
            <span>High Contrast Mode</span>
            <div class="toggle-switch"></div>
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
          <div class="config-control">
            <span>Show Delta-E</span>
            <div class="toggle-switch active"></div>
          </div>
          <div class="config-control">
            <span>Show RGB</span>
            <div class="toggle-switch active"></div>
          </div>
          <div class="config-control">
            <span>Show HSV</span>
            <div class="toggle-switch"></div>
          </div>
          <div class="config-control">
            <span>Show Market Prices</span>
            <div class="toggle-switch active"></div>
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
          <div class="config-control config-control-column">
            <div class="slider-header">
              <span>Count</span>
              <span class="slider-value">8</span>
            </div>
            <input type="range" class="config-slider" min="3" max="12" value="8" />
          </div>
        </div>

        <div class="config-group">
          <div class="config-label">Interpolation</div>
          <div class="config-control">
            <span>Linear</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 10l5 5 5-5z" />
            </svg>
          </div>
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
          <div class="config-control config-control-column">
            <div class="slider-header">
              <span>Max Results</span>
              <span class="slider-value">3</span>
            </div>
            <input type="range" class="config-slider" min="3" max="8" value="3" />
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
          <div class="config-control">
            <span>Show My Presets Only</span>
            <div class="toggle-switch"></div>
          </div>
          <div class="config-control">
            <span>Show Favorites</span>
            <div class="toggle-switch"></div>
          </div>
        </div>

        <div class="config-group">
          <div class="config-label">Sort By</div>
          <div class="config-control">
            <span>Newest First</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 10l5 5 5-5z" />
            </svg>
          </div>
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
          <div class="config-control config-control-column">
            <div class="slider-header">
              <span>Max Price</span>
              <span class="slider-value">200,000 gil</span>
            </div>
            <input
              type="range"
              class="config-slider"
              min="0"
              max="200000"
              step="5000"
              value="200000"
            />
          </div>
          <div class="config-control config-control-column">
            <div class="slider-header">
              <span>Max Results</span>
              <span class="slider-value">8</span>
            </div>
            <input type="range" class="config-slider" min="1" max="20" value="8" />
          </div>
        </div>

        <div class="config-group">
          <div class="config-label">Color Distance</div>
          <div class="config-control config-control-column">
            <div class="slider-header">
              <span>Max Delta-E</span>
              <span class="slider-value">75</span>
            </div>
            <input type="range" class="config-slider" min="0" max="100" value="75" />
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
          <div class="config-control config-control-column">
            <select class="config-select">
              <option selected>EyeColors.csv</option>
              <option disabled>HairColors.csv (N/A)</option>
              <option disabled>SkinColors.csv (N/A)</option>
            </select>
          </div>
        </div>

        <div class="config-group">
          <div class="config-label">Character</div>
          <div class="config-control config-control-column">
            <span style="font-size: 11px; color: var(--theme-text-muted);">Race</span>
            <select class="config-select">
              <option selected>Hyur (Midlander)</option>
              <option>Hyur (Highlander)</option>
              <option>Elezen</option>
              <option>Lalafell</option>
              <option>Miqo'te</option>
              <option>Roegadyn</option>
              <option>Au Ra</option>
              <option>Hrothgar</option>
              <option>Viera</option>
            </select>
          </div>
          <div class="config-control config-control-column">
            <span style="font-size: 11px; color: var(--theme-text-muted);">Gender</span>
            <select class="config-select">
              <option selected>Male</option>
              <option>Female</option>
            </select>
          </div>
        </div>

        <div class="config-group">
          <div class="config-label">Search Settings</div>
          <div class="config-control config-control-column">
            <div class="slider-header">
              <span>Max Results</span>
              <span class="slider-value">3</span>
            </div>
            <input type="range" class="config-slider" min="1" max="8" value="3" />
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
