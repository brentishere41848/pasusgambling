import type express from 'express';
import type { Pool } from 'pg';

type AppRequest = express.Request & {
  auth?: {
    user: {
      id: number;
      username: string;
    };
  };
};

type RegisterFriendRoutesOptions = {
  app: express.Express;
  pool: Pool;
  requireAuth: express.RequestHandler;
};

export function registerFriendRoutes({ app, pool, requireAuth }: RegisterFriendRoutesOptions) {
  app.get('/api/friends', requireAuth, async (req: AppRequest, res) => {
    try {
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

      const accepted = await pool.query(
        `
        SELECT u.id, u.username, u.avatar, u.created_at,
          CASE WHEN f.user_id = $1 THEN f.friend_id ELSE f.user_id END as friend_user_id,
          f.created_at as friend_since
        FROM friendships f
        JOIN users u ON u.id = CASE WHEN f.user_id = $1 THEN f.friend_id ELSE f.user_id END
        WHERE (f.user_id = $1 OR f.friend_id = $1) AND f.status = 'accepted'
        ORDER BY f.updated_at DESC
      `,
        [userId]
      );

      const incoming = await pool.query(
        `
        SELECT u.id, u.username, u.avatar, u.created_at, f.created_at as requested_at
        FROM friendships f
        JOIN users u ON u.id = f.user_id
        WHERE f.friend_id = $1 AND f.status = 'pending'
        ORDER BY f.created_at DESC
      `,
        [userId]
      );

      const outgoing = await pool.query(
        `
        SELECT u.id, u.username, u.avatar, u.created_at, f.created_at as sent_at
        FROM friendships f
        JOIN users u ON u.id = f.friend_id
        WHERE f.user_id = $1 AND f.status = 'pending'
        ORDER BY f.created_at DESC
      `,
        [userId]
      );

      res.json({
        friends: accepted.rows.map((friend) => ({
          id: friend.friend_user_id,
          username: friend.username,
          avatar: friend.avatar,
          friendSince: friend.friend_since,
        })),
        incoming: incoming.rows.map((request) => ({
          id: request.id,
          username: request.username,
          avatar: request.avatar,
          requestedAt: request.requested_at,
        })),
        outgoing: outgoing.rows.map((request) => ({
          id: request.id,
          username: request.username,
          avatar: request.avatar,
          sentAt: request.sent_at,
        })),
      });
    } catch (error) {
      console.error('Friends error:', error);
      res.json({ friends: [], incoming: [], outgoing: [] });
    }
  });

  app.get('/api/users/search', requireAuth, async (req: AppRequest, res) => {
    try {
      const query = String(req.query.q || '').trim();
      if (!query || query.length < 2) {
        return res.json({ users: [] });
      }

      const userId = req.auth!.user.id;
      const result = await pool.query(
        `
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
      `,
        [userId, query]
      );

      res.json({
        users: result.rows.map((row) => ({
          id: row.id,
          username: row.username,
          avatar: row.avatar,
          friendStatus: row.friend_status,
        })),
      });
    } catch (error) {
      console.error('Search users error:', error);
      res.status(500).json({ error: 'Failed to search users' });
    }
  });

  app.post('/api/friends/request', requireAuth, async (req: AppRequest, res) => {
    try {
      const userId = req.auth!.user.id;
      const { username } = req.body;

      if (!username) {
        return res.status(400).json({ error: 'Username required' });
      }

      const targetResult = await pool.query(`SELECT id FROM users WHERE username = $1`, [username]);
      if (!targetResult.rowCount) {
        return res.status(404).json({ error: 'User not found' });
      }
      const targetId = targetResult.rows[0].id;

      if (targetId === userId) {
        return res.status(400).json({ error: 'Cannot add yourself' });
      }

      const existing = await pool.query(
        `
        SELECT id, status, user_id FROM friendships 
        WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)
      `,
        [userId, targetId]
      );

      if (existing.rowCount) {
        const record = existing.rows[0];
        if (record.status === 'accepted') {
          return res.status(400).json({ error: 'Already friends' });
        }
        if (record.status === 'pending') {
          if (record.user_id === userId) {
            return res.status(400).json({ error: 'Request already sent' });
          }

          await pool.query(
            `
            UPDATE friendships SET status = 'accepted', updated_at = NOW() WHERE id = $1
          `,
            [record.id]
          );
          return res.json({ success: true, message: 'Friend request accepted' });
        }
      }

      await pool.query(
        `
        INSERT INTO friendships (user_id, friend_id, status) VALUES ($1, $2, 'pending')
        ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'pending', updated_at = NOW()
      `,
        [userId, targetId]
      );

      res.json({ success: true, message: 'Friend request sent' });
    } catch (error) {
      console.error('Friend request error:', error);
      res.status(500).json({ error: 'Failed to send friend request' });
    }
  });

  app.post('/api/friends/accept', requireAuth, async (req: AppRequest, res) => {
    try {
      const userId = req.auth!.user.id;
      const { friendId } = req.body;

      if (!friendId) {
        return res.status(400).json({ error: 'Friend ID required' });
      }

      const result = await pool.query(
        `
        UPDATE friendships SET status = 'accepted', updated_at = NOW()
        WHERE user_id = $1 AND friend_id = $2 AND status = 'pending'
        RETURNING id
      `,
        [friendId, userId]
      );

      if (!result.rowCount) {
        return res.status(404).json({ error: 'Friend request not found' });
      }

      res.json({ success: true, message: 'Friend request accepted' });
    } catch (error) {
      console.error('Accept friend error:', error);
      res.status(500).json({ error: 'Failed to accept friend request' });
    }
  });

  app.post('/api/friends/reject', requireAuth, async (req: AppRequest, res) => {
    try {
      const userId = req.auth!.user.id;
      const { friendId } = req.body;

      if (!friendId) {
        return res.status(400).json({ error: 'Friend ID required' });
      }

      await pool.query(
        `
        DELETE FROM friendships 
        WHERE user_id = $1 AND friend_id = $2 AND status = 'pending'
      `,
        [friendId, userId]
      );

      res.json({ success: true, message: 'Friend request rejected' });
    } catch (error) {
      console.error('Reject friend error:', error);
      res.status(500).json({ error: 'Failed to reject friend request' });
    }
  });

  app.delete('/api/friends/:id', requireAuth, async (req: AppRequest, res) => {
    try {
      const userId = req.auth!.user.id;
      const friendId = parseInt(req.params.id, 10);

      await pool.query(
        `
        DELETE FROM friendships 
        WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)
      `,
        [userId, friendId]
      );

      res.json({ success: true, message: 'Friend removed' });
    } catch (error) {
      console.error('Remove friend error:', error);
      res.status(500).json({ error: 'Failed to remove friend' });
    }
  });

  app.post('/api/friends/tip', requireAuth, async (req: AppRequest, res) => {
    const client = await pool.connect();
    try {
      const userId = req.auth!.user.id;
      const { friendId, amount } = req.body;

      if (!friendId || !amount || amount <= 0) {
        return res.status(400).json({ error: 'Valid friend and amount required' });
      }

      const friendCheck = await client.query(
        `
        SELECT 1 FROM friendships 
        WHERE ((user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1))
          AND status = 'accepted'
      `,
        [userId, friendId]
      );

      if (!friendCheck.rowCount) {
        return res.status(400).json({ error: 'You are not friends with this user' });
      }

      const amountCoins = Math.round(Number(amount) * 100);
      if (amountCoins < 1) {
        return res.status(400).json({ error: 'Minimum tip is $0.01' });
      }

      await client.query('BEGIN');

      const walletResult = await client.query(
        `
        SELECT balance, tip_balance FROM wallets WHERE user_id = $1 FOR UPDATE
      `,
        [userId]
      );

      const tipBalance = Number(walletResult.rows[0]?.tip_balance || 0);
      if (tipBalance < amountCoins) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Insufficient tip wallet balance' });
      }

      await client.query(
        `
        UPDATE wallets SET tip_balance = tip_balance - $1::numeric, updated_at = NOW() WHERE user_id = $2
      `,
        [amountCoins, userId]
      );

      await client.query(
        `
        UPDATE wallets SET balance = balance + $1::numeric, updated_at = NOW() WHERE user_id = $2
      `,
        [amountCoins, friendId]
      );

      await client.query(
        `
        INSERT INTO tip_notifications (recipient_user_id, sender_user_id, sender_username, amount)
        VALUES ($1, $2, $3, $4)
      `,
        [friendId, userId, req.auth!.user.username, amountCoins]
      );

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

  app.get('/api/friends/chat/:friendId', requireAuth, async (req: AppRequest, res) => {
    try {
      const userId = req.auth!.user.id;
      const friendId = parseInt(req.params.friendId, 10);

      const friendCheck = await pool.query(
        `
        SELECT 1 FROM friendships 
        WHERE ((user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1))
          AND status = 'accepted'
      `,
        [userId, friendId]
      );

      if (!friendCheck.rowCount) {
        return res.status(400).json({ error: 'You are not friends with this user' });
      }

      const result = await pool.query(
        `
        SELECT id, sender_id, text, created_at
        FROM private_messages
        WHERE (sender_id = $1 AND recipient_id = $2) OR (sender_id = $2 AND recipient_id = $1)
        ORDER BY created_at ASC
        LIMIT 100
      `,
        [userId, friendId]
      );

      res.json({
        messages: result.rows.map((row) => ({
          id: Number(row.id),
          senderId: Number(row.sender_id),
          text: row.text,
          createdAt: row.created_at,
        })),
      });
    } catch (error) {
      console.error('Get chat error:', error);
      res.status(500).json({ error: 'Failed to load messages' });
    }
  });

  app.post('/api/friends/chat', requireAuth, async (req: AppRequest, res) => {
    try {
      const userId = req.auth!.user.id;
      const { friendId, text } = req.body;
      const trimmedText = String(text || '').trim();

      if (!friendId || trimmedText.length === 0) {
        return res.status(400).json({ error: 'Valid friend and message required' });
      }

      if (trimmedText.length > 500) {
        return res.status(400).json({ error: 'Message too long (max 500 characters)' });
      }

      const recentMessages = await pool.query(
        `
        SELECT COUNT(*)::int AS count
        FROM private_messages
        WHERE sender_id = $1
          AND created_at > NOW() - INTERVAL '30 seconds'
      `,
        [userId]
      );

      if (Number(recentMessages.rows[0]?.count || 0) >= 8) {
        return res.status(429).json({ error: 'You are sending messages too quickly. Please slow down.' });
      }

      const friendCheck = await pool.query(
        `
        SELECT 1 FROM friendships 
        WHERE ((user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1))
          AND status = 'accepted'
      `,
        [userId, friendId]
      );

      if (!friendCheck.rowCount) {
        return res.status(400).json({ error: 'You are not friends with this user' });
      }

      const result = await pool.query(
        `
        INSERT INTO private_messages (sender_id, recipient_id, text)
        VALUES ($1, $2, $3)
        RETURNING id, sender_id, text, created_at
      `,
        [userId, friendId, trimmedText]
      );

      const row = result.rows[0];
      res.json({
        message: {
          id: Number(row.id),
          senderId: Number(row.sender_id),
          text: row.text,
          createdAt: row.created_at,
        },
      });
    } catch (error) {
      console.error('Send chat error:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  });
}
