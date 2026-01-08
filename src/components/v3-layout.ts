/**
 * XIV Dye Tools v3.0.0 - V3 Layout Entry Point
 *
 * Initializes the two-panel shell with RouterService integration.
 * Handles tool lazy-loading and navigation.
 *
 * @module components/v3-layout
 */

import { RouterService, type ToolId } from '@services/router-service';
import { LanguageService } from '@services/index';
import { logger } from '@shared/logger';
import { clearContainer } from '@shared/utils';
import { TwoPanelShell } from './two-panel-shell';
import type { BaseComponent } from './base-component';

// Track active tool instance for cleanup
let activeTool: BaseComponent | null = null;
let shellInstance: TwoPanelShell | null = null;
let languageUnsubscribe: (() => void) | null = null;

/**
 * Initialize the v3 two-panel layout
 */
export async function initializeV3Layout(container: HTMLElement): Promise<void> {
  // Initialize router
  RouterService.initialize();

  const initialTool = RouterService.getCurrentToolId();
  logger.info(`[V3 Layout] Initializing with tool: ${initialTool}`);

  // Create shell
  shellInstance = new TwoPanelShell(container, {
    initialTool,
    onToolChange: (toolId) => {
      RouterService.navigateTo(toolId);
    },
  });
  shellInstance.init();

  // Listen for browser back/forward
  RouterService.subscribe((state) => {
    logger.info(`[V3 Layout] Route changed to: ${state.toolId}`);
    shellInstance?.setActiveToolId(state.toolId);
    void loadToolContent(state.toolId);
  });

  // Subscribe to language changes for re-rendering (store unsubscribe for cleanup)
  languageUnsubscribe = LanguageService.subscribe(() => {
    // Shell handles its own language updates
    // Tool content may need to be reloaded
    logger.info('[V3 Layout] Language changed, tool may need refresh');
  });

  // Load initial tool
  await loadToolContent(initialTool);

  logger.info('[V3 Layout] Initialized successfully');
}

/**
 * Load tool content into the shell panels
 */
