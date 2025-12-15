/* istanbul ignore file */
/**
 * XIV Dye Tools v2.0.0 - Shared Type Definitions
 *
 * Phase 12: Architecture Refactor
 * Comprehensive type definitions for the application
 *
 * Types are now sourced from @xivdyetools/types where possible.
 * Web-app specific types remain defined locally.
 *
 * @module shared/types
 */

// ============================================================================
// Re-exports from @xivdyetools/types
// ============================================================================

// Color types
export type { RGB, HSV, HexColor, VisionType, Matrix3x3, ColorblindMatrices } from '@xivdyetools/types';
export { createHexColor } from '@xivdyetools/types';

// Import HexColor for local use in this file
import type { HexColor } from '@xivdyetools/types';

// Dye types
export type { Dye, DyeWithDistance, DyeDatabase } from '@xivdyetools/types';

// API types
export type { APIResponse, CachedData, PriceData, RateLimitResult } from '@xivdyetools/types';

// Error types
export type { ErrorSeverity } from '@xivdyetools/types';
export { AppError, ErrorCode } from '@xivdyetools/types';

// Utility types
export type { Result, AsyncResult, Nullable, Optional } from '@xivdyetools/types';

// ============================================================================
// Theme Types
// ============================================================================

/**
 * Theme names available in the system
 */
export type ThemeName =
  | 'standard-light'
  | 'standard-dark'
  | 'hydaelyn-light'
  | 'og-classic-dark'
  | 'parchment-light'
  | 'cotton-candy'
  | 'sugar-riot'
  | 'grayscale-light'
  | 'grayscale-dark'
  | 'high-contrast-light'
  | 'high-contrast-dark';

/**
 * Color palette for a theme
 */
export interface ThemePalette {
  primary: string;
  background: string;
  text: string;
  textHeader: string; // Header text color (for titles, activated buttons, etc.)
  border: string;
  backgroundSecondary: string;
  cardBackground: string;
  cardHover: string;
  textMuted: string;
}

/**
 * Complete theme definition
 */
export interface Theme {
  name: ThemeName;
  palette: ThemePalette;
  isDark: boolean;
}

// ============================================================================
// Application State Types
// ============================================================================

/**
 * Global application state
 */
export interface AppState {
  currentTheme: ThemeName;
  prefersDarkMode: boolean;
  showPrices: boolean;
  lastUpdate: number;
}

/**
 * Tool-specific state extending AppState
 */
export interface HarmonyState extends AppState {
  harmonyType:
    | 'complementary'
    | 'analogous'
    | 'triadic'
    | 'split-complementary'
    | 'tetradic'
    | 'square';
  baseColor: HexColor;
  selectedDyes: number[];
}

export interface MatcherState extends AppState {
  imageUrl: string;
  sampleSize: number; // 1-64 pixels
  zoomLevel: number;
  matchedDyeId: number | null;
}

export interface ComparisonState extends AppState {
  selectedDyes: number[]; // Up to 4 dye IDs
  exportFormat: 'json' | 'css' | 'text';
}

// ============================================================================
// Web-App Specific API Types
// ============================================================================

/**
 * FFXIV Data Center information
 */
export interface DataCenter {
  name: string;
  region: string;
  worlds: number[];
}

/**
 * FFXIV World (server) information
 */
export interface World {
  id: number;
  name: string;
}
