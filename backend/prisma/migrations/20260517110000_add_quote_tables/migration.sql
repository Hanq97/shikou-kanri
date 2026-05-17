-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('draft', 'submitted', 'pending_admin', 'approved', 'rejected', 'sent', 'won', 'lost');

-- CreateEnum
CREATE TYPE "QuoteChangeType" AS ENUM ('correction', 'deletion', 'status_change');

-- AlterTable

-- AlterTable

-- CreateTable
CREATE TABLE "quotes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quote_number" VARCHAR(30) NOT NULL,
    "project_id" UUID NOT NULL,
    "version_no" INTEGER NOT NULL DEFAULT 1,
    "version" INTEGER NOT NULL DEFAULT 0,
    "status" "QuoteStatus" NOT NULL DEFAULT 'draft',
    "issued_at" DATE NOT NULL,
    "valid_until" DATE,
    "counter_party_name" VARCHAR(200) NOT NULL,
    "amount_subtotal" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "amount_tax" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "amount_total" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "qualified_invoice_number" VARCHAR(20),
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quote_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "category" VARCHAR(50),
    "item_name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "unit" VARCHAR(20) NOT NULL,
    "quantity" DECIMAL(15,2) NOT NULL,
    "unit_price" DECIMAL(15,0) NOT NULL,
    "amount" DECIMAL(15,0) NOT NULL,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0.10,
    "is_optional" BOOLEAN NOT NULL DEFAULT false,
    "unit_price_master_id" UUID,

    CONSTRAINT "quote_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quote_id" UUID NOT NULL,
    "version_no" INTEGER NOT NULL,
    "change_type" "QuoteChangeType" NOT NULL,
    "change_reason" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changed_by" UUID NOT NULL,
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_prices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(30) NOT NULL,
    "category" VARCHAR(50),
    "item_name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "unit" VARCHAR(20) NOT NULL,
    "default_unit_price" DECIMAL(15,0) NOT NULL,
    "supplier_name" VARCHAR(200),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "unit_prices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quotes_quote_number_key" ON "quotes"("quote_number");

-- CreateIndex
CREATE INDEX "quotes_project_id_idx" ON "quotes"("project_id");

-- CreateIndex
CREATE INDEX "quotes_issued_at_idx" ON "quotes"("issued_at" DESC);

-- CreateIndex
CREATE INDEX "quotes_amount_total_idx" ON "quotes"("amount_total");

-- CreateIndex
CREATE INDEX "quotes_status_idx" ON "quotes"("status");

-- CreateIndex
CREATE INDEX "quote_lines_quote_id_sort_order_idx" ON "quote_lines"("quote_id", "sort_order");

-- CreateIndex
CREATE INDEX "quote_versions_quote_id_changed_at_idx" ON "quote_versions"("quote_id", "changed_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "unit_prices_code_key" ON "unit_prices"("code");

-- CreateIndex
CREATE INDEX "unit_prices_category_is_active_idx" ON "unit_prices"("category", "is_active");

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_unit_price_master_id_fkey" FOREIGN KEY ("unit_price_master_id") REFERENCES "unit_prices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_versions" ADD CONSTRAINT "quote_versions_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_versions" ADD CONSTRAINT "quote_versions_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_prices" ADD CONSTRAINT "unit_prices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_prices" ADD CONSTRAINT "unit_prices_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

