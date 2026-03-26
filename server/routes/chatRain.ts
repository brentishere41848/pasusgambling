import type express from 'express';
import type { Pool, PoolClient } from 'pg';

type AppRequest = express.Request & {
  auth?: {
    token: string;
    tokenHash: string;
    user: {
      id: number;
      username: string;
      role: 'owner' | 'moderator' | 'user';
    };
  };
};

type RegisterChatRainRoutesOptions = {
  app: express.Express;
  pool: Pool;
  createUserNotification: (
    client: Pool | PoolClient,
    userId: number,
    type: string,
    title: string,
    message: string,
    metadata?: Record<string, unknown>
  ) => Promise<void>;
  ensureCurrentRainRound: (client: Pool | PoolClient) => Promise<any>;
  ensureWallet: (client: Pool | PoolClient, userId: number) => Promise<void>;
  extractMentions: (text: string) => string[];
  getActiveCustomRain: (client: Pool | PoolClient, userId?: number | null) => Promise<any>;
  getOnlineUserCount: (client: Pool | PoolClient, windowMinutes?: number) => Promise<number>;
  mapChatMessage: (row: any) => any;
  mapCustomRain: (row: any, joined?: boolean) => any;
  mapRainRound: (row: any, joined?: boolean) => any;
  mapTipNotification: (row: any) => any;
  normalizeCoins: (value: unknown) => number;
  requireAuth: express.RequestHandler;
  resolveAuthFromRequest: (req: AppRequest) => Promise<any>;
  resolvePreferredAvatar: (user: any) => string | null;
  sanitizeWallet: (row: any) => any;
  settleFinishedCustomRains: (client: Pool | PoolClient) => Promise<void>;
};

