/**
 * XIV Dye Tools - Tool Navigation SVG Icons
 *
 * Inline SVG icons for tool navigation using currentColor for theme adaptation
 * These replace external SVG files loaded via <img> tags which can't inherit color
 *
 * @module shared/tool-icons
 */

/**
 * Harmony Explorer icon - Triadic color harmony visualization
 */
export const ICON_TOOL_HARMONY = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10" opacity="0.3" />
  <circle cx="12" cy="3" r="2.5" fill="currentColor" stroke="none" />
  <circle cx="20.66" cy="16.5" r="2.5" fill="currentColor" stroke="none" />
  <circle cx="3.34" cy="16.5" r="2.5" fill="currentColor" stroke="none" />
  <polygon points="12,3 20.66,16.5 3.34,16.5" fill="none" opacity="0.5" />
</svg>`;

/**
 * Color Matcher icon - Target/bullseye
 */
export const ICON_TOOL_MATCHER = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10" opacity="0.3" />
  <circle cx="12" cy="12" r="6.5" opacity="0.5" />
  <circle cx="12" cy="12" r="3.5" opacity="0.7" />
  <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
</svg>`;

/**
 * Accessibility Checker icon - Eye
 */
export const ICON_TOOL_ACCESSIBILITY = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M 2 12 Q 12 5 22 12 Q 12 19 2 12 Z" />
  <circle cx="12" cy="12" r="3.5" />
  <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
</svg>`;

/**
 * Dye Comparison icon - Overlapping swatches
 */
export const ICON_TOOL_COMPARISON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="9" y="4" width="11" height="11" rx="2" opacity="0.4" />
  <rect x="4" y="9" width="11" height="11" rx="2" />
  <path d="M16 19l2 2 4-4" opacity="0.6" />
  <path d="M8 12h.01" stroke-width="3" />
  <path d="M13 7h.01" stroke-width="3" opacity="0.4" />
</svg>`;

/**
 * Dye Mixer icon - Paint palette with brush
 */
export const ICON_TOOL_MIXER = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M 4 8 C 4 6 5 5 7 5 L 17 5 C 19 5 20 6 20 8 L 20 16 C 20 18 19 19 17 19 L 7 19 C 5 19 4 18 4 16 Z" />
  <circle cx="18" cy="16" r="1.5" fill="currentColor" stroke="none" />
  <circle cx="8" cy="10" r="2" opacity="0.5" />
  <circle cx="12" cy="10" r="2" opacity="0.5" />
  <circle cx="16" cy="10" r="2" opacity="0.5" />
  <line x1="6" y1="15" x2="10" y2="15" stroke-width="2" />
  <path d="M 10 15 L 12 13 L 12 17 Z" fill="currentColor" stroke="none" opacity="0.7" />
</svg>`;

/**
 * Preset Palettes icon - Bookmarked color swatches
 */
export const ICON_TOOL_PRESETS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="3" width="18" height="18" rx="2" opacity="0.3" />
  <rect x="5" y="6" width="4" height="5" rx="0.5" fill="currentColor" stroke="none" opacity="0.6" />
  <rect x="10" y="6" width="4" height="5" rx="0.5" fill="currentColor" stroke="none" opacity="0.8" />
  <rect x="15" y="6" width="4" height="5" rx="0.5" fill="currentColor" stroke="none" />
  <path d="M6 14h12" opacity="0.4" />
  <path d="M6 17h8" opacity="0.4" />
  <path d="M17 13v5l2-1.5 2 1.5v-5" opacity="0.7" />
</svg>`;

/**
 * Budget Suggestions icon - Coin/currency with arrow
 */
export const ICON_TOOL_BUDGET = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="9" opacity="0.3" />
  <path d="M12 6v2m0 8v2" />
  <path d="M9 10c0-1.1.9-2 2-2h2c1.1 0 2 .9 2 2s-.9 2-2 2h-2c-1.1 0-2 .9-2 2s.9 2 2 2h2c1.1 0 2-.9 2-2" />
  <path d="M17 7l2-2m0 0l2 2m-2-2v5" opacity="0.7" />
</svg>`;

/**
 * Character Color Matcher icon - User silhouette with color swatches
 */
export const ICON_TOOL_CHARACTER = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="7" r="4" opacity="0.7" />
  <path d="M5.5 21c0-4.5 3-7 6.5-7s6.5 2.5 6.5 7" opacity="0.4" />
  <rect x="16" y="11" width="3" height="3" rx="0.5" fill="currentColor" stroke="none" />
  <rect x="16" y="15" width="3" height="3" rx="0.5" fill="currentColor" stroke="none" opacity="0.6" />
  <rect x="16" y="19" width="3" height="3" rx="0.5" fill="currentColor" stroke="none" opacity="0.3" />
</svg>`;

/**
 * Tools Menu icon - Toolbox
 */
export const ICON_TOOL_MENU = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <rect x="4" y="10" width="16" height="10" rx="1" />
  <path d="M 4 10 L 4 8 C 4 7 5 6 6 6 L 9 6" />
  <path d="M 20 10 L 20 8 C 20 7 19 6 18 6 L 15 6" />
  <path d="M 9 6 L 9 4 C 9 3 10 2 12 2 C 14 2 15 3 15 4 L 15 6" />
  <rect x="11" y="13" width="2" height="3" rx="0.5" fill="currentColor" stroke="none" opacity="0.6" />
  <line x1="12" y1="10" x2="12" y2="20" opacity="0.3" stroke-width="1" />
</svg>`;

/**
 * Dye Mixer icon - Crafting-style two-beaker mixing (NEW v4 tool)
 * Distinct from Gradient Builder (which was the old "mixer")
 */
export const ICON_TOOL_DYE_MIXER = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 5l-8 14h16l-8-14z" opacity="0.3"/>
  <circle cx="8" cy="8" r="3" opacity="0.6"/>
  <circle cx="16" cy="8" r="3" opacity="0.6"/>
  <path d="M8 11v2"/>
  <path d="M16 11v2"/>
  <circle cx="12" cy="16" r="3" fill="currentColor" stroke="none" opacity="0.8"/>
  <path d="M10.5 14l3 0" stroke-width="2"/>
</svg>`;

/**
 * Map of tool icon names to SVG strings
 * V4: Updated with new tool IDs (extractor, gradient, swatch, mixer)
 */
export const TOOL_ICONS: Record<string, string> = {
  // V4 tool IDs
  harmony: ICON_TOOL_HARMONY,
  extractor: ICON_TOOL_MATCHER, // v4 name (was 'matcher')
  accessibility: ICON_TOOL_ACCESSIBILITY,
  comparison: ICON_TOOL_COMPARISON,
  gradient: ICON_TOOL_MIXER, // v4 name (was 'mixer' - now Gradient Builder)
  mixer: ICON_TOOL_DYE_MIXER, // NEW v4 Dye Mixer tool
  presets: ICON_TOOL_PRESETS,
  budget: ICON_TOOL_BUDGET,
  swatch: ICON_TOOL_CHARACTER, // v4 name (was 'character')
  // Legacy aliases for backwards compatibility
  matcher: ICON_TOOL_MATCHER,
  character: ICON_TOOL_CHARACTER,
  tools: ICON_TOOL_MENU,
};

/**
 * Get tool icon by name
 */
export function getToolIcon(name: string): string | undefined {
  return TOOL_ICONS[name];
}
