# XIV Dye Tools v3.2.10

**Status**: ✅ Stable | **Version**: 3.2.10 | **Release**: January 2026 | **Phase**: Localization & Security

A comprehensive web-based toolset for Final Fantasy XIV players to explore dye colors, create harmonious color palettes, match colors from images, find smooth color transitions, compare dyes side-by-side, browse community presets, find budget-friendly alternatives, and simulate how dye combinations appear to colorblind players for in-game gear and housing projects.

> **v3.2.10 Release Notes**: Complete localization review and fixes for all 6 supported languages (EN, DE, FR, JA, KO, ZH). Fixed in-game terminology to match official FFXIV localization. Comprehensive security documentation added. See [CHANGELOG.md](CHANGELOG.md) for detailed release information.

**Seven Powerful Tools:**
- **Dye Mixer** - Find smooth color transitions between two dyes with HSV interpolation
- **Color Accessibility Checker** - Simulate colorblindness and ensure your glamour is accessible to everyone
- **Color Harmony Explorer** - Generate color palettes based on color theory principles
- **Color Matcher** - Upload images and find the closest matching FFXIV dyes
- **Dye Comparison** - Compare up to 4 dyes side-by-side with detailed color visualization
- **Preset Browser** - Browse, vote on, edit, and share community dye palettes
- **Budget Suggestions** - Find affordable alternatives to expensive dyes within your budget

## Features

### 🎨 Dye Mixer (v2.0.0)
Find smooth color transitions between any two FFXIV dyes using HSV color space interpolation. Perfect for decorators and interior designers discovering bridge colors for housing projects.

**Core Features:**
- **HSV Color Interpolation** - Smooth color transitions in HSV color space (more natural than RGB)
- **Flexible Intermediate Dyes** - Generate 3, 4, 7, or 9 intermediate dyes between start and end colors
- **Deviance Rating System** - 0-10 scale showing how closely each dye matches its theoretical position (0 = perfect, 10 = poor)
- **Visual Gradient Progression** - Interactive gradient visualization with color swatches and labels
- **Interactive Tooltips** - Hover over any point in gradient to see interpolated Hex, RGB, HSV values
- **Responsive Layout** - Adapts to portrait/landscape orientation on mobile and desktop

**Save & Share Features:**
- **Save Gradients** - Store unlimited custom gradients with user-defined names
- **Load Saved Gradients** - Restore any saved gradient with one click
- **Shareable URLs** - Generate links that load gradient configuration and filter settings
- **Collapsible Panel** - All saved gradients in expandable section showing creation date/time

**Dye Exclusion Filters:**
- **Advanced Dye Filters Component** - Reusable filter system integrated across all tools
- **Exclude by Type** - Filter out Metallic, Pastel, Dark, or Cosmic dyes from recommendations
- **Exclude Dark Dyes** - Hide dyes that begin with "Dark" in their name
- **Exclude Cosmic Dyes** - Hide dyes with "Cosmic Exploration" or "Cosmic Fortunes" acquisition
- **Collapsible UI** - Filters start collapsed by default to reduce visual clutter
- **Auto-Regenerate** - Recommendations update instantly when filter settings change
- **Persistent Filters** - Selections saved to localStorage and included in shareable URLs

**Market Board Integration:**
- **Real-Time Pricing** - Fetch dye prices from Universalis API for all data centers/worlds
- **Server Selection** - Choose data center and world for accurate pricing
- **Acquisition Information** - Fallback display of dye acquisition method (e.g., "Dye Vendor", "Cosmic Exploration") when market data unavailable
- **Price Filtering** - Toggle pricing visibility per dye category (Base, Craft, Allied Society, Cosmic, Special)

**Accessibility & Theme Support:**
- **12 Theme Variants** - Choose from 6 theme families with light/dark options (including High Contrast)
- **Smooth Animations** - Card details expand/collapse with 0.3s transitions
- **Responsive Design** - Optimized for desktop, tablet, and mobile
- **XSS Protection** - HTML escaping for safety in dynamic content

