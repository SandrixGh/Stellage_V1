import type { AuthInputProps } from "./AuthInput";

export interface AuthFormProps {
    onSubmit: (e: React.FormEvent) => Promise<void>;
    usernameData?: AuthInputProps
    emailData: AuthInputProps
    passwordData: AuthInputProps
    buttonContent: string
    isLoading?: boolean
}