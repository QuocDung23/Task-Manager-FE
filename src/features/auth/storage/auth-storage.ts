import { AUTH_TOKEN_KEY } from "../constans"

export const authStorage = {
    setToken(token: string) {
        localStorage.setItem(AUTH_TOKEN_KEY, token)
    },
    getToken() {
        return localStorage.getItem(AUTH_TOKEN_KEY)
    },
    clearToken() {
        localStorage.removeItem(AUTH_TOKEN_KEY)
    },
}