### ♿ Color Accessibility Checker (v2.0.0)
Simulate how FFXIV dyes appear to players with colorblindness and ensure your glamour is accessible to everyone:

> **⚠ BETA Notice:** This tool uses scientific colorblindness simulation algorithms (Brettel 1997), but has not been validated with actual colorblind players. We recommend testing with real users for critical designs. Feedback from users with colorblindness experience is greatly appreciated!

**Vision Type Simulations:**
- **Deuteranopia** (red-green colorblindness, ~1% of population)
- **Protanopia** (red-green colorblindness, ~1% of population)
- **Tritanopia** (blue-yellow colorblindness, ~0.001% of population)
- **Achromatopsia** (complete color blindness, ~0.003% of population)

**Adjustable Features:**
- **Intensity Sliders** - Control severity level (0-100%) for Deuteranopia, Protanopia, and Tritanopia
- **Real-time Updates** - See how your color choices change as you adjust sliders
- **Outfit Planning** - Support for up to 6+ dyes representing complete outfit (Head, Body, Hands, Legs, Feet, Weapon)
- **Dual Dyes Support** - Toggle on to assign both primary and secondary dyes to each armor slot
- **Toggle Persistence** - Dual Dyes toggle state persists across page refreshes

**Accessibility Analysis:**
- **Distinguishability Warnings** - Automatically detects color pairs that become indistinguishable for specific vision types
- **Accessibility Score** (0-100) - Rates overall palette accessibility across all colorblindness types
- **Color Distance Matrix** - Shows Euclidean distances between selected dyes
- **Contrast Ratio Calculation** - Evaluates contrast between dye colors

**Smart Recommendations:**
- **Dye Suggestions** - Suggests alternative dyes for flagged colors while maintaining aesthetic similarity
- **One-Click Replacement** - Replace problematic dyes with suggestions and watch the issue count update automatically
- **Hue-Saturation Matching** - Finds similar dyes based on color space to preserve intended color scheme

### 🎨 Color Harmony Explorer (v2.0.0)
Generate color harmonies based on FFXIV's dye palette using established color theory principles:
- **Complementary** - Colors opposite on the color wheel
- **Analogous** - Colors adjacent on the color wheel
- **Triadic** - Three colors evenly spaced around the color wheel
- **Split-Complementary** - Base color plus two colors adjacent to its complement
- **Tetradic (Rectangular)** - Four colors in two complementary pairs
- **Square** - Four colors evenly spaced around the color wheel

**Interactive Features:**
- **Color Wheel Highlighting** - Hover over color swatches to see their position illuminated on the color wheel
- **Deviance Rating System** - 0-10 scale showing how closely matched dyes align with ideal color theory (green = excellent, yellow = good, red = poor)
- **Deviance Line Visualization** - Hover over deviance badges to see lines connecting base colors to matched colors on the wheel
- **Zoom Functionality** - Enlarge any harmony section for detailed viewing with Zoom In/Out buttons, Escape key to exit, or click backdrop
- **Two-Column Layout** - Optimized for 1080p displays with sticky sidebar containing all controls and 2-column harmony results grid
- **Tools Navigation Dropdown** - Quick dropdown menu to switch between all XIV Dye Tools

### 🔍 Color Matcher (v2.5.0)
Upload an image or pick a color to find the closest matching FFXIV dye with an intuitive two-column interface:

**New in v2.5.0 - Multi-Color Palette Extraction:**
- **Extraction Mode Toggle** - Switch between Single Color (click to sample) and Palette Mode (extract dominant colors)
- **K-means++ Clustering** - Extract 3-5 dominant colors from any image using advanced clustering algorithm
- **Color Count Slider** - Choose how many dominant colors to extract (3, 4, or 5)
- **Visual Sampling Indicators** - See exactly where each color was sampled with colored circles on the image
- **Palette Results Display** - Color bar visualization with extracted → matched dye comparison
- **Dominance Percentages** - See how much of the image each color represents
- **Copy Hex Buttons** - Quick copy for each matched dye's hex code
- **6-Language Support** - Full localization (en, ja, de, fr, ko, zh)

