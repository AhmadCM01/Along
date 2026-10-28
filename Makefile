.PHONY: up down logs migrate seed index test eval lint

up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f

migrate:
	cd backend && python -m scripts.migrate

seed:
	cd backend && python -m scripts.seed

index:
	cd backend && python -m scripts.build_landmark_index

test:
	cd backend && pytest -q

eval:
	python -m evals.harness --suite all

lint:
	cd backend && ruff check . && mypy app
