# Мобильная Адаптация Stellage Frontend

Полная адаптация всех страниц и компонентов под мобильные устройства (≤480px). Сейчас сайт практически не адаптирован — существуют лишь фрагментарные `@media` запросы на 720–900px, которые недостаточны для телефонов.

## Текущее Состояние

| Компонент | Мобильный breakpoint | Статус |
|-----------|---------------------|--------|
| Header (nav) | 720px — скрывает лого-текст | ❌ Навигация не влезает |
| AppLayout | Нет | ❌ Паддинги слишком большие |
| MainPage (gate) | 720px — column | ⚠️ Частично |
| ShelfView/Board | 900px — column | ❌ Шельф не скроллится |
| ProfilePage | 720px — column | ⚠️ Частично |
| MessagesPage | **Нет вообще** | ❌ Критично |
| SettingsPage | 768px — column | ⚠️ Частично |
| BoxDetail/Instance | 900px — column | ⚠️ Частично |
| CreateBoxPage | 840px — column | ⚠️ Частично |
| SearchPage | Нет | ⚠️ Почти ок |
| InventoryPage | Нет | ⚠️ Grid auto-fill |
| Модалки | Нет | ❌ Не адаптированы |

## Стратегия

Два основных breakpoint'а:
- `@media (max-width: 768px)` — планшеты и маленькие экраны
- `@media (max-width: 480px)` — телефоны

Подход: **CSS-only** — никаких изменений в TSX-компонентах, только добавление responsive `@media` запросов в существующие CSS файлы.

> [!IMPORTANT]
> **Header Navigation** — самая сложная часть. На телефоне центральная навигация `.header-nav` с pill-анимацией физически не вмещается. Решение: скрыть навигацию в шапке и добавить **фиксированный нижний таб-бар (bottom tab bar)** в мобильной версии. Это потребует минимального изменения в `Header.tsx` (обёртку навигации вынести в условный рендер) и добавления нового `MobileTabBar` компонента.

---

## Proposed Changes

### 1. Глобальные токены и AppLayout

#### [MODIFY] [theme.css](file:///c:/Users/user/PycharmProjects/Stellage_Project_V1/frontend/src/styles/theme.css)

Добавить CSS-переменные для мобильных отступов в `:root`:
```css
--mobile-padding: 16px;
--mobile-header-height: 56px;
--mobile-tab-bar-height: 56px;
```

#### [MODIFY] [AppLayout.css](file:///c:/Users/user/PycharmProjects/Stellage_Project_V1/frontend/src/components/Layout/AppLayout.css)

```css
@media (max-width: 768px) {
    .app-content {
        margin-top: 56px;       /* меньшая шапка */
        padding: 20px 16px 80px; /* +bottom padding для таб-бара */
    }
    .page-title { font-size: 24px; }
    .page-subtitle { font-size: 14px; margin-bottom: 20px; }
}
```

---

### 2. Header — Мобильная Навигация

#### [MODIFY] [Header.css](file:///c:/Users/user/PycharmProjects/Stellage_Project_V1/frontend/src/components/Layout/Header/Header.css)

Полная переработка шапки для мобильных:
```css
@media (max-width: 768px) {
    .header { height: 56px; padding: 0 16px; }
    .header-nav { display: none; }          /* скрыть центральную навигацию */
    .header-logo-title { display: none; }
    .stellacoin-badge { display: none; }    /* StellaCoin в AccountMenu */
    .user-email { display: none; }
    .study-header-badge span { display: none; } /* только иконка */
}
```

#### [NEW] [MobileTabBar.css](file:///c:/Users/user/PycharmProjects/Stellage_Project_V1/frontend/src/components/Layout/MobileTabBar.css)

Нижний таб-бар с 4–5 вкладками (Главная, Поиск, Инвентарь, Стеллаж, [Study]), появляющийся только на `≤768px`. Стилизация — glass panel с blur, как в шапке.

#### [NEW] [MobileTabBar.tsx](file:///c:/Users/user/PycharmProjects/Stellage_Project_V1/frontend/src/components/Layout/MobileTabBar.tsx)

Рендерит те же `NAV_ITEMS` что и Header, но в формате иконок с подписями в нижней панели. Скрыт на десктопе через CSS `display: none`.

#### [MODIFY] [AppLayout.tsx](file:///c:/Users/user/PycharmProjects/Stellage_Project_V1/frontend/src/components/Layout/AppLayout.tsx)

Добавить `<MobileTabBar />` после `<main>`:
```tsx
<div className="app-shell">
    <Header />
    <main className="app-content"><Outlet /></main>
    <MobileTabBar />
</div>
```

#### [MODIFY] [AccountMenu.css](file:///c:/Users/user/PycharmProjects/Stellage_Project_V1/frontend/src/components/Layout/Header/AccountMenu.css)

