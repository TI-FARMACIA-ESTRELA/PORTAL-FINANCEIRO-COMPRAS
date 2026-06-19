// ==========================================================
// Seed - Portal Financeiro Comercial
// FASE 2: cria o usuário administrador inicial (#1, admin123, ADMIN).
// FASE 4: dados auxiliares iniciais (formas de recebimento e descrições de ação).
//
// Idempotente: pode rodar várias vezes sem duplicar registros (usa upsert por
// chaves únicas). NÃO cria usuários de teste — apenas o admin #1.
// A senha é armazenada com hash seguro (argon2). NUNCA em texto puro.
// ==========================================================
import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

// Formas de recebimento iniciais. Apenas "Crédito em conta corrente" gera crédito.
const RECEIPT_METHODS: { name: string; isCurrentAccountCredit: boolean }[] = [
  { name: 'Bonificado', isCurrentAccountCredit: false },
  { name: 'Depósito', isCurrentAccountCredit: false },
  { name: 'PIX CNPJ', isCurrentAccountCredit: false },
  { name: 'Abatimento em boleto', isCurrentAccountCredit: false },
  { name: 'Transferência bancária', isCurrentAccountCredit: false },
  { name: 'Crédito em conta', isCurrentAccountCredit: false },
  { name: 'Encontro de contas', isCurrentAccountCredit: false },
  { name: 'Crédito em conta corrente', isCurrentAccountCredit: true },
  { name: 'Outro', isCurrentAccountCredit: false },
];

const ACTION_TYPES: string[] = [
  'Adiantamento de demanda',
  'Pagamento de folder',
  'Ação de sell out',
  'Repasse de sell-in',
  'Ponta de gôndola',
  'Campanha comercial',
  'Bonificação comercial',
  'Verba de trade',
  'Acordo comercial',
  'Crédito em conta corrente',
  'Outro',
];

async function main() {
  const passwordHash = await argon2.hash('admin123');

  const admin = await prisma.user.upsert({
    where: { userNumber: 1 },
    update: {},
    create: {
      userNumber: 1,
      name: 'Administrador',
      role: Role.ADMIN,
      isActive: true,
      passwordHash,
    },
  });
  console.log(`[seed] Usuário admin garantido: #${admin.userNumber} (${admin.name})`);

  for (const rm of RECEIPT_METHODS) {
    await prisma.receiptMethod.upsert({
      where: { name: rm.name },
      // Mantém o flag de crédito em conta corrente alinhado, sem sobrescrever status.
      update: { isCurrentAccountCredit: rm.isCurrentAccountCredit },
      create: { name: rm.name, isCurrentAccountCredit: rm.isCurrentAccountCredit },
    });
  }
  console.log(`[seed] Formas de recebimento garantidas: ${RECEIPT_METHODS.length}`);

  for (const name of ACTION_TYPES) {
    await prisma.actionType.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`[seed] Descrições de ação garantidas: ${ACTION_TYPES.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
