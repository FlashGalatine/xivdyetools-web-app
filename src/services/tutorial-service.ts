/**
 * XIV Dye Tools v2.4.0 - Tutorial Service
 *
 * Interactive tutorial system with step-by-step guidance
 * Uses spotlight/coach-mark pattern to highlight features
 *
 * @module services/tutorial-service
 */

import { StorageService } from './storage-service';
import { LanguageService } from './language-service';
import { ModalService } from './modal-service';
import { logger } from '@shared/logger';
import { STORAGE_PREFIX } from '@shared/constants';

// ============================================================================
// Tutorial Types
// ============================================================================

/**
 * Tool identifier for tutorial tracking
 */
export type TutorialTool = 'harmony' | 'matcher' | 'comparison' | 'mixer' | 'accessibility';

/**
 * Single tutorial step definition
 */
export interface TutorialStep {
  /** Unique step identifier */
  id: string;
  /** CSS selector or element ID for the target element */
  target: string;
  /** Locale key for title (e.g., 'tutorial.harmony.step1.title') */
  titleKey: string;
  /** Locale key for description */
  descriptionKey: string;
  /** Preferred tooltip position relative to target */
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  /** Optional action to perform before showing this step */
  beforeShow?: () => void | Promise<void>;
  /** Optional callback when step is shown */
  onShow?: () => void;
  /** Whether to highlight multiple elements (comma-separated selectors) */
  multipleTargets?: boolean;
}

/**
 * Tutorial definition for a tool
 */
export interface Tutorial {
  /** Tool identifier */
  tool: TutorialTool;
  /** Array of steps in order */
  steps: TutorialStep[];
}

/**
 * Tutorial state
 */
interface TutorialState {
  isActive: boolean;
  currentTool: TutorialTool | null;
  currentStepIndex: number;
  totalSteps: number;
}

/**
 * Tutorial completion record
 */
interface TutorialCompletion {
  completedAt: number;
  version: string;
}

// ============================================================================
// Tutorial Definitions
// ============================================================================

/**
 * Harmony Generator tutorial steps
 */
const HARMONY_TUTORIAL: Tutorial = {
  tool: 'harmony',
  steps: [
    {
      id: 'base-color',
      target: '[data-tutorial="harmony-base-color"], .dye-selector',
      titleKey: 'tutorial.harmony.baseColor.title',
      descriptionKey: 'tutorial.harmony.baseColor.description',
      position: 'bottom',
    },
    {
      id: 'harmony-type',
      target: '[data-tutorial="harmony-types"], .harmony-type-selector',
      titleKey: 'tutorial.harmony.types.title',
      descriptionKey: 'tutorial.harmony.types.description',
      position: 'bottom',
    },
    {
      id: 'filters',
      target: '[data-tutorial="harmony-filters"], .dye-filters',
      titleKey: 'tutorial.harmony.filters.title',
      descriptionKey: 'tutorial.harmony.filters.description',
      position: 'left',
    },
    {
      id: 'market-board',
      target: '[data-tutorial="harmony-market"], .market-board',
      titleKey: 'tutorial.harmony.market.title',
      descriptionKey: 'tutorial.harmony.market.description',
      position: 'top',
    },
    {
      id: 'export',
      target: '[data-tutorial="harmony-export"], .palette-exporter',
      titleKey: 'tutorial.harmony.export.title',
      descriptionKey: 'tutorial.harmony.export.description',
      position: 'top',
    },
  ],
};

/**
 * Color Matcher tutorial steps
 */
