-- caminho: api/sql/001_create_contacts.sql

-- =====================================================
-- Tabela: contacts
-- Módulo inicial do PlugConversaPro (CRM base)
-- =====================================================

CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- índice básico para busca futura por telefone
CREATE INDEX IF NOT EXISTS idx_contacts_phone
ON contacts (phone);

-- fim: api/sql/001_create_contacts.sql
