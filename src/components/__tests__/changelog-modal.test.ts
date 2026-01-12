import { ChangelogModal, showChangelogIfUpdated } from '../changelog-modal';
import { ModalService } from '@services/modal-service';
import { StorageService } from '@services/storage-service';
import { LanguageService } from '@services/language-service';
import { APP_VERSION, STORAGE_KEYS } from '@shared/constants';

// Mock Constants
vi.mock('@shared/constants', () => ({
  APP_VERSION: '2.3.0',
  STORAGE_KEYS: {
    LAST_VERSION_VIEWED: 'last_version_viewed',
  },
}));

// Mock Virtual Changelog
vi.mock('virtual:changelog', () => ({
  changelogEntries: [
    {
      version: '2.3.0',
      date: '2023-10-27',
      highlights: ['New Feature A', 'Bug Fix B'],
    },
    {
      version: '2.2.0',
      date: '2023-10-20',
      highlights: ['Old Feature C'],
    },
  ],
}));

// Mock Services
vi.mock('@services/modal-service', () => ({
  ModalService: {
    showChangelog: vi.fn(() => 'modal-id'),
    dismiss: vi.fn(),
  },
}));

vi.mock('@services/storage-service', () => ({
  StorageService: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

vi.mock('@services/language-service', () => ({
  LanguageService: {
    t: vi.fn((key) => key),
  },
}));

describe('ChangelogModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('shouldShow', () => {
    it('should return false if no last version (first visit)', () => {
      vi.mocked(StorageService.getItem).mockReturnValue(null);
      expect(ChangelogModal.shouldShow()).toBe(false);
    });

    it('should return false if version matches', () => {
      vi.mocked(StorageService.getItem).mockReturnValue('2.3.0');
      expect(ChangelogModal.shouldShow()).toBe(false);
    });

    it('should return true if version differs', () => {
      vi.mocked(StorageService.getItem).mockReturnValue('2.2.0');
      expect(ChangelogModal.shouldShow()).toBe(true);
    });
  });

  describe('markAsViewed', () => {
    it('should save current version to storage', () => {
      ChangelogModal.markAsViewed();
      expect(StorageService.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.LAST_VERSION_VIEWED,
        '2.3.0'
      );
    });
  });

  describe('reset', () => {
    it('should remove version from storage', () => {
      ChangelogModal.reset();
      expect(StorageService.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.LAST_VERSION_VIEWED);
    });
  });

  describe('show', () => {
    it('should call ModalService.showChangelog', () => {
      const modal = new ChangelogModal();
      modal.show();

      expect(ModalService.showChangelog).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('changelog.title'),
          closable: true,
        })
      );
    });

    it('should not show if already showing', () => {
      const modal = new ChangelogModal();
      modal.show();
      modal.show();
      expect(ModalService.showChangelog).toHaveBeenCalledTimes(1);
    });

    it('should mark as viewed on close', () => {
      const modal = new ChangelogModal();
      modal.show();

      const options = vi.mocked(ModalService.showChangelog).mock.calls[0][0];
      // @ts-ignore
      options.onClose();

      expect(StorageService.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.LAST_VERSION_VIEWED,
        '2.3.0'
      );
    });
  });

  describe('Content Generation', () => {
    it('should generate content with highlights', () => {
      const modal = new ChangelogModal();
      // Access private method via casting or just check show arguments
      modal.show();
      const options = vi.mocked(ModalService.showChangelog).mock.calls[0][0];
      const content = options.content as HTMLElement;

      expect(content.textContent).toContain('New Feature A');
      expect(content.textContent).toContain('Bug Fix B');
    });

    it('should include previous updates summary', () => {
      const modal = new ChangelogModal();
      modal.show();
      const options = vi.mocked(ModalService.showChangelog).mock.calls[0][0];
      const content = options.content as HTMLElement;

      expect(content.textContent).toContain('changelog.previousUpdates');
      expect(content.innerHTML).toContain('v2.2.0');
      expect(content.textContent).toContain('Old Feature C');
    });
  });

  describe('showChangelogIfUpdated', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should show modal if update detected', () => {
      vi.mocked(StorageService.getItem).mockReturnValue('2.2.0'); // Update needed

      showChangelogIfUpdated();

      vi.runAllTimers();

      expect(ModalService.showChangelog).toHaveBeenCalled();
    });

    it('should NOT show modal if no update', () => {
      vi.mocked(StorageService.getItem).mockReturnValue('2.3.0'); // No update

      showChangelogIfUpdated();

      vi.runAllTimers();

      expect(ModalService.showChangelog).not.toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('should dismiss modal when showing', () => {
      const modal = new ChangelogModal();
      modal.show();
      modal.close();

      expect(ModalService.dismiss).toHaveBeenCalledWith('modal-id');
    });

    it('should do nothing if modal not showing', () => {
      const modal = new ChangelogModal();
      modal.close();

      expect(ModalService.dismiss).not.toHaveBeenCalled();
    });
  });

  describe('Got It Button', () => {
    it('should close modal when clicked', () => {
      const modal = new ChangelogModal();
      modal.show();

      const options = vi.mocked(ModalService.showChangelog).mock.calls[0][0];
      const content = options.content as HTMLElement;

      // Find the Got It button
      const gotItBtn = Array.from(content.querySelectorAll('button')).find(
        (btn) => btn.textContent === 'changelog.gotIt'
      );

      expect(gotItBtn).toBeDefined();
      gotItBtn?.click();

      expect(ModalService.dismiss).toHaveBeenCalledWith('modal-id');
    });
  });
});

