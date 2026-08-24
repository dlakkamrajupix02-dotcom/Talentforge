import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import * as notificationService from '../services/notificationService';
import { JDContext } from './JDContext';
import { WS_BASE_URL, getAccessToken } from '../services/apiClient';
import toast from 'react-hot-toast';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const { user } = useContext(JDContext);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // Refs persist across renders and effect re-runs — shared state for WS lifecycle
    const socketRef = useRef(null);
    const recentlySeenIdsRef = useRef(new Set()); // Single global dedup cache
    const reconnectTimerRef = useRef(null);
    const isConnectingRef = useRef(false);

    const fetchNotifications = useCallback(async (params = { limit: 20 }) => {
        if (!user) return;
        setIsLoading(true);
        try {
            const [notifs, countData] = await Promise.all([
                notificationService.getNotifications(params),
                notificationService.getUnreadCount()
            ]);
            setNotifications(Array.isArray(notifs) ? notifs : []);
            setUnreadCount(countData?.unread_count || 0);
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    const markAsRead = async (id) => {
        try {
            await notificationService.markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error("Failed to mark as read:", error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
            toast.success("All notifications marked as read");
        } catch (error) {
            toast.error("Failed to mark all as read");
        }
    };

    useEffect(() => {
        const userId = user?.userId || user?.id;
        if (!userId) return;

        fetchNotifications();

        const connect = () => {
            const accessToken = getAccessToken();
            const wsUrl = `${WS_BASE_URL}/notifications/ws/${userId}${accessToken ? `?token=${encodeURIComponent(accessToken)}` : ''}`;

            // Guard: don't open a second connection if one is already open/connecting
            if (isConnectingRef.current) return;
            if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
                return;
            }

            isConnectingRef.current = true;
            console.log("Connecting to WebSocket:", wsUrl);

            try {
                const socket = new WebSocket(wsUrl);
                socketRef.current = socket;

                socket.onopen = () => {
                    console.log("Notification WebSocket connected");
                    isConnectingRef.current = false;
                };

                socket.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === "new_notification") {
                            const notifId = data.notification.id;

                            // Global dedup check — shared across all possible connections
                            if (recentlySeenIdsRef.current.has(notifId)) {
                                console.log("Duplicate notification blocked:", notifId);
                                return;
                            }

                            // Mark as seen and auto-expire after 10 seconds
                            recentlySeenIdsRef.current.add(notifId);
                            setTimeout(() => recentlySeenIdsRef.current.delete(notifId), 10000);

                            setNotifications(prev => {
                                // Secondary check against React state
                                if (prev.some(n => n.id === notifId)) return prev;

                                setUnreadCount(count => count + 1);
                                toast.custom((t) => (
                                    <div className={`${t.visible ? 'animate-in fade-in slide-in-from-top-2' : 'animate-out fade-out slide-out-to-right-2'} max-w-sm w-full bg-white dark:bg-[#0f172a] shadow-2xl rounded-2xl pointer-events-auto flex border border-slate-100 dark:border-white/5 overflow-hidden duration-300`}>
                                      <div className="flex-1 w-0 p-4">
                                        <div className="flex items-start">
                                          <div className="flex-shrink-0 pt-0.5">
                                            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-500 text-lg">
                                              🔔
                                            </div>
                                          </div>
                                          <div className="ml-3 flex-1">
                                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                                              {typeof data.notification.title === 'string' ? data.notification.title : JSON.stringify(data.notification.title)}
                                            </p>
                                            {data.notification.message && (
                                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                                                  {typeof data.notification.message === 'string' 
                                                    ? data.notification.message 
                                                    : (data.notification.message.name ? `From: ${data.notification.message.name}` : JSON.stringify(data.notification.message))}
                                                </p>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex border-l border-slate-100 dark:border-white/5">
                                        <button
                                          onClick={() => toast.dismiss(t.id)}
                                          className="w-full border border-transparent rounded-none rounded-r-2xl p-4 flex items-center justify-center text-sm font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                                        >
                                          Close
                                        </button>
                                      </div>
                                    </div>
                                ), { duration: 5000, id: notifId });
                                return [data.notification, ...prev];
                            });
                        } else if (data.type === "unread_count_update") {
                            setUnreadCount(data.unread_count);
                        }
                    } catch (err) {
                        console.error("Failed to parse WebSocket message:", err);
                    }
                };

                socket.onclose = (e) => {
                    isConnectingRef.current = false;
                    if (e.code === 1008) {
                        console.warn("WebSocket auth failed; not reconnecting with stale token.");
                        return;
                    }
                    if (e.code !== 1000) {
                        console.warn(`WebSocket closed: ${e.reason}. Reconnecting in 3s...`);
                        // Clear any existing timer before scheduling a new one
                        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
                        reconnectTimerRef.current = setTimeout(connect, 3000);
                    }
                };

                socket.onerror = () => {
                    isConnectingRef.current = false;
                    socket.close();
                };

            } catch (err) {
                isConnectingRef.current = false;
                console.error("Failed to establish WebSocket connection:", err);
            }
        };

        connect();

        return () => {
            // Cleanup: close socket and clear any pending reconnect timer
            if (reconnectTimerRef.current) {
                clearTimeout(reconnectTimerRef.current);
                reconnectTimerRef.current = null;
            }
            if (socketRef.current) {
                console.log("Cleaning up WebSocket connection...");
                socketRef.current.close(1000);
                socketRef.current = null;
            }
            isConnectingRef.current = false;
        };
    }, [user?.id, user?.userId]);

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            isLoading,
            fetchNotifications,
            markAsRead,
            markAllAsRead
        }}>
            {children}
        </NotificationContext.Provider>
    );
};
