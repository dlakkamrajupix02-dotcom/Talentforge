import React, { useState, useEffect, useContext, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
  ShieldAlert, Lock, Radio, RefreshCw, LogOut, Clock,
  ShieldCheck, Terminal, User, Shield, KeyRound, Cpu, Binary, AlertOctagon
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { JDContext } from '../../context/JDContext';
import toast from 'react-hot-toast';

// High-Tech Cyber Security Animated Background
function SecurityAnimatedBackground() {
  // Generate stable random security data stream tags
  const securityTags = useMemo(() => [
    { text: 'AES-256 GCM ENCRYPTED', top: '12%', left: '8%', delay: 0 },
    { text: 'FIREWALL CONTAINMENT ACTIVE', top: '18%', right: '10%', delay: 1.2 },
    { text: 'NODE_ISOLATION // 0x4F92A', top: '75%', left: '12%', delay: 2.4 },
    { text: 'DATA PIPELINES FROZEN', top: '82%', right: '14%', delay: 0.8 },
    { text: 'SEC_AUTH_GUARD v4.9', top: '45%', left: '4%', delay: 1.8 },
    { text: 'INCIDENT LOG: SEC-LK-902', top: '50%', right: '6%', delay: 3.0 },
    { text: 'TRAFFIC DIVERTER ENGAGED', top: '88%', left: '40%', delay: 2.1 },
  ], []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {/* 1. Deep Space Cyber Dark Gradient with ambient crimson spotlights */}
      <div className="absolute inset-0 bg-[#05070c]" />
      
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.15, 0.28, 0.15]
        }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[550px] bg-rose-600/25 rounded-full blur-[150px]"
      />
      <motion.div
        animate={{
          scale: [1.1, 0.9, 1.1],
          opacity: [0.12, 0.22, 0.12]
        }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute bottom-10 left-1/4 w-[600px] h-[400px] bg-red-800/20 rounded-full blur-[130px]"
      />

      {/* 2. Rotating Cyber Radar System */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] flex items-center justify-center opacity-40">
        {/* Concentric Sonar Rings */}
        <div className="absolute inset-0 rounded-full border border-rose-500/10" />
        <div className="absolute w-[680px] h-[680px] rounded-full border border-rose-500/15 border-dashed" />
        <div className="absolute w-[460px] h-[460px] rounded-full border border-rose-500/20" />
        <div className="absolute w-[240px] h-[240px] rounded-full border border-rose-500/30 border-dotted" />

        {/* Pulsing Sonar Wave Expansion */}
        <motion.div
          animate={{
            scale: [0.3, 1.6],
            opacity: [0.8, 0]
          }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeOut' }}
          className="absolute w-[450px] h-[450px] rounded-full border-2 border-rose-500/40"
        />
        <motion.div
          animate={{
            scale: [0.3, 1.6],
            opacity: [0.8, 0]
          }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeOut', delay: 2.25 }}
          className="absolute w-[450px] h-[450px] rounded-full border-2 border-rose-500/40"
        />

        {/* Rotating 360-Degree Radar Scanner Beam */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 rounded-full"
          style={{
            background: 'conic-gradient(from 0deg at 50% 50%, rgba(225, 29, 72, 0.25) 0deg, rgba(225, 29, 72, 0.05) 45deg, transparent 90deg, transparent 360deg)'
          }}
        />

        {/* Crosshair Coordinate Lines */}
        <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-rose-500/25 to-transparent" />
        <div className="absolute h-full w-[1px] bg-gradient-to-b from-transparent via-rose-500/25 to-transparent" />
      </div>

      {/* 3. Cyber Matrix Hexagonal Grid Background Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(244, 63, 94, 0.12) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(244, 63, 94, 0.12) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      {/* 4. Sweeping Laser Scanline */}
      <motion.div
        animate={{
          top: ['-10%', '110%']
        }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500/60 to-transparent shadow-[0_0_15px_#f43f5e] opacity-75"
      />

      {/* 5. Floating Cyber Security Badges & Data Streams */}
      {securityTags.map((tag, idx) => (
        <motion.div
          key={idx}
          style={{ top: tag.top, left: tag.left, right: tag.right }}
          animate={{
            y: [-6, 6, -6],
            opacity: [0.25, 0.65, 0.25]
          }}
          transition={{ duration: 5 + idx, repeat: Infinity, ease: 'easeInOut', delay: tag.delay }}
          className="absolute hidden md:flex items-center gap-2 font-mono text-[9px] font-bold text-rose-400/80 tracking-widest uppercase bg-rose-950/40 border border-rose-500/30 px-2.5 py-1 rounded-md backdrop-blur-sm shadow-sm"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
          <span>{tag.text}</span>
        </motion.div>
      ))}

      {/* 6. Floating Cyber Shield Holograms in Corners */}
      <motion.div
        animate={{ rotate: [0, 10, 0, -10, 0], y: [-8, 8, -8] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-24 left-16 text-rose-500/15 hidden lg:block"
      >
        <Shield size={120} strokeWidth={1} />
      </motion.div>
      <motion.div
        animate={{ rotate: [0, -10, 0, 10, 0], y: [8, -8, 8] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute bottom-28 right-20 text-rose-500/15 hidden lg:block"
      >
        <AlertOctagon size={110} strokeWidth={1} />
      </motion.div>
    </div>
  );
}

export default function EmergencyLockdownScreen({ broadcast, user: propUser, onRefresh }) {
  // Lock body overflow and background to avoid any white gaps
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalBg = document.body.style.backgroundColor;
    document.body.style.overflow = 'hidden';
    document.body.style.backgroundColor = '#05070c';
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.backgroundColor = originalBg;
    };
  }, []);

  const navigate = useNavigate();
  const { user: contextUser, logout } = useContext(JDContext) || {};
  const user = propUser || contextUser;
  const [timeLeft, setTimeLeft] = useState(null);

  // Expiration countdown
  useEffect(() => {
    if (!broadcast?.expires_at) return;

    const calcTime = () => {
      const diff = new Date(broadcast.expires_at).getTime() - new Date().getTime();
      if (diff <= 0) {
        setTimeLeft('Expired / Lifting momentarily');
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${hours}h ${mins}m ${secs}s remaining`);
    };

    calcTime();
    const timer = setInterval(calcTime, 1000);
    return () => clearInterval(timer);
  }, [broadcast?.expires_at]);

  const handleSignOut = () => {
    if (logout) {
      logout();
    } else {
      localStorage.clear();
      sessionStorage.clear();
    }
    toast.success('Signed out');
    navigate('/login');
  };

  return createPortal(
    <div className="fixed inset-0 w-screen h-screen min-h-screen z-[999999] bg-[#05070c] text-slate-100 flex flex-col items-center justify-between p-4 md:p-8 overflow-y-auto selection:bg-rose-500 selection:text-white">
      {/* Dynamic Cyber Security Animated Background */}
      <SecurityAnimatedBackground />

      {/* Top Status Header */}
      <header className="relative z-10 w-full max-w-4xl flex items-center justify-between py-2 border-b border-rose-500/20 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-500/20">
            <ShieldAlert size={18} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span className="text-[11px] font-extrabold tracking-widest uppercase text-rose-400">
                Critical Platform Containment
              </span>
            </div>
            <h1 className="text-xs text-slate-400 font-mono font-medium">
              TALENTFORGE EMERGENCY BROADCAST SYSTEM
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 transition-all hover:text-white cursor-pointer shadow-sm backdrop-blur-md"
            title="Check if lockdown has been lifted"
          >
            <RefreshCw size={12} className="animate-spin" />
            <span>Live Sync</span>
          </button>
        </div>
      </header>

      {/* Main Incident Card */}
      <main className="relative z-10 w-full max-w-2xl my-auto py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative rounded-3xl border border-rose-500/35 bg-[#0b0e14]/95 backdrop-blur-2xl p-6 md:p-10 shadow-2xl shadow-rose-950/60 overflow-hidden"
        >
          {/* Top Security Banner Accent */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600 animate-gradient" />

          {/* Centered Graphic with Pulsing Hex Aura */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="relative mb-4">
              <motion.div 
                animate={{ scale: [1, 1.18, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -inset-4 rounded-full bg-rose-500/25 blur-xl" 
              />
              <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-900/80 to-slate-950 border border-rose-500/60 flex items-center justify-center text-rose-400 shadow-2xl shadow-rose-900/40">
                <Lock size={36} className="text-rose-400 drop-shadow-[0_0_12px_rgba(244,63,94,0.6)]" />
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-300 text-[10px] font-extrabold uppercase tracking-widest mb-2 shadow-sm">
              <Radio size={12} className="animate-pulse text-rose-400" />
              Active System Lockdown In Effect
            </span>

            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight leading-snug">
              {broadcast?.title || 'System Temporarily Suspended for Emergency Maintenance'}
            </h2>
          </div>

          {/* Incident Message Container */}
          <div className="rounded-2xl bg-black/50 border border-rose-500/25 p-5 md:p-6 mb-6 space-y-3 shadow-inner backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-300 uppercase tracking-wider">
              <Terminal size={14} className="text-rose-400" />
              <span>Incident Advisory & Instructions</span>
            </div>
            <p className="text-sm md:text-base leading-relaxed text-slate-200 whitespace-pre-wrap font-normal">
              {broadcast?.message || 'The platform is currently under lockdown to ensure data integrity and prevent unauthorized operations. All public and organization access is paused until administrative clearance is completed.'}
            </p>
          </div>

          {/* Info & Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80 text-xs">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
              <Clock size={16} className="text-amber-400 shrink-0" />
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-bold block">Estimated Resolution</span>
                <span className="font-semibold text-slate-200">
                  {timeLeft || (broadcast?.expires_at ? format(new Date(broadcast.expires_at), 'MMM dd, yyyy · h:mm a') : 'Pending Super Admin Clearance')}
                </span>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
              <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-bold block">Containment Scope</span>
                <span className="font-semibold text-slate-200">
                  Organization Portals (Admin, HR, Manager, User)
                </span>
              </div>
            </div>
          </div>

          {/* Auto-Reconnect Status */}
          <div className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Automatic heartbeat active. This screen will automatically dismiss once the Super Admin lifts the lockdown.</span>
          </div>
        </motion.div>
      </main>

      {/* Footer with Authenticated User Details & Sign Out Button */}
      <footer className="relative z-10 w-full max-w-4xl flex items-center justify-between text-xs text-slate-400 py-3 border-t border-rose-500/20 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          {user && (
            <span className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1 rounded-lg border border-slate-800 text-slate-300 backdrop-blur-sm">
              <User size={12} className="text-rose-400" />
              <span>Logged in: <strong className="text-white">{user.email || user.full_name}</strong> ({user.role?.toUpperCase()})</span>
            </span>
          )}
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 text-slate-400 hover:text-rose-400 font-semibold transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800 cursor-pointer"
        >
          <LogOut size={13} />
          <span>Sign Out</span>
        </button>
      </footer>
    </div>,
    document.body
  );
}
