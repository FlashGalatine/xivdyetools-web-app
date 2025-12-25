/**
 * XIV Dye Tools v2.0.0 - Theme Service
 *
 * Phase 12: Architecture Refactor
 * 11-theme system management (includes WCAG AAA high contrast themes)
 *
 * @module services/theme-service
 */

import type { Theme, ThemeName, ThemePalette } from '@shared/types';
import { ErrorCode, AppError } from '@shared/types';
import { THEME_NAMES, DEFAULT_THEME, STORAGE_KEYS } from '@shared/constants';
import { appStorage } from './storage-service';
import { logger } from '@shared/logger';

// ============================================================================
// Theme Factory
// ============================================================================

/**
 * Configuration for creating a theme palette
 */
interface ThemePaletteConfig {
  /** Primary accent color */
  primary: string;
  /** Main background color */
  background: string;
  /** Main text color */
  text: string;
  /** Whether this is a dark theme (affects defaults) */
  isDark: boolean;
  /** Optional overrides for derived properties */
  overrides?: Partial<Omit<ThemePalette, 'primary' | 'background' | 'text'>>;
}

/**
 * Creates a theme palette with sensible defaults for derived properties.
 * Core colors (primary, background, text) are required; others can be overridden.
 *
 * @param config - Theme configuration with core colors and optional overrides
 * @returns Complete theme palette
 */
function createThemePalette(config: ThemePaletteConfig): ThemePalette {
  const { primary, background, text, isDark, overrides = {} } = config;

  return {
    primary,
    background,
    text,
    // Default textHeader: white for light themes, inherit text for dark
    textHeader: overrides.textHeader ?? (isDark ? text : '#FFFFFF'),
    // Default border: use primary color
    border: overrides.border ?? primary,
    // Default secondary: same as main background
    backgroundSecondary: overrides.backgroundSecondary ?? background,
    // Default card: same as main background
    cardBackground: overrides.cardBackground ?? background,
    // Default hover: same as secondary background
    cardHover: overrides.cardHover ?? (overrides.backgroundSecondary ?? background),
    // Default muted text: inherit from text (should be overridden for proper contrast)
    textMuted: overrides.textMuted ?? text,
    // Apply any additional overrides
    ...overrides,
  };
}

// ============================================================================
// Theme Definitions
// ============================================================================

