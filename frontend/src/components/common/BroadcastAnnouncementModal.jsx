import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Info, AlertCircle, CheckCircle2, Radio, ShieldAlert,
  Sparkles, Wrench, PartyPopper, Layers, Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { dismissBroadcast } from '../../services/broadcastService';
import { BROADCAST_TYPE_STYLES } from '../../constants/broadcastStyles';

export default function BroadcastAnnouncementModal({ broadcasts = [], user, onDismiss }) {
  const current = broadcasts[0] || null;

  const styles = useMemo(() => {
    const type = (current?.type || 'info').toLowerCase();
    return BROADCAST_TYPE_STYLES[type] || BROADCAST_TYPE_STYLES.info;
  }, [current?.type]);

  const Icon = styles.icon;

  const handleAcknowledge = () => {
    if (!current) return;
    dismissBroadcast(user, current.id);
    onDismiss?.(current.id);
  };

  if (!current) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-950/75 backdrop-blur-md"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-700/60 bg-[#0f1117] shadow-2xl"
        >
          {/* Header */}
          <div className={`flex items-center gap-3 border-b px-6 py-4.5 ${styles.header}`}>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black/30 shrink-0 shadow-inner">
              <Icon size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] opacity-85">Platform Announcement</p>
              <h2 className="truncate text-base md:text-lg font-extrabold text-white">{current.title}</h2>
            </div>
            <span className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide border ${styles.badge}`}>
              {(current.type || 'info').toUpperCase()}
            </span>
          </div>

          {/* Body */}
          <div className="px-6 py-6 space-y-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200 font-normal">{current.message}</p>
            {current.expires_at && (
              <p className="flex items-center gap-2 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                <Radio size={13} className="text-slate-500 animate-pulse" />
                <span>Valid until {format(new Date(current.expires_at), 'MMM dd, yyyy · h:mm a')}</span>
              </p>
            )}
          </div>

          {/* Footer Action */}
          <div className="flex items-center justify-between border-t border-slate-800/80 px-6 py-4 bg-black/25">
            <span className="text-xs text-slate-400 italic">Click button to confirm receipt</span>
            <button
              type="button"
              onClick={handleAcknowledge}
              className={`rounded-xl px-6 py-2.5 text-xs md:text-sm font-extrabold transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer ${styles.button}`}
            >
              I understand
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
