-- CreateEnum
CREATE TYPE "MaintenanceScheduleType" AS ENUM ('one_year', 'three_year', 'five_year', 'ten_year', 'custom');

-- CreateEnum
CREATE TYPE "MaintenanceScheduleStatus" AS ENUM ('pending', 'notified', 'overdue', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "AftercareRecordType" AS ENUM ('inspection', 'repair', 'inquiry', 'complaint', 'other');

-- CreateEnum
CREATE TYPE "AftercareRecordStatus" AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- CreateTable
CREATE TABLE "maintenance_schedules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "property_id" UUID NOT NULL,
    "schedule_type" "MaintenanceScheduleType" NOT NULL,
    "scheduled_date" DATE NOT NULL,
    "status" "MaintenanceScheduleStatus" NOT NULL DEFAULT 'pending',
    "notified_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "completed_record_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "maintenance_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aftercare_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "property_id" UUID,
    "schedule_id" UUID,
    "record_type" "AftercareRecordType" NOT NULL,
    "status" "AftercareRecordStatus" NOT NULL DEFAULT 'open',
    "occurred_at" DATE NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "handled_by" UUID,
    "resolved_at" TIMESTAMPTZ(6),
    "resolution_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "aftercare_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "maintenance_schedules_property_id_scheduled_date_idx" ON "maintenance_schedules"("property_id", "scheduled_date");

-- CreateIndex
CREATE INDEX "maintenance_schedules_status_scheduled_date_idx" ON "maintenance_schedules"("status", "scheduled_date");

-- CreateIndex
CREATE INDEX "maintenance_schedules_scheduled_date_idx" ON "maintenance_schedules"("scheduled_date");

-- CreateIndex
CREATE INDEX "aftercare_records_customer_id_occurred_at_idx" ON "aftercare_records"("customer_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "aftercare_records_property_id_occurred_at_idx" ON "aftercare_records"("property_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "aftercare_records_status_occurred_at_idx" ON "aftercare_records"("status", "occurred_at");

-- AddForeignKey
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_completed_record_id_fkey" FOREIGN KEY ("completed_record_id") REFERENCES "aftercare_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aftercare_records" ADD CONSTRAINT "aftercare_records_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aftercare_records" ADD CONSTRAINT "aftercare_records_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aftercare_records" ADD CONSTRAINT "aftercare_records_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "maintenance_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aftercare_records" ADD CONSTRAINT "aftercare_records_handled_by_fkey" FOREIGN KEY ("handled_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aftercare_records" ADD CONSTRAINT "aftercare_records_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aftercare_records" ADD CONSTRAINT "aftercare_records_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
