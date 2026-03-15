import crypto from 'crypto';
import dotenv from 'dotenv';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool, PoolClient } from 'pg';

dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3001);
const databaseUrl = process.env.DATABASE_URL;
const jwtSecret = process.env.JWT_SECRET || 'pasus-dev-secret-change-me';
const nowPaymentsApiKey = process.env.NOWPAYMENTS_API_KEY;
const nowPaymentsIpnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
const nowPaymentsBaseUrl = process.env.NOWPAYMENTS_BASE_URL || 'https://api.nowpayments.io/v1';
const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

app.use(express.json({
  verify: (req, _res, buf) => {
    (req as express.Request & { rawBody?: string }).rawBody = buf.toString('utf8');
  },
}));

type AuthUser = {
  id: number;
  username: string;
  email: string;
  currency: string;
  avatar?: string;
  role: 'owner' | 'moderator' | 'user';
  robloxUserId?: number;
  robloxUsername?: string;
  robloxDisplayName?: string;
  robloxAvatarUrl?: string;
  robloxVerifiedAt?: string;
};

type Wallet = {
  balance: number;
  totalDeposited: number;
  totalWithdrawn: number;
};

type PaymentTransaction = {
  id: number;
  paymentId: string | null;
  orderId: string;
  paymentStatus: string;
  payAddress: string | null;
  payAmount: string | null;
  payCurrency: string | null;
  priceAmount: number;
  priceCurrency: string;
  outcomeAmount: number;
  outcomeCurrency: string | null;
  invoiceUrl: string | null;
};

type BetActivity = {
  id: number;
  gameKey: string;
  username: string;
  wager: number;
  payout: number;
  multiplier: number;
  outcome: string;
  createdAt: string;
};

type ChatMessage = {
  id: number;
  username: string;
  text: string;
  tone: string;
  role: 'owner' | 'moderator' | 'user';
  avatarUrl?: string;
  createdAt: string;
};

type RainRoundState = {
  id: number;
  poolAmount: number;
  startsAt: string;
  joinOpensAt: string;
  endsAt: string;
  participantCount: number;
  joined: boolean;
  hasEnded: boolean;
};

type RawBodyRequest = express.Request & { rawBody?: string };

type AuthedRequest = RawBodyRequest & {
  auth?: {
    token: string;
    user: AuthUser;
  };
};

function signToken(user: AuthUser) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      currency: user.currency,
      avatar: user.avatar,
      role: user.role,
    },
    jwtSecret,
    { expiresIn: '30d' }
  );
}

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function sanitizeUser(row: any): AuthUser {
  return {
    id: Number(row.id),
    username: row.username,
    email: row.email,
    currency: row.currency || 'USD',
    avatar: row.avatar || undefined,
    role: normalizeUserRole(row.role),
    robloxUserId: row.roblox_user_id ? Number(row.roblox_user_id) : undefined,
    robloxUsername: row.roblox_username || undefined,
    robloxDisplayName: row.roblox_display_name || undefined,
    robloxAvatarUrl: row.roblox_avatar_url || undefined,
    robloxVerifiedAt: row.roblox_verified_at || undefined,
  };
}

function normalizeUserRole(value: unknown): 'owner' | 'moderator' | 'user' {
  const role = String(value || 'user').trim().toLowerCase();
  if (role === 'owner' || role === 'moderator') {
    return role;
  }
  return 'user';
}

function sanitizeWallet(row: any): Wallet {
  return {
    balance: Number(row.balance || 0),
    totalDeposited: Number(row.total_deposited || 0),
    totalWithdrawn: Number(row.total_withdrawn || 0),
  };
}

function normalizeCoins(value: unknown) {
  const amount = Math.round(Number(value || 0));
  return Number.isFinite(amount) ? amount : 0;
}

function normalizeFiatAmount(value: unknown) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }
  return Math.round(amount * 100) / 100;
}

function nowPaymentsHeaders() {
  if (!nowPaymentsApiKey) {
    throw new Error('NOWPAYMENTS_API_KEY is required');
  }

  return {
    'x-api-key': nowPaymentsApiKey,
    'Content-Type': 'application/json',
  };
}

function buildIpnSignature(body: string) {
  if (!nowPaymentsIpnSecret) {
    return '';
  }

  return crypto.createHmac('sha512', nowPaymentsIpnSecret).update(body).digest('hex');
}

function isNowPaymentsFinalStatus(status: string) {
  return ['finished', 'confirmed', 'sending'].includes(status.toLowerCase());
}

function mapTransaction(row: any): PaymentTransaction {
  return {
    id: Number(row.id),
    paymentId: row.payment_id,
    orderId: row.order_id,
    paymentStatus: row.payment_status,
    payAddress: row.pay_address,
    payAmount: row.pay_amount,
    payCurrency: row.pay_currency,
    priceAmount: Number(row.price_amount || 0),
    priceCurrency: row.price_currency,
    outcomeAmount: Number(row.outcome_amount || 0),
    outcomeCurrency: row.outcome_currency,
    invoiceUrl: row.invoice_url,
  };
}