```css
@media (max-width: 768px) {
    .account-trigger-name { display: none; }
    .account-chevron { display: none; }
    .account-trigger { padding: 4px; }
    .account-dropdown { right: -8px; width: calc(100vw - 32px); max-width: 300px; }
}
```

---

### 3. MainPage — Адаптация Hero и Grid

#### [MODIFY] [MainPage.css](file:///c:/Users/user/PycharmProjects/Stellage_Project_V1/frontend/src/pages/Main/MainPage.css)

```css
@media (max-width: 480px) {
    .stellage-gate { gap: 24px; padding: 20px 0; }
    .stellage-gate-title { font-size: 28px; }
    .stellage-gate-sub { font-size: 14px; }
    .stellage-gate-visual svg { width: 140px; height: auto; }
    .boxes-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
    .shelf-info { flex-direction: column; gap: 10px; }
    .shelf-modal { padding: 24px 20px; }
    .shelf-rail { position: static; }
}
```

---

### 4. Shelf (Stellage) — Горизонтальная прокрутка

#### [MODIFY] [ShelfView.css](file:///c:/Users/user/PycharmProjects/Stellage_Project_V1/frontend/src/components/Stellage/ShelfView.css)

```css
@media (max-width: 480px) {
    .shelf-view { flex-direction: column; gap: 16px; }
    .shelf-view-rail { width: 100%; position: static; flex: none; }
    .shelf-view-board { overflow-x: auto; -webkit-overflow-scrolling: touch; }
}
```

#### [MODIFY] [ShelfBoard.css](file:///c:/Users/user/PycharmProjects/Stellage_Project_V1/frontend/src/components/Stellage/ShelfBoard.css)

```css
@media (max-width: 480px) {
    .shelf-board { min-width: 600px; } /* чтобы работал горизонтальный скролл */
    .shelf-box-name { font-size: 10px; }
    .shelf-box-label { padding: 2px 6px; }
}
```

#### [MODIFY] [ShelfSidebar.css](file:///c:/Users/user/PycharmProjects/Stellage_Project_V1/frontend/src/components/Stellage/ShelfSidebar.css)

```css
@media (max-width: 480px) {
    .shelf-toolbar-title { font-size: 20px; }
    .shelf-toolbar-row { gap: 8px; }
    .shelf-search-wrapper { min-width: 100%; }
}
```

---

### 5. Profile Page

#### [MODIFY] [ProfilePage.css](file:///c:/Users/user/PycharmProjects/Stellage_Project_V1/frontend/src/pages/Profile/ProfilePage.css)

```css
@media (max-width: 480px) {
    .profile-hero-banner { height: 140px; }
    .profile-hero-body { padding: 0 16px 14px; }
    .profile-hero-main-row { flex-direction: column; gap: 12px; }
    .profile-identity-right { align-items: flex-start; flex-direction: row; gap: 8px; }
    .profile-display-name { font-size: 20px; }
    .profile-tabs-bar { overflow-x: auto; gap: 4px; }
    .profile-tab-btn { white-space: nowrap; padding: 8px 12px; font-size: 12.5px; }
    .profile-actions { flex-wrap: wrap; }
}
```

---

### 6. Messages Page (Критично)

#### [MODIFY] [MessagesPage.css](file:///c:/Users/user/PycharmProjects/Stellage_Project_V1/frontend/src/pages/Messages/MessagesPage.css)

Telegram-стиль: на мобилке показываем или список диалогов, или чат, не оба:
```css
@media (max-width: 768px) {
    .msg-page { grid-template-columns: 1fr; }
    .msg-list { display: none; }
    .msg-page.show-list .msg-list { display: flex; }
    .msg-page.show-list .msg-chat { display: none; }
    .msg-chat-header { /* добавить кнопку "Назад" */ }
    .msg-page-container { height: calc(100dvh - 56px - 56px); margin: 0; }
}
```

> [!WARNING]
> Для Messages потребуется минимальное изменение в `MessagesPage.tsx` — добавить CSS-класс `show-list` / `show-chat` переключаемый стейтом, и кнопку «Назад» в шапке чата. Это единственная страница, которая **не может** быть адаптирована чисто через CSS.

---

### 7. Settings Page

#### [MODIFY] [SettingsPage.css](file:///c:/Users/user/PycharmProjects/Stellage_Project_V1/frontend/src/pages/Settings/SettingsPage.css)

```css
@media (max-width: 480px) {
    .settings-page { padding: 16px 12px 60px; }
    .settings-card { padding: 18px 16px; }
    .settings-avatar-section { flex-direction: column; align-items: center; text-align: center; }
    .settings-field-box { flex-direction: column; align-items: flex-start; gap: 8px; }
    .settings-modal-card { padding: 20px 16px; max-width: 100%; }
}
```

---

### 8. Box Detail & Instance Pages

#### [MODIFY] [BoxDetailPage.css](file:///c:/Users/user/PycharmProjects/Stellage_Project_V1/frontend/src/pages/Box/BoxDetailPage.css)

