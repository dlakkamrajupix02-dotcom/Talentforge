import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Briefcase, Archive } from "lucide-react";

function AdminTab({ active, onClick, icon: Icon, label, count }) {
  const reduceMotion = useReducedMotion();

  return (
    <button
      onClick={onClick}
      className={`jo-tab-btn relative flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-colors duration-200 ${
        active
          ? "text-indigo-700 dark:text-indigo-200"
          : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
      }`}
    >
      {active && !reduceMotion && (
        <motion.span
          layoutId="jo-admin-tab-bg"
          className="absolute inset-0 rounded-2xl bg-white dark:bg-slate-800/90 shadow-[0_4px_24px_rgba(79,70,229,0.12)] border border-indigo-100/80 dark:border-indigo-500/20"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      {active && reduceMotion && (
        <span className="absolute inset-0 rounded-2xl bg-white dark:bg-slate-800/90 border border-indigo-100/80 dark:border-indigo-500/20" />
      )}
      <Icon className="relative z-10 w-4 h-4 shrink-0" />
      <span className="relative z-10">{label}</span>
      <span
        className={`relative z-10 min-w-[1.5rem] px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${
          active
            ? "bg-indigo-100 dark:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300"
            : "bg-slate-100 dark:bg-white/5 text-slate-500"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

export function AdminJobTabs({ activeTab, onTabChange, openCount, archivedCount }) {
  return (
    <div className="jo-tabs-shell inline-flex p-1.5 rounded-[1.25rem] gap-1">
      <AdminTab
        active={activeTab === "open"}
        onClick={() => onTabChange("open")}
        icon={Briefcase}
        label="Open Positions"
        count={openCount}
      />
      <AdminTab
        active={activeTab === "archived"}
        onClick={() => onTabChange("archived")}
        icon={Archive}
        label="Archived Positions"
        count={archivedCount}
      />
    </div>
  );
}

export function EndUserJobTabs({ activeTab, setActiveTab }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="jo-tabs-shell inline-flex p-1.5 rounded-[1.25rem] gap-1">
      {[
        { id: "openings", label: "Current Openings" },
        { id: "applied", label: "Applied Jobs" },
      ].map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`jo-tab-btn relative px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-colors duration-200 ${
              isActive
                ? "text-indigo-700 dark:text-indigo-200"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            {isActive && !reduceMotion && (
              <motion.span
                layoutId="jo-enduser-tab-bg"
                className="absolute inset-0 rounded-2xl bg-white dark:bg-slate-800/90 shadow-[0_4px_24px_rgba(79,70,229,0.12)] border border-indigo-100/80 dark:border-indigo-500/20"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            {isActive && reduceMotion && (
              <span className="absolute inset-0 rounded-2xl bg-white dark:bg-slate-800/90 border border-indigo-100/80 dark:border-indigo-500/20" />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
