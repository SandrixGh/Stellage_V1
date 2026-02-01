import type { AuthInputProps } from "../../types/Auth/AuthInput"
import "../../pages/Auth/Auth.css"
import { useState } from "react";

export const AuthInput = ({ field, setField, label, type }: AuthInputProps) => {
    const [showPassword, setShowPassword] = useState(false);

    const isPasswordField = type === "password";
    const currentType = isPasswordField && showPassword ? "text" : type;

    return (
        <div className="form-group">
            <label>{label}</label>
            <div className="input-wrapper">
                <input
                    type={currentType}
                    value={field}
                    onChange={(e) => setField(e.target.value)}
                    required
                />
                {type === "password" && (
                    <button
                        type="button"
                        className={`password-toggle ${showPassword ? "active" : ""}`}
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                    >
                        {showPassword ? "✓" : "○"}
                    </button>
                )}
            </div>
        </div>
    )
}