**Previous Features (v1.3.0):**
- **Clipboard Image Paste** - Paste images directly using Ctrl+V (Windows/Linux) or Cmd+V (Mac)
  - Seamlessly integrates with existing drag-and-drop and file picker methods
  - Perfect for quickly testing screenshots and clipboard images
- **Toast Notifications** - Real-time feedback for all actions:
  - Success: Image loaded, image cleared
  - Errors: Invalid files, read failures, corruption, clipboard issues
  - Warnings: File size alerts
  - Auto-dismiss with smooth animations
- **Keyboard Shortcuts Help** - New (?) button in header shows all shortcuts:
  - Image Input: Paste (Ctrl+V / Cmd+V)
  - Zoom Controls: +, −, W (width), F (fit), R (reset)
  - Canvas: Shift+Wheel (zoom), Shift+Drag (pan), Shift+MiddleClick (fit), Shift+RightClick (reset), Click (pick color)
- **Floating Zoom Controls** - Zoom buttons now fixed in top-left corner:
  - Always visible even with extreme zoom levels
  - Prevents controls from being pushed off-screen with 4K+ images
  - Works perfectly with any image size

**Two-Column Layout:**
- **Left Panel (Sticky)** - All dye matching controls and results:
  - Direct color picker with hex display
  - Closest match results with category and acquisition info
  - Exclusion filters and Market Board settings
  - Remains visible when scrolling through tall images
- **Right Panel** - Image matching workspace:
  - Image upload with drag-and-drop support
  - Configurable sample size (1x1 to 64x64 pixels) for color averaging
  - Image canvas with precise eyedropper tool
- Optimized for 1080p displays with minimal scrolling
- Responsive design switches to single-column on smaller screens

**Core Features:**
- Direct color picker for precise color selection
- Image upload with eyedropper tool (drag-and-drop supported)
- RGB Euclidean distance algorithm for accurate matching
- Configurable sample size (1x1 to 64x64 pixels) for color averaging

**Advanced Image Controls:**
- **Zoom Controls** - Zoom In/Out (25%-1000%), Zoom to Fit, Zoom to Width (ideal for portrait images), Reset to 100%
- **Keyboard Shortcuts** - `+` zoom in, `-` zoom out, `W` zoom to width, `R` reset zoom
- **Mouse Controls** - Shift+MouseWheel (zoom), Shift+LeftClickDrag (pan), Shift+MiddleClick (zoom to fit), Shift+RightClick (reset zoom)
- **Intelligent Auto Zoom** - Automatically detects image orientation and applies optimal zoom:
  - "Zoom to Width" for portrait images (height > width)
  - "Zoom to Width" for extra tall images (height > 1.5x wrapper height)
  - "Zoom to Fit" for landscape and standard aspect ratio images
- **Clear Image Button** - Remove loaded image with one click
- **Centered Canvas** - Images properly centered regardless of orientation or size

**Intelligent Filtering:**
- **Facewear Colors** - Automatically excluded from all suggestions
- **Exclude Metallic Dyes** - Optional checkbox to remove metallic finishes from results
- **Exclude Pure White & Jet Black** - Optional checkbox (default: OFF) for extreme colors

### ⚖️ Dye Comparison (v2.0.0)
Compare up to 4 FFXIV dyes side-by-side with advanced color visualization:

**Core Comparison Features:**
- View complete dye information: name, category, hex code, RGB, HSV, acquisition method, and price
- **Color Distance Matrix** - Visual analysis of color similarities and differences
  - Green: Very similar colors (distance < 50)
  - Yellow: Similar colors (distance 50-99)
  - Red: Dissimilar colors (distance ≥ 100)
