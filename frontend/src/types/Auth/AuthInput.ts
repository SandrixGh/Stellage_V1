export interface AuthInputProps {
    field: string;
    setField: (value: string) => void;
    type: "email" | "password" | "text";
    label: string;
    placeholder?: string;
}