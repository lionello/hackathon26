CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consentkeys_sub text UNIQUE NOT NULL,
  email text,
  postal_code text NOT NULL DEFAULT 'V6B 1A1',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS watch_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE watch_items DROP COLUMN IF EXISTS min_discount_pct;

CREATE INDEX IF NOT EXISTS watch_items_user_id_idx ON watch_items(user_id);

CREATE TABLE IF NOT EXISTS user_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source text NOT NULL,
  store_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, source, store_id)
);

CREATE TABLE IF NOT EXISTS source_cache (
  source text NOT NULL,
  cache_key text NOT NULL,
  payload jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(source, cache_key)
);

CREATE INDEX IF NOT EXISTS source_cache_expires_at_idx ON source_cache(expires_at);

CREATE TABLE IF NOT EXISTS notifications_sent (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  watch_item_id uuid NOT NULL REFERENCES watch_items(id) ON DELETE CASCADE,
  source text NOT NULL,
  source_item_id text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, watch_item_id, source, source_item_id)
);

CREATE TABLE IF NOT EXISTS worker_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  run_after timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  locked_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS worker_jobs_claim_idx ON worker_jobs(status, run_after, created_at);
