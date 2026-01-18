# XIV Dye Tools – Front-End Style Guide

## 1. Surface Tokens

We ship three primary “surfaces.” Choose the token that matches the job:

| Token | Use For | Notes |
|-------|---------|-------|
| `--theme-background` | Page chrome (`app-shell`, body) | Stays visible behind cards/tool panels |
| `--theme-card-background` | Cards, modals, tool panels | Matches Lit components that use `bg-white` / `dark:bg-gray-800` |
| `--theme-card-hover` | Button/text hover states | Defined per theme, keeps hover legible without hardcoding gray |

`ThemeService` now sets all three tokens (plus `--theme-primary`, `--theme-text`, etc.). If you need a hover/focus color, use the token instead of a literal gray/opacity.

## 2. Sticky Header / Footer

`app-layout` owns the global chrome:

- `.app-shell` wraps the entire experience and inherits `--theme-background`.
- `.app-header` sticks to the top, uses `--theme-primary`, and casts a subtle drop shadow for the “mini-hero” look.
- `.app-footer` mirrors card styling and keeps borders aligned with `--theme-border`.

Avoid reintroducing `bg-white`/`dark:bg-gray-900` on those surfaces—let the shared classes handle it.

## 3. Buttons & Hover States

- Prefer Tailwind utility classes + theme tokens. Example:
  ```ts
  className: 'px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-gray-100'
  ```
  The hover class is remapped to `--theme-card-hover` so you still get per-theme contrast.
- For secondary buttons, compose `border`, `text-gray-*`, and `hover:bg-gray-*`; the overrides in `themes.css` keep everything coherent.

## 4. Responsive Controls

- Default to `flex flex-col sm:flex-row gap-2` for button rows. This keeps 375 px layouts from overflowing (Generate/Clear rows, dye-selector search actions, etc.).
- Use `w-full sm:w-auto` on buttons that should stretch on mobile.

## 5. Color Tokens in Components

- Do **not** hardcode literal hex values inside components, except when referencing dye colors themselves. Everything else should use the theme variables or utility classes re-skinned by `themes.css`.
- When you need a new semantic color (e.g., warning states), add it to `ThemePalette` and update `ThemeService` so dark/light themes stay in sync.

## 6. Reference Docs

- `docs/ARCHITECTURE.md` – overview of the TypeScript + Lit structure.
- `docs/PRIVACY.md` – what data stays on-device (important for color/image tooling).
- `docs/TROUBLESHOOTING.md` – known responsive gotchas and fixes.
- `docs/I18N.md` – internationalization patterns and translation key usage.

Keep this guide close when building new components so the app stays visually consistent as we iterate. 

