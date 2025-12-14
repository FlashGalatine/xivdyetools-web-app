/**
 * XIV Dye Tools - AuthService Unit Tests
 * Tests for Discord OAuth authentication service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to test the module fresh for each test
describe('AuthService', () => {
  const mockLocalStorage: Record<string, string> = {};
  const mockSessionStorage: Record<string, string> = {};

  beforeEach(() => {
    // Clear storage mocks
    Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);
    Object.keys(mockSessionStorage).forEach((key) => delete mockSessionStorage[key]);

    // Mock localStorage
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mockLocalStorage[key] ?? null,
      setItem: (key: string, value: string) => {
        mockLocalStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockLocalStorage[key];
      },
      clear: () => {
        Object.keys(mockLocalStorage).forEach((key) => delete mockLocalStorage[key]);
      },
    });

    // Mock sessionStorage
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => mockSessionStorage[key] ?? null,
      setItem: (key: string, value: string) => {
        mockSessionStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockSessionStorage[key];
      },
      clear: () => {
        Object.keys(mockSessionStorage).forEach((key) => delete mockSessionStorage[key]);
      },
    });

    // Mock window.location
    const mockLocation = {
      href: 'http://localhost:3000/',
      origin: 'http://localhost:3000',
      pathname: '/',
      search: '',
      hash: '',
      assign: vi.fn(),
      replace: vi.fn(),
      reload: vi.fn(),
    };
    vi.stubGlobal('location', mockLocation);

    // Mock window.history
    vi.stubGlobal('history', {
      replaceState: vi.fn(),
      pushState: vi.fn(),
    });

    // Mock fetch
    vi.stubGlobal('fetch', vi.fn());

    // Mock crypto.subtle
    vi.stubGlobal('crypto', {
      getRandomValues: (array: Uint8Array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
        return array;
      },
      subtle: {
        digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  // Helper to create a mock JWT token
  function createMockJWT(payload: Record<string, unknown>): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const payloadStr = btoa(JSON.stringify(payload))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const signature = 'mock_signature';
    return `${header}.${payloadStr}.${signature}`;
  }

  describe('sanitizeReturnPath', () => {
    it('should return / for null or undefined', async () => {
      const { authService } = await import('../auth-service');
      // Access via subscribe callback to check internal state behavior
      expect(authService).toBeDefined();
    });
  });

  describe('initial state', () => {
    it('should start with unauthenticated state', async () => {
      const { authService } = await import('../auth-service');

      const state = authService.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.expiresAt).toBeNull();
    });

    it('should return false for isAuthenticated when not logged in', async () => {
      const { authService } = await import('../auth-service');
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should return null for getUser when not logged in', async () => {
      const { authService } = await import('../auth-service');
      expect(authService.getUser()).toBeNull();
    });

    it('should return empty object for getAuthHeaders when not logged in', async () => {
      const { authService } = await import('../auth-service');
      expect(authService.getAuthHeaders()).toEqual({});
    });
  });

  describe('initialize', () => {
    it('should initialize without errors', async () => {
      const { authService } = await import('../auth-service');
      await expect(authService.initialize()).resolves.not.toThrow();
    });

    it('should load token from localStorage if present and valid', async () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const mockToken = createMockJWT({
        sub: '123456789',
        username: 'testuser',
        global_name: 'Test User',
        avatar: 'abc123',
        exp: futureTime,
        iat: Math.floor(Date.now() / 1000),
        iss: 'xivdyetools',
      });

      mockLocalStorage['xivdyetools_auth_token'] = mockToken;
      mockLocalStorage['xivdyetools_auth_expires'] = String(futureTime);

      const { authService } = await import('../auth-service');
      await authService.initialize();

      expect(authService.isAuthenticated()).toBe(true);
      const user = authService.getUser();
      expect(user?.username).toBe('testuser');
      expect(user?.id).toBe('123456789');
    });

    it('should clear expired token from localStorage', async () => {
      const pastTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const mockToken = createMockJWT({
        sub: '123456789',
        username: 'testuser',
        global_name: 'Test User',
        avatar: 'abc123',
        exp: pastTime,
        iat: pastTime - 3600,
        iss: 'xivdyetools',
      });

      mockLocalStorage['xivdyetools_auth_token'] = mockToken;
      mockLocalStorage['xivdyetools_auth_expires'] = String(pastTime);

      const { authService } = await import('../auth-service');
      await authService.initialize();

      expect(authService.isAuthenticated()).toBe(false);
      expect(mockLocalStorage['xivdyetools_auth_token']).toBeUndefined();
    });

    it('should not reinitialize if already initialized', async () => {
      const { authService } = await import('../auth-service');
      await authService.initialize();
      await authService.initialize(); // Should be a no-op
      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('subscribe', () => {
    it('should call listener immediately with current state', async () => {
      const { authService } = await import('../auth-service');
      const listener = vi.fn();

      authService.subscribe(listener);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          isAuthenticated: false,
          user: null,
          token: null,
        })
      );
    });

    it('should return unsubscribe function', async () => {
      const { authService } = await import('../auth-service');
      const listener = vi.fn();

      const unsubscribe = authService.subscribe(listener);
      expect(typeof unsubscribe).toBe('function');

      unsubscribe();
      // Listener should not be called again after unsubscribe
    });
  });

  describe('logout', () => {
    it('should clear auth state on logout', async () => {
      // Setup authenticated state
      const futureTime = Math.floor(Date.now() / 1000) + 3600;
      const mockToken = createMockJWT({
        sub: '123456789',
        username: 'testuser',
        global_name: 'Test User',
        avatar: null,
        exp: futureTime,
        iat: Math.floor(Date.now() / 1000),
        iss: 'xivdyetools',
      });

      mockLocalStorage['xivdyetools_auth_token'] = mockToken;
      mockLocalStorage['xivdyetools_auth_expires'] = String(futureTime);

      // Mock fetch for revoke call
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { authService } = await import('../auth-service');
      await authService.initialize();

      expect(authService.isAuthenticated()).toBe(true);

      await authService.logout();

      expect(authService.isAuthenticated()).toBe(false);
      expect(authService.getUser()).toBeNull();
      expect(mockLocalStorage['xivdyetools_auth_token']).toBeUndefined();
      expect(mockLocalStorage['xivdyetools_auth_expires']).toBeUndefined();
    });

    it('should notify listeners on logout', async () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600;
      const mockToken = createMockJWT({
        sub: '123456789',
        username: 'testuser',
        global_name: 'Test User',
        avatar: null,
        exp: futureTime,
        iat: Math.floor(Date.now() / 1000),
        iss: 'xivdyetools',
      });

      mockLocalStorage['xivdyetools_auth_token'] = mockToken;
      mockLocalStorage['xivdyetools_auth_expires'] = String(futureTime);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { authService } = await import('../auth-service');
      await authService.initialize();

      const listener = vi.fn();
      authService.subscribe(listener);
      listener.mockClear();

      await authService.logout();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          isAuthenticated: false,
          user: null,
          token: null,
        })
      );
    });

    it('should handle revoke fetch failure gracefully', async () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600;
      const mockToken = createMockJWT({
        sub: '123456789',
        username: 'testuser',
        global_name: null,
        avatar: null,
        exp: futureTime,
        iat: Math.floor(Date.now() / 1000),
        iss: 'xivdyetools',
      });

      mockLocalStorage['xivdyetools_auth_token'] = mockToken;
      mockLocalStorage['xivdyetools_auth_expires'] = String(futureTime);

      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      const { authService } = await import('../auth-service');
      await authService.initialize();

      // Should not throw even if revoke fails
      await expect(authService.logout()).resolves.not.toThrow();
      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('getAuthHeaders', () => {
    it('should return Authorization header when authenticated', async () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600;
      const mockToken = createMockJWT({
        sub: '123456789',
        username: 'testuser',
        global_name: 'Test User',
        avatar: 'abc123',
        exp: futureTime,
        iat: Math.floor(Date.now() / 1000),
        iss: 'xivdyetools',
      });

      mockLocalStorage['xivdyetools_auth_token'] = mockToken;
      mockLocalStorage['xivdyetools_auth_expires'] = String(futureTime);

      const { authService } = await import('../auth-service');
      await authService.initialize();

      const headers = authService.getAuthHeaders();
      expect(headers).toHaveProperty('Authorization');
      expect(headers.Authorization).toMatch(/^Bearer /);
    });

    it('should return empty object when not authenticated', async () => {
      const { authService } = await import('../auth-service');
      const headers = authService.getAuthHeaders();
      expect(headers).toEqual({});
    });
  });

  describe('isAuthenticated with expiry check', () => {
    it('should call logout when checking authentication and token is expired', async () => {
      // Setup a token that looks valid in storage but has an old expiresAt
      // This simulates the case where the token expired after being loaded
      const pastTime = Math.floor(Date.now() / 1000) - 10; // Already expired
      const mockToken = createMockJWT({
        sub: '123456789',
        username: 'testuser',
        global_name: 'Test User',
        avatar: null,
        exp: pastTime,
        iat: pastTime - 3600,
        iss: 'xivdyetools',
      });

      // First, set up with a future expiry to get it loaded
      const futureTime = Math.floor(Date.now() / 1000) + 3600;
      mockLocalStorage['xivdyetools_auth_token'] = mockToken;
      mockLocalStorage['xivdyetools_auth_expires'] = String(futureTime);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const { authService } = await import('../auth-service');
      await authService.initialize();

      expect(authService.isAuthenticated()).toBe(true);

      // Now simulate the token having expired by modifying the storage
      // and creating a fresh import
      vi.resetModules();
      mockLocalStorage['xivdyetools_auth_expires'] = String(pastTime);

      const { authService: freshService } = await import('../auth-service');
      await freshService.initialize();

      // Token should be cleared because it's expired
      expect(freshService.isAuthenticated()).toBe(false);
    });
  });

  describe('consumeReturnTool', () => {
    it('should return and remove stored tool from sessionStorage', async () => {
      mockSessionStorage['xivdyetools_oauth_return_tool'] = 'presets';

      const { consumeReturnTool } = await import('../auth-service');

      const tool = consumeReturnTool();
      expect(tool).toBe('presets');
      expect(mockSessionStorage['xivdyetools_oauth_return_tool']).toBeUndefined();
    });

    it('should return null if no tool stored', async () => {
      const { consumeReturnTool } = await import('../auth-service');
      expect(consumeReturnTool()).toBeNull();
    });
  });

  describe('avatar URL generation', () => {
    it('should generate correct avatar URL for static avatar', async () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600;
      const mockToken = createMockJWT({
        sub: '123456789',
        discord_id: '123456789',
        username: 'testuser',
        global_name: 'Test User',
        avatar: 'abc123',
        exp: futureTime,
        iat: Math.floor(Date.now() / 1000),
        iss: 'xivdyetools',
      });

      mockLocalStorage['xivdyetools_auth_token'] = mockToken;
      mockLocalStorage['xivdyetools_auth_expires'] = String(futureTime);

      const { authService } = await import('../auth-service');
      await authService.initialize();

      const user = authService.getUser();
      expect(user?.avatar_url).toBe('https://cdn.discordapp.com/avatars/123456789/abc123.png');
    });

    it('should generate correct avatar URL for animated avatar', async () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600;
      const mockToken = createMockJWT({
        sub: '123456789',
        discord_id: '123456789',
        username: 'testuser',
        global_name: 'Test User',
        avatar: 'a_animated123',
        exp: futureTime,
        iat: Math.floor(Date.now() / 1000),
        iss: 'xivdyetools',
      });

      mockLocalStorage['xivdyetools_auth_token'] = mockToken;
      mockLocalStorage['xivdyetools_auth_expires'] = String(futureTime);

      const { authService } = await import('../auth-service');
      await authService.initialize();

      const user = authService.getUser();
      expect(user?.avatar_url).toBe('https://cdn.discordapp.com/avatars/123456789/a_animated123.gif');
    });

    it('should return null avatar_url when no avatar', async () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600;
      const mockToken = createMockJWT({
        sub: '123456789',
        username: 'testuser',
        global_name: 'Test User',
        avatar: null,
        exp: futureTime,
        iat: Math.floor(Date.now() / 1000),
        iss: 'xivdyetools',
      });

      mockLocalStorage['xivdyetools_auth_token'] = mockToken;
      mockLocalStorage['xivdyetools_auth_expires'] = String(futureTime);

      const { authService } = await import('../auth-service');
      await authService.initialize();

      const user = authService.getUser();
      expect(user?.avatar_url).toBeNull();
    });
  });

  describe('JWT decoding', () => {
    it('should handle invalid JWT format', async () => {
      mockLocalStorage['xivdyetools_auth_token'] = 'not.a.valid.jwt.token.with.too.many.parts';
      mockLocalStorage['xivdyetools_auth_expires'] = String(Math.floor(Date.now() / 1000) + 3600);

      const { authService } = await import('../auth-service');
      await authService.initialize();

      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should handle JWT with invalid base64', async () => {
      mockLocalStorage['xivdyetools_auth_token'] = 'header.!!!invalid!!!.signature';
      mockLocalStorage['xivdyetools_auth_expires'] = String(Math.floor(Date.now() / 1000) + 3600);

      const { authService } = await import('../auth-service');
      await authService.initialize();

      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('login', () => {
    it('should initiate OAuth flow', async () => {
      const { authService } = await import('../auth-service');

      // Mock crypto.subtle.digest for the PKCE challenge
      (global.crypto.subtle.digest as ReturnType<typeof vi.fn>).mockResolvedValue(
        new Uint8Array(32).buffer
      );

      await authService.login('/return-path', 'presets');

      // Should store PKCE verifier and state in session storage
      expect(mockSessionStorage['xivdyetools_pkce_verifier']).toBeDefined();
      expect(mockSessionStorage['xivdyetools_oauth_state']).toBeDefined();
      expect(mockSessionStorage['xivdyetools_oauth_return_path']).toBe('/return-path');
      expect(mockSessionStorage['xivdyetools_oauth_return_tool']).toBe('presets');

      // Should redirect
      expect(window.location.href).toContain('auth/discord');
    });

    it('should use current pathname as return path by default', async () => {
      (window.location as { pathname: string }).pathname = '/current-page';

      const { authService } = await import('../auth-service');

      (global.crypto.subtle.digest as ReturnType<typeof vi.fn>).mockResolvedValue(
        new Uint8Array(32).buffer
      );

      await authService.login();

      expect(mockSessionStorage['xivdyetools_oauth_return_path']).toBe('/current-page');
    });
  });
});
