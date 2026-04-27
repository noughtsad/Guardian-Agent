CREATE TABLE IF NOT EXISTS rules (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  enabled      INTEGER NOT NULL DEFAULT 1,
  priority     INTEGER NOT NULL DEFAULT 100,
  rule_type    TEXT NOT NULL CHECK(rule_type IN ('BLOCK','REQUIRE_APPROVAL','INPUT_VALIDATION','TRANSFORM')),
  tool_pattern TEXT NOT NULL,
  condition    TEXT,              -- JSON blob
  transform_fn TEXT,
  timeout_sec  INTEGER DEFAULT 120,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS conversation_turns (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role            TEXT NOT NULL,   -- 'user' | 'assistant' | 'tool'
  content         TEXT,
  tool_name       TEXT,
  tool_input      TEXT,            -- JSON blob
  tool_result     TEXT,            -- JSON blob
  tokens_in       INTEGER DEFAULT 0,
  tokens_out      INTEGER DEFAULT 0,
  blocked         INTEGER DEFAULT 0,
  block_reason    TEXT,
  created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id            TEXT PRIMARY KEY,
  event_type    TEXT NOT NULL,     -- 'BLOCK' | 'INJECTION_ATTEMPT' | 'APPROVAL_*'
  tool_name     TEXT,
  rule_id       TEXT,
  detail        TEXT,              -- JSON blob
  created_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_turns_conv ON conversation_turns(conversation_id);
CREATE INDEX IF NOT EXISTS idx_logs_type  ON audit_logs(event_type);
