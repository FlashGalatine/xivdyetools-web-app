/**
 * XIV Dye Tools - UI SVG Icons
 *
 * Inline SVG icons for UI elements using currentColor for theme adaptation
 * These replace external SVG files loaded via <img> tags which can't inherit color
 *
 * @module shared/ui-icons
 */

/**
 * Theme Switcher icon - Paint palette
 */
export const ICON_THEME = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M 12 2 C 6.5 2 2 6.5 2 12 C 2 14.5 3 16.5 4.5 18 C 5 18.5 6 18.5 6.5 18 C 7 17.5 7 16.5 6.5 15.5 C 6 14.5 6 13 6 12 C 6 8.7 8.7 6 12 6 C 15.3 6 18 8.7 18 12 C 18 15.3 15.3 18 12 18 L 10 18 C 9 18 8 19 8 20 C 8 21 9 22 10 22 L 12 22 C 17.5 22 22 17.5 22 12 C 22 6.5 17.5 2 12 2 Z" />
  <circle cx="8.5" cy="10.5" r="1.5" fill="currentColor" stroke="none" opacity="0.6" />
  <circle cx="12" cy="8" r="1.5" fill="currentColor" stroke="none" opacity="0.8" />
  <circle cx="15.5" cy="10.5" r="1.5" fill="currentColor" stroke="none" opacity="0.4" />
</svg>`;

/**
 * Camera icon - Take photo
 */
export const ICON_CAMERA = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="8" width="18" height="12" rx="2" />
  <circle cx="12" cy="14" r="3" />
  <circle cx="17" cy="10.5" r="0.5" fill="currentColor" stroke="none" />
  <path d="M 9 8 L 9 6 L 15 6 L 15 8" />
</svg>`;

/**
 * Eyedropper icon - Color picker tool
 */
export const ICON_EYEDROPPER = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="18" cy="6" r="2.5" />
  <path d="M 17 8.5 L 14 11.5 L 9 16.5 L 6 19.5" />
  <path d="M 6 19.5 L 4.5 21 L 3 19.5 L 4.5 18 Z" fill="currentColor" />
  <line x1="14" y1="11.5" x2="12" y2="13.5" />
  <line x1="11" y1="14.5" x2="9" y2="16.5" />
</svg>`;

/**
 * Save icon - Floppy disk
 */
export const ICON_SAVE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M 19 21 L 5 21 C 3.9 21 3 20.1 3 19 L 3 5 C 3 3.9 3.9 3 5 3 L 16 3 L 21 8 L 21 19 C 21 20.1 20.1 21 19 21 Z" />
  <rect x="6" y="3" width="9" height="5" />
  <rect x="7" y="13" width="10" height="6" rx="1" />
</svg>`;

/**
 * Share icon - Chain link
 */
export const ICON_SHARE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M 10 13 C 10.7 13.7 11.5 14 12.5 14 C 13.5 14 14.3 13.7 15 13 L 18 10 C 18.7 9.3 19 8.5 19 7.5 C 19 6.5 18.7 5.7 18 5 C 17.3 4.3 16.5 4 15.5 4 C 14.5 4 13.7 4.3 13 5 L 11.5 6.5" />
  <path d="M 14 11 C 13.3 10.3 12.5 10 11.5 10 C 10.5 10 9.7 10.3 9 11 L 6 14 C 5.3 14.7 5 15.5 5 16.5 C 5 17.5 5.3 18.3 6 19 C 6.7 19.7 7.5 20 8.5 20 C 9.5 20 10.3 19.7 11 19 L 12.5 17.5" />
</svg>`;

/**
 * Hint icon - Light bulb
 */
export const ICON_HINT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M 12 3 C 9 3 7 5 7 8 C 7 10 8 11.5 9 12.5 L 9 15 C 9 16 10 17 11 17 L 13 17 C 14 17 15 16 15 15 L 15 12.5 C 16 11.5 17 10 17 8 C 17 5 15 3 12 3 Z" />
  <line x1="10" y1="17" x2="14" y2="17" />
  <line x1="10.5" y1="19" x2="13.5" y2="19" />
  <circle cx="12" cy="9" r="1.5" fill="currentColor" stroke="none" opacity="0.5" />
</svg>`;

