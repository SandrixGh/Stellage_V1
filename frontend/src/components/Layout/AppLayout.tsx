import { Outlet } from "react-router-dom";
import { Header } from "./Header/Header";
import "./AppLayout.css";

export const AppLayout = () => {
    return (
        <div className="app-shell">
            <div className="app-orb app-orb-1" />
            <div className="app-orb app-orb-2" />
            <div className="app-orb app-orb-3" />

            <Header />

            <main className="app-content">
                <Outlet />
            </main>
        </div>
    );
};
