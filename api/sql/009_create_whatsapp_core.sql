-- caminho: api/sql/009_create_whatsapp_core.sql

-- =====================================================
-- WhatsApp Cloud API Core - Estrutura SaaS (Multi-tenant)
-- Tabelas novas:
-- - wa_accounts
-- - wa_numbers
-- - message_status
-- - conversation_assignments
-- - conversation_ai_logs
--
-- Ajustes em tabelas existentes (criadas no inbox):
-- - conversations
-- - conversation_messages
-- - conversation_events
--
-- Objetivos:
-- - Multi-tenant por client_id
-- - Multi-número por empresa
-- - Mapear tenant via phone_number_id (webhook)
-- - Dedup por wa_message_id (idempotência)
-- - Persistir status (sent/delivered/read/failed)
-- - Estrutura para handoff + logs de IA
-- =====================================================

BEGIN;

-- =========================
-- WA ACCOUNTS (WABA / integração)
-- =========================
CREATE TABLE IF NOT EXISTS wa_accounts (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL,

  -- Meta / WABA
  waba_id TEXT,
  name TEXT,

  -- Token (recomendado criptografar no app; aqui é placeholder)
  access_token TEXT,

  -- status da integração (active/paused/disabled)
  status TEXT NOT NULL DEFAULT 'active',

  -- metadados livres
  meta JSONB,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_accounts_client
ON wa_accounts (client_id);

CREATE INDEX IF NOT EXISTS idx_wa_accounts_waba
ON wa_accounts (waba_id);

-- =========================
-- WA NUMBERS (números conectados)
-- =========================
CREATE TABLE IF NOT EXISTS wa_numbers (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL,
  wa_account_id INTEGER REFERENCES wa_accounts(id) ON DELETE SET NULL,

  -- IDs do WhatsApp Cloud API
  phone_number_id TEXT NOT NULL,   -- usado para resolver tenant no webhook
  display_phone_number TEXT,
  verified_name TEXT,

  -- opcional: e164 do número da empresa
  phone_e164 TEXT,

  -- qualidade / status
  status TEXT NOT NULL DEFAULT 'active', -- active/paused/disabled
  quality_rating TEXT,                  -- GREEN/YELLOW/RED (texto livre)
  messaging_limit_tier TEXT,            -- tier/limite (texto livre)

  -- token específico do número (se você preferir por número)
  access_token TEXT,

  meta JSONB,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_numbers_client
ON wa_numbers (client_id);

-- Único por tenant (pode haver mesmo phone_number_id em tenants diferentes? na prática não)
-- Vamos garantir globalmente único via índice, pois phone_number_id identifica um número na Meta.
CREATE UNIQUE INDEX IF NOT EXISTS ux_wa_numbers_phone_number_id
ON wa_numbers (phone_number_id);

CREATE INDEX IF NOT EXISTS idx_wa_numbers_account
ON wa_numbers (wa_account_id);

-- =========================
-- AJUSTES: CONVERSATIONS (inbox existente)
-- =========================
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS wa_chat_id TEXT,              -- ex: waid do contato ou "from"
  ADD COLUMN IF NOT EXISTS wa_contact_waid TEXT,         -- wa_id do contato (quando disponível)
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'whatsapp', -- whatsapp/instagram/etc (futuro)
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP;

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_conversations_client_wa_number
ON conversations (client_id, wa_number_id);

CREATE INDEX IF NOT EXISTS idx_conversations_client_lastmsg
ON conversations (client_id, COALESCE(last_message_at, updated_at, created_at) DESC);

-- id conversacional do WhatsApp (não é obrigatório, mas ajuda encontrar conversa)
CREATE INDEX IF NOT EXISTS idx_conversations_client_wa_chat
ON conversations (client_id, wa_chat_id);

-- =========================
-- AJUSTES: CONVERSATION_MESSAGES (inbox existente)
-- =========================
ALTER TABLE conversation_messages
  ADD COLUMN IF NOT EXISTS wa_message_id TEXT,     -- id da mensagem no WhatsApp (dedup)
  ADD COLUMN IF NOT EXISTS wa_timestamp BIGINT,    -- timestamp do WhatsApp (epoch)
  ADD COLUMN IF NOT EXISTS wa_from TEXT,           -- número/waid remetente
  ADD COLUMN IF NOT EXISTS wa_to TEXT,             -- número/waid destino
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'created'; -- created/sent/delivered/read/failed

-- Dedup por tenant + wa_message_id (idempotência de webhook)
CREATE UNIQUE INDEX IF NOT EXISTS ux_conv_messages_client_wa_message
ON conversation_messages (client_id, wa_message_id)
WHERE wa_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conv_messages_client_conversation
ON conversation_messages (client_id, conversation_id, created_at ASC, id ASC);

-- =========================
-- MESSAGE STATUS (histórico de status)
-- =========================
CREATE TABLE IF NOT EXISTS message_status (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL,
  conversation_id INTEGER NOT NULL,
  message_id INTEGER NOT NULL,          -- FK lógica para conversation_messages.id
  wa_message_id TEXT,                  -- redundância útil quando status chega antes do insert local
  status TEXT NOT NULL,                -- sent/delivered/read/failed
  error_code TEXT,
  error_title TEXT,
  error_message TEXT,
  raw JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_status_client_message
ON message_status (client_id, message_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_status_client_wa_message
ON message_status (client_id, wa_message_id);

-- =========================
-- CONVERSATION ASSIGNMENTS (auditoria de atribuição)
-- =========================
CREATE TABLE IF NOT EXISTS conversation_assignments (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL,
  conversation_id INTEGER NOT NULL,

  from_user_id INTEGER,
  to_user_id INTEGER,

  reason TEXT,        -- assign/transfer/return_to_ai/auto
  actor_type TEXT,    -- human/system/ai
  actor_id INTEGER,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conv_assign_client_conversation
ON conversation_assignments (client_id, conversation_id, created_at DESC);

-- =========================
-- AI LOGS (controle de custo/decisão)
-- =========================
CREATE TABLE IF NOT EXISTS conversation_ai_logs (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL,
  conversation_id INTEGER NOT NULL,

  provider TEXT,               -- openai/anthropic/etc
  model TEXT,
  decision TEXT,               -- replied/skipped/handoff/blocked
  temperature NUMERIC,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd NUMERIC,            -- custo estimado (controle financeiro)

  prompt JSONB,
  response JSONB,
  meta JSONB,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_logs_client_conversation
ON conversation_ai_logs (client_id, conversation_id, created_at DESC);

COMMIT;

-- fim: api/sql/009_create_whatsapp_core.sql