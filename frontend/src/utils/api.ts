import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Create axios instance with better timeout and error handling
const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000, // Increased timeout for server warmup scenarios
  headers: {
    'Content-Type': 'application/json',
  },
});

// Enhanced request deduplication to prevent identical simultaneous requests
const activeRequests = new Map(); // Track active requests with timestamps
const requestCompletionPromises = new Map(); // Track ongoing requests

// Request interceptor to add auth token and prevent duplicate requests
api.interceptors.request.use(
  (config) => {
    // Add auth token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Enhanced deduplication for GET requests only
    if (config.method === 'get') {
      const requestKey = `${config.method}:${config.url}:${JSON.stringify(config.params)}`;
      const now = Date.now();
      
      // Clean up old requests (older than 30 seconds)
      for (const [key, timestamp] of activeRequests.entries()) {
        if (now - timestamp > 30000) {
          activeRequests.delete(key);
          requestCompletionPromises.delete(key);
        }
      }
      
      // Check if exact same request is already in progress
      const existingTimestamp = activeRequests.get(requestKey);
      if (existingTimestamp && (now - existingTimestamp < 5000)) { // Increased to 5 seconds
        // Return the existing promise instead of blocking
        const existingPromise = requestCompletionPromises.get(requestKey);
        if (existingPromise) {
          // Reusing existing request
          return existingPromise;
        }
      }
      
      // Mark request as active with timestamp
      activeRequests.set(requestKey, now);
      
      // Store request key for cleanup in response interceptor
      (config as any).requestKey = requestKey;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors and network issues
api.interceptors.response.use(
  (response) => {
    // Clean up active request tracking
    const requestKey = (response.config as any).requestKey;
    if (requestKey) {
      activeRequests.delete(requestKey);
      requestCompletionPromises.delete(requestKey);
    }
    return response;
  },
  (error) => {
    // Clean up active request tracking on error
    const requestKey = (error.config as any)?.requestKey;
    if (requestKey) {
      activeRequests.delete(requestKey);
      requestCompletionPromises.delete(requestKey);
    }
    
    // Enhanced error handling for server warmup scenarios
    if (error.code === 'ECONNABORTED') {
      if (error.config?.timeout && error.config.timeout >= 20000) {
        error.message = 'Server is starting up, please wait a moment and try again.';
      } else {
        error.message = 'Request timed out. Please check your connection.';
      }
    } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
      error.message = 'Server is currently starting up. Please wait a moment and try again.';
    } else if (error.message === 'Duplicate request blocked') {
      // Silently ignore duplicate requests
      return Promise.reject(error);
    }
    
    // Handle auth errors
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // Only redirect if we're not already on login/register pages
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
    }
    
    // Handle server errors gracefully
    if (error.response?.status >= 500) {
      error.message = 'Server is experiencing issues. Please try again later.';
    } else if (error.response?.status === 503) {
      error.message = 'Server is temporarily unavailable. It may be starting up.';
    } else if (error.response?.status === 502 || error.response?.status === 504) {
      error.message = 'Server is starting up. Please wait a moment and try again.';
    }
    
    return Promise.reject(error);
  }
);

export default api;
