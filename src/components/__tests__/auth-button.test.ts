/**
 * XIV Dye Tools - Auth Button Tests
 *
 * Tests for the AuthButton component
 * Covers: login buttons, subscription, and basic rendering
 */

import { AuthButton } from '../auth-button';
import { authService } from '@services/index';
import type { AuthState, AuthUser } from '@services/auth-service';
import {
  createTestContainer,
  cleanupTestContainer,
  cleanupComponent,
} from './test-utils';

// Mock auth state helpers
const createMockUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
  id: 'test-user-id',
  username: 'testuser',
  global_name: 'Test User',
  avatar: 'abc123',
  avatar_url: 'https://cdn.example.com/avatars/test.png',
  auth_provider: 'discord',
  ...overrides,
});

const createAuthState = (overrides: Partial<AuthState> = {}): AuthState => ({
  isAuthenticated: false,
  user: null,
  token: null,
  expiresAt: null,
  provider: null,
  ...overrides,
});

// ============================================================================
// Tests
// ============================================================================

describe('AuthButton', () => {
  let container: HTMLElement;
  let component: AuthButton;
  let subscriberCallback: ((state: AuthState) => void) | null = null;

  beforeEach(() => {
    container = createTestContainer();
    subscriberCallback = null;

    // Set up spies - default to unauthenticated state
    vi.spyOn(authService, 'getState').mockReturnValue(createAuthState());
    vi.spyOn(authService, 'subscribe').mockImplementation((callback: (state: AuthState) => void) => {
      subscriberCallback = callback;
      return () => {
        subscriberCallback = null;
      };
    });
    vi.spyOn(authService, 'login').mockImplementation(async () => {});
    vi.spyOn(authService, 'loginWithXIVAuth').mockImplementation(async () => {});
    vi.spyOn(authService, 'logout').mockResolvedValue(undefined);
  });

  afterEach(() => {
    if (component) {
      cleanupComponent(component, container);
    } else {
      cleanupTestContainer(container);
    }
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  // Helper to initialize component in authenticated state
  const initAsAuthenticated = (userOverrides: Partial<AuthUser> = {}) => {
    component = new AuthButton(container);
    component.init();
    // Simulate authentication via subscriber
    if (subscriberCallback) {
      subscriberCallback(
        createAuthState({
          isAuthenticated: true,
          user: createMockUser(userOverrides),
          token: 'test-token',
          provider: 'discord',
        })
      );
    }
  };

  // ==========================================================================
  // Logged Out State Tests
  // ==========================================================================

  describe('Logged Out State', () => {
    it('should render Discord login button when not authenticated', () => {
      component = new AuthButton(container);
      component.init();

      const discordBtn = container.querySelector('#auth-login-discord-btn');
      expect(discordBtn).not.toBeNull();
      expect(discordBtn?.textContent).toContain('Discord');
    });

    it('should render XIVAuth login button when not authenticated', () => {
      component = new AuthButton(container);
      component.init();

      const xivauthBtn = container.querySelector('#auth-login-xivauth-btn');
      expect(xivauthBtn).not.toBeNull();
      expect(xivauthBtn?.textContent).toContain('XIVAuth');
    });

    it('should call authService.login when Discord button is clicked', () => {
      component = new AuthButton(container);
      component.init();

      const discordBtn = container.querySelector('#auth-login-discord-btn') as HTMLButtonElement;
      discordBtn.click();

      expect(authService.login).toHaveBeenCalledTimes(1);
    });

    it('should call authService.loginWithXIVAuth when XIVAuth button is clicked', () => {
      component = new AuthButton(container);
      component.init();

      const xivauthBtn = container.querySelector('#auth-login-xivauth-btn') as HTMLButtonElement;
      xivauthBtn.click();

      expect(authService.loginWithXIVAuth).toHaveBeenCalledTimes(1);
    });

    it('should pass returnTool to login methods', () => {
      component = new AuthButton(container, { returnTool: 'presets' });
      component.init();

      const discordBtn = container.querySelector('#auth-login-discord-btn') as HTMLButtonElement;
      discordBtn.click();

      expect(authService.login).toHaveBeenCalledWith(undefined, 'presets');

      const xivauthBtn = container.querySelector('#auth-login-xivauth-btn') as HTMLButtonElement;
      xivauthBtn.click();

      expect(authService.loginWithXIVAuth).toHaveBeenCalledWith(undefined, 'presets');
    });

    it('should have proper aria-labels on login buttons', () => {
      component = new AuthButton(container);
      component.init();

      const discordBtn = container.querySelector('#auth-login-discord-btn');
      const xivauthBtn = container.querySelector('#auth-login-xivauth-btn');

      expect(discordBtn?.getAttribute('aria-label')).toBe('Login with Discord');
      expect(xivauthBtn?.getAttribute('aria-label')).toBe('Login with XIVAuth');
    });
  });

  // ==========================================================================
  // Subscriptions Tests
  // ==========================================================================

  describe('Subscriptions', () => {
    it('should subscribe to auth changes on mount', () => {
      component = new AuthButton(container);
      component.init();

      expect(authService.subscribe).toHaveBeenCalledTimes(1);
    });

    it('should update UI when auth state changes to authenticated', () => {
      component = new AuthButton(container);
      component.init();

      // Initially logged out
      expect(container.querySelector('#auth-login-discord-btn')).not.toBeNull();
      expect(container.querySelector('#auth-user-btn')).toBeNull();

      // Simulate auth state change via subscriber
      if (subscriberCallback) {
        subscriberCallback(
          createAuthState({
            isAuthenticated: true,
            user: createMockUser(),
          })
        );
      }

      // Now logged in - user button should appear
      expect(container.querySelector('#auth-login-discord-btn')).toBeNull();
      expect(container.querySelector('#auth-user-btn')).not.toBeNull();
    });

    it('should update UI when auth state changes to logged out', () => {
      initAsAuthenticated();

      // Verify logged in state
      expect(container.querySelector('#auth-user-btn')).not.toBeNull();

      // Simulate logout via subscriber
      if (subscriberCallback) {
        subscriberCallback(createAuthState({ isAuthenticated: false, user: null }));
      }

      // Now logged out
      expect(container.querySelector('#auth-login-discord-btn')).not.toBeNull();
    });

    it('should unsubscribe from auth changes on destroy', () => {
      component = new AuthButton(container);
      component.init();

      expect(subscriberCallback).not.toBeNull();

      component.destroy();

      // Unsubscribe should have been called
      expect(subscriberCallback).toBeNull();
    });
  });

  // ==========================================================================
  // Logged In State Tests
  // ==========================================================================

  describe('Logged In State', () => {
    it('should render user button when authenticated', () => {
      initAsAuthenticated();

      const userBtn = container.querySelector('#auth-user-btn');
      expect(userBtn).not.toBeNull();
    });

    it('should display user avatar when available', () => {
      initAsAuthenticated();

      const avatar = container.querySelector('#auth-user-btn img');
      expect(avatar).not.toBeNull();
      expect(avatar?.getAttribute('src')).toBe('https://cdn.example.com/avatars/test.png');
    });

    it('should display initials when no avatar_url', () => {
      initAsAuthenticated({ avatar_url: undefined });

      const avatarDiv = container.querySelector('#auth-user-btn .rounded-full');
      expect(avatarDiv?.textContent).toBe('T'); // First letter of "Test User"
    });

    it('should display username in button', () => {
      initAsAuthenticated();

      const username = container.querySelector('#auth-user-btn .truncate');
      expect(username?.textContent).toBe('Test User');
    });

    it('should display username when global_name is not set', () => {
      initAsAuthenticated({ global_name: undefined });

      const username = container.querySelector('#auth-user-btn .truncate');
      expect(username?.textContent).toBe('testuser');
    });

    it('should have dropdown hidden by default', () => {
      initAsAuthenticated();

      const dropdown = container.querySelector('#auth-dropdown');
      expect(dropdown?.classList.contains('hidden')).toBe(true);
    });

    it('should have aria-haspopup attribute on user button', () => {
      initAsAuthenticated();

      const userBtn = container.querySelector('#auth-user-btn');
      expect(userBtn?.getAttribute('aria-haspopup')).toBe('true');
    });
  });

  // ==========================================================================
  // Dropdown Behavior Tests
  // ==========================================================================

  describe('Dropdown Behavior', () => {
    it('should toggle dropdown when user button is clicked', () => {
      initAsAuthenticated();

      const userBtn = container.querySelector('#auth-user-btn') as HTMLButtonElement;
      const dropdown = container.querySelector('#auth-dropdown');

      expect(dropdown?.classList.contains('hidden')).toBe(true);

      userBtn.click();
      expect(dropdown?.classList.contains('hidden')).toBe(false);

      userBtn.click();
      expect(dropdown?.classList.contains('hidden')).toBe(true);
    });

    it('should update aria-expanded when dropdown is toggled', () => {
      initAsAuthenticated();

      const userBtn = container.querySelector('#auth-user-btn') as HTMLButtonElement;

      expect(userBtn.getAttribute('aria-expanded')).toBe('false');

      userBtn.click();
      expect(userBtn.getAttribute('aria-expanded')).toBe('true');
    });

    it('should close dropdown when clicking outside', () => {
      initAsAuthenticated();

      const userBtn = container.querySelector('#auth-user-btn') as HTMLButtonElement;
      const dropdown = container.querySelector('#auth-dropdown');

      // Open dropdown
      userBtn.click();
      expect(dropdown?.classList.contains('hidden')).toBe(false);

      // Click outside
      document.body.click();
      expect(dropdown?.classList.contains('hidden')).toBe(true);
    });

    it('should close dropdown when Escape key is pressed', () => {
      initAsAuthenticated();

      const userBtn = container.querySelector('#auth-user-btn') as HTMLButtonElement;

      // Open dropdown
      userBtn.click();
      expect(userBtn.getAttribute('aria-expanded')).toBe('true');

      // Press Escape
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);

      // Dropdown should be closed
      const dropdownAfter = container.querySelector('#auth-dropdown');
      expect(dropdownAfter?.classList.contains('hidden')).toBe(true);
    });

    it('should display user info in dropdown header', () => {
      initAsAuthenticated();

      const userBtn = container.querySelector('#auth-user-btn') as HTMLButtonElement;
      userBtn.click();

      const headerName = container.querySelector('#auth-dropdown .font-medium');
      const headerUsername = container.querySelector('#auth-dropdown .opacity-70');

      expect(headerName?.textContent).toBe('Test User');
      expect(headerUsername?.textContent).toBe('@testuser');
    });

    it('should close dropdown when auth state changes', () => {
      initAsAuthenticated();

      // Open dropdown
      const userBtn = container.querySelector('#auth-user-btn') as HTMLButtonElement;
      userBtn.click();

      expect(container.querySelector('#auth-dropdown')?.classList.contains('hidden')).toBe(false);

      // Simulate state change
      if (subscriberCallback) {
        subscriberCallback(
          createAuthState({
            isAuthenticated: true,
            user: createMockUser(),
          })
        );
      }

      // Dropdown should be closed
      expect(container.querySelector('#auth-dropdown')?.classList.contains('hidden')).toBe(true);
    });
  });

  // ==========================================================================
  // Logout Tests
  // ==========================================================================

  describe('Logout', () => {
    it('should have logout button in dropdown', () => {
      initAsAuthenticated();

      const userBtn = container.querySelector('#auth-user-btn') as HTMLButtonElement;
      userBtn.click();

      const logoutBtn = container.querySelector('#auth-logout-btn');
      expect(logoutBtn).not.toBeNull();
      expect(logoutBtn?.textContent).toContain('Logout');
    });

    it('should call authService.logout when logout button is clicked', () => {
      initAsAuthenticated();

      const userBtn = container.querySelector('#auth-user-btn') as HTMLButtonElement;
      userBtn.click();

      const logoutBtn = container.querySelector('#auth-logout-btn') as HTMLButtonElement;
      logoutBtn.click();

      expect(authService.logout).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // State Getter Tests
  // ==========================================================================

  describe('State Getter', () => {
    it('should return correct state when logged out', () => {
      component = new AuthButton(container);
      component.init();

      const state = component['getState']();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.isDropdownOpen).toBe(false);
    });

    it('should return correct state when logged in', () => {
      initAsAuthenticated();

      const state = component['getState']();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).not.toBeNull();
    });
  });
});
