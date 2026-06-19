# Documentação — Portal Financeiro Comercial

Documentação técnica completa do projeto **Portal Financeiro Comercial** (Farmácia Estrela).

## Índice

| Documento | Conteúdo |
|-----------|----------|
| [01-visao-geral.md](./01-visao-geral.md) | Objetivo, escopo, módulos e status do projeto |
| [02-stack-e-linguagens.md](./02-stack-e-linguagens.md) | Tecnologias, versões e decisões de arquitetura |
| [03-estrutura-pastas.md](./03-estrutura-pastas.md) | Árvore de diretórios e responsabilidade de cada pasta |
| [04-instalacao-e-execucao.md](./04-instalacao-e-execucao.md) | Pré-requisitos, env, comandos locais e Docker |
| [05-backend.md](./05-backend.md) | API NestJS, módulos, endpoints e configuração |
| [06-frontend.md](./06-frontend.md) | SPA React, rotas, componentes e integração com API |
| [07-banco-de-dados.md](./07-banco-de-dados.md) | PostgreSQL, Prisma, migrations, seed e modelos |
| [08-testes.md](./08-testes.md) | Scripts de validação, E2E e exportações |
| [09-docker-e-deploy.md](./09-docker-e-deploy.md) | Dockerfiles, Compose, Coolify e checklist |
| [10-seguranca-e-permissoes.md](./10-seguranca-e-permissoes.md) | Auth, perfis, auditoria e boas práticas |
| [11-fases-implementacao.md](./11-fases-implementacao.md) | Histórico das 12 fases de desenvolvimento |
| [12-variaveis-ambiente.md](./12-variaveis-ambiente.md) | Referência completa de variáveis `.env` |
| [13-api-referencia.md](./13-api-referencia.md) | Endpoints REST resumidos |

## Documentos na raiz do repositório

- [README.md](../README.md) — visão rápida e comandos principais
- [DEPLOY-COOLIFY.md](../DEPLOY-COOLIFY.md) — checklist operacional de produção

## Versão documentada

- **Versão do projeto:** `0.1.0`
- **Tag de marco:** `v0.1.0-pre-deploy` (local; push depende de permissão no GitHub)
- **Commit inicial:** `feat: versao inicial do portal financeiro comercial`

## Login inicial (seed)

| Campo | Valor |
|-------|-------|
| Número de usuário | `1` |
| Senha padrão | `admin123` |
| Perfil | `ADMIN` |

**Trocar a senha imediatamente após o primeiro acesso em produção.**
