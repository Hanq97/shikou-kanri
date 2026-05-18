-- F2: Full-text search index + quote_number sequences
-- Reference: BD §4.4, BE DD §13.2
-- Note: Architecture spec uses pg_bigm; fallback to pg_trgm (already in F1) since pg_bigm
-- not available in standard postgres:16-alpine image. pg_trgm gives similar fuzzy match.

-- =============================================================================
-- pg_trgm extension for counter_party_name fuzzy search (電帳法 search key)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_quotes_counter_party_trgm
  ON quotes USING gin (counter_party_name gin_trgm_ops)
  WHERE deleted_at IS NULL;

-- =============================================================================
-- Sequences for quote_number per year (Q-YYYY-NNNNN format)
-- Pre-create for 2026 + 2027; future years auto-create on first quote insert.
-- =============================================================================

CREATE SEQUENCE IF NOT EXISTS quote_number_seq_2026 START 1;
CREATE SEQUENCE IF NOT EXISTS quote_number_seq_2027 START 1;
