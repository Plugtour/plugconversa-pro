-- caminho: api/sql/004_update_flow_steps_structure.sql

-- 🔹 Adiciona campo type
ALTER TABLE flow_steps
ADD COLUMN IF NOT EXISTS type VARCHAR(20) NOT NULL DEFAULT 'message';

-- 🔹 Adiciona estrutura para encadeamento futuro
ALTER TABLE flow_steps
ADD COLUMN IF NOT EXISTS next_step_id INTEGER,
ADD COLUMN IF NOT EXISTS condition_true_id INTEGER,
ADD COLUMN IF NOT EXISTS condition_false_id INTEGER;

-- 🔹 Foreign Keys (auto-referência) — idempotente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_flow_steps_next'
  ) THEN
    ALTER TABLE flow_steps
    ADD CONSTRAINT fk_flow_steps_next
    FOREIGN KEY (next_step_id)
    REFERENCES flow_steps(id)
    ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_flow_steps_true'
  ) THEN
    ALTER TABLE flow_steps
    ADD CONSTRAINT fk_flow_steps_true
    FOREIGN KEY (condition_true_id)
    REFERENCES flow_steps(id)
    ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_flow_steps_false'
  ) THEN
    ALTER TABLE flow_steps
    ADD CONSTRAINT fk_flow_steps_false
    FOREIGN KEY (condition_false_id)
    REFERENCES flow_steps(id)
    ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'flow_steps_type_check'
  ) THEN
    ALTER TABLE flow_steps
    ADD CONSTRAINT flow_steps_type_check
    CHECK (type IN ('message', 'condition', 'wait'));
  END IF;
END $$;

-- fim: api/sql/004_update_flow_steps_structure.sql
