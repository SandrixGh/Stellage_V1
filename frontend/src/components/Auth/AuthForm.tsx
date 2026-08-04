import type { AuthFormProps } from "../../types/Auth/AuthForm";
import { AuthInput } from "./AuthInput";
import "../../pages/Auth/Auth.css"

export const AuthForm = ({ onSubmit, usernameData, inviteCodeData, emailData, passwordData, buttonContent, isLoading }: AuthFormProps) => {
    return (
        <form onSubmit={onSubmit}>
            {inviteCodeData && <AuthInput {...inviteCodeData}/>}
            {usernameData && <AuthInput {...usernameData}/>}
            <AuthInput {...emailData}/>
            <AuthInput {...passwordData}/>
            <button type="submit" className="btn-primary" disabled={isLoading}>
                {isLoading && <span className="btn-spinner" />}
                {buttonContent}
            </button>
        </form>
    );
}
