/**
 * XIV Dye Tools v2.0.0 - App Layout Component
 *
 * Phase 12: Architecture Refactor
 * Main application layout with header, content area, and footer
 *
 * @module components/app-layout
 */

import { BaseComponent } from './base-component';
import { ThemeSwitcher } from './theme-switcher';
import { LanguageSelector } from './language-selector';
import { ToastContainer } from './toast-container';
import { ModalContainer } from './modal-container';
import { ThemeService, LanguageService, AnnouncerService, KeyboardService } from '@services/index';
import { APP_VERSION } from '@shared/constants';
import { clearContainer } from '@shared/utils';
import {
  ICON_GITHUB,
  ICON_TWITTER,
  ICON_TWITCH,
  ICON_BLUESKY,
  ICON_DISCORD,
  ICON_PATREON,
} from '@shared/social-icons';
import { ICON_CRYSTAL } from '@shared/ui-icons';
import { LOGO_SPARKLES } from '@shared/app-logo';

/**
 * Main application layout component
 * Manages overall page structure and component hierarchy
 */
export class AppLayout extends BaseComponent {
  private themeSwitcher: ThemeSwitcher | null = null;
  private languageSelector: LanguageSelector | null = null;
  private toastContainer: ToastContainer | null = null;
  private modalContainer: ModalContainer | null = null;
  private contentContainer: HTMLElement | null = null;
  private themeUnsubscribe: (() => void) | null = null;
  private languageUnsubscribe: (() => void) | null = null;

  /**
   * Render the application layout
   */
  renderContent(): void {
    const app = this.createElement('div', {
      className: 'app-shell flex flex-col min-h-screen transition-colors',
    });

    // Header - sticky positioning for top navigation
    const header = this.renderHeader();
    header.classList.add('sticky', 'top-0', 'z-30'); // Sticky positioning, stays at top, above content
    app.appendChild(header);

    // Main content area
    const main = this.createElement('main', {
      className: 'flex-1 max-w-7xl mx-auto w-full px-4 py-8',
    });

    this.contentContainer = main;
    app.appendChild(main);

    // Footer
    const footer = this.renderFooter();
    app.appendChild(footer);

    // Toast container (for notifications)
    const toastContainerEl = this.createElement('div', {
      id: 'toast-root',
    });
    app.appendChild(toastContainerEl);

    // Modal container (for dialogs)
    const modalContainerEl = this.createElement('div', {
      id: 'modal-root',
    });
    app.appendChild(modalContainerEl);

    // Screen reader announcements container (A3 accessibility)
    const announcerContainerEl = this.createElement('div', {
      id: 'announcer-root',
    });
    app.appendChild(announcerContainerEl);

    clearContainer(this.container);
    this.element = app;
    this.container.appendChild(this.element);
  }

  /**
   * Render the header section
   */
  private renderHeader(): HTMLElement {
    const header = this.createElement('header', {
      className: 'app-header shadow-lg',
    });

    const nav = this.createElement('nav', {
      className: 'max-w-7xl mx-auto px-4 py-4 flex justify-between items-center',
    });

    // Logo/Title
    const titleDiv = this.createElement('div', {
      className: 'flex items-center gap-3',
    });

    // Logo using inline SVG (theme-aware with currentColor for brush handle)
    const logoContainer = this.createElement('div', {
      className: 'w-10 h-10 flex items-center justify-center',
      attributes: {
        'aria-label': 'XIV Dye Tools Logo',
        title: 'XIV Dye Tools',
      },
    });
    logoContainer.innerHTML = LOGO_SPARKLES;
    
    // Ensure SVG fills container and is centered
    const svg = logoContainer.querySelector('svg');
    if (svg) {
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
    }

    titleDiv.appendChild(logoContainer);

    // Use --theme-text-header for header text
    const title = this.createElement('h1', {
      textContent: LanguageService.t('app.title'),
      className: 'text-2xl font-bold',
      attributes: {
        style: 'color: var(--theme-text-header);',
      },
    });

    const versionText = `v${APP_VERSION}`;
    const version = this.createElement('span', {
      textContent: versionText,
      className: 'text-sm font-mono',
      attributes: {
        'data-app-version': versionText,
        style: 'color: var(--theme-text-header); opacity: 0.8;',
      },
    });

    titleDiv.appendChild(title);
    titleDiv.appendChild(version);

    // Right side: Tools dropdown + Language selector + Theme switcher
    const rightContainer = this.createElement('div', {
      className: 'flex items-center gap-4',
    });

    const toolsDropdownContainer = this.createElement('div', {
      id: 'tools-dropdown-container',
    });

    const languageSelectorContainer = this.createElement('div', {
      id: 'language-selector-container',
    });

    const themeSwitcherContainer = this.createElement('div', {
      id: 'theme-switcher-container',
    });

    rightContainer.appendChild(toolsDropdownContainer);
    rightContainer.appendChild(languageSelectorContainer);
    rightContainer.appendChild(themeSwitcherContainer);
    nav.appendChild(titleDiv);
    nav.appendChild(rightContainer);
    header.appendChild(nav);

    return header;
  }

