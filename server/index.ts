import crypto from 'node:crypto';
import dotenv from 'dotenv';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool, PoolClient } from 'pg';
import { Resend } from 'resend';

dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
app.set('trust proxy', 1);
const port = Number(process.env.PORT || 3001);
const databaseUrl = process.env.DATABASE_URL;
const jwtSecret = process.env.JWT_SECRET || 'pasus-dev-secret-change-me';
const nowPaymentsApiKey = process.env.NOWPAYMENTS_API_KEY;
const nowPaymentsIpnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
const nowPaymentsBaseUrl = process.env.NOWPAYMENTS_BASE_URL || 'https://api.nowpayments.io/v1';
const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
const apiBaseUrl = process.env.API_BASE_URL || appBaseUrl;
const discordClientId = process.env.DISCORD_CLIENT_ID;
const discordClientSecret = process.env.DISCORD_CLIENT_SECRET;
const discordRedirectUri = process.env.DISCORD_REDIRECT_URI || `${appBaseUrl}/api/discord/connect/callback`;
const COINS_PER_DOLLAR = 1;

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const FROM_EMAIL = 'Pasus <noreply@pasus.xyz>';

async function sendEmail(to: string, subject: string, html: string) {
  if (!resend) {
    console.log('[Email disabled] Would send to:', to, 'Subject:', subject);
    return;
  }
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
    console.log('[Email sent] To:', to, 'Subject:', subject);
  } catch (error) {
    console.error('[Email error]', error);
  }
}

async function sendWelcomeEmail(email: string, username: string) {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
      <img src="${appBaseUrl}/assets/welcome.png" alt="Welcome to Pasus" style="max-width: 100%; height: auto; border-radius: 12px; margin-bottom: 20px;" />
      <h1 style="color: #00FF88; margin-bottom: 10px;">Welcome to Pasus, ${username}!</h1>
      <p style="color: #333; font-size: 16px; line-height: 1.6;">
        Thanks for joining Pasus. You received a <strong>$1 welcome bonus</strong> to get started.
      </p>
      <p style="color: #333; font-size: 16px; line-height: 1.6;">
        Start playing and good luck!
      </p>
      <br/>
      <a href="${appBaseUrl}" style="display: inline-block; background: #00FF88; color: black; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 10px 0;">
        Start Playing
      </a>
      <br/><br/>
      <p style="color: #888; font-size: 12px;">- The Pasus Team</p>
    </div>
  `;
  
  if (!resend) {
    console.log('[Email disabled] Would send welcome email to:', email);
    return;
  }
  
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Welcome to Pasus!',
      html,
    });
    console.log('[Welcome email sent] To:', email);
  } catch (error) {
    console.error('[Welcome email error]', error);
  }
}

async function sendPromoEmail(email: string, username: string, promo: string) {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #00FF88;">Pasus Promo</h1>
      <p>Hey ${username},</p>
      <p>${promo}</p>
      <br/>
      <a href="${appBaseUrl}" style="background: #00FF88; color: black; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Play Now</a>
      <br/><br/>
      <p style="color: #666; font-size: 12px;">Unsubscribe coming soon.</p>
    </div>
  `;
  await sendEmail(email, 'Pasus - Special Offer!', html);
}
const MIN_DEPOSIT_USD = 1;
const DEFAULT_RAIN_POOL_COINS = 500;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');
const allowedOrigins = new Set(
  [
    appBaseUrl,
    'https://www.pasus.xyz',
    'https://pasus.xyz',
    'http://localhost:3000',
  ]
    .map((value) => {
      try {
        return new URL(value).origin;
      } catch {
        return null;
      }
    })
    .filter((value): value is string => Boolean(value))
);

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

function getRequestOrigin(req: express.Request) {
  const originHeader = req.headers.origin;
  if (!originHeader) {
    return null;
  }

  try {
    return new URL(originHeader).origin;
  } catch {
    return null;
  }
}

function applyCorsHeaders(req: express.Request, res: express.Response) {
  const origin = getRequestOrigin(req);
  if (!origin || !allowedOrigins.has(origin)) {
    return;
  }

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type');
  res.setHeader('Vary', 'Origin');
}

app.use((req, res, next) => {
  applyCorsHeaders(req, res);

  if (req.method === 'OPTIONS' && req.path.startsWith('/api/')) {
    res.status(204).end();
    return;
  }

  next();
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
  customAvatarUrl?: string;
  avatarSource?: 'custom' | 'roblox' | 'discord';
  role: 'owner' | 'moderator' | 'user';
  robloxUserId?: number;
  robloxUsername?: string;
  robloxDisplayName?: string;
  robloxAvatarUrl?: string;
  robloxVerifiedAt?: string;
  discordUserId?: string;
  discordUsername?: string;
  discordDisplayName?: string;
  discordAvatarUrl?: string;
  discordVerifiedAt?: string;
  totpEnabled?: boolean;
};

type Wallet = {
  balance: number;
  totalDeposited: number;
  totalWithdrawn: number;
};

type AffiliateOverview = {
  code: string | null;
  referralLink: string | null;
  referredUsers: number;
  trackedVolume: number;
  totalCommission: number;
  claimedCommission: number;
  claimableCommission: number;
  winCommission: number;
  recentCommissions: Array<{
    id: number;
    username: string;
    sourceType: string;
    baseAmount: number;
    commissionAmount: number;
    claimedAt: string | null;
    createdAt: string;
  }>;
  referredAccounts: Array<{
    id: number;
    username: string;
    createdAt: string;
  }>;
};

type RakebackPeriod = 'instant' | 'daily' | 'weekly' | 'monthly';

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

type TipNotification = {
  id: number;
  senderUsername: string;
  amount: number;
  createdAt: string;
};

type SupportTicketMessage = {
  id: number;
  ticketId: number;
  senderType: 'user' | 'admin';
  userId: number | null;
  username: string;
  role: 'owner' | 'moderator' | 'user';
  message: string;
  createdAt: string;
};

type SupportTicketThread = {
  id: number;
  userId: number;
  username: string;
  subject: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  messages: SupportTicketMessage[];
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

type CustomRainState = {
  id: number;
  creatorUsername: string;
  creatorAvatarUrl?: string;
  poolAmount: number;
  endsAt: string;
  participantCount: number;
  joined: boolean;
  hasEnded: boolean;
};

type DailyRewardStatus = {
  streak: number;
  rewardAmount: number;
  canClaim: boolean;
  nextClaimAt: string | null;
  lastClaimedAt: string | null;
};

type RawBodyRequest = express.Request & { rawBody?: string };

type AuthedRequest = RawBodyRequest & {
  auth?: {
    token: string;
    tokenHash: string;
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

function generateTotpSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  for (let i = 0; i < 20; i++) {
    secret += chars[crypto.randomInt(chars.length)];
  }
  return secret;
}

function generateTotpCode(secret: string): string {
  const timeStep = Math.floor(Date.now() / 30000);
  const key = Buffer.from(secret);
  const counter = Buffer.alloc(8);
  counter.writeBigInt64BE(BigInt(timeStep), 0);
  const hmac = crypto.createHmac('sha1', key);
  hmac.update(counter);
  const h = hmac.digest();
  const offset = h[19] & 0xf;
  const code = ((h[offset] & 0x7f) << 24) | ((h[offset + 1] & 0xff) << 16) | ((h[offset + 2] & 0xff) << 8) | (h[offset + 3] & 0xff);
  return String(code % 1000000).padStart(6, '0');
}

function verifyTotpCode(secret: string, code: string): boolean {
  const window = 1;
  for (let i = -window; i <= window; i++) {
    const timeStep = Math.floor(Date.now() / 30000) + i;
    const key = Buffer.from(secret);
    const counter = Buffer.alloc(8);
    counter.writeBigInt64BE(BigInt(timeStep), 0);
    const hmac = crypto.createHmac('sha1', key);
    hmac.update(counter);
    const h = hmac.digest();
    const offset = h[19] & 0xf;
    const expected = ((h[offset] & 0x7f) << 24) | ((h[offset + 1] & 0xff) << 16) | ((h[offset + 2] & 0xff) << 8) | (h[offset + 3] & 0xff);
    const expectedCode = String(expected % 1000000).padStart(6, '0');
    if (expectedCode === code) {
      return true;
    }
  }
  return false;
}

function getDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return 'Mobile';
  }
  if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'Tablet';
  }
  return 'Desktop';
}

function maskIp(ip: string): string {
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.***.***`;
  }
  if (ip.includes(':')) {
    return ip.slice(0, 8) + ':***:***';
  }
  return ip.slice(0, 4) + '***';
}

function sanitizeUser(row: any): AuthUser {
  return {
    id: Number(row.id),
    username: row.username,
    email: row.email,
    currency: row.currency || 'USD',
    avatar: row.avatar || undefined,
    customAvatarUrl: row.custom_avatar_url || undefined,
    avatarSource: row.avatar_source || 'custom',
    role: normalizeUserRole(row.role),
    robloxUserId: row.roblox_user_id ? Number(row.roblox_user_id) : undefined,
    robloxUsername: row.roblox_username || undefined,
    robloxDisplayName: row.roblox_display_name || undefined,
    robloxAvatarUrl: row.roblox_avatar_url || undefined,
    robloxVerifiedAt: row.roblox_verified_at || undefined,
    discordUserId: row.discord_user_id || undefined,
    discordUsername: row.discord_username || undefined,
    discordDisplayName: row.discord_display_name || undefined,
    discordAvatarUrl: row.discord_avatar_url || undefined,
    discordVerifiedAt: row.discord_verified_at || undefined,
    totpEnabled: Boolean(row.totp_enabled),
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
  const toBigInt = (val: any): bigint => {
    if (typeof val === 'bigint') return val;
    if (typeof val === 'number') return BigInt(Math.trunc(val));
    if (typeof val === 'string') {
      const cleaned = val.replace(/\.00$/, '').split('.')[0];
      return BigInt(cleaned);
    }
    return 0n;
  };

  const balance = toBigInt(row.balance);
  const totalDeposited = toBigInt(row.total_deposited);
  const totalWithdrawn = toBigInt(row.total_withdrawn);

  return {
    balance: Number(balance),
    totalDeposited: Number(totalDeposited),
    totalWithdrawn: Number(totalWithdrawn),
  };
}

function normalizeCoins(value: unknown) {
  const amount = Math.round(Number(value || 0));
  return Number.isFinite(amount) ? amount : 0;
}

function dollarsToCoins(value: unknown) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }
  return Math.round(amount * COINS_PER_DOLLAR);
}

function formatCoinsLabel(value: unknown) {
  return normalizeCoins(value).toLocaleString('en-US');
}

function normalizeFiatAmount(value: unknown) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }
  return Math.round(amount * 100) / 100;
}

function getStartOfUtcDay(value = new Date()) {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

function getDailyRewardStatus(row: any, now = new Date()): DailyRewardStatus {
  const lastClaimedAt = row?.daily_reward_last_claimed ? new Date(row.daily_reward_last_claimed) : null;
  const currentStreak = Math.max(0, Number(row?.daily_reward_streak || 0));
  const todayStart = getStartOfUtcDay(now);
  const lastStart = lastClaimedAt ? getStartOfUtcDay(lastClaimedAt) : null;
  const canClaim = lastStart === null || lastStart < todayStart;
  const continuesStreak = lastStart !== null && todayStart - lastStart === 24 * 60 * 60 * 1000;
  const nextStreak = canClaim ? (continuesStreak ? currentStreak + 1 : 1) : currentStreak || 1;
  const rewardAmount = dollarsToCoins(Math.min(1, 0.5 + Math.max(0, nextStreak - 1) * 0.05));
  const nextClaimAt = canClaim ? null : new Date(todayStart + 24 * 60 * 60 * 1000).toISOString();

  return {
    streak: currentStreak,
    rewardAmount,
    canClaim,
    nextClaimAt,
    lastClaimedAt: lastClaimedAt ? lastClaimedAt.toISOString() : null,
  };
}

function calculateLevel(xp: number): { level: number; xpToNextLevel: number } {
  // Harder XP thresholds for VIP levels (1-30)
  const xpThresholds = [
    0,       // Level 1
    5000,    // Level 2
    15000,   // Level 3
    35000,   // Level 4
    70000,   // Level 5
    120000,  // Level 6
    200000,  // Level 7
    320000,  // Level 8
    500000,  // Level 9
    750000,  // Level 10
    1100000, // Level 11
    1550000, // Level 12
    2100000, // Level 13
    2800000, // Level 14
    3700000, // Level 15
    4800000, // Level 16
    6200000, // Level 17
    8000000, // Level 18
    10300000,// Level 19
    13200000,// Level 20
    16800000,// Level 21
    21200000,// Level 22
    26500000,// Level 23
    33000000,// Level 24
    41000000,// Level 25
    51000000,// Level 26
    63500000,// Level 27
    79000000,// Level 28
    98500000,// Level 29
    123000000,// Level 30
  ];
  let level = 1;
  for (let i = xpThresholds.length - 1; i >= 0; i--) {
    if (xp >= xpThresholds[i]) {
      level = i + 1;
      break;
    }
  }
  const nextThreshold = xpThresholds[level] || xpThresholds[xpThresholds.length - 1];
  const xpToNextLevel = level >= 30 ? 0 : Math.max(0, nextThreshold - xp);
  return { level, xpToNextLevel };
}

function getVipRewardForLevel(level: number): number {
  // Reward every 3 levels: 1, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30
  if (level % 3 !== 0 || level === 0) return 0;
  // Level 1 = $0.10, Level 3 = $0.50, Level 6 = $1.00, etc.
  // Reward formula: $0.10 * (level/3) * (level/3 + 1) / 2
  const tier = Math.floor(level / 3);
  return Math.round(tier * (tier + 1) * 10); // Returns cents
}

function calculateRewardForStreak(streak: number): { coins: number; xp: number } {
  const cappedStreak = Math.min(streak, 30);
  return {
    coins: cappedStreak * 100,
    xp: Math.min(cappedStreak * 10, 300),
  };
}

function normalizeAffiliateCode(value: unknown) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 24);
}

function getRakebackBuckets(totalEarned: number, row: any) {
  const normalizedEarned = Math.max(0, normalizeCoins(totalEarned));
  const baseShare = Math.floor(normalizedEarned / 4);
  const remainder = normalizedEarned - baseShare * 4;
  const now = Date.now();

  const buckets: Record<RakebackPeriod, { total: number; claimed: number; claimable: number; availableAt: string | null; canClaim: boolean }> = {
    instant: {
      total: baseShare + (remainder > 0 ? 1 : 0),
      claimed: Number(row?.rakeback_claimed_instant || 0),
      claimable: 0,
      availableAt: null,
      canClaim: true,
    },
    daily: {
      total: baseShare + (remainder > 1 ? 1 : 0),
      claimed: Number(row?.rakeback_claimed_daily || 0),
      claimable: 0,
      availableAt: row?.rakeback_last_claimed_daily || null,
      canClaim: true,
    },
    weekly: {
      total: baseShare + (remainder > 2 ? 1 : 0),
      claimed: Number(row?.rakeback_claimed_weekly || 0),
      claimable: 0,
      availableAt: row?.rakeback_last_claimed_weekly || null,
      canClaim: true,
    },
    monthly: {
      total: baseShare + (remainder > 3 ? 1 : 0),
      claimed: Number(row?.rakeback_claimed_monthly || 0),
      claimable: 0,
      availableAt: row?.rakeback_last_claimed_monthly || null,
      canClaim: true,
    },
  };

  const cooldowns: Record<RakebackPeriod, number> = {
    instant: 0,
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000,
  };

  (Object.keys(buckets) as RakebackPeriod[]).forEach((period) => {
    const bucket = buckets[period];
    bucket.claimable = Math.max(0, bucket.total - bucket.claimed);

    if (period !== 'instant' && bucket.availableAt) {
      const nextAllowedAt = new Date(bucket.availableAt).getTime() + cooldowns[period];
      bucket.canClaim = now >= nextAllowedAt;
      bucket.availableAt = new Date(nextAllowedAt).toISOString();
    }
  });

  return buckets;
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

function resolvePreferredAvatar(user: Pick<AuthUser, 'avatar' | 'customAvatarUrl' | 'avatarSource' | 'robloxAvatarUrl' | 'discordAvatarUrl'>) {
  if (user.avatarSource === 'discord' && user.discordAvatarUrl) {
    return user.discordAvatarUrl;
  }
  if (user.avatarSource === 'roblox' && user.robloxAvatarUrl) {
    return user.robloxAvatarUrl;
  }
  return user.customAvatarUrl || user.avatar || user.discordAvatarUrl || user.robloxAvatarUrl || null;
}

function mapCustomRain(row: any, joined = false): CustomRainState {
  return {
    id: Number(row.id),
    creatorUsername: String(row.creator_username || ''),
    creatorAvatarUrl: row.creator_avatar_url || undefined,
    poolAmount: Number(row.pool_amount || 0),
    endsAt: row.ends_at,
    participantCount: Number(row.participant_count || 0),
    joined,
    hasEnded: new Date(row.ends_at).getTime() <= Date.now(),
  };
}

function mapTipNotification(row: any): TipNotification {
  return {
    id: Number(row.id),
    senderUsername: String(row.sender_username || ''),
    amount: Number(row.amount || 0),
    createdAt: row.created_at,
  };
}

function mapSupportTicketMessage(row: any): SupportTicketMessage {
  return {
    id: Number(row.id),
    ticketId: Number(row.ticket_id),
    senderType: row.sender_type === 'admin' ? 'admin' : 'user',
    userId: row.user_id ? Number(row.user_id) : null,
    username: String(row.username || ''),
    role: normalizeUserRole(row.role),
    message: String(row.message || ''),
    createdAt: row.created_at,
  };
}

function buildSupportThreads(ticketRows: any[], messageRows: any[]): SupportTicketThread[] {
  const messagesByTicket = new Map<number, SupportTicketMessage[]>();
  for (const row of messageRows) {
    const message = mapSupportTicketMessage(row);
    const list = messagesByTicket.get(message.ticketId) || [];
    list.push(message);
    messagesByTicket.set(message.ticketId, list);
  }

  return ticketRows.map((row) => ({
    id: Number(row.id),
    userId: Number(row.user_id),
    username: String(row.username || ''),
    subject: String(row.subject || ''),
    status: String(row.status || 'open'),
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
    messages: messagesByTicket.get(Number(row.id)) || [],
  }));
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

async function fetchDiscordAccessToken(code: string) {
  if (!discordClientId || !discordClientSecret) {
    throw new Error('Discord OAuth is not configured.');
  }

  const params = new URLSearchParams();
  params.set('client_id', discordClientId);
  params.set('client_secret', discordClientSecret);
  params.set('grant_type', 'authorization_code');
  params.set('code', code);
  params.set('redirect_uri', discordRedirectUri);

  const response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange Discord OAuth code.');
  }

  return response.json();
}

async function fetchDiscordProfile(accessToken: string) {
  const response = await fetch('https://discord.com/api/users/@me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to load Discord profile.');
  }

  const payload = await response.json().catch(() => ({} as any));
  const avatarUrl =
    payload.avatar && payload.id
      ? `https://cdn.discordapp.com/avatars/${payload.id}/${payload.avatar}.png?size=256`
      : undefined;

  return {
    id: String(payload.id || ''),
    username: String(payload.username || ''),
    displayName: String(payload.global_name || payload.username || ''),
    avatarUrl,
  };
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

async function settleFinishedCustomRains(client: Pool | PoolClient) {
  const rains = await client.query(
    `SELECT id, pool_amount
     FROM custom_rains
     WHERE status = 'active'
       AND ends_at <= NOW()
     ORDER BY ends_at ASC
     FOR UPDATE`
  );

  for (const rain of rains.rows) {
    const participants = await client.query(
      `SELECT user_id
       FROM custom_rain_participants
       WHERE custom_rain_id = $1`,
      [rain.id]
    );

    const count = participants.rowCount || 0;
    const totalPool = Number(rain.pool_amount || 0);

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
      `UPDATE custom_rains
       SET status = 'settled',
           updated_at = NOW()
       WHERE id = $1`,
      [rain.id]
    );

  }
}

