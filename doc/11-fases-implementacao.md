# 11 — Fases de implementação

Histórico completo do desenvolvimento por fases aprovadas.

## Fase 1 — Fundação técnica e visual

- Monorepo npm workspaces  
- Frontend React + Vite + Tailwind  
- Layout (Sidebar, Header, FilterBar, DataTable, KpiCard)  
- Rotas placeholder e identidade visual Farmácia Estrela  
- Backend healthcheck básico  

## Fase 2 — Autenticação, usuários e permissões

- Model `User`, enum `Role`  
- Login por número + senha (Argon2)  
- JWT access + refresh httpOnly cookie  
- CRUD usuários (ADMIN)  
- Guards JWT + Roles  
- Seed admin #1  

## Fase 3 — Auditoria base

- Model `AuditLog` append-only  
- `AuditModule` global  
- Tela `/admin/auditoria`  
- Sanitização de campos sensíveis  

## Fase 4 — Cadastros auxiliares

- Suppliers, ActionTypes, ReceiptMethods  
- Telas em `/cadastros/*`  
- Seed formas de recebimento e descrições de ação  

## Fase 5 — Lançamentos / Contas a receber

- Model `Receivable`  
- CRUD, cancelamento lógico, KPIs  
- Status financeiro e vencimento calculado  
- Tela `/lancamentos`  

## Fase 6 — Recebimentos / Baixas

- Model `ReceivableReceipt`  
- Parcial/integral, confirmação ADMIN, estorno  
- Integração com status do lançamento  
- Tela `/recebimentos`  

## Fase 7 — Conta corrente comercial

- Models `CurrentAccount`, `CurrentAccountUser`, `CurrentAccountMovement`  
- Entrada, saída, ajuste, estorno  
- Compartilhamento entre compradores  
- Telas `/conta-corrente` e detalhe/extrato  

## Fase 8 — Integração recebimentos × conta corrente

- Destino `CREDITO_CONTA_CORRENTE`  
- Movimento automático na confirmação  
- Estorno integrado (movimento espelho)  
- Migration dedicada  

## Fase 9 — Dashboard analítica

- `DashboardModule` com KPIs, gráficos, listas  
- Recharts no frontend  
- Filtros por comprador, competência, período, fornecedor, ação  
- Escopo por perfil  

## Fase 10 — Notificações

- Model `Notification`  
- Geração por eventos (vencidos, saldo negativo, pendências)  
- Sino no header + dropdown  
- Escopo COMPRADOR vs ADMIN/DIRETORIA  

## Fase 11 — Relatórios e exportações

- `ReportsModule` — ExcelJS + CSV UTF-8 BOM  
- Exportações com filtros, escopo e limite 50k linhas  
- Botões Exportar Excel/CSV nas telas  
- Dashboard multi-abas XLSX  

## Fase 12 — Revisão geral e hardening

- Health 503 se DB down; `@SkipThrottle` no health  
- Docker entrypoint com migrate deploy  
- Code-splitting frontend  
- Scripts E2E e documentação deploy  
- README e DEPLOY-COOLIFY.md  
- Preparação Git (commit inicial, tag pre-deploy)  

## Próximos passos (não implementados)

- Deploy real no Coolify (aguardando aprovação operacional)  
- CI/CD GitHub Actions  
- Testes automatizados Jest/Cypress  
- Upload completo de anexos/comprovantes  