export function registerChatRainRoutes({
  app,
  pool,
  createUserNotification,
  ensureCurrentRainRound,
  ensureWallet,
  extractMentions,
  getActiveCustomRain,
  getOnlineUserCount,
  mapChatMessage,
  mapCustomRain,
  mapRainRound,
  mapTipNotification,
  normalizeCoins,
  requireAuth,
  resolveAuthFromRequest,
  resolvePreferredAvatar,
  sanitizeWallet,
  settleFinishedCustomRains,
}: RegisterChatRainRoutesOptions) {
  app.get('/api/chat/room', async (req: AppRequest, res) => {
    const client = await pool.connect();

    try {
      let joined = false;
      let authedUserId: number | null = null;

      try {
        const auth = await resolveAuthFromRequest(req);
        authedUserId = auth?.user?.id ? Number(auth.user.id) : null;
      } catch {
        authedUserId = null;
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
        `SELECT cm.id, cm.user_id, cm.username, cm.text, cm.tone, cm.role, cm.avatar_url, cm.mentions, cm.created_at,
                COALESCE(
                  (
                    SELECT jsonb_agg(jsonb_build_object(
                      'emoji', grouped.emoji,
                      'count', grouped.count,
                      'reacted', grouped.reacted
                    ) ORDER BY grouped.emoji)
                    FROM (
                      SELECT r.emoji,
                             COUNT(*)::int AS count,
                             BOOL_OR(r.user_id = $1) AS reacted
                      FROM chat_message_reactions r
                      WHERE r.message_id = cm.id
                      GROUP BY r.emoji
                    ) grouped
                  ),
                  '[]'::jsonb
                ) AS reactions
         FROM chat_messages cm
         ORDER BY cm.created_at DESC
         LIMIT 100`,
        [authedUserId || 0]
      );

      let tipNotifications: any[] = [];
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

  app.get('/api/stats/site', async (_req, res) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [onlineResult, wagerResult, biggestWinResult] = await Promise.all([
        pool.query(`SELECT COUNT(*)::int AS count FROM user_sessions WHERE expires_at IS NULL OR expires_at > NOW()`),
        pool.query(`SELECT COALESCE(SUM(wager), 0)::bigint AS total FROM bet_activities WHERE created_at >= $1`, [today]),
        pool.query(`SELECT MAX(payout) AS biggest FROM bet_activities WHERE created_at >= $1 AND outcome = 'win' LIMIT 1`, [today]),
      ]);

      return res.json({
        stats: {
          playersOnline: Number(onlineResult.rows[0]?.count || 0),
          totalWageredToday: Number(wagerResult.rows[0]?.total || 0),
          biggestWin: Number(biggestWinResult.rows[0]?.biggest || 0),
        },
      });
    } catch (error) {
      console.error('Stats error:', error);
      return res.status(500).json({ error: 'Failed to load stats' });
    }
  });

  app.post('/api/chat/messages', requireAuth, async (req: AppRequest, res) => {
    try {
      const text = String(req.body.text || '').trim();

      if (!text) {
        return res.status(400).json({ error: 'Message is required.' });
      }

      if (text.length > 280) {
        return res.status(400).json({ error: 'Message must be 280 characters or fewer.' });
      }

      const muteCheck = await pool.query(
        `SELECT 1 FROM moderation_history 
         WHERE user_id = $1 AND action = 'mute' 
           AND (expires_at IS NULL OR expires_at > NOW())
         LIMIT 1`,
        [req.auth!.user.id]
      );

      if (muteCheck.rowCount) {
        return res.status(403).json({ error: 'You are muted.' });
      }

      const banCheck = await pool.query(
        `SELECT 1 FROM moderation_history 
         WHERE user_id = $1 AND action = 'ban' 
           AND (expires_at IS NULL OR expires_at > NOW())
         LIMIT 1`,
        [req.auth!.user.id]
      );

      if (banCheck.rowCount) {
        return res.status(403).json({ error: 'You are banned.' });
      }

      const mentions = extractMentions(text);
      const avatarUrl = resolvePreferredAvatar(req.auth!.user);
      const insertResult = await pool.query(
        `INSERT INTO chat_messages (user_id, username, text, tone, role, avatar_url, mentions)
         VALUES ($1, $2, $3, 'normal', $4, $5, $6::jsonb)
         RETURNING id, user_id, username, text, tone, role, avatar_url, mentions, created_at`,
        [req.auth!.user.id, req.auth!.user.username, text, req.auth!.user.role, avatarUrl, JSON.stringify(mentions)]
      );

      if (mentions.length) {
        const mentionedUsers = await pool.query(
          `SELECT id, username
           FROM users
           WHERE LOWER(username) = ANY($1::text[])
             AND id <> $2`,
          [mentions, req.auth!.user.id]
        );

        for (const mentionedUser of mentionedUsers.rows) {
          await createUserNotification(
            pool,
            Number(mentionedUser.id),
            'mention',
            'You were mentioned in chat',
            `${req.auth!.user.username} mentioned you in chat.`,
            { messageId: Number(insertResult.rows[0].id), username: req.auth!.user.username }
          );
        }
      }

      return res.status(201).json({ message: mapChatMessage(insertResult.rows[0]) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to send message.' });
    }
  });

  app.post('/api/chat/messages/:id/react', requireAuth, async (req: AppRequest, res) => {
    try {
      const messageId = Number(req.params.id);
      const emoji = String(req.body.emoji || '').trim().slice(0, 8);
      if (!messageId || !emoji) {
        return res.status(400).json({ error: 'Message ID and emoji are required.' });
      }

      const existing = await pool.query(
        `SELECT id
         FROM chat_message_reactions
         WHERE message_id = $1 AND user_id = $2 AND emoji = $3
         LIMIT 1`,
        [messageId, req.auth!.user.id, emoji]
      );

      if (existing.rowCount) {
        await pool.query(`DELETE FROM chat_message_reactions WHERE id = $1`, [existing.rows[0].id]);
        return res.json({ reacted: false });
      }

      await pool.query(
        `INSERT INTO chat_message_reactions (message_id, user_id, emoji)
         VALUES ($1, $2, $3)`,
        [messageId, req.auth!.user.id, emoji]
      );

      return res.json({ reacted: true });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to react to message.' });
    }
  });

  app.post('/api/rain/join', requireAuth, async (req: AppRequest, res) => {
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

  app.post('/api/rain/contribute', requireAuth, async (req: AppRequest, res) => {
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

  app.post('/api/custom-rain', requireAuth, async (req: AppRequest, res) => {
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

  app.post('/api/custom-rain/join', requireAuth, async (req: AppRequest, res) => {
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

  app.post('/api/custom-rain/tip', requireAuth, async (req: AppRequest, res) => {
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
}