const MATCHER_TUTORIAL: Tutorial = {
  tool: 'matcher',
  steps: [
    {
      id: 'image-upload',
      target: '[data-tutorial="matcher-upload"], .image-upload',
      titleKey: 'tutorial.matcher.upload.title',
      descriptionKey: 'tutorial.matcher.upload.description',
      position: 'right',
    },
    {
      id: 'color-picker',
      target: '[data-tutorial="matcher-picker"], .color-picker',
      titleKey: 'tutorial.matcher.picker.title',
      descriptionKey: 'tutorial.matcher.picker.description',
      position: 'right',
    },
    {
      id: 'sample-size',
      target: '[data-tutorial="matcher-sample"], .sample-size-slider',
      titleKey: 'tutorial.matcher.sample.title',
      descriptionKey: 'tutorial.matcher.sample.description',
      position: 'bottom',
    },
    {
      id: 'results',
      target: '[data-tutorial="matcher-results"], .matched-dyes',
      titleKey: 'tutorial.matcher.results.title',
      descriptionKey: 'tutorial.matcher.results.description',
      position: 'left',
    },
  ],
};

/**
 * Dye Comparison tutorial steps
 */
const COMPARISON_TUTORIAL: Tutorial = {
  tool: 'comparison',
  steps: [
    {
      id: 'select-dyes',
      target: '[data-tutorial="comparison-selector"], .dye-selector',
      titleKey: 'tutorial.comparison.select.title',
      descriptionKey: 'tutorial.comparison.select.description',
      position: 'bottom',
    },
    {
      id: 'side-by-side',
      target: '[data-tutorial="comparison-display"], .comparison-display',
      titleKey: 'tutorial.comparison.display.title',
      descriptionKey: 'tutorial.comparison.display.description',
      position: 'top',
    },
    {
      id: 'matrix',
      target: '[data-tutorial="comparison-matrix"], .distance-matrix',
      titleKey: 'tutorial.comparison.matrix.title',
      descriptionKey: 'tutorial.comparison.matrix.description',
      position: 'top',
    },
  ],
};

/**
 * Dye Mixer tutorial steps
 */
const MIXER_TUTORIAL: Tutorial = {
  tool: 'mixer',
  steps: [
    {
      id: 'start-end',
      target: '[data-tutorial="mixer-endpoints"], .mixer-endpoints',
      titleKey: 'tutorial.mixer.endpoints.title',
      descriptionKey: 'tutorial.mixer.endpoints.description',
      position: 'bottom',
    },
    {
      id: 'gradient',
      target: '[data-tutorial="mixer-gradient"], .gradient-display',
      titleKey: 'tutorial.mixer.gradient.title',
      descriptionKey: 'tutorial.mixer.gradient.description',
      position: 'top',
    },
    {
      id: 'settings',
      target: '[data-tutorial="mixer-settings"], .interpolation-settings',
      titleKey: 'tutorial.mixer.settings.title',
      descriptionKey: 'tutorial.mixer.settings.description',
      position: 'left',
    },
  ],
};

/**
 * Accessibility Checker tutorial steps
 */
const ACCESSIBILITY_TUTORIAL: Tutorial = {
  tool: 'accessibility',
  steps: [
    {
      id: 'select-outfit',
      target: '[data-tutorial="accessibility-selector"], .outfit-selector',
      titleKey: 'tutorial.accessibility.select.title',
      descriptionKey: 'tutorial.accessibility.select.description',
      position: 'bottom',
    },
    {
      id: 'simulations',
      target: '[data-tutorial="accessibility-simulations"], .vision-simulations',
      titleKey: 'tutorial.accessibility.simulations.title',
      descriptionKey: 'tutorial.accessibility.simulations.description',
      position: 'left',
    },
    {
      id: 'scores',
      target: '[data-tutorial="accessibility-scores"], .accessibility-scores',
      titleKey: 'tutorial.accessibility.scores.title',
      descriptionKey: 'tutorial.accessibility.scores.description',
      position: 'top',
    },
  ],
};

/**
 * All tutorials indexed by tool
 */
const TUTORIALS: Record<TutorialTool, Tutorial> = {
  harmony: HARMONY_TUTORIAL,
  matcher: MATCHER_TUTORIAL,
  comparison: COMPARISON_TUTORIAL,
  mixer: MIXER_TUTORIAL,
  accessibility: ACCESSIBILITY_TUTORIAL,
};

