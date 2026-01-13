/**
 * XIV Dye Tools v4.0 - Tool Configuration Types
 *
 * TypeScript interfaces for all tool configurations.
 * Used by ConfigController and ConfigSidebar for type-safe config management.
 *
 * @module shared/tool-config-types
 */

import type { ToolId } from '@services/router-service';

// ============================================================================
// Global Configuration
// ============================================================================

/**
 * Global application configuration (not tool-specific)
 */
export interface GlobalConfig {
  /** Selected theme name */
  theme: string;
  /** Global display options shared across all tools */
  displayOptions: DisplayOptionsConfig;
}

// ============================================================================
// Tool-Specific Configurations
// ============================================================================

/**
 * Harmony Explorer configuration
 */
export interface HarmonyConfig {
  /** Selected harmony type (complementary, analogous, triadic, etc.) */
  harmonyType: string;
  /** Use perceptual (DeltaE) color matching instead of hue-based */
  strictMatching: boolean;
  /** Display options for result cards */
  displayOptions: DisplayOptionsConfig;
  // Legacy fields (deprecated, for migration)
  /** @deprecated Use displayOptions.showHex */
  showHex?: boolean;
  /** @deprecated Use displayOptions.showRgb */
  showRgb?: boolean;
  /** @deprecated Use displayOptions.showHsv */
  showHsv?: boolean;
  /** @deprecated Use displayOptions.showLab */
  showLab?: boolean;
}

/**
 * Palette Extractor (Color Matcher) configuration
 */
export interface ExtractorConfig {
  /** Enable vibrancy boost for extracted colors */
  vibrancyBoost: boolean;
  /** Maximum number of colors to extract (3-10) */
  maxColors: number;
  /** Display options for result cards */
  displayOptions: DisplayOptionsConfig;
}

/**
 * Accessibility Checker configuration
 */
export interface AccessibilityConfig {
  /** Show normal vision preview */
  normalVision: boolean;
  /** Show deuteranopia (red-green) simulation */
  deuteranopia: boolean;
  /** Show protanopia (red-blind) simulation */
  protanopia: boolean;
  /** Show tritanopia (blue-yellow) simulation */
  tritanopia: boolean;
  /** Show achromatopsia (complete colorblindness) simulation */
  achromatopsia: boolean;
  /** Show labels on vision cards */
  showLabels: boolean;
  /** Show hex values on vision cards */
  showHexValues: boolean;
  /** Enable high contrast mode */
  highContrastMode: boolean;
  /** Display options for result cards */
  displayOptions: DisplayOptionsConfig;
}

/**
 * Dye Comparison configuration
 */
export interface ComparisonConfig {
  /** Show Delta-E values */
  showDeltaE: boolean;
  /** Show RGB values */
  showRgb: boolean;
  /** Show HSV values */
  showHsv: boolean;
  /** Show market prices */
  showMarketPrices: boolean;
  /** Display options for result cards */
  displayOptions: DisplayOptionsConfig;
}

/**
 * Gradient Builder (Dye Mixer) configuration
 */
export interface GradientConfig {
  /** Number of gradient steps (3-12) */
  stepCount: number;
  /** Interpolation method (linear, ease, etc.) */
  interpolation: string;
  /** Display options for result cards */
  displayOptions: DisplayOptionsConfig;
}

/**
 * Dye Mixer (NEW in v4) configuration
 */
export interface MixerConfig {
  /** Maximum results to show (3-8) */
  maxResults: number;
  /** Display options for result cards */
  displayOptions: DisplayOptionsConfig;
}

/**
 * Community Presets configuration
 */
export interface PresetsConfig {
  /** Show only user's own presets */
  showMyPresetsOnly: boolean;
  /** Show only favorited presets */
  showFavorites: boolean;
  /** Sort order (newest, popular, etc.) */
  sortBy: string;
}

/**
 * Budget Suggestions configuration
 */
export interface BudgetConfig {
  /** Maximum price limit in gil (0-200000) */
  maxPrice: number;
  /** Maximum results to show (1-20) */
  maxResults: number;
  /** Maximum Delta-E color distance (0-100) */
  maxDeltaE: number;
  /** Display options for result cards */
  displayOptions: DisplayOptionsConfig;
}

/**
 * Swatch Matcher (Character Matcher) configuration
 */
