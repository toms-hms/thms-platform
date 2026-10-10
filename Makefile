.PHONY: run run-d stop build build-run restart logs \
        migrate migrate-deploy seed reset-db shell-db graphql-schema \
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
	docker compose exec api python manage.py makemigrations && docker compose exec api python manage.py migrate

migrate-deploy:
	docker compose exec api python manage.py migrate

seed:
	docker compose exec api python manage.py seed

reset-db:
	docker compose stop postgres
	docker compose rm -f postgres
	docker volume rm thms-platform_pgdata
	docker compose up -d postgres
	@echo "Waiting for postgres..."
	@until docker compose exec postgres pg_isready -U $${POSTGRES_USER:-thms} -d $${POSTGRES_DB:-thms_db} > /dev/null 2>&1; do sleep 1; done
	$(MAKE) migrate
	$(MAKE) seed

shell-db:
	docker compose exec api python manage.py dbshell

graphql-schema:
	docker compose exec api python manage.py graphql_schema --out schema.graphql

# ── Health ─────────────────────────────────────────────────────────────────────

check:
	@echo "Checking API health..."
	@curl -sf http://localhost:3001/health | python3 -m json.tool
	@echo "Checking web..."
	@curl -sf -o /dev/null -w "Web status: %{http_code}\n" http://localhost:3000

# ── Tests ──────────────────────────────────────────────────────────────────────

test: test-web test-api

test-api:
	@echo "Running backend tests inside container..."
	docker compose exec -e DJANGO_ENV=test api python manage.py test

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
