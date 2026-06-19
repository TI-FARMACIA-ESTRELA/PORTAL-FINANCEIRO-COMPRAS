/**
 * Validação ponta a ponta — Fase 12
 * Uso: node scripts/test-e2e-phase12.mjs
 * Requer API rodando em http://localhost:3000 com seed aplicado.
 */
const API = 'http://localhost:3000/api';
const ADMIN_USER = 1;
const ADMIN_PASS = 'admin123';

const results = [];
const ok = (name) => results.push({ name, pass: true });
const fail = (name, err) => results.push({ name, pass: false, err: String(err) });

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function login(userNumber, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userNumber, password }),
  });
  if (!res.ok) throw new Error(`Login falhou: ${res.status}`);
  const data = await res.json();
  return data.accessToken;
}

async function api(method, path, token, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, data: json };
}

async function confirmIfPending(token, receiptId) {
  const detail = await api('GET', `/receipts/${receiptId}`, token);
  if (detail.data.confirmationStatus === 'CONFIRMADO') {
    return { skipped: true, status: detail.data.confirmationStatus };
  }
  const confirm = await api('PATCH', `/receipts/${receiptId}/confirm`, token);
  assert(confirm.status === 200, `Confirm ${receiptId} => ${confirm.status}: ${JSON.stringify(confirm.data)}`);
  return { skipped: false, status: 'CONFIRMADO' };
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const competence = today.slice(0, 7);
  const suffix = Date.now().toString().slice(-6);

  try {
    const health = await api('GET', '/health');
    assert(health.status === 200 && health.data.database === 'up', 'Health/DB');
    ok('GET /api/health');
  } catch (e) {
    fail('GET /api/health', e);
    printResults();
    process.exit(1);
  }

  let token;
  try {
    token = await login(ADMIN_USER, ADMIN_PASS);
    ok('Login admin');
  } catch (e) {
    fail('Login admin', e);
    printResults();
    process.exit(1);
  }

  let supplierId;
  let actionTypeId;
  let simpleMethodId;
  let creditMethodId;

  try {
    const supplier = await api('POST', '/suppliers', token, {
      tradeName: `Fornecedor E2E ${suffix}`,
      legalName: `Fornecedor E2E LTDA ${suffix}`,
      supplierType: 'INDUSTRIA',
      notes: 'Criado pelo teste E2E Fase 12',
    });
    assert(supplier.status === 201 || supplier.status === 200, `Supplier ${supplier.status}`);
    supplierId = supplier.data.id;
    ok('Criar fornecedor');
  } catch (e) {
    fail('Criar fornecedor', e);
  }

  try {
    const actions = await api('GET', '/action-types/active', token);
    actionTypeId = actions.data[0]?.id;
    assert(actionTypeId, 'Sem action type ativo');
    ok('Listar descrições de ação');
  } catch (e) {
    fail('Listar descrições de ação', e);
  }

  try {
    const methods = await api('GET', '/receipt-methods/active', token);
    simpleMethodId = methods.data.find((m) => !m.isCurrentAccountCredit)?.id;
    creditMethodId = methods.data.find((m) => m.isCurrentAccountCredit)?.id;
    assert(simpleMethodId && creditMethodId, 'Formas de recebimento seed ausentes');
    ok('Listar formas de recebimento');
  } catch (e) {
    fail('Listar formas de recebimento', e);
  }

  let receivableId;
  try {
    const recv = await api('POST', '/receivables', token, {
      negotiationDate: today,
      competenceMonth: competence,
      expectedReceiptDate: today,
      supplierId,
      actionTypeId,
      amount: 1000,
      notes: `E2E ${suffix}`,
    });
    assert(recv.status === 201 || recv.status === 200, `Receivable ${recv.status}`);
    receivableId = recv.data.id;
    assert(recv.data.financialStatus === 'ABERTO', 'Status inicial ABERTO');
    ok('Criar lançamento');
  } catch (e) {
    fail('Criar lançamento', e);
  }

  let partialReceiptId;
  try {
    const partial = await api('POST', '/receipts', token, {
      receivableId,
      receiptDate: today,
      receiptMethodId: simpleMethodId,
      amount: 400,
      receiptType: 'PARCIAL',
    });
    assert(partial.status === 201 || partial.status === 200, `Receipt partial ${partial.status}`);
    partialReceiptId = partial.data.id;
    ok('Registrar recebimento parcial');
  } catch (e) {
    fail('Registrar recebimento parcial', e);
  }

  try {
    await confirmIfPending(token, partialReceiptId);
    const recv = await api('GET', `/receivables/${receivableId}`, token);
    assert(recv.data.financialStatus === 'PARCIAL', `Esperado PARCIAL, veio ${recv.data.financialStatus}`);
    ok('Confirmar parcial → lançamento PARCIAL');
  } catch (e) {
    fail('Confirmar parcial → lançamento PARCIAL', e);
  }

  let integralReceiptId;
  try {
    const integral = await api('POST', '/receipts', token, {
      receivableId,
      receiptDate: today,
      receiptMethodId: simpleMethodId,
      amount: 600,
      receiptType: 'INTEGRAL',
    });
    assert(integral.status === 201 || integral.status === 200, `Receipt integral ${integral.status}`);
    integralReceiptId = integral.data.id;
    ok('Registrar recebimento integral');
  } catch (e) {
    fail('Registrar recebimento integral', e);
  }

  try {
    await confirmIfPending(token, integralReceiptId);
    const recv = await api('GET', `/receivables/${receivableId}`, token);
    assert(recv.data.financialStatus === 'QUITADO', `Esperado QUITADO, veio ${recv.data.financialStatus}`);
    ok('Confirmar integral → lançamento QUITADO');
  } catch (e) {
    fail('Confirmar integral → lançamento QUITADO', e);
  }

  let accountId;
  try {
    const account = await api('POST', '/current-accounts', token, {
      supplierId,
      name: `Conta E2E ${suffix}`,
      notes: 'Teste Fase 12',
    });
    assert(account.status === 201 || account.status === 200, `CA ${account.status}`);
    accountId = account.data.id;
    ok('Criar conta corrente');
  } catch (e) {
    fail('Criar conta corrente', e);
  }

  try {
    const entry = await api('POST', `/current-accounts/${accountId}/movements/entry`, token, {
      movementDate: today,
      amount: 150,
      receiptMethodId: simpleMethodId,
      description: 'Entrada manual E2E',
    });
    assert(entry.status === 201 || entry.status === 200, `Entry ${entry.status}`);
    ok('Entrada manual na conta corrente');
  } catch (e) {
    fail('Entrada manual na conta corrente', e);
  }

  try {
    const exit = await api('POST', `/current-accounts/${accountId}/movements/exit`, token, {
      movementDate: today,
      amount: 50,
      actionTypeId,
      description: 'Saída manual E2E',
    });
    assert(exit.status === 201 || exit.status === 200, `Exit ${exit.status}`);
    ok('Saída manual na conta corrente');
  } catch (e) {
    fail('Saída manual na conta corrente', e);
  }

  let creditReceivableId;
  let creditReceiptId;
  try {
    const recv = await api('POST', '/receivables', token, {
      negotiationDate: today,
      competenceMonth: competence,
      expectedReceiptDate: today,
      supplierId,
      actionTypeId,
      amount: 200,
    });
    creditReceivableId = recv.data.id;

    const receipt = await api('POST', '/receipts', token, {
      receivableId: creditReceivableId,
      receiptDate: today,
      receiptMethodId: creditMethodId,
      amount: 200,
      receiptType: 'INTEGRAL',
      currentAccountId: accountId,
    });
    assert(receipt.status === 201 || receipt.status === 200, `Credit receipt ${receipt.status}`);
    creditReceiptId = receipt.data.id;

    await confirmIfPending(token, creditReceiptId);

    const account = await api('GET', `/current-accounts/${accountId}`, token);
    assert(Number(account.data.balance) >= 100, `Saldo CA insuficiente: ${account.data.balance}`);
    ok('Recebimento com crédito em conta corrente + confirmação');
  } catch (e) {
    fail('Recebimento com crédito em conta corrente + confirmação', e);
  }

  try {
    const reverse = await api('PATCH', `/receipts/${creditReceiptId}/reverse`, token, {
      reason: 'Estorno integrado E2E Fase 12',
    });
    assert(reverse.status === 200, `Reverse ${reverse.status}`);
    ok('Estorno integrado do recebimento');
  } catch (e) {
    fail('Estorno integrado do recebimento', e);
  }

  try {
    const dash = await api('GET', '/dashboard', token);
    assert(dash.status === 200 && dash.data.kpis, 'Dashboard sem KPIs');
    ok('Dashboard reflete dados');
  } catch (e) {
    fail('Dashboard reflete dados', e);
  }

  try {
    const notif = await api('GET', '/notifications?page=1&pageSize=5', token);
    assert(notif.status === 200, `Notifications ${notif.status}`);
    ok('Notificações acessíveis');
  } catch (e) {
    fail('Notificações acessíveis', e);
  }

  try {
    const exp = await fetch(`${API}/reports/receivables.xlsx`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(exp.status === 200, `Export ${exp.status}`);
    const buf = Buffer.from(await exp.arrayBuffer());
    assert(buf.length > 100, 'Export vazio');
    const sample = buf.slice(0, 4000).toString('utf8').toLowerCase();
    assert(!sample.includes('password_hash'), 'Export com dado sensível');
    ok('Exportação XLSX de lançamentos');
  } catch (e) {
    fail('Exportação XLSX de lançamentos', e);
  }

  printResults();
  if (results.some((r) => !r.pass)) process.exit(1);
}

function printResults() {
  console.log('\n=== E2E Fase 12 ===');
  for (const r of results) {
    console.log(`${r.pass ? 'PASS' : 'FAIL'} - ${r.name}${r.err ? `: ${r.err}` : ''}`);
  }
  const passed = results.filter((r) => r.pass).length;
  console.log(`\n${passed}/${results.length} passos OK`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
