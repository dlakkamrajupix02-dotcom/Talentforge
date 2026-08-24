import React, { useState, useEffect, useContext } from 'react';
import { 
  Bell, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Clock, 
  Trash2, 
  Filter,
  Search,
  MoreVertical,
  ChevronLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NotificationContext } from '../../context/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { getSafeNotificationPath } from '../../services/notificationService';

export default function NotificationsPage() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, fetchNotifications } = useContext(NotificationContext);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'success', 'error'
  const navigate = useNavigate();

  useEffect(() => {
    const params = filter === 'unread' ? { unread_only: true } : {};
    fetchNotifications(params);
  }, [filter, fetchNotifications]);

  const handleMarkAsRead = markAsRead;
  const handleMarkAllRead = markAllAsRead;

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-rose-500" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-amber-500" />;
      default: return <Info className="w-5 h-5 text-indigo-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] p-6 lg:p-10">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <button 
              onClick={() => navigate(-1)}
              className="group flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors mb-4"
            >
              <div className="p-1.5 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 group-hover:border-slate-300 dark:group-hover:border-white/20 transition-all">
                <ChevronLeft className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest">Back</span>
            </button>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Activity Center
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
              Stay updated with your latest system events and alerts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleMarkAllRead}
              className="px-6 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 transition-all shadow-sm"
            >
              Mark all as read
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-[#0f172a] rounded-[2rem] border border-slate-200/60 dark:border-white/10 p-2 mb-8 shadow-sm flex items-center gap-1 overflow-x-auto no-scrollbar">
          {['all', 'unread', 'success', 'error'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-[0.1em] transition-all ${
                filter === f 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 scale-[1.02]" 
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {isLoading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="h-24 bg-white dark:bg-[#0f172a] rounded-3xl animate-pulse border border-slate-100 dark:border-white/5" />
            ))
          ) : notifications.length === 0 ? (
            <div className="bg-white dark:bg-[#0f172a] rounded-[3rem] border border-slate-200/60 dark:border-white/10 p-20 text-center shadow-sm">
              <div className="w-20 h-20 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                <Bell className="w-10 h-10 opacity-20" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No notifications found</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                {filter === 'unread' ? "You've read all your messages!" : "When you have new activity, it will show up here."}
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <div 
                key={n.id}
                onClick={() => {
                  if (!n.is_read) handleMarkAsRead(n.id);
                  const safePath = getSafeNotificationPath(n.link);
                  if (safePath) navigate(safePath);
                  else if (n.link) toast.error('This notification link is not allowed.');
                }}
                className={`group relative flex items-start gap-5 p-6 rounded-[2.5rem] border transition-all cursor-pointer ${
                  !n.is_read 
                    ? "bg-white dark:bg-indigo-500/[0.03] border-indigo-100 dark:border-indigo-500/20 shadow-md" 
                    : "bg-slate-50/50 dark:bg-[#0f172a]/40 border-slate-100 dark:border-white/5 opacity-80 hover:opacity-100"
                }`}
              >
                {!n.is_read && (
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                )}
                
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner ${
                  !n.is_read ? 'bg-indigo-50 dark:bg-indigo-500/10' : 'bg-slate-100 dark:bg-white/5'
                }`}>
                  {getIcon(n.type)}
                </div>

                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className={`text-lg tracking-tight truncate ${!n.is_read ? 'font-black text-slate-900 dark:text-white' : 'font-bold text-slate-600 dark:text-slate-400'}`}>
                      {n.title}
                    </h4>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed line-clamp-2">
                    {n.message}
                  </p>
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl text-slate-400 transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