- Smart categorized dropdown with dyes organized by type (Neutral, Colors A-Z, Special, Facewear)

**Color Chart Visualization (NEW - v1.1.0):**
- **Hue-Saturation Chart** - 2D visualization showing:
  - Dye positions plotted on hue (horizontal) and saturation (vertical) axes
  - Colored circles indicating actual dye colors
  - Saturation percentages (0-100%) marked on left axis
  - Interactive gradient background showing color space
  - 1080p optimized canvas rendering (1000×750px)
- **Brightness Chart** - 1D visualization showing:
  - Vertical lines for each selected dye at their brightness position
  - Scale from Black (0%) to White (100%)
  - Colored lines using actual dye hex colors
  - 1080p optimized canvas rendering (1000×750px)
- **Dynamic Updates** - Charts automatically refresh when dyes are selected or deselected

**Export & Share**
- Export comparison as JSON file with timestamp
- Generate CSS variables for selected dyes
- Copy hex codes with dye names to clipboard
- Copy formatted summary with color distances

**HSV Values for Other Games**
- HSV values can be used in other games like Monster Hunter Wilds
- Hover over "HSV:" label to see helpful tooltip

**Display & Optimization**
- 1080p display optimization with responsive typography

### 🗳️ Preset Browser (v2.6.0)
Browse, vote on, and share community-created dye palettes:

**Browsing Features:**
- **Category Tabs** - Filter by Jobs, Grand Companies, Seasons, Events, Aesthetics, or Community
- **Sort Options** - Sort by popularity, recency, or name
- **Search** - Search presets by name, description, or tags
- **Curated vs Community** - Toggle between official curated presets and community submissions
- **Detailed Preview** - Click any preset to see full color information with dye swatches

**Voting System (v2.6.0):**
- **Vote Button** - Toggle vote on/off in preset detail panel
- **Real-time Vote Count** - See instant vote count updates
- **Discord Authentication** - Requires login to vote (one vote per user per preset)

**Sharing Features (v2.6.0):**
- **Share Button** - Copy permalink to clipboard
- **Deep Linking** - Direct URLs to specific presets (`/presets/:id`)
- **Automatic Navigation** - Links navigate directly to preset detail view

**Submission & Editing:**
- **Submit Presets** - Create your own dye palette and share with the community
- **Edit Own Submissions** - Modify your non-rejected presets (name, description, dyes, tags)
- **Duplicate Detection** - System detects duplicate dye combinations and links to existing preset
- **Content Moderation** - Automatic filtering for inappropriate content
- **Facewear Filter** - Facewear dyes automatically excluded from submissions

**Integration:**
- **Discord Bot Sync** - Presets submitted via Discord bot appear in web browser
- **Service Binding** - Direct worker-to-worker communication with presets API

### 💰 Budget Suggestions (v3.0.0)
Find affordable alternatives to expensive dyes within your budget constraints. Perfect for glamour planning when you want something like Jet Black but cheaper.

**Core Features:**
- **Target Dye Selection** - Select any dye to find cheaper alternatives
- **Quick Picks** - One-click selection for popular expensive dyes (Pure White, Jet Black, Carmine Red, etc.)
- **Budget Limit Slider** - Set max price from 0 to 1,000,000 gil
- **Color Distance Threshold** - Adjustable Delta-E tolerance (25-100) to control how similar alternatives must be
- **Real-time Price Fetching** - Live market prices from Universalis API with progress indicator

**Sort Options:**
- **Best Match** - Closest color first (lowest Delta-E)
- **Lowest Price** - Cheapest alternatives first
- **Best Value** - Balance of color accuracy and price (70% match, 30% price weighting)

**Results Display:**
- **Color Comparison** - Side-by-side swatches of target and alternative dyes
- **Distance Indicator** - Visual bar showing how close each match is
- **Price & Savings** - Current market price and savings vs target dye
- **Ranked List** - Alternatives displayed with rank badges

