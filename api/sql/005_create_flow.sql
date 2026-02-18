-- caminho: api/sql/005_create_flow.sql

-- =====================================================
-- Fluxo de Conversa - Estrutura SaaS (Multi-tenant)
-- Tabelas:
-- - flow_folders
-- - flows
-- - flow_steps
-- =====================================================

-- =========================
-- FOLDERS
-- =========================
CREATE TABLE IF NOT EXISTS flow_folders (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flow_folders_client
ON flow_folders (client_id);

-- =========================
-- FLOWS
-- =========================
CREATE TABLE IF NOT EXISTS flows (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL,
    folder_id INTEGER REFERENCES flow_folders(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flows_client
ON flows (client_id);

CREATE INDEX IF NOT EXISTS idx_flows_folder
ON flows (folder_id);

-- =========================
-- STEPS
-- =========================
CREATE TABLE IF NOT EXISTS flow_steps (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL,
    flow_id INTEGER NOT NULL REFERENCES flows(id) ON DELETE CASCADE,

    type VARCHAR(20) NOT NULL DEFAULT 'message',
    title TEXT NOT NULL,
    -- ✅ message pode ser NULL (condition/wait)
    message TEXT,

    next_step_id INTEGER,
    condition_true_id INTEGER,
    condition_false_id INTEGER,

    position INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT flow_steps_type_check
    CHECK (type IN ('message', 'condition', 'wait'))
);

CREATE INDEX IF NOT EXISTS idx_flow_steps_flow
ON flow_steps (flow_id);

CREATE INDEX IF NOT EXISTS idx_flow_steps_client
ON flow_steps (client_id);

-- (opcional, mas útil) índices para ligações futuras
CREATE INDEX IF NOT EXISTS idx_flow_steps_next
ON flow_steps (next_step_id);

CREATE INDEX IF NOT EXISTS idx_flow_steps_true
ON flow_steps (condition_true_id);

CREATE INDEX IF NOT EXISTS idx_flow_steps_false
ON flow_steps (condition_false_id);

-- ✅ Foreign keys auto-referência (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_flow_steps_next') THEN
    ALTER TABLE public.flow_steps
    ADD CONSTRAINT fk_flow_steps_next
    FOREIGN KEY (next_step_id)
    REFERENCES public.flow_steps(id)
    ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_flow_steps_true') THEN
    ALTER TABLE public.flow_steps
    ADD CONSTRAINT fk_flow_steps_true
    FOREIGN KEY (condition_true_id)
    REFERENCES public.flow_steps(id)
    ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_flow_steps_false') THEN
    ALTER TABLE public.flow_steps
    ADD CONSTRAINT fk_flow_steps_false
    FOREIGN KEY (condition_false_id)
    REFERENCES public.flow_steps(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- fim: api/sql/005_create_flow.sql
