import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MovementType, Prisma, Role } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntity, type ActorContext } from '../audit/audit.types';
import type { AuthenticatedUser } from '../auth/auth.types';

export type CurrentAccountForReceipt = Prisma.CurrentAccountGetPayload<{
  include: { shares: true };
}>;

function startOfTodayUtc(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
}

/** Valida conta corrente para crédito via recebimento (fornecedor + permissão). */
export async function validateCurrentAccountForReceipt(
  prisma: PrismaService,
  currentAccountId: string,
  supplierId: string,
  user: AuthenticatedUser,
): Promise<CurrentAccountForReceipt> {
  const acc = await prisma.currentAccount.findUnique({
    where: { id: currentAccountId },
    include: { shares: true },
  });
  if (!acc) throw new NotFoundException('Conta corrente não encontrada.');
  if (!acc.isActive) throw new BadRequestException('A conta corrente está inativa.');
  if (acc.supplierId !== supplierId) {
    throw new BadRequestException(
      'A conta corrente deve ser do mesmo fornecedor/indústria do lançamento.',
    );
  }

  if (user.role === Role.ADMIN) return acc;

  if (acc.ownerUserId === user.id) return acc;

  const share = acc.shares.find((s) => s.userId === user.id);
  if (!share?.canMove) {
    throw new NotFoundException('Conta corrente não encontrada.');
  }

  return acc;
}

/** Impede dupla integração (uma ENTRADA por recebimento). */
export function ensureNoDoubleIntegration(receipt: { currentAccountMovementId: string | null }): void {
  if (receipt.currentAccountMovementId) {
    throw new BadRequestException(
      'Este recebimento já possui movimentação vinculada na conta corrente.',
    );
  }
}

export interface CreateEntryFromReceiptParams {
  receiptId: string;
  receivableId: string;
  currentAccountId: string;
  amount: Prisma.Decimal;
  receiptDate: Date;
  receiptMethodId: string;
  notes: string | null;
  createdBy: string;
}

/**
 * Cria ENTRADA na conta corrente a partir de recebimento confirmado e vincula IDs
 * (movimento.receivable_receipt_id + receipt.current_account_movement_id).
 */
export async function createCurrentAccountEntryFromReceipt(
  tx: Prisma.TransactionClient,
  audit: AuditService,
  params: CreateEntryFromReceiptParams,
  actor: ActorContext,
): Promise<string> {
  ensureNoDoubleIntegration({ currentAccountMovementId: null });

  const movement = await tx.currentAccountMovement.create({
    data: {
      currentAccountId: params.currentAccountId,
      type: MovementType.ENTRADA,
      movementDate: params.receiptDate,
      amount: params.amount,
      receiptMethodId: params.receiptMethodId,
      description: `Crédito via recebimento ${params.receiptId.slice(0, 8)}…`,
      notes: params.notes,
      receivableId: params.receivableId,
      receivableReceiptId: params.receiptId,
      createdBy: params.createdBy,
    },
  });

  await tx.receivableReceipt.update({
    where: { id: params.receiptId },
    data: { currentAccountMovementId: movement.id },
  });

  await audit.log(
    {
      userId: actor.userId,
      action: AuditAction.CURRENT_ACCOUNT_ENTRY_CREATED,
      entityType: AuditEntity.CURRENT_ACCOUNT_MOVEMENT,
      entityId: movement.id,
      newValues: {
        currentAccountId: params.currentAccountId,
        type: MovementType.ENTRADA,
        amount: params.amount.toFixed(2),
        receivableReceiptId: params.receiptId,
        receivableId: params.receivableId,
        origin: 'RECEIPT',
      },
      reason: 'Entrada gerada a partir de recebimento confirmado.',
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    },
    tx,
  );

  return movement.id;
}

/** Estorna movimentação da conta corrente vinculada a um recebimento (regra Fase 7). */
export async function reverseCurrentAccountMovementFromReceipt(
  tx: Prisma.TransactionClient,
  audit: AuditService,
  params: {
    movementId: string;
    currentAccountId: string;
    reversedBy: string;
    reverseReason: string;
  },
  actor: ActorContext,
): Promise<void> {
  const movement = await tx.currentAccountMovement.findUnique({ where: { id: params.movementId } });
  if (!movement) throw new NotFoundException('Movimentação da conta corrente não encontrada.');
  if (movement.isReversed) {
    throw new BadRequestException('Movimentação da conta corrente já estornada.');
  }
  if (movement.type === MovementType.ESTORNO) {
    throw new BadRequestException('Não é possível estornar um movimento de estorno.');
  }

  await tx.currentAccountMovement.update({
    where: { id: params.movementId },
    data: {
      isReversed: true,
      reversedAt: new Date(),
      reversedBy: params.reversedBy,
      reverseReason: params.reverseReason,
    },
  });

  await tx.currentAccountMovement.create({
    data: {
      currentAccountId: params.currentAccountId,
      type: MovementType.ESTORNO,
      movementDate: startOfTodayUtc(),
      amount: movement.amount,
      description: `Estorno da movimentação ${movement.id} (recebimento estornado)`,
      notes: params.reverseReason,
      reversalOfMovementId: movement.id,
      receivableId: movement.receivableId,
      // receivableReceiptId permanece apenas no movimento original (UNIQUE).
      createdBy: params.reversedBy,
    },
  });

  await audit.log(
    {
      userId: actor.userId,
      action: AuditAction.CURRENT_ACCOUNT_MOVEMENT_REVERSED,
      entityType: AuditEntity.CURRENT_ACCOUNT_MOVEMENT,
      entityId: params.movementId,
      oldValues: { type: movement.type, amount: movement.amount.toFixed(2), isReversed: false },
      newValues: { isReversed: true },
      reason: params.reverseReason,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
    },
    tx,
  );
}
