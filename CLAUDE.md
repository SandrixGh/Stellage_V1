ANSWER TO USER IN RUSSIAN
# Stellage

## Platform Overview

Stellage is an internet platform for buying, selling, placing, and collecting **digital content**.

**Core concept — Box:** A content container holding photos, videos, text, apps, scripts, etc. Boxes can be sold, gifted, purchased, or placed on a Stellage (shelf).

**Core concept — Stellage (Shelf):** The workspace for boxes. Each user can create shelves for specific purposes — like a market stall where they curate thematic content or display collectible boxes. Every user also has their own personal shelf to showcase their own boxes publicly.

## Stack

- **Backend:** Python / FastAPI, Alembic (migrations), Docker Compose
- **Frontend:** React + TypeScript (Vite), Zustand (state management)

## Project Structure

```
frontend/src/
  api/            # instance.ts (axios, cookie auth), assets.ts (S3 upload/view)
  components/     # Shared: WireframeBox, BoxCard, AssetViewer, TemplateCard
  pages/          # Auth/, Home/, Feed/, Box/, CreateBox/, Profile/, MyStellage/
  store/          # useAuthStore.ts, useStellageStore.ts
  App.tsx, main.tsx

backend/src/stellage/
  apps/
    auth/         # routes, schemas, services, managers, depends (cookie JWT)
    boxes/
      routes.py   # эндпоинты коробок (/boxes)
      instances/  # schemas, services, managers, repositories, cache_managers
      templates/  # schemas, services, managers, repositories
      assets/     # S3-контент: routes, authorization, limits, tasks (Celery)
    shelves/      # routes, schemas, services, managers, repositories
    profile/
  core/           # settings.py, rate_limit.py, celery_config.py
    core_dependencies/  # db_dependency, redis_dependency, s3_dependency
  database/       # models/, enums/, mixins/, alembic/
```

## Frontend Patterns

- **Page template:** auth-gate check → loading state → JSX with `<WireframeBox>` visual
- **Store hooks:** `useAuthStore` (user, token, isAuthenticated), `useStellageStore` (boxes, shelves)
- **CSS:** dark `#080808` bg, beige `#D7D0B7` accent, glassmorphism cards (`backdrop-filter: blur(24px)`, `rgba(255,255,255,0.03)` bg, `rgba(215,208,179,0.15)` border, radius 28px)
- **Typography:** Syne (headings), Space Grotesk (body)

## Backend Patterns

- **Endpoint template:** `router.get/post` → `Depends(get_current_user)` → service call → response model
- **Layer order:** router → service/manager → repository → database
- **Schemas:** Pydantic v2, separate Request/Response models

## Content Storage (S3)

Бинарный контент коробок (фото/видео) лежит в приватном S3-бакете (локально —
MinIO из docker-compose, прод — Selectel; переезд = правка `.env`, см.
`infra/minio/README.md`). Текст — в типизированной JSON-колонке `content`
(`BoxTextContent`). Правило видимости контента централизовано в
`apps/boxes/assets/authorization.py::can_view_box_content`: владелец — всегда,
остальные — только public + распечатанная + на публичной полке; любой отказ —
404. Загрузка: presigned POST (initiate → прямой POST в S3 → complete с
проверкой сигнатуры файла). Чтение: presigned GET на 300с. `s3_key` никогда
не попадает в API-ответы; presigned-ссылки не логируются. Удаление — через
статус DELETING + Celery (немедленная задача + часовой sweeper).

## Skills Available

Use `/new-page`, `/new-endpoint`, `/new-component`, `/new-form`, `/new-card`, `/git-commit` for scaffolding tasks. Use `/token-audit` to check for token burn risks. Use `/stellage-run` to start the full app (Docker services + frontend dev server).

## Avoid Reading

- `backend/.venv/` — never traverse
- `frontend/node_modules/` — never traverse

## Open Problems (not yet resolved)

- **Box moderation:** The platform must not sell or display boxes containing offensive, discriminatory, or propaganda content (political, nationality, orientation-based), 18+ content, personal user data, documents, or financial details (bank cards, etc.).
- **Payments:** The payment method for buying/selling boxes and shelves is undecided — cryptocurrency or standard payment via YooKassa (ЮКасса).