**Mobile Support:**
- **Full Drawer Controls** - All settings accessible via mobile drawer
- **Synchronized State** - Desktop and mobile panels stay in sync
- **Touch-Friendly** - Optimized sliders and buttons for mobile devices

**Deep Linking:**
- **URL Parameters** - Share links with `?dye=Jet%20Black` to pre-select target
- **Cross-Tool Navigation** - Links from other tools can navigate directly to Budget Suggestions

### 💰 Market Board Integration
Fetch real-time dye prices from the Universalis API:
- Support for all FFXIV data centers and worlds
- **Alphabetized Data Centers** - Data centers now display in alphabetical order for easier navigation
- Selective price fetching by dye category (Base, Craft, Allied Society, Cosmic, Special)
- Automatic price caching to reduce API calls
- Toggle between original acquisition methods and market prices

### 🎯 Advanced Filtering
Customize your color exploration:
- Filter by acquisition method (vendors, crafting, ventures, etc.)
- Exclude metallic dyes from results
- Exclude facewear-specific colors
- Exclude Jet Black and Pure White for more nuanced palettes
- Search colors by name, category, or hex code

### 📤 Export Options
Save your color palettes in multiple formats:
- JSON export with complete palette data
- CSS custom properties (variables)
- SCSS variables
- Copy individual or all hex codes to clipboard

### 🌓 Theme System (v2.4.0)
Comprehensive theme system with 12 theme variants, all fully WCAG compliant:

**Available Themes:**
- **Standard** - Classic red light/dark (default)
- **Hydaelyn** - FFXIV sky blue (light only)
- **OG Classic Dark** - Deep blue dark theme (FF tradition)
- **Parchment** - Warm beige light/dark (retro aesthetic)
- **Sugar Riot** - Vibrant pink light/dark (fun & playful)
- **Grayscale** - Pure black/white/gray light/dark (accessibility-focused)
- **High Contrast** - Maximum contrast light/dark for visual accessibility (NEW in v2.4.0)

**Theme System Features:**
- Unified theme switcher in navigation (all tools synchronized)
- CSS custom properties (variables) for consistent theming
- All UI elements dynamically adapt to selected theme
- Persistent theme preference storage via localStorage
- Real-time theme switching across all open tool windows
- Full support for all interactive elements: buttons, inputs, sliders, toggles, dropdowns
- **Customizable Header Text Colors** - `--theme-text-header` variable for titles, activated buttons, and header text
- **Theme-Aware Hover Effects** - All action buttons use brightness filter for consistent hover feedback
- **Theme-Aware Input Sliders** - Range inputs use `accent-color` for theme consistency
- Vision Type Simulation sliders theme-aware
- Market Price toggle switches theme-aware
- File input browse button theme-aware

**Technical Implementation:**
- CSS custom properties: `--theme-primary`, `--theme-bg`, `--theme-text`, `--theme-border`, etc.
- Unified theme naming: `body.theme-{name}-{variant}` (e.g., `body.theme-hydaelyn-dark`)
- Automatic Tailwind utility class overrides for theme consistency
- Component-level styling inheritance from theme variables
- No additional JavaScript dependencies beyond localStorage

### ✨ UI/UX Improvements (v2.1.0 - v2.4.1)

Comprehensive UI/UX overhaul delivered across 4 phases:

**Phase 1: Foundation (v2.1.0)**
- **Loading Spinners** - Visual feedback during Universalis API calls
- **Toast Notifications** - Success/error feedback system with auto-dismiss
- **Empty State Designs** - Friendly illustrations for no-results scenarios
- **Keyboard Navigation** - Full keyboard support for dye selector (arrow keys, Enter, Escape)
- **Custom SVG Icons** - 32 theme-adaptive icons replacing emojis for consistent cross-platform display

