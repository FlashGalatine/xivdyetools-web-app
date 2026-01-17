# XIV Dye Tools v4.0.0

**Status**: ✅ Stable | **Version**: 4.0.0 | **Release**: January 2026 | **Phase**: Glassmorphism UI Overhaul

A comprehensive web-based toolset for Final Fantasy XIV players to explore dye colors, create harmonious palettes, match colors from images, find smooth color transitions, compare dyes side-by-side, browse community presets, find budget-friendly alternatives, and simulate colorblindness for in-game glamour and housing projects.

---

## What's New in v4.0.0

### ✨ Major UI Overhaul
Complete redesign with a modern **glassmorphism aesthetic** featuring translucent panels, enhanced visual hierarchy, and improved navigation.

### 🔄 Tool Renames
Four tools have been renamed for clarity:
| Previous Name (v3) | New Name (v4) |
|-------------------|---------------|
| Color Matcher | **Palette Extractor** |
| Dye Mixer | **Gradient Builder** |
| Character Color Matcher | **Swatch Matcher** |
| Preset Browser | **Community Presets** |

### 🧪 New Tool: Dye Mixer
Brand new tool that blends two dyes together and finds the closest matching FFXIV dyes to the result. Perfect for discovering unexpected color combinations!

### 🎨 Enhanced Layout
- **Tool Banner** - Quick-access navigation with icons for all tools
- **Config Sidebar** - Persistent left panel for tool settings and filters
- **Color Palette Drawer** - Right-side panel for easy dye selection
- **Theme & Language Modals** - Improved selection experience with live previews

See [CHANGELOG.md](CHANGELOG.md) for detailed release information.

---

## Nine Powerful Tools

| Tool | Description |
|------|-------------|
| **Gradient Builder** | Find smooth color transitions between two dyes with HSV interpolation |
| **Dye Mixer** | Blend two dyes together to discover matching FFXIV dyes |
| **Color Accessibility Checker** | Simulate colorblindness to ensure your glamour is accessible |
| **Color Harmony Explorer** | Generate palettes based on color theory principles |
| **Palette Extractor** | Extract dominant colors from images and find matching dyes |
| **Swatch Matcher** | Match character colors (eyes, hair, skin) to FFXIV dyes |
| **Dye Comparison** | Compare up to 4 dyes side-by-side with color visualization |
| **Community Presets** | Browse, vote on, and share community dye palettes |
| **Budget Suggestions** | Find affordable alternatives to expensive dyes |

---

## Features

### 🎨 Gradient Builder (v4.0.0)
*Previously: Dye Mixer*

Find smooth color transitions between any two FFXIV dyes using HSV color space interpolation. Perfect for housing decorators seeking bridge colors.

**Core Features:**
- **HSV Color Interpolation** - Smooth, natural color transitions
- **Flexible Steps** - Generate 3, 4, 7, or 9 intermediate dyes
- **Deviance Rating** - 0-10 scale showing match accuracy
- **Visual Gradient** - Interactive preview with hover tooltips
- **Save & Share** - Store custom gradients with shareable URLs

**Dye Filters:**
- Exclude Metallic, Pastel, Dark, or Cosmic dyes
- Persistent filter preferences saved to localStorage
- Filters included in shareable URLs

---

### 🧪 Dye Mixer (v4.0.0) — NEW

Blend two dyes together and discover matching FFXIV dyes for the combined color.

**Core Features:**
- **Crafting-Style UI** - Two input slots plus result slot
- **RGB Color Blending** - Averages the RGB values of both dyes
- **Smart Matching** - Finds closest FFXIV dyes to the blended result
- **Adjustable Results** - Configure 3-8 result dyes
- **Full Integration** - Filter support and Market Board pricing

**How It Works:**
1. Select your first dye in slot A
2. Select your second dye in slot B
3. View the blended color and closest matching FFXIV dyes
4. Click any result to see details or add to comparison

---

### ♿ Color Accessibility Checker (v4.0.0)
Simulate how FFXIV dyes appear to players with colorblindness and ensure your glamour is accessible.

> **⚠ BETA Notice:** Uses scientific colorblindness simulation algorithms (Brettel 1997). Feedback from colorblind players appreciated!

**Vision Simulations:**
- **Deuteranopia** - Red-green colorblindness (~1% of population)
- **Protanopia** - Red-green colorblindness (~1% of population)
- **Tritanopia** - Blue-yellow colorblindness (~0.001% of population)
- **Achromatopsia** - Complete color blindness (~0.003% of population)

**Features:**
- Adjustable intensity sliders (0-100%)
- Support for 6+ outfit dyes with dual dye option
- Accessibility score (0-100) rating
- Distinguishability warnings for problem color pairs
- Smart dye suggestions with one-click replacement

---

### 🎨 Color Harmony Explorer (v4.0.0)
Generate color harmonies based on established color theory principles.

