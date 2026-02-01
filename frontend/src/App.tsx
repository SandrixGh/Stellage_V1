import { useEffect, useState } from "react";
import { useAuthStore } from "./store/useAuthStore";
import { LoginPage } from "./pages/LoginPage";
import "./App.css";
import { RegisterPage } from "./pages/RegisterPage";

function App() {
  const { checkAuth, isInitialized, isAuthenticated, user, logout } = useAuthStore();

  const [isLoginView, setIsLoginView] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  if (!isInitialized) {
    return (
      <div className="loader">
        Загрузка...
      </div>
    );
  }

  if (!isAuthenticated) {
    return isLoginView
      ? <LoginPage onSwitch={() => setIsLoginView(false)}/>
      : <RegisterPage onSwitch={() => setIsLoginView(true)}/>
  }

  return (
    <div className="container">
      <div className="card">
        <h1>Личный кабинет</h1>
        <p className="user-info">
          Вы вошли как: 
          <strong>{user?.email}</strong>
        </p>
        <button
          onClick={logout}
          className="btn-logout"
        >
          Выйти из системы
        </button>
      </div>
    </div>
  );
}

export default App;