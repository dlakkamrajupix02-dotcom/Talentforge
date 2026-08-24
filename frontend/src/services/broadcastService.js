import { apiGet } from './apiClient';

const DISMISSED_KEY = 'jdforge_dismissed_broadcasts';

const getUserBroadcastKey = (user) => {
  if (!user) return null;
  return String(user.id || user.email || '').toLowerCase();
};

export const getDismissedBroadcastIds = (user) => {
  const userKey = getUserBroadcastKey(user);
  if (!userKey) return [];
  try {
    const stored = JSON.parse(localStorage.getItem(DISMISSED_KEY) || '{}');
    return Array.isArray(stored[userKey]) ? stored[userKey] : [];
  } catch {
    return [];
  }
};

export const dismissBroadcast = (user, broadcastId) => {
  const userKey = getUserBroadcastKey(user);
  if (!userKey || !broadcastId) return;
  try {
    const stored = JSON.parse(localStorage.getItem(DISMISSED_KEY) || '{}');
    const existing = Array.isArray(stored[userKey]) ? stored[userKey] : [];
    if (!existing.includes(broadcastId)) {
      stored[userKey] = [...existing, broadcastId];
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(stored));
    }
  } catch {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify({ [userKey]: [broadcastId] }));
  }
};

export const getActiveBroadcasts = async () => {
  return await apiGet('/super-admin/broadcasts/active');
};

export const filterUnseenBroadcasts = (broadcasts, user) => {
  const dismissed = new Set(getDismissedBroadcastIds(user));
  return (broadcasts || []).filter((b) => b?.id && !dismissed.has(b.id));
};

/** @returns {Date|null} */
export const getBroadcastEffectiveExpiry = (expiresAt) => {
  if (!expiresAt) return null;
  const d = new Date(expiresAt);
  return isNaN(d.getTime()) ? null : d;
};

export const isBroadcastLive = (broadcast, now = new Date()) => {
  if (!broadcast?.is_active) return false;
  if (!broadcast.expires_at) return true;
  const d = new Date(broadcast.expires_at);
  return isNaN(d.getTime()) ? false : d > now;
};

export const getBroadcastStatus = (broadcast, now = new Date()) => {
  if (!broadcast?.is_active) {
    return { label: 'Inactive', tone: 'slate' };
  }
  if (!isBroadcastLive(broadcast, now)) {
    return { label: 'Expired', tone: 'amber' };
  }
  return { label: 'Active', tone: 'emerald' };
};

/** Convert local datetime-local value to exact ISO string in UTC */
export const toBroadcastExpiryIso = (localDateTimeValue) => {
  if (!localDateTimeValue) return null;
  const date = new Date(localDateTimeValue);
  if (isNaN(date.getTime())) return null;
  return date.toISOString();
};

export const getPublicActiveBroadcasts = async () => {
  return await apiGet('/super-admin/broadcasts/active/public');
};

export const isLockdownBroadcast = (broadcast, now = new Date()) => {
  if (!broadcast?.is_active) return false;
  const type = String(broadcast?.type || '').toLowerCase();
  const isEmergencyType = type === 'lockdown' || type === 'emergency' || type === 'critical_shutdown';
  return isEmergencyType && isBroadcastLive(broadcast, now);
};
