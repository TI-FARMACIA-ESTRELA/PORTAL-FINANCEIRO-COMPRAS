/**
 * Garante que o PostgreSQL local aponta para o banco de produção (não o de testes).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [testUser, apsen, e2eSupplier] = await Promise.all([
    prisma.user.findUnique({ where: { userNumber: 9001 } }),
    prisma.supplier.findFirst({ where: { tradeName: 'APSEN' } }),
    prisma.supplier.findFirst({
      where: { tradeName: { contains: 'E2E', mode: 'insensitive' } },
    }),
  ]);

  if (e2eSupplier || (testUser?.name.includes('Teste Export') && !apsen)) {
    console.error(
      '[db] Banco de TESTE detectado. Use scripts/start-postgres.ps1 e a pasta .pglocal\\data de produção.',
    );
    process.exit(1);
  }

  if (apsen) {
    console.log('[db] Banco de produção validado (fornecedor APSEN encontrado).');
    return;
  }

  console.log('[db] Banco validado (sem marcadores de teste E2E).');
}

main()
  .catch((error) => {
    console.error('[db] Falha na validação:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
