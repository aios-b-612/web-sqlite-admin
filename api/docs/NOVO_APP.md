# Novo app a partir deste template

Golden path Octor para **API Rust/Actix**. Deploy via `platform-deploy-hook`.

## 1. Criar o repositório

1. GitHub: **Use this template** → `0ctor/platform-<nome>` ou backend em monorepo `web-*`.
2. Branches: default `dev`; produção = `main`.
3. Renomeie crate (`Cargo.toml`), binário, `OCTOR_SERVICE_NAME`, `LOKI_JOB`, imagem GHCR.

## 2. Contrato obrigatório

| Item | Onde |
|------|------|
| Health | `/health/live` + `/health/ready` |
| Auth | `AUTH_INTROSPECT_URL` → web-auth |
| Loki | `LOKI_*` + `POST /v1/errors/report` |
| Soft delete | `deleted_at` + `deleted_by` |
| DB user | aplicação (não root) em `percona` |
| Git flow | `feature/*` → `dev` → `main` |

## 3. Local

```bash
cp .env.example .env
# Crie o schema MySQL e user de app
cargo run
curl -s localhost:8080/health/live
```

## 4. Registrar no PaaS (host sp1) — 1ª vez

1. `/home/ubuntu/octor/apps/<app>/` com compose (base: `docker-compose.example.yml`) + `.env`
2. Entrada em `apps/platform-deploy-hook/apps.json` — `docs/apps.json.example`
3. DNS / Traefik; Statuspage (`octor` + `infra` se dual)
4. Catálogo `web-backstage/catalog.yaml` + porta em `services-ports.md`
5. Credenciais Loki no `.env` da API

## 5. Dual com frontend

Combine com [`template-frontend`](https://github.com/0ctor/template-frontend):

- `kind: dual` · `IMAGE_WEB` + `IMAGE_API`
- Traefik: API `PathPrefix(/v1|/health)` priority alta; FE Host catch-all baixa
- FE: `BUSINESS_API_INTERNAL_URL` → este serviço para `/api/errors/report`

## 6. Checklist

- [ ] `/health/live` e `/ready` → 200 JSON
- [ ] Soft delete na entidade de negócio
- [ ] Erro FE aparece no Loki (`source=frontend`)
- [ ] Statuspage + catálogo + Loki configurados
