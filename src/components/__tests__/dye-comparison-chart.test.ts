import { DyeComparisonChart } from '../dye-comparison-chart';
import {
  renderComponent,
  cleanupComponent,
  setupCanvasMocks,
  setupResizeObserverMock,
  mockDyeData,
  expectElement,
} from './test-utils';
import { ThemeService } from '../../services/theme-service';

// Mock ThemeService to avoid side effects and dependency on localStorage
let themeListener: ((theme: string) => void) | null = null;

vi.mock('../../services/theme-service', () => {
  return {
    ThemeService: {
      getCurrentTheme: vi.fn().mockReturnValue('standard-light'),
      getCurrentThemeObject: vi.fn().mockReturnValue({
        name: 'standard-light',
        palette: {
          primary: '#781A1A',
          background: '#E4DFD0',
          text: '#1E1E1E',
          textHeader: '#F9F8F4',
          border: '#451511',
          backgroundSecondary: '#E4DFD0',
          cardBackground: '#F9F8F4',
          cardHover: '#FDFDFC',
          textMuted: '#484742',
        },
        isDark: false,
      }),
      subscribe: vi.fn().mockImplementation((cb) => {
        themeListener = cb;
        return () => {
          themeListener = null;
        };
      }),
      setTheme: vi.fn().mockImplementation((theme) => {
        if (themeListener) themeListener(theme);
      }),
    },
  };
});

describe('DyeComparisonChart', () => {
  let component: DyeComparisonChart;
  let container: HTMLElement;

  beforeEach(() => {
    setupCanvasMocks();
    setupResizeObserverMock();
    try {
      [component, container] = renderComponent(DyeComparisonChart);
    } catch (e) {
      console.error('Setup failed:', e);
      throw e;
    }
  });

  afterEach(() => {
    cleanupComponent(component, container);
    vi.clearAllMocks();
  });

  it('should render successfully', () => {
    expect(container.querySelector('canvas')).not.toBeNull();
    expectElement.toHaveText(container.querySelector('h3'), 'Hue-Saturation Chart');
  });

  it('should initialize with default chart type', () => {
    const state = component['getState']();
    expect(state.chartType).toBe('hue-saturation');
  });

  it('should switch chart types', () => {
    component.setChartType('brightness');

    expectElement.toHaveText(container.querySelector('h3'), 'Brightness Chart');
    expectElement.toHaveText(container.querySelector('p'), 'Brightness');

    const state = component['getState']();
    expect(state.chartType).toBe('brightness');
  });

  it('should update dyes', () => {
    component.updateDyes(mockDyeData);

    const state = component['getState']();
    expect(state.dyeCount).toBe(mockDyeData.length);
  });

  it('should draw on canvas when dyes are present', async () => {
    // Spy on drawChart method to verify it gets called when dyes are updated
    const drawChartSpy = vi.spyOn(component as unknown as { drawChart: () => void }, 'drawChart');

    // Initial draw might happen in setTimeout
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Clear spy to only track calls after updateDyes
    drawChartSpy.mockClear();

    // Update with dyes
    component.updateDyes(mockDyeData);

    // Wait for next tick (drawChart is called in setTimeout)
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(drawChartSpy).toHaveBeenCalled();
  });

  it('should redraw when theme changes', () => {
    // Spy on drawChart method
    const drawSpy = vi.spyOn(component as unknown as { drawChart: () => void }, 'drawChart');

    // Trigger theme change
    ThemeService.setTheme('standard-dark');

    expect(drawSpy).toHaveBeenCalled();
  });

  it('should handle empty dye list gracefully', () => {
    component.updateDyes([]);
    const state = component['getState']();
    expect(state.dyeCount).toBe(0);
  });
});
