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
 * Get localized tool definitions for v3 navigation
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
      id: 'matcher',
      name: LanguageService.t('tools.matcher.title'),
      shortName: LanguageService.t('tools.matcher.shortName'),
      icon: ICON_TOOL_MATCHER,
      description: LanguageService.t('tools.matcher.description'),
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
      id: 'mixer',
      name: LanguageService.t('tools.mixer.title'),
      shortName: LanguageService.t('tools.mixer.shortName'),
      icon: ICON_TOOL_MIXER,
      description: LanguageService.t('tools.mixer.description'),
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
      id: 'character',
      name: LanguageService.t('tools.character.title') || 'Character Matcher',
      shortName: LanguageService.t('tools.character.shortName') || 'Character',
      icon: ICON_TOOL_CHARACTER,
      description: LanguageService.t('tools.character.description') || 'Match dyes to character colors',
    },
  ];
}

/**
 * Map tool IDs to their SVG icons
 */
export const TOOL_ICONS: Record<ToolId, string> = {
  harmony: ICON_TOOL_HARMONY,
  matcher: ICON_TOOL_MATCHER,
  accessibility: ICON_TOOL_ACCESSIBILITY,
  comparison: ICON_TOOL_COMPARISON,
  mixer: ICON_TOOL_MIXER,
  presets: ICON_TOOL_PRESETS,
  budget: ICON_TOOL_BUDGET,
  character: ICON_TOOL_CHARACTER,
};
