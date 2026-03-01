lint:
	@prettier --write "src/**/*.ts"

up-with-logs:
	sudo docker compose -f docker-compose.yml --env-file .env down
	sudo docker compose -f docker-compose.yml --env-file .env up --build -d
	sudo docker image prune -f
	sudo docker compose -f docker-compose.yml --env-file .env logs -f server-api

up:
	sudo docker compose -f docker-compose.yml --env-file .env down
	sudo docker compose -f docker-compose.yml --env-file .env up --build
	sudo docker image prune -f

down:
	sudo docker compose -f docker-compose.yml --env-file .env down
	sudo docker image prune -f