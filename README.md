# template-frontend — Template Frontend App Octor

Template canônico de **frontend Next.js (Ecme)** para apps `0ctor/web-*`.

Use este repositório via **GitHub Template** → novo app → ajuste env/nome → registre no `platform-deploy-hook` (ver [docs/NOVO_APP.md](./docs/NOVO_APP.md)).

## O que já vem pronto

| Peça | Detalhe |
|------|---------|
| **SSO web-auth** | `NEXT_PUBLIC_AUTH_*` → redirect ao portal; `/auth/callback`; `AuthRouteGuard` |
| **Account + gate** | `GET /v1/account` + `resolveAppAccess` (`NEXT_PUBLIC_APP_ID`) |
| **AppMenu** | Header com `user.apps` + handoff SSO entre apps |
| **Session guard** | Não desloga em 401 genérico (`authSessionGuard`) |
| **Health** | `/api/health/live` + `/api/health/ready` |
| **Loki** | FE → `POST /api/errors/report` (BFF) → API; sem senha no browser |
| **Docker** | `output: 'standalone'` + `Dockerfile` multi-stage |
| **CI** | lint · tsc · vitest · build |
| **Deploy** | `docs/apps.json.example` + `docker-compose.example.yml` |

NextAuth (Google/GitHub/credentials) fica só para **scaffold local** com `NEXT_PUBLIC_CENTRAL_AUTH_ENABLED=false`. Em produção o caminho é SSO.

## Setup rápido

**Com VPN + Vault (padrão do time):**

```bash
make env       # baixa .env de apps/<repo>/dev
make install
make dev       # npm run dev
```

| Make | Função |
|------|--------|
| `make env` / `env-push` / `env-diff` | Sync com Vault OPS (`10.8.0.9:8200`) |
| `make dev` | Secrets + hot reload |
| `make up` | Secrets + docker compose |

Docs: [desenvolvimento-local](https://backstage.octor.com.br/desenvolvimento-local).

**Sem vault (scaffold offline):**

```bash
cp .env.example .env
npm install
npm run dev
```

App em `http://localhost:3000`.

Produção / SSO ligado: preencha `NEXT_PUBLIC_AUTH_PORTAL_URL` e `NEXT_PUBLIC_AUTH_API_URL` (defaults de `.env.example` já apontam para `auth.octor.com.br`).

Scaffold sem portal:

```bash
# em .env
NEXT_PUBLIC_CENTRAL_AUTH_ENABLED=false
```

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Build de produção |
| `npm start` | Serve o build |
| `npm run lint` | ESLint |
| `npm run prettier` | Checagem Prettier |

## Deploy (resumo)

1. Template → repo `0ctor/web-<nome>` (`dev` / `main`)
2. Host: compose + `.env` + entrada em `apps.json` (PaaS)
3. Merge `dev` → `main` → `platform-deploy-hook` deploya

Detalhe: [docs/NOVO_APP.md](./docs/NOVO_APP.md) · agentes: [AGENTS.md](./AGENTS.md)

---

UI base: **Ecme** (Next.js + TypeScript + Tailwind). Demo original: [ecme-react.themenate.net](https://ecme-react.themenate.net/).
