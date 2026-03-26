import type express from 'express';
import type { Pool, PoolClient } from 'pg';

type AppRequest = express.Request & {
  auth?: {
    user: {
      id: number;
      role: 'owner' | 'moderator' | 'user';
    };
  };
};

type RegisterTournamentRoutesOptions = {
  app: express.Express;
  ensureTournamentPrizes: (client: Pool | PoolClient, tournamentId: number, prizePool: number) => Promise<any>;
  pool: Pool;
  requireAuth: express.RequestHandler;
  requireOwner: express.RequestHandler;
  resolveAuthFromRequest: (req: AppRequest) => Promise<any>;
};

export function registerTournamentRoutes({
  app,
  ensureTournamentPrizes,
  pool,
  requireAuth,
  requireOwner,
  resolveAuthFromRequest,
}: RegisterTournamentRoutesOptions) {
  app.get('/api/tournaments', async (req: AppRequest, res) => {
    try {
      try {
        const auth = await resolveAuthFromRequest(req);
        if (auth) {
          req.auth = auth;
        }
      } catch {
        req.auth = undefined;
      }

      const tableCheck = await pool.query(
        `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'tournaments'
        ) as exists
      `
      );

      if (!tableCheck.rows[0]?.exists) {
        return res.json({ tournaments: [] });
      }

      const result = await pool.query(
        `
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
      `
      );

      const ids = result.rows.map((row: any) => row.id);
      const prizeRows = ids.length
        ? await pool.query(
            `
            SELECT tournament_id, position, amount
            FROM tournament_prizes
            WHERE tournament_id = ANY($1)
            ORDER BY tournament_id ASC, position ASC
          `,
            [ids]
          )
        : { rows: [] as any[] };

      const prizesByTournament = new Map<number, Array<{ position: number; amount: number }>>();
      prizeRows.rows.forEach((row: any) => {
        const key = Number(row.tournament_id);
        const list = prizesByTournament.get(key) || [];
        list.push({ position: Number(row.position), amount: Number(row.amount || 0) });
        prizesByTournament.set(key, list);
      });

      const userId = req.auth?.user?.id;
      const userParticipation: Record<number, any> = {};

      if (userId && result.rows.length) {
        const participation = await pool.query(
          `
          SELECT tournament_id, total_wagered, 
            (SELECT COUNT(*) + 1 FROM tournament_participants 
             WHERE tournament_id = tp.tournament_id AND total_wagered > tp.total_wagered) as rank
          FROM tournament_participants tp
          WHERE tournament_id = ANY($1) AND user_id = $2
        `,
          [ids, userId]
        );

        participation.rows.forEach((row: any) => {
          userParticipation[row.tournament_id] = { wagered: row.total_wagered, rank: row.rank };
        });
      }

      res.json({
        tournaments: result.rows.map((tournament: any) => ({
          id: tournament.id,
          name: tournament.name,
          description: tournament.description,
          type: 'wagered',
          gameKey: tournament.game_key,
          startsAt: tournament.start_time,
          endsAt: tournament.end_time,
          prize: Number(tournament.prize_pool),
          startTime: tournament.start_time,
          endTime: tournament.end_time,
          minWager: Number(tournament.min_wager),
          prizePool: Number(tournament.prize_pool),
          maxParticipants: tournament.max_participants,
          status: tournament.status,
          paidOutAt: tournament.paid_out_at,
          winners: Array.isArray(tournament.winners_summary) ? tournament.winners_summary : [],
          prizes: prizesByTournament.get(Number(tournament.id)) || [],
          participantCount: parseInt(tournament.participant_count, 10),
          topWager: tournament.top_wager ? Number(tournament.top_wager) : 0,
          userWagered: userParticipation[tournament.id]?.wagered || 0,
          userRank: userParticipation[tournament.id]?.rank || null,
        })),
      });
    } catch (error) {
      console.error('Tournaments error:', error);
      res.json({ tournaments: [] });
    }
  });

  app.post('/api/tournaments', requireAuth, async (req: AppRequest, res) => {
    try {
      if (!req.auth?.user || req.auth.user.role !== 'owner') {
        return res.status(403).json({ error: 'Admin only' });
      }

      const { name, description, gameKey, startTime, endTime, minWager, prizePool, maxParticipants } = req.body;

      if (!name || !startTime || !endTime) {
        return res.status(400).json({ error: 'Name, start time, and end time required' });
      }

      const result = await pool.query(
        `
        INSERT INTO tournaments (name, description, game_key, start_time, end_time, min_wager, prize_pool, max_participants, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 
          CASE WHEN $4 <= NOW() THEN 'active' ELSE 'upcoming' END)
        RETURNING *
      `,
        [name, description || null, gameKey || null, startTime, endTime, minWager || 0, prizePool || 0, maxParticipants || null]
      );

      await ensureTournamentPrizes(pool, Number(result.rows[0].id), Number(result.rows[0].prize_pool || 0));

      res.json({ success: true, tournament: result.rows[0] });
    } catch (error) {
      console.error('Create tournament error:', error);
      res.status(500).json({ error: 'Failed to create tournament' });
    }
  });

  app.post('/api/admin/tournaments/:id/start', requireAuth, requireOwner, async (req: AppRequest, res) => {
    try {
      const tournamentId = Number(req.params.id);
      if (!tournamentId) {
        return res.status(400).json({ error: 'Tournament ID is required.' });
      }

      const result = await pool.query(
        `
        UPDATE tournaments
        SET start_time = NOW(),
            status = 'active'
        WHERE id = $1
          AND status = 'upcoming'
          AND end_time > NOW()
        RETURNING *
      `,
        [tournamentId]
      );

      if (!result.rowCount) {
        return res.status(400).json({ error: 'Tournament cannot be started.' });
      }

      return res.json({ success: true, tournament: result.rows[0] });
    } catch (error) {
      console.error('Start tournament error:', error);
      return res.status(500).json({ error: 'Failed to start tournament.' });
    }
  });

  app.post('/api/tournaments/:id/record-wager', requireAuth, (_req: AppRequest, res) => {
    return res.status(403).json({ error: 'Client-side tournament wager recording is disabled.' });
  });
}
