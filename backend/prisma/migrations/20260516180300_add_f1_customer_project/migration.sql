-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('individual', 'corporate');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('new_construction', 'remodel', 'single_family', 'multi_family', 'commercial', 'other');

-- CreateEnum
CREATE TYPE "PropertyStructure" AS ENUM ('wood', 'steel', 'rc', 'other');

-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('new_construction', 'remodel', 'repair', 'aftercare');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('quoting', 'received', 'construction', 'completed', 'handed_over', 'cancelled');

-- CreateEnum
CREATE TYPE "ProjectMemberRole" AS ENUM ('owner', 'contributor', 'inspector', 'invited_worker');

-- CreateEnum
CREATE TYPE "FolderType" AS ENUM ('document', 'drawing', 'schedule', 'photo', 'chalkboard', 'inspection', 'custom');

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_type" "CustomerType" NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "name_kana" VARCHAR(200),
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "address" TEXT,
    "is_ob" BOOLEAN NOT NULL DEFAULT false,
    "acquired_at" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "address" TEXT NOT NULL,
    "property_type" "PropertyType" NOT NULL,
    "structure" "PropertyStructure" NOT NULL,
    "year_built" INTEGER,
    "handover_date" DATE,
    "floor_area_sqm" DECIMAL(8,2),
    "photo_urls" TEXT[],
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_code" VARCHAR(20) NOT NULL,
    "customer_id" UUID NOT NULL,
    "property_id" UUID,
    "project_type" "ProjectType" NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'quoting',
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "owner_user_id" UUID NOT NULL,
    "schedule_start" DATE,
    "schedule_end" DATE,
    "actual_start" DATE,
    "actual_end" DATE,
    "amount_total" DECIMAL(15,0),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_on_project" "ProjectMemberRole" NOT NULL,
    "folder_access_override" JSONB,
    "invited_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "folders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "folder_type" "FolderType" NOT NULL,
    "is_public_for_invited" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_searches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "scope" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "filter_json" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customers_phone_idx" ON "customers"("phone");

-- CreateIndex
CREATE INDEX "customers_name_kana_idx" ON "customers"("name_kana");

-- CreateIndex
CREATE INDEX "customers_is_ob_deleted_at_idx" ON "customers"("is_ob", "deleted_at");

-- CreateIndex
CREATE INDEX "customers_created_at_idx" ON "customers"("created_at" DESC);

-- CreateIndex
CREATE INDEX "properties_customer_id_deleted_at_idx" ON "properties"("customer_id", "deleted_at");

-- CreateIndex
CREATE INDEX "properties_handover_date_idx" ON "properties"("handover_date");

-- CreateIndex
CREATE UNIQUE INDEX "projects_project_code_key" ON "projects"("project_code");

-- CreateIndex
CREATE INDEX "projects_status_schedule_start_idx" ON "projects"("status", "schedule_start");

-- CreateIndex
CREATE INDEX "projects_customer_id_created_at_idx" ON "projects"("customer_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "projects_owner_user_id_deleted_at_idx" ON "projects"("owner_user_id", "deleted_at");

-- CreateIndex
CREATE INDEX "project_members_user_id_revoked_at_idx" ON "project_members"("user_id", "revoked_at");

-- CreateIndex
CREATE UNIQUE INDEX "project_members_project_id_user_id_key" ON "project_members"("project_id", "user_id");

-- CreateIndex
CREATE INDEX "folders_project_id_folder_type_idx" ON "folders"("project_id", "folder_type");

-- CreateIndex
CREATE INDEX "saved_searches_user_id_scope_idx" ON "saved_searches"("user_id", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "saved_searches_user_id_scope_name_key" ON "saved_searches"("user_id", "scope", "name");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

