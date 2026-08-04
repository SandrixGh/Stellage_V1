FROM python:3.13-slim

WORKDIR /app

RUN pip install --no-cache-dir poetry

COPY pyproject.toml poetry.lock ./

RUN poetry config virtualenvs.create false \
    && poetry install --no-root --only main

COPY alembic.ini ./
COPY templates/ ./templates/
COPY src/ ./src/

ENV PYTHONPATH=/app/src

CMD ["sh", "-c", "alembic upgrade head && uvicorn stellage.main:app --host 0.0.0.0 --port ${PORT:-10000}"]
