const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
const productionApiFallback =
  typeof window !== 'undefined' && window.location.hostname === 'www.pasus.xyz'
    ? 'https://pasusgambling.onrender.com'
    : '';
const apiBaseUrl = configuredApiBaseUrl || productionApiFallback;

export function apiUrl(path: string) {
  if (!path.startsWith('/')) {
    return path;
  }

  return apiBaseUrl ? `${apiBaseUrl}${path}` : path;
}

export function apiFetch(input: string, init?: RequestInit) {
  return fetch(apiUrl(input), init);
}