async function loadToolContent(toolId: ToolId): Promise<void> {
  if (!shellInstance) {
    logger.error('[V3 Layout] Shell not initialized');
    return;
  }

  const leftPanel = shellInstance.getLeftPanelContent();
  const rightPanel = shellInstance.getRightPanelContent();
  const drawerContent = shellInstance.getMobileDrawerContent();

  if (!leftPanel || !rightPanel) {
    logger.error('[V3 Layout] Panel containers not found');
    return;
  }

  // Cleanup previous tool
  if (activeTool) {
    activeTool.destroy();
    activeTool = null;
  }

  // Clear existing content
  clearContainer(leftPanel);
  clearContainer(rightPanel);
  if (drawerContent) {
    // Keep the nav section, clear the rest
    const navSection = drawerContent.querySelector('[data-drawer-nav]');
    clearContainer(drawerContent);
    if (navSection) {
      drawerContent.appendChild(navSection);
    }
  }

  // Show loading state
  rightPanel.innerHTML = `
    <div class="flex items-center justify-center h-64">
      <div class="text-center">
        <div class="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mb-3" style="border-color: var(--theme-primary); border-top-color: transparent;"></div>
        <p style="color: var(--theme-text-muted);">Loading ${toolId}...</p>
      </div>
    </div>
  `;

  // Load tool-specific mockup (Phase 1: use mockups, Phase 2+ will use real tools)
  try {
    switch (toolId) {
      case 'harmony': {
        // Phase 2: Production HarmonyTool
        const { HarmonyTool } = await import('@components/harmony-tool');
        const toolContainer = document.createElement('div');
        activeTool = new HarmonyTool(toolContainer, {
          leftPanel,
          rightPanel,
          drawerContent,
        });
        activeTool.init();
        logger.info('[V3 Layout] Harmony tool loaded (v3 production)');
        break;
      }
      case 'matcher': {
        // Phase 3: Production MatcherTool
        const { MatcherTool } = await import('@components/matcher-tool');
        const toolContainer = document.createElement('div');
        activeTool = new MatcherTool(toolContainer, {
          leftPanel,
          rightPanel,
          drawerContent,
        });
        activeTool.init();
        logger.info('[V3 Layout] Matcher tool loaded (v3 production)');
        break;
      }
      case 'accessibility': {
        // Phase 4: Production AccessibilityTool
        const { AccessibilityTool } = await import('@components/accessibility-tool');
        const toolContainer = document.createElement('div');
        activeTool = new AccessibilityTool(toolContainer, {
          leftPanel,
          rightPanel,
          drawerContent,
        });
        activeTool.init();
        logger.info('[V3 Layout] Accessibility tool loaded (v3 production)');
        break;
      }
      case 'comparison': {
        // Phase 5: Production ComparisonTool
        const { ComparisonTool } = await import('@components/comparison-tool');
        const toolContainer = document.createElement('div');
        activeTool = new ComparisonTool(toolContainer, {
          leftPanel,
          rightPanel,
          drawerContent,
        });
        activeTool.init();
        logger.info('[V3 Layout] Comparison tool loaded (v3 production)');
        break;
      }
      case 'mixer': {
        // Phase 6: Production MixerTool
        const { MixerTool } = await import('@components/mixer-tool');
        const toolContainer = document.createElement('div');
        activeTool = new MixerTool(toolContainer, {
          leftPanel,
          rightPanel,
          drawerContent,
        });
        activeTool.init();
        logger.info('[V3 Layout] Mixer tool loaded (v3 production)');
        break;
      }
      case 'presets': {
        // Phase 7: Production PresetTool
        const { PresetTool } = await import('@components/preset-tool');
        const toolContainer = document.createElement('div');
        activeTool = new PresetTool(toolContainer, {
          leftPanel,
          rightPanel,
          drawerContent,
        });
        activeTool.init();
        logger.info('[V3 Layout] Presets tool loaded (v3 production)');
        break;
      }
      case 'budget': {
        // Phase 8: Production BudgetTool
        const { BudgetTool } = await import('@components/budget-tool');
        const toolContainer = document.createElement('div');
        activeTool = new BudgetTool(toolContainer, {
          leftPanel,
          rightPanel,
          drawerContent,
        });
        activeTool.init();
        logger.info('[V3 Layout] Budget tool loaded (v3 production)');
        break;
      }
      case 'character': {
        // Phase 9: Production CharacterTool
        const { CharacterTool } = await import('@components/character-tool');
        const toolContainer = document.createElement('div');
        activeTool = new CharacterTool(toolContainer, {
          leftPanel,
          rightPanel,
          drawerContent,
        });
        activeTool.init();
        logger.info('[V3 Layout] Character tool loaded (v3 production)');
        break;
      }
      default:
        renderPlaceholder(rightPanel, toolId);
        break;
    }
  } catch (error) {
    logger.error(`[V3 Layout] Failed to load ${toolId}:`, error);
    rightPanel.innerHTML = `
      <div class="flex items-center justify-center h-64">
        <div class="text-center" style="color: var(--theme-text);">
          <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p class="font-medium mb-2">Failed to load tool</p>
          <p class="text-sm opacity-70">Please try again or refresh the page</p>
        </div>
      </div>
    `;
  }
}

/**
 * Render placeholder for unknown tools
 */
function renderPlaceholder(container: HTMLElement, toolId: string): void {
  container.innerHTML = `
    <div class="flex items-center justify-center h-64">
      <div class="text-center" style="color: var(--theme-text);">
        <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <p class="font-medium mb-2">${toolId} Tool</p>
        <p class="text-sm opacity-70">Coming soon in Phase 2</p>
      </div>
    </div>
  `;
}

/**
 * Cleanup the v3 layout
 */
export function destroyV3Layout(): void {
  // Clean up language subscription to prevent memory leaks
  if (languageUnsubscribe) {
    languageUnsubscribe();
    languageUnsubscribe = null;
  }

  if (activeTool) {
    activeTool.destroy();
    activeTool = null;
  }
  if (shellInstance) {
    shellInstance.destroy();
    shellInstance = null;
  }
  RouterService.destroy();
  logger.info('[V3 Layout] Destroyed');
}
