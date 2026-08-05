import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "./store/useAuthStore";
import { api } from "./api/instance";
import "./App.css";

// Тихий keep-alive: продлеваем сессию заметно чаще, чем живёт access-токен
// (час), чтобы даже неактивная вкладка не выпадала. Ошибки глотаем — их
// разрулит 401-interceptor.
const KEEP_ALIVE_MS = 20 * 60 * 1000;

import { AppLayout } from "./components/Layout/AppLayout";
import { LoginPage } from "./pages/Auth/LoginPage";
import { RegisterPage } from "./pages/Auth/RegisterPage";
import { FeedPage } from "./pages/Feed/FeedPage";
import { SearchPage } from "./pages/Search/SearchPage";
import { MyStellagePage } from "./pages/Main/MainPage";
import { InventoryPage } from "./pages/Inventory/InventoryPage";
import { CreateBoxPage } from "./pages/CreateBox/CreateBoxPage";
import { ProfilePage } from "./pages/Profile/ProfilePage";
import { PublicProfilePage } from "./pages/Profile/PublicProfilePage";
import { SettingsPage } from "./pages/Settings/SettingsPage";
import { RegisterConfirmPage } from "./pages/Auth/RegisterConfirmPage";
import { BoxDetailPage } from "./pages/Box/BoxDetailPage";
import { BoxInstancePage } from "./pages/Box/BoxInstancePage";
import { EditBoxPage } from "./pages/Box/EditBoxPage";
import { MessagesPage } from "./pages/Messages/MessagesPage";
import { PublicShelfPage } from "./pages/Stellage/PublicShelfPage";
import { NotFoundPage } from "./pages/NotFound/NotFoundPage";
import { ProtectedRoute } from "./components/Auth/ProtectedRoute";
import { StudyDashboardPage } from "./pages/Study/StudyDashboardPage";
import { FocusModePage } from "./pages/Study/FocusModePage";

function App() {
  const { getUser, isInitialized, isAuthenticated } = useAuthStore();
  const location = useLocation();
  // «Добавить аккаунт»: вход доступен даже авторизованному (?add=1) — новый
  // аккаунт станет активным, текущий останется в реестре устройства.
  const addingAccount = new URLSearchParams(location.search).get("add") === "1";

  useEffect(() => {
    getUser();
  }, [getUser]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const id = setInterval(() => {
      api.post("/auth/refresh").catch(() => {});
    }, KEEP_ALIVE_MS);
    return () => clearInterval(id);
  }, [isAuthenticated]);

  if (!isInitialized) {
    return <div className="loader">Загрузка...</div>;
  }

  return (
    <Routes>
      {/* Standalone auth screens (no app shell) */}
      <Route
        path="/login"
        element={
          isAuthenticated && !addingAccount ? <Navigate to="/" replace /> : <LoginPage />
        }
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />}
      />
      <Route path="/auth/register_confirm" element={<RegisterConfirmPage />} />

      {/* Standalone Focus Mode screen (no main app layout) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/study/focus/:boxId" element={<FocusModePage />} />
      </Route>

      {/* App shell. Внутри — публичные страницы (лента, каталог, публичные
          профили/полки) и приватные под ProtectedRoute (инвентарь, создание,
          свой профиль/стеллаж, сообщения, настройки). */}
      <Route element={<AppLayout />}>
        {/* ── Публичные ── */}
        {/* Главная теперь и есть лента. */}
        <Route path="/" element={<FeedPage />} />
        <Route path="/feed" element={<Navigate to="/" replace />} />
        {/* Детальный просмотр экземпляра коробки (второй режим). Отдельно от
            каталожного /box/:id, который показывает шаблон из ленты. */}
        <Route path="/box/instance/:id" element={<BoxInstancePage />} />
        <Route path="/box/:id" element={<BoxDetailPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/stellage/:shelfId" element={<PublicShelfPage />} />
        <Route path="/u/:username" element={<PublicProfilePage />} />

        {/* ── Приватные (только для авторизованных) ── */}
        <Route element={<ProtectedRoute />}>
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/create-box" element={<CreateBoxPage />} />
          <Route path="/box/instance/:id/edit" element={<EditBoxPage />} />
          <Route path="/my-stellage" element={<MyStellagePage />} />
          <Route path="/study" element={<StudyDashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/messages/:username" element={<MessagesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* 404 внутри layout'а: шапка и навигация остаются на месте, чтобы с
            несуществующего адреса можно было уйти куда угодно, а не только
            назад. Раньше здесь был молчаливый <Navigate to="/">, из-за
            которого опечатка в адресе неотличима от сломанной навигации. */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
