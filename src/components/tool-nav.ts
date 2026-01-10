/**
 * XIV Dye Tools v3.0.0 - Tool Navigation Component
 *
 * Desktop left sidebar navigation with tool icons and labels.
 * Provides localized tool definitions for the v3 two-panel layout.
 *
 * @module components/tool-nav
 */

import { LanguageService } from '@services/index';
import {
  ICON_TOOL_HARMONY,
  ICON_TOOL_MATCHER,
  ICON_TOOL_ACCESSIBILITY,
  ICON_TOOL_COMPARISON,
  ICON_TOOL_MIXER,
  ICON_TOOL_PRESETS,
  ICON_TOOL_BUDGET,
  ICON_TOOL_CHARACTER,
} from '@shared/tool-icons';
import type { ToolId } from '@services/router-service';

export interface NavTool {
  id: ToolId;
  name: string;
  shortName: string;
  icon: string;
  description: string;
}

/**
 * Get localized tool definitions for v4 navigation
 * V4 changes:
 * - 'matcher' → 'extractor' (Palette Extractor)
 * - 'mixer' → 'gradient' (Gradient Builder)
 * - 'character' → 'swatch' (Swatch Matcher)
 * - NEW: 'mixer' (Dye Mixer)
 */
export function getLocalizedTools(): NavTool[] {
  return [
    {
      id: 'harmony',
      name: LanguageService.t('tools.harmony.title'),
      shortName: LanguageService.t('tools.harmony.shortName'),
      icon: ICON_TOOL_HARMONY,
      description: LanguageService.t('tools.harmony.description'),
    },
    {
      id: 'extractor', // Was 'matcher'
      name: LanguageService.t('tools.matcher.title') || 'Palette Extractor',
      shortName: LanguageService.t('tools.matcher.shortName') || 'Extractor',
      icon: ICON_TOOL_MATCHER, // Reuse existing icon
      description: LanguageService.t('tools.matcher.description') || 'Extract palettes from images',
    },
    {
      id: 'accessibility',
      name: LanguageService.t('tools.accessibility.title'),
      shortName: LanguageService.t('tools.accessibility.shortName'),
      icon: ICON_TOOL_ACCESSIBILITY,
      description: LanguageService.t('tools.accessibility.description'),
    },
    {
      id: 'comparison',
      name: LanguageService.t('tools.comparison.title'),
      shortName: LanguageService.t('tools.comparison.shortName'),
      icon: ICON_TOOL_COMPARISON,
      description: LanguageService.t('tools.comparison.description'),
    },
    {
      id: 'gradient', // Was 'mixer' - now Gradient Builder
      name: LanguageService.t('tools.mixer.title') || 'Gradient Builder',
      shortName: LanguageService.t('tools.mixer.shortName') || 'Gradient',
      icon: ICON_TOOL_MIXER, // Reuse existing icon
      description: LanguageService.t('tools.mixer.description') || 'Create color gradients between dyes',
    },
    {
      id: 'presets',
      name: LanguageService.t('tools.presets.title'),
      shortName: LanguageService.t('tools.presets.shortName'),
      icon: ICON_TOOL_PRESETS,
      description: LanguageService.t('tools.presets.description'),
    },
    {
      id: 'budget',
      name: LanguageService.t('tools.budget.title') || 'Budget Suggestions',
      shortName: LanguageService.t('tools.budget.shortName') || 'Budget',
      icon: ICON_TOOL_BUDGET,
      description: LanguageService.t('tools.budget.description') || 'Find affordable dye alternatives',
    },
    {
      id: 'swatch', // Was 'character'
      name: LanguageService.t('tools.character.title') || 'Swatch Matcher',
      shortName: LanguageService.t('tools.character.shortName') || 'Swatch',
      icon: ICON_TOOL_CHARACTER, // Reuse existing icon
      description: LanguageService.t('tools.character.description') || 'Match dyes to character colors',
    },
    {
      id: 'mixer', // NEW - Dye Mixer
      name: 'Dye Mixer',
      shortName: 'Mixer',
      icon: ICON_TOOL_MIXER, // Temporary: reuse mixer icon
      description: 'Blend dyes together to create new colors',
    },
  ];
}

/**
 * Map tool IDs to their SVG icons
 * V4: Updated tool IDs with icon mappings
 */
export const TOOL_ICONS: Record<ToolId, string> = {
  harmony: ICON_TOOL_HARMONY,
  extractor: ICON_TOOL_MATCHER, // Was 'matcher'
  accessibility: ICON_TOOL_ACCESSIBILITY,
  comparison: ICON_TOOL_COMPARISON,
  gradient: ICON_TOOL_MIXER, // Was 'mixer' - Gradient Builder
  presets: ICON_TOOL_PRESETS,
  budget: ICON_TOOL_BUDGET,
  swatch: ICON_TOOL_CHARACTER, // Was 'character'
  mixer: ICON_TOOL_MIXER, // NEW - Dye Mixer (temp icon)
};
