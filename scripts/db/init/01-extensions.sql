-- Enable required PostgreSQL extensions for shikou-kanri
-- Per ADR-004 (Database) + ADR-007 (Search)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- pg_bigm: not included in postgres:16-alpine by default.
-- For Japanese FTS in dev, fallback to pg_trgm.
-- Production AWS RDS will have pg_bigm available via parameter group.

-- pgvector: install if extension is available (Phase 3, dormant in Phase 1)
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS "vector";
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pgvector not available — skipping (will install via dedicated image when Phase 3 active)';
END
$$;
