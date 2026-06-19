-- CreateEnum
CREATE TYPE "SupplierType" AS ENUM ('INDUSTRIA', 'LABORATORIO', 'DISTRIBUIDOR', 'FORNECEDOR', 'OUTRO');

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "trade_name" TEXT NOT NULL,
    "legal_name" TEXT,
    "cnpj" TEXT,
    "supplier_type" "SupplierType" NOT NULL,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "action_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_methods" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_current_account_credit" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receipt_methods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_cnpj_key" ON "suppliers"("cnpj");

-- CreateIndex
CREATE INDEX "suppliers_is_active_idx" ON "suppliers"("is_active");

-- CreateIndex
CREATE INDEX "suppliers_supplier_type_idx" ON "suppliers"("supplier_type");

-- CreateIndex
CREATE UNIQUE INDEX "action_types_name_key" ON "action_types"("name");

-- CreateIndex
CREATE INDEX "action_types_is_active_idx" ON "action_types"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "receipt_methods_name_key" ON "receipt_methods"("name");

-- CreateIndex
CREATE INDEX "receipt_methods_is_active_idx" ON "receipt_methods"("is_active");
