# AGENTS.md — `template-frontend`

Template canônico de frontend Octor (Next.js Ecme). Org [`0ctor`](https://github.com/0ctor).

## Este componente

| Campo | Valor |
|-------|--------|
| Papel | Golden path FE para `web-*` / shells Next |
| Stack | Next.js App Router + TypeScript + Tailwind (Ecme) |
| Auth produto | SSO [`web-auth`](https://github.com/0ctor/web-auth) (`auth.octor.com.br`) |
| Deploy | `platform-deploy-hook` · imagem `ghcr.io/0ctor/<app>:<sha>` |

## Padrões da org (obrigatórios)

<!-- octor-ecosystem:start -->
> Vale para **qualquer** assistente e IDE (**Cursor**, **OpenCode**, **Codex**, **VS Code**/Copilot, Claude, ChatGPT, etc.) e para humanos.
> **Fonte portátil (igual para todo o time):** este `AGENTS.md` — o bloco abaixo. Pastas de IDE (`.cursor/`, `.opencode/`, `.codex/`, …) são **opcionais** e **não** podem contradizer nem substituir este bloco.
> Detalhe canônico: portal [`0ctor/backstage`](https://github.com/0ctor/backstage) (`agents-ecosystem-block.md` + docs).

1. **Git Flow:** proibido editar/push em `main`. `feature/*` ← `dev` → PR→`dev` → PR `dev`→`main` (deploy **só** em `main`). **Hotfix absoluto** (bug que precisa ir já a `main`): `fix/*` ← `main` → PR→`main` + PR/cherry-pick do mesmo fix em `dev` — proibido acelerar via `dev`+promote. Apagar branch após merge (remota + local). Doc: [git-flow.md](https://github.com/0ctor/backstage/blob/main/git-flow.md).
2. **Schema (ADR-005):** DDL/migrations **somente** em [`platform-database`](https://github.com/0ctor/platform-database). Proibido `Schema::` / `dbforge` / pastas `migrations/` de schema em outros apps.
3. **Auth / SSO:** sempre [`web-auth`](https://github.com/0ctor/web-auth) (`auth.octor.com.br`). Não reinventar portal de login.
4. **Segredos:** só `.env` / Vault — nunca commit. GitHub Actions: **Variables** para não-sensível (URLs, portas); **Secrets** para credenciais.
5. **Loki:** backend `LOKI_PUSH_*` + `LOKI_JOB` no `.env` da API; frontend via `POST /v1/errors/report` (ou `/v2/...`) na API — **proibido** senha Loki em `NEXT_PUBLIC_*`.
6. **Constraints:** sem hostname/IP de produção hardcoded no código de app; sem gates absolutos de PRD no código (usar env / feature flag / config de deploy — não `if (host===…)`); **sem** rotas HTTP `OPTIONS` (CORS no gateway); soft delete `deleted_at` + `deleted_by`.
7. **Deploy:** push/`main` → `platform-deploy-hook` → GHCR `ghcr.io/0ctor/<app>:<sha>` → compose em [`sp1-sd-octor-1`](https://github.com/0ctor/sp1-sd-octor-1) (`apps/<serviço>/`).
8. **Testes (mínimo):** unitários obrigatórios; CI `lint → typecheck → test → build` em **`dev` e `main`**. APIs: integração; apps de usuário: E2E/smoke (SSO + fluxo principal + anti–tela branca). Metas: coverage ≥ 80%; mutation ≥ 80% quando configurado. Canônico: [testing-strategy.md](https://github.com/0ctor/backstage/blob/main/testing-strategy.md).
9. **Agente:** username **Alfred** (nunca “Mordomo Octor”).
10. **Stack:** respeitar a do repo — não trocar framework sem decisão explícita.
11. **Mapa cross-app:** [`catalog.yaml`](https://github.com/0ctor/backstage/blob/main/catalog.yaml) / [catalog-rede](https://github.com/0ctor/backstage/blob/main/catalog-rede.json). Mudança de contrato / portas / API / arquitetura → atualizar o Backstage ([docs-sync.md](https://github.com/0ctor/backstage/blob/main/docs-sync.md)). UX → sync [`platform-help`](https://github.com/0ctor/platform-help). App novo: [novo-app-octor.md](https://github.com/0ctor/backstage/blob/main/novo-app-octor.md).
12. **Dependentes de dados:** ao mudar schema/contrato/semântica de tabelas, avaliar e atualizar [`web-migration`](https://github.com/0ctor/web-migration), [`web-export`](https://github.com/0ctor/web-export) e demais consumidores do mesmo dado (ex. `web-database`, `platform-legacy`, apps do domínio) — ou registrar explicitamente “sem impacto”. Detalhe: [cross-app-data-dependents-sync](https://github.com/0ctor/backstage/blob/main/.cursor/rules/cross-app-data-dependents-sync.mdc).
13. **Datas / fusos (débito contínuo):** instantes de auditoria (`created_at`/`updated_at`/`deleted_at`) em **UTC** no backend; API com ISO `Z`/offset (naive legado = UTC). UI no fuso do operador; se mostrar UTC, sufixo ` UTC`. Proibido `timeZone="UTC"` no next-intl sem rótulo e `Local::now()`/`date()` do servidor para auditoria. Agenda/slots/vencimentos = civil (helpers separados). **Ao alterar qualquer repo:** se o PR toca datas/horários (stamps, formatters, LocaleProvider, listagens “criado em”), **sanar o débito de fuso nesse caminho no mesmo PR** — não adiar; clínicas não podem ver hora errada. Canônico: [timezone-datetime.md](https://github.com/0ctor/backstage/blob/main/timezone-datetime.md).
<!-- octor-ecosystem:end -->

## Obrigações deste repositório

1. **Git Flow:** proibido editar em `main`. `feature/*` ← `dev` → PR→`dev` → PR `dev`→`main` (deploy **só** `main`). Hotfix: `fix/*` ← `main` → `main` + devolver a `dev`.
2. **SSO:** `NEXT_PUBLIC_AUTH_PORTAL_URL` + `NEXT_PUBLIC_AUTH_API_URL` em **build time** (Dockerfile / `apps.json` `build.args`). Sem portal local de produto.
3. **Acesso:** após `GET /v1/account`, `resolveAppAccess` — rejeita `profile=admin`, exige `company_uuid` e `NEXT_PUBLIC_APP_ID` em `apps` (IdP já filtrado por plano/roles).
4. **Sessão no deploy:** usar `shouldClearAuthSessionOnAxiosError` — **nunca** limpar sessão em qualquer 401.
5. **Loki:** FE reporta via `POST /api/errors/report` (ou API `/v1/errors/report`). **Proibido** `LOKI_PUSH_PASSWORD` / secrets em `NEXT_PUBLIC_*`.
6. **Health:** `/api/health/live` (Docker) + `/api/health/ready` (Statuspage/smoke).
7. **Soft delete:** `deleted_at` + `deleted_by` (na API do produto).
8. **Segredos:** só `.env` local — nunca commit. Preferir Vault OPS (`make env` / `make env-push`, path `apps/<repo>/dev`, VPN `10.8.0.9:8200`).
9. **Agente:** username **Alfred**.
10. **CI:** `npm run lint`, `tsc --noEmit`, `npm test`, `npm run build` no PR.
11. **Marca:** primary `#0CAF60` (não o azul Ecme `#2a85ff`). `themeSchema: 'default'`. CSS `--primary*` iguais. Gate: `preset-theme-schema.config.test.ts`.
12. **Header do usuário:** `useCurrentSession` lê `octorAuthStore` (SSO). Não deixar o dropdown no NextAuth vazio (“Anonymous”).

## Novo app a partir daqui

Siga [docs/NOVO_APP.md](./docs/NOVO_APP.md). Snippet PaaS: [docs/apps.json.example](./docs/apps.json.example).

## Como o agente deve trabalhar

1. Mudanças pequenas e alinhadas ao padrão Octor (não reinventar auth).
2. Após clonar o template num app novo: renomear serviço, host, `OCTOR_SERVICE_NAME`, registrar no host + catálogo.
3. Compose/env de produção no bare metal: repo ops `sp1-sd-octor-1` (`apps/<app>/`), não só este código.
4. Vite apps de produto (agenda/estoque): referência `web-stock` (`VITE_*`); este template é a linha **Next/Ecme**.
