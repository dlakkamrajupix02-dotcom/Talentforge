import React from 'react';

const PATH_LEFT = 'M 52 70 C 95 70, 110 48, 148 48';
const PATH_RIGHT = 'M 192 48 C 230 48, 245 70, 288 70';

function FlowDot({ path, dur, delay = 0, color = '#38bdf8' }) {
  return (
    <circle r="3.5" fill={color} opacity="0.95">
      <animateMotion dur={`${dur}s`} begin={`${delay}s`} repeatCount="indefinite" path={path} />
    </circle>
  );
}

function PipelinePaths() {
  return (
    <svg
      className="absolute inset-0 w-full h-full overflow-visible"
      viewBox="0 0 340 140"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="pipeGradL" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.15" />
          <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id="pipeGradR" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0.8" />
        </linearGradient>
        <filter id="pipeGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path d={PATH_LEFT} stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 6" opacity="0.45" />
      <path d={PATH_RIGHT} stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 6" opacity="0.45" />

      <path d={PATH_LEFT} stroke="url(#pipeGradL)" strokeWidth="2.5" strokeLinecap="round" filter="url(#pipeGlow)" opacity="0.9">
        <animate attributeName="stroke-dashoffset" from="80" to="0" dur="2.8s" repeatCount="indefinite" />
        <animate attributeName="stroke-dasharray" values="0 80;40 40;80 0" dur="2.8s" repeatCount="indefinite" />
      </path>
      <path d={PATH_RIGHT} stroke="url(#pipeGradR)" strokeWidth="2.5" strokeLinecap="round" filter="url(#pipeGlow)" opacity="0.9">
        <animate attributeName="stroke-dashoffset" from="80" to="0" dur="2.8s" begin="0.6s" repeatCount="indefinite" />
        <animate attributeName="stroke-dasharray" values="0 80;40 40;80 0" dur="2.8s" begin="0.6s" repeatCount="indefinite" />
      </path>

      <FlowDot path={PATH_LEFT} dur={2.4} delay={0} color="#38bdf8" />
      <FlowDot path={PATH_LEFT} dur={2.4} delay={1.2} color="#818cf8" />
      <FlowDot path={PATH_RIGHT} dur={2.4} delay={0.5} color="#6366f1" />
      <FlowDot path={PATH_RIGHT} dur={2.4} delay={1.7} color="#34d399" />
    </svg>
  );
}

function PdfNode() {
  return (
    <div className="sync-node sync-node-pdf relative flex flex-col items-center">
      <div className="relative w-[72px] h-[88px]">
        <div className="absolute -inset-2 rounded-2xl bg-slate-400/10 blur-xl" />
        <div className="relative w-full h-full rounded-xl border border-white/60 dark:border-white/20 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-[0_8px_32px_rgba(15,23,42,0.08)] overflow-hidden animate-[syncFloat_4s_ease-in-out_infinite]">
          <div className="absolute top-0 right-0 w-5 h-5 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-bl-lg" />
          <div className="absolute top-3 left-3 right-3 space-y-1.5">
            {[0.9, 0.75, 0.85, 0.6].map((w, i) => (
              <div key={i} className="h-1 rounded-full bg-slate-200 dark:bg-slate-600" style={{ width: `${w * 100}%` }} />
            ))}
          </div>
          <div className="absolute bottom-2.5 left-2.5 px-1.5 py-0.5 rounded bg-rose-500 text-[8px] font-black text-white tracking-wide">
            PDF
          </div>
          <div className="sync-scan-line absolute left-2 right-2 h-[2px] bg-gradient-to-r from-transparent via-sky-400 to-transparent opacity-80" />
        </div>
      </div>
      <StageLabel title="Source" subtitle="PDF Upload" tone="slate" />
    </div>
  );
}

function NexusNode() {
  return (
    <div className="sync-node sync-node-nexus relative flex flex-col items-center -mt-1">
      <div className="relative w-[88px] h-[88px]">
        <div className="absolute inset-0 rounded-full bg-blue-500/25 blur-2xl animate-pulse" style={{ animationDuration: '3s' }} />
        <div className="absolute inset-1 rounded-full border border-sky-300/40 dark:border-sky-500/30 animate-[spin_12s_linear_infinite]" />
        <div className="absolute inset-3 rounded-full border border-indigo-400/30 animate-[spin_8s_linear_infinite_reverse]" />
        <div className="absolute inset-0 rounded-2xl overflow-hidden bg-gradient-to-br from-sky-500/10 via-indigo-500/15 to-blue-600/10 backdrop-blur-sm border border-white/50 dark:border-white/15 shadow-[0_0_40px_rgba(56,189,248,0.25)] flex items-center justify-center">
          <svg viewBox="0 0 64 64" className="w-[70%] h-[70%]" aria-hidden="true">
            <defs>
              <radialGradient id="nexusCore" cx="50%" cy="45%" r="55%">
                <stop offset="0%" stopColor="#bae6fd" />
                <stop offset="45%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#4338ca" />
              </radialGradient>
            </defs>
            <polygon
              points="32,8 52,22 44,48 20,48 12,22"
              fill="url(#nexusCore)"
              className="origin-center animate-[syncCoreSpin_6s_linear_infinite]"
              style={{ transformOrigin: '32px 32px' }}
            />
            <circle cx="32" cy="32" r="6" fill="#e0f2fe" opacity="0.95">
              <animate attributeName="r" values="5;7;5" dur="2.4s" repeatCount="indefinite" />
            </circle>
          </svg>
        </div>
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-indigo-600 text-[7px] font-black text-white uppercase tracking-widest shadow-lg shadow-indigo-500/30">
          Nexus
        </div>
      </div>
      <StageLabel title="Sync Engine" subtitle="Parse & Transform" tone="indigo" active />
    </div>
  );
}

