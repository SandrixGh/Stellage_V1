import { Header } from "../../components/Layout/Header/Header";
import "./MainPage.css";

export const MainPage = () => {
    return (
        <div className="main-page">
            <Header />
            <main className="main-content">
                {/* Здесь будет остальной контент */}
            </main>
        </div>
    )
}