# AGENTS.md — `web-sqlite-admin` / api

API Rust do admin SQLite. Sem MySQL. Auth: `PASSWORD` → token HMAC; opcional `AUTH_INTROSPECT_URL`.

Health: `/health/live` + `/ready` (diretório `LOCATION` legível).

Não expor SQL arbitrário sem auth. Identificadores de tabela validados.