  /**
   * Render the footer section
   */
  private renderFooter(): HTMLElement {
    const footer = this.createElement('footer', {
      className: 'app-footer mt-12',
      attributes: {
        style: 'min-height: 300px;', // Reserve space to prevent layout shift when fonts load (actual height ~298px)
      },
    });

    const footerContent = this.createElement('div', {
      className: 'max-w-7xl mx-auto px-4 py-8',
    });

    // Copyright info
    // WEB-BUG-007: Use IDs instead of fragile CSS class selectors
    const copyright = this.createElement('div', {
      id: 'footer-copyright',
      className: 'text-center text-sm text-gray-600 dark:text-gray-400 mb-6',
      innerHTML: `${LanguageService.t('app.title')} v${APP_VERSION}<br>Built with TypeScript, Vite, and Tailwind CSS`,
    });
    footerContent.appendChild(copyright);

    // Social links
    const socialLinks = this.createElement('div', {
      className: 'flex justify-center gap-4 flex-wrap mb-4',
    });

    const socialMedia = [
      { label: 'GitHub', url: 'https://github.com/FlashGalatine', icon: ICON_GITHUB },
      { label: 'X/Twitter', url: 'https://x.com/AsheJunius', icon: ICON_TWITTER },
      { label: 'Twitch', url: 'https://www.twitch.tv/flashgalatine', icon: ICON_TWITCH },
      { label: 'BlueSky', url: 'https://bsky.app/profile/projectgalatine.com', icon: ICON_BLUESKY },
      { label: 'Discord', url: 'https://discord.gg/5VUSKTZCe5', icon: ICON_DISCORD },
      { label: 'Patreon', url: 'https://patreon.com/ProjectGalatine', icon: ICON_PATREON },
    ];

    socialMedia.forEach((social) => {
      const link = this.createElement('a', {
        className:
          'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm flex items-center gap-1',
        attributes: {
          href: social.url,
          target: '_blank',
          rel: 'noopener noreferrer',
          title: social.label,
        },
        innerHTML: `<span class="inline-block w-4 h-4" aria-hidden="true">${social.icon}</span> ${social.label}`,
      });
      socialLinks.appendChild(link);
    });

    footerContent.appendChild(socialLinks);

    // Creator info
    // WEB-BUG-007: Use IDs instead of fragile CSS class selectors
    const creator = this.createElement('div', {
      id: 'footer-creator',
      className: 'text-center text-xs text-gray-500 dark:text-gray-500',
      innerHTML: `${LanguageService.t('footer.createdBy')} <span class="inline-block w-3 h-3 ml-0.5" aria-hidden="true" style="vertical-align: middle;">${ICON_CRYSTAL}</span>`,
    });
    footerContent.appendChild(creator);

    // FFXIV Copyright disclaimer
    // WEB-BUG-007: Use IDs instead of fragile CSS class selectors
    const disclaimer = this.createElement('div', {
      id: 'footer-disclaimer',
      className:
        'text-center text-xs text-gray-500 dark:text-gray-500 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700',
      innerHTML: `${LanguageService.t('footer.disclaimer')}<br>${LanguageService.t('footer.notAffiliated')}`,
    });
    footerContent.appendChild(disclaimer);

    footer.appendChild(footerContent);

    return footer;
  }

  /**
   * Bind event listeners
   */
  bindEvents(): void {
    // Event handlers for child components can be added here
  }

