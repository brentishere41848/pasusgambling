import bcrypt from 'bcryptjs';
import type express from 'express';
import type { Pool, PoolClient } from 'pg';

type AppRequest = express.Request & {
  auth?: {
    token: string;
    tokenHash: string;
    user: {
      id: number;
      username: string;
      email: string;
      currency: string;
      role: 'owner' | 'moderator' | 'user';
    };
  };
};

type RegisterAuthRoutesOptions = {
  app: express.Express;
  pool: Pool;
  createSession: (client: Pool | PoolClient, user: any, ipAddress?: string, userAgent?: string) => Promise<string>;
  ensureAffiliateCode: (client: Pool | PoolClient, userId: number, username: string) => Promise<string>;
  getDeviceType: (userAgent: string) => string;
  getWallet: (client: Pool | PoolClient, userId: number) => Promise<any>;
  maskIp: (ip: string) => string;
  normalizeAffiliateCode: (value: unknown) => string | null;
  requireAuth: express.RequestHandler;
  sanitizeUser: (row: any) => any;
  sendVerificationEmail: (email: string, username: string, code: string) => Promise<void>;
  sendWelcomeEmail: (email: string, username: string) => Promise<void>;
  verifyTotpCode: (secret: string, code: string) => boolean;
};

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;
const BLOCKED_USERNAME_PARTS = [
  'admin',
  'administrator',
  'mod',
  'moderator',
  'owner',
  'support',
  'staff',
  'pasus',
  'nigger',
  'nigga',
  'faggot',
  'fag',
  'retard',
  'retarded',
  'cunt',
  'whore',
  'slut',
  'bitch',
  'porn',
  'rape',
  'hitler',
  'nazi',
  'downy',
  'downie',
  'downiee',
  'downsyndrome',
  'handicap',
  'handicapped',
  'specialneeds',
  'disabled',
  'cripple',
] as const;

