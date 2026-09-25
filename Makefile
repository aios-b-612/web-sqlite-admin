# Makefile — web-sqlite-admin (raiz)

.PHONY: help api-test api-run fe-install fe-dev

help:
	@echo "  make api-test | api-run"
	@echo "  make fe-install | fe-dev"

api-test:
	cd api && cargo test

api-run:
	cd api && cargo run

fe-install:
	cd frontend && npm install

fe-dev:
	cd frontend && npm run dev
