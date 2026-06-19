import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Modal,
  Select,
  TextArea,
  DateInput,
  MoneyInput,
  LoadingSpinner,
  type SelectOption,
} from '@/components';
import { formatCurrency, formatCompetence } from '@/utils/format';
import type {
  Receipt,
  ReceiptMethodOption,
  ReceiptType,
} from './receiptsApi';
import { listAccountsForReceipt } from './receiptsApi';

export interface ReceiptFormValues {
  receiptDate: string;
  receiptMethodId: string;
  amount: number;
  receiptType: ReceiptType;
  currentAccountId?: string;
  notes?: string;
  reason?: string;
}

interface ReceivableContext {
  id: string;
  supplierId: string;
  supplierName: string;
  actionName: string;
  competenceMonth: string;
  amount: string;
  openBalance: string;
}

interface ReceiptFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  saving: boolean;
  receipt?: Receipt | null;
  receivable: ReceivableContext | null;
  methods: ReceiptMethodOption[];
  onClose: () => void;
  onSubmit: (values: ReceiptFormValues) => void;
}

const typeOptions: SelectOption[] = [
  { value: 'INTEGRAL', label: 'Integral (quita o saldo)' },
  { value: 'PARCIAL', label: 'Parcial' },
];

const todayIso = () => new Date().toISOString().slice(0, 10);