**Harmony Types:**
- **Complementary** - Colors opposite on the wheel
- **Analogous** - Adjacent colors
- **Triadic** - Three evenly spaced colors
- **Split-Complementary** - Base plus two adjacent complements
- **Tetradic** - Four colors in complementary pairs
- **Square** - Four evenly spaced colors

**Interactive Features:**
- Color wheel highlighting on hover
- Deviance rating system (0-10 scale)
- Zoom functionality for detailed viewing

---

### 🔍 Palette Extractor (v4.0.0)
*Previously: Color Matcher*

Upload images or pick colors to find the closest matching FFXIV dyes.

**Extraction Modes:**
- **Single Color** - Click anywhere on image to sample
- **Palette Mode** - Extract 3-5 dominant colors using K-means++ clustering

**Image Controls:**
- Drag-and-drop or clipboard paste (Ctrl+V / Cmd+V)
- Zoom: 25%-1000% with keyboard shortcuts
- Pan with Shift+Drag
- Configurable sample size (1x1 to 64x64 pixels)

**Smart Features:**
- Automatic zoom for portrait/landscape images
- Dominance percentages for extracted colors
- Recent colors history (last 5 samples)

---

### 👤 Swatch Matcher (v4.0.0)
*Previously: Character Color Matcher*

Match your character's colors to the closest FFXIV dyes.

**Supported Colors:**
- Eyes (iris color)
- Hair (main color)
- Highlights
- Skin tone
- Lip color
- Tattoo color
- Face paint

**Features:**
- Direct color input or color picker
- Closest dye matches with distance indicators
- Full filter and pricing integration

---

### ⚖️ Dye Comparison (v4.0.0)
Compare up to 4 FFXIV dyes side-by-side with comprehensive color analysis.

**Visualization:**
- **Hue-Saturation Chart** - 2D color space positioning
- **Brightness Chart** - 1D brightness distribution
- **Color Distance Matrix** - Visual similarity analysis
  - Green: Very similar (< 50)
  - Yellow: Similar (50-99)
  - Red: Dissimilar (≥ 100)

**Export Options:**
- JSON with complete data
- CSS custom properties
- Hex codes with names
- Formatted summary

**Cross-Game Support:**
HSV values can be used in other games like Monster Hunter Wilds.

---

### 🗳️ Community Presets (v4.0.0)
*Previously: Preset Browser*

Browse, vote on, and share community-created dye palettes.

**Features:**
- **Category Tabs** - Jobs, Grand Companies, Seasons, Events, Aesthetics
- **Voting System** - Discord authentication required
- **Deep Linking** - Share direct links to presets
- **Submit & Edit** - Create and modify your own presets
- **Duplicate Detection** - Links to existing similar presets

---

### 💰 Budget Suggestions (v4.0.0)
Find affordable alternatives to expensive dyes within your budget.

**Features:**
- **Quick Picks** - One-click selection for popular expensive dyes
- **Budget Slider** - Set max price (0 to 1,000,000 gil)
- **Color Distance Threshold** - Adjustable Delta-E tolerance (25-100)
- **Sort Options** - Best Match, Lowest Price, or Best Value

**Results Display:**
- Side-by-side color comparison
- Distance indicator bar
- Price and savings calculation

---

### 💰 Market Board Integration
Real-time dye prices from the Universalis API.

- Support for all FFXIV data centers and worlds
- Alphabetized data center selection
- Selective pricing by dye category
- Automatic price caching
- Toggle between acquisition info and market prices

---

### 🎯 Advanced Filtering
Customize your color exploration across all tools.

- Filter by acquisition method
- Exclude metallic dyes
- Exclude facewear colors
- Exclude Jet Black and Pure White
- Search by name, category, or hex code

---

### 📤 Export Options
Save palettes in multiple formats:

- **JSON** - Complete palette data
- **CSS** - Custom properties (variables)
- **SCSS** - Sass variables
- **Clipboard** - Individual or all hex codes

---

### 🌓 Theme System (v4.0.0)
12 theme variants with WCAG compliance.

**Available Themes:**
- Standard (red, light/dark)
- Hydaelyn (sky blue, light only)
- OG Classic Dark (deep blue)
- Parchment (warm beige, light/dark)
- Sugar Riot (vibrant pink, light/dark)
- Grayscale (pure black/white/gray, light/dark)
- High Contrast (maximum accessibility, light/dark)

**New in v4.0.0:**
- Theme selection via modal with live preview
- Smooth 200ms transitions between themes
- Persistent preferences via localStorage

---

### ✨ Glassmorphism UI (v4.0.0)
Complete visual redesign with modern aesthetics.

**Layout Components:**
- **App Header** - Brand, theme selector, user menu
- **Tool Banner** - Quick navigation with tool icons
- **Config Sidebar** - Tool settings and filters (left panel)
- **Color Palette Drawer** - Dye selection (right panel)

