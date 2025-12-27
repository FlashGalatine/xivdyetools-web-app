/**
 * XIV Dye Tools - My Submissions Panel Tests
 *
 * Tests for the MySubmissionsPanel component
 * Covers: authentication state, loading, rendering submissions, expand/collapse
 */

import { MySubmissionsPanel } from '../my-submissions-panel';
import { authService, dyeService, presetSubmissionService } from '@services/index';
import type { CommunityPreset, PresetStatus } from '@services/community-preset-service';
import {
  createTestContainer,
  cleanupTestContainer,
} from './test-utils';

// Mock submission data
const createMockSubmission = (overrides: Partial<CommunityPreset> = {}): CommunityPreset => ({
  id: 'sub-1',
  name: 'My Test Preset',
  description: 'A test preset submission',
  category_id: 'aesthetics',
  dyes: [1, 2, 3],
  vote_count: 5,
  author_discord_id: 'user-1',
  author_name: 'TestUser',
  status: 'pending' as PresetStatus,
  tags: ['test', 'aesthetics'],
  is_curated: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// Mock dye data
const mockDyes = {
  1: { id: 1, name: 'Jet Black', hex: '#000000' },
  2: { id: 2, name: 'Snow White', hex: '#FFFFFF' },
  3: { id: 3, name: 'Rose Pink', hex: '#FF69B4' },
};

// ============================================================================
// Tests
// ============================================================================

describe('MySubmissionsPanel', () => {
  let container: HTMLElement;
  let panel: MySubmissionsPanel;

  beforeEach(() => {
    container = createTestContainer();

    // Mock dyeService.getDyeById
    vi.spyOn(dyeService, 'getDyeById').mockImplementation((id: number) => {
      return (mockDyes[id as keyof typeof mockDyes] as ReturnType<typeof dyeService.getDyeById>) || null;
    });

    // Mock presetSubmissionService.getStatusInfo
    vi.spyOn(presetSubmissionService, 'getStatusInfo').mockImplementation((status: PresetStatus) => ({
      label: status.charAt(0).toUpperCase() + status.slice(1),
      colorClass: 'bg-yellow-100 text-yellow-800',
      icon: '⏳',
    }));

    // Default: not authenticated
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(false);
  });

  afterEach(() => {
    if (panel) {
      panel.destroy();
    }
    cleanupTestContainer(container);
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Authentication Tests
  // ==========================================================================

  describe('Authentication', () => {
    it('should show sign-in prompt when not authenticated', async () => {
      panel = new MySubmissionsPanel(container);
      await panel.render();

      expect(container.textContent).toContain('Sign in to view your submissions');
    });

    it('should show header when authenticated', async () => {
      vi.mocked(authService.isAuthenticated).mockReturnValue(true);
      vi.spyOn(presetSubmissionService, 'getMySubmissions').mockResolvedValue({
        presets: [],
        total: 0,
      });

      panel = new MySubmissionsPanel(container);
      await panel.render();

      expect(container.textContent).toContain('My Submissions');
    });
  });

  // ==========================================================================
  // Loading State Tests
  // ==========================================================================

  describe('Loading State', () => {
    it('should show loading state while fetching submissions', async () => {
      vi.mocked(authService.isAuthenticated).mockReturnValue(true);

      // Create a promise that we can resolve later
      let resolvePromise: (value: { presets: CommunityPreset[]; total: number }) => void;
      const pendingPromise = new Promise<{ presets: CommunityPreset[]; total: number }>((resolve) => {
        resolvePromise = resolve;
      });

      vi.spyOn(presetSubmissionService, 'getMySubmissions').mockReturnValue(pendingPromise);

      panel = new MySubmissionsPanel(container);
      panel.render(); // Don't await yet

      // Check loading state is shown initially
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(container.textContent).toContain('Loading your submissions...');

      // Resolve the promise
      resolvePromise!({ presets: [], total: 0 });
    });

    it('should show spinner during loading', async () => {
      vi.mocked(authService.isAuthenticated).mockReturnValue(true);

      let resolvePromise: (value: { presets: CommunityPreset[]; total: number }) => void;
      const pendingPromise = new Promise<{ presets: CommunityPreset[]; total: number }>((resolve) => {
        resolvePromise = resolve;
      });

      vi.spyOn(presetSubmissionService, 'getMySubmissions').mockReturnValue(pendingPromise);

      panel = new MySubmissionsPanel(container);
      panel.render();

      await new Promise(resolve => setTimeout(resolve, 0));
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).not.toBeNull();

      resolvePromise!({ presets: [], total: 0 });
    });
  });

  // ==========================================================================
  // Empty State Tests
  // ==========================================================================

  describe('Empty State', () => {
    it('should show empty state when no submissions', async () => {
      vi.mocked(authService.isAuthenticated).mockReturnValue(true);
      vi.spyOn(presetSubmissionService, 'getMySubmissions').mockResolvedValue({
        presets: [],
        total: 0,
      });

      panel = new MySubmissionsPanel(container);
      await panel.render();

      expect(container.textContent).toContain("You haven't submitted any presets yet");
    });

    it('should show hint about submitting presets', async () => {
      vi.mocked(authService.isAuthenticated).mockReturnValue(true);
      vi.spyOn(presetSubmissionService, 'getMySubmissions').mockResolvedValue({
        presets: [],
        total: 0,
      });

      panel = new MySubmissionsPanel(container);
      await panel.render();

      expect(container.textContent).toContain('Submit Preset');
    });
  });

  // ==========================================================================
  // Submissions List Tests
  // ==========================================================================

  describe('Submissions List', () => {
    it('should render submission cards', async () => {
      vi.mocked(authService.isAuthenticated).mockReturnValue(true);
      vi.spyOn(presetSubmissionService, 'getMySubmissions').mockResolvedValue({
        presets: [createMockSubmission(), createMockSubmission({ id: 'sub-2' })],
        total: 2,
      });

      panel = new MySubmissionsPanel(container);
      await panel.render();

      const cards = container.querySelectorAll('[data-preset-id]');
      expect(cards.length).toBe(2);
    });

    it('should display submission name', async () => {
      vi.mocked(authService.isAuthenticated).mockReturnValue(true);
      vi.spyOn(presetSubmissionService, 'getMySubmissions').mockResolvedValue({
        presets: [createMockSubmission({ name: 'Beautiful Glamour' })],
        total: 1,
      });

      panel = new MySubmissionsPanel(container);
      await panel.render();

      expect(container.textContent).toContain('Beautiful Glamour');
    });

    it('should display status badge', async () => {
      vi.mocked(authService.isAuthenticated).mockReturnValue(true);
      vi.spyOn(presetSubmissionService, 'getMySubmissions').mockResolvedValue({
        presets: [createMockSubmission({ status: 'pending' })],
        total: 1,
      });

      panel = new MySubmissionsPanel(container);
      await panel.render();

      expect(container.textContent).toContain('Pending');
    });

    it('should display creation date', async () => {
      vi.mocked(authService.isAuthenticated).mockReturnValue(true);
      const date = new Date('2024-01-15');
      vi.spyOn(presetSubmissionService, 'getMySubmissions').mockResolvedValue({
        presets: [createMockSubmission({ created_at: date.toISOString() })],
        total: 1,
      });

      panel = new MySubmissionsPanel(container);
      await panel.render();

      // Check that some date format is shown
      expect(container.textContent).toMatch(/\d+\/\d+\/\d+/);
    });

    it('should render color swatches', async () => {
      vi.mocked(authService.isAuthenticated).mockReturnValue(true);
      vi.spyOn(presetSubmissionService, 'getMySubmissions').mockResolvedValue({
        presets: [createMockSubmission({ dyes: [1, 2, 3] })],
        total: 1,
      });

      panel = new MySubmissionsPanel(container);
      await panel.render();

      const swatches = container.querySelectorAll('.w-16.h-8 .flex-1');
      expect(swatches.length).toBe(3);
    });
  });

  // ==========================================================================
  // Refresh Tests
  // ==========================================================================

  describe('Refresh', () => {
    it('should have refresh button', async () => {
      vi.mocked(authService.isAuthenticated).mockReturnValue(true);
      vi.spyOn(presetSubmissionService, 'getMySubmissions').mockResolvedValue({
        presets: [],
        total: 0,
      });

      panel = new MySubmissionsPanel(container);
      await panel.render();

      const refreshBtn = container.querySelector('[data-action="refresh"]');
      expect(refreshBtn).not.toBeNull();
    });

    it('should have aria-label on refresh button', async () => {
      vi.mocked(authService.isAuthenticated).mockReturnValue(true);
      vi.spyOn(presetSubmissionService, 'getMySubmissions').mockResolvedValue({
        presets: [],
        total: 0,
      });

      panel = new MySubmissionsPanel(container);
      await panel.render();

      const refreshBtn = container.querySelector('[data-action="refresh"]');
      expect(refreshBtn?.getAttribute('aria-label')).toBe('Refresh submissions');
    });
  });

  // ==========================================================================
  // Error State Tests
  // ==========================================================================

  describe('Error State', () => {
    it('should show error state when API fails', async () => {
      vi.mocked(authService.isAuthenticated).mockReturnValue(true);
      vi.spyOn(presetSubmissionService, 'getMySubmissions').mockRejectedValue(new Error('API Error'));
      vi.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console error

      panel = new MySubmissionsPanel(container);
      await panel.render();

      expect(container.textContent).toContain('Failed to load submissions');
    });
  });

  // ==========================================================================
  // Cleanup Tests
  // ==========================================================================

  describe('Cleanup', () => {
    it('should clear submissions on destroy', async () => {
      vi.mocked(authService.isAuthenticated).mockReturnValue(true);
      vi.spyOn(presetSubmissionService, 'getMySubmissions').mockResolvedValue({
        presets: [createMockSubmission()],
        total: 1,
      });

      panel = new MySubmissionsPanel(container);
      await panel.render();

      panel.destroy();

      // Panel should be destroyed without errors
      expect(container.querySelector('[data-preset-id]')).toBeNull();
    });
  });
});