function normalizeUsernameForModeration(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function validateUsername(username: string): string | null {
  if (!USERNAME_PATTERN.test(username)) {
    return 'Username must be 3-20 characters and use only letters, numbers, or underscores.';
  }

  const normalized = normalizeUsernameForModeration(username);
  if (BLOCKED_USERNAME_PARTS.some((part) => normalized.includes(part))) {
    return 'That username is not allowed.';
  }

  return null;
}

function generateEmailVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function registerAuthRoutes({
  app,
  pool,
  createSession,
  ensureAffiliateCode,
  getDeviceType,
  getWallet,
  maskIp,
  normalizeAffiliateCode,
  requireAuth,
  sanitizeUser,
  sendVerificationEmail,
  sendWelcomeEmail,
  verifyTotpCode,
}: RegisterAuthRoutesOptions) {
  app.post('/api/auth/register', async (req, res) => {
    const client = await pool.connect();

    try {
      const username = String(req.body.username || '').trim();
      const email = String(req.body.email || '').trim().toLowerCase();
      const password = String(req.body.password || '');
      const affiliateCode = normalizeAffiliateCode(req.body.affiliateCode);
      const emailOptIn = Boolean(req.body.emailOptIn);

      if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email, and password are required.' });
      }

      const usernameError = validateUsername(username);
      if (usernameError) {
        return res.status(400).json({ error: usernameError });
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'A valid email is required.' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
      }

      await client.query('BEGIN');

      const existing = await client.query(
        'SELECT id FROM users WHERE username = $1 OR email = $2 LIMIT 1',
        [username, email]
      );

      if (existing.rowCount) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Username or email already exists.' });
      }

      let referredByUserId: number | null = null;
      if (affiliateCode) {
        const affiliateResult = await client.query(
          `SELECT user_id
           FROM affiliate_codes
           WHERE code = $1
           LIMIT 1`,
          [affiliateCode]
        );

        if (!affiliateResult.rowCount) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Invalid affiliate code.' });
        }

        referredByUserId = Number(affiliateResult.rows[0].user_id);
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`;
      const verificationCode = generateEmailVerificationCode();
      const verificationExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const userResult = await client.query(
        `INSERT INTO users (username, email, password_hash, avatar, referred_by_user_id, affiliate_code_used, email_opt_in, email_verification_code, email_verification_expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, username, email, currency, avatar, custom_avatar_url, avatar_source, role,
                   roblox_user_id, roblox_username, roblox_display_name, roblox_avatar_url, roblox_verified_at,
                   discord_user_id, discord_username, discord_display_name, discord_avatar_url, discord_verified_at`,
        [username, email, passwordHash, avatar, referredByUserId, affiliateCode || null, emailOptIn, verificationCode, verificationExpiresAt]
      );

      const user = sanitizeUser(userResult.rows[0]);

      await client.query(
        `INSERT INTO wallets (user_id, balance, bonus_balance, total_deposited, total_withdrawn, total_wagered)
         VALUES ($1, 5, 0, 0, 0, 0)`,
        [user.id]
      );

      await ensureAffiliateCode(client, user.id, user.username);

      await client.query('COMMIT');

      sendVerificationEmail(email, username, verificationCode).catch(console.error);
      return res.status(201).json({
        requiresEmailVerification: true,
        email,
        message: 'Account created. Check your email for the verification code.',
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(error);
      return res.status(500).json({ error: 'Failed to register user.' });
    } finally {
      client.release();
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const client = await pool.connect();

    try {
      const username = String(req.body.username || '').trim();
      const password = String(req.body.password || '');
      const totpCode = String(req.body.totpCode || '').trim();

      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
      }

      const result = await client.query(
        `SELECT id, username, email, currency, avatar, custom_avatar_url, avatar_source,
                roblox_user_id, roblox_username, roblox_display_name, roblox_avatar_url, roblox_verified_at,
                discord_user_id, discord_username, discord_display_name, discord_avatar_url, discord_verified_at,
                password_hash, totp_enabled, totp_secret, totp_pending_secret, email_verified_at
         FROM users
         WHERE username = $1
         LIMIT 1`,
        [username]
      );

      if (!result.rowCount) {
        return res.status(401).json({ error: 'Invalid username or password.' });
      }

      const row = result.rows[0];
      const isValid = await bcrypt.compare(password, row.password_hash);

      if (!isValid) {
        return res.status(401).json({ error: 'Invalid username or password.' });
      }

      if (!row.email_verified_at) {
        const verificationCode = generateEmailVerificationCode();
        const verificationExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
        await client.query(
          `UPDATE users
           SET email_verification_code = $2,
               email_verification_expires_at = $3
           WHERE id = $1`,
          [row.id, verificationCode, verificationExpiresAt]
        );
        sendVerificationEmail(String(row.email || ''), String(row.username || ''), verificationCode).catch(console.error);
        return res.status(403).json({
          error: 'Email verification required.',
          requiresEmailVerification: true,
          email: String(row.email || ''),
        });
      }

      if (row.totp_enabled && row.totp_secret) {
        if (!totpCode) {
          return res.status(403).json({ error: '2FA code required.', requiresTotp: true });
        }
        if (!verifyTotpCode(row.totp_secret, totpCode)) {
          return res.status(401).json({ error: 'Invalid 2FA code.' });
        }
      } else if (row.totp_pending_secret) {
        if (!totpCode) {
          return res.status(403).json({ error: '2FA code required.', requiresTotp: true });
        }
        if (!verifyTotpCode(row.totp_pending_secret, totpCode)) {
          return res.status(401).json({ error: 'Invalid 2FA code.' });
        }
      }

      const user = sanitizeUser(row);
      const ipAddress = String(req.ip || req.socket.remoteAddress || '');
      const userAgent = String(req.headers['user-agent'] || '');

      await client.query('BEGIN');
      const token = await createSession(client, user, ipAddress, userAgent);
      const wallet = await getWallet(client, user.id);
      await client.query('COMMIT');

      return res.json({ user, token, wallet });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(error);
      return res.status(500).json({ error: 'Failed to log in.' });
    } finally {
      client.release();
    }
  });

  app.post('/api/auth/verify-email', async (req, res) => {
    const client = await pool.connect();

    try {
      const email = String(req.body.email || '').trim().toLowerCase();
      const code = String(req.body.code || '').trim();

      if (!email || !code) {
        return res.status(400).json({ error: 'Email and verification code are required.' });
      }

      await client.query('BEGIN');
      const result = await client.query(
        `SELECT id, username, email, currency, avatar, custom_avatar_url, avatar_source, role,
                roblox_user_id, roblox_username, roblox_display_name, roblox_avatar_url, roblox_verified_at,
                discord_user_id, discord_username, discord_display_name, discord_avatar_url, discord_verified_at,
                email_verified_at, email_verification_code, email_verification_expires_at, email_opt_in
         FROM users
         WHERE email = $1
         LIMIT 1`,
        [email]
      );

      if (!result.rowCount) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Account not found.' });
      }

      const row = result.rows[0];
      if (row.email_verified_at) {
        const user = sanitizeUser(row);
        const token = await createSession(client, user);
        const wallet = await getWallet(client, user.id);
        await client.query('COMMIT');
        return res.json({ user, token, wallet });
      }

      if (!row.email_verification_code || row.email_verification_code !== code) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Invalid verification code.' });
      }

      if (!row.email_verification_expires_at || new Date(row.email_verification_expires_at).getTime() < Date.now()) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Verification code expired. Request a new one.' });
      }

      const verifiedResult = await client.query(
        `UPDATE users
         SET email_verified_at = NOW(),
             email_verification_code = NULL,
             email_verification_expires_at = NULL
         WHERE id = $1
         RETURNING id, username, email, currency, avatar, custom_avatar_url, avatar_source, role,
                   roblox_user_id, roblox_username, roblox_display_name, roblox_avatar_url, roblox_verified_at,
                   discord_user_id, discord_username, discord_display_name, discord_avatar_url, discord_verified_at`,
        [row.id]
      );

      const user = sanitizeUser(verifiedResult.rows[0]);
      const token = await createSession(client, user);
      const wallet = await getWallet(client, user.id);
      await client.query('COMMIT');

      if (row.email_opt_in) {
        sendWelcomeEmail(String(row.email || ''), String(row.username || '')).catch(console.error);
      }

      return res.json({ user, token, wallet });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(error);
      return res.status(500).json({ error: 'Failed to verify email.' });
    } finally {
      client.release();
    }
  });

  app.post('/api/auth/resend-verification', async (req, res) => {
    try {
      const email = String(req.body.email || '').trim().toLowerCase();
      if (!email) {
        return res.status(400).json({ error: 'Email is required.' });
      }

      const result = await pool.query(
        `SELECT id, username, email, email_verified_at
         FROM users
         WHERE email = $1
         LIMIT 1`,
        [email]
      );

      if (!result.rowCount) {
        return res.status(404).json({ error: 'Account not found.' });
      }

      const row = result.rows[0];
      if (row.email_verified_at) {
        return res.status(400).json({ error: 'Email is already verified.' });
      }

      const verificationCode = generateEmailVerificationCode();
      const verificationExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await pool.query(
        `UPDATE users
         SET email_verification_code = $2,
             email_verification_expires_at = $3
         WHERE id = $1`,
        [row.id, verificationCode, verificationExpiresAt]
      );

      sendVerificationEmail(String(row.email || ''), String(row.username || ''), verificationCode).catch(console.error);
      return res.json({ ok: true, message: 'Verification code resent.' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to resend verification email.' });
    }
  });

  app.get('/api/auth/me', requireAuth, async (req: AppRequest, res) => {
    try {
      const user = req.auth!.user;
      const wallet = await getWallet(pool, user.id);
      return res.json({ user, wallet });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to load user.' });
    }
  });

  app.post('/api/auth/logout', requireAuth, async (req: AppRequest, res) => {
    try {
      await pool.query(
        `DELETE FROM user_sessions
         WHERE user_id = $1 AND token_hash = $2`,
        [req.auth!.user.id, req.auth!.tokenHash]
      );

      return res.status(204).send();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to log out.' });
    }
  });

  app.get('/api/sessions', requireAuth, async (req: AppRequest, res) => {
    try {
      const result = await pool.query(
        `SELECT id, token_hash, ip_address, user_agent, created_at, last_active_at, expires_at
         FROM user_sessions
         WHERE user_id = $1 AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY last_active_at DESC`,
        [req.auth!.user.id]
      );

      const sessions = result.rows.map((row) => ({
        id: Number(row.id),
        ipAddress: maskIp(row.ip_address || 'Unknown'),
        deviceType: getDeviceType(row.user_agent || ''),
        userAgent: row.user_agent,
        createdAt: row.created_at,
        lastActiveAt: row.last_active_at,
        expiresAt: row.expires_at,
        isCurrent: row.token_hash === req.auth!.tokenHash,
      }));

      const currentSessionId = result.rows.find((row) => row.token_hash === req.auth!.tokenHash)?.id || null;

      return res.json({ sessions, currentSessionId });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to load sessions.' });
    }
  });

  app.delete('/api/sessions/:id', requireAuth, async (req: AppRequest, res) => {
    try {
      const sessionId = Number(req.params.id);
      if (!sessionId) {
        return res.status(400).json({ error: 'Invalid session ID.' });
      }

      const result = await pool.query(
        `SELECT id, token_hash FROM user_sessions WHERE id = $1 AND user_id = $2 LIMIT 1`,
        [sessionId, req.auth!.user.id]
      );

      if (!result.rowCount) {
        return res.status(404).json({ error: 'Session not found.' });
      }

      if (result.rows[0].token_hash === req.auth!.tokenHash) {
        return res.status(400).json({ error: 'Cannot revoke current session. Use logout instead.' });
      }

      await pool.query(`DELETE FROM user_sessions WHERE id = $1`, [sessionId]);

      return res.status(204).send();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to revoke session.' });
    }
  });

  app.delete('/api/sessions', requireAuth, async (req: AppRequest, res) => {
    try {
      await pool.query(
        `DELETE FROM user_sessions
         WHERE user_id = $1 AND token_hash != $2`,
        [req.auth!.user.id, req.auth!.tokenHash]
      );

      return res.status(204).send();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to revoke sessions.' });
    }
  });
}
