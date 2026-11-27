/**
 * Central Client-Side API Caching Layer
 * 
 * Provides an in-memory stale-while-revalidate / TTL query cache for API GET requests.
 * Eliminates repeated full-page loading screens and unnecessary network refetching
 * when users switch between pages in the web admin.
 *
 * Features:
 * 1. Automatic transparent caching for GET requests via Axios interceptor.
 * 2. Instant cache retrieval for component state initialization (0ms mount time).
 * 3. Automatic cache invalidation on mutations (POST, PUT, DELETE, PATCH).
 * 4. Safe deep-cloning to prevent in-memory reference mutation leaks.
 * 5. Bypasses for file downloads (blobs), auth endpoints, and explicit cache-bust requests.
 */

const cache = new Map();

// Default cache TTL: 5 minutes (300,000 ms)
export const DEFAULT_CACHE_TTL = 5 * 60 * 1000;

// Endpoints that should NEVER be cached
const UNCACHEABLE_PATTERNS = [
  /\/auth\/login/i,
  /\/auth\/verify-otp/i,
  /\/auth\/send-otp/i,
  /\/auth\/logout/i,
  /\/auth\/me/i,
  /\/ai-chat\/stream/i,
  /\/faq-chat/i,
  /\/health/i,
  /\/proxy\/file/i,
];

/**
 * Safely deep-clone data to avoid shared reference mutations between callers.
 */
function safeClone(data) {
  if (data === undefined || data === null) return data;
  if (typeof data !== 'object') return data;
  try {
    if (typeof structuredClone === 'function') {
      return structuredClone(data);
    }
  } catch (e) {
    // Fall back to JSON serialization for non-cloneable objects
  }
  try {
    return JSON.parse(JSON.stringify(data));
  } catch (err) {
    return data;
  }
}

/**
 * Normalize raw URL and parameters into a canonical cache key.
 * Strips origin (http://localhost:8001, etc.) and ensures consistent /api prefix.
 * Sorts query parameters deterministically.
 */
export function normalizeCacheKey(rawUrl, params = null) {
  if (!rawUrl) return '';
  let str = String(rawUrl);

  // Strip protocol and origin host if present
  str = str.replace(/^https?:\/\/[^/]+/i, '');

  // Ensure standard leading slash
  if (!str.startsWith('/')) str = '/' + str;

  // Normalize /api prefix so /school-expenses and /api/school-expenses produce the same key
  if (!str.startsWith('/api/') && str !== '/api') {
    str = '/api' + (str.startsWith('/') ? str : '/' + str);
  }

  // Parse path and query string
  let [path, queryString] = str.split('?');
  const urlParams = new URLSearchParams(queryString || '');

  // Merge any query params object passed
  if (params) {
    if (params instanceof URLSearchParams) {
      params.forEach((v, k) => {
        if (v !== undefined && v !== null && v !== '') urlParams.set(k, v);
      });
    } else if (typeof params === 'object') {
      Object.keys(params).sort().forEach(k => {
        const val = params[k];
        if (val !== undefined && val !== null && val !== '') {
          urlParams.set(k, String(val));
        }
      });
    }
  }

  // Sort query parameters and filter out cache-busting tokens
  const sortedKeys = Array.from(urlParams.keys()).sort();
  const sortedPairs = [];
  sortedKeys.forEach(k => {
    // Skip transient cache-busting params
    if (k === '_t' || k === '_refresh' || k === 'timestamp' || k === 'cb') return;
    urlParams.getAll(k).sort().forEach(v => {
      sortedPairs.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
    });
  });

  return sortedPairs.length > 0 ? `${path}?${sortedPairs.join('&')}` : path;
}

/**
 * Store data in the client-side cache.
 * @param {string} rawUrl - API URL or endpoint
 * @param {any} data - Response data to cache
 * @param {number} ttl - TTL in milliseconds (default: 5 minutes)
 * @param {object} params - Optional query params
 */
export function setCachedData(rawUrl, data, ttl = DEFAULT_CACHE_TTL, params = null) {
  const key = normalizeCacheKey(rawUrl, params);
  if (!key) return;

  cache.set(key, {
    data: safeClone(data),
    timestamp: Date.now(),
    ttl: typeof ttl === 'number' && ttl > 0 ? ttl : DEFAULT_CACHE_TTL,
  });
}

/**
 * Retrieve cached data if present and not expired.
 * @param {string} rawUrl - API URL or endpoint
 * @param {object} params - Optional query params
 * @returns {any|undefined} - Cached response data or undefined if expired/missing
 */
export function getCachedData(rawUrl, params = null) {
  const key = normalizeCacheKey(rawUrl, params);
  if (!key) return undefined;

  const entry = cache.get(key);
  if (!entry) return undefined;

  // Check TTL expiration
  if (Date.now() - entry.timestamp > entry.ttl) {
    cache.delete(key);
    return undefined;
  }

  return safeClone(entry.data);
}

