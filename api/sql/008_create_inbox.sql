-- caminho: api/sql/008_create_inbox.sql

-- =====================================================
-- INBOX - Estrutura SaaS (Multi-tenant)
-- Tabelas:
-- - wa_numbers
-- - conversations
-- - conversation_messages
-- - conversation_events
-- - conversation_ai_logs
-- - conversation_followups
-- =====================================================

-- =========================
-- WA NUMBERS
-- =========================
CREATE TABLE IF NOT EXISTS wa_numbers (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL,
  label TEXT,
  phone_e164 TEXT NOT NULL,
  provider TEXT,
  provider_meta JSONB,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_numbers_client
ON wa_numbers (client_id);

-- evita duplicar o mesmo número no mesmo tenant
CREATE UNIQUE INDEX IF NOT EXISTS uq_wa_numbers_client_phone
ON wa_numbers (client_id, phone_e164);

-- =========================
-- CONVERSATIONS
-- =========================
CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL,
  wa_number_id INTEGER REFERENCES wa_numbers(id) ON DELETE SET NULL,

  lead_name TEXT,
  lead_phone_e164 TEXT,

  -- status/handoff
  status TEXT NOT NULL DEFAULT 'ai',          -- 'ai' | 'human' | 'closed'
  ai_active BOOLEAN NOT NULL DEFAULT TRUE,
  human_active BOOLEAN NOT NULL DEFAULT FALSE,

  assigned_user_id INTEGER,                   -- id interno do atendente (quando existir módulo users)
  stage TEXT,                                 -- etapa do funil
  score INTEGER NOT NULL DEFAULT 0,            -- score do lead (0..100 ou livre)
  last_message_at TIMESTAMP,
  last_inbound_at TIMESTAMP,
  last_outbound_at TIMESTAMP,

  meta JSONB,                                 -- dados extras (origem, canal, tags snapshot etc)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_client
ON conversations (client_id);

CREATE INDEX IF NOT EXISTS idx_conversations_client_status
ON conversations (client_id, status);

CREATE INDEX IF NOT EXISTS idx_conversations_client_wa
ON conversations (client_id, wa_number_id);

CREATE INDEX IF NOT EXISTS idx_conversations_client_assigned
ON conversations (client_id, assigned_user_id);

-- =========================
-- MESSAGES
-- =========================
CREATE TABLE IF NOT EXISTS conversation_messages (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- papel/origem
  role TEXT NOT NULL DEFAULT 'user',          -- 'user' | 'ai' | 'agent' | 'system'
  direction TEXT NOT NULL DEFAULT 'in',       -- 'in' | 'out'

  text TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,

  meta JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conv_messages_client
ON conversation_messages (client_id);

CREATE INDEX IF NOT EXISTS idx_conv_messages_client_conv
ON conversation_messages (client_id, conversation_id);

CREATE INDEX IF NOT EXISTS idx_conv_messages_conv_created
ON conversation_messages (conversation_id, created_at);

-- =========================
-- EVENTS (auditoria / logs de ações)
-- =========================
CREATE TABLE IF NOT EXISTS conversation_events (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  type TEXT NOT NULL,                         -- 'assign' | 'transfer' | 'return_to_ai' | 'status_change' | 'note' ...
  actor_type TEXT NOT NULL DEFAULT 'system',  -- 'ai' | 'human' | 'system'
  actor_id INTEGER,                           -- id interno do usuário quando existir

  payload JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conv_events_client
ON conversation_events (client_id);

CREATE INDEX IF NOT EXISTS idx_conv_events_client_conv
ON conversation_events (client_id, conversation_id);

CREATE INDEX IF NOT EXISTS idx_conv_events_conv_created
ON conversation_events (conversation_id, created_at);

-- =========================
-- AI LOGS (trilha IA)
-- =========================
CREATE TABLE IF NOT EXISTS conversation_ai_logs (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  model TEXT,
  kind TEXT NOT NULL DEFAULT 'turn',          -- 'turn' | 'summary' | 'tool' | etc
  prompt TEXT,
  response TEXT,
  tokens_in INTEGER,
  tokens_out INTEGER,

  payload JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_logs_client
ON conversation_ai_logs (client_id);

CREATE INDEX IF NOT EXISTS idx_ai_logs_client_conv
ON conversation_ai_logs (client_id, conversation_id);

-- =========================
-- FOLLOWUPS
-- =========================
CREATE TABLE IF NOT EXISTS conversation_followups (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  status TEXT NOT NULL DEFAULT 'scheduled',   -- 'scheduled' | 'sent' | 'canceled' | 'failed'
  scheduled_at TIMESTAMP NOT NULL,
  sent_at TIMESTAMP,

  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,

  message TEXT,
  payload JSONB,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_followups_client
ON conversation_followups (client_id);

CREATE INDEX IF NOT EXISTS idx_followups_client_conv
ON conversation_followups (client_id, conversation_id);

CREATE INDEX IF NOT EXISTS idx_followups_client_status_time
ON conversation_followups (client_id, status, scheduled_at);

-- fim: api/sql/008_create_inbox.sql