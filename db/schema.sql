CREATE TABLE IF NOT EXISTS players (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  pin text,
  photo text,
  role text,
  deleted_at timestamptz
);

-- Partial (not full-table) unique index: a soft-deleted name can be reused.
CREATE UNIQUE INDEX IF NOT EXISTS players_active_name_idx
  ON players (name) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY,
  team1_player1_id bigint NOT NULL REFERENCES players(id),
  team1_player2_id bigint NOT NULL REFERENCES players(id),
  team2_player1_id bigint NOT NULL REFERENCES players(id),
  team2_player2_id bigint NOT NULL REFERENCES players(id),
  score1 integer NOT NULL,
  score2 integer NOT NULL,
  match_date date NOT NULL,
  comment text NOT NULL DEFAULT '',
  logged_at timestamptz NOT NULL DEFAULT now(),
  seq bigserial
);

CREATE INDEX IF NOT EXISTS matches_date_idx ON matches (match_date);

CREATE TABLE IF NOT EXISTS videos (
  id bigserial PRIMARY KEY,
  url text NOT NULL
);

CREATE TABLE IF NOT EXISTS photos (
  id uuid PRIMARY KEY,
  data_url text NOT NULL,
  seq bigserial
);

CREATE TABLE IF NOT EXISTS slots (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  time text NOT NULL,
  end_date date NOT NULL,
  seq bigserial
);

-- Point-in-time full-state backups (version history). Left as a jsonb blob
-- deliberately: a snapshot is inherently "the whole app at time T", never
-- queried piecemeal, only restored wholesale.
CREATE TABLE IF NOT EXISTS app_snapshots (
  snapshot_date date PRIMARY KEY,
  state jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
