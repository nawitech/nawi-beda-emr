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