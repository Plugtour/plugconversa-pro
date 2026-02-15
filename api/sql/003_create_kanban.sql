-- caminho: api/sql/003_create_kanban.sql

-- =====================================================
-- Kanban - Estrutura SaaS (Multi-tenant por client_id)
-- Tabelas:
-- - kanban_boards
-- - kanban_columns
-- - kanban_cards
-- =====================================================

-- =========================
-- BOARDS
-- =========================
CREATE TABLE IF NOT EXISTS kanban_boards (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kanban_boards_client
ON kanban_boards (client_id);


-- =========================
-- COLUMNS
-- =========================
CREATE TABLE IF NOT EXISTS kanban_columns (
    id SERIAL PRIMARY KEY,
    board_id INTEGER NOT NULL REFERENCES kanban_boards(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kanban_columns_board
ON kanban_columns (board_id);


-- =========================
-- CARDS
-- =========================
CREATE TABLE IF NOT EXISTS kanban_cards (
    id SERIAL PRIMARY KEY,
    column_id INTEGER NOT NULL REFERENCES kanban_columns(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kanban_cards_column
ON kanban_cards (column_id);

-- fim: api/sql/003_create_kanban.sql
