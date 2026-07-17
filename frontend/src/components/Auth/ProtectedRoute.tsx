import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";

/**
 * Централизованный барьер приватных роутов: неавторизованного зрителя
 * отправляет на /login, запомнив, куда он шёл (state.from), чтобы вернуть после
 * входа. Раньше защита делалась вручную в каждой странице — любую новую
 * приватную страницу легко было забыть закрыть.
 *
 * Рендерится только после инициализации auth (App держит лоадер до isInitialized),
 * поэтому isAuthenticated здесь уже достоверен, без ложного редиректа на старте.
 */
export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
