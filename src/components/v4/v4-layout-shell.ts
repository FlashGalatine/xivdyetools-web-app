/**
 * XIV Dye Tools v4.0 - Layout Shell Component
 *
 * Main layout orchestrator combining:
 * - V4AppHeader (48px top header)
 * - ToolBanner (64px tool navigation)
 * - ConfigSidebar (320px left sidebar)
 * - Content Area (main slot for tool content)
 *
 * Handles routing subscription and coordinates all child components.
 *
 * @module components/v4/v4-layout-shell
 */

import { html, css, CSSResultGroup, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { BaseLitComponent } from './base-lit-component';
import type { ToolId } from '@services/router-service';

// Import child components to ensure registration
import './v4-app-header';
import './tool-banner';
import './config-sidebar';

/**
 * V4 Layout Shell - Main application layout container
 *
 * @fires tool-change - When active tool changes, with detail: { toolId: ToolId }
 * @fires theme-click - Bubbled from V4AppHeader
 * @fires language-click - Bubbled from V4AppHeader
 * @fires about-click - Bubbled from V4AppHeader
 *
 * @slot - Default slot for tool content
 *
 * @example
 * ```html
 * <v4-layout-shell .activeTool=${'harmony'}>
 *   <harmony-tool></harmony-tool>
 * </v4-layout-shell>
 * ```
 */
@customElement('v4-layout-shell')
export class V4LayoutShell extends BaseLitComponent {
  /**
   * Currently active tool ID
   */
  @property({ type: String, attribute: 'active-tool' })
  activeTool: ToolId = 'harmony';

  /**
   * Whether the sidebar is collapsed (mobile mode)
   */
  @state()
  private sidebarCollapsed = false;

  /**
   * Whether we're in mobile viewport
   */
  @state()
  private isMobile = false;

  /**
   * Media query for mobile detection
   */
  private mobileQuery: MediaQueryList | null = null;

  static override styles: CSSResultGroup = [
    BaseLitComponent.baseStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        height: 100vh;
        width: 100%;
        overflow: hidden;
        background: radial-gradient(
          circle at center,
          var(--v4-gradient-start, #252525) 0%,
          var(--v4-gradient-end, #121212) 100%
        );
      }

      /* Main Layout Container */
      .v4-layout-main {
        display: flex;
        flex: 1;
        overflow: hidden;
        position: relative;
      }

      /* Content Area */
      .v4-layout-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        position: relative;
      }

      /* Content Scroll Container */
      .v4-layout-content-scroll {
        flex: 1;
        overflow-y: auto;
        padding: var(--v4-content-padding, 24px);
        scrollbar-width: thin;
      }

      .v4-layout-content-scroll::-webkit-scrollbar {
        width: 8px;
      }

      .v4-layout-content-scroll::-webkit-scrollbar-track {
        background: transparent;
      }

      .v4-layout-content-scroll::-webkit-scrollbar-thumb {
        background: var(--theme-border, rgba(255, 255, 255, 0.2));
        border-radius: 4px;
      }

      /* Mobile Overlay */
      .v4-sidebar-overlay {
        display: none;
        position: fixed;
        top: calc(var(--v4-header-height, 48px) + var(--v4-tool-bar-height, 64px));
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 99;
        cursor: pointer;
      }

      .v4-sidebar-overlay.visible {
        display: block;
      }

      /* Mobile Toggle Button */
      .v4-mobile-sidebar-toggle {
        display: none;
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        border: none;
        background: var(--theme-primary, #d4af37);
        color: var(--theme-text-on-primary, #000);
        cursor: pointer;
        box-shadow: var(--v4-shadow-soft, 0 4px 6px rgba(0, 0, 0, 0.3)),
          var(--v4-shadow-glow, 0 0 10px rgba(212, 175, 55, 0.2));
        z-index: 100;
        font-size: 24px;
        transition: transform var(--v4-transition-fast, 150ms);
      }

      .v4-mobile-sidebar-toggle:hover {
        transform: scale(1.05);
      }

      .v4-mobile-sidebar-toggle:active {
        transform: scale(0.95);
      }

      /* Mobile Styles */
      @media (max-width: 768px) {
        .v4-mobile-sidebar-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        v4-config-sidebar {
          position: fixed;
          top: calc(var(--v4-header-height, 48px) + var(--v4-tool-bar-height, 64px));
          left: 0;
          bottom: 0;
          z-index: 100;
        }
      }

      /* Reduced motion */
      @media (prefers-reduced-motion: reduce) {
        .v4-mobile-sidebar-toggle {
          transition: none;
        }
        .v4-mobile-sidebar-toggle:hover,
        .v4-mobile-sidebar-toggle:active {
          transform: none;
        }
      }
    `,
  ];

  override connectedCallback(): void {
    super.connectedCallback();

    // Set up mobile detection
    this.mobileQuery = window.matchMedia('(max-width: 768px)');
    this.isMobile = this.mobileQuery.matches;
    this.sidebarCollapsed = this.isMobile;

    // Listen for viewport changes
    this.mobileQuery.addEventListener('change', this.handleMediaQueryChange);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();

    // Clean up media query listener
    this.mobileQuery?.removeEventListener('change', this.handleMediaQueryChange);
  }

  /**
   * Handle media query changes
   */
  private handleMediaQueryChange = (e: MediaQueryListEvent): void => {
    this.isMobile = e.matches;
    // Auto-collapse sidebar on mobile, auto-expand on desktop
    this.sidebarCollapsed = e.matches;
  };

  /**
   * Handle tool selection from ToolBanner
   */
  private handleToolSelect(e: CustomEvent<{ toolId: ToolId }>): void {
    const { toolId } = e.detail;
    if (toolId !== this.activeTool) {
      this.activeTool = toolId;
      this.emit('tool-change', { toolId });

      // Collapse sidebar on mobile after tool selection
      if (this.isMobile) {
        this.sidebarCollapsed = true;
      }
    }
  }

  /**
   * Handle sidebar collapse from ConfigSidebar
   */
  private handleSidebarCollapse(): void {
    this.sidebarCollapsed = true;
  }

  /**
   * Toggle sidebar visibility (mobile)
   */
  private toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  /**
   * Handle overlay click (close sidebar)
   */
  private handleOverlayClick(): void {
    this.sidebarCollapsed = true;
  }

  /**
   * Handle config changes from ConfigSidebar
   * Re-emits the event for parent (v4-layout.ts) to handle
   */
  private handleConfigChange(e: CustomEvent): void {
    this.emit('config-change', e.detail);
  }

  protected override render(): TemplateResult {
    return html`
      <!-- App Header -->
      <v4-app-header></v4-app-header>

      <!-- Tool Banner -->
      <v4-tool-banner
        .activeTool=${this.activeTool}
        @tool-select=${this.handleToolSelect}
      ></v4-tool-banner>

      <!-- Main Layout (Sidebar + Content) -->
      <div class="v4-layout-main">
        <!-- Config Sidebar -->
        <v4-config-sidebar
          .activeTool=${this.activeTool}
          ?collapsed=${this.sidebarCollapsed}
          @sidebar-collapse=${this.handleSidebarCollapse}
          @config-change=${this.handleConfigChange}
        ></v4-config-sidebar>

        <!-- Mobile Overlay -->
        <div
          class="v4-sidebar-overlay ${!this.sidebarCollapsed && this.isMobile ? 'visible' : ''}"
          @click=${this.handleOverlayClick}
          role="button"
          tabindex="-1"
          aria-label="Close sidebar"
        ></div>

        <!-- Content Area -->
        <main class="v4-layout-content" id="main-content" role="main">
          <div class="v4-layout-content-scroll">
            <slot></slot>
          </div>
        </main>
      </div>

      <!-- Mobile Sidebar Toggle FAB -->
      <button
        class="v4-mobile-sidebar-toggle"
        type="button"
        title="Toggle configuration sidebar"
        aria-label="Toggle configuration sidebar"
        aria-expanded=${!this.sidebarCollapsed}
        @click=${this.toggleSidebar}
      >
        ☰
      </button>
    `;
  }
}

// TypeScript declaration for custom element
declare global {
  interface HTMLElementTagNameMap {
    'v4-layout-shell': V4LayoutShell;
  }
}
