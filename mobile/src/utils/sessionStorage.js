// 7-Day Session & Cookie Persistence for OLL School CRM Mobile / Web App

const STORAGE_KEY = 'oll_crm_auth_session';
const DEFAULT_EXPIRY_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// In-memory fallback
let memorySession = null;

// Helper to write cookie in browser environments
function writeCookie(name, value, days) {
  if (typeof document !== 'undefined') {
    try {
      const maxAge = days * 24 * 60 * 60;
      const encoded = encodeURIComponent(value);
      document.cookie = `${name}=${encoded}; max-age=${maxAge}; path=/; SameSite=Lax;`;
    } catch (e) {
      // Cookie writing not supported
    }
  }
}

// Helper to read cookie in browser environments
function readCookie(name) {
  if (typeof document !== 'undefined' && document.cookie) {
    try {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const c = cookies[i].trim();
        if (c.startsWith(`${name}=`)) {
          const raw = c.substring(name.length + 1);
          return decodeURIComponent(raw);
        }
      }
    } catch (e) {
      // Cookie reading error
    }
  }
  return null;
}

// Helper to delete cookie
function deleteCookie(name) {
  if (typeof document !== 'undefined') {
    try {
      document.cookie = `${name}=; max-age=0; path=/; SameSite=Lax;`;
    } catch (e) {
      // Ignore
    }
  }
}

/**
 * Saves authenticated user and token with a 7-day expiration (cookie & local storage)
 * @param {Object} user 
 * @param {string} token 
 * @param {number} days - default 7
 */
export function saveAuthSession(user, token, days = DEFAULT_EXPIRY_DAYS) {
  const expiresAt = Date.now() + days * MS_PER_DAY;
  const sessionData = {
    user,
    token,
    expiresAt,
    savedAt: Date.now(),
  };

  const serialized = JSON.stringify(sessionData);

  // 1. In-memory
  memorySession = sessionData;

  // 2. LocalStorage (Web / Hybrid)
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY, serialized);
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }

  // 3. Document Cookie (7-day max-age)
  writeCookie(STORAGE_KEY, serialized, days);

  return sessionData;
}

/**
 * Retrieves valid authenticated session if within 7 days
 * @returns {{ user: Object, token: string } | null}
 */
export function getAuthSession() {
  let sessionData = null;

  // 1. Try LocalStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        sessionData = JSON.parse(raw);
      }
    } catch (e) {
      // Ignore JSON parse error
    }
  }

  // 2. Fallback to Cookie
  if (!sessionData) {
    const rawCookie = readCookie(STORAGE_KEY);
    if (rawCookie) {
      try {
        sessionData = JSON.parse(rawCookie);
      } catch (e) {
        // Ignore
      }
    }
  }

  // 3. Fallback to in-memory
  if (!sessionData && memorySession) {
    sessionData = memorySession;
  }

  // Validate session and 7-day expiration
  if (sessionData && sessionData.user && sessionData.token) {
    if (sessionData.expiresAt && Date.now() > sessionData.expiresAt) {
      // Expired after 7 days - clean up and require login
      clearAuthSession();
      return null;
    }
    return {
      user: sessionData.user,
      token: sessionData.token,
    };
  }

  return null;
}

/**
 * Clears authenticated session from cookie, storage, and memory
 */
export function clearAuthSession() {
  memorySession = null;

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      // Ignore
    }
  }

  deleteCookie(STORAGE_KEY);
}