function mapBetActivity(row: any): BetActivity {
  return {
    id: Number(row.id),
    gameKey: row.game_key,
    username: row.username,
    wager: Number(row.wager || 0),
    payout: Number(row.payout || 0),
    multiplier: Number(row.multiplier || 0),
    outcome: row.outcome,
    createdAt: row.created_at,
  };
}

function mapChatMessage(row: any): ChatMessage {
  return {
    id: Number(row.id),
    username: row.username,
    text: row.text,
    tone: row.tone || 'normal',
    role: normalizeUserRole(row.role),
    avatarUrl: row.avatar_url || undefined,
    createdAt: row.created_at,
  };
}

function mapRainRound(row: any, joined = false): RainRoundState {
  return {
    id: Number(row.id),
    poolAmount: Number(row.pool_amount || 0),
    startsAt: row.starts_at,
    joinOpensAt: row.join_opens_at,
    endsAt: row.ends_at,
    participantCount: Number(row.participant_count || 0),
    joined,
    hasEnded: new Date(row.ends_at).getTime() <= Date.now(),
  };
}

function buildRobloxVerificationPhrase() {
  const wordsA = ['amber', 'atlas', 'cinder', 'comet', 'delta', 'ember', 'falcon', 'harbor', 'jungle', 'lunar'];
  const wordsB = ['apple', 'bridge', 'cloud', 'forest', 'garden', 'meadow', 'ocean', 'rocket', 'shadow', 'valley'];
  const wordA = wordsA[Math.floor(Math.random() * wordsA.length)];
  const wordB = wordsB[Math.floor(Math.random() * wordsB.length)];
  const code = 1000 + Math.floor(Math.random() * 9000);
  return `pasus ${wordA} ${wordB} ${code}`;
}

async function fetchRobloxUserByUsername(username: string) {
  const response = await fetch('https://users.roblox.com/v1/usernames/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      usernames: [username],
      excludeBannedUsers: false,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to resolve Roblox username.');
  }

  const payload = await response.json().catch(() => ({} as any));
  const row = Array.isArray(payload.data) ? payload.data[0] : null;

  if (!row?.id) {
    throw new Error('Roblox username not found.');
  }

  return {
    id: Number(row.id),
    username: String(row.name || username),
    displayName: String(row.displayName || row.name || username),
  };
}

async function fetchRobloxProfile(userId: number) {
  const response = await fetch(`https://users.roblox.com/v1/users/${userId}`);
  if (!response.ok) {
    throw new Error('Failed to load Roblox profile.');
  }

  const payload = await response.json().catch(() => ({} as any));
  return {
    id: Number(payload.id || userId),
    username: String(payload.name || ''),
    displayName: String(payload.displayName || payload.name || ''),
    description: String(payload.description || ''),
  };
}

async function fetchRobloxAvatar(userId: number) {
  const response = await fetch(
    `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`
  );

  if (!response.ok) {
    return undefined;
  }

  const payload = await response.json().catch(() => ({} as any));
  const row = Array.isArray(payload.data) ? payload.data[0] : null;
  return row?.imageUrl ? String(row.imageUrl) : undefined;
}

async function settleFinishedRainRounds(client: Pool | PoolClient) {
  const rounds = await client.query(
    `SELECT r.id, r.pool_amount
     FROM rain_rounds r
     WHERE r.status = 'active'
       AND r.ends_at <= NOW()
     ORDER BY r.ends_at ASC
     FOR UPDATE`
  );

  for (const round of rounds.rows) {
    const participants = await client.query(
      `SELECT user_id
       FROM rain_round_participants
       WHERE round_id = $1`,
      [round.id]
    );

    const count = participants.rowCount || 0;
    const totalPool = Number(round.pool_amount || 0);

    if (count > 0 && totalPool > 0) {
      const share = Math.max(1, Math.floor(totalPool / count));

      for (const participant of participants.rows) {
        await client.query(
          `UPDATE wallets
           SET balance = balance + $1,
               updated_at = NOW()
           WHERE user_id = $2`,
          [share, participant.user_id]
        );
      }

    }

    await client.query(
      `UPDATE rain_rounds
       SET status = 'settled', updated_at = NOW()
       WHERE id = $1`,
      [round.id]
    );
  }
}

