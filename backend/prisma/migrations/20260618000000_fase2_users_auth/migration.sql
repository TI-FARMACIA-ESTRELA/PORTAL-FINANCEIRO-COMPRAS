-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'COMPRADOR', 'DIRETORIA');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "user_number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'COMPRADOR',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_user_number_key" ON "users"("user_number");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
