---
name: component-rules
description: Strict guidelines, architecture rules, and UI/UX standards for adding or modifying React components, UI elements, neon glowing styles, layouts, Zustand stores, and FastAPI TypeScript interfaces in the Stellage application. Trigger this skill whenever creating, adding, refactoring, or integrating React UI components, buttons, forms, inputs, pages, cards, or frontend state.
---

# React Component & UI/UX Development Guidelines

Follow these strict principles whenever adding new UI components, features, or elements to the Stellage frontend application.

## 1. Component & Style Architecture
- **No Inline Styles:** NEVER write raw inline styles (`style={{ ... }}`) inside React JSX. All styles must reside in clean, corresponding CSS files.
- **Strict CSS Tokens & Geometry:**
  - Standard Radii: `--radius-xs` (2px), `--radius-sm` (4px), `--radius-md` (6px), `--radius-lg` (10px).
  - `--radius-pill` (999px) is strictly reserved for true pills/toggles ONLY.
  - Buttons and interactive chips must use `--radius-sm` (4px) or `--radius-md` (6px). Never make buttons oval/pill-shaped unless explicitly requested.
- **Quiet Animations (No Lift Jumping):**
  - Do NOT add `transform: translateY(...)` lift animations to buttons or controls on hover.
  - Interactive states must be calm and quiet, using soft background and border-color transitions (`transition: background 0.2s ease, border-color 0.2s ease`).

## 2. Layout & UX Integration
- **No Absolute Overlays:** Never place new buttons or controls using `position: absolute` floating on top of existing card components or labels.
- **Native Container Alignment:** Pass action elements as props or slots into parent containers (Flexbox/Grid). Ensure new elements sit on the same baseline and match typography (`font-size`, `letter-spacing`, `text-transform`) of adjacent tags (e.g. `.rarity-tag`).
- **Asset & Icon Scaling:** When displaying logos or custom icons inside standard 40px chips/badges, keep the container height locked to design system standards and use CSS `transform: scale(...)` with `overflow: hidden` to zoom the graphic without inflating outer container borders.

## 3. Strict TypeScript & State Management
- **No `any` types:** Every prop, state, and API payload must be strictly typed matching Pydantic backend models.
- **Zustand for Global State:** Maintain clean separation between global data (`useAuthStore`, `useStellageStore`, `useThemeStore`) and local UI toggles.

## 4. Mandatory Plan Before Implementation
Before writing frontend code, provide a brief plan covering:
1. Reused components, classes, and CSS tokens.
2. State handling (Zustand vs local).
3. Layout alignment and baseline integration.
