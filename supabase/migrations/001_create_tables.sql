-- Run this in Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS user_stats (
  device_id  TEXT        PRIMARY KEY,
  data       JSONB       NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_streak (
  device_id        TEXT        PRIMARY KEY,
  last_played_date TEXT,
  current_streak   INTEGER     NOT NULL DEFAULT 0,
  longest_streak   INTEGER     NOT NULL DEFAULT 0,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_stats   ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streak  ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to read/write their own rows (no auth in this app)
CREATE POLICY "anon_all" ON user_stats  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON user_streak FOR ALL TO anon USING (true) WITH CHECK (true);
