/**
 * Central API Client to handle requests across the application.
 * Auth tokens live in httpOnly cookies; CSRF uses double-submit cookies.
 */

import { getDashboardPathForRole } from '../utils/roles';

export const BASE_URL = import.meta.env.VITE_API_URL
  || (import.meta.env.DEV ? '/backend' : 'http://127.0.0.1:8002');

const ACCESS_TOKEN_KEY = 'jdforge_access_token';

export const setAccessToken = (token) => {
    if (token) {
        sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
        sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    }
};

export const getAccessToken = () => sessionStorage.getItem(ACCESS_TOKEN_KEY);

export const clearAccessToken = () => sessionStorage.removeItem(ACCESS_TOKEN_KEY);

function readCookie(name) {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
}

const getHeaders = (isFormData = false) => {
    const headers = {};
    if (!isFormData) {
        headers["Content-Type"] = "application/json";
    }
    const accessToken = getAccessToken();
    if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
    }
    const csrfToken = readCookie('csrf_token');
    if (csrfToken) {
        headers["X-CSRF-Token"] = csrfToken;
    }
    return headers;
};

const fetchWithAuth = (url, options = {}) => fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
        ...getHeaders(options.body instanceof FormData),
        ...(options.headers || {}),
    },
});

// Error Parsing Helper
const handleResponse = async (response) => {
    const contentType = response.headers.get("content-type");
    let data = null;

    if (contentType && contentType.includes("application/json")) {
        try {
            data = await response.json();
        } catch (e) {
            console.error("[API Client] Failed to parse JSON even though Content-Type was application/json", e);
            data = null;
        }
    }

    if (!response.ok) {
        if (response.status === 401) {
            const errorMessage = (data?.detail || data?.message || "").toLowerCase();
            if (errorMessage.includes("expired") || errorMessage.includes("log in again") || errorMessage.includes("not authenticated")) {
                console.warn("[API Client] Session expired. Clearing session.");
                sessionStorage.removeItem("jdforge_session");
                clearAccessToken();

                if (!window.location.pathname.includes("/login")) {
                    window.location.href = "/login?expired=true";
                }
            }
        }

        if (response.status === 403) {
            const errorMessage = String(data?.detail || data?.message || "").toLowerCase();
            if (
                errorMessage.includes("super admin access required") &&
                response.url.includes("/super-admin/") &&
                !window.location.pathname.includes("/login")
            ) {
                window.location.href = "/login";
            }
        }

        if (contentType && contentType.includes("text/html")) {
            const error = new Error(`Server returned HTML (likely 404 or 500) instead of JSON. Status: ${response.status}`);
            error.status = response.status;
            throw error;
        }

        let errorMessage = data?.message || data?.detail || data?.error;
        if (typeof errorMessage === "object") {
            errorMessage = JSON.stringify(errorMessage);
        }

        const error = new Error(errorMessage || `API Error: ${response.status} ${response.statusText}`);
        error.status = response.status;
        error.data = data;
        console.error(`[API Error ${response.status}] ${response.url}:`, data);
        throw error;
    }

    return data;
};

const apiCache = new Map();
const CACHE_TTL_MS = 5000;

export const clearApiCache = () => {
    apiCache.clear();
};

export const apiGet = async (endpoint, bypassCache = false) => {
    const cacheKey = endpoint;
    const now = Date.now();

    if (!bypassCache) {
        const cachedItem = apiCache.get(cacheKey);
        if (cachedItem && (now - cachedItem.timestamp < CACHE_TTL_MS)) {
            return JSON.parse(JSON.stringify(cachedItem.data));
        }
    }

    const response = await fetchWithAuth(`${BASE_URL}${endpoint}`, { method: "GET" });
    const data = await handleResponse(response);

    if (!bypassCache) {
        apiCache.set(cacheKey, {
            data: JSON.parse(JSON.stringify(data)),
            timestamp: now
        });
    }

    return data;
};

export const apiPost = async (endpoint, payload) => {
    clearApiCache();
    const isFormData = payload instanceof FormData;
    const response = await fetchWithAuth(`${BASE_URL}${endpoint}`, {
        method: "POST",
        body: isFormData ? payload : JSON.stringify(payload),
    });
    return handleResponse(response);
};

export const apiPatch = async (endpoint, payload) => {
    clearApiCache();
    const isFormData = payload instanceof FormData;
    const response = await fetchWithAuth(`${BASE_URL}${endpoint}`, {
        method: "PATCH",
        body: isFormData ? payload : JSON.stringify(payload),
    });
    return handleResponse(response);
};

export const apiPut = async (endpoint, payload) => {
    clearApiCache();
    const isFormData = payload instanceof FormData;
    const response = await fetchWithAuth(`${BASE_URL}${endpoint}`, {
        method: "PUT",
        body: isFormData ? payload : JSON.stringify(payload),
    });
    return handleResponse(response);
};

export const apiDelete = async (endpoint) => {
    clearApiCache();
    const response = await fetchWithAuth(`${BASE_URL}${endpoint}`, { method: "DELETE" });
    return handleResponse(response);
};

export const apiDownload = async (endpoint, filename) => {
    const response = await fetchWithAuth(`${BASE_URL}${endpoint}`, { method: "GET" });
    if (!response.ok) {
        throw new Error(`Failed to download: ${response.statusText}`);
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "download";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
};

/** WebSocket base URL (same-origin in dev via Vite proxy). */
export const WS_BASE_URL = (() => {
    if (/^https?:\/\//.test(BASE_URL)) {
        return BASE_URL.replace(/^http/, 'ws');
    }
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${window.location.host}${BASE_URL}`;
})();
