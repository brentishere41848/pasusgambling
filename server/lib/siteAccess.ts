import crypto from 'node:crypto';
import type express from 'express';

type SiteAccessConfig = {
  appBaseUrl: string;
  cookieName: string;
  jwtSecret: string;
  username: string;
};

export function parseCookies(req: express.Request) {
  const header = req.headers.cookie;
  if (!header) {
    return {};
  }

  return header.split(';').reduce<Record<string, string>>((acc, entry) => {
    const [rawKey, ...rawValue] = entry.trim().split('=');
    if (!rawKey) {
      return acc;
    }

    acc[rawKey] = decodeURIComponent(rawValue.join('=') || '');
    return acc;
  }, {});
}

export function getSiteAccessCookieValue(config: SiteAccessConfig) {
  const signature = crypto
    .createHmac('sha256', config.jwtSecret)
    .update(`${config.username}:site-access`)
    .digest('hex');
  return `granted.${signature}`;
}

export function hasSiteAccess(req: express.Request, config: SiteAccessConfig) {
  const cookies = parseCookies(req);
  return cookies[config.cookieName] === getSiteAccessCookieValue(config);
}

export function setSiteAccessCookie(req: express.Request, res: express.Response, config: SiteAccessConfig) {
  const isSecure =
    req.secure ||
    req.headers['x-forwarded-proto'] === 'https' ||
    config.appBaseUrl.startsWith('https://');
  const sameSite = isSecure ? 'None' : 'Lax';
  const parts = [
    `${config.cookieName}=${encodeURIComponent(getSiteAccessCookieValue(config))}`,
    'Path=/',
    'HttpOnly',
    `SameSite=${sameSite}`,
    'Max-Age=2592000',
  ];

  if (isSecure) {
    parts.push('Secure');
  }

  res.setHeader('Set-Cookie', parts.join('; '));
}