const THEME_PALETTES: Record<ThemeName, ThemePalette> = {
  // Standard themes - burgundy/coral palette
  'standard-light': createThemePalette({
    primary: '#8B1A1A',
    background: '#D3D3D3',
    text: '#1A1A1A',
    isDark: false,
    overrides: {
      border: '#6B1515',
      backgroundSecondary: '#E0E0E0',
      cardBackground: '#F5F5F5',
      cardHover: '#FFFFFF',
      textMuted: '#4A4A4A',
    },
  }),
  'standard-dark': createThemePalette({
    primary: '#E85A5A',
    background: '#2D2D2D',
    text: '#F5F5F5',
    isDark: true,
    overrides: {
      textHeader: '#1A1A1A',
      border: '#F08080',
      backgroundSecondary: '#333333',
      cardBackground: '#1F1F1F',
      cardHover: '#3A3A3A',
      textMuted: '#B0B0B0',
    },
  }),

  // FFXIV-themed palettes
  'hydaelyn-light': createThemePalette({
    primary: '#4056A4',
    background: '#B2C4CE',
    text: '#312D57',
    isDark: false,
    overrides: {
      textHeader: '#F9F8F4',
      cardBackground: '#F9F8F4',
      cardHover: '#FDFDFC',
      textMuted: '#0C4A6E',
    },
  }),
  'og-classic-dark': createThemePalette({
    primary: '#1E40AF',
    background: '#181820',
    text: '#F9F8F4',
    isDark: true,
    overrides: {
      border: '#E4DFD0',
      backgroundSecondary: '#4056A4',
      cardBackground: '#000B9D',
      cardHover: '#5052D9',
      textMuted: '#E4DFD0',
    },
  }),

  // Specialty themes
  'parchment-light': createThemePalette({
    primary: '#D97706',
    background: '#FEF3C7',
    text: '#78350F',
    isDark: false,
    overrides: {
      textHeader: '#78350F',
      border: '#FCD34D',
      backgroundSecondary: '#FEF9E7',
      cardHover: '#FEF9E7',
      textMuted: '#92400E',
    },
  }),
  'cotton-candy': createThemePalette({
    primary: '#FFB6D9',
    background: '#FFF5F9',
    text: '#8B1A4A',
    isDark: false,
    overrides: {
      textHeader: '#8B1A4A',
      border: '#FFC0E0',
      backgroundSecondary: '#FFF9FC',
      cardBackground: '#FFFFFF',
      cardHover: '#FFF5F9',
      textMuted: '#A0526D',
    },
  }),
  'sugar-riot': createThemePalette({
    primary: '#FF1493',
    background: '#0A0A0A',
    text: '#FFFFFF',
    isDark: true,
    overrides: {
      textHeader: '#0A0A0A',
      border: '#FF00FF',
      backgroundSecondary: '#1A0A1A',
      cardBackground: '#1A0A1A',
      cardHover: '#2A1A2A',
      textMuted: '#FFB6FF',
    },
  }),

  // Grayscale themes
  'grayscale-light': createThemePalette({
    primary: '#404040',
    background: '#FFFFFF',
    text: '#000000',
    isDark: false,
    overrides: {
      backgroundSecondary: '#F3F4F6',
      cardHover: '#F3F4F6',
      textMuted: '#6B7280',
    },
  }),
  'grayscale-dark': createThemePalette({
    primary: '#6B7280',
    background: '#111827',
    text: '#F3F4F6',
    isDark: true,
    overrides: {
      border: '#9CA3AF',
      backgroundSecondary: '#1F2937',
      cardHover: '#1F2937',
      textMuted: '#9CA3AF',
    },
  }),

  // WCAG AAA High Contrast themes
  'high-contrast-light': createThemePalette({
    primary: '#0000CC',
    background: '#FFFFFF',
    text: '#000000',
    isDark: false,
    overrides: {
      border: '#000000',
      backgroundSecondary: '#F0F0F0',
      cardHover: '#E0E0E0',
      textMuted: '#333333',
    },
  }),
  'high-contrast-dark': createThemePalette({
    primary: '#FFFF00',
    background: '#000000',
    text: '#FFFFFF',
    isDark: true,
    overrides: {
      textHeader: '#000000',
      backgroundSecondary: '#1A1A1A',
      cardHover: '#333333',
      textMuted: '#CCCCCC',
    },
  }),
};

// ============================================================================
// Theme Service Class
// ============================================================================

/**
 * Service for managing theme system
 * Handles loading, saving, and applying themes
 */
export class ThemeService {
  private static currentTheme: ThemeName = DEFAULT_THEME;
  private static listeners: Set<(theme: ThemeName) => void> = new Set();
  // WEB-BUG-003: Track initialization to prevent double initialization
  private static isInitialized: boolean = false;

  /**
   * Initialize theme service
   * WEB-BUG-003: Protected against double initialization
   */
  static initialize(): void {
    if (this.isInitialized) {
      logger.debug('Theme service already initialized, skipping');
      return;
    }

    const saved = appStorage.getItem<ThemeName>(STORAGE_KEYS.THEME);
    if (saved && this.isValidThemeName(saved)) {
      this.currentTheme = saved;
    } else {
      this.currentTheme = DEFAULT_THEME;
    }

    this.applyTheme(this.currentTheme);
    this.isInitialized = true;
    logger.info(`✅ Theme service initialized: ${this.currentTheme}`);
  }

  /**
   * Get the current theme
   */
  static getCurrentTheme(): ThemeName {
    return this.currentTheme;
  }

  /**
   * Get theme object with palette
   */
  static getTheme(name: ThemeName): Theme {
    if (!this.isValidThemeName(name)) {
      throw new AppError(ErrorCode.INVALID_THEME, `Invalid theme name: ${name}`, 'error');
    }

    // Determine if theme is dark: ends with -dark OR is sugar-riot (dark theme without suffix)
    const isDark = name.endsWith('-dark') || name === 'sugar-riot';
    return {
      name,
      palette: THEME_PALETTES[name],
      isDark,
    };
  }

  /**
   * Get the current theme object
   */
  static getCurrentThemeObject(): Theme {
    return this.getTheme(this.currentTheme);
  }

  /**
   * Get all available themes
   */
  static getAllThemes(): Theme[] {
    return THEME_NAMES.map((name) => this.getTheme(name));
  }

