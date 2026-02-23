-- caminho: api/sql/006_multitenant_contacts_tags.sql

-- =====================================================
-- MIGRAÇÃO: contacts / tags para multi-tenant + vínculo
-- - adiciona client_id (default 1)
-- - adiciona avatar_url em contacts (opcional)
-- - cria tabela contact_tags (N:N)
-- =====================================================

BEGIN;

-- =========================
-- CONTACTS: add client_id + avatar_url
-- =========================
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS client_id INTEGER;

UPDATE contacts
SET client_id = 1
WHERE client_id IS NULL;

ALTER TABLE contacts
  ALTER COLUMN client_id SET NOT NULL;

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

CREATE INDEX IF NOT EXISTS idx_contacts_client
ON contacts (client_id);

CREATE INDEX IF NOT EXISTS idx_contacts_client_created
ON contacts (client_id, created_at DESC);

-- busca básica (opcional)
CREATE INDEX IF NOT EXISTS idx_contacts_client_name
ON contacts (client_id, name);

CREATE INDEX IF NOT EXISTS idx_contacts_client_phone
ON contacts (client_id, phone);

-- =========================
-- TAGS: add client_id
-- =========================
ALTER TABLE tags
  ADD COLUMN IF NOT EXISTS client_id INTEGER;

UPDATE tags
SET client_id = 1
WHERE client_id IS NULL;

ALTER TABLE tags
  ALTER COLUMN client_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tags_client
ON tags (client_id);

-- evita duplicar nome de tag por tenant (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS ux_tags_client_name_ci
ON tags (client_id, lower(name));

-- =========================
-- CONTACT_TAGS (N:N)
-- =========================
CREATE TABLE IF NOT EXISTS contact_tags (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL,
  contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_tags_client_contact
ON contact_tags (client_id, contact_id);

CREATE INDEX IF NOT EXISTS idx_contact_tags_client_tag
ON contact_tags (client_id, tag_id);

-- evita repetição do mesmo vínculo
CREATE UNIQUE INDEX IF NOT EXISTS ux_contact_tags_unique
ON contact_tags (client_id, contact_id, tag_id);

COMMIT;

-- fim: api/sql/006_multitenant_contacts_tags.sql