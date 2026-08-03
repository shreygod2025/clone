import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const verifyAttempted = useRef(false);

  const verifyToken = useCallback(async (token) => {
    // Prevent multiple verification attempts
    if (verifyAttempted.current) return;
    verifyAttempted.current = true;
    
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000 // 10 second timeout
      });
      setUser(response.data);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Token verification failed:', error?.response?.status, error?.message);
      
      // Only remove token on explicit auth failures (401, 403)
      // Don't log out on network errors or server errors
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        localStorage.removeItem('oll_token');
        setUser(null);
        setIsAuthenticated(false);
      } else {
        // For network errors or server issues, keep the token but mark as not authenticated
        // This prevents logout loops on temporary network issues
        console.warn('Auth check failed due to network/server issue, keeping token');
        // Try to use cached user data if available
        const cachedUser = localStorage.getItem('oll_user');
        if (cachedUser) {
          try {
            setUser(JSON.parse(cachedUser));
            setIsAuthenticated(true);
          } catch (e) {
            setUser(null);
            setIsAuthenticated(false);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('oll_token');
    if (token) {
      verifyToken(token);
    } else {
      setLoading(false);
    }
  }, [verifyToken]);

  // Re-fetch permissions when the tab regains focus so a role assignment
  // (or permission change) made by an admin becomes visible to the user
  // without them having to log out and back in. Cheap: a single /auth/me
  // call debounced by the browser's visibility change event.
  useEffect(() => {
    const onFocus = async () => {
      const token = localStorage.getItem('oll_token');
      if (!token) return;
      try {
        const r = await axios.get(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        });
        setUser(r.data);
        localStorage.setItem('oll_user', JSON.stringify(r.data));
        setIsAuthenticated(true);
      } catch { /* keep old session on transient errors */ }
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') onFocus();
    });
    return () => {
      window.removeEventListener('focus', onFocus);
      // (visibilitychange listener persists but is idempotent)
    };
  }, []);

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    const { access_token, user: userData } = response.data;
    localStorage.setItem('oll_token', access_token);
    // Fetch enriched profile (adds is_manager, etc.) — falls back to login payload if it fails
    let fullUser = userData;
    try {
      const meRes = await axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${access_token}` } });
      fullUser = meRes.data;
    } catch (_) { /* fall back to login payload */ }
    localStorage.setItem('oll_user', JSON.stringify(fullUser));
    setUser(fullUser);
    setIsAuthenticated(true);
    verifyAttempted.current = false; // Reset for future verifications
    return fullUser;
  };

  const register = async (email, password, name) => {
    const response = await axios.post(`${API}/auth/register`, { email, password, name });
    const { access_token, user: userData } = response.data;
    localStorage.setItem('oll_token', access_token);
    localStorage.setItem('oll_user', JSON.stringify(userData)); // Cache user data
    setUser(userData);
    setIsAuthenticated(true);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('oll_token');
    localStorage.removeItem('oll_user');
    setUser(null);
    setIsAuthenticated(false);
    verifyAttempted.current = false;
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('oll_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isAuthenticated, 
      login, 
      register, 
      logout,
      getAuthHeaders 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