**Phase 2: Discoverability (v2.2.0)**
- **Welcome Modal** - First-time user introduction with tool overview
- **Contextual Tooltips** - Info icons explaining sample size, WCAG contrast, deviance ratings
- **"What's New" Changelog** - Modal showing recent updates after version changes
- **Dye Preview Overlay** - Color Matcher shows sampled vs matched dye comparison
- **Quick-Add Actions** - Harmony Generator dropdown for adding dyes to comparison/mixer
- **Hover Micro-interactions** - Scale and shadow effects on dye swatches

**Phase 3: Polish (v2.3.0)**
- **Focus Ring Visibility** - Enhanced 3px outlines with theme-aware colors
- **Screen Reader Announcements** - AnnouncerService for aria-live region updates
- **Reduced Motion Support** - Respects `prefers-reduced-motion` preference
- **Interactive Gradient Stops** - Dye Mixer shows clickable stop markers
- **Recent Colors History** - Color Matcher remembers last 5 sampled colors
- **Keyboard Shortcuts Panel** - Press `?` to view all available shortcuts
- **Smooth Theme Transitions** - 200ms color transitions when switching themes

**Phase 4: Advanced Features (v2.4.0)**
- **Interactive Tutorial System** - Step-by-step walkthrough for new users
- **Save Favorite Palettes** - Export/import palettes as JSON, localStorage persistence
- **Camera Capture** - Mobile camera support for Color Matcher with privacy notice
- **Offline Mode** - Service worker caching with offline banner indicator
- **High Contrast Themes** - Light/dark variants for visual accessibility

**Accessibility (WCAG 2.1 AA)**
- All 12 themes are WCAG compliant
- Keyboard navigable throughout
- Screen reader compatible with ARIA labels
- Focus indicators visible on all interactive elements
- Reduced motion support for vestibular disorders

## Getting Started

