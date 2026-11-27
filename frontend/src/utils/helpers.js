/**
 * Common Helper Functions for OLL Web Application
 */

// Format INR currency
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

// Format date into human-readable string
export const formatDate = (dateString, options = {}) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  }).format(date);
};

// Truncate text with ellipsis
export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Slugify string
export const slugify = (text) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
};

// Get stored admin auth token
export const getAdminToken = () => {
  try {
    return localStorage.getItem('oll_token');
  } catch {
    return null;
  }
};

// Get stored portal student token
export const getPortalToken = () => {
  try {
    return localStorage.getItem('oll_portal_token');
  } catch {
    return null;
  }
};

// Capitalize first letter of every word
export const titleCase = (str) => {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

export default {
  formatCurrency,
  formatDate,
  truncateText,
  slugify,
  getAdminToken,
  getPortalToken,
  titleCase,
};
