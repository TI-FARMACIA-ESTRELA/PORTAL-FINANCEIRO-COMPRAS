-- Fase 10: notificações in-app
CREATE TYPE "NotificationType" AS ENUM (
  'RECEIVABLE_OVERDUE',
  'RECEIVABLE_DUE_TODAY',
  'RECEIVABLE_DUE_SOON',
  'RECEIPT_PENDING_CONFIRMATION',
  'RECEIPT_REGISTERED',
  'RECEIPT_CONFIRMED',
  'RECEIPT_REVERSED',
  'CURRENT_ACCOUNT_NEGATIVE',
  'CURRENT_ACCOUNT_SHARED',
  'CURRENT_ACCOUNT_SHARED_MOVEMENT',
  'CURRENT_ACCOUNT_MOVEMENT_REVERSED'
);

CREATE TYPE "NotificationSeverity" AS ENUM ('INFO', 'WARNING', 'DANGER', 'SUCCESS');

CREATE TABLE "notifications" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "entity_type" TEXT,
  "entity_id" TEXT,
  "severity" "NotificationSeverity" NOT NULL,
  "metadata" JSONB,
  "dedup_key" TEXT,
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");
CREATE INDEX "notifications_read_at_idx" ON "notifications"("read_at");
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");
CREATE INDEX "notifications_type_idx" ON "notifications"("type");
CREATE INDEX "notifications_entity_type_entity_id_idx" ON "notifications"("entity_type", "entity_id");
CREATE UNIQUE INDEX "notifications_user_id_dedup_key_key" ON "notifications"("user_id", "dedup_key");

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
