# Stellage

## Platform Overview

Stellage is an internet platform for buying, selling, placing, and collecting **digital content**.

**Core concept — Box:** A content container holding photos, videos, text, apps, scripts, etc. Boxes can be sold, gifted, purchased, or placed on a Stellage (shelf).

**Core concept — Stellage (Shelf):** The workspace for boxes. Each user can create shelves for specific purposes — like a market stall where they curate thematic content or display collectible boxes. Every user also has their own personal shelf to showcase their own boxes publicly.

## Stack

- **Backend:** Python / FastAPI, Alembic (migrations), Docker Compose
- **Frontend:** React + TypeScript (Vite), Zustand (state management)

## Open Problems (not yet resolved)

- **Box moderation:** The platform must not sell or display boxes containing offensive, discriminatory, or propaganda content (political, nationality, orientation-based), 18+ content, personal user data, documents, or financial details (bank cards, etc.).
- **Payments:** The payment method for buying/selling boxes and shelves is undecided — cryptocurrency or standard payment via YooKassa (ЮКасса).
