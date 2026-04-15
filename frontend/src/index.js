import React from "react";
import ReactDOM from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import axios from "axios";
import "./index.css";
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

    if (error.response?.status === 401) {
      const errorDetail = (error.response?.data?.detail || '').toLowerCase();
      const currentPath = window.location.pathname;
      const alreadyOnLogin = currentPath.includes('/login') || currentPath.includes('/admin/login');

      // Redirect to login when token is explicitly expired or invalid
      if (!alreadyOnLogin && (errorDetail.includes('expired') || errorDetail.includes('invalid') || errorDetail.includes('not authenticated'))) {
        localStorage.removeItem('oll_token');
        localStorage.removeItem('oll_user');
        const isAdmin = currentPath.startsWith('/admin');
        window.location.href = isAdmin ? '/admin/login?reason=session_expired' : '/login?reason=session_expired';
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
