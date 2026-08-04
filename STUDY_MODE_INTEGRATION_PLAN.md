# Stellage Study Mode — План Интеграции Учебного Режима

> **Статус:** Утверждён · **Дата:** 2026-08-03
>
> Режим учёбы — **опциональный слой**, который пользователь включает переключателем в настройках.
> Когда он активен, интерфейс Stellage расширяется учебными функциями: стеллаж получает
> пространственные метки и индикаторы, коробки — встроенные study-инструменты,
> а навигация — новые разделы «Study Dashboard» и «Focus Mode».

---

## Принятые Решения

| # | Вопрос | Решение |
|---|--------|---------|
| Q1 | Персистенция study mode | **Серверная.** Колонка `study_mode_enabled: Boolean` в модели `User` + PATCH-эндпоинт. Позволяет отображать учебные интересы в публичном профиле. |
| Q2 | Focus Mode — overlay или страница | **Отдельный маршрут `/study/focus/:boxId`**. Пользователь может открывать несколько коробок одновременно. |
| Q3 | Семестровая сетка | **Вариант A (метки поверх существующей сетки) с адаптивностью.** Метки опциональны — пользователь может скрыть их. Пользователь сам кликает по ячейке и назначает ей статус (приоритет/предмет). |
| Q4 | Contrastive Language Grid | **Учебные полки — отдельные объекты** (новая модель `StudyShelf`), не связанные с лимитом обычных стеллажей (max 2). Лимит обычных полок не меняется. |
| Q5 | Study-виджеты в коробке | **Отдельная вкладка «Учёба»** рядом с «Контент» / «Файлы» внутри `BoxInstancePage`. |

---

