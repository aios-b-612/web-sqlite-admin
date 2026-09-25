# Makefile — template-frontend (Next.js Octor)
# Desenvolvimento local zero config via Vault OPS
# Docs: https://backstage.octor.com.br/desenvolvimento-local
#
# Após clonar o template num app novo, APP_NAME vira o nome do repo
# (ex.: web-crm). O path no vault é apps/$(APP_NAME)/dev.

APP_NAME ?= $(shell basename $(CURDIR))
VAULT_URL ?= http://10.8.0.9:8200
VAULT_PATH ?= apps/$(APP_NAME)/dev
OCTOR_CLI := $(HOME)/.octor/bin/octor-env

.PHONY: help install-cli env env-push env-diff up down logs dev install test lint build docker

help:
	@echo "Comandos (VPN Octor requerida para vault):"
	@echo "  make env        - Baixa .env do vault"
	@echo "  make env-push   - Envia .env local → vault (diff + confirma)"
	@echo "  make env-diff   - Compara .env local vs vault"
	@echo "  make install    - npm ci"
	@echo "  make dev        - env + npm run dev"
	@echo "  make up         - env + docker compose up -d"
	@echo "  make down       - docker compose down"
	@echo "  make test/lint/build - qualidade"
	@echo ""
	@echo "Vault path: $(VAULT_PATH)"

install-cli:
	@mkdir -p $(HOME)/.octor/bin
	@echo "📥 Atualizando octor-env..."
	@curl -sfL $(VAULT_URL)/cli/octor-env -o $(OCTOR_CLI) && chmod +x $(OCTOR_CLI)
	@echo "✅ CLI em $(OCTOR_CLI)"

$(OCTOR_CLI):
	@$(MAKE) install-cli

env: $(OCTOR_CLI)
	@$(OCTOR_CLI) pull $(VAULT_PATH) .env

env-push: $(OCTOR_CLI)
	@$(OCTOR_CLI) push $(VAULT_PATH) .env

env-diff: $(OCTOR_CLI)
	@$(OCTOR_CLI) diff $(VAULT_PATH) .env

install:
	npm ci

# Fluxo diário do dev Next: secrets + hot reload
dev: env
	@echo "🚀 $(APP_NAME) — npm run dev"
	npm run dev

# Alternativa com Docker (compose no app gerado a partir do example)
up: env
	@echo "🚀 Subindo $(APP_NAME) (docker compose)..."
	@if [ -f docker-compose.yml ]; then docker compose up -d; \
	elif [ -f docker-compose.example.yml ]; then docker compose -f docker-compose.example.yml up -d; \
	else echo "❌ Sem docker-compose.yml — use: make dev"; exit 1; fi
	@echo "✅ $(APP_NAME) rodando"

down:
	@if [ -f docker-compose.yml ]; then docker compose down; \
	elif [ -f docker-compose.example.yml ]; then docker compose -f docker-compose.example.yml down; \
	else true; fi

logs:
	@docker compose logs -f

test:
	npm test

lint:
	npm run lint

build:
	npm run build

docker:
	docker build -t $(APP_NAME):local .
