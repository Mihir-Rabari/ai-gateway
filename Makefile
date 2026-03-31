.PHONY: up down logs ps migrate clean

up:
	docker-compose up -d

down:
	docker-compose down

logs:
	docker-compose logs -f

ps:
	docker-compose ps

migrate:
	@echo "Migrations run automatically via Postgres docker-entrypoint-initdb.d"

clean:
	docker-compose down -v
	rm -rf node_modules .turbo

dev:
	pnpm install && pnpm turbo dev