  /**
   * Initialize the layout and all child components
   */
  onMount(): void {
    // Initialize language selector
    const languageSelectorContainer = this.querySelector<HTMLElement>(
      '#language-selector-container'
    );
    if (languageSelectorContainer) {
      this.languageSelector = new LanguageSelector(languageSelectorContainer);
      this.languageSelector.init();
    }

    // Initialize theme switcher
    const themeSwitcherContainer = this.querySelector<HTMLElement>('#theme-switcher-container');
    if (themeSwitcherContainer) {
      this.themeSwitcher = new ThemeSwitcher(themeSwitcherContainer);
      this.themeSwitcher.init();
    }

    // Initialize toast container (for notifications)
    const toastRoot = this.querySelector<HTMLElement>('#toast-root');
    if (toastRoot) {
      this.toastContainer = new ToastContainer(toastRoot);
      this.toastContainer.init();
    }

    // Initialize modal container (for dialogs)
    const modalRoot = this.querySelector<HTMLElement>('#modal-root');
    if (modalRoot) {
      this.modalContainer = new ModalContainer(modalRoot);
      this.modalContainer.init();
    }

    // Initialize screen reader announcer (A3 accessibility)
    const announcerRoot = this.querySelector<HTMLElement>('#announcer-root');
    if (announcerRoot) {
      AnnouncerService.init(announcerRoot);
    }

    // Initialize keyboard shortcuts (O4 - press "?" to show shortcuts, 1-5 for tools, etc.)
    KeyboardService.initialize();

    // Subscribe to theme changes to update header text colors (store unsubscribe for cleanup)
    this.themeUnsubscribe = ThemeService.subscribe(() => {
      this.updateHeaderColors();
    });

    // Subscribe to language changes to update text (store unsubscribe for cleanup)
    this.languageUnsubscribe = LanguageService.subscribe(() => {
      this.updateLocalizedText();
    });
  }

  /**
   * Update localized text when language changes (without re-rendering)
   */
  private updateLocalizedText(): void {
    // Update title text
    const title = this.querySelector<HTMLElement>('header h1');
    if (title) {
      title.textContent = LanguageService.t('app.title');
    }

    // WEB-BUG-007: Use IDs instead of fragile CSS class selectors
    // Update footer text
    const footerCopyright = this.querySelector<HTMLElement>('#footer-copyright');
    if (footerCopyright) {
      footerCopyright.innerHTML = `${LanguageService.t('app.title')} v${APP_VERSION}<br>Built with TypeScript, Vite, and Tailwind CSS`;
    }

    const footerCreator = this.querySelector<HTMLElement>('#footer-creator');
    if (footerCreator) {
      footerCreator.innerHTML = `${LanguageService.t('footer.createdBy')} <span class="inline-block w-4 h-4 align-text-bottom">${ICON_CRYSTAL}</span>`;
    }

    const footerDisclaimer = this.querySelector<HTMLElement>('#footer-disclaimer');
    if (footerDisclaimer) {
      footerDisclaimer.innerHTML = `${LanguageService.t('footer.disclaimer')}<br>${LanguageService.t('footer.notAffiliated')}`;
    }

    // WEB-REF-006: Announce language change for screen reader users
    const currentLocale = LanguageService.getCurrentLocale();
    AnnouncerService.announce(`Language changed to ${currentLocale}`, 'polite');
  }

  /**
   * Update header text colors based on current theme (without re-rendering)
   */
  private updateHeaderColors(): void {
    // Update title text color using --theme-text-header
    const title = this.querySelector<HTMLElement>('header h1');
    if (title) {
      title.style.color = 'var(--theme-text-header)';
    }

    // Update version text color (muted version of header text)
    const version = this.querySelector<HTMLElement>('header span[data-app-version]');
    if (version) {
      // Use opacity to create muted effect
      version.style.color = 'var(--theme-text-header)';
      version.style.opacity = '0.8';
    }
  }

  /**
   * Get the main content container
   */
  getContentContainer(): HTMLElement | null {
    return this.contentContainer;
  }

  /**
   * Set the main content
   */
  setContent(content: HTMLElement | string): void {
    if (!this.contentContainer) return;

    clearContainer(this.contentContainer);

    if (typeof content === 'string') {
      this.contentContainer.textContent = content;
    } else {
      this.contentContainer.appendChild(content);
    }
  }

  /**
   * Get component state
   */
  protected getState(): Record<string, unknown> {
    return {
      themeSwitcherInitialized: this.themeSwitcher !== null,
    };
  }

  /**
   * Destroy the layout and all child components
   */
  destroy(): void {
    // Clean up service subscriptions
    this.themeUnsubscribe?.();
    this.themeUnsubscribe = null;
    this.languageUnsubscribe?.();
    this.languageUnsubscribe = null;

    if (this.languageSelector) {
      this.languageSelector.destroy();
    }
    if (this.themeSwitcher) {
      this.themeSwitcher.destroy();
    }
    if (this.toastContainer) {
      this.toastContainer.destroy();
    }
    if (this.modalContainer) {
      this.modalContainer.destroy();
    }
    // Clean up announcer service
    AnnouncerService.destroy();
    super.destroy();
  }
}
