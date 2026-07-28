# Stellage — Workspace Context & Instructions

## Platform Overview

Stellage is an internet platform for buying, selling, placing, and collecting **digital content**.

- **Core concept — Box:** A content container holding photos, videos, text, apps, scripts, etc.
  - `BoxTemplate`: Common definition of a box (price, content type, name, description, rarity).
  - `BoxInstance`: Specific instance of a box owned by a user (serial number, shelf position, sealed status).
  - Boxes can be sold, gifted, purchased, or placed on a Stellage (shelf).
- **Core concept — Stellage (Shelf):** The workspace grid for boxes.
  - Each user can create shelves for specific purposes (max 2 shelves currently).
  - Every user has a primary main shelf (`is_main: true`) to showcase their boxes publicly.

---

## Technical Stack

- **Backend:** Python 3.13 / FastAPI, SQLAlchemy 2.0 (Async), Alembic (migrations), PostgreSQL 18, Redis (Pub/Sub & Cache), RabbitMQ, Celery, MinIO / S3.
- **Frontend:** React + TypeScript (Vite), Zustand (state management), Vanilla CSS with CSS variables.

---

## Project Directory Structure

```
frontend/src/
  api/            # instance.ts (axios, cookie auth), assets.ts (S3), messagesSocket.ts (WS)
  components/     # Auth/, Layout/, Logo/, Messages/, Notifications/, Profile/, Stellage/, UI/
  pages/          # Auth/, Box/, CreateBox/, Feed/, Inventory/, Main/ (=/my-stellage),
                  # Messages/, Profile/, Search/, Settings/, Stellage/ (публичная полка)
  store/          # useAuthStore.ts, useStellageStore.ts, useThemeStore.ts
  hooks/ types/ utils/ styles/
  data/           # mockTemplates.ts
  App.tsx, main.tsx

backend/src/stellage/
  apps/           # API endpoints mounted under /api.v1 (apps/__init__.py)
    auth/         # routes, schemas, services, managers, depends (cookie JWT)
    boxes/        # routes.py, instances/, templates/, assets/ (S3 content authorization & limits)
    shelves/      # routes, schemas, services, managers, repositories
    profile/      # profile, user search, email/password changes, avatar
    social/       # subscriptions, likes
    notifications/# FOLLOW / BOX_LIKE / MESSAGE / GIFT
    messaging/    # private messages: routes, ws.py (WebSocket over Redis Pub/Sub)
  core/           # settings.py, rate_limit.py, celery_config.py, logging_config.py
    core_dependencies/  # db_dependency, redis_dependency, s3_dependency
  database/       # models/, enums/, mixins/, alembic/
```

---

## Frontend Guidelines & Design System

- **Page template:** Auth-gate check → Loading state → JSX layout.
- **Store hooks:** `useAuthStore` (user, isAuthenticated), `useStellageStore` (boxes, shelves, instances), `useThemeStore` (light/dark).
- **CSS Design Tokens:** Single source of truth is `frontend/src/styles/theme.css`.
  - Light mode: `--ground #EEF1F1`, `--surface #FFFFFF`, `--ink #14181A`.
  - Accent: Petrol green `--accent #4FA98E` (used ONLY for primary actions).
  - Box Rarities: Expressed via box border/accent tokens (`--box-common`, `--box-rare`, `--box-golden`, `--box-dev`). Interface remains quiet/neutral.
  - Radii: `--radius-xs/sm/md/lg` (2/4/6/10px). `--radius-pill` only for toggles/pills.
  - Shadows: Soft shadows `--shadow-sm/md/lg`.
  - **No glassmorphism, no neon, no bright colorful glows or decorative orbs.** Semi-transparency (`--chrome-rgb` + blur) is reserved exclusively for the top header and floating action panels.
- **Typography:** `Inter` (`--font-body`) for UI/body text, `Manrope` (`--font-display`) for headings and user names.
- **Box Visuals on Shelf:** Wireframe box geometry standing directly on shelf grid lines, accompanied by a clean shelf tag (`NAME · RARITY`). Avoid heavy card containers on shelf cells.

---

## Backend Architectural Patterns

- **Layer order:** `router` → `service` / `manager` → `repository` → `database`.
- **Endpoints:** `router.get/post` → `Depends(get_current_user)` → service call → response schema.
- **Schemas:** Pydantic v2 with strict Request/Response separation.
- **Enums:** Lowercase string values (e.g. `"rub"`, `"common"`).

---

## Content Storage & Security (S3)

- Binary content (photos, videos) resides in private S3 bucket (MinIO locally).
- Text content is stored in JSON column `content` (`BoxTextContent`).
- Content visibility rules are centralized in `apps/boxes/assets/authorization.py::can_view_box_content`: owner always has access; others only if box is `public` AND `unsealed` AND on a public shelf. Any refusal returns HTTP 404.
- Presigned POST for uploading; presigned GET (300s TTL) for reading. `s3_key` is NEVER exposed in API responses.
- Deletion is asynchronous via `DELETING` status and Celery cleanup.

---

## Product Decisions & Rules

- **Currency:** `StellaCoin` — internal integer currency.
- **Moderation:** Minimal (report button + admin verification flag `is_verified` / `SCAM`).
- **Target Audience:** Personal/friend group platform. Keep technical solutions simple and robust.

---

## Known Product Issues & Status

- **Shelf Positions (P1/P2):** Box placement via inventory must immediately record `shelf_row`/`shelf_col` coordinates via `POST /boxes/update-box-position` to prevent position shifts on reload.
- **Shelf Visual (P3):** Wireframe rendering directly on shelf lines without box card wrappers.
- **Shelf Drag (P4):** `updateBoxPosition` must support both main shelf and non-main selected shelves.
- **Template Updates:** Edits to `BoxTemplate` affect all instances; requires protection before real economy rollout.
- **Account Deletion:** Soft deletion / anonymization needed for boxes when account is deleted.

---

## Development Environment & Commands

- **Backend tests:** Run `poetry run python -m pytest tests` inside `backend/`.
- **Frontend build:** Run `npm run build` inside `frontend/`.
- **Local Stack Launch:** Use the `stellage-run` skill or execute `docker compose --env-file backend/.env up -d --build` from root.
