import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { TrendingUp, Briefcase } from "lucide-react";

export default function OpeningsSummaryCard({ count, activeTab }) {
  const reduceMotion = useReducedMotion();
  const label = activeTab === "archived" ? "Archived" : "Open Roles";
  const subtitle = activeTab === "archived" ? "Previously published positions" : "Active internal listings";

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="jo-summary-card relative w-full break-inside-avoid min-h-[240px] rounded-[2rem] overflow-hidden mb-8 group"
    >
      <div className="jo-summary-bg" aria-hidden="true" />
      <div className="jo-summary-mesh" aria-hidden="true" />
      <div className="jo-summary-orbit" aria-hidden="true">
        <div className="jo-summary-orbit-ring" />
        <div className="jo-summary-orbit-ring jo-summary-orbit-ring--2" />
      </div>

      <div className="relative z-10 h-full p-6 sm:p-7 flex flex-col justify-between min-h-[240px]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="jo-summary-icon-wrap w-11 h-11 rounded-2xl flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />
            </div>
            <div>
              <p className="text-[10px] font-black tracking-[0.22em] text-indigo-600/70 dark:text-indigo-400/80 uppercase">
                Internal Opportunities
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
            </div>
          </div>

          <div className={`jo-summary-live flex items-center gap-1.5 px-2.5 py-1 rounded-full ${activeTab === "archived" ? "opacity-60" : ""}`}>
            <span className={`jo-summary-live-dot w-1.5 h-1.5 rounded-full ${activeTab === "archived" ? "bg-slate-400" : "bg-emerald-500"}`} />
            <span className={`text-[9px] font-black uppercase tracking-wider ${activeTab === "archived" ? "text-slate-500" : "text-emerald-600 dark:text-emerald-400"}`}>
              {activeTab === "archived" ? "Archive" : "Live"}
            </span>
          </div>
        </div>

        <div className="flex items-end justify-between gap-4 mt-auto pt-6">
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 mb-2">
              {label}
            </h2>
            <div className="flex items-end gap-3">
              <motion.span
                key={count}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="jo-summary-count text-6xl sm:text-7xl font-black leading-none tabular-nums tracking-tighter"
              >
                {count}
              </motion.span>
              <span className="text-sm font-bold text-slate-400 dark:text-slate-500 mb-2">
                {count === 1 ? "role" : "roles"}
              </span>
            </div>
          </div>

          <div className="hidden sm:flex flex-col items-end gap-1 text-right">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-wider">Mobility Hub</span>
            </div>
            <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 max-w-[120px] leading-snug">
              Grow your career inside the org
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
