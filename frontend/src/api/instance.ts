import axios from "axios";

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api.v1',

    withCredentials: true,

    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Clear any cached auth state and redirect to login
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);