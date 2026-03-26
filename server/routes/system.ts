import type express from 'express';
import { hasSiteAccess, setSiteAccessCookie } from '../lib/siteAccess.ts';

type RegisterSystemRoutesOptions = {
  app: express.Express;
  appBaseUrl: string;
  cookieName: string;
  jwtSecret: string;
  siteAccessPassword: string;
  siteAccessUsername: string;
};

export function registerSystemRoutes({
  app,
  appBaseUrl,
  cookieName,
  jwtSecret,
  siteAccessPassword,
  siteAccessUsername,
}: RegisterSystemRoutesOptions) {
  const siteAccessConfig = {
    appBaseUrl,
    cookieName,
    jwtSecret,
    username: siteAccessUsername,
  };

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'pasus-api' });
  });

  app.get('/api/site-access/status', (req, res) => {
    res.json({ authenticated: hasSiteAccess(req, siteAccessConfig) });
  });

  app.post('/api/site-access/login', (req, res) => {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');

    if (username !== siteAccessUsername || password !== siteAccessPassword) {
      return res.status(401).json({ error: 'Invalid early access credentials.' });
    }

    setSiteAccessCookie(req, res, siteAccessConfig);
    return res.json({ authenticated: true });
  });
}
