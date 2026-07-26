import { Link, useLocation } from "react-router-dom";
import { WireframeBox } from "../../components/Stellage/WireframeBox";
import "./NotFoundPage.css";

/**
 * Страница 404. До неё маршрут `*` вёл молчаливый <Navigate to="/">: опечатка
 * в адресе или мёртвая ссылка выглядели как «нас зачем-то бросило в ленту»,
 * и отличить несуществующий адрес от сломанной навигации было невозможно.
 */
export const NotFoundPage = () => {
    const location = useLocation();

    return (
        <div className="notfound-page">
            <div className="notfound-visual" aria-hidden="true">
                <WireframeBox size={132} />
            </div>

            <h1 className="page-title">Такой коробки нет</h1>
            <p className="page-subtitle">
                Адрес <code className="notfound-path">{location.pathname}</code> не
                существует или страницу удалили.
            </p>

            <div className="notfound-actions">
                <Link to="/" className="notfound-action notfound-action-primary">
                    На главную
                </Link>
                <Link to="/my-stellage" className="notfound-action">
                    Мой стеллаж
                </Link>
            </div>
        </div>
    );
};