async function getActiveCustomRain(client: Pool | PoolClient, userId?: number | null) {
  await settleFinishedCustomRains(client);

  const result = await client.query(
    `SELECT r.id, r.creator_username, r.creator_avatar_url, r.pool_amount, r.ends_at, r.status,
            COUNT(p.id)::int AS participant_count
     FROM custom_rains r
     LEFT JOIN custom_rain_participants p ON p.custom_rain_id = r.id
     WHERE r.status = 'active'
     GROUP BY r.id
     ORDER BY r.created_at DESC
     LIMIT 1`
  );

  if (!result.rowCount) {
    return null;
  }

  const row = result.rows[0];
  let joined = false;
  if (userId) {
    const joinedResult = await client.query(
      `SELECT 1
       FROM custom_rain_participants
       WHERE custom_rain_id = $1 AND user_id = $2
       LIMIT 1`,
      [row.id, userId]
    );
    joined = Boolean(joinedResult.rowCount);
  }

  return mapCustomRain(row, joined);
}

function getCurrentRainWindow(now = new Date()) {
  const startsAt = new Date(now);
  startsAt.setMinutes(0, 0, 0);

  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
  const joinOpensAt = new Date(endsAt.getTime() - 2 * 60 * 1000);

  return { startsAt, joinOpensAt, endsAt };
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
    const currentRound = existing.rows[0];
    if (Number(currentRound.pool_amount || 0) !== DEFAULT_RAIN_POOL_COINS && Number(currentRound.participant_count || 0) === 0) {
      const updated = await client.query(
        `UPDATE rain_rounds
         SET pool_amount = $1,
             updated_at = NOW()
         WHERE id = $2
         RETURNING id, pool_amount, starts_at, join_opens_at, ends_at, status, $3::int AS participant_count`,
        [DEFAULT_RAIN_POOL_COINS, currentRound.id, Number(currentRound.participant_count || 0)]
      );
      return updated.rows[0];
    }
    return currentRound;
  }

  const { startsAt, joinOpensAt, endsAt } = getCurrentRainWindow();

  const insertResult = await client.query(
    `INSERT INTO rain_rounds (pool_amount, starts_at, join_opens_at, ends_at, status)
     VALUES ($1, $2, $3, $4, 'active')
     RETURNING id, pool_amount, starts_at, join_opens_at, ends_at, 0::int AS participant_count`,
    [DEFAULT_RAIN_POOL_COINS, startsAt, joinOpensAt, endsAt]
  );

  return insertResult.rows[0];
}