export interface SwatchConfig {
  /**
   * Selected color sheet category.
   * Values: 'eyeColors', 'hairColors', 'skinColors', 'highlightColors',
   * 'lipColorsDark', 'lipColorsLight', 'tattooColors',
   * 'facePaintColorsDark', 'facePaintColorsLight'
   */
  colorSheet: string;
  /**
   * Selected subrace (SubRace type).
   * Values: 'Midlander', 'Highlander', 'Wildwood', 'Duskwight',
   * 'Plainsfolk', 'Dunesfolk', 'SeekerOfTheSun', 'KeeperOfTheMoon',
   * 'SeaWolf', 'Hellsguard', 'Raen', 'Xaela', 'Helion', 'TheLost',
   * 'Rava', 'Veena'
   */
  race: string;
  /** Selected gender: 'Male' or 'Female' */
  gender: string;
  /** Maximum results to show (1-6) */
  maxResults: number;
  /** Display options for result cards */
  displayOptions: DisplayOptionsConfig;
}

/**
 * Market Board configuration (shared across tools)
 */
export interface MarketConfig {
  /** Selected server (data center name or world name) */
  selectedServer: string;
  /** Whether to show market prices */
  showPrices: boolean;
}

// ============================================================================
// Shared Display Options
// ============================================================================

/**
 * Shared display options for result cards across tools.
 * Controls visibility of color formats and result metadata.
 */
export interface DisplayOptionsConfig {
  // Color format visibility
  /** Show HEX color codes */
  showHex: boolean;
  /** Show RGB values */
  showRgb: boolean;
  /** Show HSV values */
  showHsv: boolean;
  /** Show LAB values */
  showLab: boolean;

  // Result metadata visibility
  /** Show market prices */
  showPrice: boolean;
  /** Show Delta-E color distance */
  showDeltaE: boolean;
  /** Show acquisition source information */
  showAcquisition: boolean;
}

/**
 * Default display options for result cards
 */
export const DEFAULT_DISPLAY_OPTIONS: DisplayOptionsConfig = {
  showHex: true,
  showRgb: false,
  showHsv: true,
  showLab: false,
  showPrice: false,
  showDeltaE: true,
  showAcquisition: true,
};

// ============================================================================
// Type Mapping
// ============================================================================

/**
 * Map of tool IDs to their configuration interfaces
 */
export interface ToolConfigMap {
  global: GlobalConfig;
  market: MarketConfig;
  harmony: HarmonyConfig;
  extractor: ExtractorConfig;
  accessibility: AccessibilityConfig;
  comparison: ComparisonConfig;
  gradient: GradientConfig;
  mixer: MixerConfig;
  presets: PresetsConfig;
  budget: BudgetConfig;
  swatch: SwatchConfig;
}

/**
 * Union type of all possible tool config types
 */
export type ToolConfig = ToolConfigMap[keyof ToolConfigMap];

/**
 * Config key type (tool ID, 'global', or 'market')
 */
export type ConfigKey = ToolId | 'global' | 'market';

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default configuration values for all tools
 */
export const DEFAULT_CONFIGS: ToolConfigMap = {
  global: {
    theme: '',
    displayOptions: { ...DEFAULT_DISPLAY_OPTIONS },
  },
  market: {
    selectedServer: 'Crystal',
    showPrices: false,
  },
  harmony: {
    harmonyType: 'tetradic',
    strictMatching: false,
    displayOptions: { ...DEFAULT_DISPLAY_OPTIONS },
  },
  extractor: {
    vibrancyBoost: true,
    maxColors: 8,
    displayOptions: { ...DEFAULT_DISPLAY_OPTIONS },
  },
  accessibility: {
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
      showPrice: false, // Accessibility tool doesn't show prices by default
      showDeltaE: false, // Not applicable for accessibility
      showAcquisition: false, // Keep focus on colors
    },
  },
  comparison: {
    showDeltaE: true,
    showRgb: true,
    showHsv: false,
    showMarketPrices: true,
    displayOptions: { ...DEFAULT_DISPLAY_OPTIONS },
  },
  gradient: {
    stepCount: 8,
    interpolation: 'hsv',
    displayOptions: { ...DEFAULT_DISPLAY_OPTIONS },
  },
  mixer: {
    maxResults: 5, // Design spec: default 5, range 3-8
    displayOptions: { ...DEFAULT_DISPLAY_OPTIONS },
  },
  presets: {
    showMyPresetsOnly: false,
    showFavorites: false,
    sortBy: 'newest',
  },
  budget: {
    maxPrice: 200000,
    maxResults: 8,
    maxDeltaE: 75,
    displayOptions: { ...DEFAULT_DISPLAY_OPTIONS },
  },
  swatch: {
    colorSheet: 'eyeColors',
    race: 'Midlander',
    gender: 'Male',
    maxResults: 3,
    displayOptions: { ...DEFAULT_DISPLAY_OPTIONS },
  },
};

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a config key is a valid tool ID
 */
export function isToolId(key: ConfigKey): key is ToolId {
  return key !== 'global' && key !== 'market';
}

/**
 * Get the default config for a tool
 */
export function getDefaultConfig<K extends ConfigKey>(key: K): ToolConfigMap[K] {
  return DEFAULT_CONFIGS[key];
}
