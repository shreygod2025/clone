import React from "react";
import ReactDOM from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import axios from "axios";
import "@/index.css";
import App from "@/App";

// Global axios configuration
axios.defaults.timeout = 30000; // 30 second timeout

// Global axios interceptor for handling auth errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log errors for debugging
    if (error.response) {
      console.error(`API Error: ${error.response.status} - ${error.config?.url}`);
    } else if (error.request) {
      console.error('Network Error:', error.message);
    }
    
    // Only redirect to login on explicit 401 from auth endpoints
    // This prevents logout loops on other API failures
    if (error.response?.status === 401) {
      const isAuthEndpoint = error.config?.url?.includes('/auth/');
      const currentPath = window.location.pathname;
      
      // Don't redirect if already on login page or if it's a non-auth endpoint
      if (!currentPath.includes('/login') && !currentPath.includes('/admin/login')) {
        // Only clear token on explicit auth endpoint failures
        if (isAuthEndpoint) {
          console.warn('Auth token invalid, clearing...');
          localStorage.removeItem('oll_token');
          localStorage.removeItem('oll_user');
        }
      }
    }
    
    return Promise.reject(error);
  }
);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>,
);
