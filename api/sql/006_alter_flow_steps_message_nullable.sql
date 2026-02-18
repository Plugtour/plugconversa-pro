-- caminho: api/sql/006_alter_flow_steps_message_nullable.sql

-- 🔹 Permite message ser NULL (necessário para condition e wait)
ALTER TABLE public.flow_steps
ALTER COLUMN message DROP NOT NULL;

-- fim: api/sql/006_alter_flow_steps_message_nullable.sql
