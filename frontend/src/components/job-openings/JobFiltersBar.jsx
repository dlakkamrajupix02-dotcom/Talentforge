import React, { useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Search,
  SlidersHorizontal,
  Sparkles,
  MapPin,
  Briefcase,
  TrendingUp,
  ChevronDown,
  X,
  Layers,
  RotateCcw,
} from "lucide-react";

const EMP_TYPES = ["All", "Full-time", "Part-time", "Contract", "Internship"];
const WORK_MODES = ["All", "Remote", "Hybrid", "Onsite"];
const SENIORITIES = ["All", "Entry", "Mid", "Senior", "Lead", "Executive"];

export default function JobFiltersBar({
  searchTerm,
  onSearchChange,
  selectedDept,
  onDeptChange,
  departments,
  selectedEmpType,
  onEmpTypeChange,
  selectedLocation = "All",
  onLocationChange,
  locations = [],
  selectedWorkMode = "All",
  onWorkModeChange,
  selectedSeniority = "All",
  onSeniorityChange,
  resultCount = 0,
  onClearAll,
}) {
  const reduceMotion = useReducedMotion();
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const activeFilters = useMemo(() => {
    const chips = [];
    if (searchTerm.trim()) chips.push({ key: "search", label: `"${searchTerm.trim()}"`, clear: () => onSearchChange("") });
    if (selectedDept !== "All") chips.push({ key: "dept", label: selectedDept, clear: () => onDeptChange("All") });
    if (selectedEmpType !== "All") chips.push({ key: "emp", label: selectedEmpType, clear: () => onEmpTypeChange("All") });
    if (selectedLocation !== "All") chips.push({ key: "loc", label: selectedLocation, clear: () => onLocationChange("All") });
    if (selectedWorkMode !== "All") chips.push({ key: "mode", label: selectedWorkMode, clear: () => onWorkModeChange("All") });
    if (selectedSeniority !== "All") chips.push({ key: "sen", label: `${selectedSeniority} level`, clear: () => onSeniorityChange("All") });
    return chips;
  }, [
    searchTerm, selectedDept, selectedEmpType, selectedLocation, selectedWorkMode,
    selectedSeniority,
    onSearchChange, onDeptChange, onEmpTypeChange, onLocationChange,
    onWorkModeChange, onSeniorityChange,
  ]);

  const FilterSelect = ({ icon: Icon, label, value, onChange, children, className = "" }) => (
    <div className={`relative min-w-0 ${className}`}>
      <label className="jo-filter-label">{label}</label>
      <div className="relative">
        <Icon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none z-10" />
        <select
          value={value}
          onChange={onChange}
          aria-label={label}
          className="jo-select jo-filter-select w-full pl-8 pr-7 py-2 rounded-lg text-[11px] text-slate-700 dark:text-slate-200 outline-none font-bold cursor-pointer appearance-none truncate"
        >
          {children}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );

  const PillGroup = ({ label, icon: Icon, options, value, onChange, layoutId, compact = false }) => (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
        {Icon && <Icon className="w-2.5 h-2.5" />}
        {label}
      </div>
      <div className="jo-pill-group flex flex-wrap gap-1" role="group" aria-label={label}>
        {options.map((opt) => {
          const isActive = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`jo-filter-pill relative px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wide whitespace-nowrap transition-colors duration-200 ${
                isActive
                  ? "text-white"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-white/60 dark:bg-white/5 border border-slate-200/80 dark:border-white/10"
              }`}
            >
              {isActive && !reduceMotion && layoutId && (
                <motion.span
                  layoutId={layoutId}
                  className="absolute inset-0 rounded-md bg-gradient-to-r from-indigo-600 to-violet-600 shadow-[0_2px_10px_rgba(79,70,229,0.25)]"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              )}
              {isActive && (reduceMotion || !layoutId) && (
                <span className="absolute inset-0 rounded-md bg-gradient-to-r from-indigo-600 to-violet-600" />
              )}
              <span className="relative z-10">{opt}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="jo-filters-bar relative overflow-hidden rounded-2xl border border-slate-200/70 dark:border-white/10 shadow-[0_8px_32px_rgba(15,23,42,0.06)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
      <div className="jo-filters-bar-shine" aria-hidden="true" />
      <div className="jo-filters-bar-grid" aria-hidden="true" />

      <div className="relative z-10 p-3 sm:p-4 flex flex-col gap-2.5">
        {/* Header row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-indigo-500/80 dark:text-indigo-400/80">
            <Sparkles className="w-3 h-3" />
            Refine your search
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="jo-filter-result-badge px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
              {resultCount} {resultCount === 1 ? "match" : "matches"}
            </span>
            {activeFilters.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border border-rose-200/80 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/15 transition-colors"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Search + filters — compact single block */}
        <div className="jo-search-wrap relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors duration-200 z-10" />
          <input
            type="text"
            placeholder="Search title, department, location..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search job openings"
            className="jo-search-input w-full pl-9 pr-3 py-2 rounded-xl text-xs text-slate-800 dark:text-white outline-none font-semibold placeholder:text-slate-400"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <FilterSelect icon={SlidersHorizontal} label="Department" value={selectedDept} onChange={(e) => onDeptChange(e.target.value)}>
            <option value="All">All departments</option>
            {departments.filter((d) => d !== "All").map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </FilterSelect>

          <FilterSelect icon={MapPin} label="Location" value={selectedLocation} onChange={(e) => onLocationChange(e.target.value)}>
            <option value="All">All locations</option>
            {locations.filter((l) => l !== "All").map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </FilterSelect>

          <FilterSelect icon={Briefcase} label="Employment type" value={selectedEmpType} onChange={(e) => onEmpTypeChange(e.target.value)}>
            {EMP_TYPES.map((type) => (
              <option key={type} value={type}>{type === "All" ? "All types" : type}</option>
            ))}
          </FilterSelect>
        </div>

        {/* Advanced toggle */}
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className="jo-advanced-toggle flex items-center justify-between w-full px-3 py-2 rounded-lg text-left transition-colors"
        >
          <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            <Layers className="w-3 h-3 text-indigo-500" />
            More filters
            {(selectedWorkMode !== "All" || selectedSeniority !== "All") && (
              <span className="px-1 py-px rounded bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[8px]">
                Active
              </span>
            )}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${advancedOpen ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence initial={false}>
          {advancedOpen && (
            <motion.div
              initial={reduceMotion ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="jo-advanced-panel grid sm:grid-cols-2 gap-3 p-3 rounded-xl">
                <PillGroup
                  compact
                  label="Work mode"
                  icon={MapPin}
                  options={WORK_MODES}
                  value={selectedWorkMode}
                  onChange={onWorkModeChange}
                  layoutId="jo-work-pill-bg"
                />
                <PillGroup
                  compact
                  label="Experience level"
                  icon={TrendingUp}
                  options={SENIORITIES}
                  value={selectedSeniority}
                  onChange={onSeniorityChange}
                  layoutId="jo-sen-pill-bg"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active filter chips */}
        <AnimatePresence>
          {activeFilters.length > 0 && (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-200/60 dark:border-white/5"
            >
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mr-1">Active</span>
              {activeFilters.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={chip.clear}
                  className="jo-filter-chip group flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg text-[10px] font-bold transition-all"
                >
                  {chip.label}
                  <span className="w-4 h-4 rounded-md flex items-center justify-center bg-slate-200/80 dark:bg-white/10 group-hover:bg-rose-100 dark:group-hover:bg-rose-500/20 transition-colors">
                    <X className="w-2.5 h-2.5 text-slate-500 group-hover:text-rose-600 dark:group-hover:text-rose-400" />
                  </span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
