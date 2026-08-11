/**
 * apiConfig.ts
 * Centralized API configuration for the frontend application.
 * Reads environment variables configured in .env (via Vite's import.meta.env).
 */

// Base API URL including /api path (e.g. 'https://api.quanlythi.site/api' or 'http://localhost:3000/api')
export const API_BASE_URL = (
  import.meta.env.VITE_APP_API_URL || 
  import.meta.env.VITE_API_URL || 
  'https://api.quanlythi.site/api'
).replace(/\/$/, '');

// Domain root URL without trailing slash (e.g. 'https://api.quanlythi.site' or 'http://localhost:3000')
export const BASE_URL = (
  import.meta.env.VITE_BASE_URL || 
  API_BASE_URL.replace(/\/api$/, '')
).replace(/\/$/, '');