async function addRainContributionFromWager(client: Pool | PoolClient, wager: number, payout: number, outcome: string) {
  const normalizedWager = normalizeCoins(wager);
  const normalizedPayout = normalizeCoins(payout);

  if (normalizedWager <= 0) {
    return null;
  }

  let contribution = 0;

  if (outcome === 'loss') {
    contribution = Math.max(1, Math.floor(normalizedWager * 0.005));
  } else if (outcome === 'win' && normalizedPayout > normalizedWager) {
    const winnings = normalizedPayout - normalizedWager;
    contribution = Math.max(1, Math.floor(winnings * 0.005));
  }

  if (contribution <= 0) {
    return null;
  }

  const roundRow = await ensureCurrentRainRound(client);

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

async function ensureAffiliateCode(client: Pool | PoolClient, userId: number, username: string) {
  const existing = await client.query(
    `SELECT code
     FROM affiliate_codes
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  );

  if (existing.rowCount) {
    return String(existing.rows[0].code);
  }

  let attempt = normalizeAffiliateCode(username) || `PASUS${userId}`;

  for (let index = 0; index < 10; index += 1) {
    const candidate = index === 0 ? attempt : `${attempt}${index}`;
    try {
      const inserted = await client.query(
        `INSERT INTO affiliate_codes (user_id, code)
         VALUES ($1, $2)
         RETURNING code`,
        [userId, candidate]
      );
      return String(inserted.rows[0].code);
    } catch (error: any) {
      if (error?.code !== '23505') {
        throw error;
      }
    }
  }

  throw new Error('Failed to create affiliate code.');
}

async function applyAffiliateCommission(
  client: Pool | PoolClient,
  referredUserId: number,
  sourceType: 'win',
  sourceRef: string,
  baseAmount: number
) {
  const normalizedBase = normalizeCoins(baseAmount);
  if (normalizedBase <= 0) {
    return 0;
  }

  const referralResult = await client.query(
    `SELECT referred_by_user_id
     FROM users
     WHERE id = $1
       AND referred_by_user_id IS NOT NULL
     LIMIT 1`,
    [referredUserId]
  );

  if (!referralResult.rowCount) {
    return 0;
  }

  const referrerUserId = Number(referralResult.rows[0].referred_by_user_id);
  const commissionAmount = Math.max(1, Math.floor(normalizedBase * 0.01));

  try {
    await client.query(
      `INSERT INTO affiliate_commissions (
        referrer_user_id, referred_user_id, source_type, source_ref, base_amount, commission_amount
      )
      VALUES ($1, $2, $3, $4, $5, $6)`,
      [referrerUserId, referredUserId, sourceType, sourceRef, normalizedBase, commissionAmount]
    );
  } catch (error: any) {
    if (error?.code === '23505') {
      return 0;
    }
    throw error;
  }

  return commissionAmount;
}

async function getAffiliateOverview(client: Pool | PoolClient, userId: number): Promise<AffiliateOverview> {
  const codeResult = await client.query(
    `SELECT code
     FROM affiliate_codes
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  );

  const statsResult = await client.query(
    `SELECT
       COUNT(DISTINCT u.id)::int AS referred_users,
       COALESCE(SUM(ac.base_amount), 0)::bigint AS tracked_volume,
       COALESCE(SUM(ac.commission_amount), 0)::bigint AS total_commission,
       COALESCE(SUM(CASE WHEN ac.claimed_at IS NOT NULL THEN ac.commission_amount ELSE 0 END), 0)::bigint AS claimed_commission,
       COALESCE(SUM(CASE WHEN ac.claimed_at IS NULL THEN ac.commission_amount ELSE 0 END), 0)::bigint AS claimable_commission,
       COALESCE(SUM(CASE WHEN ac.source_type = 'win' THEN ac.commission_amount ELSE 0 END), 0)::bigint AS win_commission
     FROM users u
     LEFT JOIN affiliate_commissions ac ON ac.referrer_user_id = $1
     WHERE u.referred_by_user_id = $1`,
    [userId]
  );

  const recentResult = await client.query(
    `SELECT ac.id, u.username, ac.source_type, ac.base_amount, ac.commission_amount, ac.claimed_at, ac.created_at
     FROM affiliate_commissions ac
     JOIN users u ON u.id = ac.referred_user_id
     WHERE ac.referrer_user_id = $1
     ORDER BY ac.created_at DESC
     LIMIT 10`,
    [userId]
  );

  const referredAccountsResult = await client.query(
    `SELECT id, username, created_at
     FROM users
     WHERE referred_by_user_id = $1
     ORDER BY created_at DESC
     LIMIT 10`,
    [userId]
  );

  const code = codeResult.rowCount ? String(codeResult.rows[0].code) : null;
  const stats = statsResult.rows[0] || {};

  return {
    code,
    referralLink: code ? `${appBaseUrl}?ref=${encodeURIComponent(code)}` : null,
    referredUsers: Number(stats.referred_users || 0),
    trackedVolume: Number(stats.tracked_volume || 0),
    totalCommission: Number(stats.total_commission || 0),
    claimedCommission: Number(stats.claimed_commission || 0),
    claimableCommission: Number(stats.claimable_commission || 0),
    winCommission: Number(stats.win_commission || 0),
    recentCommissions: recentResult.rows.map((row) => ({
      id: Number(row.id),
      username: row.username,
      sourceType: row.source_type,
      baseAmount: Number(row.base_amount || 0),
      commissionAmount: Number(row.commission_amount || 0),
      claimedAt: row.claimed_at || null,
      createdAt: row.created_at,
    })),
    referredAccounts: referredAccountsResult.rows.map((row) => ({
      id: Number(row.id),
      username: row.username,
      createdAt: row.created_at,
    })),
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

async function ensureWallet(client: Pool | PoolClient, userId: number) {
  await client.query(
    `INSERT INTO wallets (user_id, balance, total_deposited, total_withdrawn, total_wagered)
     VALUES ($1, 0, 0, 0, 0)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );
}

async function getPrimaryOwnerId(client: Pool | PoolClient) {
  const result = await client.query(
    `SELECT id
     FROM users
     WHERE role = 'owner'
     ORDER BY id ASC
     LIMIT 1`
  );

  return result.rowCount ? Number(result.rows[0].id) : null;
}

function requireOwner(req: AuthedRequest, res: express.Response, next: express.NextFunction) {
  if (!req.auth?.user || req.auth.user.role !== 'owner') {
    return res.status(403).json({ error: 'Forbidden.' });
  }
  return next();
}

function requireStaff(req: AuthedRequest, res: express.Response, next: express.NextFunction) {
  if (!req.auth?.user || (req.auth.user.role !== 'owner' && req.auth.user.role !== 'moderator')) {
    return res.status(403).json({ error: 'Forbidden.' });
  }
  return next();
}

async function createSession(client: Pool | PoolClient, user: AuthUser, ipAddress?: string, userAgent?: string) {
  const token = signToken(user);
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await client.query(
    `INSERT INTO user_sessions (user_id, token_hash, ip_address, user_agent, expires_at, last_active_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [user.id, tokenHash, ipAddress || null, userAgent || null, expiresAt]
  );

  return token;
}

async function touchSessionActivity(client: Pool | PoolClient, userId: number, tokenHash: string) {
  await client.query(
    `UPDATE user_sessions
     SET last_active_at = NOW()
     WHERE user_id = $1
       AND token_hash = $2
       AND (expires_at IS NULL OR expires_at > NOW())`,
    [userId, tokenHash]
  );
}

async function getOnlineUserCount(client: Pool | PoolClient, windowMinutes = 5) {
  const result = await client.query(
    `SELECT COUNT(DISTINCT user_id)::int AS count
     FROM user_sessions
     WHERE (expires_at IS NULL OR expires_at > NOW())
       AND last_active_at >= NOW() - ($1::int * INTERVAL '1 minute')`,
    [windowMinutes]
  );

  return Number(result.rows[0]?.count || 0);
}

async function creditDepositIfNeeded(client: PoolClient, transactionId: number) {
  const transactionResult = await client.query(
    `SELECT id, user_id, payment_status, credited_at, price_amount, outcome_amount
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

  const coins = dollarsToCoins(tx.price_amount || 0);
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
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_user_id TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_username TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_display_name TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_avatar_url TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_verified_at TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_avatar_url TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_source TEXT NOT NULL DEFAULT 'custom'`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_oauth_state TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS affiliate_code_used TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS rakeback_claimed_total BIGINT NOT NULL DEFAULT 0`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS rakeback_claimed_instant BIGINT NOT NULL DEFAULT 0`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS rakeback_claimed_daily BIGINT NOT NULL DEFAULT 0`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS rakeback_claimed_weekly BIGINT NOT NULL DEFAULT 0`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS rakeback_claimed_monthly BIGINT NOT NULL DEFAULT 0`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS rakeback_last_claimed_daily TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS rakeback_last_claimed_weekly TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS rakeback_last_claimed_monthly TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_reward_streak INT NOT NULL DEFAULT 0`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_reward_last_claimed TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS xp_amount BIGINT NOT NULL DEFAULT 0`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS user_level INT NOT NULL DEFAULT 1`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS vip_claimed_levels TEXT NOT NULL DEFAULT ''`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_opt_in BOOLEAN NOT NULL DEFAULT true`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_roblox_user_id_unique ON users(roblox_user_id) WHERE roblox_user_id IS NOT NULL`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_discord_user_id_unique ON users(discord_user_id) WHERE discord_user_id IS NOT NULL`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS affiliate_codes (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      code TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS affiliate_commissions (
      id BIGSERIAL PRIMARY KEY,
      referrer_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      referred_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      source_type TEXT NOT NULL,
      source_ref TEXT NOT NULL,
      base_amount BIGINT NOT NULL,
      commission_amount BIGINT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (source_type, source_ref)
    )
  `);
  await pool.query(`ALTER TABLE affiliate_commissions ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS support_ticket_messages (
      id BIGSERIAL PRIMARY KEY,
      ticket_id BIGINT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
      user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      sender_type TEXT NOT NULL DEFAULT 'user',
      username TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE support_ticket_messages ADD COLUMN IF NOT EXISTS sender_type TEXT NOT NULL DEFAULT 'user'`);
  await pool.query(`ALTER TABLE support_ticket_messages ADD COLUMN IF NOT EXISTS username TEXT NOT NULL DEFAULT 'Support'`);
  await pool.query(`ALTER TABLE support_ticket_messages ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'`);

  await pool.query(
    `INSERT INTO support_ticket_messages (ticket_id, user_id, sender_type, username, role, message, created_at)
     SELECT st.id, st.user_id, 'user', u.username, COALESCE(u.role, 'user'), st.message, st.created_at
     FROM support_tickets st
     JOIN users u ON u.id = st.user_id
     WHERE NOT EXISTS (
       SELECT 1
       FROM support_ticket_messages stm
       WHERE stm.ticket_id = st.id
     )`
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS wallets (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      balance BIGINT NOT NULL DEFAULT 0,
      total_deposited BIGINT NOT NULL DEFAULT 0,
      total_withdrawn BIGINT NOT NULL DEFAULT 0,
      total_wagered BIGINT NOT NULL DEFAULT 0,
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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  await pool.query(`ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS ip_address TEXT`);
  await pool.query(`ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS user_agent TEXT`);
  await pool.query(`ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT FALSE`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_backup_codes TEXT[]`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_pending_secret TEXT`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS moderation_history (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      moderator_user_id BIGINT NOT NULL REFERENCES users(id),
      action TEXT NOT NULL,
      reason TEXT,
      duration_minutes INT,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      resolved_at TIMESTAMPTZ,
      resolved_by_user_id BIGINT REFERENCES users(id)
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_moderation_history_user_id ON moderation_history(user_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_moderation_history_moderator_id ON moderation_history(moderator_user_id)`);

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
      fee_amount BIGINT NOT NULL DEFAULT 0,
      net_amount BIGINT NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS fee_amount BIGINT NOT NULL DEFAULT 0`);
  await pool.query(`ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS net_amount BIGINT NOT NULL DEFAULT 0`);

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
    CREATE TABLE IF NOT EXISTS tip_notifications (
      id BIGSERIAL PRIMARY KEY,
      recipient_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sender_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      sender_username TEXT NOT NULL,
      amount NUMERIC(12,2) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      read_at TIMESTAMPTZ
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS custom_rains (
      id BIGSERIAL PRIMARY KEY,
      creator_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      creator_username TEXT NOT NULL,
      creator_avatar_url TEXT,
      pool_amount BIGINT NOT NULL,
      ends_at TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS custom_rain_participants (
      id BIGSERIAL PRIMARY KEY,
      custom_rain_id BIGINT NOT NULL REFERENCES custom_rains(id) ON DELETE CASCADE,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (custom_rain_id, user_id)
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS promo_codes (
      id BIGSERIAL PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      coin_amount BIGINT NOT NULL,
      max_uses INT NOT NULL DEFAULT 1,
      current_uses INT NOT NULL DEFAULT 0,
      expires_at TIMESTAMPTZ,
      created_by_user_id BIGINT REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS promo_code_claims (
      id BIGSERIAL PRIMARY KEY,
      promo_code_id BIGINT NOT NULL REFERENCES promo_codes(id),
      user_id BIGINT NOT NULL REFERENCES users(id),
      claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (promo_code_id, user_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS broadcasts (
      id BIGSERIAL PRIMARY KEY,
      message TEXT NOT NULL,
      created_by_user_id BIGINT REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ,
      is_active BOOLEAN NOT NULL DEFAULT TRUE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS rain_bot_schedules (
      id BIGSERIAL PRIMARY KEY,
      interval_minutes INT NOT NULL,
      min_pool_amount BIGINT NOT NULL DEFAULT 100,
      rain_amount BIGINT NOT NULL DEFAULT 500,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_by_user_id BIGINT REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_triggered_at TIMESTAMPTZ
    )
  `);

  await pool.query(`ALTER TABLE rain_bot_schedules ADD COLUMN IF NOT EXISTS rain_amount BIGINT NOT NULL DEFAULT 500`);
  await pool.query(`ALTER TABLE rain_bot_schedules ADD COLUMN IF NOT EXISTS last_triggered_at TIMESTAMPTZ`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pf_seeds (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      client_seed VARCHAR(64) NOT NULL,
      server_seed_hash VARCHAR(128) NOT NULL,
      server_seed_secret VARCHAR(128) NOT NULL,
      nonce INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_pf_seeds_user_id ON pf_seeds(user_id)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS jackpot_rounds (
      id BIGSERIAL PRIMARY KEY,
      total_pool BIGINT NOT NULL DEFAULT 0,
      status VARCHAR(16) NOT NULL DEFAULT 'active',
      winner_user_id BIGINT REFERENCES users(id),
      winner_seed VARCHAR(128),
      winner_nonce INT,
      starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ends_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS jackpot_participants (
      id BIGSERIAL PRIMARY KEY,
      round_id BIGINT NOT NULL REFERENCES jackpot_rounds(id) ON DELETE CASCADE,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount BIGINT NOT NULL,
      tickets INT NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(round_id, user_id)
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_jackpot_rounds_status ON jackpot_rounds(status)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_jackpot_participants_round_id ON jackpot_participants(round_id)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      theme VARCHAR(16) NOT NULL DEFAULT 'dark',
      sound_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      default_bet BIGINT NOT NULL DEFAULT 100,
      chat_notifications BOOLEAN NOT NULL DEFAULT TRUE,
      rain_notifications BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Create additional tables individually
  try { await pool.query(`CREATE TABLE IF NOT EXISTS friendships (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, friend_id)
  )`); } catch (e) { console.error('friendships table:', e.message); }

  try { await pool.query(`CREATE TABLE IF NOT EXISTS tournaments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    game_key VARCHAR(50),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    min_wager BIGINT NOT NULL DEFAULT 0,
    prize_pool BIGINT NOT NULL DEFAULT 0,
    max_participants INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'upcoming',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`); } catch (e) { console.error('tournaments table:', e.message); }

  try { await pool.query(`ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ NOT NULL DEFAULT NOW()`); } catch (e) {}
  try { await pool.query(`ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ NOT NULL DEFAULT NOW()`); } catch (e) {}

  try { await pool.query(`CREATE TABLE IF NOT EXISTS tournament_participants (
    id SERIAL PRIMARY KEY,
    tournament_id BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_wagered BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tournament_id, user_id)
  )`); } catch (e) { console.error('tournament_participants table:', e.message); }

  try { await pool.query(`CREATE TABLE IF NOT EXISTS tournament_prizes (
    id SERIAL PRIMARY KEY,
    tournament_id BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    amount BIGINT NOT NULL,
    UNIQUE(tournament_id, position)
  )`); } catch (e) { console.error('tournament_prizes table:', e.message); }

}

async function processRainBotSchedules() {
  try {
    const schedules = await pool.query(
      `SELECT * FROM rain_bot_schedules WHERE is_active = TRUE ORDER BY id ASC LIMIT 10`
    );

    for (const schedule of schedules.rows) {
      const now = new Date();
      const lastTriggered = schedule.last_triggered_at ? new Date(schedule.last_triggered_at) : null;
      const intervalMs = schedule.interval_minutes * 60 * 1000;

      if (lastTriggered && now.getTime() - lastTriggered.getTime() < intervalMs) {
        continue;
      }

      const rainResult = await pool.query(
        `SELECT COALESCE(SUM(pool_amount), 0)::bigint AS total_pool
         FROM rain_rounds
         WHERE status = 'active'
         LIMIT 1`
      );

      const currentPool = Number(rainResult.rows[0]?.total_pool || 0);

      if (currentPool < Number(schedule.min_pool_amount || 0)) {
        const addAmount = Number(schedule.rain_amount || DEFAULT_RAIN_POOL_COINS);
        const ownerId = await getPrimaryOwnerId(pool);

        if (ownerId) {
          await pool.query(
            `UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE user_id = $2 AND balance >= $1`,
            [addAmount, ownerId]
          );

          await pool.query(
            `UPDATE rain_rounds
             SET pool_amount = pool_amount + $1, updated_at = NOW()
             WHERE status = 'active'
             RETURNING id`,
            [addAmount]
          );
        }
      }

      await pool.query(
        `UPDATE rain_bot_schedules SET last_triggered_at = NOW() WHERE id = $1`,
        [schedule.id]
      );
    }
  } catch (error) {
    console.error('Rain bot error:', error);
  }
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
      `SELECT u.id, u.username, u.email, u.currency, u.avatar, u.custom_avatar_url, u.avatar_source, u.role,
              u.roblox_user_id, u.roblox_username, u.roblox_display_name, u.roblox_avatar_url, u.roblox_verified_at,
              u.discord_user_id, u.discord_username, u.discord_display_name, u.discord_avatar_url, u.discord_verified_at,
              u.totp_enabled
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

    await touchSessionActivity(pool, payload.id, tokenHash);

    req.auth = {
      token,
      tokenHash,
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
        if (authedUserId) {
          await touchSessionActivity(client, authedUserId, tokenHash);
        }
      } catch {
        authedUserId = null;
      }
    }

    await client.query('BEGIN');
    const roundRow = await ensureCurrentRainRound(client);
    const customRain = await getActiveCustomRain(client, authedUserId);

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
       LIMIT 100`
    );

    let tipNotifications: TipNotification[] = [];
    if (authedUserId) {
      const tipNotificationsResult = await client.query(
        `SELECT id, sender_username, amount, created_at
         FROM tip_notifications
         WHERE recipient_user_id = $1
           AND read_at IS NULL
         ORDER BY created_at ASC
         LIMIT 10`,
        [authedUserId]
      );

      tipNotifications = tipNotificationsResult.rows.map(mapTipNotification);

      if (tipNotifications.length > 0) {
        await client.query(
          `UPDATE tip_notifications
           SET read_at = NOW()
           WHERE id = ANY($1::bigint[])`,
          [tipNotifications.map((notification) => notification.id)]
        );
      }
    }

    const onlineCount = await getOnlineUserCount(client);

    let isStaff = false;
    if (authedUserId) {
      const staffCheck = await client.query(
        `SELECT role FROM users WHERE id = $1 LIMIT 1`,
        [authedUserId]
      );
      if (staffCheck.rowCount) {
        const role = staffCheck.rows[0].role;
        isStaff = role === 'owner' || role === 'moderator';
      }
    }

    let broadcastsQuery = `SELECT id, message, created_at, expires_at, is_active FROM broadcasts WHERE is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW())`;
    if (isStaff) {
      broadcastsQuery = `SELECT id, message, created_at, expires_at, is_active FROM broadcasts ORDER BY created_at DESC LIMIT 10`;
    }

    const broadcastsResult = await client.query(broadcastsQuery);

    await client.query('COMMIT');
    return res.json({
      messages: messagesResult.rows.reverse().map(mapChatMessage),
      rain: mapRainRound(roundRow, joined),
      customRain,
      tipNotifications,
      onlineCount,
      broadcasts: broadcastsResult.rows.map((row) => ({
        id: Number(row.id),
        message: row.message,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        isActive: Boolean(row.is_active),
      })),
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return res.status(500).json({ error: 'Failed to load chat room.' });
  } finally {
    client.release();
  }
});

// Site stats endpoint
app.get('/api/stats/site', async (_req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [onlineResult, wagerResult, biggestWinResult] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS count FROM user_sessions WHERE expires_at IS NULL OR expires_at > NOW()`),
      pool.query(`SELECT COALESCE(SUM(wager), 0)::bigint AS total FROM bet_activities WHERE created_at >= $1`, [today]),
      pool.query(`SELECT MAX(payout) AS biggest FROM bet_activities WHERE created_at >= $1 AND outcome = 'win' LIMIT 1`, [today])
    ]);
    
    return res.json({
      stats: {
        playersOnline: Number(onlineResult.rows[0]?.count || 0),
        totalWageredToday: Number(wagerResult.rows[0]?.total || 0),
        biggestWin: Number(biggestWinResult.rows[0]?.biggest || 0),
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    return res.status(500).json({ error: 'Failed to load stats' });
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

    // Check if user is muted
    const muteCheck = await pool.query(`
      SELECT 1 FROM moderation_history 
      WHERE user_id = $1 AND action = 'mute' 
        AND (expires_at IS NULL OR expires_at > NOW())
      LIMIT 1
    `, [req.auth!.user.id]);

    if (muteCheck.rowCount) {
      return res.status(403).json({ error: 'You are muted.' });
    }

    // Check if user is banned
    const banCheck = await pool.query(`
      SELECT 1 FROM moderation_history 
      WHERE user_id = $1 AND action = 'ban' 
        AND (expires_at IS NULL OR expires_at > NOW())
      LIMIT 1
    `, [req.auth!.user.id]);

    if (banCheck.rowCount) {
      return res.status(403).json({ error: 'You are banned.' });
    }

    const avatarUrl = resolvePreferredAvatar(req.auth!.user);
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

app.post('/api/rain/contribute', requireAuth, async (req: AuthedRequest, res) => {
  const client = await pool.connect();

  try {
    const amount = normalizeCoins(req.body.amount);
    if (amount <= 0) {
      return res.status(400).json({ error: 'Rain amount is required.' });
    }

    await client.query('BEGIN');
    await ensureWallet(client, req.auth!.user.id);

    const walletResult = await client.query(
      `UPDATE wallets
       SET balance = balance - $1,
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

    const roundRow = await ensureCurrentRainRound(client);
    const updatedRain = await client.query(
      `UPDATE rain_rounds
       SET pool_amount = pool_amount + $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, pool_amount, starts_at, join_opens_at, ends_at, status`,
      [amount, roundRow.id]
    );

    await client.query('COMMIT');
    return res.status(201).json({
      rain: mapRainRound({ ...updatedRain.rows[0], participant_count: roundRow.participant_count || 0 }, false),
      wallet: sanitizeWallet(walletResult.rows[0]),
      amount,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return res.status(500).json({ error: 'Failed to start rain.' });
  } finally {
    client.release();
  }
});

app.post('/api/custom-rain', requireAuth, async (req: AuthedRequest, res) => {
  const client = await pool.connect();

  try {
    const amount = normalizeCoins(req.body.amount);
    if (amount <= 0) {
      return res.status(400).json({ error: 'Custom rain amount is required.' });
    }

    await client.query('BEGIN');
    await settleFinishedCustomRains(client);
    const existingRain = await client.query(
      `SELECT id
       FROM custom_rains
       WHERE status = 'active'
       ORDER BY created_at DESC
       LIMIT 1`
    );

    if (existingRain.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'A custom rain is already active.' });
    }

    await ensureWallet(client, req.auth!.user.id);
    const walletResult = await client.query(
      `UPDATE wallets
       SET balance = balance - $1,
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

    const avatarUrl = resolvePreferredAvatar(req.auth!.user);
    const insertResult = await client.query(
      `INSERT INTO custom_rains (creator_user_id, creator_username, creator_avatar_url, pool_amount, ends_at, status)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '5 minutes', 'active')
       RETURNING id, creator_username, creator_avatar_url, pool_amount, ends_at, 0::int AS participant_count`,
      [req.auth!.user.id, req.auth!.user.username, avatarUrl, amount]
    );

    await client.query('COMMIT');
    return res.status(201).json({
      customRain: mapCustomRain(insertResult.rows[0], false),
      wallet: sanitizeWallet(walletResult.rows[0]),
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return res.status(500).json({ error: 'Failed to create custom rain.' });
  } finally {
    client.release();
  }
});

app.post('/api/custom-rain/join', requireAuth, async (req: AuthedRequest, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const activeRain = await getActiveCustomRain(client, req.auth!.user.id);
    if (!activeRain || activeRain.hasEnded) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No active custom rain found.' });
    }

    if (activeRain.joined) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'You already joined this custom rain.' });
    }

    await client.query(
      `INSERT INTO custom_rain_participants (custom_rain_id, user_id)
       VALUES ($1, $2)`,
      [activeRain.id, req.auth!.user.id]
    );

    const refreshed = await getActiveCustomRain(client, req.auth!.user.id);
    await client.query('COMMIT');
    return res.status(201).json({ customRain: refreshed });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return res.status(500).json({ error: 'Failed to join custom rain.' });
  } finally {
    client.release();
  }
});

app.post('/api/custom-rain/tip', requireAuth, async (req: AuthedRequest, res) => {
  const client = await pool.connect();

  try {
    const amount = normalizeCoins(req.body.amount);
    if (amount <= 0) {
      return res.status(400).json({ error: 'Tip amount is required.' });
    }

    await client.query('BEGIN');
    const activeRain = await getActiveCustomRain(client, req.auth!.user.id);
    if (!activeRain || activeRain.hasEnded) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No active custom rain found.' });
    }

    await ensureWallet(client, req.auth!.user.id);
    const walletResult = await client.query(
      `UPDATE wallets
       SET balance = balance - $1,
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

    await client.query(
      `UPDATE custom_rains
       SET pool_amount = pool_amount + $1,
           updated_at = NOW()
       WHERE id = $2`,
      [amount, activeRain.id]
    );

    const refreshed = await getActiveCustomRain(client, req.auth!.user.id);
    await client.query('COMMIT');
    return res.status(201).json({
      customRain: refreshed,
      wallet: sanitizeWallet(walletResult.rows[0]),
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return res.status(500).json({ error: 'Failed to tip custom rain.' });
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
    const affiliateCode = normalizeAffiliateCode(req.body.affiliateCode);
    const emailOptIn = Boolean(req.body.emailOptIn);

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
    const userResult = await client.query(
      `INSERT INTO users (username, email, password_hash, avatar, referred_by_user_id, affiliate_code_used, email_opt_in)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, username, email, currency, avatar, custom_avatar_url, avatar_source, role,
                 roblox_user_id, roblox_username, roblox_display_name, roblox_avatar_url, roblox_verified_at,
                 discord_user_id, discord_username, discord_display_name, discord_avatar_url, discord_verified_at`,
      [username, email, passwordHash, avatar, referredByUserId, affiliateCode || null, emailOptIn]
    );

    const user = sanitizeUser(userResult.rows[0]);

    await client.query(
      `INSERT INTO wallets (user_id, balance, total_deposited, total_withdrawn, total_wagered)
       VALUES ($1, 5, 0, 0, 0)`,
      [user.id]
    );

    const token = await createSession(client, user);
    const wallet = await getWallet(client, user.id);
    await ensureAffiliateCode(client, user.id, user.username);

    await client.query('COMMIT');

    if (emailOptIn) {
      sendWelcomeEmail(email, username).catch(console.error);
    }

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

    const inserted = await client.query(
      `INSERT INTO bet_activities (user_id, game_key, wager, payout, multiplier, outcome, detail)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [req.auth!.user.id, gameKey, wager, payout, multiplier || 0, outcome, detail || null]
    );

    await client.query(
      `UPDATE wallets SET total_wagered = total_wagered + $1, updated_at = NOW() WHERE user_id = $2`,
      [wager, req.auth!.user.id]
    );

    const rainUpdate = await addRainContributionFromWager(client, wager, payout, outcome);
    if (outcome === 'win' && payout > 0) {
      await applyAffiliateCommission(client, req.auth!.user.id, 'win', `bet:${inserted.rows[0]?.id || Date.now()}`, payout);
    }
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

app.get('/api/activity/bets/export', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const fromDate = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = req.query.to ? new Date(String(req.query.to)) : new Date();
    const gameKey = req.query.gameKey ? String(req.query.gameKey) : null;
    const format = String(req.query.format || 'json').toLowerCase();

    let query = `
      SELECT b.id, b.game_key, b.wager, b.payout, b.multiplier, b.outcome, b.created_at, b.detail
      FROM bet_activities b
      WHERE b.user_id = $1 AND b.created_at >= $2 AND b.created_at <= $3
    `;
    const params: any[] = [req.auth!.user.id, fromDate, toDate];

    if (gameKey) {
      params.push(gameKey);
      query += ` AND b.game_key = $${params.length}`;
    }

    query += ` ORDER BY b.created_at DESC LIMIT 10000`;

    const result = await pool.query(query, params);

    const bets = result.rows.map((row) => ({
      date: row.created_at,
      game: row.game_key,
      wager: (Number(row.wager || 0) / 100).toFixed(2),
      payout: (Number(row.payout || 0) / 100).toFixed(2),
      multiplier: Number(row.multiplier || 0).toFixed(4),
      outcome: row.outcome,
    }));

    if (format === 'csv') {
      const headers = ['Date', 'Game', 'Wager (USD)', 'Payout (USD)', 'Multiplier', 'Outcome'];
      const csvRows = [headers.join(',')];
      for (const bet of bets) {
        csvRows.push([
          bet.date,
          bet.game,
          bet.wager,
          bet.payout,
          bet.multiplier,
          bet.outcome,
        ].map(v => `"${v}"`).join(','));
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="bet-history-${new Date().toISOString().slice(0, 10)}.csv"`);
      return res.send(csvRows.join('\n'));
    }

    return res.json({ bets });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to export bet history.' });
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

app.get('/api/leaderboard', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         u.id,
         u.username,
         w.total_wagered
       FROM users u
       JOIN wallets w ON w.user_id = u.id
       WHERE w.total_wagered > 0
       ORDER BY w.total_wagered DESC, u.username ASC
       LIMIT 10`
    );

    return res.json({
      leaderboard: result.rows.map((row, index) => ({
        rank: index + 1,
        userId: Number(row.id),
        username: row.username,
        totalWagered: Number(row.total_wagered || 0),
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to load leaderboard.' });
  }
});

app.get('/api/rewards/daily/status', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT daily_reward_streak, daily_reward_last_claimed
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [req.auth!.user.id]
    );

    return res.json({ reward: getDailyRewardStatus(result.rows[0] || {}) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to load daily reward.' });
  }
});

app.post('/api/rewards/daily/claim', requireAuth, async (req: AuthedRequest, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      `SELECT daily_reward_streak, daily_reward_last_claimed
       FROM users
       WHERE id = $1
       FOR UPDATE`,
      [req.auth!.user.id]
    );

    if (!userResult.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found.' });
    }

    const reward = getDailyRewardStatus(userResult.rows[0]);
    if (!reward.canClaim) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Daily reward already claimed.' });
    }

    const now = new Date();
    const lastClaimedAt = userResult.rows[0]?.daily_reward_last_claimed ? new Date(userResult.rows[0].daily_reward_last_claimed) : null;
    const continuesStreak = lastClaimedAt !== null && getStartOfUtcDay(now) - getStartOfUtcDay(lastClaimedAt) === 24 * 60 * 60 * 1000;
    const nextStreak = continuesStreak ? Math.max(1, Number(userResult.rows[0].daily_reward_streak || 0) + 1) : 1;

    await ensureWallet(client, req.auth!.user.id);

    const walletResult = await client.query(
      `UPDATE wallets
       SET balance = balance + $1,
           updated_at = NOW()
       WHERE user_id = $2
       RETURNING balance, total_deposited, total_withdrawn`,
      [reward.rewardAmount, req.auth!.user.id]
    );

    await client.query(
      `UPDATE users
       SET daily_reward_streak = $1,
           daily_reward_last_claimed = NOW()
       WHERE id = $2`,
      [nextStreak, req.auth!.user.id]
    );

    await client.query('COMMIT');

    return res.json({
      reward: getDailyRewardStatus({ daily_reward_streak: nextStreak, daily_reward_last_claimed: now }),
      claimed: reward.rewardAmount,
      wallet: sanitizeWallet(walletResult.rows[0]),
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return res.status(500).json({ error: 'Failed to claim daily reward.' });
  } finally {
    client.release();
  }
});

app.get('/api/daily-claim/status', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT daily_reward_streak, daily_reward_last_claimed, xp_amount, user_level
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [req.auth!.user.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const row = result.rows[0];
    const lastClaimedAt = row?.daily_reward_last_claimed ? new Date(row.daily_reward_last_claimed) : null;
    const todayStart = getStartOfUtcDay(new Date());
    const lastStart = lastClaimedAt ? getStartOfUtcDay(lastClaimedAt) : null;
    const canClaim = lastStart === null || lastStart < todayStart;
    const currentStreak = Math.max(0, Number(row?.daily_reward_streak || 0));
    const nextStreak = canClaim ? (lastStart !== null && todayStart - lastStart === 24 * 60 * 60 * 1000 ? currentStreak + 1 : 1) : currentStreak || 1;
    const xp = Number(row?.xp_amount || 0);
    const levelInfo = calculateLevel(xp);

    const nextClaimAt = canClaim ? null : new Date(todayStart + 24 * 60 * 60 * 1000).toISOString();

    return res.json({
      canClaim,
      streak: nextStreak,
      lastClaimed: lastClaimedAt ? lastClaimedAt.toISOString() : null,
      nextClaimAt,
      level: levelInfo.level,
      xp,
      xpToNextLevel: levelInfo.xpToNextLevel,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to load daily claim status.' });
  }
});

app.post('/api/daily-claim', requireAuth, async (req: AuthedRequest, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      `SELECT daily_reward_streak, daily_reward_last_claimed, xp_amount
       FROM users
       WHERE id = $1
       FOR UPDATE`,
      [req.auth!.user.id]
    );

    if (!userResult.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found.' });
    }

    const row = userResult.rows[0];
    const lastClaimedAt = row?.daily_reward_last_claimed ? new Date(row.daily_reward_last_claimed) : null;
    const todayStart = getStartOfUtcDay(new Date());
    const lastStart = lastClaimedAt ? getStartOfUtcDay(lastClaimedAt) : null;
    const canClaim = lastStart === null || lastStart < todayStart;

    if (!canClaim) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Daily reward already claimed.' });
    }

    const currentStreak = Math.max(0, Number(row?.daily_reward_streak || 0));
    const continuesStreak = lastStart !== null && todayStart - lastStart === 24 * 60 * 60 * 1000;
    const nextStreak = continuesStreak ? currentStreak + 1 : 1;

    const { coins, xp: rewardXp } = calculateRewardForStreak(nextStreak);
    const currentXp = Number(row?.xp_amount || 0);
    const newXp = currentXp + rewardXp;
    const newLevelInfo = calculateLevel(newXp);

    await ensureWallet(client, req.auth!.user.id);

    const walletResult = await client.query(
      `UPDATE wallets
       SET balance = balance + $1,
           updated_at = NOW()
       WHERE user_id = $2
       RETURNING balance, total_deposited, total_withdrawn`,
      [coins, req.auth!.user.id]
    );

    await client.query(
      `UPDATE users
       SET daily_reward_streak = $1,
           daily_reward_last_claimed = NOW(),
           xp_amount = $2,
           user_level = $3
       WHERE id = $4`,
      [nextStreak, newXp, newLevelInfo.level, req.auth!.user.id]
    );

    await client.query('COMMIT');

    const nextClaimAt = new Date(todayStart + 24 * 60 * 60 * 1000).toISOString();

    return res.json({
      claimed: true,
      streak: nextStreak,
      amount: coins,
      xp: rewardXp,
      level: newLevelInfo.level,
      nextClaimAt,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return res.status(500).json({ error: 'Failed to claim daily reward.' });
  } finally {
    client.release();
  }
});

app.get('/api/affiliate/overview', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const overview = await getAffiliateOverview(pool, req.auth!.user.id);
    return res.json({ overview });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to load affiliate overview.' });
  }
});

app.get('/api/vip/overview', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT
         COALESCE(w.total_deposited, 0)::bigint AS total_deposited,
         COALESCE(w.total_wagered, 0)::bigint AS total_wagered,
         COALESCE((
           SELECT COUNT(*)
           FROM bet_activities b
           WHERE b.user_id = $1
         ), 0)::int AS total_bets,
         u.xp_amount,
         u.user_level,
         COALESCE(u.rakeback_claimed_total, 0)::bigint AS rakeback_claimed_total,
         COALESCE(u.rakeback_claimed_instant, 0)::bigint AS rakeback_claimed_instant,
         COALESCE(u.rakeback_claimed_daily, 0)::bigint AS rakeback_claimed_daily,
         COALESCE(u.rakeback_claimed_weekly, 0)::bigint AS rakeback_claimed_weekly,
         COALESCE(u.rakeback_claimed_monthly, 0)::bigint AS rakeback_claimed_monthly,
         u.rakeback_last_claimed_daily,
         u.rakeback_last_claimed_weekly,
         u.rakeback_last_claimed_monthly,
         COALESCE(u.vip_claimed_levels, '')::text AS vip_claimed_levels
       FROM users u
       LEFT JOIN wallets w ON w.user_id = u.id
       WHERE u.id = $1
       LIMIT 1`,
      [req.auth!.user.id]
    );

    const row = result.rows[0];
    const totalDeposited = Number(row?.total_deposited || 0);
    const totalWagered = Number(row?.total_wagered || 0);
    const totalBets = Number(row?.total_bets || 0);
    const xp = Number(row?.xp_amount || 0);
    const userLevel = Number(row?.user_level || 1);
    const rakebackClaimedTotal = Number(row?.rakeback_claimed_total || 0);
    const earnedRakeback = totalDeposited >= 1000 ? Math.floor(totalDeposited * 0.005) : 0;
    const buckets = getRakebackBuckets(earnedRakeback, row);
    const claimableRakeback =
      buckets.instant.claimable +
      buckets.daily.claimable +
      buckets.weekly.claimable +
      buckets.monthly.claimable;

    const levelInfo = calculateLevel(xp);
    const nextRewardLevel = levelInfo.level % 3 === 0 ? levelInfo.level : levelInfo.level + (3 - (levelInfo.level % 3));
    const nextRewardAmount = getVipRewardForLevel(nextRewardLevel);
    
    const claimedLevels = (row?.vip_claimed_levels || '').split(',').filter(Boolean).map(Number);
    const currentReward = getVipRewardForLevel(levelInfo.level);
    const canClaimReward = levelInfo.level % 3 === 0 && levelInfo.level > 0 && !claimedLevels.includes(levelInfo.level);

    return res.json({
      vip: {
        totalDeposited,
        totalWagered,
        totalBets,
        rakebackClaimedTotal,
        earnedRakeback,
        claimableRakeback,
        rakeback: buckets,
        level: levelInfo.level,
        xp: xp,
        xpToNextLevel: levelInfo.xpToNextLevel,
        nextRewardLevel,
        nextRewardAmount,
        currentReward,
        canClaimReward,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to load VIP overview.' });
  }
});

app.post('/api/vip/level-reward/claim', requireAuth, async (req: AuthedRequest, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await ensureWallet(client, req.auth!.user.id);
    
    const userResult = await client.query(
      `SELECT xp_amount, user_level, vip_claimed_levels FROM users WHERE id = $1 FOR UPDATE`,
      [req.auth!.user.id]
    );
    
    const row = userResult.rows[0];
    const xp = Number(row?.xp_amount || 0);
    const level = Number(row?.user_level || 1);
    const claimedLevels = (row?.vip_claimed_levels || '').split(',').filter(Boolean).map(Number);
    
    // Check if eligible for reward (every 3 levels)
    if (level % 3 !== 0 || level === 0 || claimedLevels.includes(level)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No reward available for this level.' });
    }
    
    const reward = getVipRewardForLevel(level);
    if (reward <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No reward available.' });
    }
    
    // Add reward to wallet
    await client.query(
      `UPDATE wallets SET balance = balance + $1::numeric, total_deposited = total_deposited + $1::numeric, updated_at = NOW() WHERE user_id = $2`,
      [reward, req.auth!.user.id]
    );
    
    // Mark level as claimed
    const newClaimedLevels = [...claimedLevels, level].join(',');
    await client.query(
      `UPDATE users SET vip_claimed_levels = $1 WHERE id = $2`,
      [newClaimedLevels, req.auth!.user.id]
    );
    
    await client.query('COMMIT');
    return res.json({ success: true, reward, level });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return res.status(500).json({ error: 'Failed to claim VIP reward.' });
  } finally {
    client.release();
  }
});

app.post('/api/vip/rakeback/claim', requireAuth, async (req: AuthedRequest, res) => {
  const client = await pool.connect();

  try {
    const period = String(req.body.period || 'instant').trim().toLowerCase() as RakebackPeriod;
    if (!['instant', 'daily', 'weekly', 'monthly'].includes(period)) {
      return res.status(400).json({ error: 'Invalid rakeback period.' });
    }

    await client.query('BEGIN');
    await ensureWallet(client, req.auth!.user.id);

    const result = await client.query(
      `SELECT
         COALESCE(w.total_deposited, 0)::bigint AS total_deposited,
         COALESCE(w.total_wagered, 0)::bigint AS total_wagered,
         COALESCE(u.rakeback_claimed_total, 0)::bigint AS rakeback_claimed_total,
         COALESCE(u.rakeback_claimed_instant, 0)::bigint AS rakeback_claimed_instant,
         COALESCE(u.rakeback_claimed_daily, 0)::bigint AS rakeback_claimed_daily,
         COALESCE(u.rakeback_claimed_weekly, 0)::bigint AS rakeback_claimed_weekly,
         COALESCE(u.rakeback_claimed_monthly, 0)::bigint AS rakeback_claimed_monthly,
         u.rakeback_last_claimed_daily,
         u.rakeback_last_claimed_weekly,
         u.rakeback_last_claimed_monthly
       FROM users u
       LEFT JOIN wallets w ON w.user_id = u.id
       WHERE u.id = $1
       LIMIT 1
       FOR UPDATE OF u`,
      [req.auth!.user.id]
    );

    const row = result.rows[0];
    const totalDeposited = Number(row?.total_deposited || 0);
    const totalWagered = Number(row?.total_wagered || 0);
    const earnedRakeback = Math.floor((totalDeposited + totalWagered) * 0.02);
    const buckets = getRakebackBuckets(earnedRakeback, row);
    const selectedBucket = buckets[period];

    if (!selectedBucket.claimable) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No rakeback available to claim.' });
    }
    if (!selectedBucket.canClaim) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This rakeback bucket is still on cooldown.' });
    }

    const claimedField = `rakeback_claimed_${period}`;
    const lastClaimedField = period === 'instant' ? null : `rakeback_last_claimed_${period}`;

    await client.query(
      `UPDATE users
       SET rakeback_claimed_total = rakeback_claimed_total + $1,
           ${claimedField} = ${claimedField} + $1
           ${lastClaimedField ? `, ${lastClaimedField} = NOW()` : ''}
       WHERE id = $2`,
      [selectedBucket.claimable, req.auth!.user.id]
    );

    const walletResult = await client.query(
      `UPDATE wallets
       SET balance = balance + $1,
           updated_at = NOW()
       WHERE user_id = $2
       RETURNING balance, total_deposited, total_withdrawn`,
      [selectedBucket.claimable, req.auth!.user.id]
    );

    if (!walletResult.rowCount) {
      throw new Error('Wallet not found during rakeback claim.');
    }

    await client.query('COMMIT');
    return res.json({
      claimed: selectedBucket.claimable,
      period,
      wallet: sanitizeWallet(walletResult.rows[0]),
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return res.status(500).json({ error: 'Failed to claim rakeback.' });
  } finally {
    client.release();
  }
});

app.post('/api/affiliate/code', requireAuth, async (req: AuthedRequest, res) => {
  const client = await pool.connect();

  try {
    const code = normalizeAffiliateCode(req.body.code);
    if (code.length < 4) {
      return res.status(400).json({ error: 'Affiliate code must be at least 4 characters.' });
    }

    await client.query('BEGIN');
    const existing = await client.query(
      `SELECT id
       FROM affiliate_codes
       WHERE code = $1
         AND user_id <> $2
       LIMIT 1`,
      [code, req.auth!.user.id]
    );

    if (existing.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Affiliate code is already taken.' });
    }

    await client.query(
      `INSERT INTO affiliate_codes (user_id, code)
       VALUES ($1, $2)
       ON CONFLICT (user_id)
       DO UPDATE SET code = EXCLUDED.code`,
      [req.auth!.user.id, code]
    );

    await client.query('COMMIT');
    const overview = await getAffiliateOverview(pool, req.auth!.user.id);
    return res.json({ overview });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return res.status(500).json({ error: 'Failed to save affiliate code.' });
  } finally {
    client.release();
  }
});

app.post('/api/affiliate/claim', requireAuth, async (req: AuthedRequest, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await ensureWallet(client, req.auth!.user.id);

    const claimableResult = await client.query(
      `SELECT COALESCE(SUM(commission_amount), 0)::bigint AS amount
       FROM affiliate_commissions
       WHERE referrer_user_id = $1
         AND claimed_at IS NULL`,
      [req.auth!.user.id]
    );

    const amount = Number(claimableResult.rows[0]?.amount || 0);
    if (amount <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No affiliate rewards available to claim.' });
    }

    await client.query(
      `UPDATE affiliate_commissions
       SET claimed_at = NOW()
       WHERE referrer_user_id = $1
         AND claimed_at IS NULL`,
      [req.auth!.user.id]
    );

    const walletResult = await client.query(
      `UPDATE wallets
       SET balance = balance + $1,
           updated_at = NOW()
       WHERE user_id = $2
       RETURNING balance, total_deposited, total_withdrawn`,
      [amount, req.auth!.user.id]
    );

    await client.query('COMMIT');
    return res.json({
      claimed: amount,
      wallet: sanitizeWallet(walletResult.rows[0]),
      overview: await getAffiliateOverview(pool, req.auth!.user.id),
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return res.status(500).json({ error: 'Failed to claim affiliate rewards.' });
  } finally {
    client.release();
  }
});

app.get('/api/support/tickets', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const ticketsResult = await pool.query(
      `SELECT st.id, st.user_id, u.username, st.subject, st.status, st.created_at, st.updated_at
       FROM support_tickets st
       JOIN users u ON u.id = st.user_id
       ORDER BY st.updated_at DESC, st.created_at DESC
       LIMIT 100`
    );

    const ticketIds = ticketsResult.rows.map((row) => Number(row.id));
    const messagesResult = ticketIds.length
      ? await pool.query(
          `SELECT id, ticket_id, user_id, sender_type, username, role, message, created_at
           FROM support_ticket_messages
           WHERE ticket_id = ANY($1::bigint[])
           ORDER BY created_at ASC`,
          [ticketIds]
        )
      : { rows: [] };

    return res.json({ tickets: buildSupportThreads(ticketsResult.rows, messagesResult.rows) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to load support tickets.' });
  }
});

app.post('/api/support/tickets', requireAuth, async (req: AuthedRequest, res) => {
  const client = await pool.connect();

  try {
    const subject = String(req.body.subject || '').trim();
    const message = String(req.body.message || '').trim();

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required.' });
    }

    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO support_tickets (user_id, subject, message, status, updated_at)
       VALUES ($1, $2, $3, 'open', NOW())
       RETURNING id, user_id, subject, status, created_at, updated_at`,
      [req.auth!.user.id, subject, message]
    );

    await client.query(
      `INSERT INTO support_ticket_messages (ticket_id, user_id, sender_type, username, role, message)
       VALUES ($1, $2, 'user', $3, $4, $5)`,
      [result.rows[0].id, req.auth!.user.id, req.auth!.user.username, req.auth!.user.role, message]
    );

    await client.query('COMMIT');
    return res.status(201).json({
      ticket: {
        id: Number(result.rows[0].id),
        userId: Number(result.rows[0].user_id),
        username: req.auth!.user.username,
        subject,
        status: result.rows[0].status,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at,
        messages: [
          {
            id: 0,
            ticketId: Number(result.rows[0].id),
            senderType: 'user',
            userId: req.auth!.user.id,
            username: req.auth!.user.username,
            role: req.auth!.user.role,
            message,
            createdAt: result.rows[0].created_at,
          },
        ],
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return res.status(500).json({ error: 'Failed to create support ticket.' });
  } finally {
    client.release();
  }
});

app.post('/api/support/tickets/:ticketId/reply', requireAuth, async (req: AuthedRequest, res) => {
  const client = await pool.connect();

  try {
    const ticketId = Number(req.params.ticketId);
    const message = String(req.body.message || '').trim();

    if (!Number.isFinite(ticketId) || ticketId <= 0 || !message) {
      return res.status(400).json({ error: 'Valid ticket and message are required.' });
    }

    await client.query('BEGIN');
    const ticketResult = await client.query(
      `SELECT id
       FROM support_tickets
       WHERE id = $1 AND user_id = $2
       LIMIT 1
       FOR UPDATE`,
      [ticketId, req.auth!.user.id]
    );

    if (!ticketResult.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Support ticket not found.' });
    }

    await client.query(
      `INSERT INTO support_ticket_messages (ticket_id, user_id, sender_type, username, role, message)
       VALUES ($1, $2, 'user', $3, $4, $5)`,
      [ticketId, req.auth!.user.id, req.auth!.user.username, req.auth!.user.role, message]
    );

    await client.query(
      `UPDATE support_tickets
       SET status = 'open',
           updated_at = NOW()
       WHERE id = $1`,
      [ticketId]
    );

    await client.query('COMMIT');
    return res.status(201).json({ ok: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return res.status(500).json({ error: 'Failed to reply to support ticket.' });
  } finally {
    client.release();
  }
});

app.get('/api/admin/support/tickets', requireAuth, requireOwner, async (_req: AuthedRequest, res) => {
  try {
    const ticketsResult = await pool.query(
      `SELECT st.id, st.user_id, u.username, st.subject, st.status, st.created_at, st.updated_at
       FROM support_tickets st
       JOIN users u ON u.id = st.user_id
       ORDER BY st.updated_at DESC, st.created_at DESC
       LIMIT 100`
    );

    const ticketIds = ticketsResult.rows.map((row) => Number(row.id));
    const messagesResult = ticketIds.length
      ? await pool.query(
          `SELECT id, ticket_id, user_id, sender_type, username, role, message, created_at
           FROM support_ticket_messages
           WHERE ticket_id = ANY($1::bigint[])
           ORDER BY created_at ASC`,
          [ticketIds]
        )
      : { rows: [] };

    return res.json({ tickets: buildSupportThreads(ticketsResult.rows, messagesResult.rows) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to load support inbox.' });
  }
});

app.post('/api/admin/support/tickets/:ticketId/reply', requireAuth, requireOwner, async (req: AuthedRequest, res) => {
  const client = await pool.connect();

  try {
    const ticketId = Number(req.params.ticketId);
    const message = String(req.body.message || '').trim();

    if (!Number.isFinite(ticketId) || ticketId <= 0 || !message) {
      return res.status(400).json({ error: 'Valid ticket and message are required.' });
    }

    await client.query('BEGIN');
    const ticketResult = await client.query(
      `SELECT id
       FROM support_tickets
       WHERE id = $1
       LIMIT 1
       FOR UPDATE`,
      [ticketId]
    );

    if (!ticketResult.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Support ticket not found.' });
    }

    await client.query(
      `INSERT INTO support_ticket_messages (ticket_id, user_id, sender_type, username, role, message)
       VALUES ($1, $2, 'admin', $3, $4, $5)`,
      [ticketId, req.auth!.user.id, req.auth!.user.username, req.auth!.user.role, message]
    );

    await client.query(
      `UPDATE support_tickets
       SET status = 'answered',
           updated_at = NOW()
       WHERE id = $1`,
      [ticketId]
    );

    await client.query('COMMIT');
    return res.status(201).json({ ok: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return res.status(500).json({ error: 'Failed to send support reply.' });
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
              password_hash, totp_enabled, totp_secret, totp_pending_secret
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

app.get('/api/2fa/setup', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const userId = req.auth!.user.id;

    const result = await pool.query(
      `SELECT totp_enabled, totp_secret FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );

    if (result.rows[0]?.totp_enabled) {
      return res.status(400).json({ error: '2FA is already enabled.' });
    }

    const secret = generateTotpSecret();
    await pool.query(`UPDATE users SET totp_pending_secret = $1 WHERE id = $2`, [secret, userId]);

    const qrCodeUrl = `otpauth://totp/Pasus:${encodeURIComponent(req.auth!.user.username)}?secret=${secret}&issuer=Pasus`;

    return res.json({ secret, qrCodeUrl });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to setup 2FA.' });
  }
});

app.post('/api/2fa/verify-setup', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const userId = req.auth!.user.id;
    const code = String(req.body.code || '').trim();

    if (!code || code.length !== 6) {
      return res.status(400).json({ error: 'Invalid 2FA code.' });
    }

    const secretResult = await pool.query(`SELECT totp_pending_secret FROM users WHERE id = $1 LIMIT 1`, [userId]);
    const secret = secretResult.rows[0]?.totp_pending_secret;
    if (!secret) {
      return res.status(400).json({ error: 'No pending 2FA setup. Please request a new setup first.' });
    }

    if (!verifyTotpCode(secret, code)) {
      return res.status(401).json({ error: 'Invalid 2FA code.' });
    }

    const backupCodes: string[] = [];
    for (let i = 0; i < 8; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      backupCodes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
    }

    await pool.query(
      `UPDATE users SET totp_secret = $1, totp_enabled = TRUE, totp_pending_secret = NULL, totp_backup_codes = $2 WHERE id = $3`,
      [secret, backupCodes, userId]
    );

    const result = await pool.query(
      `SELECT id, username, email, currency, avatar, custom_avatar_url, avatar_source, role,
              roblox_user_id, roblox_username, roblox_display_name, roblox_avatar_url, roblox_verified_at,
              discord_user_id, discord_username, discord_display_name, discord_avatar_url, discord_verified_at,
              totp_enabled
       FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );

    return res.json({ user: sanitizeUser(result.rows[0]), backupCodes });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to enable 2FA.' });
  }
});

app.post('/api/2fa/disable', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const userId = req.auth!.user.id;
    const code = String(req.body.code || '').trim();

    if (!code || code.length !== 6) {
      return res.status(400).json({ error: 'Invalid 2FA code.' });
    }

    const result = await pool.query(
      `SELECT totp_enabled, totp_secret FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );

    if (!result.rows[0]?.totp_enabled || !result.rows[0]?.totp_secret) {
      return res.status(400).json({ error: '2FA is not enabled.' });
    }

    if (!verifyTotpCode(result.rows[0].totp_secret, code)) {
      return res.status(401).json({ error: 'Invalid 2FA code.' });
    }

    await pool.query(
      `UPDATE users SET totp_secret = NULL, totp_enabled = FALSE, totp_backup_codes = NULL WHERE id = $1`,
      [userId]
    );

    const updated = await pool.query(
      `SELECT id, username, email, currency, avatar, custom_avatar_url, avatar_source, role,
              roblox_user_id, roblox_username, roblox_display_name, roblox_avatar_url, roblox_verified_at,
              discord_user_id, discord_username, discord_display_name, discord_avatar_url, discord_verified_at,
              totp_enabled
       FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );

    return res.json({ user: sanitizeUser(updated.rows[0]) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to disable 2FA.' });
  }
});

app.get('/api/2fa/status', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT totp_enabled FROM users WHERE id = $1 LIMIT 1`,
      [req.auth!.user.id]
    );
    return res.json({ enabled: Boolean(result.rows[0]?.totp_enabled) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to check 2FA status.' });
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

app.patch('/api/account/preferences', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const nextCurrency = typeof req.body.currency === 'string' ? req.body.currency.trim().toUpperCase() : req.auth!.user.currency;
    const nextAvatarSource = typeof req.body.avatarSource === 'string' ? req.body.avatarSource.trim().toLowerCase() : req.auth!.user.avatarSource || 'custom';
    const customAvatarUrlInput = typeof req.body.customAvatarUrl === 'string' ? req.body.customAvatarUrl.trim() : req.auth!.user.customAvatarUrl || '';

    if (!['USD', 'EUR', 'GBP', 'JPY', 'CAD'].includes(nextCurrency)) {
      return res.status(400).json({ error: 'Unsupported currency.' });
    }

    if (!['custom', 'roblox', 'discord'].includes(nextAvatarSource)) {
      return res.status(400).json({ error: 'Unsupported avatar source.' });
    }

    if ((nextAvatarSource === 'roblox' && !req.auth!.user.robloxAvatarUrl) || (nextAvatarSource === 'discord' && !req.auth!.user.discordAvatarUrl)) {
      return res.status(400).json({ error: 'That avatar source is not connected.' });
    }

    let customAvatarUrl: string | null = customAvatarUrlInput || null;
    if (customAvatarUrl) {
      try {
        const parsed = new URL(customAvatarUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          throw new Error('invalid');
        }
      } catch {
        return res.status(400).json({ error: 'Custom avatar URL must be a valid http or https URL.' });
      }
    }

    const update = await pool.query(
      `UPDATE users
       SET currency = $1,
           avatar_source = $2,
           custom_avatar_url = $3
       WHERE id = $4
       RETURNING id, username, email, currency, avatar, custom_avatar_url, avatar_source, role,
                 roblox_user_id, roblox_username, roblox_display_name, roblox_avatar_url, roblox_verified_at,
                 discord_user_id, discord_username, discord_display_name, discord_avatar_url, discord_verified_at`,
      [nextCurrency, nextAvatarSource, customAvatarUrl, req.auth!.user.id]
    );

    return res.json({ user: sanitizeUser(update.rows[0]) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to save preferences.' });
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

app.get('/api/discord/link/status', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT discord_user_id, discord_username, discord_display_name, discord_avatar_url, discord_verified_at
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [req.auth!.user.id]
    );

    const row = result.rows[0] || {};
    return res.json({
      discord: {
        userId: row.discord_user_id || null,
        username: row.discord_username || null,
        displayName: row.discord_display_name || null,
        avatarUrl: row.discord_avatar_url || null,
        verifiedAt: row.discord_verified_at || null,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to load Discord link status.' });
  }
});

app.get('/api/discord/link/start', requireAuth, async (req: AuthedRequest, res) => {
  try {
    if (!discordClientId || !discordClientSecret) {
      return res.status(400).json({ error: 'Discord OAuth is not configured.' });
    }

    const state = crypto.randomBytes(16).toString('hex');
    await pool.query(
      `UPDATE users
       SET discord_oauth_state = $1
       WHERE id = $2`,
      [state, req.auth!.user.id]
    );

    const params = new URLSearchParams();
    params.set('client_id', discordClientId);
    params.set('response_type', 'code');
    params.set('redirect_uri', discordRedirectUri);
    params.set('scope', 'identify');
    params.set('state', state);
    return res.json({ url: `https://discord.com/oauth2/authorize?${params.toString()}` });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to start Discord link.' });
  }
});

app.get('/api/discord/connect/callback', async (req, res) => {
  const code = String(req.query.code || '');
  const state = String(req.query.state || '');

  if (!code || !state) {
    return res.redirect(`${appBaseUrl}?connections=discord-error`);
  }

  try {
    const userResult = await pool.query(
      `SELECT id
       FROM users
       WHERE discord_oauth_state = $1
       LIMIT 1`,
      [state]
    );

    if (!userResult.rowCount) {
      return res.redirect(`${appBaseUrl}?connections=discord-error`);
    }

    const appUserId = Number(userResult.rows[0].id);
    const tokenPayload = await fetchDiscordAccessToken(code);
    const discordProfile = await fetchDiscordProfile(String(tokenPayload.access_token || ''));

    const conflict = await pool.query(
      `SELECT id
       FROM users
       WHERE discord_user_id = $1
         AND id <> $2
       LIMIT 1`,
      [discordProfile.id, appUserId]
    );

    if (conflict.rowCount) {
      return res.redirect(`${appBaseUrl}?connections=discord-taken`);
    }

    await pool.query(
      `UPDATE users
       SET discord_user_id = $1,
           discord_username = $2,
           discord_display_name = $3,
           discord_avatar_url = $4,
           discord_verified_at = NOW(),
           discord_oauth_state = NULL
       WHERE id = $5`,
      [discordProfile.id, discordProfile.username, discordProfile.displayName, discordProfile.avatarUrl || null, appUserId]
    );

    return res.redirect(`${appBaseUrl}?connections=discord-linked`);
  } catch (error) {
    console.error(error);
    return res.redirect(`${appBaseUrl}?connections=discord-error`);
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
       RETURNING id, username, email, currency, avatar, custom_avatar_url, avatar_source, role,
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
      [req.auth!.user.id, req.auth!.tokenHash]
    );

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to log out.' });
  }
});

app.get('/api/sessions', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT id, ip_address, user_agent, created_at, last_active_at, expires_at
       FROM user_sessions
       WHERE user_id = $1 AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY last_active_at DESC`,
      [req.auth!.user.id]
    );

    const sessions = result.rows.map((row) => ({
      id: Number(row.id),
      ipAddress: maskIp(row.ip_address || 'Unknown'),
      ipAddressRaw: row.ip_address,
      deviceType: getDeviceType(row.user_agent || ''),
      userAgent: row.user_agent,
      createdAt: row.created_at,
      lastActiveAt: row.last_active_at,
      expiresAt: row.expires_at,
      isCurrent: row.token_hash === req.auth!.tokenHash,
    }));

    const currentSessionId = result.rows.find(r => r.token_hash === req.auth!.tokenHash)?.id;

    return res.json({ sessions, currentSessionId });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to load sessions.' });
  }
});

app.delete('/api/sessions/:id', requireAuth, async (req: AuthedRequest, res) => {
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

app.delete('/api/sessions', requireAuth, async (req: AuthedRequest, res) => {
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

    const MAX_BALANCE = 99999999999999;

    await ensureWallet(pool, req.auth!.user.id);

    const current = await pool.query(
      `SELECT balance FROM wallets WHERE user_id = $1`,
      [req.auth!.user.id]
    );
    if (!current.rowCount) {
      return res.status(400).json({ error: 'Wallet not found.' });
    }

    const currentBalance = Number(current.rows[0].balance);
    if (delta > 0 && currentBalance + delta > MAX_BALANCE) {
      return res.status(400).json({ error: `Balance cannot exceed ${MAX_BALANCE.toLocaleString()}.` });
    }

    let result;
    if (delta > 0) {
      result = await pool.query(
        `UPDATE wallets
         SET balance = balance + $1::numeric,
             updated_at = NOW()
         WHERE user_id = $2
         RETURNING balance::text AS balance,
                   total_deposited::text AS total_deposited,
                   total_withdrawn::text AS total_withdrawn`,
        [delta, req.auth!.user.id]
      );
    } else {
      result = await pool.query(
        `UPDATE wallets
         SET balance = balance + $1::numeric,
             total_withdrawn = total_withdrawn + (-$1::numeric),
             updated_at = NOW()
         WHERE user_id = $2
           AND balance >= (-$1::numeric)
         RETURNING balance::text AS balance,
                   total_deposited::text AS total_deposited,
                   total_withdrawn::text AS total_withdrawn`,
        [delta, req.auth!.user.id]
      );
    }

    if (!result.rowCount) {
      return res.status(400).json({ error: delta < 0 ? 'Insufficient balance.' : 'Wallet not found.' });
    }

    return res.json({ wallet: sanitizeWallet(result.rows[0]) });
  } catch (error) {
    const err = error as Error;
    console.error('Wallet adjust error:', err.message, err.stack);
    return res.status(500).json({ error: 'Failed to update wallet.', details: err.message });
  }
});

app.post('/api/promo/claim', requireAuth, async (req: AuthedRequest, res) => {
  const client = await pool.connect();

  try {
    const code = String(req.body.code || '').trim().toUpperCase();
    if (!code) {
      return res.status(400).json({ error: 'Promo code is required.' });
    }

    await client.query('BEGIN');

    const promoResult = await client.query(
      `SELECT id, code, coin_amount, max_uses, current_uses, expires_at
       FROM promo_codes
       WHERE UPPER(code) = $1
       LIMIT 1
       FOR UPDATE`,
      [code]
    );

    if (!promoResult.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Promo code not found.' });
    }

    const promo = promoResult.rows[0];

    if (promo.expires_at && new Date(promo.expires_at).getTime() < Date.now()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This promo code has expired.' });
    }

    if (promo.current_uses >= promo.max_uses) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This promo code has reached its usage limit.' });
    }

    const claimCheck = await client.query(
      `SELECT 1 FROM promo_code_claims WHERE promo_code_id = $1 AND user_id = $2 LIMIT 1`,
      [promo.id, req.auth!.user.id]
    );

    if (claimCheck.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'You have already claimed this promo code.' });
    }

    await client.query(
      `INSERT INTO promo_code_claims (promo_code_id, user_id)
       VALUES ($1, $2)`,
      [promo.id, req.auth!.user.id]
    );

    await client.query(
      `UPDATE promo_codes SET current_uses = current_uses + 1 WHERE id = $1`,
      [promo.id]
    );

    const coinAmount = Number(promo.coin_amount);
    await ensureWallet(client, req.auth!.user.id);
    const walletResult = await client.query(
      `UPDATE wallets
       SET balance = balance + $1,
           updated_at = NOW()
       WHERE user_id = $2
       RETURNING balance, total_deposited, total_withdrawn`,
      [coinAmount, req.auth!.user.id]
    );

    await client.query('COMMIT');
    return res.json({
      success: true,
      amount: coinAmount,
      message: `You received $${formatCoinsLabel(coinAmount)}!`,
      wallet: sanitizeWallet(walletResult.rows[0]),
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return res.status(500).json({ error: 'Failed to claim promo code.' });
  } finally {
    client.release();
  }
});

app.post('/api/admin/promo/create', requireAuth, requireOwner, async (req: AuthedRequest, res) => {
  try {
    const code = String(req.body.code || '').trim().toUpperCase();
    const coinAmount = normalizeCoins(req.body.coinAmount);
    const maxUses = Math.max(1, Math.min(1000000, Number(req.body.maxUses) || 1));
    const expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : null;

    if (!code || code.length < 3 || code.length > 32) {
      return res.status(400).json({ error: 'Promo code must be between 3 and 32 characters.' });
    }

    if (coinAmount <= 0) {
      return res.status(400).json({ error: 'Coin amount must be greater than 0.' });
    }

    const result = await pool.query(
      `INSERT INTO promo_codes (code, coin_amount, max_uses, expires_at, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, code`,
      [code, coinAmount, maxUses, expiresAt, req.auth!.user.id]
    );

    return res.status(201).json({ id: Number(result.rows[0].id), code: result.rows[0].code });
  } catch (error: any) {
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'This promo code already exists.' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Failed to create promo code.' });
  }
});

app.get('/api/admin/promo/list', requireAuth, requireOwner, async (_req: AuthedRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.code, p.coin_amount, p.max_uses, p.current_uses, p.expires_at, p.created_at, u.username as created_by
       FROM promo_codes p
       LEFT JOIN users u ON u.id = p.created_by_user_id
       ORDER BY p.created_at DESC
       LIMIT 100`
    );

    return res.json({
      promos: result.rows.map((row) => ({
        id: Number(row.id),
        code: row.code,
        coinAmount: Number(row.coin_amount || 0),
        maxUses: Number(row.max_uses || 1),
        currentUses: Number(row.current_uses || 0),
        expiresAt: row.expires_at,
        createdAt: row.created_at,
        createdBy: row.created_by || 'System',
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to load promo codes.' });
  }
});

app.get('/api/broadcasts', async (req: AuthedRequest, res) => {
  try {
    let isStaff = false;
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';

    if (token) {
      try {
        const payload = jwt.verify(token, jwtSecret) as { id: number };
        const sessionResult = await pool.query(
          `SELECT u.role FROM user_sessions s JOIN users u ON u.id = s.user_id WHERE s.user_id = $1 LIMIT 1`,
          [payload.id]
        );
        if (sessionResult.rowCount) {
          const role = sessionResult.rows[0].role;
          isStaff = role === 'owner' || role === 'moderator';
        }
      } catch {
        isStaff = false;
      }
    }

    let query = `SELECT id, message, created_at, expires_at, is_active FROM broadcasts WHERE 1=1`;
    if (!isStaff) {
      query += ` AND is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW())`;
    }
    query += ` ORDER BY created_at DESC LIMIT 10`;

    const result = await pool.query(query);
    return res.json({
      broadcasts: result.rows.map((row) => ({
        id: Number(row.id),
        message: row.message,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        isActive: Boolean(row.is_active),
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to load broadcasts.' });
  }
});

app.post('/api/admin/broadcast/create', requireAuth, requireStaff, async (req: AuthedRequest, res) => {
  try {
    const message = String(req.body.message || '').trim();
    const expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : null;

    if (!message || message.length < 3 || message.length > 500) {
      return res.status(400).json({ error: 'Message must be between 3 and 500 characters.' });
    }

    const result = await pool.query(
      `INSERT INTO broadcasts (message, created_by_user_id, expires_at)
       VALUES ($1, $2, $3)
       RETURNING id, message, created_at, expires_at, is_active`,
      [message, req.auth!.user.id, expiresAt]
    );

    const row = result.rows[0];
    return res.status(201).json({
      broadcast: {
        id: Number(row.id),
        message: row.message,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        isActive: Boolean(row.is_active),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to create broadcast.' });
  }
});

app.post('/api/admin/broadcast/:id/toggle', requireAuth, requireStaff, async (req: AuthedRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid broadcast ID.' });
    }

    const result = await pool.query(
      `UPDATE broadcasts SET is_active = NOT is_active WHERE id = $1 RETURNING id, message, created_at, expires_at, is_active`,
      [id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: 'Broadcast not found.' });
    }

    const row = result.rows[0];
    return res.json({
      broadcast: {
        id: Number(row.id),
        message: row.message,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        isActive: Boolean(row.is_active),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to toggle broadcast.' });
  }
});

app.post('/api/chat/tip', requireAuth, async (req: AuthedRequest, res) => {
  const client = await pool.connect();

  try {
    const username = String(req.body.username || '').trim();
    const amount = normalizeCoins(req.body.amount);

    if (!username || amount <= 0) {
      return res.status(400).json({ error: 'Username and amount are required.' });
    }

    await client.query('BEGIN');

    const recipientResult = await client.query(
      `SELECT id, username, avatar, roblox_avatar_url, discord_avatar_url
       FROM users
       WHERE LOWER(username) = LOWER($1)
       LIMIT 1`,
      [username]
    );

    if (!recipientResult.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found.' });
    }

    const recipient = recipientResult.rows[0];
    if (Number(recipient.id) === req.auth!.user.id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'You cannot tip yourself.' });
    }

    const senderWallet = await client.query(
      `UPDATE wallets
       SET balance = balance - $1,
           updated_at = NOW()
       WHERE user_id = $2
         AND balance >= $1
       RETURNING balance, total_deposited, total_withdrawn`,
      [amount, req.auth!.user.id]
    );

    if (!senderWallet.rowCount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient balance.' });
    }

    await client.query(
      `UPDATE wallets
       SET balance = balance + $1,
           updated_at = NOW()
       WHERE user_id = $2`,
      [amount, recipient.id]
    );

    await client.query(
      `INSERT INTO tip_notifications (recipient_user_id, sender_user_id, sender_username, amount)
       VALUES ($1, $2, $3, $4)`,
      [recipient.id, req.auth!.user.id, req.auth!.user.username, amount]
    );

    await client.query(
      `INSERT INTO chat_messages (user_id, username, text, tone, role, avatar_url)
       VALUES ($1, $2, $3, 'win', $4, $5)`,
      [
        req.auth!.user.id,
        req.auth!.user.username,
        `tipped ${recipient.username} ${formatCoinsLabel(amount)}`,
        req.auth!.user.role,
        resolvePreferredAvatar(req.auth!.user),
      ]
    );

    await client.query('COMMIT');
    return res.status(201).json({
      wallet: sanitizeWallet(senderWallet.rows[0]),
      recipient: {
        username: recipient.username,
      },
      amount,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return res.status(500).json({ error: 'Failed to send tip.' });
  } finally {
    client.release();
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

    if (priceAmount < MIN_DEPOSIT_USD) {
      return res.status(400).json({ error: `Minimum deposit is $${MIN_DEPOSIT_USD.toFixed(2)}.` });
    }

    if (!nowPaymentsApiKey) {
      return res.status(500).json({ error: 'NOWPayments API key is not configured.' });
    }

    const orderId = `pasus-${req.auth!.user.id}-${Date.now()}`;
    const callbackUrl = `${apiBaseUrl.replace(/\/$/, '')}/api/payments/nowpayments/ipn`;
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
    await ensureWallet(client, req.auth!.user.id);

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

    const feeAmount = Math.max(1, Math.floor(amount * 0.05));
    const netAmount = Math.max(0, amount - feeAmount);
    const ownerUserId = await getPrimaryOwnerId(client);

    if (ownerUserId) {
      await ensureWallet(client, ownerUserId);
      await client.query(
        `UPDATE wallets
         SET balance = balance + $1,
             updated_at = NOW()
         WHERE user_id = $2`,
        [feeAmount, ownerUserId]
      );
    }

    const requestResult = await client.query(
      `INSERT INTO withdrawal_requests (user_id, currency, address, amount, fee_amount, net_amount)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, status, created_at, amount, fee_amount, net_amount`,
      [req.auth!.user.id, currency, address, amount, feeAmount, netAmount]
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

app.get('/api/admin/moderation/history', requireAuth, requireStaff, async (req: AuthedRequest, res) => {
  try {
    const userIdFilter = req.query.userId ? Number(req.query.userId) : null;
    const actionFilter = req.query.action ? String(req.query.action) : null;
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));

    let query = `
      SELECT mh.id, mh.user_id, mh.moderator_user_id, mh.action, mh.reason, mh.duration_minutes,
             mh.expires_at, mh.created_at, mh.resolved_at, mh.resolved_by_user_id,
             u.username, mu.username as moderator_username, ru.username as resolver_username
      FROM moderation_history mh
      JOIN users u ON u.id = mh.user_id
      JOIN users mu ON mu.id = mh.moderator_user_id
      LEFT JOIN users ru ON ru.id = mh.resolved_by_user_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (userIdFilter) {
      params.push(userIdFilter);
      query += ` AND mh.user_id = $${params.length}`;
    }

    if (actionFilter) {
      params.push(actionFilter);
      query += ` AND mh.action = $${params.length}`;
    }

    params.push(limit);
    query += ` ORDER BY mh.created_at DESC LIMIT $${params.length}`;

    const result = await pool.query(query, params);

    return res.json({
      history: result.rows.map((row) => ({
        id: Number(row.id),
        userId: Number(row.user_id),
        username: row.username,
        moderatorUserId: Number(row.moderator_user_id),
        moderatorUsername: row.moderator_username,
        action: row.action,
        reason: row.reason,
        durationMinutes: row.duration_minutes,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
        resolvedAt: row.resolved_at,
        resolvedByUserId: row.resolved_by_user_id ? Number(row.resolved_by_user_id) : null,
        resolverUsername: row.resolver_username,
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to load moderation history.' });
  }
});

app.post('/api/admin/moderation/ban', requireAuth, requireStaff, async (req: AuthedRequest, res) => {
  const client = await pool.connect();

  try {
    const userId = Number(req.body.userId);
    const reason = String(req.body.reason || '').trim();
    const durationMinutes = req.body.durationMinutes ? Number(req.body.durationMinutes) : null;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required.' });
    }

    const targetResult = await client.query(`SELECT id FROM users WHERE id = $1 LIMIT 1`, [userId]);
    if (!targetResult.rowCount) {
      return res.status(404).json({ error: 'User not found.' });
    }

    await client.query('BEGIN');

    const expiresAt = durationMinutes ? new Date(Date.now() + durationMinutes * 60000) : null;

    const historyResult = await client.query(
      `INSERT INTO moderation_history (user_id, moderator_user_id, action, reason, duration_minutes, expires_at)
       VALUES ($1, $2, 'ban', $3, $4, $5)
       RETURNING id, created_at`,
      [userId, req.auth!.user.id, reason || null, durationMinutes, expiresAt]
    );

    await client.query(
      `DELETE FROM user_sessions WHERE user_id = $1`,
      [userId]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      id: Number(historyResult.rows[0].id),
      userId,
      moderatorUserId: req.auth!.user.id,
      action: 'ban',
      reason,
      durationMinutes,
      expiresAt,
      createdAt: historyResult.rows[0].created_at,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return res.status(500).json({ error: 'Failed to ban user.' });
  } finally {
    client.release();
  }
});

app.post('/api/admin/moderation/mute', requireAuth, requireStaff, async (req: AuthedRequest, res) => {
  const client = await pool.connect();

  try {
    const userId = Number(req.body.userId);
    const reason = String(req.body.reason || '').trim();
    const durationMinutes = req.body.durationMinutes ? Number(req.body.durationMinutes) : null;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required.' });
    }

    const targetResult = await client.query(`SELECT id FROM users WHERE id = $1 LIMIT 1`, [userId]);
    if (!targetResult.rowCount) {
      return res.status(404).json({ error: 'User not found.' });
    }

    await client.query('BEGIN');

    const expiresAt = durationMinutes ? new Date(Date.now() + durationMinutes * 60000) : null;

    const historyResult = await client.query(
      `INSERT INTO moderation_history (user_id, moderator_user_id, action, reason, duration_minutes, expires_at)
       VALUES ($1, $2, 'mute', $3, $4, $5)
       RETURNING id, created_at`,
      [userId, req.auth!.user.id, reason || null, durationMinutes, expiresAt]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      id: Number(historyResult.rows[0].id),
      userId,
      moderatorUserId: req.auth!.user.id,
      action: 'mute',
      reason,
      durationMinutes,
      expiresAt,
      createdAt: historyResult.rows[0].created_at,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return res.status(500).json({ error: 'Failed to mute user.' });
  } finally {
    client.release();
  }
});

app.get('/api/moderation/my-history', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT mh.id, mh.action, mh.reason, mh.duration_minutes, mh.expires_at, mh.created_at, mh.resolved_at,
              mu.username as moderator_username
       FROM moderation_history mh
       JOIN users mu ON mu.id = mh.moderator_user_id
       WHERE mh.user_id = $1
       ORDER BY mh.created_at DESC
       LIMIT 50`,
      [req.auth!.user.id]
    );

    return res.json({
      history: result.rows.map((row) => ({
        id: Number(row.id),
        action: row.action,
        reason: row.reason,
        durationMinutes: row.duration_minutes,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
        resolvedAt: row.resolved_at,
        moderatorUsername: row.moderator_username,
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to load moderation history.' });
  }
});

app.get('/api/admin/overview', requireAuth, requireOwner, async (_req: AuthedRequest, res) => {
  try {
    const [statsResult, usersResult, withdrawalsResult] = await Promise.all([
      pool.query(
        `SELECT
           (SELECT COUNT(*) FROM users)::int AS total_users,
           (SELECT COALESCE(SUM(balance), 0) FROM wallets) AS total_balance,
           (SELECT COALESCE(SUM(total_wagered), 0) FROM wallets) AS total_wagered,
           (SELECT COUNT(*) FROM withdrawal_requests WHERE status = 'pending')::int AS pending_withdrawals`
      ),
      pool.query(
        `SELECT u.id, u.username, u.email, u.role, u.created_at, COALESCE(w.balance, 0) AS balance
         FROM users u
         LEFT JOIN wallets w ON w.user_id = u.id
         ORDER BY u.created_at DESC
         LIMIT 12`
      ),
      pool.query(
        `SELECT wr.id, wr.user_id, u.username, wr.currency, wr.address, wr.amount, wr.fee_amount, wr.net_amount, wr.status, wr.created_at
         FROM withdrawal_requests wr
         JOIN users u ON u.id = wr.user_id
         ORDER BY wr.created_at DESC
         LIMIT 8`
      ),
    ]);

    return res.json({
      stats: {
        totalUsers: Number(statsResult.rows[0]?.total_users || 0),
        totalBalance: Number(statsResult.rows[0]?.total_balance || 0),
        totalWagered: Number(statsResult.rows[0]?.total_wagered || 0),
        pendingWithdrawals: Number(statsResult.rows[0]?.pending_withdrawals || 0),
      },
      users: usersResult.rows.map((row) => ({
        id: Number(row.id),
        username: row.username,
        email: row.email,
        role: normalizeUserRole(row.role),
        balance: Number(row.balance || 0),
        createdAt: row.created_at,
      })),
      withdrawals: withdrawalsResult.rows.map((row) => ({
        id: Number(row.id),
        userId: Number(row.user_id),
        username: row.username,
        currency: row.currency,
        address: row.address,
        amount: Number(row.amount || 0),
        feeAmount: Number(row.fee_amount || 0),
        netAmount: Number(row.net_amount || 0),
        status: row.status,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to load admin overview.' });
  }
});

app.post('/api/admin/withdrawals/:id/status', requireAuth, requireOwner, async (req: AuthedRequest, res) => {
  const client = await pool.connect();

  try {
    const withdrawalId = Number(req.params.id || 0);
    const nextStatus = String(req.body.status || '').trim().toLowerCase();

    if (!withdrawalId || !['pending', 'processing', 'completed', 'declined'].includes(nextStatus)) {
      return res.status(400).json({ error: 'Valid withdrawal and status are required.' });
    }

    await client.query('BEGIN');

    const requestResult = await client.query(
      `SELECT id, user_id, currency, address, amount, fee_amount, net_amount, status, created_at
       FROM withdrawal_requests
       WHERE id = $1
       FOR UPDATE`,
      [withdrawalId]
    );

    if (!requestResult.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Withdrawal request not found.' });
    }

    const request = requestResult.rows[0];
    const currentStatus = String(request.status || 'pending').toLowerCase();

    if (currentStatus === nextStatus) {
      await client.query('COMMIT');
      return res.json({
        request: {
          id: Number(request.id),
          userId: Number(request.user_id),
          currency: request.currency,
          address: request.address,
          amount: Number(request.amount || 0),
          feeAmount: Number(request.fee_amount || 0),
          netAmount: Number(request.net_amount || 0),
          status: currentStatus,
          createdAt: request.created_at,
        },
      });
    }

    if (currentStatus === 'declined') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Declined withdrawals cannot be changed.' });
    }

    if (currentStatus === 'completed' && nextStatus !== 'completed') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Completed withdrawals cannot be changed.' });
    }

    if (nextStatus === 'declined') {
      await ensureWallet(client, Number(request.user_id));
      await client.query(
        `UPDATE wallets
         SET balance = balance + $1,
             total_withdrawn = GREATEST(total_withdrawn - $1, 0),
             updated_at = NOW()
         WHERE user_id = $2`,
        [Number(request.amount || 0), Number(request.user_id)]
      );

      const feeAmount = Number(request.fee_amount || 0);
      const ownerUserId = await getPrimaryOwnerId(client);
      if (ownerUserId && feeAmount > 0) {
        await ensureWallet(client, ownerUserId);
        const ownerResult = await client.query(
          `UPDATE wallets
           SET balance = balance - $1,
               updated_at = NOW()
           WHERE user_id = $2
             AND balance >= $1`,
          [feeAmount, ownerUserId]
        );

        if (!ownerResult.rowCount) {
          await client.query('ROLLBACK');
          return res.status(409).json({ error: 'Owner wallet cannot cover the fee reversal for this refund.' });
        }
      }
    }

    const updatedResult = await client.query(
      `UPDATE withdrawal_requests
       SET status = $1
       WHERE id = $2
       RETURNING id, user_id, currency, address, amount, fee_amount, net_amount, status, created_at`,
      [nextStatus, withdrawalId]
    );

    await client.query('COMMIT');
    return res.json({
      request: {
        id: Number(updatedResult.rows[0].id),
        userId: Number(updatedResult.rows[0].user_id),
        currency: updatedResult.rows[0].currency,
        address: updatedResult.rows[0].address,
        amount: Number(updatedResult.rows[0].amount || 0),
        feeAmount: Number(updatedResult.rows[0].fee_amount || 0),
        netAmount: Number(updatedResult.rows[0].net_amount || 0),
        status: updatedResult.rows[0].status,
        createdAt: updatedResult.rows[0].created_at,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return res.status(500).json({ error: 'Failed to update withdrawal.' });
  } finally {
    client.release();
  }
});

app.post('/api/admin/wallet/adjust', requireAuth, requireOwner, async (req: AuthedRequest, res) => {
  try {
    const userId = Number(req.body.userId || 0);
    const delta = normalizeCoins(req.body.delta);

    if (!delta || !userId) {
      return res.status(400).json({ error: 'Invalid input.' });
    }

    await ensureWallet(pool, userId);

    let result;
    if (delta > 0) {
      result = await pool.query(
        `UPDATE wallets
         SET balance = balance + $1::numeric,
             updated_at = NOW()
         WHERE user_id = $2
         RETURNING balance::text AS balance,
                   total_deposited::text AS total_deposited,
                   total_withdrawn::text AS total_withdrawn`,
        [delta, userId]
      );
    } else {
      result = await pool.query(
        `UPDATE wallets
         SET balance = balance + $1::numeric,
             total_withdrawn = total_withdrawn + (-$1::numeric),
             updated_at = NOW()
         WHERE user_id = $2
           AND balance >= (-$1::numeric)
         RETURNING balance::text AS balance,
                   total_deposited::text AS total_deposited,
                   total_withdrawn::text AS total_withdrawn`,
        [delta, userId]
      );
    }

    if (!result.rowCount) {
      return res.status(400).json({ error: delta < 0 ? 'Insufficient balance.' : 'Wallet not found.' });
    }

    return res.json({ wallet: sanitizeWallet(result.rows[0]) });
  } catch (error) {
    const err = error as Error;
    console.error('Wallet adjust error:', err.message, err.stack);
    return res.status(500).json({ error: 'Failed to adjust wallet.', details: err.message });
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

app.get('/api/admin/rain-bot', requireAuth, requireOwner, async (_req: AuthedRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT id, interval_minutes, min_pool_amount, rain_amount, is_active, created_by_user_id, created_at, last_triggered_at
       FROM rain_bot_schedules
       ORDER BY created_at DESC
       LIMIT 20`
    );

    return res.json({
      schedules: result.rows.map((row) => ({
        id: Number(row.id),
        intervalMinutes: Number(row.interval_minutes),
        minPoolAmount: Number(row.min_pool_amount),
        rainAmount: Number(row.rain_amount),
        isActive: Boolean(row.is_active),
        createdByUserId: row.created_by_user_id ? Number(row.created_by_user_id) : null,
        createdAt: row.created_at,
        lastTriggeredAt: row.last_triggered_at,
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to load rain bot schedules.' });
  }
});

app.post('/api/admin/rain-bot', requireAuth, requireOwner, async (req: AuthedRequest, res) => {
  try {
    const intervalMinutes = Math.max(1, Math.min(1440, Number(req.body.intervalMinutes || 60)));
    const minPoolAmount = Math.max(1, normalizeCoins(req.body.minPoolAmount || 100));
    const rainAmount = Math.max(1, normalizeCoins(req.body.rainAmount || 500));

    const result = await pool.query(
      `INSERT INTO rain_bot_schedules (interval_minutes, min_pool_amount, rain_amount, created_by_user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, interval_minutes, min_pool_amount, rain_amount, is_active, created_at`,
      [intervalMinutes, minPoolAmount, rainAmount, req.auth!.user.id]
    );

    const row = result.rows[0];
    return res.status(201).json({
      schedule: {
        id: Number(row.id),
        intervalMinutes: Number(row.interval_minutes),
        minPoolAmount: Number(row.min_pool_amount),
        rainAmount: Number(row.rain_amount),
        isActive: Boolean(row.is_active),
        createdAt: row.created_at,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to create rain bot schedule.' });
  }
});

app.post('/api/admin/rain-bot/:id/toggle', requireAuth, requireOwner, async (req: AuthedRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid schedule ID.' });

    const result = await pool.query(
      `UPDATE rain_bot_schedules SET is_active = NOT is_active WHERE id = $1 RETURNING id, interval_minutes, min_pool_amount, rain_amount, is_active, created_at, last_triggered_at`,
      [id]
    );

    if (!result.rowCount) return res.status(404).json({ error: 'Schedule not found.' });

    const row = result.rows[0];
    return res.json({
      schedule: {
        id: Number(row.id),
        intervalMinutes: Number(row.interval_minutes),
        minPoolAmount: Number(row.min_pool_amount),
        rainAmount: Number(row.rain_amount),
        isActive: Boolean(row.is_active),
        createdAt: row.created_at,
        lastTriggeredAt: row.last_triggered_at,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to toggle rain bot schedule.' });
  }
});

app.delete('/api/admin/rain-bot/:id', requireAuth, requireOwner, async (req: AuthedRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid schedule ID.' });

    await pool.query(`DELETE FROM rain_bot_schedules WHERE id = $1`, [id]);
    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to delete rain bot schedule.' });
  }
});

app.get('/api/admin/analytics', requireAuth, requireOwner, async (_req: AuthedRequest, res) => {
  try {
    const now = new Date();
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const weekStart = new Date(dayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(dayStart.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      userStats,
      wagerStats,
      depositStats,
      gameStats,
    ] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::int AS total_users,
          COUNT(*) FILTER (WHERE created_at >= $1)::int AS users_today,
          COUNT(*) FILTER (WHERE created_at >= $2)::int AS users_week,
          COUNT(*) FILTER (WHERE created_at >= $3)::int AS users_month,
          COUNT(DISTINCT us.user_id) FILTER (WHERE us.updated_at >= $1)::int AS active_today,
          COUNT(DISTINCT us.user_id) FILTER (WHERE us.updated_at >= $2)::int AS active_week,
          COUNT(DISTINCT us.user_id) FILTER (WHERE us.updated_at >= $3)::int AS active_month
        FROM users u
        LEFT JOIN user_sessions us ON us.user_id = u.id AND (us.expires_at IS NULL OR us.expires_at > NOW())
      `, [dayStart, weekStart, monthStart]),
      pool.query(`
        SELECT
          COALESCE(SUM(wager), 0)::bigint AS total_wagered,
          COALESCE(SUM(wager) FILTER (WHERE created_at >= $1), 0)::bigint AS wagered_today,
          COALESCE(SUM(wager) FILTER (WHERE created_at >= $2), 0)::bigint AS wagered_week,
          COALESCE(SUM(wager) FILTER (WHERE created_at >= $3), 0)::bigint AS wagered_month,
          COALESCE(SUM(payout) FILTER (WHERE created_at >= $1), 0)::bigint AS payout_today,
          COALESCE(SUM(payout) FILTER (WHERE created_at >= $1), 0)::bigint AS payout_today
        FROM bet_activities
      `, [dayStart, weekStart, monthStart]),
      pool.query(`
        SELECT
          COALESCE(SUM(price_amount), 0) AS total_deposited,
          COALESCE(SUM(CASE WHEN credited_at IS NOT NULL THEN price_amount ELSE 0 END) FILTER (WHERE created_at >= $1), 0) AS deposited_today,
          COALESCE(SUM(CASE WHEN credited_at IS NOT NULL THEN price_amount ELSE 0 END) FILTER (WHERE created_at >= $2), 0) AS deposited_week,
          COALESCE(SUM(CASE WHEN credited_at IS NOT NULL THEN price_amount ELSE 0 END) FILTER (WHERE created_at >= $3), 0) AS deposited_month,
          COALESCE((SELECT SUM(amount) FROM withdrawal_requests WHERE status = 'completed'), 0)::bigint AS total_withdrawn
        FROM payment_transactions
      `, [dayStart, weekStart, monthStart]),
      pool.query(`
        SELECT
          game_key,
          COUNT(*)::int AS total_bets,
          COALESCE(SUM(wager), 0)::bigint AS total_wagered,
          COALESCE(SUM(payout), 0)::bigint AS total_payout,
          COUNT(*) FILTER (WHERE outcome = 'win')::int AS wins,
          COUNT(*) FILTER (WHERE outcome = 'loss')::int AS losses,
          COUNT(*) FILTER (WHERE outcome = 'push')::int AS pushes,
          COALESCE(MAX(multiplier), 0) AS max_multiplier
        FROM bet_activities
        GROUP BY game_key
        ORDER BY total_wagered DESC
      `),
    ]);

    const wStats = wagerStats.rows[0] || {};
    const dStats = depositStats.rows[0] || {};
    const uStats = userStats.rows[0] || {};

    return res.json({
      analytics: {
        users: {
          total: Number(uStats.total_users || 0),
          today: Number(uStats.users_today || 0),
          week: Number(uStats.users_week || 0),
          month: Number(uStats.users_month || 0),
          activeToday: Number(uStats.active_today || 0),
          activeWeek: Number(uStats.active_week || 0),
          activeMonth: Number(uStats.active_month || 0),
        },
        wagering: {
          total: Number(wStats.total_wagered || 0),
          today: Number(wStats.wagered_today || 0),
          week: Number(wStats.wagered_week || 0),
          month: Number(wStats.wagered_month || 0),
        },
        payouts: {
          today: Number(wStats.payout_today || 0),
          week: Number(wStats.payout_today || 0),
          month: Number(wStats.payout_today || 0),
        },
        deposits: {
          total: Number(dStats.total_deposited || 0),
          today: Number(dStats.deposited_today || 0),
          week: Number(dStats.deposited_week || 0),
          month: Number(dStats.deposited_month || 0),
        },
        withdrawals: {
          total: Number(dStats.total_withdrawn || 0),
        },
        revenue: {
          today: Math.max(0, Number(wStats.wagered_today || 0) - Number(wStats.payout_today || 0)),
          week: Math.max(0, Number(wStats.wagered_week || 0) - Number(wStats.payout_today || 0)),
          month: Math.max(0, Number(wStats.wagered_month || 0) - Number(wStats.payout_today || 0)),
        },
        games: gameStats.rows.map((row) => ({
          gameKey: row.game_key,
          totalBets: Number(row.total_bets || 0),
          totalWagered: Number(row.total_wagered || 0),
          totalPayout: Number(row.total_payout || 0),
          wins: Number(row.wins || 0),
          losses: Number(row.losses || 0),
          pushes: Number(row.pushes || 0),
          maxMultiplier: Number(row.max_multiplier || 0),
          houseEdge: Number(row.total_bets || 0) > 0
            ? (((Number(row.total_wagered || 0) - Number(row.total_payout || 0)) / Number(row.total_wagered || 0) * 100)).toFixed(2)
            : '0.00',
        })),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to load analytics.' });
  }
});


// PROVABLY FAIR
app.get('/api/pf/current-seed', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT id, client_seed, server_seed_hash, nonce, created_at
       FROM pf_seeds WHERE user_id = $1 ORDER BY id DESC LIMIT 1`,
      [req.auth!.user.id]
    );
    if (!result.rowCount) {
      const clientSeed = crypto.randomBytes(16).toString('hex');
      const serverSeed = crypto.randomBytes(32).toString('hex');
      const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
      await pool.query(
        `INSERT INTO pf_seeds (user_id, client_seed, server_seed_hash, server_seed_secret, nonce) VALUES ($1,$2,$3,$4,0)`,
        [req.auth!.user.id, clientSeed, serverSeedHash, serverSeed]
      );
      return res.json({ clientSeed, serverSeedHash, nonce: 0, isNew: true });
    }
    const row = result.rows[0];
    return res.json({
      clientSeed: row.client_seed,
      serverSeedHash: row.server_seed_hash,
      nonce: row.nonce,
      createdAt: row.created_at,
      isNew: false,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to get seed' });
  }
});

app.post('/api/pf/rotate-seed', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const clientSeed = String(req.body.clientSeed || '').trim();
    if (!clientSeed || clientSeed.length < 8 || clientSeed.length > 64) {
      return res.status(400).json({ error: 'Invalid client seed' });
    }
    const serverSeed = crypto.randomBytes(32).toString('hex');
    const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
    await pool.query(
      `INSERT INTO pf_seeds (user_id, client_seed, server_seed_hash, server_seed_secret, nonce) VALUES ($1,$2,$3,$4,0)`,
      [req.auth!.user.id, clientSeed, serverSeedHash, serverSeed]
    );
    return res.json({ clientSeed, serverSeedHash, nonce: 0 });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to rotate seed' });
  }
});

app.get('/api/pf/verify', async (req, res) => {
  try {
    const { clientSeed, serverSeed, nonce } = req.query as { clientSeed: string; serverSeed: string; nonce: string };
    if (!clientSeed || !serverSeed) return res.status(400).json({ error: 'Missing params' });
    const hash = crypto.createHash('sha256').update(serverSeed).digest('hex');
    const combined = `${clientSeed}:${serverSeed}:${nonce}`;
    const resultHash = crypto.createHash('sha512').update(combined).digest('hex');
    const randFloat = parseInt(resultHash.substring(0, 13), 16) / 0x2000000000000;
    return res.json({ serverSeedHash: hash, result: randFloat });
  } catch (error) {
    return res.status(500).json({ error: 'Verification failed' });
  }
});

// USER PROFILE
app.get('/api/profile/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const userResult = await pool.query(
      `SELECT id, username, role, avatar_url, xp, daily_reward_streak, created_at, tier FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1`, [username]
    );
    if (!userResult.rowCount) return res.status(404).json({ error: 'User not found' });
    const u = userResult.rows[0];
    const statsResult = await pool.query(
      `SELECT COUNT(*) AS total_bets, COUNT(*) FILTER (WHERE payout > wager) AS total_wins,
       COALESCE(SUM(wager), 0)::bigint AS total_wagered, COALESCE(SUM(payout), 0)::bigint AS total_payout,
       COALESCE(MAX(payout), 0)::bigint AS biggest_win, COALESCE(MAX(payout - wager), 0)::bigint AS biggest_profit
       FROM bet_activities WHERE user_id = $1`, [u.id]
    );
    const recentBets = await pool.query(
      `SELECT game_key, wager, payout, multiplier, created_at FROM bet_activities WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`, [u.id]
    );
    const stats = statsResult.rows[0];
    return res.json({
      profile: { username: u.username, role: u.role, avatarUrl: u.avatar_url, joinedAt: u.created_at, xp: u.xp || 0, streak: u.daily_reward_streak || 0, tier: u.tier || 0 },
      stats: {
        totalBets: Number(stats.total_bets || 0), totalWins: Number(stats.total_wins || 0),
        totalWagered: Number(stats.total_wagered || 0), totalPayout: Number(stats.total_payout || 0),
        biggestWin: Number(stats.biggest_win || 0), biggestProfit: Number(stats.biggest_profit || 0),
        winRate: stats.total_bets > 0 ? Number((Number(stats.total_wins) / Number(stats.total_bets) * 100).toFixed(1)) : 0,
      },
      recentBets: recentBets.rows.map((b) => ({ game: b.game_key, wager: Number(b.wager), payout: Number(b.payout), multiplier: Number(b.multiplier), createdAt: b.created_at })),
    });
  } catch (error) { console.error(error); return res.status(500).json({ error: 'Failed to load profile' }); }
});

// USER SETTINGS
app.get('/api/settings', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const result = await pool.query(`SELECT * FROM user_settings WHERE user_id = $1 LIMIT 1`, [req.auth!.user.id]);
    if (!result.rowCount) {
      await pool.query(`INSERT INTO user_settings (user_id) VALUES ($1)`, [req.auth!.user.id]);
      return res.json({ theme: 'dark', soundEnabled: true, notificationsEnabled: true, defaultBet: 100, chatNotifications: true, rainNotifications: true });
    }
    const r = result.rows[0];
    return res.json({ theme: r.theme, soundEnabled: r.sound_enabled, notificationsEnabled: r.notifications_enabled, defaultBet: Number(r.default_bet), chatNotifications: r.chat_notifications, rainNotifications: r.rain_notifications });
  } catch (error) { console.error(error); return res.status(500).json({ error: 'Failed to load settings' }); }
});

app.post('/api/settings', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const { theme, soundEnabled, notificationsEnabled, defaultBet, chatNotifications, rainNotifications } = req.body;
    await pool.query(
      `INSERT INTO user_settings (user_id, theme, sound_enabled, notifications_enabled, default_bet, chat_notifications, rain_notifications, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         theme = COALESCE($2, user_settings.theme), sound_enabled = COALESCE($3, user_settings.sound_enabled),
         notifications_enabled = COALESCE($4, user_settings.notifications_enabled), default_bet = COALESCE($5, user_settings.default_bet),
         chat_notifications = COALESCE($6, user_settings.chat_notifications), rain_notifications = COALESCE($7, user_settings.rain_notifications), updated_at = NOW()`,
      [req.auth!.user.id, theme, soundEnabled, notificationsEnabled, defaultBet, chatNotifications, rainNotifications]
    );
    return res.json({ success: true });
  } catch (error) { console.error(error); return res.status(500).json({ error: 'Failed to save settings' }); }
});

// JACKPOT
app.get('/api/jackpot/current', async (req, res) => {
  try {
    const roundResult = await pool.query(`SELECT id, total_pool, status, winner_user_id, starts_at, ends_at FROM jackpot_rounds WHERE status = 'active' ORDER BY id DESC LIMIT 1`);
    if (!roundResult.rowCount) {
      const endTime = new Date(Date.now() + 5 * 60 * 1000);
      const newRound = await pool.query(`INSERT INTO jackpot_rounds (ends_at) VALUES ($1) RETURNING id, starts_at, ends_at`, [endTime]);
      return res.json({ round: { id: newRound.rows[0].id, totalPool: 0, status: 'active', participants: [], endsAt: endTime, startsAt: new Date() }, userTickets: 0, hasJoined: false });
    }
    const round = roundResult.rows[0];
    const partResult = await pool.query(
      `SELECT jp.user_id, jp.amount, jp.tickets, u.username FROM jackpot_participants jp JOIN users u ON jp.user_id = u.id WHERE jp.round_id = $1 ORDER BY jp.created_at DESC`,
      [round.id]
    );
    const participants = partResult.rows.map((p) => ({ userId: p.user_id, username: p.username, amount: Number(p.amount), tickets: p.tickets }));
    return res.json({ round: { id: round.id, totalPool: Number(round.total_pool), status: round.status, participants, endsAt: round.ends_at, startsAt: round.starts_at }, hasJoined: false, userTickets: 0 });
  } catch (error) { console.error(error); return res.status(500).json({ error: 'Failed to load jackpot' }); }
});

app.post('/api/jackpot/join', requireAuth, async (req: AuthedRequest, res) => {
  const client = await pool.connect();
  try {
const amount = Math.max(1, Number(req.body.amount) || 0);
    if (amount < 1) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Minimum bet is $0.01' }); }
    await client.query('BEGIN');
    const balanceResult = await client.query(`SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE`, [req.auth!.user.id]);
    if (Number(balanceResult.rows[0]?.balance || 0) < amount) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Insufficient balance' }); }
    let roundResult = await client.query(`SELECT id, total_pool, ends_at FROM jackpot_rounds WHERE status = 'active' ORDER BY id DESC LIMIT 1 FOR UPDATE`);
    if (!roundResult.rowCount) {
      const endTime = new Date(Date.now() + 5 * 60 * 1000);
      roundResult = await client.query(`INSERT INTO jackpot_rounds (ends_at) VALUES ($1) RETURNING id, total_pool, ends_at`, [endTime]);
    }
    const round = roundResult.rows[0];
    if (new Date(round.ends_at).getTime() <= Date.now()) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Round has ended' }); }
    const existing = await client.query(`SELECT id, tickets FROM jackpot_participants WHERE round_id = $1 AND user_id = $2`, [round.id, req.auth!.user.id]);
    if (existing.rowCount) {
      await client.query(`UPDATE wallets SET balance = balance - $1 WHERE user_id = $2`, [amount, req.auth!.user.id]);
      const newTickets = Math.floor((Number(existing.rows[0].tickets) + amount) / 100);
      await client.query(`UPDATE jackpot_participants SET amount = amount + $1, tickets = $2 WHERE round_id = $3 AND user_id = $4`, [amount, newTickets, round.id, req.auth!.user.id]);
      await client.query(`UPDATE jackpot_rounds SET total_pool = total_pool + $1 WHERE id = $2`, [amount, round.id]);
    } else {
      await client.query(`UPDATE wallets SET balance = balance - $1 WHERE user_id = $2`, [amount, req.auth!.user.id]);
      const tickets = Math.floor(amount / 100);
      await client.query(`INSERT INTO jackpot_participants (round_id, user_id, amount, tickets) VALUES ($1,$2,$3,$4)`, [round.id, req.auth!.user.id, amount, tickets]);
      await client.query(`UPDATE jackpot_rounds SET total_pool = total_pool + $1 WHERE id = $2`, [amount, round.id]);
    }
    await client.query('COMMIT');
    return res.json({ success: true, poolAdded: amount });
  } catch (error) { await client.query('ROLLBACK'); console.error(error); return res.status(500).json({ error: 'Failed to join jackpot' }); }
  finally { client.release(); }
});

async function processJackpotRounds() {
  try {
    const rounds = await pool.query(`SELECT id, total_pool FROM jackpot_rounds WHERE status = 'active' AND ends_at <= NOW() LIMIT 5`);
    for (const round of rounds.rows) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const partResult = await client.query(`SELECT jp.*, u.username FROM jackpot_participants jp JOIN users u ON jp.user_id = u.id WHERE jp.round_id = $1`, [round.id]);
        if (partResult.rows.length === 0) { await client.query(`UPDATE jackpot_rounds SET status = 'expired' WHERE id = $1`, [round.id]); await client.query('COMMIT'); continue; }
        const totalTickets = partResult.rows.reduce((sum, p) => sum + Number(p.tickets), 0);
        if (totalTickets === 0) { await client.query(`UPDATE jackpot_rounds SET status = 'expired' WHERE id = $1`, [round.id]); await client.query('COMMIT'); continue; }
        const serverSeed = crypto.randomBytes(32).toString('hex');
        const combined = `${serverSeed}:${round.id}`;
        const hash = parseInt(crypto.createHash('sha256').update(combined).digest('hex').substring(0, 13), 16);
        const winnerTicket = hash % totalTickets;
        let cumulative = 0, winnerId: number | null = null;
        for (const p of partResult.rows) { cumulative += Number(p.tickets); if (cumulative > winnerTicket) { winnerId = p.user_id; break; } }
        if (!winnerId) winnerId = partResult.rows[partResult.rows.length - 1].user_id;
        await client.query(`UPDATE jackpot_rounds SET status = 'completed', winner_user_id = $1, winner_seed = $2 WHERE id = $3`, [winnerId, serverSeed, round.id]);
        const winnerResult = await client.query(`SELECT username, avatar FROM users WHERE id = $1`, [winnerId]);
        await client.query(`UPDATE wallets SET balance = balance + $1 WHERE user_id = $2`, [Number(round.total_pool), winnerId]);
        await client.query(`INSERT INTO chat_messages (user_id, username, text, tone, role, avatar_url) VALUES ($1,$2,$3,'win','user',$4)`,
          [winnerId, winnerResult.rows[0].username, `won the Jackpot of ${(Number(round.total_pool) / 100).toFixed(2)}!`, winnerResult.rows[0].avatar || null]);
        await client.query('COMMIT');
      } catch (e) { await client.query('ROLLBACK'); console.error('Jackpot error:', e); }
      finally { client.release(); }
    }
  } catch (e) { console.error('Jackpot cron error:', e); }
}

// ==================== FRIENDS API ====================
app.get('/api/friends', requireAuth, async (req: AuthedRequest, res) => {
  try {
    // Check if friendships table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'friendships'
      ) as exists
    `);
    
    if (!tableCheck.rows[0]?.exists) {
      return res.json({ friends: [], incoming: [], outgoing: [] });
    }
    
    const userId = req.auth!.user.id;
    
    // Get accepted friends
    const accepted = await pool.query(`
      SELECT u.id, u.username, u.avatar, u.created_at,
        CASE WHEN f.user_id = $1 THEN f.friend_id ELSE f.user_id END as friend_user_id,
        f.created_at as friend_since
      FROM friendships f
      JOIN users u ON u.id = CASE WHEN f.user_id = $1 THEN f.friend_id ELSE f.user_id END
      WHERE (f.user_id = $1 OR f.friend_id = $1) AND f.status = 'accepted'
      ORDER BY f.updated_at DESC
    `, [userId]);
    
    // Get pending incoming requests
    const incoming = await pool.query(`
      SELECT u.id, u.username, u.avatar, u.created_at, f.created_at as requested_at
      FROM friendships f
      JOIN users u ON u.id = f.user_id
      WHERE f.friend_id = $1 AND f.status = 'pending'
      ORDER BY f.created_at DESC
    `, [userId]);
    
    // Get pending outgoing requests
    const outgoing = await pool.query(`
      SELECT u.id, u.username, u.avatar, u.created_at, f.created_at as sent_at
      FROM friendships f
      JOIN users u ON u.id = f.friend_id
      WHERE f.user_id = $1 AND f.status = 'pending'
      ORDER BY f.created_at DESC
    `, [userId]);
    
    res.json({
      friends: accepted.rows.map(f => ({
        id: f.friend_user_id,
        username: f.username,
        avatar: f.avatar,
        friendSince: f.friend_since
      })),
      incoming: incoming.rows.map(r => ({
        id: r.id,
        username: r.username,
        avatar: r.avatar,
        requestedAt: r.requested_at
      })),
      outgoing: outgoing.rows.map(r => ({
        id: r.id,
        username: r.username,
        avatar: r.avatar,
        sentAt: r.sent_at
      }))
    });
  } catch (error) {
    console.error('Friends error:', error);
    res.json({ friends: [], incoming: [], outgoing: [] });
  }
});

// Search users
app.get('/api/users/search', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const query = String(req.query.q || '').trim();
    if (!query || query.length < 2) {
      return res.json({ users: [] });
    }
    
    const userId = req.auth!.user.id;
    const result = await pool.query(`
      SELECT u.id, u.username, u.avatar,
        CASE 
          WHEN f.status = 'accepted' THEN 'friends'
          WHEN f.user_id = $1 AND f.status = 'pending' THEN 'sent'
          WHEN f.friend_id = $1 AND f.status = 'pending' THEN 'received'
          ELSE 'none'
        END as friend_status
      FROM users u
      LEFT JOIN friendships f ON (f.user_id = u.id AND f.friend_id = $1) OR (f.user_id = $1 AND f.friend_id = u.id)
      WHERE u.id != $1 AND u.username ILIKE '%' || $2 || '%'
      LIMIT 20
    `, [userId, query]);
    
    res.json({
      users: result.rows.map(r => ({
        id: r.id,
        username: r.username,
        avatar: r.avatar,
        friendStatus: r.friend_status
      }))
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

app.post('/api/friends/request', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const userId = req.auth!.user.id;
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: 'Username required' });
    }
    
    // Find target user
    const targetResult = await pool.query(`SELECT id FROM users WHERE username = $1`, [username]);
    if (!targetResult.rowCount) {
      return res.status(404).json({ error: 'User not found' });
    }
    const targetId = targetResult.rows[0].id;
    
    if (targetId === userId) {
      return res.status(400).json({ error: 'Cannot add yourself' });
    }
    
    // Check if friendship exists
    const existing = await pool.query(`
      SELECT id, status, user_id FROM friendships 
      WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)
    `, [userId, targetId]);
    
    if (existing.rowCount) {
      const record = existing.rows[0];
      if (record.status === 'accepted') {
        return res.status(400).json({ error: 'Already friends' });
      }
      if (record.status === 'pending') {
        if (record.user_id === userId) {
          return res.status(400).json({ error: 'Request already sent' });
        } else {
          // Auto-accept if they sent us a request
          await pool.query(`
            UPDATE friendships SET status = 'accepted', updated_at = NOW() WHERE id = $1
          `, [record.id]);
          return res.json({ success: true, message: 'Friend request accepted' });
        }
      }
    }
    
    await pool.query(`
      INSERT INTO friendships (user_id, friend_id, status) VALUES ($1, $2, 'pending')
      ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'pending', updated_at = NOW()
    `, [userId, targetId]);
    
    res.json({ success: true, message: 'Friend request sent' });
  } catch (error) {
    console.error('Friend request error:', error);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

app.post('/api/friends/accept', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const userId = req.auth!.user.id;
    const { friendId } = req.body;
    
    if (!friendId) {
      return res.status(400).json({ error: 'Friend ID required' });
    }
    
    const result = await pool.query(`
      UPDATE friendships SET status = 'accepted', updated_at = NOW()
      WHERE user_id = $1 AND friend_id = $2 AND status = 'pending'
      RETURNING id
    `, [friendId, userId]);
    
    if (!result.rowCount) {
      return res.status(404).json({ error: 'Friend request not found' });
    }
    
    res.json({ success: true, message: 'Friend request accepted' });
  } catch (error) {
    console.error('Accept friend error:', error);
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

app.post('/api/friends/reject', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const userId = req.auth!.user.id;
    const { friendId } = req.body;
    
    if (!friendId) {
      return res.status(400).json({ error: 'Friend ID required' });
    }
    
    await pool.query(`
      DELETE FROM friendships 
      WHERE user_id = $1 AND friend_id = $2 AND status = 'pending'
    `, [friendId, userId]);
    
    res.json({ success: true, message: 'Friend request rejected' });
  } catch (error) {
    console.error('Reject friend error:', error);
    res.status(500).json({ error: 'Failed to reject friend request' });
  }
});

app.delete('/api/friends/:id', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const userId = req.auth!.user.id;
    const friendId = parseInt(req.params.id);
    
    await pool.query(`
      DELETE FROM friendships 
      WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)
    `, [userId, friendId]);
    
    res.json({ success: true, message: 'Friend removed' });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

// Friend tip endpoint
app.post('/api/friends/tip', requireAuth, async (req: AuthedRequest, res) => {
  const client = await pool.connect();
  try {
    const userId = req.auth!.user.id;
    const { friendId, amount } = req.body;
    
    if (!friendId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid friend and amount required' });
    }
    
    // Check if they are friends
    const friendCheck = await client.query(`
      SELECT 1 FROM friendships 
      WHERE ((user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1))
        AND status = 'accepted'
    `, [userId, friendId]);
    
    if (!friendCheck.rowCount) {
      return res.status(400).json({ error: 'You are not friends with this user' });
    }
    
    const amountCoins = Math.round(Number(amount) * 100);
    if (amountCoins < 1) {
      return res.status(400).json({ error: 'Minimum tip is $0.01' });
    }
    
    await client.query('BEGIN');
    
    // Check balance
    const walletResult = await client.query(`
      SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE
    `, [userId]);
    
    const balance = Number(walletResult.rows[0]?.balance || 0);
    if (balance < amountCoins) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    // Deduct from sender
    await client.query(`
      UPDATE wallets SET balance = balance - $1::numeric, total_withdrawn = total_withdrawn + $1::numeric, updated_at = NOW() WHERE user_id = $2
    `, [amountCoins, userId]);
    
    // Add to recipient
    await client.query(`
      UPDATE wallets SET balance = balance + $1::numeric, total_deposited = total_deposited + $1::numeric, updated_at = NOW() WHERE user_id = $2
    `, [amountCoins, friendId]);
    
    // Create tip notification
    await client.query(`
      INSERT INTO tip_notifications (recipient_user_id, sender_user_id, sender_username, amount)
      VALUES ($1, $2, $3, $4)
    `, [friendId, userId, req.auth!.user.username, amountCoins]);
    
    await client.query('COMMIT');
    return res.json({ success: true, amount: amountCoins });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Friend tip error:', error);
    res.status(500).json({ error: 'Failed to send tip' });
  } finally {
    client.release();
  }
});

// Create private messages table
await pool.query(`CREATE TABLE IF NOT EXISTS private_messages (
  id BIGSERIAL PRIMARY KEY,
  sender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`);

// Get private messages
app.get('/api/friends/chat/:friendId', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const userId = req.auth!.user.id;
    const friendId = parseInt(req.params.friendId);
    
    // Check if friends
    const friendCheck = await pool.query(`
      SELECT 1 FROM friendships 
      WHERE ((user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1))
        AND status = 'accepted'
    `, [userId, friendId]);
    
    if (!friendCheck.rowCount) {
      return res.status(400).json({ error: 'You are not friends with this user' });
    }
    
    const result = await pool.query(`
      SELECT id, sender_id, text, created_at
      FROM private_messages
      WHERE (sender_id = $1 AND recipient_id = $2) OR (sender_id = $2 AND recipient_id = $1)
      ORDER BY created_at ASC
      LIMIT 100
    `, [userId, friendId]);
    
    res.json({ messages: result.rows.map(r => ({
      id: Number(r.id),
      senderId: Number(r.sender_id),
      text: r.text,
      createdAt: r.created_at
    })) });
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

// Send private message
app.post('/api/friends/chat', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const userId = req.auth!.user.id;
    const { friendId, text } = req.body;
    
    if (!friendId || !text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Valid friend and message required' });
    }
    
    if (text.length > 500) {
      return res.status(400).json({ error: 'Message too long (max 500 characters)' });
    }
    
    // Check if friends
    const friendCheck = await pool.query(`
      SELECT 1 FROM friendships 
      WHERE ((user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1))
        AND status = 'accepted'
    `, [userId, friendId]);
    
    if (!friendCheck.rowCount) {
      return res.status(400).json({ error: 'You are not friends with this user' });
    }
    
    const result = await pool.query(`
      INSERT INTO private_messages (sender_id, recipient_id, text)
      VALUES ($1, $2, $3)
      RETURNING id, sender_id, text, created_at
    `, [userId, friendId, text.trim()]);
    
    const row = result.rows[0];
    res.json({ message: {
      id: Number(row.id),
      senderId: Number(row.sender_id),
      text: row.text,
      createdAt: row.created_at
    }});
  } catch (error) {
    console.error('Send chat error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ==================== TOURNAMENTS API ====================
app.get('/api/tournaments', async (req, res) => {
  try {
    // Check if tournaments table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'tournaments'
      ) as exists
    `);
    
    if (!tableCheck.rows[0]?.exists) {
      return res.json({ tournaments: [] });
    }
    
    const result = await pool.query(`
      SELECT t.*,
        (SELECT COUNT(*) FROM tournament_participants WHERE tournament_id = t.id) as participant_count,
        (SELECT total_wagered FROM tournament_participants tp 
         JOIN users u ON u.id = tp.user_id 
         WHERE tp.tournament_id = t.id 
         ORDER BY tp.total_wagered DESC LIMIT 1) as top_wager
      FROM tournaments t
      ORDER BY 
        CASE WHEN t.status = 'active' THEN 0 WHEN t.status = 'upcoming' THEN 1 ELSE 2 END,
        t.start_time ASC
    `);
    
    // Get user-specific data if authenticated
    const userId = (req as any).auth?.user?.id;
    let userParticipation: Record<number, any> = {};
    
    if (userId && result.rows.length) {
      const ids = result.rows.map((r: any) => r.id);
      const participation = await pool.query(`
        SELECT tournament_id, total_wagered, 
          (SELECT COUNT(*) + 1 FROM tournament_participants 
           WHERE tournament_id = tp.tournament_id AND total_wagered > tp.total_wagered) as rank
        FROM tournament_participants tp
        WHERE tournament_id = ANY($1) AND user_id = $2
      `, [ids, userId]);
      
      participation.rows.forEach((p: any) => {
        userParticipation[p.tournament_id] = { wagered: p.total_wagered, rank: p.rank };
      });
    }
    
    res.json({
      tournaments: result.rows.map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        gameKey: t.game_key,
        startTime: t.start_time,
        endTime: t.end_time,
        minWager: Number(t.min_wager),
        prizePool: Number(t.prize_pool),
        maxParticipants: t.max_participants,
        status: t.status,
        participantCount: parseInt(t.participant_count),
        topWager: t.top_wager ? Number(t.top_wager) : 0,
        userWagered: userParticipation[t.id]?.wagered || 0,
        userRank: userParticipation[t.id]?.rank || null
      }))
    });
  } catch (error) {
    console.error('Tournaments error:', error);
    res.json({ tournaments: [] });
  }
});

app.post('/api/tournaments', requireAuth, async (req: AuthedRequest, res) => {
  try {
    if (!req.auth?.user || req.auth.user.role !== 'owner') {
      return res.status(403).json({ error: 'Admin only' });
    }
    
    const { name, description, gameKey, startTime, endTime, minWager, prizePool, maxParticipants } = req.body;
    
    if (!name || !startTime || !endTime) {
      return res.status(400).json({ error: 'Name, start time, and end time required' });
    }
    
    const result = await pool.query(`
      INSERT INTO tournaments (name, description, game_key, start_time, end_time, min_wager, prize_pool, max_participants, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 
        CASE WHEN $4 <= NOW() THEN 'active' ELSE 'upcoming' END)
      RETURNING *
    `, [name, description || null, gameKey || null, startTime, endTime, minWager || 0, prizePool || 0, maxParticipants || null]);
    
    res.json({ success: true, tournament: result.rows[0] });
  } catch (error) {
    console.error('Create tournament error:', error);
    res.status(500).json({ error: 'Failed to create tournament' });
  }
});

app.post('/api/tournaments/:id/record-wager', requireAuth, async (req: AuthedRequest, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    const userId = req.auth!.user.id;
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount required' });
    }
    
    // Check tournament is active
    const tourney = await pool.query(`
      SELECT id, status, start_time, end_time FROM tournaments WHERE id = $1
    `, [tournamentId]);
    
    if (!tourney.rowCount) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    const t = tourney.rows[0];
    const now = new Date();
    if (t.status !== 'active' || now < new Date(t.start_time) || now > new Date(t.end_time)) {
      return res.status(400).json({ error: 'Tournament not active' });
    }
    
    // Upsert participant wager
    await pool.query(`
      INSERT INTO tournament_participants (tournament_id, user_id, total_wagered)
      VALUES ($1, $2, $3)
      ON CONFLICT (tournament_id, user_id) 
      DO UPDATE SET total_wagered = tournament_participants.total_wagered + $3, updated_at = NOW()
    `, [tournamentId, userId, amount]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Record tournament wager error:', error);
    res.status(500).json({ error: 'Failed to record wager' });
  }
});

// Process tournament status changes
async function processTournaments() {
  try {
    const now = new Date();
    
    // Activate upcoming tournaments
    await pool.query(`
      UPDATE tournaments SET status = 'active' 
      WHERE status = 'upcoming' AND start_time <= $1
    `, [now]);
    
    // End active tournaments
    await pool.query(`
      UPDATE tournaments SET status = 'ended' 
      WHERE status = 'active' AND end_time <= $1
    `, [now]);
  } catch (e) { console.error('Tournament cron error:', e); }
}

app.use(express.static(distPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }

  return res.sendFile(path.join(distPath, 'index.html'));
});

initDb()
  .then(() => {
    setInterval(processRainBotSchedules, 60 * 1000);
    setInterval(processJackpotRounds, 10 * 1000);
    setInterval(processTournaments, 60 * 1000);
    app.listen(port, () => {
      console.log(`Pasus auth server running on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database', error);
    process.exit(1);
  });
