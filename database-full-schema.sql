BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  avatar TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  roblox_user_id BIGINT,
  roblox_username TEXT,
  roblox_display_name TEXT,
  roblox_avatar_url TEXT,
  roblox_verified_at TIMESTAMPTZ,
  roblox_verification_phrase TEXT,
  roblox_verification_started_at TIMESTAMPTZ,
  discord_user_id TEXT,
  discord_username TEXT,
  discord_display_name TEXT,
  discord_avatar_url TEXT,
  discord_verified_at TIMESTAMPTZ,
  custom_avatar_url TEXT,
  avatar_source TEXT NOT NULL DEFAULT 'custom',
  discord_oauth_state TEXT,
  referred_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  affiliate_code_used TEXT,
  rakeback_claimed_total BIGINT NOT NULL DEFAULT 0,
  rakeback_claimed_instant BIGINT NOT NULL DEFAULT 0,
  rakeback_claimed_daily BIGINT NOT NULL DEFAULT 0,
  rakeback_claimed_weekly BIGINT NOT NULL DEFAULT 0,
  rakeback_claimed_monthly BIGINT NOT NULL DEFAULT 0,
  rakeback_last_claimed_daily TIMESTAMPTZ,
  rakeback_last_claimed_weekly TIMESTAMPTZ,
  rakeback_last_claimed_monthly TIMESTAMPTZ,
  reload_claimed_total BIGINT NOT NULL DEFAULT 0,
  reload_last_claimed_at TIMESTAMPTZ,
  daily_reward_streak INT NOT NULL DEFAULT 0,
  daily_reward_last_claimed TIMESTAMPTZ,
  xp_amount BIGINT NOT NULL DEFAULT 0,
  user_level INT NOT NULL DEFAULT 1,
  vip_claimed_levels TEXT NOT NULL DEFAULT '',
  email_opt_in BOOLEAN NOT NULL DEFAULT TRUE,
  email_verified_at TIMESTAMPTZ,
  email_verification_code TEXT,
  email_verification_expires_at TIMESTAMPTZ,
  totp_secret TEXT,
  totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  totp_backup_codes TEXT[],
  totp_pending_secret TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_roblox_user_id_unique
  ON users(roblox_user_id) WHERE roblox_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_discord_user_id_unique
  ON users(discord_user_id) WHERE discord_user_id IS NOT NULL;

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

CREATE TABLE IF NOT EXISTS affiliate_codes (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id BIGSERIAL PRIMARY KEY,
  referrer_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  base_amount BIGINT NOT NULL,
  commission_amount BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  claimed_at TIMESTAMPTZ,
  UNIQUE (source_type, source_ref)
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id BIGSERIAL PRIMARY KEY,
  ticket_id BIGINT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  sender_type TEXT NOT NULL DEFAULT 'user',
  username TEXT NOT NULL DEFAULT 'Support',
  role TEXT NOT NULL DEFAULT 'user',
  message TEXT NOT NULL,
  attachment_url TEXT,
  attachment_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallets (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  balance BIGINT NOT NULL DEFAULT 0,
  bonus_balance BIGINT NOT NULL DEFAULT 0,
  vault_balance BIGINT NOT NULL DEFAULT 0,
  tip_balance BIGINT NOT NULL DEFAULT 0,
  total_deposited BIGINT NOT NULL DEFAULT 0,
  total_withdrawn BIGINT NOT NULL DEFAULT 0,
  total_wagered BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
);

CREATE INDEX IF NOT EXISTS idx_moderation_history_user_id ON moderation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_history_moderator_id ON moderation_history(moderator_user_id);

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
);

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

