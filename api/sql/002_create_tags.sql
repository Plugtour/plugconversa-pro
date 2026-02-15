-- caminho: api/sql/002_create_tags.sql

-- =====================================================
-- Tabela: tags
-- Módulo de Etiquetas (PlugConversaPro)
-- =====================================================

CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT,
    ai_profile TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- índice para busca por nome
CREATE INDEX IF NOT EXISTS idx_tags_name
ON tags (name);

-- fim: api/sql/002_create_tags.sql
