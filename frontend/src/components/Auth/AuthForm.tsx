import type { AuthFormProps } from "../../types/Auth/AuthForm";
import { AuthInput } from "./AuthInput";
import "../../pages/Auth/Auth.css"

export const AuthForm = ({ onSubmit, emailData, passwordData, buttonContent, isLoading }: AuthFormProps) => {
    return (
        <form onSubmit={onSubmit}>
            <AuthInput {...emailData}/>
            <AuthInput {...passwordData}/>
            <button className="btn-primary" disabled={isLoading}>
                {isLoading && <span className="btn-spinner" />}
                {buttonContent}
            </button>
        </form>
    );
}
