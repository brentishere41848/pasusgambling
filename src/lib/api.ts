const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');

export function apiUrl(path: string) {
  if (!path.startsWith('/')) {
    return path;
  }

  return apiBaseUrl ? `${apiBaseUrl}${path}` : path;
}

export function apiFetch(input: string, init?: RequestInit) {
  return fetch(apiUrl(input), init);
}
