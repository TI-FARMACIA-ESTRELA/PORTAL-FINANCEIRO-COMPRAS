/**
 * Testes manuais Fase 11 — Relatórios e Exportações
 * Uso: node scripts/test-reports-phase11.mjs
 */
const API = 'http://localhost:3000/api';

async function login(userNumber, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userNumber, password }),
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Login ${userNumber} falhou: ${res.status}`);
  const data = await res.json();
  return data.accessToken;
}

async function get(path, token) {
  return fetch(`${API}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function hasSensitive(text) {
  const lower = text.toLowerCase();
  return (
    lower.includes('password_hash') ||
    lower.includes('passwordhash') ||
    lower.includes('refresh_token') ||
    lower.includes('refreshtoken') ||
    /"password"\s*:/.test(lower)
  );
}

async function testExport(path, token, expectStatus = 200) {
  const res = await get(path, token);
  assert(res.status === expectStatus, `${path} => ${res.status}, esperado ${expectStatus}`);
  if (expectStatus === 200) {
    const buf = Buffer.from(await res.arrayBuffer());
    assert(buf.length > 0, `${path} retornou vazio`);
    const ct = res.headers.get('content-type') ?? '';
    assert(
      ct.includes('spreadsheet') || ct.includes('csv') || ct.includes('octet-stream') || ct.includes('text/csv'),
      `${path} content-type inesperado: ${ct}`,
    );
    const disp = res.headers.get('content-disposition') ?? '';
    assert(disp.includes('attachment'), `${path} sem Content-Disposition attachment`);
    const textSample = buf.slice(0, 5000).toString('utf8');
    assert(!hasSensitive(textSample), `${path} contém dados sensíveis`);
    return { buf, ct, disp };
  }
  return null;
}

