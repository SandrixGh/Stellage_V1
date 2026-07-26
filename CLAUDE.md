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
  api/            # instance.ts (axios, cookie auth), assets.ts (S3), messagesSocket.ts (WS)
  components/     # Auth/, Layout/, Logo/, Messages/, Notifications/, Profile/, Stellage/, UI/
  pages/          # Auth/, Box/, CreateBox/, Feed/, Inventory/, Main/ (=/my-stellage),
                  # Messages/, Profile/, Search/, Settings/, Stellage/ (публичная полка)
  store/          # useAuthStore.ts, useStellageStore.ts, useThemeStore.ts
  hooks/ types/ utils/ styles/
  data/           # mockTemplates.ts — моки + живые хелперы, подлежит расщеплению
  App.tsx, main.tsx

backend/src/stellage/
  apps/           # всё монтируется под /api.v1 (apps/__init__.py)
    auth/         # routes, schemas, services, managers, depends (cookie JWT),
                  # мультиаккаунт на устройство (/auth/sessions, /auth/switch)
    boxes/
      routes.py   # эндпоинты коробок (/boxes)
      instances/  # schemas, services, managers, repositories, cache_managers
      templates/  # schemas, services, managers, repositories
      assets/     # S3-контент: routes, authorization, limits, tasks (Celery)
    shelves/      # routes, schemas, services, managers, repositories
    profile/      # профиль, поиск пользователей, смена email/пароля, аватар
    social/       # подписки и лайки коробок
    notifications/# FOLLOW / BOX_LIKE / MESSAGE / GIFT
    messaging/    # личные сообщения: routes, ws.py (WebSocket поверх Redis pub/sub)
  core/           # settings.py, rate_limit.py, celery_config.py, logging_config.py
    core_dependencies/  # db_dependency, redis_dependency, s3_dependency
  database/       # models/, enums/, mixins/, alembic/
```

## Frontend Patterns

- **Page template:** auth-gate check → loading state → JSX with `<WireframeBox>` visual
- **Store hooks:** `useAuthStore` (user, isAuthenticated), `useStellageStore` (boxes, shelves), `useThemeStore` (light/dark)
- **CSS — источник правды `frontend/src/styles/theme.css`, читать его перед любой вёрсткой.**
  Тон спокойный и массовый (Telegram/FB), светлая и тёмная темы через `data-theme` на `<html>`.
  Не хардкодить hex/rgb в компонентах — только переменные темы.
  - Светлая: `--ground #EEF1F1`, `--surface #FFFFFF`, `--ink #14181A`
  - Акцент один — петроль-зелёный `--accent #4FA98E`, только на действиях
  - Энергия — на коробках (`--box-common/rare/golden/dev`), интерфейс тихий
  - Радиусы — тесная шкала `--radius-xs/sm/md/lg` (2/4/6/10px), `--radius-pill` только для тумблеров
  - Тени лёгкие, на цвете чернил: `--shadow-sm/md/lg`
  - **Без стекла, неона, свечения и цветных «орбов».** Полупрозрачность
    (`--chrome-rgb` + blur) — только для шапки и плавающих панелей поверх контента
- **Typography:** Inter (`--font-body`, рабочий текст/UI), Manrope (`--font-display`, заголовки и имена)

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

Use `/new-page`, `/new-endpoint`, `/new-component`, `/new-form`, `/new-card`, `/new-feed-layout`, `/git-commit` for scaffolding tasks. Use `/frontend-design` for visual direction. Use `/token-audit` to check for token burn risks. Use `/stellage-run` to start the full app (Docker services + frontend dev server).

## Avoid Reading

- `backend/.venv/` — never traverse
- `frontend/node_modules/` — never traverse

## Product Decisions

- **Валюта — StellaCoin,** внутренняя, целочисленная. Пользователи пополняют
  баланс и покупают за него коробки и стеллажи. Реального платёжного провайдера
  нет и он не выбран (крипта vs ЮKassa отложены): StellaCoin сознательно
  рассматривается как перспективная заглушка. Провайдер, если появится,
  подключается ровно в одной точке — пополнении кошелька; заказы и передача
  владения о настоящих деньгах не знают.
- **Модерация — минимальная:** кнопка «пожаловаться» + разбор суперюзером.
  Автосканирование контента, апелляции и полноценная админка отложены.
  Запрещённый контент (оскорбительный, дискриминационный, пропаганда,
  18+, персональные данные, документы, банковские карты) — основание для
  жалобы; принуждение идёт через существующее поле `BoxInstance.is_verified`
  (`SCAM` скрывает коробку от всех, кроме владельца).
- **Аудитория — сам разработчик и друзья.** Не масс-маркет. Решения выбираются
  скучные и простые: Postgres вместо отдельного поискового движка, никакого
  trending-ранжирования, деплой отложен.

## Open Problems (not yet resolved)

- **Что значит «купить стеллаж»:** дополнительные слоты полок сверх лимита или
  покупка чужой готовой полки вместе с коробками. Заложены слоты; второе — позже.
- **Редактирование шаблона задевает чужие коробки.** `BoxTemplate` общий для всех
  экземпляров, а `PATCH /boxes/update-box` меняет его поля — то есть отображение
  коробки, которой владеет другой пользователь. До продаж это баг, после —
  способ обмануть покупателя. Решать до запуска экономики.
- **Удаление аккаунта испаряет коробки** (`User` → `boxes` каскад
  `all, delete-orphan`). Нужно решение о мягком удалении/анонимизации до того,
  как появятся покупки.

## Local Run

Полный цикл описан в `/stellage-run`. Важно: корневой `docker-compose.yml` берёт
переменные из `backend/.env`, поэтому все команды compose требуют
`--env-file backend/.env` — иначе значения подставятся пустыми.