/**
 * Check whether a valid, non-expired cache entry exists.
 * @param {string} rawUrl - API URL or endpoint
 * @param {object} params - Optional query params
 * @returns {boolean}
 */
export function hasCachedData(rawUrl, params = null) {
  return getCachedData(rawUrl, params) !== undefined;
}

/**
 * Invalidate cache entries matching a string or RegExp pattern.
 * If given a string like '/school-expenses' or 'orders', any cache key containing
 * that substring is deleted.
 * @param {string|RegExp|Array<string|RegExp>} pattern
 */
export function invalidateCache(pattern) {
  if (!pattern) return;

  if (Array.isArray(pattern)) {
    pattern.forEach(p => invalidateCache(p));
    return;
  }

  if (pattern instanceof RegExp) {
    for (const key of Array.from(cache.keys())) {
      if (pattern.test(key)) {
        cache.delete(key);
      }
    }
    return;
  }

  // String pattern: clean leading /api/ or origin
  let normalizedPattern = String(pattern).replace(/^https?:\/\/[^/]+/i, '');
  normalizedPattern = normalizedPattern.replace(/^\/api\/?/, '');

  for (const key of Array.from(cache.keys())) {
    if (key.includes(normalizedPattern)) {
      cache.delete(key);
    }
  }
}

/**
 * Clear the entire in-memory cache (e.g. on user logout).
 */
export function clearCache() {
  cache.clear();
}

/**
 * Get current cache size (for debugging).
 */
export function getCacheSize() {
  return cache.size;
}

/**
 * Wire transparent caching into an Axios instance.
 * - Caches successful GET requests in-memory.
 * - Resolves GET requests directly from cache if fresh (zero network latency).
 * - Automatically invalidates related cache entries on POST, PUT, DELETE, PATCH.
 * - Bypasses cache when skipCache / no-cache / blob responseType is requested.
 *
 * @param {import('axios').AxiosInstance} axiosInstance
 */
export function setupAxiosCache(axiosInstance) {
  if (!axiosInstance || !axiosInstance.interceptors) return;

  // Request interceptor: Serve fresh cached responses immediately
  axiosInstance.interceptors.request.use((config) => {
    const method = (config.method || 'get').toLowerCase();

    // Only GET requests participate in reading from cache
    if (method === 'get') {
      const skipCache = 
        config.skipCache === true ||
        config.headers?.['Cache-Control'] === 'no-cache' ||
        config.headers?.['x-refresh'] === 'true' ||
        Boolean(config.params?._refresh) ||
        (config.responseType && !['json', 'text', ''].includes(config.responseType));

      const isUncacheable = UNCACHEABLE_PATTERNS.some(p => p.test(config.url || ''));

      if (!skipCache && !isUncacheable) {
        const key = normalizeCacheKey(config.url, config.params);
        if (hasCachedData(key)) {
          // Serve from memory cache without triggering a network request
          config.adapter = () => Promise.resolve({
            data: getCachedData(key),
            status: 200,
            statusText: 'OK (from cache)',
            headers: { 'x-cache': 'HIT' },
            config,
            request: {},
          });
        }
      }
    }

    return config;
  }, (error) => Promise.reject(error));

  // Response interceptor: Cache GET results & auto-invalidate on mutations
  axiosInstance.interceptors.response.use(
    (response) => {
      const config = response.config || {};
      const method = (config.method || 'get').toLowerCase();

      if (method === 'get') {
        const isFromCache = response.headers?.['x-cache'] === 'HIT';
        const skipCache = config.skipCache === true || config.headers?.['Cache-Control'] === 'no-cache';
        const isUncacheable = UNCACHEABLE_PATTERNS.some(p => p.test(config.url || ''));

        if (!isFromCache && !skipCache && !isUncacheable && response.status >= 200 && response.status < 300) {
          const key = normalizeCacheKey(config.url, config.params);
          setCachedData(key, response.data);
        }
      } else if (['post', 'put', 'delete', 'patch'].includes(method)) {
        // Auto-invalidate based on path of mutation
        const rawPath = String(config.url || '')
          .replace(/^https?:\/\/[^/]+/i, '')
          .replace(/^\/api\/?/, '');
        const baseResource = rawPath.split('/')[0].split('?')[0];
        if (baseResource) {
          invalidateCache(baseResource);
        }
      }

      return response;
    },
    (error) => Promise.reject(error)
  );
}

export default {
  DEFAULT_CACHE_TTL,
  normalizeCacheKey,
  setCachedData,
  getCachedData,
  hasCachedData,
  invalidateCache,
  clearCache,
  getCacheSize,
  setupAxiosCache,
};
