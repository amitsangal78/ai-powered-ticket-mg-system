/**
 * API client scaffold (Wave 5).
 * Base URL: import.meta.env.VITE_API_URL
 * Attach Bearer from authStore; Zod-parse responses; 401 → clear + /login.
 */
export function getApiBaseUrl(): string {
  const url = import.meta.env.VITE_API_URL;
  if (typeof url !== 'string' || url.length === 0) {
    throw new Error('VITE_API_URL is not configured');
  }
  return url.replace(/\/$/, '');
}
