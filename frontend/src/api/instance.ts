import axios from "axios";

export const api = axios.create({
    // In dev, default to a same-origin relative path handled by the Vite proxy
    // (keeps the session cookie first-party). In prod, set VITE_API_URL.
    baseURL: import.meta.env.VITE_API_URL ?? '/api.v1',

    withCredentials: true,

    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(error)
);