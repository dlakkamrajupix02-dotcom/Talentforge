import { useState, useContext, useEffect } from "react";
import { JDContext } from "../../context/JDContext";
import {
  Check,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Tag as TagIcon,
  Rocket,
  Circle,
  Loader2,
  Database,
  ArrowRight,
  ShieldCheck,
  X,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Filter,
  RotateCcw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { apiGet, apiPost, apiPatch } from "../../services/apiClient";
import { listJDIds, getJDById } from "../../services/jdService";
import Pagination from "../../components/common/Pagination";

export default function PushJDList({ onPushSuccess, isConnected, activeConnection, onSyncProgress, jds = [], isLoadingJDs, refreshJDs }) {
  const [selected, setSelected] = useState([]);
  const [isPushing, setIsPushing] = useState(false);
  const [pushStatus, setPushStatus] = useState(null); // 'idle' | 'processing' | 'done'
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState(null);

  // Search & Filter & Sort State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("");
  const [selectedLocFilter, setSelectedLocFilter] = useState("");
  const [selectedIndFilter, setSelectedIndFilter] = useState("");
  const [sortBy, setSortBy] = useState({ column: "", direction: "asc" });
  const [showFilters, setShowFilters] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(7);

  const { allJDs } = useContext(JDContext);

  const steps = [
    { name: "Validation", endpoint: "/validate" },
    { name: "Authentication", endpoint: "/auth" },
    { name: "Data Mapping", endpoint: "/mapping" },
    { name: "CSOD Pipeline", endpoint: "/process" },
    { name: "Verification", endpoint: "/verify" }
  ];

  const getJDStatus = (jd) => {
    if (jd.pushedToCSOD) return 'Pushed';
    if (jd.status === 'failed') return 'Failed';
    if (jd.status === 'draft') return 'Draft';
    return 'Final';
  };

  const toggleSelect = (id, isDisabled) => {
    if (isDisabled) return;
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((i) => i !== id)
        : [...prev, id]
    );
  };

  const formatJDDescription = (jd) => {
    return `<h3>${jd.title || 'Job Description'}</h3><p><strong>Job ID:</strong> ${jd.jobId || 'N/A'} | <strong>Department:</strong> ${jd.department || 'N/A'} | <strong>Job Family:</strong> ${jd.jobFamily || 'N/A'} | <strong>Industry:</strong> ${jd.industry || 'N/A'} | <strong>Location:</strong> ${jd.location || 'N/A'} | <strong>Job Level:</strong> ${jd.jobLevel || 'N/A'} | <strong>Seniority:</strong> ${jd.seniority || 'N/A'} | <strong>Salary Range:</strong> ${jd.salaryRange || 'N/A'}</p><p><strong>Summary:</strong> ${jd.summary || 'No summary provided.'}</p><p><strong>Essential Duties & Responsibilities:</strong> ${jd.essentialDuties || 'N/A'}</p><p><strong>Role Narrative:</strong> ${jd.roleNarrative || 'N/A'}</p><p><strong>Key Performance Areas:</strong> ${jd.kpa || 'N/A'}</p><p><strong>Core Competencies:</strong> ${jd.coreCompetencies || 'N/A'}</p><p><strong>Functional Competencies:</strong> ${jd.functionalCompetencies || 'N/A'}</p><p><strong>Qualifications:</strong> ${jd.qualifications || 'N/A'}</p><p><strong>Preferred Assets:</strong> ${jd.preferredAssets || 'N/A'}</p><p><strong>Equal Opportunity Statement:</strong> ${jd.equalOpportunityStatement || 'Blue Hotels is an equal opportunity employer committed to diversity and reasonable accommodations for candidates with disabilities.'}</p><p><strong>Extended Responsibilities:</strong> ${jd.extendedResponsibilities || 'N/A'}</p><p><strong>Additional Preferred Experience:</strong> ${jd.additionalPreferredExperience || 'N/A'}</p><p><strong>Delivery Focus:</strong> ${jd.deliveryFocus || 'N/A'}</p><p><strong>Tools:</strong> ${jd.tools || 'N/A'}</p> Go-live OK`;
  };

  const handlePush = async () => {
    if (selected.length === 0) return;
    if (!activeConnection) {
      toast.error("No active connection. Please test your connection first.");
      return;
    }

    setIsPushing(true);
    setPushStatus('processing');
    setError(null);
    setCurrentStep(1);

    const activeJobTitles = selected.map(id => jds.find(j => j.id === id || j._id === id || j.jd_id === id)?.title || "Job Description");
    if (onSyncProgress) {
      onSyncProgress({
        isSyncing: true,
        currentStep: 1,
        selectedCount: selected.length,
        jobs: activeJobTitles
      });
    }

    try {
      const connectionName = activeConnection.connection_name;
      const exportType = activeConnection.export_type || "Foundation";
      const endpoint = exportType.toLowerCase() === "bulk" ? "/bulk/process" : "/foundation/process";

      toast.loading(`Syncing ${selected.length} JDs to CSOD via ${exportType} Pipeline...`, { id: 'push-toast' });

      // Stage 1-3: Local UI transitions to feel responsive
      await new Promise(r => setTimeout(r, 600));
      setCurrentStep(2);
      if (onSyncProgress) {
        onSyncProgress({
          isSyncing: true,
          currentStep: 2,
          selectedCount: selected.length,
          jobs: activeJobTitles
        });
      }

      await new Promise(r => setTimeout(r, 600));
      setCurrentStep(3);
      if (onSyncProgress) {
        onSyncProgress({
          isSyncing: true,
          currentStep: 3,
          selectedCount: selected.length,
          jobs: activeJobTitles
        });
      }

      // Stage 4: Actual API call
      setCurrentStep(4);
      if (onSyncProgress) {
        onSyncProgress({
          isSyncing: true,
          currentStep: 4,
          selectedCount: selected.length,
          jobs: activeJobTitles
        });
      }

      const payload = {
        jd_ids: selected,
        connection_name: connectionName
      };

      const response = await apiPost(endpoint, payload);

      // Stage 5: Verification
      setCurrentStep(5);
      if (onSyncProgress) {
        onSyncProgress({
          isSyncing: true,
          currentStep: 5,
          selectedCount: selected.length,
          jobs: activeJobTitles
        });
      }
      await new Promise(r => setTimeout(r, 800));

      if (response.total_failed > 0 && response.total_succeeded === 0) {
        let errorMessage = "Synchronization failed at CSOD gateway";
        if (response.failed_records && response.failed_records.length > 0) {
          errorMessage = response.failed_records[0].error || errorMessage;
        } else if (response.csod_error_message) {
          errorMessage = response.csod_error_message;
        }
        throw new Error(errorMessage);
      }

      try {
        await Promise.all(selected.map(id => apiPatch(`/job_descriptions/${id}/push-to-csod`, {})));
      } catch (err) {
        console.error("Failed to update status on backend:", err);
      }

      toast.success(`Successfully synchronized ${response.total_succeeded} JDs to CSOD`, {
        id: 'push-toast',
        duration: 4000,
        icon: '🚀'
      });

      if (response.total_failed > 0) {
        toast.error(`${response.total_failed} JDs failed. Check history for details.`, { duration: 5000 });
      }

      setSelected([]);
      setIsPushing(false);
      if (refreshJDs) refreshJDs(); // Refresh list to update status
      if (onPushSuccess) onPushSuccess();
    } catch (error) {
      console.error("Push failed:", error);
      setError({
        message: error.message || "An unexpected error occurred during synchronization",
        step: currentStep,
        endpoint: currentStep === 4 ? (activeConnection?.export_type === "Bulk" ? "/bulk/process" : "/foundation/process") : "Internal Pipeline"
      });
      toast.error(`Push failed: ${error.message}`, { id: 'push-toast' });
    } finally {
      setPushStatus('idle');
      if (onSyncProgress) {
        onSyncProgress({
          isSyncing: false,
          currentStep: 0,
          selectedCount: 0,
          jobs: []
        });
      }
    }
  };

  // Helper: Sort function
  const handleSort = (column) => {
    setSortBy((prev) => {
      if (prev.column === column) {
        return {
          column,
          direction: prev.direction === "asc" ? "desc" : "asc"
        };
      }
      return { column, direction: "asc" };
    });
  };

  // Extract unique filter options dynamically from full loaded list
  const uniqueDepts = [...new Set(jds.map(jd => jd.department).filter(Boolean))].sort();
  const uniqueLocs = [...new Set(jds.map(jd => jd.location).filter(Boolean))].sort();
  const uniqueInds = [...new Set(jds.map(jd => jd.industry).filter(Boolean))].sort();

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedDeptFilter("");
    setSelectedLocFilter("");
    setSelectedIndFilter("");
    setSortBy({ column: "", direction: "asc" });
  };

  // Filter & Sort Calculations
  const filteredJDs = jds.filter((jd) => {
    const titleText = (jd.title || jd.jobTitle || jd.content?.title || "").toLowerCase();
    const deptText = (jd.department || "").toLowerCase();
    const locText = (jd.location || "").toLowerCase();
    const indText = (jd.industry || "").toLowerCase();
    const query = searchQuery.toLowerCase();

    // Check search query matches
    const matchesSearch =
      titleText.includes(query) ||
      deptText.includes(query) ||
      locText.includes(query) ||
      indText.includes(query);

    // Check advanced dropdown filters
    const matchesDept = selectedDeptFilter ? jd.department === selectedDeptFilter : true;
    const matchesLoc = selectedLocFilter ? jd.location === selectedLocFilter : true;
    const matchesInd = selectedIndFilter ? jd.industry === selectedIndFilter : true;

    return matchesSearch && matchesDept && matchesLoc && matchesInd;
  });

  const sortedJDs = [...filteredJDs].sort((a, b) => {
    if (!sortBy.column) return 0;

    let aVal = a[sortBy.column] || "";
    let bVal = b[sortBy.column] || "";

    if (sortBy.column === "title") {
      aVal = a.title || a.jobTitle || a.content?.title || "";
      bVal = b.title || b.jobTitle || b.content?.title || "";
    }

    if (typeof aVal === "string") {
      return sortBy.direction === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    } else {
      return sortBy.direction === "asc" ? aVal - bVal : bVal - aVal;
    }
  });

  // Pagination Calculations on sorted + filtered list
  const totalResults = sortedJDs.length;
  const totalPages = Math.ceil(totalResults / pageSize);
  const paginatedJDs = sortedJDs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Select All logic (restricted to the current page's eligible items)
  const eligiblePaginatedJDs = paginatedJDs.filter((jd) => getJDStatus(jd) !== 'Draft');
  const allEligibleSelectedOnPage =
    eligiblePaginatedJDs.length > 0 &&
    eligiblePaginatedJDs.every((jd) => selected.includes(jd.id));
  const someEligibleSelectedOnPage =
    eligiblePaginatedJDs.some((jd) => selected.includes(jd.id)) &&
    !allEligibleSelectedOnPage;

  const handleToggleSelectAll = () => {
    if (allEligibleSelectedOnPage) {
      // Deselect all eligible JDs on the current page
      const eligibleIds = eligiblePaginatedJDs.map((jd) => jd.id);
      setSelected((prev) => prev.filter((id) => !eligibleIds.includes(id)));
    } else {
      // Select all eligible JDs on the current page
      const eligibleIds = eligiblePaginatedJDs.map((jd) => jd.id);
      setSelected((prev) => {
        const newSelection = [...prev];
        eligibleIds.forEach((id) => {
          if (!newSelection.includes(id)) {
            newSelection.push(id);
          }
        });
        return newSelection;
      });
    }
  };

  const isFiltersActive = searchQuery || selectedDeptFilter || selectedLocFilter || selectedIndFilter || sortBy.column;

  return (
    <div className="bg-white dark:bg-[#0f172a] rounded-[1rem] border border-slate-200 dark:border-white/10 shadow-sm transition-colors duration-300 relative">

      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/30 dark:bg-white/[0.01] rounded-t-[2.5rem]">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Active Sync Queue</h2>
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest">
            Only <span className="text-blue-600 dark:text-indigo-400">Push to CSOD</span> JDs are eligible for synchronization
          </p>
        </div>

        {/* Search & Actions Panel */}
        <div className="flex items-center gap-2">
          {/* Quick Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search Job Descriptions..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-64 pl-9 pr-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-white/5 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 dark:text-white placeholder-slate-400 outline-none transition-all duration-300"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Toggle Advanced Filters Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`
              p-2.5 rounded-xl border flex items-center justify-center transition-all duration-300
              ${showFilters || isFiltersActive
                ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-blue-500'
              }
            `}
            title="Advanced Filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          {/* Reset Filters Icon */}
          {isFiltersActive && (
            <button
              onClick={handleResetFilters}
              className="p-2.5 rounded-xl border bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:text-rose-500 hover:border-rose-500 transition-all duration-300"
              title="Reset All Filters"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]"
          >
            <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Department Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Department</label>
                <select
                  value={selectedDeptFilter}
                  onChange={(e) => {
                    setSelectedDeptFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">All Departments</option>
                  {uniqueDepts.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {/* Location Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Location</label>
                <select
                  value={selectedLocFilter}
                  onChange={(e) => {
                    setSelectedLocFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">All Locations</option>
                  {uniqueLocs.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              {/* Industry Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Industry</label>
                <select
                  value={selectedIndFilter}
                  onChange={(e) => {
                    setSelectedIndFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">All Industries</option>
                  {uniqueInds.map(ind => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Real Table Layout */}
      <div className="overflow-x-auto min-w-full">
        {isLoadingJDs ? (
          <div className="px-8 py-20 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-xs">Loading queue...</p>
          </div>
        ) : sortedJDs.length === 0 ? (
          <div className="px-8 py-20 text-center">
            <div className="w-20 h-20 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Rocket className="w-10 h-10 text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest text-sm">
              {isFiltersActive ? "No matching records found" : "Your queue is empty"}
            </p>
            {isFiltersActive && (
              <button
                onClick={handleResetFilters}
                className="mt-4 px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
              >
                Clear Search & Filters
              </button>
            )}
          </div>
        ) : (
          <table className="w-full border-collapse align-middle font-sans text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">

                {/* Select All Checkbox Column */}
                <th className="pl-5 py-3 w-10">
                  <button
                    disabled={eligiblePaginatedJDs.length === 0 || isPushing}
                    onClick={handleToggleSelectAll}
                    className={`
                      w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-300
                      ${allEligibleSelectedOnPage
                        ? 'bg-blue-600 border-blue-600 shadow-md'
                        : someEligibleSelectedOnPage
                          ? 'bg-blue-400 border-blue-400 shadow-sm'
                          : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-blue-500'
                      }
                    `}
                  >
                    {allEligibleSelectedOnPage ? (
                      <Check className="w-3 h-3 text-white stroke-[4]" />
                    ) : someEligibleSelectedOnPage ? (
                      <div className="w-2 h-0.5 bg-white rounded-full" />
                    ) : null}
                  </button>
                </th>

                {/* Job Title / Role */}
                <th
                  onClick={() => handleSort("title")}
                  className="px-3 py-3 text-[9.5px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 cursor-pointer select-none group"
                >
                  <div className="flex items-center gap-1.5 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                    <span>Job Description</span>
                    <ArrowUpDown className={`w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity ${sortBy.column === "title" ? "text-blue-500 opacity-100" : ""}`} />
                  </div>
                </th>

                {/* Department */}
                <th
                  onClick={() => handleSort("department")}
                  className="px-3 py-3 text-[9.5px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 cursor-pointer select-none group"
                >
                  <div className="flex items-center gap-1.5 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                    <span>Department</span>
                    <ArrowUpDown className={`w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity ${sortBy.column === "department" ? "text-blue-500 opacity-100" : ""}`} />
                  </div>
                </th>

                {/* Location */}
                <th
                  onClick={() => handleSort("location")}
                  className="px-3 py-3 text-[9.5px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 cursor-pointer select-none group"
                >
                  <div className="flex items-center gap-1.5 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                    <span>Location</span>
                    <ArrowUpDown className={`w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity ${sortBy.column === "location" ? "text-blue-500 opacity-100" : ""}`} />
                  </div>
                </th>

                {/* Industry */}
                <th
                  onClick={() => handleSort("industry")}
                  className="px-3 py-3 text-[9.5px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 cursor-pointer select-none group"
                >
                  <div className="flex items-center gap-1.5 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                    <span>Industry</span>
                    <ArrowUpDown className={`w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity ${sortBy.column === "industry" ? "text-blue-500 opacity-100" : ""}`} />
                  </div>
                </th>

                {/* Status */}
                <th className="pr-5 py-3 text-[9.5px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 text-right">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {paginatedJDs.map((jd, index) => {
                const status = getJDStatus(jd);
                const isDraft = status === 'Draft';
                const isPushed = status === 'Pushed';
                const isFailed = status === 'Failed';
                const isSelected = selected.includes(jd.id);

                return (
                  <tr
                    key={jd.id}
                    className={`
                      transition-all duration-200
                      ${isDraft ? 'bg-slate-50/30 dark:bg-white/[0.005]' : 'hover:bg-slate-50/80 dark:hover:bg-white/[0.02]'}
                      ${isSelected ? 'bg-blue-50/30 dark:bg-blue-500/[0.03]' : ''}
                    `}
                  >
                    {/* Checkbox Column */}
                    <td className="pl-5 py-2.5">
                      <button
                        disabled={isDraft || isPushing}
                        onClick={() => toggleSelect(jd.id, isDraft)}
                        className={`
                          w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-300
                          ${isSelected
                            ? 'bg-blue-600 border-blue-600 shadow-md scale-100'
                            : isDraft
                              ? 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 cursor-not-allowed opacity-50'
                              : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-blue-500'
                          }
                        `}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white stroke-[4]" />}
                      </button>
                    </td>

                    {/* Job Title / Role Info */}
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col">
                        <span className={`font-black tracking-tight text-xs ${isDraft ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-900 dark:text-white'}`}>
                          {jd.title || jd.jobTitle || jd.content?.title || "Untitled Job Description"}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 tracking-wider mt-0.5">
                          ID: {jd.jobId || jd.id.substring(0, 8).toUpperCase()}
                        </span>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="px-3 py-2.5">
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        {jd.department || "Unassigned"}
                      </span>
                    </td>

                    {/* Location */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{jd.location || "Remote"}</span>
                      </div>
                    </td>

                    {/* Industry */}
                    <td className="px-3 py-2.5">
                      <span className={`
                        px-2 py-0.5 rounded-md text-[8.5px] font-black uppercase tracking-normal inline-block
                        ${jd.industry === 'Healthcare' ? 'bg-rose-500/10 text-rose-500' :
                          jd.industry === 'Technology' ? 'bg-blue-500/10 text-blue-500' :
                            jd.industry === 'Manufacturing' ? 'bg-amber-500/10 text-amber-500' :
                              'bg-slate-500/10 text-slate-500'}
                      `}>
                        {jd.industry || 'General'}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="pr-5 py-2.5 text-right">
                      <div className="inline-flex items-center justify-end">
                        {isPushed ? (
                          <div className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            <span className="text-[8.5px] font-black uppercase tracking-wider">Synced</span>
                          </div>
                        ) : isFailed ? (
                          <div className="flex items-center gap-1 px-2.5 py-0.5 bg-rose-500/10 text-rose-500 rounded-full border border-rose-500/20">
                            <AlertCircle className="w-3 h-3" />
                            <span className="text-[8.5px] font-black uppercase tracking-wider">Error</span>
                          </div>
                        ) : isDraft ? (
                          <div className="flex items-center gap-1 px-2.5 py-0.5 bg-slate-500/10 text-slate-500 rounded-full border border-slate-500/20">
                            <Circle className="w-3 h-3" />
                            <span className="text-[8.5px] font-black uppercase tracking-wider">Draft</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 px-2.5 py-0.5 bg-blue-500/10 text-blue-500 rounded-full border border-blue-500/20">
                            <Rocket className="w-3 h-3 animate-pulse" />
                            <span className="text-[8.5px] font-black uppercase tracking-wider">Ready</span>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      {sortedJDs.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          pageSize={pageSize}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          totalResults={totalResults}
          className="border-b border-slate-100 dark:border-white/5 rounded-none"
        />
      )}

      {/* Progress Overlay if Pushing */}
      <AnimatePresence>
        {isPushing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`px-8 py-10 border-t ${error ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20' : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-800 dark:border-slate-100'}`}
          >
            <div className="max-w-xl mx-auto space-y-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl ${error ? 'bg-rose-500 text-white shadow-rose-500/30' : 'bg-blue-600 text-white shadow-blue-600/30'}`}>
                    {error ? <AlertCircle className="w-6 h-6" /> : <Loader2 className="w-6 h-6 animate-spin" />}
                  </div>
                  <div>
                    <h3 className={`text-xl font-black tracking-tight leading-none mb-1 ${error ? 'text-rose-600 dark:text-rose-400' : ''}`}>
                      {error ? "Synchronization Failed" : "Synchronization in Progress"}
                    </h3>
                    <p className={`text-xs font-bold uppercase tracking-widest ${error ? 'text-rose-500/60' : 'opacity-60'}`}>
                      {error ? `Failed at Step ${error.step}` : 'Executing 5-Step Pipeline'}
                    </p>
                  </div>
                </div>
                {!error && <span className="text-4xl font-black opacity-20">{Math.round((currentStep / 5) * 100)}%</span>}
                {error && (
                  <button
                    onClick={() => { setIsPushing(false); setError(null); setCurrentStep(0); }}
                    className="px-4 py-2 bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-500/20 hover:bg-rose-600 transition-all active:scale-95"
                  >
                    Dismiss Error
                  </button>
                )}
              </div>

              {/* Steps Progress */}
              <div className="grid grid-cols-5 gap-3">
                {steps.map((step, idx) => {
                  const isCurrent = idx + 1 === currentStep;
                  const isCompleted = idx + 1 < currentStep;
                  const isFailed = error && isCurrent;

                  return (
                    <div key={step.name} className="space-y-3">
                      <div className={`h-2 rounded-full transition-all duration-700 ${isFailed ? 'bg-rose-500' :
                        isCompleted || (isCurrent && !error) ? 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' :
                          'bg-slate-700 dark:bg-slate-200'
                        }`} />
                      <p className={`text-[9px] font-black uppercase tracking-tighter text-center ${isFailed ? 'text-rose-500' :
                        isCurrent && !error ? 'text-blue-400' :
                          'opacity-40'
                        }`}>
                        {step.name}
                      </p>
                    </div>
                  );
                })}
              </div>

              {error ? (
                <div className="p-4 bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
                    <X className="w-4 h-4" />
                    <span>Error Detail:</span>
                  </div>
                  <p className="text-xs font-medium text-rose-500 leading-relaxed">
                    {error.message}
                  </p>
                  <div className="pt-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-rose-400/60">
                    <Database className="w-3.5 h-3.5" />
                    <span>Failed Endpoint: {error.endpoint}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3 text-sm font-bold opacity-80 pt-4">
                  <Database className="w-4 h-4 text-blue-500" />
                  <span>Processing Pipeline Step {currentStep}: {steps[currentStep - 1]?.endpoint}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Sync Actions */}
      <div className="px-6 py-5 bg-slate-50/50 dark:bg-white/[0.01] border-t border-slate-100 dark:border-white/5 flex items-center justify-between rounded-b-[2.5rem]">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <button
              onClick={handlePush}
              disabled={selected.length === 0 || isPushing || !isConnected}
              className={`
                relative overflow-hidden px-6 py-3 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all duration-500
                ${selected.length === 0 || isPushing || !isConnected
                  ? 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-white/5'
                  : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl shadow-blue-500/10 hover:shadow-blue-500/20 hover:-translate-y-1 active:translate-y-0'
                }
              `}
            >
              <div className={`absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl opacity-0 transition-opacity duration-500 ${!isConnected ? '' : 'group-hover:opacity-100'}`} />
              <span className="relative flex items-center gap-2">
                {isPushing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                {!isConnected ? 'Connection Required' : isPushing ? 'Processing Pipeline...' : 'Push JDs to CSOD'}
              </span>
            </button>

            {!isConnected && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-bold rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap shadow-xl border border-white/10 dark:border-slate-200 translate-y-2 group-hover:translate-y-0 z-[110]">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-3 h-3 text-rose-500" />
                  Please click <span className="text-blue-400 dark:text-indigo-600 font-black underline">Test Connection</span> in the banner above
                </div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-white" />
              </div>
            )}

            {selected.length === 0 && isConnected && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-bold rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap shadow-xl border border-white/10 dark:border-slate-200 translate-y-2 group-hover:translate-y-0">
                Select at least one Job Description to push
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-white" />
              </div>
            )}
          </div>

          {selected.length > 0 && !isPushing && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
              <p className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                <span className="text-blue-600 dark:text-indigo-400">{selected.length}</span> Ready for synchronization
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}