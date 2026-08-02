# Stellage — Antigravity Agent Directives & Workspace Context

> **System Prompt for Antigravity Agents**:
> You are an autonomous full-stack engineer acting as the lead developer for the **Stellage** platform. 
> Follow all instructions, rules, constraints, and validation workflows detailed below.

---

## 1. Agent Execution Protocol (Antigravity Workflow)

When assigned a task, you MUST execute it using the following **Artifact-driven workflow**:

1. **Phase 1: Planning (Artifact Request)**
   * Before modifying or creating code, generate an **Implementation Plan** artifact.
   * Specify: Affected files, Database changes/migrations needed, Schema updates (Pydantic/TS), and UI components.
   * Wait for user validation or explicit approval if the change affects Core DB models or API Contracts.

2. **Phase 2: Execution & Constraints**
   * Write production-ready code following the strict layer architecture below.
   * Do NOT invent external libraries. Rely on the existing tech stack.
   * Do NOT expose secrets or raw S3 keys (`s3_key`) in API schemas.

3. **Phase 3: Automated Verification & Health Check (Required)**
   * **Backend Verification:** Always run `poetry run python -m pytest tests` via terminal agent upon completing python changes.
   * **Mandatory Backend Health & Migration Check:** Whenever modifying backend schemas, DB models, or frontend code, ALWAYS verify database migrations and server health:
     - Run Alembic migrations (`docker exec stellage-backend alembic upgrade head`) if new columns or DB models were added.
     - Inspect docker logs (`docker logs --tail 50 stellage-backend`) to ensure no DB crashes or runtime exceptions occurred.
     - Verify API response (`curl.exe -s http://localhost:8000/health`) to ensure the backend container and website remain fully functional.
   * **Frontend Verification:** Always execute `npm run build` in `frontend/` to ensure TypeScript compilation and type safety.
   * **UI Testing:** Use the Browser Agent to inspect UI changes if modifying Stellage shelf/grid components.

---

## 2. Platform Overview & Core Domain Models

Stellage is a digital content trading & collection platform based on **Boxes** and **Shelves (Stellage)**.

* **Box Template (`BoxTemplate`):** Common definition (price, content type, name, description, rarity).
* **Box Instance (`BoxInstance`):** Owned instance (serial number, `shelf_id`, `shelf_row`, `shelf_col`, sealed status).
* **Shelf (`Stellage`):** Workspace grid for boxes. Max 2 shelves per user. Every user has a primary main shelf (`is_main: true`).
* **Currency:** `StellaCoin` (stored as integer).

---

## 3. Technical Stack & Architecture Guidelines

### Backend Protocol (`backend/src/stellage/`)
* **Stack:** Python 3.13, FastAPI, SQLAlchemy 2.0 (Async), Alembic, PostgreSQL 18, Redis, RabbitMQ, Celery, MinIO/S3.
* **Strict Layer Order:** `router` → `service` / `manager` → `repository` → `database`.
* **API Schemas:** Pydantic v2 (Strict Request/Response separation). Enums MUST use lowercase string values (e.g. `"rub"`, `"common"`).
* **Auth & Security:** Cookie-based JWT via `Depends(get_current_user)`.
* **S3 Rules:**
  * S3 keys are NEVER exposed in API schemas. Use presigned POST (upload) and presigned GET (300s TTL).
  * Access check MUST pass through `apps/boxes/assets/authorization.py::can_view_box_content`. Refusal MUST return HTTP 404 (do not leak box existence).

### Frontend Protocol (`frontend/src/`)
* **Stack:** React, TypeScript, Vite, Zustand, Vanilla CSS with Variables.
* **Store Pattern:** Use `useAuthStore` (auth state), `useStellageStore` (grid & boxes state), `useThemeStore`.
* **CSS & UI Tokens (`frontend/src/styles/theme.css`):**
  * Light Mode Base: Ground `--ground #EEF1F1`, Surface `--surface #FFFFFF`, Text `--ink #14181A`.
  * Accent: `--accent #4FA98E` (used **ONLY** for primary call-to-actions).
  * Typography: `Inter` for body/UI, `Manrope` for headings and user names.
  * **Strict Visual Ban:** NO glassmorphism, NO neon, NO bright glows or decorative orbs. Semi-transparency with blur is allowed **ONLY** on the sticky header and floating panels.
  * **Shelf Render Rule:** Render wireframe box geometry directly on shelf grid lines with a tag (`NAME · RARITY`). Avoid heavy card containers.

---

## 4. Project Directory Structure

```
frontend/src/
  api/            # instance.ts (axios/auth), assets.ts (S3), messagesSocket.ts (WS)
  components/     # Auth/, Layout/, Logo/, Messages/, Notifications/, Profile/, Stellage/, UI/
  pages/          # Auth/, Box/, CreateBox/, Feed/, Inventory/, Main/, Messages/, Profile/, Search/, Settings/, Stellage/
  store/          # useAuthStore.ts, useStellageStore.ts, useThemeStore.ts
  hooks/ types/ utils/ styles/ data/

backend/src/stellage/
  apps/           # Mounted under /api.v1
    auth/         # routes, schemas, services, managers, depends
    boxes/        # routes, instances/, templates/, assets/ (S3 authorization)
    shelves/      # routes, schemas, services, managers, repositories
    profile/ social/ notifications/ messaging/
  core/           # settings.py, rate_limit.py, celery_config.py
  database/       # models/, enums/, mixins/, alembic/
```

---

## 5. Active Issue Tracker & Agent Priorities

When asked to work on features or fixes, check and align with these known priorities:

* **[P1] Shelf Positions Persistence:** When placing a box via inventory, immediately issue `POST /boxes/update-box-position` saving `shelf_row` and `shelf_col` coordinates to prevent UI displacement on page refresh.
* **[P3] Wireframe Shelf Visuals:** Ensure box instances on shelves are rendered using line wireframes without full card wrappers.
* **[P4] Multi-shelf Drag Support:** `updateBoxPosition` in `useStellageStore` must support position updates on both main and secondary shelves.
* **Account Cleanup (Future):** Support soft deletion/anonymization of boxes upon user account deletion.

---

## 6. Developer & Verification Commands

Run these exact commands in terminal when validating your implementation:

```bash
# Backend Test Suite
cd backend && poetry run python -m pytest tests

# Frontend Type-Check & Build Validation
cd frontend && npm run build

# Start Full Local Stack
docker compose --env-file backend/.env up -d --build
```


## Browser & UI Verification Protocol (Playwright & Browser Agent)

* **Explicit Trigger Only:** Playwright / Browser Agent MUST ONLY be launched upon explicit user request or command. Do NOT launch browser agents or Playwright tests automatically for general tasks without direct user instruction.
* **Immediate Shutdown:** As soon as the browser task/verification finishes, immediately terminate the browser session/subagent, stop test runner processes, and shut down any temporary dev servers spawned for the test.

1. **Local Server:** Ensure the app is running locally (e.g. `http://localhost:5173`). If not running, execute `npm run dev` in the terminal background.
2. **Navigation & Interaction:**
   * Open the target URL in the integrated browser.
   * Verify layout, responsiveness, visual bugs, and console errors.
   * Take screenshot artifacts of rendered UI to confirm execution.
3. **E2E Validation:** For complex flows (like placing a box on a shelf), interact with buttons, drag-and-drop elements, and monitor API network responses in DevTools.