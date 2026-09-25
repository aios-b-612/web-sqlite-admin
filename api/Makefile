# Makefile — template-api-rust (API Octor)
# Desenvolvimento local: Cargo + Vault OPS
# Docs: https://backstage.octor.com.br/desenvolvimento-local

APP_NAME ?= $(shell basename $(CURDIR))
VAULT_URL ?= http://10.8.0.9:8200
VAULT_PATH ?= apps/$(APP_NAME)/dev
OCTOR_CLI := $(HOME)/.octor/bin/octor-env

.PHONY: help install-cli env env-push env-diff run dev up down test fmt clippy docker

help:
	@echo "Comandos (VPN Octor requerida para vault):"
	@echo "  make env / env-push / env-diff  - secrets no Vault"
	@echo "  make run | make dev            - env + cargo run"
	@echo "  make test | fmt | clippy | docker"
	@echo "Vault path: $(VAULT_PATH)"

install-cli:
	@mkdir -p $(HOME)/.octor/bin
	@curl -sfL $(VAULT_URL)/cli/octor-env -o $(OCTOR_CLI) && chmod +x $(OCTOR_CLI)

$(OCTOR_CLI):
	@$(MAKE) install-cli

env: $(OCTOR_CLI)
	@$(OCTOR_CLI) pull $(VAULT_PATH) .env

env-push: $(OCTOR_CLI)
	@$(OCTOR_CLI) push $(VAULT_PATH) .env

env-diff: $(OCTOR_CLI)
	@$(OCTOR_CLI) diff $(VAULT_PATH) .env

run: env
	cargo run

dev: run

up: env
	@if [ -f docker-compose.yml ]; then docker compose up -d; \
	elif [ -f docker-compose.example.yml ]; then docker compose -f docker-compose.example.yml up -d; \
	else $(MAKE) run; fi

down:
	@if [ -f docker-compose.yml ]; then docker compose down; \
	elif [ -f docker-compose.example.yml ]; then docker compose -f docker-compose.example.yml down; \
	else true; fi

test:
	cargo test

fmt:
	cargo fmt

clippy:
	cargo clippy --all-targets -- -D warnings

docker:
	docker build -t $(APP_NAME):local .
