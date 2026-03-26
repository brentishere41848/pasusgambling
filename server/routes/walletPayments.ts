import type express from 'express';
import type { Pool, PoolClient } from 'pg';

type AppRequest = express.Request & {
  rawBody?: string;
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

type RegisterWalletPaymentRoutesOptions = {
  apiBaseUrl: string;
  app: express.Express;
  appBaseUrl: string;
  buildIpnSignature: (body: string) => string;
  creditDepositIfNeeded: (client: PoolClient, transactionId: number) => Promise<void>;
  ensureWallet: (client: Pool | PoolClient, userId: number) => Promise<void>;
  getPrimaryOwnerId: (client: Pool | PoolClient) => Promise<number | null>;
  getWallet: (client: Pool | PoolClient, userId: number) => Promise<any>;
  mapTransaction: (row: any) => any;
  MIN_DEPOSIT_USD: number;
  normalizeCoins: (value: unknown) => number;
  normalizeFiatAmount: (value: unknown) => number;
  nowPaymentsApiKey?: string;
  nowPaymentsBaseUrl: string;
  nowPaymentsHeaders: () => Record<string, string>;
  nowPaymentsIpnSecret?: string;
  pool: Pool;
  requireAuth: express.RequestHandler;
  sanitizeWallet: (row: any) => any;
};

export function registerWalletPaymentRoutes({
  apiBaseUrl,
  app,
  appBaseUrl,
  buildIpnSignature,
  creditDepositIfNeeded,
  ensureWallet,
  getPrimaryOwnerId,
  getWallet,
  mapTransaction,
  MIN_DEPOSIT_USD,
  normalizeCoins,
  normalizeFiatAmount,
  nowPaymentsApiKey,
  nowPaymentsBaseUrl,
  nowPaymentsHeaders,
  nowPaymentsIpnSecret,
  pool,
  requireAuth,
  sanitizeWallet,
}: RegisterWalletPaymentRoutesOptions) {
  app.get('/api/wallet/me', requireAuth, async (req: AppRequest, res) => {
    try {
      const wallet = await getWallet(pool, req.auth!.user.id);
      return res.json({ wallet });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to load wallet.' });
    }
  });

  app.post('/api/wallet/deposit', requireAuth, (_req: AppRequest, res) => {
    return res.status(403).json({ error: 'Direct wallet credits are disabled. Use the payments deposit flow instead.' });
  });

  app.post('/api/wallet/adjust', requireAuth, (_req: AppRequest, res) => {
    return res.status(403).json({ error: 'Direct wallet adjustments are disabled.' });
  });

  app.post('/api/payments/nowpayments/create', requireAuth, async (req: AppRequest, res) => {
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

  app.get('/api/payments/transactions', requireAuth, async (req: AppRequest, res) => {
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

  app.get('/api/payments/transactions/:id', requireAuth, async (req: AppRequest, res) => {
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

  app.post('/api/payments/withdrawals/request', requireAuth, async (req: AppRequest, res) => {
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

  app.post('/api/wallet/transfer', requireAuth, async (req: AppRequest, res) => {
    const client = await pool.connect();
    try {
      const direction = String(req.body.direction || '').trim();
      const amount = normalizeCoins(req.body.amount);
      if (!['main_to_vault', 'vault_to_main', 'main_to_tip', 'tip_to_main'].includes(direction) || amount <= 0) {
        return res.status(400).json({ error: 'Valid transfer direction and amount are required.' });
      }

      await client.query('BEGIN');
      await ensureWallet(client, req.auth!.user.id);

      const walletResult = await client.query(
        `SELECT balance, bonus_balance, vault_balance, tip_balance, total_deposited, total_withdrawn
         FROM wallets
         WHERE user_id = $1
         FOR UPDATE`,
        [req.auth!.user.id]
      );

      if (!walletResult.rowCount) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Wallet not found.' });
      }

      const wallet = walletResult.rows[0];
      const balance = Number(wallet.balance || 0);
      const vaultBalance = Number(wallet.vault_balance || 0);
      const tipBalance = Number(wallet.tip_balance || 0);

      if (direction === 'main_to_vault') {
        if (balance < amount) throw new Error('Insufficient main balance.');
        await client.query(`UPDATE wallets SET balance = balance - $1, vault_balance = vault_balance + $1, updated_at = NOW() WHERE user_id = $2`, [amount, req.auth!.user.id]);
      } else if (direction === 'vault_to_main') {
        if (vaultBalance < amount) throw new Error('Insufficient vault balance.');
        await client.query(`UPDATE wallets SET vault_balance = vault_balance - $1, balance = balance + $1, updated_at = NOW() WHERE user_id = $2`, [amount, req.auth!.user.id]);
      } else if (direction === 'main_to_tip') {
        if (balance < amount) throw new Error('Insufficient main balance.');
        await client.query(`UPDATE wallets SET balance = balance - $1, tip_balance = tip_balance + $1, updated_at = NOW() WHERE user_id = $2`, [amount, req.auth!.user.id]);
      } else if (direction === 'tip_to_main') {
        if (tipBalance < amount) throw new Error('Insufficient tip wallet balance.');
        await client.query(`UPDATE wallets SET tip_balance = tip_balance - $1, balance = balance + $1, updated_at = NOW() WHERE user_id = $2`, [amount, req.auth!.user.id]);
      }

      const updated = await getWallet(client, req.auth!.user.id);
      await client.query('COMMIT');
      return res.json({ wallet: updated });
    } catch (error) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to transfer wallet funds.' });
    } finally {
      client.release();
    }
  });

  app.get('/api/wallet/ledger', requireAuth, async (req: AppRequest, res) => {
    try {
      const userId = req.auth!.user.id;
      const [deposits, withdrawals, promos, affiliateClaims, receivedTips, sentTips] = await Promise.all([
        pool.query(
          `SELECT id, created_at, payment_status, price_amount, pay_currency
           FROM payment_transactions
           WHERE user_id = $1
           ORDER BY created_at DESC
           LIMIT 25`,
          [userId]
        ),
        pool.query(
          `SELECT id, created_at, status, amount, fee_amount, net_amount, currency
           FROM withdrawal_requests
           WHERE user_id = $1
           ORDER BY created_at DESC
           LIMIT 25`,
          [userId]
        ),
        pool.query(
          `SELECT pcc.id, pcc.claimed_at, pc.code, pc.coin_amount
           FROM promo_code_claims pcc
           JOIN promo_codes pc ON pc.id = pcc.promo_code_id
           WHERE pcc.user_id = $1
           ORDER BY pcc.claimed_at DESC
           LIMIT 25`,
          [userId]
        ),
        pool.query(
          `SELECT MIN(claimed_at) AS created_at, SUM(commission_amount)::bigint AS amount
           FROM affiliate_commissions
           WHERE referrer_user_id = $1 AND claimed_at IS NOT NULL
           GROUP BY claimed_at
           ORDER BY created_at DESC
           LIMIT 25`,
          [userId]
        ),
        pool.query(
          `SELECT id, created_at, sender_username, amount
           FROM tip_notifications
           WHERE recipient_user_id = $1
           ORDER BY created_at DESC
           LIMIT 25`,
          [userId]
        ),
        pool.query(
          `SELECT id, created_at, sender_username, amount
           FROM tip_notifications
           WHERE sender_user_id = $1
           ORDER BY created_at DESC
           LIMIT 25`,
          [userId]
        ),
      ]);

      const ledger = [
        ...deposits.rows.map((row) => ({ id: `dep-${row.id}`, kind: 'deposit', amount: Number(row.price_amount || 0), status: row.payment_status, subtitle: row.pay_currency ? String(row.pay_currency).toUpperCase() : 'Crypto deposit', createdAt: row.created_at })),
        ...withdrawals.rows.map((row) => ({ id: `wd-${row.id}`, kind: 'withdrawal', amount: -Number(row.amount || 0), status: row.status, subtitle: `${String(row.currency || 'crypto').toUpperCase()} withdrawal`, createdAt: row.created_at, feeAmount: Number(row.fee_amount || 0), netAmount: Number(row.net_amount || 0) })),
        ...promos.rows.map((row) => ({ id: `promo-${row.id}`, kind: 'promo', amount: Number(row.coin_amount || 0), status: 'claimed', subtitle: `Promo ${row.code}`, createdAt: row.claimed_at })),
        ...affiliateClaims.rows.map((row, index) => ({ id: `aff-${index}-${row.created_at}`, kind: 'affiliate', amount: Number(row.amount || 0), status: 'claimed', subtitle: 'Affiliate reward claim', createdAt: row.created_at })),
        ...receivedTips.rows.map((row) => ({ id: `tip-in-${row.id}`, kind: 'tip_in', amount: Number(row.amount || 0), status: 'received', subtitle: `Tip from ${row.sender_username}`, createdAt: row.created_at })),
        ...sentTips.rows.map((row) => ({ id: `tip-out-${row.id}`, kind: 'tip_out', amount: -Number(row.amount || 0), status: 'sent', subtitle: 'Chat/Friend tip sent', createdAt: row.created_at })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 60);

      return res.json({ ledger });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to load wallet ledger.' });
    }
  });

  app.get('/api/wallet/bonuses', requireAuth, async (req: AppRequest, res) => {
    try {
      const [campaignsResult, activeBonusesResult] = await Promise.all([
        pool.query(
          `SELECT id, name, bonus_percent, max_bonus_amount, min_deposit_amount, wagering_multiplier, only_first_deposit
           FROM deposit_bonus_campaigns
           WHERE is_active = TRUE
             AND (expires_at IS NULL OR expires_at > NOW())
           ORDER BY created_at ASC`
        ),
        pool.query(
          `SELECT udb.id, udb.deposit_amount, udb.bonus_amount, udb.wagering_required, udb.wagering_remaining, udb.status, udb.created_at,
                  dbc.name
           FROM user_deposit_bonuses udb
           JOIN deposit_bonus_campaigns dbc ON dbc.id = udb.campaign_id
           WHERE udb.user_id = $1
           ORDER BY udb.created_at DESC
           LIMIT 10`,
          [req.auth!.user.id]
        ),
      ]);

      return res.json({
        campaigns: campaignsResult.rows.map((row) => ({
          id: Number(row.id),
          name: row.name,
          bonusPercent: Number(row.bonus_percent || 0),
          maxBonusAmount: Number(row.max_bonus_amount || 0),
          minDepositAmount: Number(row.min_deposit_amount || 0),
          wageringMultiplier: Number(row.wagering_multiplier || 0),
          onlyFirstDeposit: Boolean(row.only_first_deposit),
        })),
        bonuses: activeBonusesResult.rows.map((row) => ({
          id: Number(row.id),
          name: row.name,
          depositAmount: Number(row.deposit_amount || 0),
          bonusAmount: Number(row.bonus_amount || 0),
          wageringRequired: Number(row.wagering_required || 0),
          wageringRemaining: Number(row.wagering_remaining || 0),
          status: row.status,
          createdAt: row.created_at,
        })),
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to load wallet bonuses.' });
    }
  });

  app.post('/api/payments/nowpayments/ipn', async (req: AppRequest, res) => {
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
}
