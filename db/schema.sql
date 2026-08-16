CREATE TABLE IF NOT EXISTS app_resources (
  resource text NOT NULL CHECK (resource IN ('players', 'matches', 'videos', 'photos', 'slots')),
  item_key text NOT NULL,
  position integer NOT NULL CHECK (position >= 0),
  value jsonb NOT NULL,
  PRIMARY KEY (resource, item_key)
);

CREATE INDEX IF NOT EXISTS app_resources_order_idx
  ON app_resources (resource, position);

CREATE TABLE IF NOT EXISTS app_snapshots (
  snapshot_date date PRIMARY KEY,
  state jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
