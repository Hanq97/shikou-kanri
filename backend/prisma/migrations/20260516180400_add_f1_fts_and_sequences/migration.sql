-- F1: Full-text search (combined tsvector) + project_code sequences
-- Reference: db-design §5.1, BD §3.3

-- =============================================================================
-- Generated tsvector columns for FTS
-- =============================================================================

ALTER TABLE customers ADD COLUMN search_text tsvector GENERATED ALWAYS AS (
  to_tsvector('simple',
    coalesce(name, '') || ' ' ||
    coalesce(name_kana, '') || ' ' ||
    coalesce(phone, '') || ' ' ||
    coalesce(address, '')
  )
) STORED;

ALTER TABLE projects ADD COLUMN search_text tsvector GENERATED ALWAYS AS (
  to_tsvector('simple',
    coalesce(project_code, '') || ' ' ||
    coalesce(name, '') || ' ' ||
    coalesce(description, '')
  )
) STORED;

-- =============================================================================
-- GIN indexes (partial — only active rows)
-- =============================================================================

CREATE INDEX idx_customers_search_text ON customers USING gin(search_text) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_name_trgm ON customers USING gin (name gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_address_trgm ON customers USING gin (address gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_search_text ON projects USING gin(search_text) WHERE deleted_at IS NULL;

-- =============================================================================
-- Sequences for project_code auto-numbering (YYYY-NNNN, reset per year)
-- Pre-create for 2026 + 2027; future years auto-create on first project insert.
-- =============================================================================

CREATE SEQUENCE IF NOT EXISTS project_code_seq_2026 START 1;
CREATE SEQUENCE IF NOT EXISTS project_code_seq_2027 START 1;
