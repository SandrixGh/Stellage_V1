import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/useAuthStore";
import "./App.css";

import { AppLayout } from "./components/Layout/AppLayout";
import { LoginPage } from "./pages/Auth/LoginPage";
import { RegisterPage } from "./pages/Auth/RegisterPage";
import { HomePage } from "./pages/Home/HomePage";
import { FeedPage } from "./pages/Feed/FeedPage";
import { SearchPage } from "./pages/Search/SearchPage";
import { MyStellagePage } from "./pages/Main/MainPage";
import { ProfilePage } from "./pages/Profile/ProfilePage";
import { RegisterConfirmPage } from "./pages/Auth/RegisterConfirmPage";
import { BoxDetailPage } from "./pages/Box/BoxDetailPage";
import { PublicShelfPage } from "./pages/Stellage/PublicShelfPage";

function App() {
  const { getUser, isInitialized, isAuthenticated } = useAuthStore();

  useEffect(() => {
    getUser();
  }, [getUser]);

  if (!isInitialized) {
    return <div className="loader">Загрузка...</div>;
  }

  return (
    <Routes>
      {/* Standalone auth screens (no app shell) */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />}
      />
      <Route path="/auth/register_confirm" element={<RegisterConfirmPage />} />

      {/* App shell — publicly accessible */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/box/:id" element={<BoxDetailPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/my-stellage" element={<MyStellagePage />} />
        <Route path="/stellage/:shelfId" element={<PublicShelfPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
