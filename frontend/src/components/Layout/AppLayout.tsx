import { Outlet } from "react-router-dom";
import { Header } from "./Header/Header";
import "./AppLayout.css";

export const AppLayout = () => {
    return (
        <div className="app-shell">
            <Header />

            <main className="app-content">
                <Outlet />
            </main>
        </div>
    );
};