/**
 * Zoom to Fit icon
 */
export const ICON_ZOOM_FIT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <rect x="4" y="4" width="16" height="16" />
  <polyline points="9,4 4,4 4,9" />
  <polyline points="15,4 20,4 20,9" />
  <polyline points="9,20 4,20 4,15" />
  <polyline points="15,20 20,20 20,15" />
</svg>`;

/**
 * Zoom to Width icon
 */
export const ICON_ZOOM_WIDTH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <rect x="4" y="7" width="16" height="10" />
  <line x1="2" y1="12" x2="7" y2="12" />
  <polyline points="4,10 2,12 4,14" />
  <line x1="22" y1="12" x2="17" y2="12" />
  <polyline points="20,10 22,12 20,14" />
</svg>`;

/**
 * Crystal icon - FFXIV-style gem (from monorepo crystal.svg)
 */
export const ICON_CRYSTAL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 2L19 9L12 22L5 9L12 2Z" />
  <path d="M12 2V22" opacity="0.5" />
  <path d="M5 9L12 13L19 9" opacity="0.5" />
  <path d="M19 4L21 4" opacity="0.4" />
  <path d="M20 3V5" opacity="0.4" />
</svg>`;

/**
 * Warning icon - Triangle with exclamation
 */
export const ICON_WARNING = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 3L2 21h20L12 3Z" />
  <line x1="12" y1="9" x2="12" y2="13" />
  <circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="none" />
</svg>`;

/**
 * Upload icon - Folder with arrow
 */
export const ICON_UPLOAD = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M 4 8 L 4 18 C 4 19 5 20 6 20 L 18 20 C 19 20 20 19 20 18 L 20 8 C 20 7 19 6 18 6 L 10 6 L 8 4 L 6 4 C 5 4 4 5 4 6 Z" />
  <line x1="12" y1="16" x2="12" y2="10" stroke-width="2" />
  <polyline points="9,13 12,10 15,13" stroke-width="2" />
</svg>`;

/**
 * Dice icon - Random selection
 */
export const ICON_DICE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="3" width="18" height="18" rx="3" />
  <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
  <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
  <circle cx="16" cy="16" r="1.5" fill="currentColor" stroke="none" />
</svg>`;

/**
 * Coins icon - Budget/Gil (FFXIV-style stacked coins)
 */
export const ICON_COINS = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <ellipse cx="12" cy="7" rx="7" ry="3" />
  <path d="M5 7v4c0 1.66 3.13 3 7 3s7-1.34 7-3V7" />
  <path d="M5 11v4c0 1.66 3.13 3 7 3s7-1.34 7-3v-4" />
  <path d="M5 15v2c0 1.66 3.13 3 7 3s7-1.34 7-3v-2" />
</svg>`;

/**
 * Broom icon - Clear/sweep action
 */
export const ICON_BROOM = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 2L12 10" />
  <path d="M9 10L15 10L17 22L7 22L9 10Z" />
  <path d="M9 14L15 14" opacity="0.5" />
  <path d="M8 18L16 18" opacity="0.5" />
</svg>`;

/**
 * Map of UI icon names to SVG strings
 */
export const UI_ICONS: Record<string, string> = {
  theme: ICON_THEME,
  camera: ICON_CAMERA,
  eyedropper: ICON_EYEDROPPER,
  save: ICON_SAVE,
  share: ICON_SHARE,
  hint: ICON_HINT,
  'zoom-fit': ICON_ZOOM_FIT,
  'zoom-width': ICON_ZOOM_WIDTH,
  crystal: ICON_CRYSTAL,
  upload: ICON_UPLOAD,
  warning: ICON_WARNING,
  dice: ICON_DICE,
  coins: ICON_COINS,
  broom: ICON_BROOM,
};

/**
 * Get UI icon by name
 */
export function getUIIcon(name: string): string | undefined {
  return UI_ICONS[name];
}