function CloudNode() {
  return (
    <div className="sync-node sync-node-cloud relative flex flex-col items-center">
      <div className="relative w-[88px] h-[72px]">
        <div className="absolute -inset-3 rounded-full bg-emerald-400/15 blur-2xl animate-pulse" style={{ animationDuration: '3.5s' }} />
        <div className="relative w-full h-full flex items-end justify-center animate-[syncFloat_4.5s_ease-in-out_infinite_0.8s]">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-100 to-white dark:from-slate-700 dark:to-slate-800 border border-white/70 dark:border-white/20 shadow-lg -ml-4" />
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-white to-sky-50 dark:from-slate-800 dark:to-slate-700 border border-white/70 dark:border-white/20 shadow-xl absolute -top-1 left-2" />
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-50 to-white dark:from-slate-700 dark:to-slate-800 border border-white/60 dark:border-white/15 shadow-md absolute top-2 -right-3" />
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/40 animate-[syncPulse_2s_ease-in-out_infinite]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 19V5" />
                <path d="M5 12l7-7 7 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      <StageLabel title="Destination" subtitle="TalentForge Cloud" tone="emerald" />
    </div>
  );
}

function StageLabel({ title, subtitle, tone = 'slate', active = false }) {
  const toneMap = {
    slate: 'text-slate-500 dark:text-slate-400',
    indigo: 'text-indigo-600 dark:text-indigo-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
  };

  return (
    <div className="mt-3 text-center">
      <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${toneMap[tone]} ${active ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>
        {title}
      </p>
      <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">{subtitle}</p>
    </div>
  );
}

/** Premium PDF → Sync Nexus → Cloud pipeline visualization (CSS/SVG — no WebGL) */
export default function SyncImporterHeaderScene() {
  return (
    <>
      <style>{`
        @keyframes syncFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes syncPulse {
          0%, 100% { transform: translateX(-50%) scale(1); opacity: 1; }
          50% { transform: translateX(-50%) scale(1.08); opacity: 0.92; }
        }
        @keyframes syncScan {
          0% { top: 18%; opacity: 0; }
          15% { opacity: 0.9; }
          85% { opacity: 0.9; }
          100% { top: 78%; opacity: 0; }
        }
        @keyframes syncCoreSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .sync-scan-line {
          animation: syncScan 2.2s ease-in-out infinite;
        }
      `}</style>

      <div className="hidden lg:flex flex-col items-center justify-center w-[min(360px,32%)] shrink-0 relative z-10 py-1">
        <div className="relative w-full max-w-[340px] h-[148px]">
          <PipelinePaths />
          <div className="absolute inset-0 flex items-end justify-between px-1 pb-0">
            <PdfNode />
            <NexusNode />
            <CloudNode />
          </div>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
            Live sync pipeline
          </p>
        </div>
      </div>

      <div className="flex lg:hidden w-full justify-center py-2 relative z-10">
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-50/80 dark:bg-white/[0.04] border border-slate-100 dark:border-white/10">
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
            <span className="w-6 h-7 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-center text-[8px] font-black text-rose-500">PDF</span>
            Source
          </span>
          <svg width="28" height="8" viewBox="0 0 28 8" aria-hidden="true">
            <path d="M0 4 H20" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3">
              <animate attributeName="stroke-dashoffset" from="6" to="0" dur="1s" repeatCount="indefinite" />
            </path>
            <circle cx="24" cy="4" r="2" fill="#6366f1" />
          </svg>
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
            <span className="w-6 h-6 rounded-full bg-indigo-500/15 border border-indigo-300/40 flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            </span>
            Sync
          </span>
          <svg width="28" height="8" viewBox="0 0 28 8" aria-hidden="true">
            <path d="M0 4 H20" stroke="#34d399" strokeWidth="1.5" strokeDasharray="3 3">
              <animate attributeName="stroke-dashoffset" from="6" to="0" dur="1s" begin="0.3s" repeatCount="indefinite" />
            </path>
            <circle cx="24" cy="4" r="2" fill="#34d399" />
          </svg>
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            <span className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-300/40 flex items-center justify-center text-emerald-500">↑</span>
            Cloud
          </span>
        </div>
      </div>
    </>
  );
}
