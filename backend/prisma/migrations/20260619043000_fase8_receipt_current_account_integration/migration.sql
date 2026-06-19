CREATE INDEX "receivable_receipts_current_account_id_idx" ON "receivable_receipts"("current_account_id");
CREATE UNIQUE INDEX "receivable_receipts_current_account_movement_id_key" ON "receivable_receipts"("current_account_movement_id");
CREATE INDEX "current_account_movements_receivable_id_idx" ON "current_account_movements"("receivable_id");
CREATE UNIQUE INDEX "current_account_movements_receivable_receipt_id_key" ON "current_account_movements"("receivable_receipt_id");
ALTER TABLE "receivable_receipts" ADD CONSTRAINT "receivable_receipts_current_account_id_fkey" FOREIGN KEY ("current_account_id") REFERENCES "current_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "receivable_receipts" ADD CONSTRAINT "receivable_receipts_current_account_movement_id_fkey" FOREIGN KEY ("current_account_movement_id") REFERENCES "current_account_movements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "current_account_movements" ADD CONSTRAINT "current_account_movements_receivable_id_fkey" FOREIGN KEY ("receivable_id") REFERENCES "receivables"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "current_account_movements" ADD CONSTRAINT "current_account_movements_receivable_receipt_id_fkey" FOREIGN KEY ("receivable_receipt_id") REFERENCES "receivable_receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;