  /**
   * Set the current theme
   */
  static setTheme(themeName: ThemeName): void {
    if (!this.isValidThemeName(themeName)) {
      throw new AppError(ErrorCode.INVALID_THEME, `Invalid theme name: ${themeName}`, 'error');
    }

    this.currentTheme = themeName;
    this.applyTheme(themeName);
    appStorage.setItem(STORAGE_KEYS.THEME, themeName);

    // Notify listeners
    this.listeners.forEach((listener) => listener(themeName));

    logger.info(`✅ Theme changed to: ${themeName}`);
  }

  /**
   * Toggle between light and dark variants of the current theme
   */
  static toggleDarkMode(): void {
    const isCurrentlyDark = this.currentTheme.endsWith('-dark');
    const baseName = this.currentTheme.replace(/-dark$|(-light)$/, '');
    const newTheme = (isCurrentlyDark ? `${baseName}-light` : `${baseName}-dark`) as ThemeName;

    // Check if the new theme variant exists
    if (!this.isValidThemeName(newTheme)) {
      logger.warn(
        `Theme ${this.currentTheme} does not have a ${isCurrentlyDark ? 'light' : 'dark'} variant`
      );
      return;
    }

    this.setTheme(newTheme);
  }

  /**
   * Apply theme to document
   */
  private static applyTheme(themeName: ThemeName): void {
    const theme = this.getTheme(themeName);
    const root = document.documentElement;

    // Remove all theme classes
    THEME_NAMES.forEach((name) => {
      root.classList.remove(`theme-${name}`);
    });

    // Add current theme class
    root.classList.add(`theme-${themeName}`);

    // Set CSS custom properties
    const palette = theme.palette;
    const style = root.style;

    style.setProperty('--theme-primary', palette.primary);
    style.setProperty('--theme-background', palette.background);
    style.setProperty('--theme-text', palette.text);
    style.setProperty('--theme-text-header', palette.textHeader);
    style.setProperty('--theme-border', palette.border);
    style.setProperty('--theme-background-secondary', palette.backgroundSecondary);
    style.setProperty('--theme-card-background', palette.cardBackground);
    style.setProperty('--theme-card-hover', palette.cardHover);
    style.setProperty('--theme-text-muted', palette.textMuted);
  }

  /**
   * Check if a theme name is valid
   */
  private static isValidThemeName(name: unknown): name is ThemeName {
    return typeof name === 'string' && THEME_NAMES.includes(name as ThemeName);
  }

  /**
   * Get color from current theme palette
   */
  static getColor(key: keyof ThemePalette): string {
    const palette = THEME_PALETTES[this.currentTheme];
    return palette[key];
  }

  /**
   * Check if current theme is dark
   */
  static isDarkMode(): boolean {
    return this.currentTheme.endsWith('-dark') || this.currentTheme === 'sugar-riot';
  }

  /**
   * Get the light variant of a theme
   */
  static getLightVariant(themeName: ThemeName): ThemeName {
    const baseName = themeName.replace(/-dark$|(-light)$/, '');
    return `${baseName}-light` as ThemeName;
  }

  /**
   * Get the dark variant of a theme
   */
  static getDarkVariant(themeName: ThemeName): ThemeName {
    const baseName = themeName.replace(/-dark$|(-light)$/, '');
    return `${baseName}-dark` as ThemeName;
  }

  /**
   * Subscribe to theme changes
   */
  static subscribe(listener: (theme: ThemeName) => void): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Reset to default theme
   */
  static resetToDefault(): void {
    this.setTheme(DEFAULT_THEME);
  }

  /**
   * Reset initialization state (for testing only)
   * Allows testing initialize() behavior with different storage states
   * @internal
   */
  static __resetForTesting(): void {
    this.isInitialized = false;
  }

  /**
   * Get theme names by base (e.g., 'standard' returns both light and dark)
   */
  static getThemeVariants(baseName: string): ThemeName[] {
    return THEME_NAMES.filter((name) => name.startsWith(baseName)) as ThemeName[];
  }
}

/**
 * Initialize theme service on module load
 */
if (typeof document !== 'undefined') {
  // Defer initialization to after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      ThemeService.initialize();
    });
  } else {
    ThemeService.initialize();
  }
}
