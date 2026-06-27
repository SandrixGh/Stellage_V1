# Stellage — Test Run Observations
Date: 2026-06-27

## Test Results

**53 / 53 tests passed** (1.51 s)

Test modules:
- `tests/test_auth_handler.py` — 14 unit tests, all passed
- `tests/test_auth_api.py` — 13 API tests, all passed
- `tests/test_shelf_api.py` — 13 API tests, all passed
- `tests/test_box_api.py` — 13 API tests, all passed

---

## What Works

### Authentication (AuthHandler)
- **Password hashing** works correctly: bcrypt hashes are non-deterministic (random salt), and
  `verify_password` correctly distinguishes correct from incorrect passwords.
- **JWT creation & decoding**: tokens carry the correct `user_id` and `session_id` claims;
  expired and malformed tokens raise HTTP 401 as expected.
- **Confirmation code generation**: produces uppercase alphanumeric codes of the requested
  length with sufficient randomness.

### Auth API (`/api.v1/auth`)
- `POST /register` correctly validates input (422 for short passwords and invalid emails),
  returns 201 on success, and returns 400 for duplicate emails.
- `POST /login` returns 200 and sets an `Authorization` cookie on success; returns 401 for
  wrong credentials and for unverified accounts; returns 422 for a missing request body.
- `GET /get-user` correctly returns 200 for an authenticated session and 401 when the
  cookie is absent.
- `POST /logout` clears the session and returns 200.
- `DELETE /delete-account` removes the account and returns 200.
- All protected endpoints correctly return 401 when accessed without an auth cookie.

### Shelf API (`/api.v1/shelf`)
- `POST /create-shelf` validates the `title` field (422 for length < 3 characters) and
  enforces the 2-shelf limit (409).
- `GET /get-shelves` returns a list of shelves for the authenticated user.
- `GET /main-shelf` and `GET /main-shelf-with-boxes` return the main shelf (with the
  `boxes` array included in the second endpoint).
- `GET /get-shelf-by-id` returns 404 for an unknown shelf ID.
- `DELETE /delete-shelf` successfully removes a shelf and returns 200.
- All shelf endpoints correctly block unauthenticated access with 401.

### Box API (`/api.v1/boxes`)
- `GET /get-box-templates` is **publicly accessible** (no auth required) — this appears
  to be intentional and works correctly.
- `POST /create-box-template` requires authentication (401 without cookie) and validates
  the request body including enum values.
- `POST /create-box-instance` creates an instance linked to the authenticated user and a
  template; returns 201 with nested template data.
- `GET /get-box-instance` returns 404 for an unknown instance ID.
- `POST /move-box-to-shelf` moves a box to a shelf (passing `shelf_id`) and also accepts
  no `shelf_id` to unshelf a box — both cases return 200.
- `DELETE /delete-box-instance` returns 204 (No Content) on success.

---

## Issues Found

### Bug — enum values are lowercase strings
`CurrencyEnum` and similar enums use lowercase string values (`"rub"`, `"usd"`, etc.)
while `BoxRarity` also uses lowercase (`"common"`, `"rare"`, etc.). Clients sending
uppercase values (e.g., `"RUB"`) receive a 422. This is technically correct API
behaviour, but the API documentation (Swagger `/docs`) should make this explicit
to avoid client-side confusion.

### Not yet tested — integration against real services
All tests mock the database and Redis. The following real behaviours are **not covered**
by the current test suite and would require running PostgreSQL + Redis + RabbitMQ:
- Actual user registration with email confirmation via Celery / RabbitMQ.
- Database uniqueness constraints (duplicate email at the DB level).
- Redis session storage and expiry.
- Rate limiting behaviour under load.
- Alembic migration correctness.

### Not yet implemented — profile endpoints
The profile routes (`/api.v1/profile`) for changing email and password exist in the
codebase but are not covered by tests yet.

### Deprecation warning
`asyncio.get_event_loop()` used in the `run()` helper in `conftest.py` raises a
`DeprecationWarning` in Python 3.13. This can be replaced with
`asyncio.run()` or a dedicated event loop fixture when `pytest-asyncio` becomes
available offline.

---

## Summary

The application's routing, authentication logic, input validation, and service-layer
error handling all work correctly at the unit and mocked-integration level. No logic bugs
were discovered during this run. The main risk area is the parts that require live
infrastructure (email delivery, Redis sessions, DB constraints), which cannot be verified
without the Docker services running.
