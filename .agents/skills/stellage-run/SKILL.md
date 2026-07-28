---
name: stellage-run
description: Start all Stellage services (Docker infrastructure + backend + celery + alembic migrations) and the frontend dev server.
---

# Stellage Run

Start all Stellage services (infrastructure + backend + celery) and the frontend dev server.

## Execution Steps

### 1. Start Docker services

Run from the project root:

```powershell
docker compose --env-file backend/.env up -d --build
```

This starts: `pg`, `redis`, `rabbitmq`, `pgadmin`, `backend` (uvicorn on `:8000`), `celery`.

### 2. Wait for backend to be ready

Check container status:

```powershell
docker compose --env-file backend/.env ps
```

If `stellage-backend` shows `Up` (healthy) — proceed. If it shows `Exit` or errors:

```powershell
docker compose --env-file backend/.env logs backend --tail=50
```

### 3. Run database migrations

```powershell
docker compose --env-file backend/.env exec backend alembic upgrade head
```

### 4. Start frontend dev server

Run in the background so it doesn't block execution:

```powershell
npm run dev --prefix frontend
```

### 5. Report status

Provide the status summary to the user:

```
Stellage is running:
  Frontend  → http://localhost:5173
  Backend   → http://localhost:8000/docs
  PGAdmin   → http://localhost:5050
  RabbitMQ  → http://localhost:15672
```

## Stopping Services

To stop all Docker services:

```powershell
docker compose --env-file backend/.env down
```

## Rebuilding Services

If `pyproject.toml` or `poetry.lock` changed, rebuild the container image:

```powershell
docker compose --env-file backend/.env up -d --build backend celery
```
