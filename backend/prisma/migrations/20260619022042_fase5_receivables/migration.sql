-- CreateEnum
CREATE TYPE "FinancialStatus" AS ENUM ('ABERTO', 'PARCIAL', 'QUITADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "receivables" (
    "id" TEXT NOT NULL,
    "negotiation_date" DATE NOT NULL,
    "competence_month" TEXT NOT NULL,
    "expected_receipt_date" DATE NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "action_type_id" TEXT NOT NULL,
    "buyer_id" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "financial_status" "FinancialStatus" NOT NULL DEFAULT 'ABERTO',
    "canceled_at" TIMESTAMP(3),
    "canceled_by" TEXT,
    "cancel_reason" TEXT,
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receivables_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "receivables_buyer_id_idx" ON "receivables"("buyer_id");

-- CreateIndex
CREATE INDEX "receivables_supplier_id_idx" ON "receivables"("supplier_id");

-- CreateIndex
CREATE INDEX "receivables_action_type_id_idx" ON "receivables"("action_type_id");

-- CreateIndex
CREATE INDEX "receivables_competence_month_idx" ON "receivables"("competence_month");

-- CreateIndex
CREATE INDEX "receivables_expected_receipt_date_idx" ON "receivables"("expected_receipt_date");

-- CreateIndex
CREATE INDEX "receivables_financial_status_idx" ON "receivables"("financial_status");

-- CreateIndex
CREATE INDEX "receivables_created_at_idx" ON "receivables"("created_at");

-- AddForeignKey
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_action_type_id_fkey" FOREIGN KEY ("action_type_id") REFERENCES "action_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_canceled_by_fkey" FOREIGN KEY ("canceled_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
