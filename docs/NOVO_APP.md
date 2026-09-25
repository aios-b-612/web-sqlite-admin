# Novo app a partir deste template

Golden path Octor para frontend Next.js (Ecme). Deploy via `platform-deploy-hook`.

## 1. Criar o repositório

1. No GitHub: **Use this template** → `0ctor/web-<nome>` (ou `gh repo create --template 0ctor/template-frontend`).
2. Branches: default `dev`; produção = `main`.
3. Renomeie `OCTOR_SERVICE_NAME`, `package.json` `name`, títulos e host.
4. Defina `NEXT_PUBLIC_APP_ID` com o id do AppMenu (e registre o app no web-auth).
5. Rode `npm test` / CI verde antes do PR.

## 2. Contrato do app (obrigatório)

| Item | Onde |
|------|------|
| SSO web-auth | `NEXT_PUBLIC_AUTH_PORTAL_URL` + `NEXT_PUBLIC_AUTH_API_URL` (build-time) |
| App id (registry) | `NEXT_PUBLIC_APP_ID` (ex. `stock`, `crm`) — gate de entitlement |
| Account | `GET /v1/account` → `modules` / `roles` / `apps` / `company_uuid` / `profile` |
| Acesso | `resolveAppAccess` — rejeita `admin`, exige empresa + app no plano |
| AppMenu | Header: lista de `user.apps` + handoff SSO |
| Health | `GET /api/health/live` + `/api/health/ready` |
| Loki | FE → `POST /api/errors/report` → API com `LOKI_*` (nunca senha no browser) |
| Session guard | `src/auth/authSessionGuard.ts` — não logout em 401 genérico |
| Soft delete | `deleted_at` + `deleted_by` nas entidades deletáveis (API) |
| Git flow | `feature/*` ← `dev` → PR → `dev` → PR → `main` |
| Marca | Primary `#0CAF60` — **não** deixar o azul Ecme (`#2a85ff`) como default |

## 3. Local (Zero Config — Vault)

Com VPN Octor conectada, **não copie `.env` no Slack**:

```bash
make env      # baixa apps/<repo>/dev do Vault (http://10.8.0.9:8200)
make install
make dev      # = make env + npm run dev
```

Primeira vez: o CLI abre o vault, você cola o token (salvo em `~/.octor/vault_token`).

| Comando | Descrição |
|---------|-----------|
| `make env` | Baixa `.env` do vault |
| `make env-push` | Envia `.env` local → vault (diff + confirmação) |
| `make env-diff` | Compara local vs vault |
| `make dev` | Secrets + `npm run dev` |
| `make up` | Secrets + docker compose (se existir) |

Sem vault / scaffold offline:

```bash
cp .env.example .env
# Scaffold sem portal: NEXT_PUBLIC_CENTRAL_AUTH_ENABLED=false
npm install
npm run dev
```

Docs: [desenvolvimento-local](https://backstage.octor.com.br/desenvolvimento-local) · Vault UI: `http://10.8.0.9:8200` (VPN).

Com SSO ligado, `/sign-in` redireciona para o portal de auth (DEV ou prod, conforme `.env`).

## 4. Registrar no PaaS (host sp1) — 1ª vez

Ops / platform (não o merge do dia a dia):

1. Pasta `/home/ubuntu/octor/apps/<app>/` com `docker-compose.yml` (base: `docker-compose.example.yml`) + `.env` (secrets).
2. Entrada em `apps/platform-deploy-hook/apps.json` — ver `docs/apps.json.example`.
3. DNS `*.octor.com.br` → SP1; CORS/allowlist no **web-auth** se host novo.
4. Statuspage (`octor` + `infra` se dual) + catálogo `web-backstage/catalog.yaml`.
5. User MySQL de aplicação no Percona (se houver API).

Depois: merge `dev` → `main` → webhook deploya sozinho.

## 5. Dual FE + API

Se a app tiver API própria:

- `kind: dual` no `apps.json` com `images.web` + `images.api`
- Traefik: API com `PathPrefix(/v1|/v2|/health)` prioridade **alta**; FE Host catch-all prioridade baixa
- Preferir health público na API; FE mantém `/api/health/live` para Docker HEALTHCHECK

## 6. Checklist “pronto”

- [ ] Bundle contém `auth.octor.com.br`
- [ ] `/api/health/live` e `/ready` → 200 JSON
- [ ] Erro no browser aparece no Loki (`job`/`app`, `source=frontend`)
- [ ] Deploy zero-downtime via hook; sessão não cai em 401 genérico
- [ ] Statuspage + catálogo atualizados
