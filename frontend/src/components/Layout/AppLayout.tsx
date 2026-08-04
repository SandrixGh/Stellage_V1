import { Outlet } from "react-router-dom";
import { Header } from "./Header/Header";
import { MobileTabBar } from "./MobileTabBar";
import "./AppLayout.css";

export const AppLayout = () => {
    return (
        <div className="app-shell">
            <Header />

            <main className="app-content">
                <Outlet />
            </main>

            <MobileTabBar />
        </div>
    );
};