export function ReceiptFormModal({
  open,
  mode,
  saving,
  receipt,
  receivable,
  methods,
  onClose,
  onSubmit,
}: ReceiptFormModalProps) {
  const [receiptDate, setReceiptDate] = useState('');
  const [receiptMethodId, setReceiptMethodId] = useState('');
  const [receiptType, setReceiptType] = useState<ReceiptType>('PARCIAL');
  const [amount, setAmount] = useState<number | ''>('');
  const [currentAccountId, setCurrentAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const supplierId =
    mode === 'edit' ? receipt?.receivable.supplier.id : receivable?.supplierId;

  const selectedMethod = useMemo(
    () => methods.find((m) => m.id === receiptMethodId),
    [methods, receiptMethodId],
  );
  const isCreditDestination = selectedMethod?.isCurrentAccountCredit ?? false;

  const isConfirmedIntegrated =
    mode === 'edit' &&
    receipt?.destinationType === 'CREDITO_CONTA_CORRENTE' &&
    receipt.confirmationStatus === 'CONFIRMADO' &&
    !!receipt.currentAccountMovementId;

  const available = useMemo(() => {
    if (mode === 'create') return Number(receivable?.openBalance ?? 0);
    if (!receipt) return 0;
    const base = Number(receipt.receivable.openBalance);
    return receipt.confirmationStatus === 'CONFIRMADO' ? base + Number(receipt.amount) : base;
  }, [mode, receivable, receipt]);

  const methodOptions: SelectOption[] = useMemo(
    () => [{ value: '', label: 'Selecione...' }, ...methods.map((m) => ({ value: m.id, label: m.name }))],
    [methods],
  );

  const accountsQuery = useQuery({
    queryKey: ['ca-for-receipt', supplierId],
    queryFn: () => listAccountsForReceipt(supplierId!),
    enabled: open && !!supplierId && isCreditDestination,
  });

  const accountOptions: SelectOption[] = useMemo(() => {
    const items = accountsQuery.data ?? [];
    return [
      { value: '', label: 'Selecione a conta corrente...' },
      ...items.map((a) => ({
        value: a.id,
        label: `${a.name} · Saldo ${formatCurrency(Number(a.balance))}`,
      })),
    ];
  }, [accountsQuery.data]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setReason('');
    if (mode === 'edit' && receipt) {
      setReceiptDate(receipt.receiptDate);
      setReceiptMethodId(receipt.receiptMethod.id);
      setReceiptType(receipt.receiptType);
      setAmount(Number(receipt.amount));
      setCurrentAccountId(receipt.currentAccountId ?? '');
      setNotes(receipt.notes ?? '');
    } else {
      setReceiptDate(todayIso());
      setReceiptMethodId('');
      setReceiptType('PARCIAL');
      setAmount('');
      setCurrentAccountId('');
      setNotes('');
    }
  }, [open, mode, receipt]);

  useEffect(() => {
    if (receiptType === 'INTEGRAL' && !isConfirmedIntegrated) {
      setAmount(Number(available.toFixed(2)));
    }
  }, [receiptType, available, isConfirmedIntegrated]);

  useEffect(() => {
    if (!isCreditDestination) setCurrentAccountId('');
  }, [isCreditDestination]);

  const ctxSupplier = mode === 'edit' ? receipt?.receivable.supplier.tradeName : receivable?.supplierName;
  const ctxAction = mode === 'edit' ? receipt?.receivable.actionType.name : receivable?.actionName;
  const ctxCompetence =
    mode === 'edit' ? receipt?.receivable.competenceMonth : receivable?.competenceMonth;
  const ctxAmount = mode === 'edit' ? receipt?.receivable.amount : receivable?.amount;

  const handleSubmit = () => {
    setError(null);
    if (!receiptDate) return setError('Informe a data do recebimento.');
    if (!receiptMethodId) return setError('Selecione a forma de recebimento.');
    if (amount === '' || amount <= 0) return setError('Informe um valor maior que zero.');
    if (isCreditDestination && !currentAccountId) {
      return setError('Selecione a conta corrente para crédito em conta corrente.');
    }
    if (!isConfirmedIntegrated) {
      if (amount > available + 0.005) {
        return setError(`O valor não pode ser maior que o saldo disponível (${formatCurrency(available)}).`);
      }
      if (receiptType === 'INTEGRAL' && Math.abs(amount - available) > 0.005) {
        return setError(`Recebimento integral deve ser igual ao saldo disponível (${formatCurrency(available)}).`);
      }
    }
    if (mode === 'edit' && reason.trim().length < 5) {
      return setError('Informe um motivo (mín. 5 caracteres) para editar o recebimento.');
    }

    onSubmit({
      receiptDate,
      receiptMethodId,
      amount: Number(amount),
      receiptType,
      currentAccountId: isCreditDestination ? currentAccountId : undefined,
      notes: notes.trim() || undefined,
      reason: mode === 'edit' ? reason.trim() : undefined,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'Registrar recebimento' : 'Editar recebimento'}
      size="lg"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? <LoadingSpinner size="sm" className="border-white" /> : null}
            Salvar
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg bg-gray-50 p-3 text-sm ring-1 ring-gray-900/5">
          <p className="font-medium text-gray-900">{ctxSupplier}</p>
          <p className="text-gray-600">
            {ctxAction} · Competência {ctxCompetence ? formatCompetence(ctxCompetence) : '—'}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-600">
            <span>
              Valor do lançamento:{' '}
              <strong className="text-gray-900">{formatCurrency(Number(ctxAmount ?? 0))}</strong>
            </span>
            <span>
              Saldo disponível:{' '}
              <strong className="text-primary-700">{formatCurrency(available)}</strong>
            </span>
          </div>
        </div>

        {isConfirmedIntegrated ? (
          <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-600/10">
            Recebimento confirmado e vinculado à conta corrente. Para alterar valor ou conta, estorne e
            registre novamente. Apenas observações podem ser editadas.
          </div>
        ) : null}

        {isCreditDestination ? (
          <div className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-900 ring-1 ring-blue-600/10">
            Este recebimento será lançado como crédito na conta corrente selecionada. Se estiver pendente
            de confirmação, a entrada na conta corrente será criada somente após confirmação.
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DateInput
            label="Data do recebimento"
            required
            value={receiptDate}
            onChange={(e) => setReceiptDate(e.target.value)}
            disabled={isConfirmedIntegrated}
          />
          <Select
            label="Tipo"
            required
            options={typeOptions}
            value={receiptType}
            onChange={(e) => setReceiptType(e.target.value as ReceiptType)}
            disabled={isConfirmedIntegrated}
          />
          <Select
            label="Forma de recebimento"
            required
            options={methodOptions}
            value={receiptMethodId}
            onChange={(e) => setReceiptMethodId(e.target.value)}
            disabled={isConfirmedIntegrated}
          />
          <MoneyInput
            label="Valor recebido"
            required
            value={amount}
            onValueChange={setAmount}
            disabled={receiptType === 'INTEGRAL' || isConfirmedIntegrated}
            hint={receiptType === 'INTEGRAL' ? 'Preenchido com o saldo disponível.' : undefined}
          />
          {isCreditDestination ? (
            <div className="sm:col-span-2">
              <Select
                label="Conta corrente"
                required
                options={accountOptions}
                value={currentAccountId}
                onChange={(e) => setCurrentAccountId(e.target.value)}
                disabled={isConfirmedIntegrated || accountsQuery.isLoading}
                hint={
                  accountsQuery.isLoading
                    ? 'Carregando contas...'
                    : (accountsQuery.data?.length ?? 0) === 0
                      ? 'Nenhuma conta corrente disponível para este fornecedor.'
                      : undefined
                }
              />
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <TextArea
              label="Observações (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          {mode === 'edit' ? (
            <div className="sm:col-span-2">
              <TextArea
                label="Motivo da edição"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Descreva o motivo da alteração..."
              />
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 ring-1 ring-red-600/10">
            {error}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
