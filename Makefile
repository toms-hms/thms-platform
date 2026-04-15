.PHONY: run run-d stop build build-run restart logs \
        migrate seed studio \
        check test test-api test-web \
        shell-api shell-web \
        clean

# ── Dev ────────────────────────────────────────────────────────────────────────

run:
	docker compose up

run-d:
	docker compose up -d

stop:
	docker compose down

build:
	docker compose build

build-run:
	@(until curl -sf http://localhost:3000 > /dev/null 2>&1; do sleep 1; done && open http://localhost:3000) &
	docker compose up --build

restart:
	docker compose down && docker compose up

logs:
	docker compose logs -f

logs-api:
	docker compose logs -f api

logs-web:
	docker compose logs -f web

# ── Database ───────────────────────────────────────────────────────────────────

migrate:
	docker compose exec api npx drizzle-kit generate && docker compose exec api npx drizzle-kit migrate

migrate-deploy:
	docker compose exec api npx drizzle-kit migrate

seed:
	docker compose exec api npx tsx src/db/seed.ts

studio:
	docker compose exec api npx drizzle-kit studio

# ── Health ─────────────────────────────────────────────────────────────────────

check:
	@echo "Checking API health..."
	@curl -sf http://localhost:3001/health | python3 -m json.tool
	@echo "Checking web..."
	@curl -sf -o /dev/null -w "Web status: %{http_code}\n" http://localhost:3000

# ── Tests ──────────────────────────────────────────────────────────────────────

test: test-web test-api

test-api:
	@echo "Running backend integration tests inside container..."
	docker compose exec api sh -c 'NODE_OPTIONS="--max-old-space-size=3072" npx jest --runInBand --forceExit'

test-web:
	@echo "Running frontend component tests..."
	docker compose exec web npx jest

# ── Shells ─────────────────────────────────────────────────────────────────────

shell-api:
	docker compose exec api sh

shell-web:
	docker compose exec web sh

# ── Cleanup ────────────────────────────────────────────────────────────────────

clean:
	docker compose down -v --remove-orphans