```css
@media (max-width: 480px) {
    .box-detail-page { padding: 16px 12px 48px; }
    .box-detail-main-title { font-size: 22px; }
    .box-detail-nav-tabs { overflow-x: auto; flex-wrap: nowrap; }
    .box-detail-nav-tab { flex: 0 0 auto; }
    .box-detail-tab-content { padding: 16px; }
}
```

#### [MODIFY] [BoxInstancePage.css](file:///c:/Users/user/PycharmProjects/Stellage_Project_V1/frontend/src/pages/Box/BoxInstancePage.css)

Аналогичные breakpoints для padding, заголовков и вкладок.

---

### 9. Модалки — Полноэкранные на Мобилке

#### [MODIFY] [BoxDetailModal.css](file:///c:/Users/user/PycharmProjects/Stellage_Project_V1/frontend/src/pages/Box/BoxDetailModal.css)

```css
@media (max-width: 480px) {
    .box-modal-overlay { padding: 0; align-items: flex-end; }
    .box-modal {
        max-width: 100%; max-height: 95vh; border-radius: 16px 16px 0 0;
        padding: 20px 16px;
    }
}
```

#### [MODIFY] [BuyBoxModal.css](file:///c:/Users/user/PycharmProjects/Stellage_Project_V1/frontend/src/components/Stellage/BuyBoxModal.css)
#### [MODIFY] [InventoryPickerModal.css](file:///c:/Users/user/PycharmProjects/Stellage_Project_V1/frontend/src/components/Stellage/InventoryPickerModal.css)

Все модалки: bottom-sheet паттерн на ≤480px (скруглённые углы только сверху, `align-items: flex-end`, полная ширина).

---

### 10. Inventory & Search Pages

#### [MODIFY] [InventoryPage.css](file:///c:/Users/user/PycharmProjects/Stellage_Project_V1/frontend/src/pages/Inventory/InventoryPage.css)

```css
@media (max-width: 480px) {
    .inventory-page { padding: 16px 12px 72px; gap: 20px; }
    .inventory-title { font-size: 24px; }
    .inventory-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
}
```

#### [MODIFY] [SearchPage.css](file:///c:/Users/user/PycharmProjects/Stellage_Project_V1/frontend/src/pages/Search/SearchPage.css)

```css
@media (max-width: 480px) {
    .search-page .page-title { font-size: 28px; }
    .search-input { padding: 12px 16px 12px 46px; font-size: 14px; }
    .search-result-item { padding: 12px; gap: 12px; }
}
```

---

### 11. CreateBox Page

#### [MODIFY] [CreateBoxPage.css](file:///c:/Users/user/PycharmProjects/Stellage_Project_V1/frontend/src/pages/CreateBox/CreateBoxPage.css)

```css
@media (max-width: 480px) {
    .create-box-page { padding: 16px 12px 64px; }
    .create-box-title { font-size: 22px; }
    .create-box-form { padding: 20px 16px; }
    .create-box-preview-side { position: static; }
}
```

---

### 12. Компоненты (BoxCard, TemplateCard, BoxFilterBar)

#### [MODIFY] [BoxCard.css](file:///c:/Users/user/PycharmProjects/Stellage_Project_V1/frontend/src/components/Stellage/BoxCard.css)
#### [MODIFY] [TemplateCard.css](file:///c:/Users/user/PycharmProjects/Stellage_Project_V1/frontend/src/components/Stellage/TemplateCard.css)
#### [MODIFY] [BoxFilterBar.css](file:///c:/Users/user/PycharmProjects/Stellage_Project_V1/frontend/src/components/Stellage/BoxFilterBar.css)

Уменьшить padding и шрифты на ≤480px; сделать фильтр-бар скроллящимся горизонтально.

---

## Файлы, Требующие TSX-изменений

Только **3 файла**:

| Файл | Изменение |
|------|-----------|
| [AppLayout.tsx](file:///c:/Users/user/PycharmProjects/Stellage_Project_V1/frontend/src/components/Layout/AppLayout.tsx) | Добавить `<MobileTabBar />` |
| [MobileTabBar.tsx](file:///c:/Users/user/PycharmProjects/Stellage_Project_V1/frontend/src/components/Layout/MobileTabBar.tsx) | **[NEW]** Нижний таб-бар |
| [MessagesPage.tsx](file:///c:/Users/user/PycharmProjects/Stellage_Project_V1/frontend/src/pages/Messages/MessagesPage.tsx) | Добавить CSS-класс для переключения список/чат |

---

## Verification Plan

### Automated Tests
```bash
cd frontend && npm run build
```

### Manual Verification
- Chrome DevTools → Toggle Device Toolbar → iPhone 14 Pro (393×852)
- Проверить все страницы: Auth, Main, Search, Inventory, My Stellage, Profile, Settings, Messages, Box Detail, Create Box
- Убедиться что нижний таб-бар работает с навигацией
- Проверить модалки — bottom-sheet поведение
- Проверить горизонтальный скролл стеллажа
