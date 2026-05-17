-- Allow same quote_number across multiple versions (v1, v2, ...).
-- Unique constraint shifts from quote_number alone to (quote_number, version_no).

ALTER TABLE "quotes" DROP CONSTRAINT IF EXISTS "quotes_quote_number_key";
-- Drop the underlying index too (defensive — some PG versions leave it orphaned)
DROP INDEX IF EXISTS "quotes_quote_number_key";

ALTER TABLE "quotes"
  ADD CONSTRAINT "quotes_quote_number_version_no_key"
  UNIQUE ("quote_number", "version_no");