## Архитектура: Обзор

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                     │
│                                                                     │
│  useStudyStore (Zustand)                                            │
│  ├── studyModeEnabled          ← синхронизация с сервером           │
│  ├── focusTimerMinutes         ← localStorage                      │
│  ├── cellStatuses              ← localStorage (row:col → status)    │
│  ├── rowLabels / colLabels     ← localStorage                      │
│  └── studyShelves              ← API (StudyShelf[])                 │
│                                                                     │
│  Новые компоненты:                                                  │
│  ├── ShelfGridLabels           (метки рядов/колонок на стеллаже)     │
│  ├── CellStatusPicker          (popup назначения статуса ячейке)     │
│  ├── StudyContainerSlot        (рефакторинг: STEM/Language/Pomodoro) │
│  ├── FocusModePage             (страница /study/focus/:boxId)       │
│  └── StudyDashboardPage        (страница /study)                    │
│                                                                     │
│  Новые маршруты:                                                    │
│  ├── /study                    (Study Dashboard)                    │
│  └── /study/focus/:boxId       (Focus Mode)                        │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│                        BACKEND                                      │
│                                                                     │
│  User model                                                         │
│  └── + study_mode_enabled: Boolean (default false)                  │
│                                                                     │
│  StudyShelf model (NEW)                                             │
│  ├── id, user_id, title, language_tag, grid_rows, grid_cols         │
│  ├── is_contrastive_pair_of: FK → StudyShelf (nullable)             │
│  └── boxes: relationship → BoxInstance                              │
│                                                                     │
│  Новые эндпоинты:                                                   │
│  ├── PATCH /profile/update     (+ study_mode_enabled field)         │
│  ├── CRUD  /study-shelves/*    (создание/удаление учебных полок)     │
│  └── GET   /profile/public     (+ study_mode_enabled в ответе)      │
│                                                                     │
│  Alembic Migration:                                                 │
│  └── add_study_mode_to_users + create_study_shelves_table           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Модуль 1: Study Mode Toggle, Store & Backend Persistence

**Цель:** Фундамент — включение/выключение Study Mode с серверной персистенцией и визуальной индикацией.

### Backend

#### [NEW] Alembic Migration — `add_study_mode_enabled_to_users`
- Добавить колонку `study_mode_enabled: Boolean` (default `false`, `server_default="false"`, `nullable=False`) в таблицу `users`.

#### [MODIFY] `backend/src/stellage/database/models/user.py`
```python
study_mode_enabled: Mapped[bool] = mapped_column(
    Boolean,
    default=False,
    server_default="false",
    nullable=False,
)
```

#### [MODIFY] `backend/src/stellage/apps/profile/schemas.py`
- Добавить `study_mode_enabled: bool` в схемы `ProfileUpdate` (опционально) и `ProfileResponse`.

#### [MODIFY] `backend/src/stellage/apps/profile/routes.py`
- Эндпоинт `PATCH /profile/update` уже существует — добавить обработку поля `study_mode_enabled`.
- Эндпоинт `GET /profile/public` — включить `study_mode_enabled` в публичный ответ (чтобы на профиле другого пользователя можно было видеть, что он использует Study Mode).

### Frontend

#### [NEW] `frontend/src/store/useStudyStore.ts`
Zustand-стор по образцу `useThemeStore.ts`:
```ts
interface StudyState {
  // Серверное состояние
  studyModeEnabled: boolean;
  toggleStudyMode: () => Promise<void>;   // PATCH /profile/update + setState
  syncFromServer: (enabled: boolean) => void;

  // Локальные настройки (localStorage)
  focusTimerMinutes: number;              // default 25
  setFocusTimerMinutes: (m: number) => void;

  // Метки сетки стеллажа (localStorage)
  gridLabelsVisible: boolean;             // toggle для скрытия/показа
  toggleGridLabels: () => void;
  rowLabels: string[];                    // ["Горит сегодня", "На неделю", "Беклог", ...]
  colLabels: string[];                    // ["Матан", "Физика", "Языки", ...]
  setRowLabels: (labels: string[]) => void;
  setColLabels: (labels: string[]) => void;

  // Статусы ячеек (localStorage, Map<"row:col", CellStatus>)
  cellStatuses: Record<string, CellStatus>;
  setCellStatus: (row: number, col: number, status: CellStatus) => void;
  clearCellStatus: (row: number, col: number) => void;
}

type CellStatus = "urgent" | "this-week" | "backlog" | "done" | null;
```

Все localStorage-ключи: `stellage-study-*` (напр. `stellage-study-grid-labels`, `stellage-study-cell-statuses`).

#### [MODIFY] `frontend/src/pages/Settings/SettingsPage.tsx`
- Во вкладке «Интерфейс и Звуки» (`appearance`) добавить секцию **«Учебный режим»**:
  - Toggle-переключатель `studyModeEnabled` (отправляет PATCH на сервер).
  - Краткое описание: *«Включите, чтобы превратить Stellage в пространственную систему для учёбы. В вашем профиле появится индикатор Study Mode.»*
  - Настройка длительности Pomodoro по умолчанию (input number, 5–120 минут).
  - Toggle для видимости сетевых меток `gridLabelsVisible`.
  - Inline-редактор текстовых меток рядов и колонок (появляется только если `gridLabelsVisible = true`).

#### [MODIFY] `frontend/src/pages/Settings/SettingsPage.css`
- Стили `.settings-study-section`, `.settings-study-toggle`, `.settings-study-labels-editor`.

#### [MODIFY] `frontend/src/components/Layout/Header/Header.tsx`
- Если `studyModeEnabled`, в хедере рядом с логотипом показать компактный бейдж:
  - SVG-иконка выпускной шапочки + текст «Study» (стиль `.study-header-badge`).
  - Цвет: `--accent` (#4FA98E), фон: `rgba(var(--accent-rgb), 0.1)`.
  - Бейдж кликабелен → переход на `/study`.

---

## Модуль 2: Семестровая Сетка — Пространственные Метки & Статусы Ячеек

**Цель:** Когда Study Mode включён и `gridLabelsVisible = true`, стеллажная доска (`ShelfBoard`) показывает подписи рядов/колонок. Пользователь может кликнуть по пустой ячейке и назначить ей статус.

### Новые компоненты

#### [NEW] `frontend/src/components/Stellage/ShelfGridLabels.tsx`
Рендерит подписи рядов (слева) и колонок (сверху) внутри `shelf-board`.
- **Row labels** — абсолютно позиционированные элементы слева от первой колонки.
- **Col labels** — сверху доски.
- Стиль: Liquid Glass фон для каждой метки (`rgba(var(--chrome-rgb), 0.55)`, `backdrop-filter: blur(8px)`).
- При наведении на метку — мягкая подсветка ряда/колонки (`rgba(var(--accent-rgb), 0.04)`).
- Пропсы: `rowLabels: string[]`, `colLabels: string[]`, `rowCount`, `colCount`.

#### [NEW] `frontend/src/components/Stellage/ShelfGridLabels.css`
- `--font-body` (Inter), 10px, uppercase, `letter-spacing: 0.05em`.
- `--ink-tertiary` цвет.
- `position: absolute` (скроллится вместе с доской).
- Dark mode: автоматически через CSS-переменные.

#### [NEW] `frontend/src/components/Stellage/CellStatusPicker.tsx`
Маленький popup при клике на пустую ячейку в Study Mode:
- Отображает 4 варианта статуса: 🔴 Urgent, 🟡 This Week, 🔵 Backlog, ✅ Done.
- При выборе — вызывает `useStudyStore.setCellStatus(row, col, status)`.
- Ячейка на доске получает тонкую цветную окантовку/индикатор статуса.
- Popup позиционируется рядом с ячейкой (не в центре экрана).
- Закрытие: клик мимо или Escape.

#### [NEW] `frontend/src/components/Stellage/CellStatusPicker.css`
- Glass-panel стиль (`.glass-panel` из theme.css).
- Кнопки статусов: маленькие квадраты с цветным border, `--radius-sm`.
- Анимация: `opacity + scale` (200ms ease-out, Spotify Animation Rule).

### Модифицированные компоненты

#### [MODIFY] `frontend/src/components/Stellage/ShelfBoard.tsx`
- Новый опциональный проп: `studyLabels?: { rowLabels: string[]; colLabels: string[]; cellStatuses: Record<string, CellStatus> }`.
- Если проп передан:
  - Рендерить `<ShelfGridLabels />` внутри `.shelf-board`.
  - Увеличить `LEFT_PADDING` (~80px) для row-labels.
  - Пустые ячейки (без коробок) получают невидимый clickable элемент → при клике открывается `<CellStatusPicker />`.
  - Ячейки со статусом получают цветной dot/border по `data-cell-status` атрибуту.

#### [MODIFY] `frontend/src/components/Stellage/ShelfBoard.css`
- `.shelf-cell[data-cell-status="urgent"]` → `border-left: 3px solid #E54D4D` (мягкий красный).
- `.shelf-cell[data-cell-status="this-week"]` → `border-left: 3px solid #D4A843` (жёлтый).
- `.shelf-cell[data-cell-status="backlog"]` → `border-left: 3px solid #4A82D1` (синий).
- `.shelf-cell[data-cell-status="done"]` → `border-left: 3px solid var(--accent)` (teal).
- `.shelf-empty-cell-clickable` — `cursor: pointer; opacity: 0 → 0.4 on hover`.

#### [MODIFY] `frontend/src/components/Stellage/ShelfView.tsx`
- Читать `studyModeEnabled`, `gridLabelsVisible`, `rowLabels`, `colLabels`, `cellStatuses` из `useStudyStore`.
- Если всё включено — прокидывать `studyLabels` в `<ShelfBoard />`.

---

## Модуль 3: Study Tab в Коробке — STEM Pipeline + Language Capsule

**Цель:** Отдельная вкладка «Учёба» на странице просмотра коробки с тремя учебными виджетами.

### Модифицированные компоненты

#### [MODIFY] `frontend/src/pages/Box/BoxInstancePage.tsx`
- Если `studyModeEnabled`, добавить вкладку **«Учёба»** (иконка шапочки + текст) в навигационный ряд вкладок страницы.
- Во вкладке рендерить обновлённый `<StudyContainerSlot />`, передав `box` data.
- Внутри Study-вкладки: кнопка **«Начать фокус-сессию»** → `navigate(/study/focus/${box.id})`.

#### [MODIFY] `frontend/src/components/Stellage/StudyContainerSlot.tsx`
Рефакторинг существующего компонента (сейчас содержит хардкоженные демо-данные):
- Принимать расширенные пропсы: `box: Box` (полный объект коробки).
- **STEM-таб:**
  - Если среди ассетов коробки есть файлы `.py`, `.ipynb`, `.tex`, `.cpp` — показать их через `SmartContentInspector`.
  - Иначе — показать placeholder с объяснением («Добавьте код или формулы в ассеты коробки»).
- **Language-таб:**
  - Если в `content` коробки есть текстовые заметки — показать их в формате иммерсионной капсулы (большой шрифт оригинала + мелкий перевод).
  - Аудио-кнопка (placeholder: в будущем интеграция с TTS).
- **Pomodoro-таб:**
  - Рабочий таймер через хук `usePomodoroTimer`.
  - Кнопки: Start/Pause, Reset.
  - Сессии сохраняются в localStorage (`stellage-study-pomodoro-{boxId}`).

#### [MODIFY] `frontend/src/components/Stellage/StudyContainerSlot.css`
- Адаптировать стили под dark mode (сейчас хардкоженные светлые значения → CSS-переменные).
- `.study-container-card` в dark mode → Liquid Glass стиль.
- `.study-code-snippet` → адаптивный фон (dark: `#1e293b` уже ок, light: тоже тёмный для контраста).

### Новые файлы

#### [NEW] `frontend/src/hooks/usePomodoroTimer.ts`
```ts
interface PomodoroTimer {
  timeLeft: number;          // секунды
  isRunning: boolean;
  progress: number;          // 0..1
  start: () => void;
  pause: () => void;
  reset: () => void;
  setDuration: (minutes: number) => void;
}

export function usePomodoroTimer(boxId: string, defaultMinutes?: number): PomodoroTimer;
```
- `useEffect` с `setInterval(1000)` для обратного отсчёта.
- При достижении 0 — звуковой сигнал (если `stellage-sound-fx` !== `"disabled"`).
- Персистенция текущей сессии в localStorage по ключу `stellage-study-pomodoro-{boxId}`.
- Cleanup interval при размонтировании.

---

## Модуль 4: Focus Mode — Страница Иммерсивной Рабочей Сессии

**Цель:** Отдельный маршрут `/study/focus/:boxId` — полноэкранная рабочая среда для глубокого погружения в содержимое коробки. Пользователь может открыть несколько коробок в разных вкладках браузера.

### Новые файлы

#### [NEW] `frontend/src/pages/Study/FocusModePage.tsx`
Страница с тремя зонами:

```
┌──────────────────────────────────────────────────┐
│  GLASS TOPBAR                                    │
│  ← Назад    [Коробка: "Квантовая Оптика"]  25:00│
├──────────────────────────────────────────────────┤
│                                                  │
│              CONTENT ZONE                        │
│         (SmartContentInspector /                  │
│          AssetViewer / CodeSnippet)               │
│                                                  │
├──────────────────────────────────────────────────┤
│  NOTES PANEL                                     │
│  ┌────────────────────────────────────────────┐  │
│  │ Markdown заметки к этой коробке...         │  │
│  │ Автосохранение в localStorage              │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

- **Topbar (Glass Header):** Liquid Glass стиль (`.glass-header` из theme.css). Содержит:
  - Кнопка «← Назад» (возврат к предыдущей странице или `/my-stellage`).
  - Название коробки + бейдж редкости.
  - Pomodoro-таймер (через `usePomodoroTimer(boxId)`), крупный шрифт `var(--font-display)`, `tabular-nums`.
  - Кнопки Start/Pause/Reset таймера.
- **Content Zone:** Основное пространство для работы с контентом коробки.
  - Рендерит ассеты коробки через `SmartContentInspector`.
  - Если нет ассетов — текстовый контент из `box.content`.
  - Занимает всю доступную высоту (`flex: 1`).
- **Notes Panel:** Нижняя панель (resizable? или фиксированная высота ~200px).
  - `<textarea>` с Markdown-заметками.
  - Автосохранение в `localStorage` (`stellage-study-notes-{boxId}`) с debounce (500ms).
  - Фон: `var(--surface-elevated)`.
  - Placeholder: *«Заметки к этой коробке. Автосохранение каждые 500ms.»*

- **Анимация входа/выхода:** Critically damped spring (Apple Design: `damping: 1.0`, `response: 0.4`).
  - Вход: slide up + opacity.
  - `@media (prefers-reduced-motion: reduce)` → только `opacity: 200ms ease`.

- **Загрузка данных:** `useEffect` → `api.get("/boxes/get-box-instance", { params: { instance_id: boxId } })`.

#### [NEW] `frontend/src/pages/Study/FocusModePage.css`
- `.focus-page` — `min-height: 100dvh; display: flex; flex-direction: column; background: var(--ground)`.
- `.focus-topbar` — glass header паттерн, `position: sticky; top: 0`.
- `.focus-timer` — `font-family: var(--font-display); font-size: 32px; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: -0.02em`.
- `.focus-content` — `flex: 1; overflow-y: auto; padding: var(--space-5)`.
- `.focus-notes` — `background: var(--surface-elevated); border-top: 1px solid var(--border-subtle)`.
- `.focus-notes textarea` — `resize: vertical; min-height: 120px; font-family: var(--font-body); font-size: 14px`.

### Модифицированные файлы

#### [MODIFY] `frontend/src/App.tsx`
Добавить маршруты:
```tsx
// Внутри ProtectedRoute
<Route path="/study/focus/:boxId" element={<FocusModePage />} />
```
Примечание: Focus Mode Page рендерится **вне AppLayout** (без хедера), т.к. это иммерсивный режим с собственным topbar. Добавить как standalone маршрут рядом с `/login`.

---

## Модуль 5: Study Dashboard — Сводная Страница Учёбы

**Цель:** Агрегированный вид учебного прогресса на `/study`. Доступен только если Study Mode включён.

### Новые файлы

#### [NEW] `frontend/src/pages/Study/StudyDashboardPage.tsx`
Grid-layout страница с секциями:

1. **Hero-блок «Study Mode»:** Заголовок Manrope, краткая статистика (общее время фокуса, количество сессий, streak).
2. **Активные фокус-сессии:** Карточки коробок, по которым есть незавершённые Pomodoro-сессии в localStorage. Каждая карточка: wireframe-коробка + название + «Продолжить» → `/study/focus/:boxId`.
3. **Семестровая карта:** Миниатюрный вид стеллажа с Eisenhower-метками. Reuse `ShelfBoard` с маленькими размерами (`rowCount=3`, `colCount=4`) + `studyLabels`. Клик → `/my-stellage`.
4. **Быстрые действия:**
   - «Создать учебную коробку» → `/create-box`.
   - «Открыть стеллаж» → `/my-stellage`.
   - «Настройки Study Mode» → `/settings` (вкладка appearance).

#### [NEW] `frontend/src/pages/Study/StudyDashboardPage.css`
- `.study-dashboard` — `max-width: 1200px; margin: 0 auto; padding: var(--space-7) var(--space-5)`.
- `.study-dashboard-grid` — `display: grid; grid-template-columns: 2fr 1fr; gap: var(--space-5)`.
- `.study-stat-card` — `.glass-panel` стиль + accent glow: `box-shadow: 0 0 40px rgba(var(--accent-rgb), 0.08)`.
- `.study-session-card` — `var(--surface)` фон, `--radius-md`, hover: `var(--surface-hover)`.
- `.study-streak-badge` — мягкая пульсирующая анимация (`opacity: 0.85 → 1`, `2s ease-in-out infinite`).
  - `@media (prefers-reduced-motion: reduce)` → анимация отключена.

### Модифицированные файлы

#### [MODIFY] `frontend/src/App.tsx`
```tsx
// Внутри ProtectedRoute, внутри AppLayout
<Route path="/study" element={<StudyDashboardPage />} />
```

#### [MODIFY] `frontend/src/components/Layout/Header/Header.tsx`
- Если `studyModeEnabled` — добавить навигационную ссылку «Study» в хедер (между «Мой стеллаж» и «Инвентарь»).
- Ссылка ведёт на `/study`.

---

## Модуль 6 (Будущее): Учебные Полки — StudyShelf

> **Не входит в MVP.** Планируется после валидации модулей 1–5.

**Цель:** Учебные полки — **отдельные объекты** от обычных стеллажей. Не считаются в лимит 2 обычных полок.

### Backend

#### [NEW] `backend/src/stellage/database/models/study_shelf.py`
```python
class StudyShelf(IDMixin, TimestampMixin, Base):
    __tablename__ = "study_shelves"

    user_id: Mapped[uuid.UUID]                         # FK → users.id
    title: Mapped[str]                                  # "Французский C1"
    language_tag: Mapped[str | None]                     # "fr", "it", "de" (ISO 639-1)
    grid_rows: Mapped[int]                              # default 3
    grid_cols: Mapped[int]                              # default 4
    is_contrastive_pair_of: Mapped[uuid.UUID | None]    # FK → study_shelves.id (nullable)
    # Связь: если задан, эта полка — «парная» для контрастивного изучения языков
```

#### [NEW] `backend/src/stellage/apps/study_shelves/`
CRUD-эндпоинты:
- `POST /study-shelves/create` — создать учебную полку.
- `GET /study-shelves/my` — список учебных полок пользователя.
- `POST /study-shelves/pair` — связать две полки как контрастивную пару (FR ↔ IT).
- `DELETE /study-shelves/delete` — удалить учебную полку.

### Frontend
- Новый компонент `ContrastiveShelfView` — два `ShelfBoard` синхронизированных вертикально.
- Интеграция в Study Dashboard (секция «Языковые полки»).

---

## Визуальная Стратегия

Все новые компоненты следуют существующим дизайн-паттернам:

| Принцип | Источник Skill | Применение в Study Mode |
|---|---|---|
| **Liquid Glass** | `create-liquid-glass` | Focus topbar, grid labels, stat cards. Glass **только** на overlay/navigation, НЕ на контенте (Golden Rule). |
| **Spring Animations** | `apple-design` | Вход/выход Focus Mode — critically damped spring (`damping: 1.0`, `response: 0.4`). CellStatusPicker — `200ms ease-out`. `prefers-reduced-motion` → opacity fade. |
| **Dark Canvas** | `spotify-ui-skills` | Все компоненты работают в dark mode. Только CSS-переменные (`var(--ground)`, `var(--surface)`, `var(--ink)`), никаких хардкоженных цветов. |
| **Component Rules** | `component-rules` | Без inline styles. Без `translateY` lift-анимаций. Тихие hover-states. Радиусы из `--radius-*` токенов. Кнопки — `--radius-sm` (6px). |
| **Strict Visual Ban** | AGENTS.md | Нет glassmorphism на body content. Нет neon. Нет divider abuse — пространственное разделение через padding и фоновые оттенки. |

---

## Порядок Реализации

```
Модуль 1: Store + Toggle + Backend (study_mode_enabled)
    │
    ├──→ Модуль 2: Grid Labels + Cell Statuses (стеллаж)
    │
    ├──→ Модуль 3: Study Tab в коробке (STEM / Language / Pomodoro)
    │        │
    │        └──→ Модуль 4: Focus Mode Page (/study/focus/:boxId)
    │
    └──→ Модуль 5: Study Dashboard (/study)
              │
              └──→ [Будущее] Модуль 6: StudyShelf (отдельные учебные полки)
```

**Модуль 1** — обязательный фундамент.
**Модули 2, 3** — можно реализовывать параллельно.
**Модуль 4** — зависит от Модуля 3 (хук `usePomodoroTimer`).
**Модуль 5** — агрегирует данные из всех предыдущих модулей.
**Модуль 6** — отложен до валидации MVP.

---

## Верификация

### Автоматическая
```bash
# Backend: миграции + тесты
cd backend && poetry run python -m pytest tests

# Frontend: TypeScript-компиляция
cd frontend && npm run build

# Docker Health Check
docker exec stellage-backend alembic upgrade head
curl.exe -s http://localhost:8000/health
```

### Ручная
- **Toggle:** Settings → Appearance → Study Mode toggle → проверить PATCH-запрос и публичный профиль.
- **Grid Labels:** `/my-stellage` → метки видны, клик по ячейке → CellStatusPicker.
- **Study Tab:** `/box/instance/:id` → вкладка «Учёба» видна, три суб-таба работают.
- **Focus Mode:** `/study/focus/:boxId` → таймер, заметки, автосохранение.
- **Dashboard:** `/study` → статистика, карточки сессий, семестровая карта.
- **Dark/Light mode:** все компоненты корректны в обеих темах.
- **Reduced Motion:** `prefers-reduced-motion: reduce` → нет slide/spring анимаций.
- **Persistence:** включить Study Mode → перезагрузить → состояние сохранено (сервер + localStorage).
