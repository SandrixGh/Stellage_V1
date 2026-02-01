import { useEffect, useState } from "react";
import { useAuthStore } from "./store/useAuthStore";
import { LoginPage } from "./pages/Auth/LoginPage";
import "./App.css";
import { RegisterPage } from "./pages/Auth/RegisterPage";
import { MainPage } from "./pages/Main/MainPage";

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
    <div>
      <MainPage />
    </div>
  );
}

export default App;