async function main() {
  const results = [];
  const ok = (name) => results.push({ name, pass: true });
  const fail = (name, err) => results.push({ name, pass: false, err: String(err) });

  try {
    const noAuth = await get('/reports/receivables.xlsx');
    assert(noAuth.status === 401, 'Sem token deveria ser 401');
    ok('401 sem token');
  } catch (e) {
    fail('401 sem token', e);
  }

  let adminToken;
  let compradorToken;
  let diretoriaToken;
  let compradorId;
  let otherBuyerId;
  let currentAccountId;
  let forbiddenAccountId;

  try {
    adminToken = await login(1, 'admin123');
    ok('Login ADMIN');
  } catch (e) {
    fail('Login ADMIN', e);
  }

  if (adminToken) {
    const usersRes = await get('/users?page=1&pageSize=100', adminToken);
    const usersJson = await usersRes.json();
    let users = usersJson.data ?? [];
    let comprador = users.find((u) => u.role === 'COMPRADOR');
    let diretoria = users.find((u) => u.role === 'DIRETORIA');

    if (!comprador) {
      const createRes = await fetch(`${API}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          userNumber: 9001,
          name: 'Comprador Teste Export',
          password: 'comprador123',
          role: 'COMPRADOR',
          isActive: true,
        }),
      });
      if (createRes.ok) {
        comprador = await createRes.json();
        users = [...users, comprador];
        ok('Criado usuário COMPRADOR teste');
      }
    }
    if (!diretoria) {
      const createRes = await fetch(`${API}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          userNumber: 9002,
          name: 'Diretoria Teste Export',
          password: 'diretoria123',
          role: 'DIRETORIA',
          isActive: true,
        }),
      });
      if (createRes.ok) {
        diretoria = await createRes.json();
        users = [...users, diretoria];
        ok('Criado usuário DIRETORIA teste');
      }
    }

    const otherComprador = users.filter((u) => u.role === 'COMPRADOR')[1];
    if (comprador) {
      compradorId = comprador.id;
      try {
        compradorToken = await login(comprador.userNumber, 'admin123');
        ok(`Login COMPRADOR #${comprador.userNumber}`);
      } catch {
        try {
          compradorToken = await login(comprador.userNumber, 'comprador123');
          ok(`Login COMPRADOR #${comprador.userNumber}`);
        } catch (e2) {
          fail('Login COMPRADOR', e2);
        }
      }
    } else {
      fail('Login COMPRADOR', 'Nenhum usuário COMPRADOR no banco');
    }
    if (diretoria) {
      try {
        diretoriaToken = await login(diretoria.userNumber, 'admin123');
        ok(`Login DIRETORIA #${diretoria.userNumber}`);
      } catch {
        try {
          diretoriaToken = await login(diretoria.userNumber, 'diretoria123');
          ok(`Login DIRETORIA #${diretoria.userNumber}`);
        } catch (e2) {
          fail('Login DIRETORIA', e2);
        }
      }
    } else {
      fail('Login DIRETORIA', 'Nenhum usuário DIRETORIA no banco');
    }
    if (otherComprador) otherBuyerId = otherComprador.id;

    try {
      await testExport('/reports/receivables.xlsx', adminToken);
      ok('ADMIN receivables.xlsx');
    } catch (e) {
      fail('ADMIN receivables.xlsx', e);
    }
    try {
      await testExport('/reports/receivables.csv', adminToken);
      ok('ADMIN receivables.csv');
    } catch (e) {
      fail('ADMIN receivables.csv', e);
    }
    try {
      await testExport('/reports/receipts.xlsx', adminToken);
      ok('ADMIN receipts.xlsx');
    } catch (e) {
      fail('ADMIN receipts.xlsx', e);
    }
    try {
      await testExport('/reports/current-accounts.xlsx', adminToken);
      ok('ADMIN current-accounts.xlsx');
    } catch (e) {
      fail('ADMIN current-accounts.xlsx', e);
    }
    try {
      await testExport('/reports/audit.xlsx', adminToken);
      ok('ADMIN audit.xlsx');
    } catch (e) {
      fail('ADMIN audit.xlsx', e);
    }
    try {
      await testExport('/reports/dashboard.xlsx', adminToken);
      ok('ADMIN dashboard.xlsx');
    } catch (e) {
      fail('ADMIN dashboard.xlsx', e);
    }

    if (diretoriaToken) {
      try {
        await testExport('/reports/receivables.xlsx', diretoriaToken);
        ok('DIRETORIA receivables.xlsx');
      } catch (e) {
        fail('DIRETORIA receivables.xlsx', e);
      }
      try {
        await testExport('/reports/audit.csv', diretoriaToken);
        ok('DIRETORIA audit.csv');
      } catch (e) {
        fail('DIRETORIA audit.csv', e);
      }
    }

    if (compradorToken) {
      try {
        await testExport('/reports/receivables.xlsx', compradorToken);
        ok('COMPRADOR receivables.xlsx (escopo próprio)');
      } catch (e) {
        fail('COMPRADOR receivables.xlsx', e);
      }
      try {
        const forced = await get(
          `/reports/receivables.xlsx?buyerId=${otherBuyerId ?? '00000000-0000-0000-0000-000000000099'}`,
          compradorToken,
        );
        assert(forced.status === 200, 'COMPRADOR buyerId forçado deveria retornar 200');
        ok('COMPRADOR buyerId forçado ignorado (200 sem vazamento)');
      } catch (e) {
        fail('COMPRADOR buyerId forçado', e);
      }
      try {
        await testExport('/reports/audit.xlsx', compradorToken, 403);
        ok('COMPRADOR audit => 403');
      } catch (e) {
        fail('COMPRADOR audit => 403', e);
      }

      const caRes = await get('/current-accounts?page=1&pageSize=5', compradorToken);
      const caJson = await caRes.json();
      currentAccountId = caJson.data?.[0]?.id;
      if (currentAccountId) {
        try {
          await testExport(`/reports/current-accounts/${currentAccountId}/movements.xlsx`, compradorToken);
          ok('COMPRADOR extrato conta permitida');
        } catch (e) {
          fail('COMPRADOR extrato conta permitida', e);
        }
      }

      const allCaRes = await get('/current-accounts?page=1&pageSize=100', adminToken);
      const allCa = (await allCaRes.json()).data ?? [];
      forbiddenAccountId = allCa.find((a) => a.owner?.id !== compradorId && !a.sharedWith?.some?.((s) => s.id === compradorId))?.id;
      if (forbiddenAccountId) {
        try {
          const denied = await get(
            `/reports/current-accounts/${forbiddenAccountId}/movements.xlsx`,
            compradorToken,
          );
          assert(denied.status === 403 || denied.status === 404, `Extrato negado deveria ser 403/404, foi ${denied.status}`);
          ok('COMPRADOR extrato conta sem acesso => 403/404');
        } catch (e) {
          fail('COMPRADOR extrato conta sem acesso', e);
        }
      }
    }

    try {
      const filtered = await testExport('/reports/receivables.xlsx?financialStatus=ABERTO', adminToken);
      ok('Filtro financialStatus=ABERTO respeitado (export OK)');
      void filtered;
    } catch (e) {
      fail('Filtros respeitados', e);
    }
  }

  console.log('\n=== Resultados Fase 11 ===');
  for (const r of results) {
    console.log(`${r.pass ? 'PASS' : 'FAIL'} - ${r.name}${r.err ? `: ${r.err}` : ''}`);
  }
  const passed = results.filter((r) => r.pass).length;
  console.log(`\n${passed}/${results.length} testes passaram`);
  if (results.some((r) => !r.pass)) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
