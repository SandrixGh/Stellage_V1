import type { AuthInputProps } from "../../types/Auth/AuthInput"
import "../../pages/Auth.css"

export const AuthInput = ({ field, setField, label, type }: AuthInputProps) => {
    return (
        <div className="form-group">
            <label>{label}</label>
            <input
                type={type}
                value={field}
                onChange={(e) => setField(e.target.value)}
                required
            />
        </div>
    )
}