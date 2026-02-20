-- caminho: api/sql/007_fix_flow_steps_structure.sql

-- =====================================================
-- FIX: alinhar estrutura da tabela flow_steps
-- Adiciona colunas que podem faltar em bancos antigos
-- =====================================================

BEGIN;

-- =========================
-- Colunas principais
-- =========================
ALTER TABLE public.flow_steps
ADD COLUMN IF NOT EXISTS type VARCHAR(20) NOT NULL DEFAULT 'message',
ADD COLUMN IF NOT EXISTS next_step_id INTEGER,
ADD COLUMN IF NOT EXISTS condition_true_id INTEGER,
ADD COLUMN IF NOT EXISTS condition_false_id INTEGER,
ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- Garante valores válidos para type em registros antigos
UPDATE public.flow_steps
SET type = 'message'
WHERE type IS NULL OR trim(type) = '';

-- =========================
-- Constraint de validação do tipo
-- =========================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'flow_steps_type_check'
  ) THEN
    ALTER TABLE public.flow_steps
    ADD CONSTRAINT flow_steps_type_check
    CHECK (type IN ('message', 'condition', 'wait'));
  END IF;
END $$;

-- =========================
-- Foreign Keys auto-referência
-- =========================
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

COMMIT;

-- fim: api/sql/007_fix_flow_steps_structure.sql