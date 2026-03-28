const configuredApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
const productionApiFallback =
  typeof window !== 'undefined' && window.location.hostname === 'www.pasus.xyz'
    ? 'https://pasusgambling.onrender.com'
    : '';
const apiBaseUrl =
  typeof window !== 'undefined' &&
  window.location.hostname === 'www.pasus.xyz' &&
  configuredApiBaseUrl === 'https://api.pasus.xyz'
    ? productionApiFallback
    : configuredApiBaseUrl || productionApiFallback;

export function apiUrl(path: string) {
  if (!path.startsWith('/')) {
    return path;
  }

  return apiBaseUrl ? `${apiBaseUrl}${path}` : path;
}

export function apiFetch(input: string, init?: RequestInit) {
  const timeoutMs = Number(import.meta.env.VITE_API_TIMEOUT_MS || 15000);
  const controller = new AbortController();
  const upstreamSignal = init?.signal;

  if (upstreamSignal) {
    if (upstreamSignal.aborted) {
      controller.abort((upstreamSignal as AbortSignal & { reason?: unknown }).reason);
    } else {
      upstreamSignal.addEventListener(
        'abort',
        () => controller.abort((upstreamSignal as AbortSignal & { reason?: unknown }).reason),
        { once: true }
      );
    }
  }

  const timeoutId = window.setTimeout(() => {
    controller.abort(new Error('Request timeout'));
  }, Math.max(1000, timeoutMs));

  return fetch(apiUrl(input), {
    credentials: 'include',
    ...init,
    signal: controller.signal,
  }).finally(() => {
    window.clearTimeout(timeoutId);
  });
}
