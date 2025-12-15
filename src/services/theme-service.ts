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
// Theme Definitions
// ============================================================================

const THEME_PALETTES: Record<ThemeName, ThemePalette> = {
  'standard-light': {
    // Rich burgundy/maroon on light gray - WCAG AA compliant
    primary: '#8B1A1A', // Rich burgundy red
    background: '#D3D3D3', // Light gray background
    text: '#1A1A1A', // Near black for 4.5:1+ contrast on light gray
    textHeader: '#FFFFFF', // White text on burgundy header
    border: '#6B1515', // Darker burgundy for borders
    backgroundSecondary: '#E0E0E0', // Slightly lighter gray
    cardBackground: '#F5F5F5', // Off-white cards
    cardHover: '#FFFFFF', // Pure white on hover
    textMuted: '#4A4A4A', // Medium gray for muted text
  },
  'standard-dark': {
    // Warm coral/red on dark gray - WCAG AA compliant
    primary: '#E85A5A', // Warm coral red
    background: '#2D2D2D', // Dark gray background
    text: '#F5F5F5', // Light gray text for 4.5:1+ contrast
    textHeader: '#1A1A1A', // Dark text on coral header
    border: '#F08080', // Light coral for borders
    backgroundSecondary: '#333333', // Slightly lighter dark gray
    cardBackground: '#1F1F1F', // Very dark cards
    cardHover: '#3A3A3A', // Lighter on hover
    textMuted: '#B0B0B0', // Medium gray for muted text
  },
  'hydaelyn-light': {
    primary: '#4056A4',
    background: '#B2C4CE',
    text: '#312D57',
    textHeader: '#F9F8F4',
    border: '#4056A4',
    backgroundSecondary: '#B2C4CE',
    cardBackground: '#F9F8F4',
    cardHover: '#FDFDFC',
    textMuted: '#0C4A6E',
  },
  'og-classic-dark': {
    primary: '#1E40AF',
    background: '#181820',
    text: '#F9F8F4',
    textHeader: '#F9F8F4',
    border: '#E4DFD0',
    backgroundSecondary: '#4056A4',
    cardBackground: '#000B9D',
    cardHover: '#5052D9',
    textMuted: '#E4DFD0',
  },
  'parchment-light': {
    primary: '#D97706',
    background: '#FEF3C7',
    text: '#78350F',
    textHeader: '#78350F', // Default: same as text
    border: '#FCD34D',
    backgroundSecondary: '#FEF9E7',
    cardBackground: '#FEF3C7',
    cardHover: '#FEF9E7',
    textMuted: '#92400E',
  },
  'cotton-candy': {
    // Soft pastel theme - light and airy
    primary: '#FFB6D9', // Soft pastel pink
    background: '#FFF5F9', // Very light pink background
    text: '#8B1A4A', // Dark pink for 4.5:1+ contrast
    textHeader: '#8B1A4A', // Dark pink header text
    border: '#FFC0E0', // Light pink border
    backgroundSecondary: '#FFF9FC', // Almost white secondary
    cardBackground: '#FFFFFF', // Pure white cards
    cardHover: '#FFF5F9', // Light pink on hover
    textMuted: '#A0526D', // Muted pink-gray
  },
  'sugar-riot': {
    // Neon cyberpunk theme - pink primary, blue secondary, yellow tertiary
    primary: '#FF1493', // Neon pink (DeepPink)
    background: '#0A0A0A', // Very dark background
    text: '#FFFFFF', // White text for maximum contrast
    textHeader: '#0A0A0A', // Dark text on neon pink header
    border: '#FF00FF', // Magenta border
    backgroundSecondary: '#1A0A1A', // Dark purple-gray
    cardBackground: '#1A0A1A', // Dark cards
    cardHover: '#2A1A2A', // Lighter on hover
    textMuted: '#FFB6FF', // Light pink for muted text
  },
  'grayscale-light': {
    primary: '#404040',
    background: '#FFFFFF',
    text: '#000000',
    textHeader: '#FFFFFF',
    border: '#404040',
    backgroundSecondary: '#F3F4F6',
    cardBackground: '#FFFFFF',
    cardHover: '#F3F4F6',
    textMuted: '#6B7280',
  },
  'grayscale-dark': {
    // Professional dark theme
    primary: '#6B7280',
    background: '#111827',
    text: '#F3F4F6',
    textHeader: '#F3F4F6',
    border: '#9CA3AF',
    backgroundSecondary: '#1F2937',
    cardBackground: '#111827',
    cardHover: '#1F2937',
    textMuted: '#9CA3AF',
  },
  'high-contrast-light': {
    // WCAG AAA compliant high contrast light theme
    // Pure black on white for maximum 21:1 contrast ratio
    primary: '#0000CC', // Bold blue primary for clear visibility
    background: '#FFFFFF', // Pure white background
    text: '#000000', // Pure black text - 21:1 contrast
    textHeader: '#FFFFFF', // White text on blue header
    border: '#000000', // Black borders for maximum definition
    backgroundSecondary: '#F0F0F0', // Light gray for subtle distinction
    cardBackground: '#FFFFFF', // Pure white cards
    cardHover: '#E0E0E0', // Noticeable hover state
    textMuted: '#333333', // Dark gray for muted text - still 12.6:1 contrast
  },
  'high-contrast-dark': {
    // WCAG AAA compliant high contrast dark theme
    // Pure white on black for maximum 21:1 contrast ratio
    primary: '#FFFF00', // Bold yellow primary for maximum visibility
    background: '#000000', // Pure black background
    text: '#FFFFFF', // Pure white text - 21:1 contrast
    textHeader: '#000000', // Black text on yellow header
    border: '#FFFFFF', // White borders for maximum definition
    backgroundSecondary: '#1A1A1A', // Very dark gray for subtle distinction
    cardBackground: '#000000', // Pure black cards
    cardHover: '#333333', // Noticeable hover state
    textMuted: '#CCCCCC', // Light gray for muted text - still 13.1:1 contrast
  },
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
