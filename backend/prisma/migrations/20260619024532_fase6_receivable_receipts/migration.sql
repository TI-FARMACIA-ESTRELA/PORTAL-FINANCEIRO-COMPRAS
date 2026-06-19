-- CreateEnum
CREATE TYPE "ReceiptType" AS ENUM ('INTEGRAL', 'PARCIAL');

-- CreateEnum
CREATE TYPE "DestinationType" AS ENUM ('BAIXA_SIMPLES', 'CREDITO_CONTA_CORRENTE');

-- CreateEnum
CREATE TYPE "ConfirmationStatus" AS ENUM ('PENDENTE_CONFIRMACAO', 'CONFIRMADO', 'ESTORNADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "receivable_receipts" (
    "id" TEXT NOT NULL,
    "receivable_id" TEXT NOT NULL,
    "receipt_date" DATE NOT NULL,
    "receipt_method_id" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "receipt_type" "ReceiptType" NOT NULL,
    "destination_type" "DestinationType" NOT NULL DEFAULT 'BAIXA_SIMPLES',
    "confirmation_status" "ConfirmationStatus" NOT NULL DEFAULT 'PENDENTE_CONFIRMACAO',
    "confirmed_at" TIMESTAMP(3),
    "confirmed_by" TEXT,
    "notes" TEXT,
    "is_reversed" BOOLEAN NOT NULL DEFAULT false,
    "reversed_at" TIMESTAMP(3),
    "reversed_by" TEXT,
    "reverse_reason" TEXT,
    "reversal_of_receipt_id" TEXT,
    "current_account_id" TEXT,
    "current_account_movement_id" TEXT,
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receivable_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "receivable_receipts_receivable_id_idx" ON "receivable_receipts"("receivable_id");

-- CreateIndex
CREATE INDEX "receivable_receipts_receipt_date_idx" ON "receivable_receipts"("receipt_date");

-- CreateIndex
CREATE INDEX "receivable_receipts_receipt_method_id_idx" ON "receivable_receipts"("receipt_method_id");

-- CreateIndex
CREATE INDEX "receivable_receipts_confirmation_status_idx" ON "receivable_receipts"("confirmation_status");

-- CreateIndex
CREATE INDEX "receivable_receipts_is_reversed_idx" ON "receivable_receipts"("is_reversed");

-- CreateIndex
CREATE INDEX "receivable_receipts_created_by_idx" ON "receivable_receipts"("created_by");

-- CreateIndex
CREATE INDEX "receivable_receipts_reversal_of_receipt_id_idx" ON "receivable_receipts"("reversal_of_receipt_id");

-- CreateIndex
CREATE INDEX "receivable_receipts_created_at_idx" ON "receivable_receipts"("created_at");

-- AddForeignKey
ALTER TABLE "receivable_receipts" ADD CONSTRAINT "receivable_receipts_receivable_id_fkey" FOREIGN KEY ("receivable_id") REFERENCES "receivables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivable_receipts" ADD CONSTRAINT "receivable_receipts_receipt_method_id_fkey" FOREIGN KEY ("receipt_method_id") REFERENCES "receipt_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivable_receipts" ADD CONSTRAINT "receivable_receipts_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivable_receipts" ADD CONSTRAINT "receivable_receipts_reversed_by_fkey" FOREIGN KEY ("reversed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivable_receipts" ADD CONSTRAINT "receivable_receipts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivable_receipts" ADD CONSTRAINT "receivable_receipts_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivable_receipts" ADD CONSTRAINT "receivable_receipts_reversal_of_receipt_id_fkey" FOREIGN KEY ("reversal_of_receipt_id") REFERENCES "receivable_receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