async function ensureCurrentRainRound(client: Pool | PoolClient) {
  await settleFinishedRainRounds(client);

  const existing = await client.query(
    `SELECT r.id, r.pool_amount, r.starts_at, r.join_opens_at, r.ends_at, r.status,
            COUNT(p.id)::int AS participant_count
     FROM rain_rounds r
     LEFT JOIN rain_round_participants p ON p.round_id = r.id
     WHERE r.status = 'active'
     GROUP BY r.id
     ORDER BY r.starts_at DESC
     LIMIT 1`
  );

  if (existing.rowCount) {
    return existing.rows[0];
  }

  const now = new Date();
  const startsAt = new Date(now);
  startsAt.setMinutes(0, 0, 0);

  if (startsAt.getTime() > now.getTime()) {
    startsAt.setHours(startsAt.getHours() - 1);
  }

  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
  const joinOpensAt = new Date(endsAt.getTime() - 2 * 60 * 1000);

  const insertResult = await client.query(
    `INSERT INTO rain_rounds (pool_amount, starts_at, join_opens_at, ends_at, status)
     VALUES ($1, $2, $3, $4, 'active')
     RETURNING id, pool_amount, starts_at, join_opens_at, ends_at, 0::int AS participant_count`,
    [200, startsAt, joinOpensAt, endsAt]
  );

  return insertResult.rows[0];
}

async function addRainContributionFromWager(client: Pool | PoolClient, wager: number) {
  const normalizedWager = normalizeCoins(wager);
  if (normalizedWager <= 0) {
    return null;
  }

  const roundRow = await ensureCurrentRainRound(client);
  const contribution = Math.max(1, Math.floor(normalizedWager * 0.1));

  const updated = await client.query(
    `UPDATE rain_rounds
     SET pool_amount = pool_amount + $1,
         updated_at = NOW()
     WHERE id = $2
     RETURNING id, pool_amount, starts_at, join_opens_at, ends_at, status`,
    [contribution, roundRow.id]
  );

  return {
    contribution,
    round: updated.rows[0],
  };
}

async function getWallet(client: Pool | PoolClient, userId: number) {
  const result = await client.query(
    `SELECT balance, total_deposited, total_withdrawn
     FROM wallets
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  );

  if (!result.rowCount) {
    throw new Error('Wallet not found.');
  }

  return sanitizeWallet(result.rows[0]);
}

async function createSession(client: Pool | PoolClient, user: AuthUser) {
  const token = signToken(user);
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await client.query(
    `INSERT INTO user_sessions (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, tokenHash, expiresAt]
  );

  return token;
}