// ============================================================================
// Storage Keys
// ============================================================================

const TUTORIAL_VERSION = '1.0.0';
const getStorageKey = (tool: TutorialTool): string => `${STORAGE_PREFIX}_tutorial_${tool}`;

// ============================================================================
// Tutorial Service Class
// ============================================================================

/**
 * Service for managing interactive tutorials
 * Static singleton pattern with event-driven updates
 */
export class TutorialService {
  private static state: TutorialState = {
    isActive: false,
    currentTool: null,
    currentStepIndex: 0,
    totalSteps: 0,
  };

  private static listeners: Set<(state: TutorialState) => void> = new Set();
  private static spotlightElement: HTMLElement | null = null;

  // ============================================================================
  // State Management
  // ============================================================================

  /**
   * Get current tutorial state
   */
  static getState(): Readonly<TutorialState> {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  static subscribe(listener: (state: TutorialState) => void): () => void {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state change
   */
  private static notifyListeners(): void {
    const stateCopy = { ...this.state };
    this.listeners.forEach((listener) => listener(stateCopy));
  }

  // ============================================================================
  // Tutorial Completion Tracking
  // ============================================================================

  /**
   * Check if a tutorial has been completed
   */
  static isCompleted(tool: TutorialTool): boolean {
    const completion = StorageService.getItem<TutorialCompletion>(getStorageKey(tool));
    return completion !== null && completion.version === TUTORIAL_VERSION;
  }

  /**
   * Mark a tutorial as completed
   */
  static markCompleted(tool: TutorialTool): void {
    const completion: TutorialCompletion = {
      completedAt: Date.now(),
      version: TUTORIAL_VERSION,
    };
    StorageService.setItem(getStorageKey(tool), completion);
    logger.info(`Tutorial completed: ${tool}`);
  }

  /**
   * Reset tutorial completion for a tool
   */
  static resetCompletion(tool: TutorialTool): void {
    StorageService.removeItem(getStorageKey(tool));
    logger.info(`Tutorial reset: ${tool}`);
  }

  /**
   * Reset all tutorial completions
   */
  static resetAllCompletions(): void {
    const tools: TutorialTool[] = ['harmony', 'matcher', 'comparison', 'mixer', 'accessibility'];
    tools.forEach((tool) => this.resetCompletion(tool));
    logger.info('All tutorials reset');
  }

  // ============================================================================
  // Tutorial Control
  // ============================================================================

  /**
   * Start a tutorial for a specific tool
   */
  static start(tool: TutorialTool): void {
    const tutorial = TUTORIALS[tool];
    if (!tutorial || tutorial.steps.length === 0) {
      logger.warn(`No tutorial found for tool: ${tool}`);
      return;
    }

    this.state = {
      isActive: true,
      currentTool: tool,
      currentStepIndex: 0,
      totalSteps: tutorial.steps.length,
    };

    this.notifyListeners();
    void this.showCurrentStep();
    logger.info(`Tutorial started: ${tool}`);
  }

  /**
   * Show the current step
   */
  private static async showCurrentStep(): Promise<void> {
    if (!this.state.currentTool) return;

    const tutorial = TUTORIALS[this.state.currentTool];
    const step = tutorial.steps[this.state.currentStepIndex];

    if (!step) {
      this.complete();
      return;
    }

    // Execute beforeShow if defined
    if (step.beforeShow) {
      try {
        await step.beforeShow();
      } catch (error) {
        logger.warn('Tutorial beforeShow failed:', error);
      }
    }

    // Dispatch event for spotlight component to handle
    const event = new CustomEvent('tutorial:show-step', {
      detail: {
        step,
        stepIndex: this.state.currentStepIndex,
        totalSteps: this.state.totalSteps,
      },
      bubbles: true,
    });
    document.dispatchEvent(event);

    // Execute onShow callback
    if (step.onShow) {
      step.onShow();
    }
  }

  /**
   * Go to next step
   */
  static next(): void {
    if (!this.state.isActive || !this.state.currentTool) return;

    const tutorial = TUTORIALS[this.state.currentTool];
    if (this.state.currentStepIndex < tutorial.steps.length - 1) {
      this.state.currentStepIndex++;
      this.notifyListeners();
      void this.showCurrentStep();
    } else {
      this.complete();
    }
  }

  /**
   * Go to previous step
   */
  static previous(): void {
    if (!this.state.isActive || this.state.currentStepIndex <= 0) return;

    this.state.currentStepIndex--;
    this.notifyListeners();
    void this.showCurrentStep();
  }

  /**
   * Skip the tutorial
   */
  static skip(): void {
    if (!this.state.isActive) return;

    logger.info(`Tutorial skipped: ${this.state.currentTool}`);
    this.cleanup();
  }

  /**
   * Complete the tutorial
   */
  static complete(): void {
    if (!this.state.isActive || !this.state.currentTool) return;

    this.markCompleted(this.state.currentTool);
    this.cleanup();
  }

  /**
   * Clean up tutorial state
   */
  private static cleanup(): void {
    // Dispatch cleanup event
    document.dispatchEvent(new CustomEvent('tutorial:end'));

    this.state = {
      isActive: false,
      currentTool: null,
      currentStepIndex: 0,
      totalSteps: 0,
    };

    this.notifyListeners();
  }

  // ============================================================================
  // Tutorial Access
  // ============================================================================

  /**
   * Get tutorial for a tool
   */
  static getTutorial(tool: TutorialTool): Tutorial | null {
    return TUTORIALS[tool] ?? null;
  }

  /**
   * Get current step
   */
  static getCurrentStep(): TutorialStep | null {
    if (!this.state.currentTool) return null;

    const tutorial = TUTORIALS[this.state.currentTool];
    return tutorial.steps[this.state.currentStepIndex] ?? null;
  }

  /**
   * Check if tutorials are available
   */
  static isAvailable(): boolean {
    return Object.keys(TUTORIALS).length > 0;
  }

  // ============================================================================
  // Prompt to Start Tutorial
  // ============================================================================

  /**
   * Show prompt to start tutorial for a tool
   */
  static promptStart(tool: TutorialTool): void {
    if (this.isCompleted(tool)) return;

    const toolName = LanguageService.t(`tools.${tool}.shortName`);

    const content = document.createElement('div');
    content.className = 'text-center';

    const message = document.createElement('p');
    message.className = 'mb-4';
    message.style.color = 'var(--theme-text-muted)';
    message.textContent = LanguageService.t('tutorial.prompt.message');
    content.appendChild(message);

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'flex justify-center gap-3';

    const skipBtn = document.createElement('button');
    skipBtn.className = 'px-4 py-2 text-sm rounded-lg transition-colors';
    skipBtn.style.backgroundColor = 'var(--theme-card-background)';
    skipBtn.style.color = 'var(--theme-text-muted)';
    skipBtn.textContent = LanguageService.t('tutorial.prompt.skip');
    skipBtn.addEventListener('click', () => {
      ModalService.dismissTop();
      this.markCompleted(tool); // Don't ask again
    });

    const startBtn = document.createElement('button');
    startBtn.className = 'px-4 py-2 text-sm font-medium rounded-lg transition-colors';
    startBtn.style.backgroundColor = 'var(--theme-primary)';
    startBtn.style.color = 'var(--theme-text-header)';
    startBtn.textContent = LanguageService.t('tutorial.prompt.start');
    startBtn.addEventListener('click', () => {
      ModalService.dismissTop();
      setTimeout(() => this.start(tool), 300);
    });

    buttonContainer.appendChild(skipBtn);
    buttonContainer.appendChild(startBtn);
    content.appendChild(buttonContainer);

    ModalService.show({
      type: 'custom',
      title: `📚 ${LanguageService.t('tutorial.prompt.title')}`,
      content,
      size: 'sm',
      closable: true,
    });
  }
}
