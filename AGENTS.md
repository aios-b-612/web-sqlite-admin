# AGENTS.md — `web-sqlite-admin`

Admin SQLite Octor (substitui phpLiteAdmin no hosting). Org [`0ctor`](https://github.com/0ctor).

## Este componente

| Campo | Valor |
|-------|--------|
| Repo | `0ctor/web-sqlite-admin` |
| Layout | Dual: `frontend/` (Next) + `api/` (Rust/Actix) |
| Uso principal | Sidecar por base SQLite no `platform-hosting` |
| Auth sidecar | `PASSWORD` → `POST /v1/auth/login` → Bearer |
| Env legado | `PASSWORD` + `LOCATION` (iguais ao phpLiteAdmin) |

## Padrões da org (obrigatórios)

<!-- octor-ecosystem:start -->
> Vale para **qualquer** assistente e IDE (**Cursor**, **OpenCode**, **Codex**, **VS Code**/Copilot, Claude, ChatGPT, etc.) e para humanos.
> **Fonte portátil (igual para todo o time):** este `AGENTS.md` — o bloco abaixo. Pastas de IDE (`.cursor/`, `.opencode/`, `.codex/`, …) são **opcionais** e **não** podem contradizer nem substituir este bloco.
> Detalhe canônico: portal [`0ctor/backstage`](https://github.com/0ctor/backstage) (`agents-ecosystem-block.md` + docs).

1. **Git Flow:** proibido editar/push em `main`. `feature/*` ← `dev` → PR→`dev` → PR `dev`→`main` (deploy **só** em `main`). **Hotfix absoluto** (bug que precisa ir já a `main`): `fix/*` ← `main` → PR→`main` + PR/cherry-pick do mesmo fix em `dev` — proibido acelerar via `dev`+promote. Apagar branch após merge (remota + local). Doc: [git-flow.md](https://github.com/0ctor/backstage/blob/main/git-flow.md).
2. **Schema (ADR-005):** DDL/migrations **somente** em [`platform-database`](https://github.com/0ctor/platform-database). Proibido `Schema::` / `dbforge` / pastas `migrations/` de schema em outros apps. Este admin opera ficheiros SQLite do cliente — não cria schema qhoras.
3. **Auth / SSO:** produto PaaS usa [`web-auth`](https://github.com/0ctor/web-auth). **Exceção deste repo:** sidecar hosting autentica com `PASSWORD` (mesmo contrato do phpLiteAdmin).
4. **Segredos:** só `.env` / Vault — nunca commit. GitHub Actions: **Variables** para não-sensível; **Secrets** para credenciais.
5. **Loki:** backend `LOKI_PUSH_*` + `LOKI_JOB` no `.env` da API; frontend via `POST /v1/errors/report` — **proibido** senha Loki em `NEXT_PUBLIC_*`.
6. **Constraints:** sem hostname/IP de produção hardcoded; sem gates absolutos de PRD no código; **sem** rotas HTTP `OPTIONS` (CORS no gateway).
7. **Deploy:** dual GHCR ou imagem sidecar; integração no `platform-hosting` (`SQLITE_ADMIN_IMAGE`).
8. **Testes (mínimo):** unitários obrigatórios; CI FE + API em **`dev` e `main`**.
9. **Agente:** username **Alfred** (nunca “Mordomo Octor”).
10. **Stack:** Next + Rust/Actix — não trocar sem decisão explícita.
11. **Mapa cross-app:** [`catalog.yaml`](https://github.com/0ctor/backstage/blob/main/catalog.yaml). App novo: [novo-app-octor.md](https://github.com/0ctor/backstage/blob/main/novo-app-octor.md).
12. **Dependentes de dados:** mudanças no contrato do sidecar → avaliar `platform-hosting` / `web-hosting`.
13. **Datas / fusos (débito contínuo):** instantes de auditoria em **UTC** no backend; UI no fuso do operador. Canônico: [timezone-datetime.md](https://github.com/0ctor/backstage/blob/main/timezone-datetime.md).
14. **Diagramas:** arquitetura/workflow/sequência → [Archify](https://github.com/tt-a1i/archify); ver [docs-sync.md](https://github.com/0ctor/backstage/blob/main/docs-sync.md).
<!-- octor-ecosystem:end -->

## Obrigações deste repositório

1. Manter compatibilidade `PASSWORD` + `LOCATION` com o provisionamento do hosting.
2. Não servir SQL sem Bearer válido.
3. Health live/ready na API e no FE.
4. CI: `ci-frontend.yml` + `ci-api.yml` + git-flow-guard.
