# web-sqlite-admin

Admin SQLite da Octor — **Next.js** + **API Rust/Actix**. Substitui o **phpLiteAdmin** no sidecar do `platform-hosting`.

| Peça | Origem |
|------|--------|
| `frontend/` | [`0ctor/template-frontend`](https://github.com/0ctor/template-frontend) |
| `api/` | [`0ctor/template-api-rust`](https://github.com/0ctor/template-api-rust) adaptada a SQLite |
| Repo | [`0ctor/web-sqlite-admin`](https://github.com/0ctor/web-sqlite-admin) |

## Contrato sidecar (compatível com hosting)

O `platform-hosting` hoje sobe o phpLiteAdmin com:

| Env | Valor típico |
|-----|----------------|
| `PASSWORD` | senha da base no painel |
| `LOCATION` | `/db/databases` (volume do site montado em `/db`) |

Esta API aceita os **mesmos** nomes (`PASSWORD` / `LOCATION`). Aliases: `ADMIN_PASSWORD`, `SQLITE_DIR`.

## MVP (API)

| Método | Path | Auth |
|--------|------|------|
| POST | `/v1/auth/login` | senha → Bearer |
| GET | `/v1/auth/me` | Bearer |
| GET/POST | `/v1/databases` | Bearer |
| GET | `/v1/databases/{name}` | Bearer |
| GET | `/v1/databases/{name}/tables` | Bearer |
| GET | `/v1/databases/{name}/tables/{table}/schema` | Bearer |
| GET | `/v1/databases/{name}/tables/{table}/rows` | Bearer |
| POST | `/v1/databases/{name}/sql` | Bearer |
| POST/PATCH/DELETE | `/v1/databases/{name}/tables/{table}/rows` | Bearer |
| POST/DELETE | `/v1/databases/{name}/schema/tables` | Bearer |
| POST | `/v1/databases/{name}/schema/columns` | Bearer |
| GET | `/v1/databases/{name}/export.sql` | Bearer |
| POST | `/v1/databases/{name}/import` | Bearer |
| GET | `/v1/databases/{name}/objects` | Bearer |
| PATCH/DELETE | `/v1/databases/{name}` | Bearer (rename / apagar ficheiro) |
| POST | `/v1/databases/{name}/vacuum` | Bearer |
| GET | `/v1/databases/{name}/integrity` | Bearer |
| GET | `…/tables/{table}/rows?q=&column=` | Bearer (busca LIKE) |
| POST/DELETE | `/v1/databases/{name}/schema/indexes|views|triggers` | Bearer |
| GET | `/health/live` · `/health/ready` | não |

UI: login, bases (criar/renomear/apagar), tabelas, busca, CRUD, schema, import/export, VACUUM/integrity, console.

## Dev local

```bash
# API
cd api && cp .env.example .env && mkdir -p /tmp/octor-sqlite-admin
cargo run

# FE (outro terminal)
cd frontend && cp .env.example .env
# NEXT_PUBLIC_API_URL=http://127.0.0.1:8080
# NEXT_PUBLIC_CENTRAL_AUTH_ENABLED=false
npm install && npm run dev
```

## Deploy

- Dual GHCR: `web-sqlite-admin` (FE) + `web-sqlite-admin-api` (API) — compose de exemplo na raiz.
- Sidecar hosting: imagem única (ver `Dockerfile.sidecar`) na porta 80; depois trocar `SQLITE_ADMIN_IMAGE` no `platform-hosting`.

## Próximos passos

1. CRUD de linhas / import-export / schema DDL na UI
2. Trocar imagem no `platform-hosting` (`octor-hosting-phpliteadmin` → esta)
3. Catálogo Backstage + Statuspage quando for app PaaS próprio
