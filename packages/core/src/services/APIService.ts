/**
 * @xivdyetools/core - API Service
 *
 * Universalis API integration with caching and debouncing
 * Environment-agnostic with pluggable cache backends
 *
 * @module services/APIService
 */

import type { PriceData, CachedData } from '../types/index.js';
import { ErrorCode, AppError } from '../types/index.js';
import {
  UNIVERSALIS_API_BASE,
  UNIVERSALIS_API_TIMEOUT,
  UNIVERSALIS_API_RETRY_COUNT,
  UNIVERSALIS_API_RETRY_DELAY,
  API_CACHE_TTL,
  API_RATE_LIMIT_DELAY,
  API_CACHE_VERSION,
  API_MAX_RESPONSE_SIZE,
} from '../constants/index.js';
import { retry, sleep, generateChecksum } from '../utils/index.js';

// ============================================================================
// Cache Interface
// ============================================================================

/**
 * Cache backend interface
 * Implement this for different storage backends (localStorage, Redis, Memory, etc.)
 */
export interface ICacheBackend {
  /**
   * Get item from cache
   */
  get(key: string): Promise<CachedData<PriceData> | null> | CachedData<PriceData> | null;

  /**
   * Set item in cache
   */
  set(key: string, value: CachedData<PriceData>): Promise<void> | void;

  /**
   * Delete item from cache
   */
  delete(key: string): Promise<void> | void;

  /**
   * Clear all cache entries
   */
  clear(): Promise<void> | void;

  /**
   * Get all cache keys
   */
  keys(): Promise<string[]> | string[];
}

/**
 * In-memory cache backend (default, no persistence)
 */
export class MemoryCacheBackend implements ICacheBackend {
  private cache: Map<string, CachedData<PriceData>> = new Map();

  get(key: string): CachedData<PriceData> | null {
    return this.cache.get(key) || null;
  }

  set(key: string, value: CachedData<PriceData>): void {
    this.cache.set(key, value);
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}

// ============================================================================
// API Service Class
// ============================================================================

/**
 * Service for Universalis API integration
 * Handles price data fetching with caching and debouncing
 *
 * @example
 * // With default memory cache
 * const apiService = new APIService();
 *
 * // With custom cache backend (e.g., Redis)
 * const redisCache = new RedisCacheBackend(redisClient);
 * const apiService = new APIService(redisCache);
 *
 * // Fetch price data
 * const priceData = await apiService.getPriceData(itemID, worldID, dataCenterID);
 */
export class APIService {
  private cache: ICacheBackend;
  private pendingRequests: Map<string, Promise<PriceData | null>> = new Map();
  private lastRequestTime: number = 0;

  /**
   * Constructor with optional cache backend
   * @param cacheBackend - Cache backend implementation (defaults to memory)
   */
  constructor(cacheBackend?: ICacheBackend) {
    this.cache = cacheBackend || new MemoryCacheBackend();
  }

  // ============================================================================
  // Cache Management
  // ============================================================================

  /**
   * Get price from cache if available and not expired
   * Validates cache version and checksum
   */
  private async getCachedPrice(cacheKey: string): Promise<PriceData | null> {
    const cached = await this.cache.get(cacheKey);

    if (!cached) {
      return null;
    }

    // Check cache version
    if (cached.version && cached.version !== API_CACHE_VERSION) {
      await this.cache.delete(cacheKey);
      return null;
    }

    // Check if cache has expired
    if (Date.now() - cached.timestamp > cached.ttl) {
      await this.cache.delete(cacheKey);
      return null;
    }

    // Validate checksum if present
    if (cached.checksum) {
      const computedChecksum = generateChecksum(cached.data);
      if (computedChecksum !== cached.checksum) {
        console.warn(`Cache corruption detected for key: ${cacheKey}`);
        await this.cache.delete(cacheKey);
        return null;
      }
    }

    return cached.data;
  }

