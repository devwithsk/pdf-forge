import axios from 'axios';

const getApiBaseUrl = () => {
  let envUrl = import.meta.env.VITE_API_URL;
  
  // Default fallback to backend on port 8000
  if (!envUrl) {
    return 'http://localhost:8000/api';
  }
  
  // If it is already an absolute URL, return it cleaned up
  if (envUrl.startsWith('http://') || envUrl.startsWith('https://')) {
    const cleanUrl = envUrl.replace(/\/+$/, '');
    return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
  }
  
  // If relative path, construct absolute URL against window.location.origin
  if (typeof window !== 'undefined') {
    try {
      const absoluteUrl = new URL(envUrl, window.location.origin).href;
      const cleanUrl = absoluteUrl.replace(/\/+$/, '');
      return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
    } catch (e) {
      console.error('Error constructing absolute URL:', e);
      const cleanEnv = envUrl.startsWith('/') ? envUrl : `/${envUrl}`;
      const cleanUrl = cleanEnv.replace(/\/+$/, '');
      const origin = window.location.origin.replace(/\/+$/, '');
      const combined = `${origin}${cleanUrl}`;
      return combined.endsWith('/api') ? combined : `${combined}/api`;
    }
  }
  
  const cleanUrl = envUrl.replace(/\/+$/, '');
  return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes timeout for large document processing
});

export default api;

