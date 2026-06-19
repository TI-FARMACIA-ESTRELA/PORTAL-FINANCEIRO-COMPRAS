# 01 — Visão geral

## Objetivo

Sistema web corporativo interno para a **Farmácia Estrela** controlar:

- **Lançamentos** (contas a receber comerciais)
- **Recebimentos / baixas** (integrais e parciais)
- **Conta corrente comercial** por fornecedor/indústria
- **Dashboard analítica**, **notificações** e **exportações** Excel/CSV
- **Auditoria** append-only de ações críticas
- **Cadastros auxiliares** (fornecedores, descrições de ação, formas de recebimento)
- **Usuários e permissões** por perfil

## Público-alvo

Equipe comercial interna: compradores, diretoria e administradores.

## Princípios de negócio (implementados)

- Valores monetários sempre em **Decimal/Numeric** — nunca `float`
- Registros financeiros **não são excluídos fisicamente** (cancelamento/estorno lógico)
- Saldos calculados por helpers reutilizáveis (não duplicar regra em exportações)
- Escopo por perfil: **COMPRADOR** vê apenas seus dados; **DIRETORIA** consulta consolidado; **ADMIN** administra tudo
- Auditoria registra alterações sensíveis sem armazenar senha/hash/token

## Módulos funcionais

| Módulo | Rota frontend | API base |
|--------|---------------|----------|
| Dashboard | `/dashboard` | `/api/dashboard` |
| Lançamentos | `/lancamentos` | `/api/receivables` |
| Recebimentos | `/recebimentos` | `/api/receipts` |
| Conta corrente | `/conta-corrente` | `/api/current-accounts` |
| Fornecedores | `/cadastros/fornecedores` | `/api/suppliers` |
| Descrições de ação | `/cadastros/descricoes-acoes` | `/api/action-types` |
| Formas de recebimento | `/cadastros/formas-recebimento` | `/api/receipt-methods` |
| Usuários | `/admin/usuarios` | `/api/users` |
| Auditoria | `/admin/auditoria` | `/api/audit-logs` |
| Notificações | (sino no header) | `/api/notifications` |
| Relatórios | botões nas telas | `/api/reports/*` |
| Autenticação | `/login` | `/api/auth/*` |

## Status do projeto

Todas as **12 fases** de implementação foram concluídas:

1. Fundação técnica e visual  
2. Autenticação, usuários e permissões  
3. Auditoria base  
4. Cadastros auxiliares  
5. Lançamentos / contas a receber  
6. Recebimentos / baixas  
7. Conta corrente comercial  
8. Integração recebimentos × conta corrente  
9. Dashboard analítica  
10. Notificações  
11. Relatórios e exportações  
12. Revisão geral, hardening e preparação Coolify  

Pronto para deploy via **Coolify** (sem deploy automático realizado).

## Repositório Git

- **Remote:** `https://github.com/TI-FARMACIA-ESTRELA/PORTAL-FINANCEIRO-COMPRAS`
- **Branch principal:** `main`
- **Monorepo:** npm workspaces (`backend` + `frontend`)
