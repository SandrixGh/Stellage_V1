import type { AuthInputProps } from "./AuthInput";

export interface AuthFormProps {
    onSubmit: (e: React.FormEvent) => Promise<void>;
    emailData: AuthInputProps
    passwordData: AuthInputProps
    buttonContent: string
}