  /**
   * Set price in cache with version and checksum
   */
  private async setCachedPrice(cacheKey: string, data: PriceData): Promise<void> {
    const checksum = generateChecksum(data);
    await this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl: API_CACHE_TTL,
      version: API_CACHE_VERSION,
      checksum,
    });
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    await this.cache.clear();
    console.info('✅ Price cache cleared');
  }

  /**
   * Get cache stats
   */
  async getCacheStats(): Promise<{ size: number; keys: string[] }> {
    const keys = await this.cache.keys();
    return { size: keys.length, keys };
  }

  // ============================================================================
  // API Calls
  // ============================================================================

  /**
   * Fetch price data for a dye from Universalis API
   * Implements caching, debouncing, and retry logic
   */
  async getPriceData(
    itemID: number,
    worldID?: number,
    dataCenterID?: string
  ): Promise<PriceData | null> {
    try {
      // Build cache key
      const cacheKey = this.buildCacheKey(itemID, worldID, dataCenterID);

      // Check cache first
      const cached = await this.getCachedPrice(cacheKey);
      if (cached) {
        console.info(`📦 Price cache hit for item ${itemID}`);
        return cached;
      }

      // Check if request is already pending (deduplication)
      if (this.pendingRequests.has(cacheKey)) {
        console.info(`⏳ Using pending request for item ${itemID}`);
        return await this.pendingRequests.get(cacheKey)!;
      }

      // Create pending request
      const promise = this.fetchPriceData(itemID, worldID, dataCenterID).then(
        async (data) => {
          this.pendingRequests.delete(cacheKey);
          if (data) {
            await this.setCachedPrice(cacheKey, data);
          }
          return data;
        },
        (error) => {
          this.pendingRequests.delete(cacheKey);
          throw error;
        }
      );

      this.pendingRequests.set(cacheKey, promise);
      return await promise;
    } catch (error) {
      console.error('Failed to fetch price data:', error);
      return null;
    }
  }

  /**
   * Internal method to fetch price data from API
   */
  private async fetchPriceData(
    itemID: number,
    worldID?: number,
    dataCenterID?: string
  ): Promise<PriceData | null> {
    // Rate limiting: ensure minimum delay between requests
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;
    if (timeSinceLastRequest < API_RATE_LIMIT_DELAY) {
      await sleep(API_RATE_LIMIT_DELAY - timeSinceLastRequest);
    }

    this.lastRequestTime = Date.now();

    // Build API URL
    const url = this.buildApiUrl(itemID, worldID, dataCenterID);

    try {
      const data = await retry(
        () => this.fetchWithTimeout(url, UNIVERSALIS_API_TIMEOUT),
        UNIVERSALIS_API_RETRY_COUNT,
        UNIVERSALIS_API_RETRY_DELAY
      );

      if (!data) {
        return null;
      }

      // Parse and validate response
      return this.parseApiResponse(data, itemID);
    } catch (error) {
      throw new AppError(
        ErrorCode.API_CALL_FAILED,
        `Failed to fetch price data for item ${itemID}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'warning'
      );
    }
  }

  /**
   * Fetch with timeout and size limits
   */
  private async fetchWithTimeout(
    url: string,
    timeoutMs: number
  ): Promise<{
    results?: Array<{
      itemId: number;
      nq?: {
        minListing?: {
          dc?: { price: number };
          world?: { price: number };
          region?: { price: number };
        };
      };
      hq?: {
        minListing?: {
          dc?: { price: number };
          world?: { price: number };
          region?: { price: number };
        };
      };
    }>;
  }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        throw new Error('Invalid content type: expected application/json');
      }

      // Check content-length header if available
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        const size = parseInt(contentLength, 10);
        if (!isNaN(size) && size > API_MAX_RESPONSE_SIZE) {
          throw new Error(
            `Response too large: ${size} bytes (max: ${API_MAX_RESPONSE_SIZE} bytes)`
          );
        }
      }

      // Read response text and validate size
      const text = await response.text();
      if (text.length > API_MAX_RESPONSE_SIZE) {
        throw new Error(
          `Response too large: ${text.length} bytes (max: ${API_MAX_RESPONSE_SIZE} bytes)`
        );
      }

      // Parse JSON with error handling
      try {
        return JSON.parse(text);
      } catch (parseError) {
        throw new Error(`Invalid JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Parse and validate API response
   */
  private parseApiResponse(
    data: {
      results?: Array<{
        itemId: number;
        nq?: {
          minListing?: {
            dc?: { price: number };
            world?: { price: number };
            region?: { price: number };
          };
        };
        hq?: {
          minListing?: {
            dc?: { price: number };
            world?: { price: number };
            region?: { price: number };
          };
        };
      }>;
    },
    itemID: number
  ): PriceData | null {
    try {
      // Validate response structure
      if (!data || typeof data !== 'object') {
        console.warn(`Invalid API response structure for item ${itemID}`);
        return null;
      }

      // Parse aggregated endpoint response format
      if (!data.results || !Array.isArray(data.results) || data.results.length === 0) {
        console.warn(`No price data available for item ${itemID}`);
        return null;
      }

      const result = data.results[0];
      if (!result || typeof result !== 'object') {
        console.warn(`Invalid result structure for item ${itemID}`);
        return null;
      }

      // Validate itemId type and match
      if (typeof result.itemId !== 'number' || result.itemId !== itemID) {
        console.warn(`Item ID mismatch: expected ${itemID}, got ${result.itemId}`);
        return null;
      }

      // Try to get price from nq.minListing (prefer DC, then world, then region)
      let price: number | null = null;

      if (result.nq?.minListing) {
        // Prefer data center price
        if (result.nq.minListing.dc?.price) {
          price = result.nq.minListing.dc.price;
        }
        // Fall back to world price
        else if (result.nq.minListing.world?.price) {
          price = result.nq.minListing.world.price;
        }
        // Fall back to region price
        else if (result.nq.minListing.region?.price) {
          price = result.nq.minListing.region.price;
        }
      }

      // If no NQ price, try HQ
      if (!price && result.hq?.minListing) {
        if (result.hq.minListing.dc?.price) {
          price = result.hq.minListing.dc.price;
        } else if (result.hq.minListing.world?.price) {
          price = result.hq.minListing.world.price;
        } else if (result.hq.minListing.region?.price) {
          price = result.hq.minListing.region.price;
        }
      }

      if (!price) {
        console.warn(`No price data available for item ${itemID}`);
        return null;
      }

      return {
        itemID,
        currentAverage: Math.round(price),
        currentMinPrice: Math.round(price), // Using same price for all fields
        currentMaxPrice: Math.round(price),
        lastUpdate: Date.now(),
      };
    } catch (error) {
      console.error(`Failed to parse price data for item ${itemID}:`, error);
      return null;
    }
  }

  /**
   * Build API URL for item price query
   */
  private buildApiUrl(itemID: number, _worldID?: number, dataCenterID?: string): string {
    // Universalis API endpoint: /api/v2/aggregated/{dataCenter or worldName}/{itemIDs}
    // Note: worldID parameter reserved for future use (world-specific queries)
    const pathSegment = dataCenterID || 'universal'; // 'universal' gets global average
    return `${UNIVERSALIS_API_BASE}/aggregated/${pathSegment}/${itemID}`;
  }

  /**
   * Build cache key from parameters
   */
  private buildCacheKey(itemID: number, worldID?: number, dataCenterID?: string): string {
    if (dataCenterID) {
      return `${itemID}_${dataCenterID}`;
    }
    if (worldID) {
      return `${itemID}_${worldID}`;
    }
    return `${itemID}_global`;
  }

  // ============================================================================
  // Batch Operations
  // ============================================================================

  /**
   * Fetch prices for multiple items
   */
  async getPricesForItems(itemIDs: number[]): Promise<Map<number, PriceData>> {
    const results = new Map<number, PriceData>();

    for (const itemID of itemIDs) {
      const price = await this.getPriceData(itemID);
      if (price) {
        results.set(itemID, price);
      }
    }

    return results;
  }

  /**
   * Fetch prices for dyes in a specific data center using batch API
   * Makes a single API request for all items instead of N sequential requests
   */
  async getPricesForDataCenter(
    itemIDs: number[],
    dataCenterID: string
  ): Promise<Map<number, PriceData>> {
    const results = new Map<number, PriceData>();

    if (itemIDs.length === 0) {
      return results;
    }

    // Separate cached and uncached items
    const uncachedItemIDs: number[] = [];

    for (const itemID of itemIDs) {
      const cacheKey = this.buildCacheKey(itemID, undefined, dataCenterID);
      const cached = await this.getCachedPrice(cacheKey);
      if (cached) {
        results.set(itemID, cached);
        console.info(`📦 Price cache hit for item ${itemID}`);
      } else {
        uncachedItemIDs.push(itemID);
      }
    }

    // If all items were cached, return early
    if (uncachedItemIDs.length === 0) {
      return results;
    }

    // Fetch uncached items in a single batch request
    try {
      const batchResults = await this.fetchBatchPriceData(uncachedItemIDs, dataCenterID);

      // Cache and add results
      for (const [itemID, priceData] of batchResults) {
        const cacheKey = this.buildCacheKey(itemID, undefined, dataCenterID);
        await this.setCachedPrice(cacheKey, priceData);
        results.set(itemID, priceData);
      }
    } catch (error) {
      console.error('Failed to fetch batch price data:', error);
    }

    return results;
  }

  /**
   * Fetch price data for multiple items in a single batch API call
   */
  private async fetchBatchPriceData(
    itemIDs: number[],
    dataCenterID: string
  ): Promise<Map<number, PriceData>> {
    const results = new Map<number, PriceData>();

    if (itemIDs.length === 0) {
      return results;
    }

    // Rate limiting: ensure minimum delay between requests
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;
    if (timeSinceLastRequest < API_RATE_LIMIT_DELAY) {
      await sleep(API_RATE_LIMIT_DELAY - timeSinceLastRequest);
    }
    this.lastRequestTime = Date.now();

    // Build batch API URL with comma-separated item IDs
    const pathSegment = dataCenterID || 'universal';
    const itemIDsStr = itemIDs.join(',');
    const url = `${UNIVERSALIS_API_BASE}/aggregated/${pathSegment}/${itemIDsStr}`;

    try {
      const data = await retry(
        () => this.fetchWithTimeout(url, UNIVERSALIS_API_TIMEOUT),
        UNIVERSALIS_API_RETRY_COUNT,
        UNIVERSALIS_API_RETRY_DELAY
      );

      if (!data || !data.results || !Array.isArray(data.results)) {
        console.warn('Invalid batch API response');
        return results;
      }

      // Parse each result in the batch response
      for (const result of data.results) {
        if (!result || typeof result !== 'object' || typeof result.itemId !== 'number') {
          continue;
        }

        const itemID = result.itemId;

        // Try to get price from nq.minListing (prefer DC, then world, then region)
        let price: number | null = null;

        if (result.nq?.minListing) {
          if (result.nq.minListing.dc?.price) {
            price = result.nq.minListing.dc.price;
          } else if (result.nq.minListing.world?.price) {
            price = result.nq.minListing.world.price;
          } else if (result.nq.minListing.region?.price) {
            price = result.nq.minListing.region.price;
          }
        }

        // If no NQ price, try HQ
        if (!price && result.hq?.minListing) {
          if (result.hq.minListing.dc?.price) {
            price = result.hq.minListing.dc.price;
          } else if (result.hq.minListing.world?.price) {
            price = result.hq.minListing.world.price;
          } else if (result.hq.minListing.region?.price) {
            price = result.hq.minListing.region.price;
          }
        }

        if (price) {
          results.set(itemID, {
            itemID,
            currentAverage: Math.round(price),
            currentMinPrice: Math.round(price),
            currentMaxPrice: Math.round(price),
            lastUpdate: Date.now(),
          });
        }
      }

      console.info(`📦 Batch fetched prices for ${results.size}/${itemIDs.length} items`);
      return results;
    } catch (error) {
      console.error('Failed to fetch batch price data:', error);
      return results;
    }
  }

  // ============================================================================
  // Health Checks
  // ============================================================================

  /**
   * Check if Universalis API is available
   */
  async isAPIAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${UNIVERSALIS_API_BASE}/data-centers`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get API status information
   */
  async getAPIStatus(): Promise<{ available: boolean; latency: number }> {
    const start = Date.now();

    try {
      const available = await this.isAPIAvailable();
      const latency = Date.now() - start;

      return { available, latency };
    } catch {
      return { available: false, latency: -1 };
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Format price for display (FFXIV Gil format: 69,420G)
   */
  static formatPrice(price: number): string {
    const formattedNumber = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);

    // Return with small "G" suffix
    return `${formattedNumber}G`;
  }

  /**
   * Calculate price trend (simplified)
   */
  static getPriceTrend(
    currentPrice: number,
    previousPrice: number
  ): { trend: 'up' | 'down' | 'stable'; change: number; changePercent: number } {
    const change = currentPrice - previousPrice;
    const changePercent = previousPrice === 0 ? 0 : (change / previousPrice) * 100;

    let trend: 'up' | 'down' | 'stable';
    if (change > previousPrice * 0.05) {
      trend = 'up';
    } else if (change < -previousPrice * 0.05) {
      trend = 'down';
    } else {
      trend = 'stable';
    }

    return { trend, change, changePercent: Math.round(changePercent * 100) / 100 };
  }
}