**Design Features:**
- Translucent glassmorphism panels
- Enhanced visual hierarchy
- Improved responsive behavior
- Touch-friendly mobile experience
- Keyboard navigation throughout

**Accessibility:**
- WCAG 2.1 AA compliant themes
- Screen reader compatible
- Focus indicators on all elements
- Reduced motion support

---

## Getting Started

### Online Access
**XIV Dye Tools Official Website**: [https://xivdyetools.projectgalatine.com/](https://xivdyetools.projectgalatine.com/)

- Access all tools online without installation
- Latest features and updates
- Optimized for mobile, tablet, and desktop

### Mobile Optimization
All tools are fully responsive:

- **Responsive Design** - Adapts from 375px to 1920px+
- **Touch-Friendly** - 44px minimum touch targets
- **Camera Capture** - Use device camera for color matching
- **Offline Support** - Service worker caching for basic functionality

### Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/FlashGalatine/xivdyetools-web-app.git
   cd xivdyetools-web-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

---

## Usage

### Using the Dye Mixer
1. Open the **Dye Mixer** tool from the Tool Banner
2. Click the first slot and select a dye from the palette
3. Click the second slot and select another dye
4. View the blended result and closest matching dyes
5. Click any result for details or to add to comparison

### Finding Color Gradients
1. Open **Gradient Builder** from the Tool Banner
2. Select start and end dyes
3. Choose the number of intermediate steps (3, 4, 7, or 9)
4. View the gradient with deviance ratings
5. Save or share your gradient

### Extracting Colors from Images
1. Open **Palette Extractor** from the Tool Banner
2. Upload an image or paste from clipboard
3. Toggle between Single Color and Palette Mode
4. Click to sample or extract dominant colors
5. View matched FFXIV dyes

### Checking Accessibility
1. Open **Color Accessibility Checker** from the Tool Banner
2. Select your outfit dyes (up to 6+ with dual dye option)
3. Adjust vision simulation intensity sliders
4. Review accessibility score and warnings
5. Use suggested alternatives for problem colors

### Matching Character Colors
1. Open **Swatch Matcher** from the Tool Banner
2. Enter or pick your character's colors
3. View the closest matching FFXIV dyes
4. Apply filters as needed

### Comparing Dyes
1. Open **Dye Comparison** from the Tool Banner
2. Select up to 4 dyes to compare
3. View charts and color distance matrix
4. Export as JSON, CSS, or copy hex codes

### Browsing Community Presets
1. Open **Community Presets** from the Tool Banner
2. Browse by category or search
3. Click a preset to view details
4. Vote on presets you like (requires Discord login)
5. Submit your own presets

### Finding Budget Alternatives
1. Open **Budget Suggestions** from the Tool Banner
2. Select a target dye or use Quick Picks
3. Set your budget limit
4. Sort by match quality, price, or value
5. View alternatives with savings

---

## Data Sources

- **Color Data** - Complete FFXIV dye database with RGB, HSV, hex, and acquisition
- **Market Prices** - Real-time data from [Universalis API](https://universalis.app/)
- **Server Data** - FFXIV data centers and world information

---

## Technology Stack

- **TypeScript 5.x** - Strict mode with full type safety
- **Vite 7.x** - Modern build system with instant HMR
- **Lit 3.x** - Web Components framework for v4 UI
- **Tailwind CSS 4.x** - Utility-first CSS framework
- **Vitest 4.x** - Unit testing framework
- **xivdyetools-core** - Shared npm library for color algorithms
- **Service Worker** - Offline caching and network detection

---

## Browser Compatibility

Works in all modern browsers supporting ES6+:
- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Author

Created by **Flash Galatine** (Balmung)

- [Lodestone](https://na.finalfantasyxiv.com/lodestone/character/7677106/)
- [Blog](https://blog.projectgalatine.com/)
- [GitHub](https://github.com/FlashGalatine)
- [X / Twitter](https://x.com/AsheJunius)
- [Twitch](https://www.twitch.tv/flashgalatine)
- [BlueSky](https://bsky.app/profile/projectgalatine.com)
- [Patreon](https://patreon.com/ProjectGalatine)
- [Ko-Fi](https://ko-fi.com/flashgalatine)
- [Discord](https://discord.gg/5VUSKTZCe5)

---

## Acknowledgments

- Color harmony algorithms based on traditional color theory
- Market board data provided by [Universalis](https://universalis.app/)
- FFXIV game data is property of Square Enix Co., Ltd.
- Built with love for Eorzea's fashionistas ✨

---

## Disclaimer

This is a fan-made tool and is not affiliated with or endorsed by Square Enix Co., Ltd. FINAL FANTASY is a registered trademark of Square Enix Holdings Co., Ltd.