### Online Access
- **XIV Dye Tools Official Website**: [https://xivdyetools.projectgalatine.com/](https://xivdyetools.projectgalatine.com/)
  - Access all tools online without any installation
  - Live version with latest features and updates
  - Fully optimized for mobile, tablet, and desktop devices
- **XIV Dye Tools Portal** (Home): Open `index.html` in any modern web browser to access all tools
  - Showcases all tools in a beautiful grid layout
  - Quick access to experimental features
  - Feature highlights and navigation
  - Responsive design adapts to all device sizes

> **⚠️ Legacy Files (v1.6.x)**: The `legacy/` folder contains deprecated v1.6.x HTML files that are no longer maintained. These files are preserved for historical reference only. For current development, use the v2.0.0 TypeScript codebase in `src/`. See [legacy/README.md](legacy/README.md) for more information.
- **Easy Navigation**: Use the "Tools ▼" dropdown menu in each tool's header to quickly switch between any tool
  - On mobile devices (≤768px): Bottom navigation bar for easy tool access
  - On larger displays (>768px): Tools dropdown in header as fallback navigation

### Mobile Optimization

All tools are fully optimized for mobile and tablet devices:
- **Responsive Design**: Automatically adapts layout from mobile (375px) through tablets (768px) to desktop (1920px+)
- **Touch-Friendly Navigation**: 44px minimum touch targets on all buttons and controls
- **Optimized Input Methods**: Clipboard paste support, drag-drop, camera capture, and touch-friendly pickers
- **Bottom Navigation on Mobile**: Smart navigation system that switches between bottom nav (mobile) and Tools dropdown (desktop)
- **Camera Capture**: Use device camera for color matching directly in Color Matcher tool
- **Offline Support**: Service worker caching allows basic functionality without network
- **Theme System**: Full 12-theme support on all device sizes with persistent preferences

No installation or server required! All tools work directly in your browser.

### Cloning the Repository

To get a local copy of the project, follow these steps:

1. **Open your terminal or command prompt**

2. **Clone the repository**:
   ```bash
   git clone https://github.com/FlashGalatine/xivdyetools-web-app.git
   ```

3. **Navigate to the project directory**:
   ```bash
   cd xivdyetools-web-app
   ```

4. **Open the tools in your browser**:
   - Open `index.html` to access the main portal with all tools
   - Or open individual tool files directly:
     - `coloraccessibility_stable.html` - Color Accessibility Checker
     - `colorexplorer_stable.html` - Color Harmony Explorer
     - `colormatcher_stable.html` - Color Matcher
     - `dyecomparison_stable.html` - Dye Comparison

That's it! No installation or build process needed.

### Local Development
1. **Clone the repository** (see instructions above in "Cloning the Repository" section)
2. **Open the tools**: Open `index.html` in your browser to access the XIV Dye Tools portal
3. **Access all tools** from the portal:
   - Color Accessibility Checker (v2.0.0)
   - Color Harmony Explorer (v2.0.0)
   - Color Matcher (v2.0.0)
   - Dye Comparison (v2.0.0)
   - Dye Mixer (v2.0.0)
4. **Develop new features**:
   - Edit `*_experimental.html` files for testing new features
   - Thoroughly test in all browsers, themes, and responsive sizes
5. **Deploy to production**: Copy tested features from the experimental version to the corresponding stable version

All tools are production-ready stable versions with full feature support. The application is entirely client-side and requires no build process or dependencies.

## Usage

### Checking Dye Accessibility for Colorblind Players
1. **Access Tool** - From the portal, click "Color Accessibility Checker" card, or use "Tools ▼" dropdown
2. **Enable Dual Dyes** (Optional) - Toggle "Dual Dyes" to assign primary and secondary dyes to each armor slot
3. **Select Your Outfit Dyes**:
   - Choose up to 6+ dyes representing your outfit (Head, Body, Hands, Legs, Feet, Weapon)
   - Primary dyes are always available; secondary dyes visible when "Dual Dyes" is enabled
   - Dyes are organized by category in the dropdown for easy browsing
4. **Adjust Vision Simulation Intensity**:
   - Set Deuteranopia intensity (0-100%)
   - Set Protanopia intensity (0-100%)
   - Set Tritanopia intensity (0-100%)
   - Watch color simulations update in real-time
5. **Review Accessibility Analysis**:
   - **Accessibility Score** shows overall rating (0-100, with emoji ratings)
   - **Original Palette** displays your selected dyes
   - **Vision Simulations** shows how each colorblindness type sees your colors
   - **Color Distance Matrix** analyzes color similarities between dyes
6. **Address Accessibility Issues**:
   - Review "Accessibility Issues" banner showing problem areas
   - Click on issues to expand and see details
   - View suggested alternative dyes with "Use" buttons
   - Click "Use" to replace problematic dyes and watch issue count update
7. **Toggle Analysis Options**:
   - Show/hide warnings for accessibility issues
   - Show/hide color distance matrix
   - Show/hide dye suggestions
8. **Clear Selections** - Click "Clear All" button to reset all dye selections

### Finding Color Harmonies
1. **Select a Base Color** - Choose from the dropdown or use the search bar in the left sidebar
2. **Configure Filters** - Set acquisition method filters and exclusion options (metallic, facewear, extremes)
3. **Set Market Board** - Choose your data center/world and select which dye categories to price
4. **Fetch Prices** - Click "Refresh Market Prices" to get current market data (optional)
5. **Explore Harmonies** - View 6 color harmony types with interactive color wheels in the right panel
6. **Interact with Results**:
   - Hover over swatches to highlight their position on the color wheel
   - Hover over deviance badges to see visual connections between colors
   - Click Zoom In button to enlarge any harmony section for detailed viewing
7. **Export or Copy** - Save palettes as JSON, CSS, or SCSS, or copy hex codes to clipboard

### Matching Colors from Images
1. **Access Tool** - From the portal, click "Color Matcher" card, or use "Tools ▼" dropdown
2. **Load Image** - Upload an image, drag-and-drop, or use the color picker for direct color selection
   - **Automatic Zoom**: Portrait images and extra-tall images automatically zoom to width for optimal viewing
   - **Smart Detection**: Landscape images use zoom to fit, while portrait images zoom to width
3. **Configure Options**:
   - Set sample size (1x1 to 64x64) for color averaging
   - Enable/disable metallic dyes filter
   - Enable/disable Pure White & Jet Black filter (Facewear colors always excluded)
4. **Navigate Large Images**:
   - Use Zoom buttons or keyboard shortcuts (`+`, `-`, `W`, `R`)
   - Use Shift+MouseWheel to zoom smoothly
   - Use Shift+LeftClickDrag to pan around zoomed images
   - Click "Fit" or "Width" for manual zoom control of different image orientations
5. **Sample Colors** - Hover and click on the image to pick colors
6. **View Results** - See your selected color and the closest matching FFXIV dye side-by-side

### Comparing Dyes
1. **Access Tool** - From the portal, click "Dye Comparison" card, or use "Tools ▼" dropdown
2. **Select Dyes**:
   - Use dropdown menus to select up to 4 dyes (first 2 required, last 2 optional)
   - Dyes are organized by category for easy browsing
   - View complete information for each selected dye (name, category, hex, RGB, HSV, acquisition, price)
3. **Visualize Colors** (NEW - v1.1.0):
   - **Hue-Saturation Chart** - Shows where each dye sits in 2D color space
     - X-axis represents hue (color)
     - Y-axis represents saturation (color intensity, 0-100%)
     - Colored circles indicate actual dye colors
   - **Brightness Chart** - Shows brightness distribution (0-100%)
     - Vertical lines indicate each dye's brightness position
     - Colored lines use actual dye colors for visual reference
     - Scales from Black (0%) to White (100%)
4. **Analyze Colors**:
   - Color Distance Matrix automatically shows color similarities
   - Green values indicate very similar colors (distance < 50)
   - Yellow values indicate similar colors (distance 50-99)
   - Red values indicate dissimilar colors (distance ≥ 100)
5. **Export & Share**:
   - Export as JSON for archiving or sharing data
   - Export as CSS to use in stylesheets (generates CSS variables)
   - Copy hex codes with names to clipboard for quick reference
   - Copy summary with all color information and distances
6. **HSV for Other Games**:
   - HSV values can be used in other games like Monster Hunter Wilds
   - Hover over "HSV:" label to see the helpful tooltip
7. **Dark Mode** - Toggle dark mode with button in header for comfortable viewing (charts adapt automatically)

## Data Sources

- **Color Data**: Complete FFXIV dye database with RGB, HSV, hex values, and acquisition methods
- **Market Prices**: Real-time data from [Universalis API](https://universalis.app/)
- **Server Data**: FFXIV data centers and world information

## Technology Stack

- **TypeScript 5.x** - Strict mode with full type safety
- **Vite 7.x** - Modern build system with instant HMR
- **Tailwind CSS 3.x** - Utility-first CSS framework
- **Vitest 4.x** - Unit testing framework with comprehensive coverage
- **xivdyetools-core** - Shared npm library for color algorithms and dye database
- **Component Architecture** - Reusable UI components with lifecycle hooks
- **Service Layer** - Centralized business logic (ColorService, DyeService, ThemeService, StorageService, TutorialService, AnnouncerService)
- **Service Worker** - Offline caching and network status detection
- localStorage/IndexedDB for user preferences, palettes, and theme persistence

## Browser Compatibility

Works in all modern browsers supporting ES6+:
- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

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

## Acknowledgments

- Color harmony algorithms based on traditional color theory
- Market board data provided by [Universalis](https://universalis.app/)
- FFXIV game data is property of Square Enix Co., Ltd.
- Built with love for Eorzea's fashionistas ✨

## Disclaimer

This is a fan-made tool and is not affiliated with or endorsed by Square Enix Co., Ltd. FINAL FANTASY is a registered trademark of Square Enix Holdings Co., Ltd.
