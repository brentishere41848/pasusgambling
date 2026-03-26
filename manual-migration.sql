BEGIN;

CREATE TABLE IF NOT EXISTS user_notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id_created_at
  ON user_notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id_is_read
  ON user_notifications(user_id, is_read);

ALTER TABLE wallets ADD COLUMN IF NOT EXISTS bonus_balance BIGINT NOT NULL DEFAULT 0;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS vault_balance BIGINT NOT NULL DEFAULT 0;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS tip_balance BIGINT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS deposit_bonus_campaigns (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  bonus_percent INT NOT NULL,
  max_bonus_amount BIGINT NOT NULL,
  min_deposit_amount BIGINT NOT NULL DEFAULT 100,
  wagering_multiplier INT NOT NULL DEFAULT 10,
  only_first_deposit BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_deposit_bonuses (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id BIGINT NOT NULL REFERENCES deposit_bonus_campaigns(id) ON DELETE CASCADE,
  transaction_id BIGINT NOT NULL REFERENCES payment_transactions(id) ON DELETE CASCADE,
  deposit_amount BIGINT NOT NULL,
  bonus_amount BIGINT NOT NULL,
  wagering_required BIGINT NOT NULL,
  wagering_remaining BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE (campaign_id, transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_user_deposit_bonuses_user_id_status
  ON user_deposit_bonuses(user_id, status);

INSERT INTO deposit_bonus_campaigns (
  name,
  bonus_percent,
  max_bonus_amount,
  min_deposit_amount,
  wagering_multiplier,
  only_first_deposit,
  is_active
)
SELECT 'First Deposit Boost', 25, 10000, 1000, 10, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM deposit_bonus_campaigns);

ALTER TABLE bet_activities ADD COLUMN IF NOT EXISTS pf_client_seed VARCHAR(128);
ALTER TABLE bet_activities ADD COLUMN IF NOT EXISTS pf_server_seed_hash VARCHAR(128);
ALTER TABLE bet_activities ADD COLUMN IF NOT EXISTS pf_nonce INT;
ALTER TABLE bet_activities ADD COLUMN IF NOT EXISTS pf_result DOUBLE PRECISION;

ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS paid_out_at TIMESTAMPTZ;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS winners_summary JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS mentions JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS chat_message_reactions (
  id BIGSERIAL PRIMARY KEY,
  message_id BIGINT NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_chat_message_reactions_message_id
  ON chat_message_reactions(message_id);

ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general';
ALTER TABLE support_ticket_messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE support_ticket_messages ADD COLUMN IF NOT EXISTS attachment_name TEXT;

ALTER TABLE users ADD COLUMN IF NOT EXISTS reload_claimed_total BIGINT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reload_last_claimed_at TIMESTAMPTZ;

ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS min_level INT NOT NULL DEFAULT 1;
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS min_total_wagered BIGINT NOT NULL DEFAULT 0;
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS referred_only BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS min_level INT NOT NULL DEFAULT 1;
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS min_total_wagered BIGINT NOT NULL DEFAULT 0;
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS referred_only BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS leaderboard_seasons (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'wagered',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  prize_pool BIGINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS site_events (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'event',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  reward_label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO leaderboard_seasons (
  name,
  category,
  starts_at,
  ends_at,
  prize_pool,
  is_active
)
SELECT 'Spring Wager Sprint', 'wagered', NOW() - interval '2 day', NOW() + interval '12 day', 50000, TRUE
WHERE NOT EXISTS (SELECT 1 FROM leaderboard_seasons);

INSERT INTO site_events (
  title,
  description,
  event_type,
  starts_at,
  ends_at,
  reward_label,
  is_active
)
SELECT 'Weekend Rain Rush', 'Join every rain drop this weekend to stack bonus entries and surprise top-up rewards.', 'rain', NOW(), NOW() + interval '3 day', '$250 bonus pool', TRUE
WHERE NOT EXISTS (SELECT 1 FROM site_events);

COMMIT;
