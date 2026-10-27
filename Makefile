# Development: docker-compose.yml alone is the backend without host-port hardening;
# docker-compose.dev.yml adds pgweb, the seed watchers and the demo identities.
# Production: docker-compose.prod.yml overlays the base file. See docs/deployment.md.

PROD := docker compose -f docker-compose.yml -f docker-compose.prod.yml

up:
	docker compose -f docker-compose.yml pull --quiet
	docker compose -f docker-compose.yml build
	docker compose -f docker-compose.yml up -d

stop:
	docker compose -f docker-compose.yml stop

restart:
	docker compose -f docker-compose.yml stop
	docker compose -f docker-compose.yml pull --quiet
	docker compose -f docker-compose.yml build
	docker compose -f docker-compose.yml up -d

up-dev:
	docker compose -f docker-compose.dev.yml pull --quiet
	docker compose -f docker-compose.dev.yml build
	docker compose -f docker-compose.dev.yml up -d

stop-dev:
	docker compose -f docker-compose.dev.yml stop

restart-dev:
	docker compose -f docker-compose.dev.yml stop
	docker compose -f docker-compose.dev.yml pull --quiet
	docker compose -f docker-compose.dev.yml build
	docker compose -f docker-compose.dev.yml up -d

# --- production ---------------------------------------------------------------
# Builds the frontend image on this host (needs ~4 GB RAM or swap). To run a CI-built
# image instead, set FRONTEND_IMAGE in .env and use `make up-prod-pull`.
up-prod:
	$(PROD) pull --quiet --ignore-buildable
	$(PROD) build beda-frontend
	$(PROD) up -d

up-prod-pull:
	$(PROD) pull --quiet
	$(PROD) up -d --no-build

stop-prod:
	$(PROD) stop

restart-prod: stop-prod up-prod

logs-prod:
	$(PROD) logs -f --tail=100 caddy keycloak fhir-gateway fhir-sdc beda-frontend

ps-prod:
	$(PROD) ps

backup:
	sh scripts/backup.sh
