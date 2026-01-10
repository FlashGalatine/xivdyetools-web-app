/**
 * XIV Dye Tools v4.0.0 - Mixer Tool Component (Dye Mixer)
 *
 * V4 NEW: Dye Mixer - Blend multiple dyes together to create new colors.
 * This is a completely different tool from the old Mixer (now Gradient Builder).
 *
 * Features (Planned):
 * - Add multiple dyes to a "mixing pot"
 * - Adjust blend ratios with sliders
 * - Preview resulting mixed color
 * - Find closest matching FFXIV dye to the blend
 * - Save favorite blends
 *
 * Left Panel: Dye selection, blend ratios, mixing controls
 * Right Panel: Mix preview, matched dye results, blend history
 *
 * @module components/tools/mixer-tool
 */

import { BaseComponent } from '@components/base-component';
import { LanguageService } from '@services/index';
import { ICON_TOOL_MIXER } from '@shared/tool-icons';
import { logger } from '@shared/logger';
import { clearContainer } from '@shared/utils';

// ============================================================================
// Types and Constants
// ============================================================================

export interface MixerToolOptions {
  leftPanel: HTMLElement;
  rightPanel: HTMLElement;
  drawerContent?: HTMLElement | null;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Dye Mixer Tool - v4 New Tool
 *
 * Blend multiple dyes together to find matching FFXIV dyes.
 * Full implementation coming in Phase 6.
 */
export class MixerTool extends BaseComponent {
  private options: MixerToolOptions;

  constructor(container: HTMLElement, options: MixerToolOptions) {
    super(container);
    this.options = options;
    logger.info('[MixerTool] Initializing Dye Mixer placeholder');
  }

  /**
   * Render the placeholder UI (required by BaseComponent)
   */
  renderContent(): void {
    const { leftPanel, rightPanel, drawerContent } = this.options;

    // Clear panels
    clearContainer(leftPanel);
    clearContainer(rightPanel);

    // Render left panel placeholder
    leftPanel.innerHTML = `
      <div class="p-4">
        <h2 class="text-lg font-semibold mb-4" style="color: var(--theme-text);">
          ${LanguageService.t('tools.mixer.title') || 'Dye Mixer'}
        </h2>
        <p class="text-sm mb-4" style="color: var(--theme-text-muted);">
          ${LanguageService.t('tools.mixer.description') || 'Blend multiple dyes to create new colors'}
        </p>

        <div class="space-y-4">
          <div class="p-4 rounded-lg" style="background: var(--theme-card-bg); border: 1px dashed var(--theme-border);">
            <p class="text-center text-sm" style="color: var(--theme-text-muted);">
              Dye selection controls will appear here
            </p>
          </div>

          <div class="p-4 rounded-lg" style="background: var(--theme-card-bg); border: 1px dashed var(--theme-border);">
            <p class="text-center text-sm" style="color: var(--theme-text-muted);">
              Blend ratio sliders will appear here
            </p>
          </div>
        </div>
      </div>
    `;

    // Render right panel placeholder
    rightPanel.innerHTML = `
      <div class="flex items-center justify-center h-full min-h-[400px]">
        <div class="text-center max-w-md p-8">
          <div class="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center"
               style="background: linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-accent) 100%);">
            ${ICON_TOOL_MIXER.replace('class="', 'class="w-12 h-12 ')}
          </div>

          <h2 class="text-2xl font-bold mb-3" style="color: var(--theme-text);">
            Dye Mixer
          </h2>

          <p class="text-lg mb-2" style="color: var(--theme-primary);">
            Coming Soon!
          </p>

          <p class="mb-6" style="color: var(--theme-text-muted);">
            Blend multiple dyes together to create unique color combinations.
            Find the closest matching FFXIV dye to your custom blend.
          </p>

          <div class="space-y-3 text-left p-4 rounded-lg" style="background: var(--theme-card-bg);">
            <h3 class="font-semibold mb-2" style="color: var(--theme-text);">Planned Features:</h3>
            <ul class="space-y-2 text-sm" style="color: var(--theme-text-muted);">
              <li class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full" style="background: var(--theme-primary);"></span>
                Add multiple dyes to a mixing pot
              </li>
              <li class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full" style="background: var(--theme-primary);"></span>
                Adjust blend ratios with intuitive sliders
              </li>
              <li class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full" style="background: var(--theme-primary);"></span>
                Real-time preview of blended colors
              </li>
              <li class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full" style="background: var(--theme-primary);"></span>
                Find closest matching FFXIV dyes
              </li>
              <li class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full" style="background: var(--theme-primary);"></span>
                Save and share favorite blends
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Desktop footer placeholder -->
      <div data-panel="right-footer" class="hidden md:block"></div>
    `;

    // Render mobile drawer content if available
    if (drawerContent) {
      const existingNav = drawerContent.querySelector('[data-drawer-nav]');
      clearContainer(drawerContent);
      if (existingNav) {
        drawerContent.appendChild(existingNav);
      }

      const drawerBody = document.createElement('div');
      drawerBody.className = 'p-4';
      drawerBody.innerHTML = `
        <h3 class="text-sm font-semibold mb-3 uppercase tracking-wide" style="color: var(--theme-text-muted);">
          Dye Mixer
        </h3>
        <p class="text-sm" style="color: var(--theme-text-muted);">
          This tool is coming soon! Check back in a future update.
        </p>
      `;
      drawerContent.appendChild(drawerBody);
    }

    logger.info('[MixerTool] Placeholder rendered');
  }

  /**
   * Bind event handlers (required by BaseComponent)
   * No events needed for placeholder
   */
  bindEvents(): void {
    // Placeholder has no interactive elements yet
  }
}
