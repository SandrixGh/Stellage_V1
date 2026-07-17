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
import { MessagesPage } from "./pages/Messages/MessagesPage";
import { PublicShelfPage } from "./pages/Stellage/PublicShelfPage";

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

      {/* App shell — publicly accessible */}
      <Route element={<AppLayout />}>
        {/* Главная теперь и есть лента. */}
        <Route path="/" element={<FeedPage />} />
        <Route path="/feed" element={<Navigate to="/" replace />} />
        {/* Детальный просмотр экземпляра коробки (второй режим). Отдельно от
            каталожного /box/:id, который показывает шаблон из ленты. */}
        <Route path="/box/instance/:id" element={<BoxInstancePage />} />
        <Route path="/box/:id" element={<BoxDetailPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/create-box" element={<CreateBoxPage />} />
        <Route path="/my-stellage" element={<MyStellagePage />} />
        <Route path="/stellage/:shelfId" element={<PublicShelfPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/messages/:username" element={<MessagesPage />} />
        <Route path="/u/:username" element={<PublicProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
