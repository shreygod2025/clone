import axios from 'axios';
import { setupAxiosCache, clearCache } from '../utils/apiCache';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

export const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Setup in-memory query caching & auto-invalidation
setupAxiosCache(api);

// Request interceptor: Automatically attach token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('oll_token');
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const portalToken = localStorage.getItem('oll_portal_token');
    if (portalToken && !config.headers['X-Portal-Token']) {
      config.headers['X-Portal-Token'] = portalToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Uniform error handling & 401 handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token only if on an admin protected call
      if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
        localStorage.removeItem('oll_token');
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