CREATE TABLE IF NOT EXISTS bet_activities (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_key TEXT NOT NULL,
  wager BIGINT NOT NULL,
  payout BIGINT NOT NULL DEFAULT 0,
  multiplier NUMERIC(12,4) NOT NULL DEFAULT 0,
  outcome TEXT NOT NULL,
  detail TEXT,
  pf_client_seed VARCHAR(128),
  pf_server_seed_hash VARCHAR(128),
  pf_nonce INT,
  pf_result DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  username TEXT NOT NULL,
  text TEXT NOT NULL,
  tone TEXT NOT NULL DEFAULT 'normal',
  role TEXT NOT NULL DEFAULT 'user',
  avatar_url TEXT,
  mentions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS rain_rounds (
  id BIGSERIAL PRIMARY KEY,
  pool_amount BIGINT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  join_opens_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rain_round_participants (
  id BIGSERIAL PRIMARY KEY,
  round_id BIGINT NOT NULL REFERENCES rain_rounds(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (round_id, user_id)
);

CREATE TABLE IF NOT EXISTS tip_notifications (
  id BIGSERIAL PRIMARY KEY,
  recipient_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  sender_username TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

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
);

CREATE TABLE IF NOT EXISTS custom_rain_participants (
  id BIGSERIAL PRIMARY KEY,
  custom_rain_id BIGINT NOT NULL REFERENCES custom_rains(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (custom_rain_id, user_id)
);

CREATE TABLE IF NOT EXISTS promo_codes (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  coin_amount BIGINT NOT NULL,
  max_uses INT NOT NULL DEFAULT 1,
  current_uses INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  min_level INT NOT NULL DEFAULT 1,
  min_total_wagered BIGINT NOT NULL DEFAULT 0,
  referred_only BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_user_id BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promo_code_claims (
  id BIGSERIAL PRIMARY KEY,
  promo_code_id BIGINT NOT NULL REFERENCES promo_codes(id),
  user_id BIGINT NOT NULL REFERENCES users(id),
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (promo_code_id, user_id)
);

CREATE TABLE IF NOT EXISTS broadcasts (
  id BIGSERIAL PRIMARY KEY,
  message TEXT NOT NULL,
  min_level INT NOT NULL DEFAULT 1,
  min_total_wagered BIGINT NOT NULL DEFAULT 0,
  referred_only BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_user_id BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

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

CREATE TABLE IF NOT EXISTS rain_bot_schedules (
  id BIGSERIAL PRIMARY KEY,
  interval_minutes INT NOT NULL,
  min_pool_amount BIGINT NOT NULL DEFAULT 100,
  rain_amount BIGINT NOT NULL DEFAULT 500,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_user_id BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_triggered_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS pf_seeds (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_seed VARCHAR(64) NOT NULL,
  server_seed_hash VARCHAR(128) NOT NULL,
  server_seed_secret VARCHAR(128) NOT NULL,
  nonce INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pf_seeds_user_id ON pf_seeds(user_id);

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
);

CREATE TABLE IF NOT EXISTS jackpot_participants (
  id BIGSERIAL PRIMARY KEY,
  round_id BIGINT NOT NULL REFERENCES jackpot_rounds(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  tickets INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (round_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_jackpot_rounds_status ON jackpot_rounds(status);
CREATE INDEX IF NOT EXISTS idx_jackpot_participants_round_id ON jackpot_participants(round_id);

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

CREATE TABLE IF NOT EXISTS friendships (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS tournaments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  game_key VARCHAR(50),
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  min_wager BIGINT NOT NULL DEFAULT 0,
  prize_pool BIGINT NOT NULL DEFAULT 0,
  max_participants INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'upcoming',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_out_at TIMESTAMPTZ,
  winners_summary JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS tournament_participants (
  id SERIAL PRIMARY KEY,
  tournament_id BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_wagered BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tournament_id, user_id)
);

CREATE TABLE IF NOT EXISTS tournament_prizes (
  id SERIAL PRIMARY KEY,
  tournament_id BIGINT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  amount BIGINT NOT NULL,
  UNIQUE (tournament_id, position)
);

CREATE TABLE IF NOT EXISTS private_messages (
  id BIGSERIAL PRIMARY KEY,
  sender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
