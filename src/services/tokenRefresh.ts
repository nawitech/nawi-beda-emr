import {
    axiosInstance,
    resetInstanceToken,
    setInstanceToken,
    setRefreshToken,
    setToken,
} from '@beda.software/emr/services';
import config from '@beda.software/emr-config';

import { doLogout } from 'src/services/auth';

let isLoggingOut = false;

interface TokenResponse {
    access_token: string;
    refresh_token?: string;
}

async function fetchNewToken(refreshToken: string, tokenPath: string, clientId: string): Promise<TokenResponse | null> {
    try {
        const response = await fetch(`${config.baseURL}/${tokenPath}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                client_id: clientId,
            }),
        });

        return response.ok ? response.json() : null;
    } catch {
        return null;
    }
}

async function refreshAccessToken(): Promise<string | null> {
    const refreshToken = localStorage.getItem('refresh_token');
    const tokenPath = config.authTokenPath;
    const clientId = config.clientId;

    if (!refreshToken || !tokenPath || !clientId) {
        return null;
    }

    const data = await fetchNewToken(refreshToken, tokenPath, String(clientId));
    if (!data) return null;

    setToken(data.access_token);
    if (data.refresh_token) {
        setRefreshToken(data.refresh_token);
    }
    return data.access_token;
}

export function setupTokenRefreshInterceptor() {
    axiosInstance.interceptors.response.use(
        (response) => response,
        async (error) => {
            const originalRequest = error.config;
            if (error.response?.status === 401 && !originalRequest._retry) {
                originalRequest._retry = true;
                const newToken = await refreshAccessToken();
                if (newToken) {
                    setInstanceToken({ access_token: newToken, token_type: 'Bearer' });
                    originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                    return axiosInstance(originalRequest);
                }
                if (!isLoggingOut) {
                    isLoggingOut = true;
                    resetInstanceToken();
                    doLogout();
                }
            }
            return Promise.reject(error);
        },
    );
}
