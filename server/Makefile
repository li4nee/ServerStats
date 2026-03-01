lint:
	@prettier --write "src/**/*.ts"

up:
	sudo docker compose -f docker-compose.yml --env-file .env down
	sudo docker compose -f docker-compose.yml --env-file .env up --build -d
	sudo docker image prune -f
	sudo docker compose -f docker-compose.yml --env-file .env logs -f server-api

down:
	sudo docker compose -f docker-compose.yml --env-file .env down
	sudo docker image prune -f