async function creditDepositIfNeeded(client: PoolClient, transactionId: number) {
  const transactionResult = await client.query(
    `SELECT id, user_id, payment_status, credited_at, outcome_amount
     FROM payment_transactions
     WHERE id = $1
     LIMIT 1
     FOR UPDATE`,
    [transactionId]
  );

  if (!transactionResult.rowCount) {
    return;
  }

  const tx = transactionResult.rows[0];
  if (tx.credited_at || !isNowPaymentsFinalStatus(tx.payment_status)) {
    return;
  }

  const coins = normalizeCoins(Number(tx.outcome_amount || 0) * 50);
  if (coins <= 0) {
    return;
  }

  await client.query(
    `UPDATE wallets
     SET balance = balance + $1,
         total_deposited = total_deposited + $1,
         updated_at = NOW()
     WHERE user_id = $2`,
    [coins, tx.user_id]
  );

  await client.query(
    `UPDATE payment_transactions
     SET credited_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [transactionId]
  );
}

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      avatar TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS roblox_user_id BIGINT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS roblox_username TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS roblox_display_name TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS roblox_avatar_url TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS roblox_verified_at TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS roblox_verification_phrase TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS roblox_verification_started_at TIMESTAMPTZ`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_roblox_user_id_unique ON users(roblox_user_id) WHERE roblox_user_id IS NOT NULL`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS wallets (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      balance BIGINT NOT NULL DEFAULT 0,
      total_deposited BIGINT NOT NULL DEFAULT 0,
      total_withdrawn BIGINT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_transactions (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL DEFAULT 'nowpayments',
      payment_id TEXT UNIQUE,
      order_id TEXT NOT NULL UNIQUE,
      payment_status TEXT NOT NULL DEFAULT 'waiting',
      pay_address TEXT,
      pay_amount TEXT,
      pay_currency TEXT,
      price_amount NUMERIC(12,2) NOT NULL,
      price_currency TEXT NOT NULL,
      outcome_amount NUMERIC(12,8) NOT NULL DEFAULT 0,
      outcome_currency TEXT,
      invoice_url TEXT,
      provider_payload JSONB,
      credited_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS withdrawal_requests (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      currency TEXT NOT NULL,
      address TEXT NOT NULL,
      amount BIGINT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bet_activities (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      game_key TEXT NOT NULL,
      wager BIGINT NOT NULL,
      payout BIGINT NOT NULL DEFAULT 0,
      multiplier NUMERIC(12,4) NOT NULL DEFAULT 0,
      outcome TEXT NOT NULL,
      detail TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      username TEXT NOT NULL,
      text TEXT NOT NULL,
      tone TEXT NOT NULL DEFAULT 'normal',
      role TEXT NOT NULL DEFAULT 'user',
      avatar_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'`);
  await pool.query(`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS avatar_url TEXT`);
  await pool.query(
    `DELETE FROM chat_messages
     WHERE user_id IS NULL
       AND username IN ('PasusRain', 'LuckyAce', 'MinesOnly', 'CrashPilot', 'HighRoller')`
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS rain_rounds (
      id BIGSERIAL PRIMARY KEY,
      pool_amount BIGINT NOT NULL,
      starts_at TIMESTAMPTZ NOT NULL,
      join_opens_at TIMESTAMPTZ NOT NULL,
      ends_at TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS rain_round_participants (
      id BIGSERIAL PRIMARY KEY,
      round_id BIGINT NOT NULL REFERENCES rain_rounds(id) ON DELETE CASCADE,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (round_id, user_id)
    )
  `);

  await pool.query(`
    INSERT INTO wallets (user_id, balance, total_deposited, total_withdrawn)
    SELECT id, 50, 50, 0
    FROM users
    WHERE NOT EXISTS (
      SELECT 1 FROM wallets WHERE wallets.user_id = users.id
    )
  `);

}

async function requireAuth(req: AuthedRequest, res: express.Response, next: express.NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const payload = jwt.verify(token, jwtSecret) as { id: number };
    const tokenHash = hashToken(token);

    const result = await pool.query(
      `SELECT u.id, u.username, u.email, u.currency, u.avatar, u.role,
              u.roblox_user_id, u.roblox_username, u.roblox_display_name, u.roblox_avatar_url, u.roblox_verified_at
       FROM user_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.user_id = $1
         AND s.token_hash = $2
         AND (s.expires_at IS NULL OR s.expires_at > NOW())
       LIMIT 1`,
      [payload.id, tokenHash]
    );

    if (!result.rowCount) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    req.auth = {
      token,
      user: sanitizeUser(result.rows[0]),
    };

    return next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
}

app.get('/api/chat/room', async (req: RawBodyRequest, res) => {
  const client = await pool.connect();

  try {
    let joined = false;
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
    let authedUserId: number | null = null;

    if (token) {
      try {
        const payload = jwt.verify(token, jwtSecret) as { id: number };
        const tokenHash = hashToken(token);
        const sessionResult = await client.query(
          `SELECT s.user_id
           FROM user_sessions s
           WHERE s.user_id = $1
             AND s.token_hash = $2
             AND (s.expires_at IS NULL OR s.expires_at > NOW())
           LIMIT 1`,
          [payload.id, tokenHash]
        );
        authedUserId = sessionResult.rowCount ? Number(sessionResult.rows[0].user_id) : null;
      } catch {
        authedUserId = null;
      }
    }

    await client.query('BEGIN');
    const roundRow = await ensureCurrentRainRound(client);

    if (authedUserId) {
      const joinedResult = await client.query(
        `SELECT 1
         FROM rain_round_participants
         WHERE round_id = $1 AND user_id = $2
         LIMIT 1`,
        [roundRow.id, authedUserId]
      );
      joined = Boolean(joinedResult.rowCount);
    }

    const messagesResult = await client.query(
      `SELECT id, username, text, tone, role, avatar_url, created_at
       FROM chat_messages
       ORDER BY created_at DESC
       LIMIT 20`
    );

    await client.query('COMMIT');
    return res.json({
      messages: messagesResult.rows.reverse().map(mapChatMessage),
      rain: mapRainRound(roundRow, joined),
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return res.status(500).json({ error: 'Failed to load chat room.' });
  } finally {
    client.release();
  }
});

app.post('/api/chat/messages', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const text = String(req.body.text || '').trim();

    if (!text) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    if (text.length > 280) {
      return res.status(400).json({ error: 'Message must be 280 characters or fewer.' });
    }

    const avatarUrl = req.auth!.user.robloxAvatarUrl || req.auth!.user.avatar || null;
    const insertResult = await pool.query(
      `INSERT INTO chat_messages (user_id, username, text, tone, role, avatar_url)
       VALUES ($1, $2, $3, 'normal', $4, $5)
       RETURNING id, username, text, tone, role, avatar_url, created_at`,
      [req.auth!.user.id, req.auth!.user.username, text, req.auth!.user.role, avatarUrl]
    );

    return res.status(201).json({ message: mapChatMessage(insertResult.rows[0]) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to send message.' });
  }
});

app.post('/api/rain/join', requireAuth, async (req: AuthedRequest, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const roundRow = await ensureCurrentRainRound(client);
    const now = Date.now();
    const joinOpensAt = new Date(roundRow.join_opens_at).getTime();
    const endsAt = new Date(roundRow.ends_at).getTime();

    if (now < joinOpensAt || now >= endsAt) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Rain join is only open during the final 2 minutes.' });
    }

    const existing = await client.query(
      `SELECT 1
       FROM rain_round_participants
       WHERE round_id = $1 AND user_id = $2
       LIMIT 1`,
      [roundRow.id, req.auth!.user.id]
    );

    if (existing.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'You already joined this rain.' });
    }

    await client.query(
      `INSERT INTO rain_round_participants (round_id, user_id)
       VALUES ($1, $2)`,
      [roundRow.id, req.auth!.user.id]
    );

    const refreshedRound = await client.query(
      `SELECT r.id, r.pool_amount, r.starts_at, r.join_opens_at, r.ends_at, r.status,
              COUNT(p.id)::int AS participant_count
       FROM rain_rounds r
       LEFT JOIN rain_round_participants p ON p.round_id = r.id
       WHERE r.id = $1
       GROUP BY r.id
       LIMIT 1`,
      [roundRow.id]
    );

    await client.query('COMMIT');
    return res.status(201).json({ rain: mapRainRound(refreshedRound.rows[0], true) });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return res.status(500).json({ error: 'Failed to join rain.' });
  } finally {
    client.release();
  }
});

app.post('/api/auth/register', async (req, res) => {
  const client = await pool.connect();

  try {
    const username = String(req.body.username || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required.' });
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

    const passwordHash = await bcrypt.hash(password, 10);
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`;
    const userResult = await client.query(
      `INSERT INTO users (username, email, password_hash, avatar)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, currency, avatar, role, roblox_user_id, roblox_username, roblox_display_name, roblox_avatar_url, roblox_verified_at`,
      [username, email, passwordHash, avatar]
    );

    const user = sanitizeUser(userResult.rows[0]);

    await client.query(
      `INSERT INTO wallets (user_id, balance, total_deposited, total_withdrawn)
       VALUES ($1, 50, 50, 0)`,
      [user.id]
    );

    const token = await createSession(client, user);
    const wallet = await getWallet(client, user.id);

    await client.query('COMMIT');
    return res.status(201).json({ user, token, wallet });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return res.status(500).json({ error: 'Failed to register user.' });
  } finally {
    client.release();
  }
});

