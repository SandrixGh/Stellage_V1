# Stellage Run

Start all Stellage services (infrastructure + backend + celery) and the frontend dev server.

## Steps

### 1. Start Docker services

Run from the project root:

```
docker compose --env-file backend/.env up -d --build
```

This starts: `pg`, `redis`, `rabbitmq`, `pgadmin`, `backend` (uvicorn on :8000), `celery`.

### 2. Wait for backend to be ready

Check that the backend container is running and healthy:

```
docker compose --env-file backend/.env ps
```

If `stellage-backend` shows `Up` — proceed. If it shows `Exit` or errors — run:

```
docker compose --env-file backend/.env logs backend --tail=50
```

and report the error to the user.

### 3. Run database migrations

```
docker compose --env-file backend/.env exec backend alembic upgrade head
```

Skip this step if the user says migrations are already up to date.

### 4. Start frontend dev server

Run in PowerShell (background process so the user can interact with the terminal):

```
cd frontend
npm run dev
```

Use `run_in_background: true` in the Bash tool so Claude doesn't block.

### 5. Report status

Tell the user:

```
Stellage is running:
  Frontend  → http://localhost:5173
  Backend   → http://localhost:8000/docs
  PGAdmin   → http://localhost:5050
  RabbitMQ  → http://localhost:15672
```

## Stopping

To stop all Docker services:

```
docker compose --env-file backend/.env down
```

## Rebuilding after dependency changes

If `pyproject.toml` or `poetry.lock` changed, rebuild the image:

```
docker compose --env-file backend/.env up -d --build backend celery
```
