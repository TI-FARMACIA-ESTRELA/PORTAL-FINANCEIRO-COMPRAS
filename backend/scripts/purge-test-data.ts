/**
 * Remove dados operacionais e usuários de teste, preservando:
 * - Admin #1
 * - Formas de recebimento (seed)
 * - Descrições de ação (seed)
 *
 * Uso: npx ts-node scripts/purge-test-data.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const before = {
    users: await prisma.user.count(),
    suppliers: await prisma.supplier.count(),
    receivables: await prisma.receivable.count(),
    receipts: await prisma.receivableReceipt.count(),
    currentAccounts: await prisma.currentAccount.count(),
    movements: await prisma.currentAccountMovement.count(),
    notifications: await prisma.notification.count(),
    auditLogs: await prisma.auditLog.count(),
  };

  console.log('[purge] Antes:', before);

  await prisma.$transaction(async (tx) => {
    await tx.notification.deleteMany();
    await tx.auditLog.deleteMany();

    // Quebra vínculos bidirecionais recebimento <-> movimentação (Fase 8).
    await tx.receivableReceipt.updateMany({
      data: { currentAccountMovementId: null, currentAccountId: null },
    });
    await tx.currentAccountMovement.updateMany({
      data: { receivableReceiptId: null, receivableId: null },
    });

    await tx.currentAccountMovement.deleteMany();
    await tx.receivableReceipt.deleteMany();
    await tx.receivable.deleteMany();
    await tx.currentAccountUser.deleteMany();
    await tx.currentAccount.deleteMany();
    await tx.supplier.deleteMany();
    await tx.user.deleteMany({ where: { userNumber: { not: 1 } } });
  });

  const after = {
    users: await prisma.user.count(),
    suppliers: await prisma.supplier.count(),
    receivables: await prisma.receivable.count(),
    receipts: await prisma.receivableReceipt.count(),
    currentAccounts: await prisma.currentAccount.count(),
    movements: await prisma.currentAccountMovement.count(),
    notifications: await prisma.notification.count(),
    auditLogs: await prisma.auditLog.count(),
    receiptMethods: await prisma.receiptMethod.count(),
    actionTypes: await prisma.actionType.count(),
  };

  const admin = await prisma.user.findUnique({
    where: { userNumber: 1 },
    select: { userNumber: true, name: true, role: true },
  });

  console.log('[purge] Depois:', after);
  console.log('[purge] Admin preservado:', admin);
  console.log('[purge] Concluído — banco pronto para dados reais.');
}

main()
  .catch((error) => {
    console.error('[purge] Erro:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
