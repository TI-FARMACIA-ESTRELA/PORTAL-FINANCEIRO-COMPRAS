import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '@/components';
import { formatCompetence, formatCurrency } from '@/utils/format';
import type { DashboardCharts } from './dashboardApi';

const CHART_COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#64748b', '#94a3b8', '#cbd5e1'];

function moneyTick(value: number) {
  if (Math.abs(value) >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`;
  return formatCurrency(value);
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-gray-900">{label ? formatCompetence(label) : ''}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {formatCurrency(Number(p.value))}
        </p>
      ))}
    </div>
  );
}

interface DashboardChartsProps {
  charts: DashboardCharts;
}

export function DashboardChartsSection({ charts }: DashboardChartsProps) {
  const receivedVsPending = charts.receivedVsPending.map((row) => ({
    ...row,
    label: formatCompetence(row.month),
    received: Number(row.received ?? 0),
    pending: Number(row.pending ?? 0),
  }));

  const topSuppliers = charts.topSuppliersOpen.map((row) => ({
    name: row.supplierName ?? '—',
    value: Number(row.openBalance ?? 0),
  }));

  const byAction = charts.openByActionType.map((row) => ({
    name: row.actionTypeName ?? '—',
    value: Number(row.openBalance ?? 0),
  }));

  const byMethod = charts.receiptsByMethod.map((row) => ({
    name: row.methodName ?? '—',
    value: Number(row.total ?? 0),
  }));

  const evolution = charts.monthlyReceiptEvolution.map((row) => ({
    ...row,
    label: formatCompetence(row.month),
    total: Number(row.total ?? 0),
  }));

  const caBySupplier = charts.currentAccountBalanceBySupplier.map((row) => ({
    name: row.supplierName ?? '—',
    value: Number(row.balance ?? 0),
  }));

  const byCompetence = charts.valuesByCompetence.map((row) => ({
    ...row,
    label: formatCompetence(row.month),
    launched: Number(row.launched ?? 0),
    received: Number(row.received ?? 0),
  }));

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Card title="Recebido x pendente" subtitle="Últimos 6 meses">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={receivedVsPending}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={moneyTick} tick={{ fontSize: 11 }} width={72} />
              <Tooltip content={<ChartTooltip />} />
              <Legend />
              <Bar dataKey="received" name="Recebido" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
              <Bar dataKey="pending" name="Pendente" fill={CHART_COLORS[4]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Top 10 fornecedores em aberto" subtitle="Saldo aberto por fornecedor">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topSuppliers} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tickFormatter={moneyTick} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="value" name="Em aberto" fill={CHART_COLORS[1]} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Valor em aberto por ação" subtitle="Agrupado por descrição de ação">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byAction}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis tickFormatter={moneyTick} tick={{ fontSize: 11 }} width={72} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="value" name="Em aberto" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Recebimentos por forma" subtitle="Confirmados e não estornados">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={byMethod}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              >
                {byMethod.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Evolução mensal de recebimentos" subtitle="Últimos 12 meses">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evolution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={moneyTick} tick={{ fontSize: 11 }} width={72} />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="total"
                name="Recebido"
                stroke={CHART_COLORS[0]}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Saldo de conta corrente por fornecedor" subtitle="Contas acessíveis ao usuário">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={caBySupplier}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis tickFormatter={moneyTick} tick={{ fontSize: 11 }} width={72} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="value" name="Saldo" fill={CHART_COLORS[3]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Valores por competência" subtitle="Lançado x recebido" className="xl:col-span-2">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byCompetence}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={moneyTick} tick={{ fontSize: 11 }} width={72} />
              <Tooltip content={<ChartTooltip />} />
              <Legend />
              <Bar dataKey="launched" name="Lançado" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
              <Bar dataKey="received" name="Recebido" fill={CHART_COLORS[5]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
