import { apiGet, apiPatch } from "./apiClient";

/**
 * Service to handle notifications.
 */

export const getNotifications = async (params = {}) => {
    try {
        const query = new URLSearchParams(params).toString();
        return await apiGet(`/notifications/?${query}`);
    } catch (error) {
        console.error("Fetch Notifications API failed:", error);
        throw error;
    }
};

export const getUnreadCount = async () => {
    try {
        return await apiGet("/notifications/unread-count");
    } catch (error) {
        console.error("Fetch Unread Count API failed:", error);
        throw error;
    }
};

export const markAsRead = async (notificationId) => {
    try {
        return await apiPatch(`/notifications/${notificationId}/read`, {});
    } catch (error) {
        console.error("Mark Notification as Read API failed:", error);
        throw error;
    }
};

export const markAllAsRead = async () => {
    try {
        return await apiPatch("/notifications/read-all", {});
    } catch (error) {
        console.error("Mark All Notifications as Read API failed:", error);
        throw error;
    }
};

/** Allowlisted in-app navigation targets for server-provided notification links. */
const ALLOWED_NOTIFICATION_PREFIXES = [
    '/admin', '/hr', '/manager', '/user', '/end-user', '/dashboard',
    '/notifications', '/my-jds', '/job-descriptions', '/assigned-jds',
    '/published', '/settings', '/analytics', '/templates', '/workflows',
    '/team', '/candidates', '/applications', '/sign-off', '/csod',
    '/manual-jd', '/generate-jd', '/jd-review', '/terms',
];

/** Returns a safe in-app path or null if the link must not be followed. */
export const getSafeNotificationPath = (link) => {
    if (!link || typeof link !== 'string') return null;

    const trimmed = link.trim();
    if (!trimmed) return null;
    if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) || trimmed.startsWith('//')) {
        return null;
    }

    const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    const normalized = path.split('?')[0].split('#')[0];

    const allowed = ALLOWED_NOTIFICATION_PREFIXES.some(
        (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`)
    );
    return allowed ? path : null;
};