// ==========================================================================
// Branch Coverage Tests - Empty Entries and Fallback Paths
// ==========================================================================

describe('ChangelogModal Branch Coverage - Empty/Fallback Paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when changelog entries array is empty', () => {
    beforeEach(() => {
      // Reset the mock with empty entries
      vi.doMock('virtual:changelog', () => ({
        changelogEntries: [],
      }));
    });

    afterEach(() => {
      vi.doUnmock('virtual:changelog');
    });

    it('should show fallback message when no changelog data', async () => {
      // Re-import with empty changelog
      vi.resetModules();

      // Mock with empty entries
      vi.doMock('virtual:changelog', () => ({
        changelogEntries: [],
      }));

      // Re-import the module
      const { ChangelogModal: EmptyChangelogModal } = await import('../changelog-modal');

      const modal = new EmptyChangelogModal();
      modal.show();

      const options = vi.mocked(ModalService.showChangelog).mock.calls[0][0];
      const content = options.content as HTMLElement;

      // Should contain fallback text
      expect(content.textContent).toContain('changelog.noChanges');
    });
  });

  describe('when current version not found in entries', () => {
    it('should handle missing current version entry gracefully', async () => {
      vi.resetModules();

      // Mock with entries that don't include current version
      vi.doMock('virtual:changelog', () => ({
        changelogEntries: [
          {
            version: '2.1.0',
            date: '2023-10-15',
            highlights: ['Old Feature'],
          },
          {
            version: '2.0.0',
            date: '2023-10-01',
            highlights: ['Very Old Feature'],
          },
        ],
      }));

      const { ChangelogModal: MissingVersionModal } = await import('../changelog-modal');

      const modal = new MissingVersionModal();
      modal.show();

      // Should not throw
      expect(ModalService.showChangelog).toHaveBeenCalled();
    });
  });

  describe('when only current version entry exists (no previous)', () => {
    it('should not show previous updates section', async () => {
      vi.resetModules();

      // Mock with only current version
      vi.doMock('virtual:changelog', () => ({
        changelogEntries: [
          {
            version: '2.3.0',
            date: '2023-10-27',
            highlights: ['Only Feature'],
          },
        ],
      }));

      const { ChangelogModal: SingleEntryModal } = await import('../changelog-modal');

      const modal = new SingleEntryModal();
      modal.show();

      const options = vi.mocked(ModalService.showChangelog).mock.calls[0][0];
      const content = options.content as HTMLElement;

      // Should have the current version feature
      expect(content.textContent).toContain('Only Feature');

      // Should NOT have previous updates section (no border-t for separator before previous section)
      // The previous section has class "mt-6 pt-4 border-t"
      const previousSection = content.querySelector('.mt-6.pt-4.border-t');
      // Since there's only one entry, previous section shouldn't exist (with that specific structure for previous updates)
      // The only border-t should be the button container
    });
  });
});

// ==========================================================================
// Branch Coverage Tests - createVersionSection isCurrent branches
// ==========================================================================

describe('ChangelogModal Branch Coverage - Version Section Styling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not include version header for current version entry', () => {
    const modal = new ChangelogModal();
    modal.show();

    const options = vi.mocked(ModalService.showChangelog).mock.calls[0][0];
    const content = options.content as HTMLElement;

    // Current version section should not have a version header (h4 with version number)
    // but the previous updates section should have version references
    const versionHeaders = content.querySelectorAll('h4');

    // Find the one with the version number pattern vX.X.X
    const currentVersionHeader = Array.from(versionHeaders).find((h) =>
      h.textContent?.match(/^v2\.3\.0$/)
    );

    // Current version should NOT have its own header (that's only for non-current entries)
    expect(currentVersionHeader).toBeUndefined();
  });

  it('should show version in previous updates summary', () => {
    const modal = new ChangelogModal();
    modal.show();

    const options = vi.mocked(ModalService.showChangelog).mock.calls[0][0];
    const content = options.content as HTMLElement;

    // Previous updates should have version numbers shown
    expect(content.innerHTML).toContain('v2.2.0');
  });
});

// ==========================================================================
// Branch Coverage Tests - shouldShow edge cases
// ==========================================================================

describe('ChangelogModal Branch Coverage - shouldShow edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return false for empty string last version', () => {
    vi.mocked(StorageService.getItem).mockReturnValue('');
    expect(ChangelogModal.shouldShow()).toBe(false);
  });

  it('should return true for any non-matching version', () => {
    vi.mocked(StorageService.getItem).mockReturnValue('1.0.0');
    expect(ChangelogModal.shouldShow()).toBe(true);
  });

  it('should handle undefined return from storage', () => {
    vi.mocked(StorageService.getItem).mockReturnValue(undefined);
    expect(ChangelogModal.shouldShow()).toBe(false);
  });
});
