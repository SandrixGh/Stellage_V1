import { useState } from "react";
import { useAuthStore } from "../../../store/useAuthStore";
import type { UserModalProps } from "../../../types/Header/UserModal";
import "./UserModal.css"

export const UserModal = ({ onClose }: UserModalProps) => {
    const { user, logout, delete_account } = useAuthStore();

    const [isClosing, setIsClosing] = useState(false);

    const handleChangeEmail = () => console.log("Запрос на замену email");
    const handleChangePassword = () => console.log("Запрос на замену password");

    const handleDeleteAccount = () => {
        if (window.confirm("Вы уверены? Это действие необратимо!")) {
            delete_account();
        }
    };

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 200);
    }

    return (
        <div
            className="user-modal-overlay"
            onClick={handleClose}
        >
            <div
                className={`user-modal-content ${isClosing ? 'slide-out' : ""}`}
                onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Профиль пользователя</h3>
                    <button className="close-modal" onClick={handleClose}>&times;</button>
                </div>

                <div className="user-info-section">
                    <p><strong>Email:</strong> {user?.email}</p>
                    <p><strong>ID:</strong> {user?.id || "N/A"}</p>
                </div>

                <div className="modal-actions">
                    <button onClick={handleChangeEmail} className="modal-btn">Сменить почту</button>
                    <button onClick={handleChangePassword} className="modal-btn">Сменить пароль</button>
                    <hr />
                    <button onClick={logout} className="modal-btn logout-btn">Выйти из аккаунта</button>
                    <button onClick={handleDeleteAccount} className="modal-btn delete-btn">Удалить аккаунт</button>
                </div>
            </div>
        </div>
    )
}