# Stage 1: Build Frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
# В одноконтейнерном деплое API живет на том же сервере по пути /api.v1
ENV VITE_API_URL=/api.v1
RUN npm run build

# Stage 2: Python Backend + Serve Frontend
FROM python:3.13-slim
WORKDIR /app

RUN pip install --no-cache-dir poetry

COPY backend/pyproject.toml backend/poetry.lock ./
RUN poetry config virtualenvs.create false \
    && poetry install --no-root --only main

COPY backend/alembic.ini ./
COPY backend/templates/ ./templates/
COPY backend/src/ ./src/

# Копируем собранный фронтенд из Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

ENV PYTHONPATH=/app/src

CMD ["sh", "-c", "alembic upgrade head && uvicorn stellage.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
