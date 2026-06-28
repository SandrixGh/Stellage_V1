import type { AuthInputProps } from "../../types/Auth/AuthInput"
import "../../pages/Auth/Auth.css"
import { useState } from "react";

export const AuthInput = ({ field, setField, label, type }: AuthInputProps) => {
    const [showPassword, setShowPassword] = useState(false);

    const isPasswordField = type === "password";
    const currentType = isPasswordField && showPassword ? "text" : type;

    return (
        <div className="form-group">
            <div className="input-wrapper">
                <input
                    type={currentType}
                    value={field}
                    onChange={(e) => setField(e.target.value)}
                    required
                    spellCheck={false}
                    placeholder=" "
                />
                <label>{label}</label>
                {isPasswordField && (
                    <button
                        type="button"
                        className={`password-toggle ${showPassword ? "active" : ""}`}
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                        aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            {showPassword ? (
                                <>
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                    <line x1="1" y1="1" x2="23" y2="23" />
                                </>
                            ) : (
                                <>
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                    <circle cx="12" cy="12" r="3" />
                                </>
                            )}
                        </svg>
                    </button>
                )}
            </div>
        </div>
    )
}
