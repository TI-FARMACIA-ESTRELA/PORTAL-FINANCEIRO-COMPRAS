-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('ENTRADA', 'SAIDA', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'ESTORNO');

-- CreateTable
CREATE TABLE "current_accounts" (
    "id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "owner_user_id" TEXT NOT NULL,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "current_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "current_account_users" (
    "id" TEXT NOT NULL,
    "current_account_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "can_view" BOOLEAN NOT NULL DEFAULT true,
    "can_move" BOOLEAN NOT NULL DEFAULT false,
    "can_edit" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "current_account_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "current_account_movements" (
    "id" TEXT NOT NULL,
    "current_account_id" TEXT NOT NULL,
    "type" "MovementType" NOT NULL,
    "movement_date" DATE NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "receipt_method_id" TEXT,
    "action_type_id" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "is_reversed" BOOLEAN NOT NULL DEFAULT false,
    "reversed_at" TIMESTAMP(3),
    "reversed_by" TEXT,
    "reverse_reason" TEXT,
    "reversal_of_movement_id" TEXT,
    "receivable_id" TEXT,
    "receivable_receipt_id" TEXT,
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "current_account_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "current_accounts_supplier_id_idx" ON "current_accounts"("supplier_id");

-- CreateIndex
CREATE INDEX "current_accounts_owner_user_id_idx" ON "current_accounts"("owner_user_id");

-- CreateIndex
CREATE INDEX "current_accounts_is_active_idx" ON "current_accounts"("is_active");

-- CreateIndex
CREATE INDEX "current_accounts_created_at_idx" ON "current_accounts"("created_at");

-- CreateIndex
CREATE INDEX "current_account_users_current_account_id_idx" ON "current_account_users"("current_account_id");

-- CreateIndex
CREATE INDEX "current_account_users_user_id_idx" ON "current_account_users"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "current_account_users_current_account_id_user_id_key" ON "current_account_users"("current_account_id", "user_id");

-- CreateIndex
CREATE INDEX "current_account_movements_current_account_id_idx" ON "current_account_movements"("current_account_id");

-- CreateIndex
CREATE INDEX "current_account_movements_movement_date_idx" ON "current_account_movements"("movement_date");

-- CreateIndex
CREATE INDEX "current_account_movements_type_idx" ON "current_account_movements"("type");

-- CreateIndex
CREATE INDEX "current_account_movements_is_reversed_idx" ON "current_account_movements"("is_reversed");

-- CreateIndex
CREATE INDEX "current_account_movements_reversal_of_movement_id_idx" ON "current_account_movements"("reversal_of_movement_id");

-- CreateIndex
CREATE INDEX "current_account_movements_created_by_idx" ON "current_account_movements"("created_by");

-- CreateIndex
CREATE INDEX "current_account_movements_created_at_idx" ON "current_account_movements"("created_at");

-- AddForeignKey
ALTER TABLE "current_accounts" ADD CONSTRAINT "current_accounts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "current_accounts" ADD CONSTRAINT "current_accounts_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "current_accounts" ADD CONSTRAINT "current_accounts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "current_accounts" ADD CONSTRAINT "current_accounts_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "current_account_users" ADD CONSTRAINT "current_account_users_current_account_id_fkey" FOREIGN KEY ("current_account_id") REFERENCES "current_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "current_account_users" ADD CONSTRAINT "current_account_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "current_account_movements" ADD CONSTRAINT "current_account_movements_current_account_id_fkey" FOREIGN KEY ("current_account_id") REFERENCES "current_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "current_account_movements" ADD CONSTRAINT "current_account_movements_receipt_method_id_fkey" FOREIGN KEY ("receipt_method_id") REFERENCES "receipt_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "current_account_movements" ADD CONSTRAINT "current_account_movements_action_type_id_fkey" FOREIGN KEY ("action_type_id") REFERENCES "action_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "current_account_movements" ADD CONSTRAINT "current_account_movements_reversed_by_fkey" FOREIGN KEY ("reversed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "current_account_movements" ADD CONSTRAINT "current_account_movements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "current_account_movements" ADD CONSTRAINT "current_account_movements_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "current_account_movements" ADD CONSTRAINT "current_account_movements_reversal_of_movement_id_fkey" FOREIGN KEY ("reversal_of_movement_id") REFERENCES "current_account_movements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
