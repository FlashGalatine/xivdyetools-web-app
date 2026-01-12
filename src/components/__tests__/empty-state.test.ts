import {
  EmptyState,
  createEmptyState,
  getEmptyStateHTML,
  EMPTY_STATE_PRESETS,
} from '../empty-state';
import { createTestContainer, cleanupTestContainer, cleanupComponent } from './test-utils';

// Mock shared utils
vi.mock('@shared/utils', () => ({
  clearContainer: vi.fn((container: HTMLElement) => {
    container.innerHTML = '';
  }),
}));

describe('EmptyState', () => {
  let container: HTMLElement;
  let component: EmptyState;

  beforeEach(() => {
    container = createTestContainer();
  });

  afterEach(() => {
    if (component && container) {
      cleanupComponent(component, container);
    } else {
      cleanupTestContainer(container);
    }
  });

  describe('Rendering', () => {
    it('should render basic empty state', () => {
      component = new EmptyState(container, {
        icon: '🔍',
        title: 'No results',
        description: 'Try again',
      });
      component.init();

      const title = container.querySelector('.empty-state-title');
      const desc = container.querySelector('.empty-state-description');
      const icon = container.querySelector('.empty-state-icon');

      expect(title?.textContent).toBe('No results');
      expect(desc?.textContent).toBe('Try again');
      expect(icon?.textContent).toBe('🔍');
    });

    it('should render SVG icon correctly', () => {
      component = new EmptyState(container, {
        icon: '<svg>test</svg>',
        title: 'SVG Icon',
      });
      component.init();

      const icon = container.querySelector('.empty-state-icon');
      expect(icon?.innerHTML).toContain('<svg>test</svg>');
    });

    it('should render action buttons', () => {
      const onAction = vi.fn();
      const onSecondary = vi.fn();

      component = new EmptyState(container, {
        icon: 'x',
        title: 'Actions',
        actionLabel: 'Primary',
        onAction,
        secondaryActionLabel: 'Secondary',
        onSecondaryAction: onSecondary,
      });
      component.init();

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(2);
      expect(buttons[0].textContent).toBe('Primary');
      expect(buttons[1].textContent).toBe('Secondary');

      buttons[0].click();
      expect(onAction).toHaveBeenCalled();

      buttons[1].click();
      expect(onSecondary).toHaveBeenCalled();
    });
  });

  describe('Factory Functions', () => {
    it('createEmptyState should return initialized component', () => {
      const state = createEmptyState(container, {
        icon: 'T',
        title: 'Test',
      });

      expect(state).toBeInstanceOf(EmptyState);
      expect(container.querySelector('.empty-state')).not.toBeNull();
    });

    it('getEmptyStateHTML should return HTML string', () => {
      const html = getEmptyStateHTML({
        icon: 'H',
        title: 'HTML',
        description: 'Desc',
      });

      expect(html).toContain('empty-state');
      expect(html).toContain('HTML');
      expect(html).toContain('Desc');
    });

    it('getEmptyStateHTML should handle SVG icons', () => {
      const html = getEmptyStateHTML({
        icon: '<svg>icon</svg>',
        title: 'SVG',
      });

      expect(html).toContain('<svg>icon</svg>');
    });

    it('getEmptyStateHTML should escape non-SVG icons', () => {
      const html = getEmptyStateHTML({
        icon: '<script>',
        title: 'XSS',
      });

      expect(html).toContain('&lt;script&gt;');
    });
  });

  describe('Presets', () => {
    it('should have presets defined', () => {
      expect(EMPTY_STATE_PRESETS.noSearchResults('query')).toBeDefined();
      expect(EMPTY_STATE_PRESETS.error('msg')).toBeDefined();
      expect(EMPTY_STATE_PRESETS.loading()).toBeDefined();
    });

    describe('noSearchResults preset', () => {
      it('should return options with query in title', () => {
        const options = EMPTY_STATE_PRESETS.noSearchResults('test query');
        expect(options.title).toContain('test query');
        expect(options.icon).toBeDefined();
        expect(options.description).toBeDefined();
      });

      it('should include action label and callback when provided', () => {
        const onClear = vi.fn();
        const options = EMPTY_STATE_PRESETS.noSearchResults('query', onClear);
        expect(options.actionLabel).toBe('Clear search');
        expect(options.onAction).toBe(onClear);
      });

      it('should work without callback', () => {
        const options = EMPTY_STATE_PRESETS.noSearchResults('query');
        expect(options.actionLabel).toBe('Clear search');
        expect(options.onAction).toBeUndefined();
      });
    });

    describe('allFilteredOut preset', () => {
      it('should return options for filtered results', () => {
        const options = EMPTY_STATE_PRESETS.allFilteredOut();
        expect(options.title).toContain('filtered');
        expect(options.icon).toBeDefined();
        expect(options.description).toContain('filter');
      });

      it('should include reset action when provided', () => {
        const onReset = vi.fn();
        const options = EMPTY_STATE_PRESETS.allFilteredOut(onReset);
        expect(options.actionLabel).toBe('Reset filters');
        expect(options.onAction).toBe(onReset);
      });

      it('should work without callback', () => {
        const options = EMPTY_STATE_PRESETS.allFilteredOut();
        expect(options.actionLabel).toBe('Reset filters');
        expect(options.onAction).toBeUndefined();
      });
    });

    describe('noPriceData preset', () => {
      it('should return options for missing price data', () => {
        const options = EMPTY_STATE_PRESETS.noPriceData();
        expect(options.title).toContain('price');
        expect(options.icon).toBeDefined();
        expect(options.description).toBeDefined();
      });

      it('should include try another action when provided', () => {
        const onTryAnother = vi.fn();
        const options = EMPTY_STATE_PRESETS.noPriceData(onTryAnother);
        expect(options.actionLabel).toBe('Try different server');
        expect(options.onAction).toBe(onTryAnother);
      });

      it('should work without callback', () => {
        const options = EMPTY_STATE_PRESETS.noPriceData();
        expect(options.actionLabel).toBe('Try different server');
        expect(options.onAction).toBeUndefined();
      });
    });

    describe('noHarmonyResults preset', () => {
      it('should return options for no harmony results', () => {
        const options = EMPTY_STATE_PRESETS.noHarmonyResults();
        expect(options.title).toContain('harmony');
        expect(options.icon).toBeDefined();
        expect(options.description).toBeDefined();
      });

      it('should include select dye action when provided', () => {
        const onSelectDye = vi.fn();
        const options = EMPTY_STATE_PRESETS.noHarmonyResults(onSelectDye);
        expect(options.actionLabel).toBe('Select a dye');
        expect(options.onAction).toBe(onSelectDye);
      });

      it('should work without callback', () => {
        const options = EMPTY_STATE_PRESETS.noHarmonyResults();
        expect(options.actionLabel).toBe('Select a dye');
        expect(options.onAction).toBeUndefined();
      });
    });

    describe('noImage preset', () => {
      it('should return options for no image state', () => {
        const options = EMPTY_STATE_PRESETS.noImage();
        expect(options.title).toContain('image');
        expect(options.icon).toBeDefined();
        expect(options.description).toBeDefined();
      });

      it('should include upload action when provided', () => {
        const onUpload = vi.fn();
        const options = EMPTY_STATE_PRESETS.noImage(onUpload);
        expect(options.actionLabel).toBe('Upload image');
        expect(options.onAction).toBe(onUpload);
      });

      it('should work without callback', () => {
        const options = EMPTY_STATE_PRESETS.noImage();
        expect(options.actionLabel).toBe('Upload image');
        expect(options.onAction).toBeUndefined();
      });
    });

    describe('error preset', () => {
      it('should return options with error message', () => {
        const options = EMPTY_STATE_PRESETS.error('Something broke');
        expect(options.title).toContain('wrong');
        expect(options.description).toBe('Something broke');
        expect(options.icon).toBeDefined();
      });

      it('should include retry action when provided', () => {
        const onRetry = vi.fn();
        const options = EMPTY_STATE_PRESETS.error('Error message', onRetry);
        expect(options.actionLabel).toBe('Try again');
        expect(options.onAction).toBe(onRetry);
      });

      it('should work without callback', () => {
        const options = EMPTY_STATE_PRESETS.error('Error');
        expect(options.actionLabel).toBe('Try again');
        expect(options.onAction).toBeUndefined();
      });
    });

    describe('loading preset', () => {
      it('should return options for loading state', () => {
        const options = EMPTY_STATE_PRESETS.loading();
        expect(options.title).toContain('Loading');
        expect(options.icon).toBeDefined();
        expect(options.description).toBeDefined();
      });

      it('should not have action buttons', () => {
        const options = EMPTY_STATE_PRESETS.loading();
        expect(options.actionLabel).toBeUndefined();
        expect(options.onAction).toBeUndefined();
      });
    });
  });

  describe('setOptions method', () => {
    it('should update options partially', () => {
      component = new EmptyState(container, {
        icon: '🔍',
        title: 'Original Title',
        description: 'Original Description',
      });
      component.init();

      component.setOptions({ title: 'Updated Title' });

      const title = container.querySelector('.empty-state-title');
      expect(title?.textContent).toBe('Updated Title');
    });

    it('should preserve unchanged options', () => {
      component = new EmptyState(container, {
        icon: '🔍',
        title: 'Original Title',
        description: 'Original Description',
      });
      component.init();

      component.setOptions({ title: 'Updated Title' });

      const desc = container.querySelector('.empty-state-description');
      expect(desc?.textContent).toBe('Original Description');
    });

    it('should update icon', () => {
      component = new EmptyState(container, {
        icon: '🔍',
        title: 'Title',
      });
      component.init();

      component.setOptions({ icon: '⚠️' });

      const icon = container.querySelector('.empty-state-icon');
      expect(icon?.textContent).toBe('⚠️');
    });

    it('should add description when not previously set', () => {
      component = new EmptyState(container, {
        icon: '🔍',
        title: 'Title',
      });
      component.init();

      component.setOptions({ description: 'New Description' });

      const desc = container.querySelector('.empty-state-description');
      expect(desc?.textContent).toBe('New Description');
    });

    it('should update action button', () => {
      const newAction = vi.fn();
      component = new EmptyState(container, {
        icon: '🔍',
        title: 'Title',
        actionLabel: 'Original',
        onAction: vi.fn(),
      });
      component.init();

      component.setOptions({ actionLabel: 'Updated', onAction: newAction });

      const button = container.querySelector('button');
      expect(button?.textContent).toBe('Updated');
      button?.click();
      expect(newAction).toHaveBeenCalled();
    });
  });

  describe('bindEvents method', () => {
    it('should be callable without throwing', () => {
      component = new EmptyState(container, {
        icon: '🔍',
        title: 'Title',
      });
      component.init();

      // bindEvents is called during init but is a no-op
      expect(() => component.bindEvents()).not.toThrow();
    });
  });

  describe('rendering without optional elements', () => {
    it('should render without description', () => {
      component = new EmptyState(container, {
        icon: '🔍',
        title: 'Title Only',
      });
      component.init();

      const desc = container.querySelector('.empty-state-description');
      expect(desc).toBeNull();
    });

    it('should render without action buttons', () => {
      component = new EmptyState(container, {
        icon: '🔍',
        title: 'No Actions',
        description: 'Description',
      });
      component.init();

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(0);
    });

    it('should render with only primary action', () => {
      component = new EmptyState(container, {
        icon: '🔍',
        title: 'Primary Only',
        actionLabel: 'Primary',
        onAction: vi.fn(),
      });
      component.init();

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(1);
      expect(buttons[0].textContent).toBe('Primary');
    });

    it('should not render primary button without onAction', () => {
      component = new EmptyState(container, {
        icon: '🔍',
        title: 'Label without callback',
        actionLabel: 'Primary',
      });
      component.init();

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(0);
    });

    it('should not render secondary button without onSecondaryAction', () => {
      component = new EmptyState(container, {
        icon: '🔍',
        title: 'Label without callback',
        secondaryActionLabel: 'Secondary',
      });
      component.init();

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(0);
    });
  });

  describe('icon rendering edge cases', () => {
    it('should handle complex SVG icons', () => {
      const complexSvg =
        '<svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>';
      component = new EmptyState(container, {
        icon: complexSvg,
        title: 'Complex SVG',
      });
      component.init();

      const icon = container.querySelector('.empty-state-icon');
      expect(icon?.innerHTML).toContain('<svg');
      expect(icon?.innerHTML).toContain('<path');
    });

    it('should handle emoji icons', () => {
      component = new EmptyState(container, {
        icon: '🎨',
        title: 'Emoji',
      });
      component.init();

      const icon = container.querySelector('.empty-state-icon');
      expect(icon?.textContent).toBe('🎨');
    });

    it('should handle text icons', () => {
      component = new EmptyState(container, {
        icon: '!',
        title: 'Text Icon',
      });
      component.init();

      const icon = container.querySelector('.empty-state-icon');
      expect(icon?.textContent).toBe('!');
    });
  });
});
