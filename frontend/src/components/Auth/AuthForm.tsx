import type { AuthFormProps } from "../../types/Auth/AuthForm";
import { AuthInput } from "./AuthInput";
import "../../pages/Auth/Auth.css"

export const AuthForm = ({onSubmit, emailData, passwordData, buttonContent}: AuthFormProps) => {
    return (
        <form onSubmit={onSubmit}>
            <AuthInput {...emailData}/>
            <AuthInput {...passwordData}/>
            <button className="btn-primary">{buttonContent}</button>
        </form>
    );
}