app.post('/api/activity/bets', requireAuth, async (req: AuthedRequest, res) => {
  const client = await pool.connect();

  try {
    const gameKey = String(req.body.gameKey || '').trim().toLowerCase();
    const wager = normalizeCoins(req.body.wager);
    const payout = normalizeCoins(req.body.payout);
    const multiplier = Number(req.body.multiplier || 0);
    const outcome = String(req.body.outcome || '').trim().toLowerCase();
    const detail = String(req.body.detail || '').trim();

    if (!gameKey || !wager || !outcome) {
      return res.status(400).json({ error: 'Missing bet activity fields.' });
    }

    await client.query('BEGIN');

    await client.query(
      `INSERT INTO bet_activities (user_id, game_key, wager, payout, multiplier, outcome, detail)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [req.auth!.user.id, gameKey, wager, payout, multiplier || 0, outcome, detail || null]
    );

    const rainUpdate = await addRainContributionFromWager(client, wager);
    await client.query('COMMIT');

    return res.status(201).json({
      ok: true,
      rainContribution: rainUpdate?.contribution || 0,
      rainPoolAmount: Number(rainUpdate?.round?.pool_amount || 0),
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return res.status(500).json({ error: 'Failed to record bet activity.' });
  } finally {
    client.release();
  }
});

app.get('/api/activity/bets', async (req, res) => {
  try {
    const tab = String(req.query.tab || 'all').trim().toLowerCase();
    const limit = Math.min(20, Math.max(1, Number(req.query.limit || 5)));

    let query = `
      SELECT b.id, b.game_key, u.username, b.wager, b.payout, b.multiplier, b.outcome, b.created_at
      FROM bet_activities b
      JOIN users u ON u.id = b.user_id
    `;

    if (tab === 'high') {
      query += ` WHERE b.outcome = 'win' ORDER BY b.payout DESC, b.created_at DESC LIMIT $1`;
    } else if (tab === 'lucky') {
      query += ` WHERE b.outcome = 'win' AND b.multiplier >= 5 ORDER BY b.created_at DESC LIMIT $1`;
    } else {
      query += ` ORDER BY b.created_at DESC LIMIT $1`;
    }

    const result = await pool.query(query, [limit]);
    return res.json({ activities: result.rows.map(mapBetActivity) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to load activity feed.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const client = await pool.connect();

  try {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const result = await client.query(
      `SELECT id, username, email, currency, avatar, role,
              roblox_user_id, roblox_username, roblox_display_name, roblox_avatar_url, roblox_verified_at,
              password_hash
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

    const user = sanitizeUser(row);

    await client.query('BEGIN');
    const token = await createSession(client, user);
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

app.get('/api/auth/me', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const user = req.auth!.user;
    const wallet = await getWallet(pool, user.id);
    return res.json({ user, wallet });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to load user.' });
  }
});

app.get('/api/roblox/link/status', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT roblox_user_id, roblox_username, roblox_display_name, roblox_avatar_url,
              roblox_verified_at, roblox_verification_phrase
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [req.auth!.user.id]
    );

    const row = result.rows[0] || {};
    return res.json({
      roblox: {
        userId: row.roblox_user_id ? Number(row.roblox_user_id) : null,
        username: row.roblox_username || null,
        displayName: row.roblox_display_name || null,
        avatarUrl: row.roblox_avatar_url || null,
        verifiedAt: row.roblox_verified_at || null,
        pendingPhrase: row.roblox_verification_phrase || null,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to load Roblox link status.' });
  }
});

app.post('/api/roblox/link/start', requireAuth, async (req: AuthedRequest, res) => {
  const client = await pool.connect();

  try {
    const username = String(req.body.username || '').trim();
    if (!username) {
      return res.status(400).json({ error: 'Roblox username is required.' });
    }

    const robloxUser = await fetchRobloxUserByUsername(username);
    const avatarUrl = await fetchRobloxAvatar(robloxUser.id);
    const phrase = buildRobloxVerificationPhrase();

    const conflict = await client.query(
      `SELECT id
       FROM users
       WHERE roblox_user_id = $1
         AND id <> $2
       LIMIT 1`,
      [robloxUser.id, req.auth!.user.id]
    );

    if (conflict.rowCount) {
      return res.status(409).json({ error: 'That Roblox account is already linked to another Pasus user.' });
    }

    const update = await client.query(
      `UPDATE users
       SET roblox_user_id = $1,
           roblox_username = $2,
           roblox_display_name = $3,
           roblox_avatar_url = $4,
           roblox_verification_phrase = $5,
           roblox_verification_started_at = NOW()
       WHERE id = $6
       RETURNING roblox_user_id, roblox_username, roblox_display_name, roblox_avatar_url, roblox_verification_phrase`,
      [robloxUser.id, robloxUser.username, robloxUser.displayName, avatarUrl || null, phrase, req.auth!.user.id]
    );

    const row = update.rows[0];
    return res.status(201).json({
      roblox: {
        userId: Number(row.roblox_user_id),
        username: row.roblox_username,
        displayName: row.roblox_display_name,
        avatarUrl: row.roblox_avatar_url,
        pendingPhrase: row.roblox_verification_phrase,
        profileUrl: `https://www.roblox.com/users/${row.roblox_user_id}/profile`,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to start Roblox verification.' });
  } finally {
    client.release();
  }
});

app.post('/api/roblox/link/verify', requireAuth, async (req: AuthedRequest, res) => {
  const client = await pool.connect();

  try {
    const current = await client.query(
      `SELECT roblox_user_id, roblox_username, roblox_display_name, roblox_avatar_url, roblox_verification_phrase
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [req.auth!.user.id]
    );

    if (!current.rowCount || !current.rows[0].roblox_user_id || !current.rows[0].roblox_verification_phrase) {
      return res.status(400).json({ error: 'Start Roblox verification first.' });
    }

    const row = current.rows[0];
    const robloxUserId = Number(row.roblox_user_id);
    const phrase = String(row.roblox_verification_phrase);
    const profile = await fetchRobloxProfile(robloxUserId);
    const avatarUrl = (await fetchRobloxAvatar(robloxUserId)) || row.roblox_avatar_url || null;

    if (!profile.description.includes(phrase)) {
      return res.status(400).json({ error: 'Verification phrase not found in your Roblox profile description yet.' });
    }

    const updated = await client.query(
      `UPDATE users
       SET roblox_username = $1,
           roblox_display_name = $2,
           roblox_avatar_url = $3,
           roblox_verified_at = NOW(),
           roblox_verification_phrase = NULL
       WHERE id = $4
       RETURNING id, username, email, currency, avatar, role,
                 roblox_user_id, roblox_username, roblox_display_name, roblox_avatar_url, roblox_verified_at`,
      [profile.username || row.roblox_username, profile.displayName || row.roblox_display_name, avatarUrl, req.auth!.user.id]
    );

    return res.json({ user: sanitizeUser(updated.rows[0]) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to verify Roblox account.' });
  } finally {
    client.release();
  }
});

app.post('/api/auth/logout', requireAuth, async (req: AuthedRequest, res) => {
  try {
    await pool.query(
      `DELETE FROM user_sessions
       WHERE user_id = $1 AND token_hash = $2`,
      [req.auth!.user.id, hashToken(req.auth!.token)]
    );

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to log out.' });
  }
});

app.get('/api/wallet/me', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const wallet = await getWallet(pool, req.auth!.user.id);
    return res.json({ wallet });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to load wallet.' });
  }
});

app.post('/api/wallet/deposit', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const amount = normalizeCoins(req.body.amount);

    if (amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount.' });
    }

    const result = await pool.query(
      `UPDATE wallets
       SET balance = balance + $1,
           total_deposited = total_deposited + $1,
           updated_at = NOW()
       WHERE user_id = $2
       RETURNING balance, total_deposited, total_withdrawn`,
      [amount, req.auth!.user.id]
    );

    return res.json({ wallet: sanitizeWallet(result.rows[0]) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to update wallet.' });
  }
});

app.post('/api/wallet/adjust', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const delta = normalizeCoins(req.body.delta);

    if (delta === 0) {
      return res.status(400).json({ error: 'Invalid adjustment.' });
    }

    const result = await pool.query(
      `UPDATE wallets
       SET balance = balance + $1,
           total_withdrawn = total_withdrawn + CASE WHEN $1 < 0 THEN ABS($1) ELSE 0 END,
           updated_at = NOW()
       WHERE user_id = $2
         AND balance + $1 >= 0
       RETURNING balance, total_deposited, total_withdrawn`,
      [delta, req.auth!.user.id]
    );

    if (!result.rowCount) {
      return res.status(400).json({ error: 'Insufficient balance.' });
    }

    return res.json({ wallet: sanitizeWallet(result.rows[0]) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to update wallet.' });
  }
});

app.post('/api/payments/nowpayments/create', requireAuth, async (req: AuthedRequest, res) => {
  const client = await pool.connect();

  try {
    const priceAmount = normalizeFiatAmount(req.body.priceAmount);
    const payCurrency = String(req.body.payCurrency || '').trim().toLowerCase();
    const priceCurrency = String(req.body.priceCurrency || 'usd').trim().toLowerCase();

    if (!priceAmount || !payCurrency) {
      return res.status(400).json({ error: 'Deposit amount and currency are required.' });
    }

    if (!nowPaymentsApiKey) {
      return res.status(500).json({ error: 'NOWPayments API key is not configured.' });
    }

    const orderId = `pasus-${req.auth!.user.id}-${Date.now()}`;
    const callbackUrl = `${appBaseUrl.replace(/\/$/, '')}/api/payments/nowpayments/ipn`;
    const successUrl = `${appBaseUrl.replace(/\/$/, '')}/wallet?deposit=success`;
    const cancelUrl = `${appBaseUrl.replace(/\/$/, '')}/wallet?deposit=cancelled`;

    const nowResponse = await fetch(`${nowPaymentsBaseUrl}/payment`, {
      method: 'POST',
      headers: nowPaymentsHeaders(),
      body: JSON.stringify({
        price_amount: priceAmount,
        price_currency: priceCurrency,
        pay_currency: payCurrency,
        ipn_callback_url: callbackUrl,
        order_id: orderId,
        order_description: `Pasus deposit for ${req.auth!.user.username}`,
        success_url: successUrl,
        cancel_url: cancelUrl,
      }),
    });

    const payload = await nowResponse.json().catch(() => ({}));
    if (!nowResponse.ok) {
      console.error('NOWPayments create payment failed:', {
        status: nowResponse.status,
        payload,
        request: {
          priceAmount,
          priceCurrency,
          payCurrency,
          callbackUrl,
          orderId,
        },
      });
      return res.status(400).json({
        error: payload.message || payload.error || payload.msg || `NOWPayments rejected the payment request (${nowResponse.status}).`,
        details: payload,
      });
    }

    const insertResult = await client.query(
      `INSERT INTO payment_transactions (
        user_id, payment_id, order_id, payment_status, pay_address, pay_amount, pay_currency,
        price_amount, price_currency, outcome_amount, outcome_currency, invoice_url, provider_payload
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        req.auth!.user.id,
        payload.payment_id ? String(payload.payment_id) : null,
        payload.order_id || orderId,
        payload.payment_status || 'waiting',
        payload.pay_address || null,
        payload.pay_amount ? String(payload.pay_amount) : null,
        payload.pay_currency || payCurrency,
        priceAmount,
        priceCurrency,
        Number(payload.outcome_amount || 0),
        payload.outcome_currency || null,
        payload.invoice_url || payload.payin_extra_id || null,
        JSON.stringify(payload),
      ]
    );

    return res.status(201).json({ transaction: mapTransaction(insertResult.rows[0]) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to create deposit.' });
  } finally {
    client.release();
  }
});

app.get('/api/payments/transactions', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM payment_transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [req.auth!.user.id]
    );

    return res.json({ transactions: result.rows.map(mapTransaction) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to load transactions.' });
  }
});

app.get('/api/payments/transactions/:id', requireAuth, async (req: AuthedRequest, res) => {
  const client = await pool.connect();

  try {
    const transactionId = Number(req.params.id);
    const existing = await client.query(
      `SELECT *
       FROM payment_transactions
       WHERE id = $1 AND user_id = $2
       LIMIT 1`,
      [transactionId, req.auth!.user.id]
    );

    if (!existing.rowCount) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    const current = existing.rows[0];
    if (current.payment_id && nowPaymentsApiKey) {
      const nowResponse = await fetch(`${nowPaymentsBaseUrl}/payment/${current.payment_id}`, {
        headers: nowPaymentsHeaders(),
      });
      const payload = await nowResponse.json().catch(() => ({}));

      if (nowResponse.ok) {
        await client.query('BEGIN');
        const updated = await client.query(
          `UPDATE payment_transactions
           SET payment_status = $1,
               pay_address = COALESCE($2, pay_address),
               pay_amount = COALESCE($3, pay_amount),
               pay_currency = COALESCE($4, pay_currency),
               outcome_amount = COALESCE($5, outcome_amount),
               outcome_currency = COALESCE($6, outcome_currency),
               invoice_url = COALESCE($7, invoice_url),
               provider_payload = $8,
               updated_at = NOW()
           WHERE id = $9
           RETURNING *`,
          [
            payload.payment_status || current.payment_status,
            payload.pay_address || null,
            payload.pay_amount ? String(payload.pay_amount) : null,
            payload.pay_currency || null,
            Number(payload.outcome_amount || current.outcome_amount || 0),
            payload.outcome_currency || null,
            payload.invoice_url || payload.payin_extra_id || null,
            JSON.stringify(payload),
            transactionId,
          ]
        );

        await creditDepositIfNeeded(client, transactionId);
        await client.query('COMMIT');

        const wallet = await getWallet(pool, req.auth!.user.id);
        return res.json({ transaction: mapTransaction(updated.rows[0]), wallet });
      }
    }

    const wallet = await getWallet(pool, req.auth!.user.id);
    return res.json({ transaction: mapTransaction(current), wallet });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return res.status(500).json({ error: 'Failed to load transaction.' });
  } finally {
    client.release();
  }
});

app.post('/api/payments/withdrawals/request', requireAuth, async (req: AuthedRequest, res) => {
  const client = await pool.connect();

  try {
    const amount = normalizeCoins(req.body.amount);
    const currency = String(req.body.currency || '').trim().toLowerCase();
    const address = String(req.body.address || '').trim();

    if (!amount || !currency || !address) {
      return res.status(400).json({ error: 'Amount, currency, and address are required.' });
    }

    await client.query('BEGIN');

    const walletResult = await client.query(
      `UPDATE wallets
       SET balance = balance - $1,
           total_withdrawn = total_withdrawn + $1,
           updated_at = NOW()
       WHERE user_id = $2
         AND balance >= $1
       RETURNING balance, total_deposited, total_withdrawn`,
      [amount, req.auth!.user.id]
    );

    if (!walletResult.rowCount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient balance.' });
    }

    const requestResult = await client.query(
      `INSERT INTO withdrawal_requests (user_id, currency, address, amount)
       VALUES ($1, $2, $3, $4)
       RETURNING id, status, created_at`,
      [req.auth!.user.id, currency, address, amount]
    );

    await client.query('COMMIT');
    return res.status(201).json({
      request: requestResult.rows[0],
      wallet: sanitizeWallet(walletResult.rows[0]),
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return res.status(500).json({ error: 'Failed to create withdrawal request.' });
  } finally {
    client.release();
  }
});

app.post('/api/payments/nowpayments/ipn', async (req: RawBodyRequest, res) => {
  const client = await pool.connect();

  try {
    const signature = String(req.headers['x-nowpayments-sig'] || '');
    const rawBody = req.rawBody || JSON.stringify(req.body || {});

    if (!nowPaymentsIpnSecret || !signature || buildIpnSignature(rawBody) !== signature) {
      return res.status(401).json({ error: 'Invalid IPN signature.' });
    }

    const paymentId = req.body.payment_id ? String(req.body.payment_id) : null;
    const orderId = req.body.order_id ? String(req.body.order_id) : null;

    if (!paymentId && !orderId) {
      return res.status(400).json({ error: 'Missing payment reference.' });
    }

    await client.query('BEGIN');
    const updateResult = await client.query(
      `UPDATE payment_transactions
       SET payment_id = COALESCE($1, payment_id),
           payment_status = COALESCE($2, payment_status),
           pay_address = COALESCE($3, pay_address),
           pay_amount = COALESCE($4, pay_amount),
           pay_currency = COALESCE($5, pay_currency),
           outcome_amount = COALESCE($6, outcome_amount),
           outcome_currency = COALESCE($7, outcome_currency),
           invoice_url = COALESCE($8, invoice_url),
           provider_payload = $9,
           updated_at = NOW()
       WHERE payment_id = $1 OR order_id = $10
       RETURNING id`,
      [
        paymentId,
        req.body.payment_status || null,
        req.body.pay_address || null,
        req.body.pay_amount ? String(req.body.pay_amount) : null,
        req.body.pay_currency || null,
        Number(req.body.outcome_amount || 0),
        req.body.outcome_currency || null,
        req.body.invoice_url || req.body.payin_extra_id || null,
        JSON.stringify(req.body),
        orderId,
      ]
    );

    if (updateResult.rowCount) {
      await creditDepositIfNeeded(client, Number(updateResult.rows[0].id));
    }

    await client.query('COMMIT');
    return res.status(200).json({ ok: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return res.status(500).json({ error: 'Failed to process IPN.' });
  } finally {
    client.release();
  }
});

app.use(express.static(distPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }

  return res.sendFile(path.join(distPath, 'index.html'));
});

initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`Pasus auth server running on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database', error);
    process.exit(1);
  });
