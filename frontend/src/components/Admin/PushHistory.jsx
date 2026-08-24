import { useContext, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { JDContext } from "../../context/JDContext";
import {
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RotateCcw,
  History,
  FileText,
  Database,
  Loader2,
  Search,
  SlidersHorizontal,
  X,
  ArrowUpDown,
  Download
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { listPushRecords } from "../../services/jdService";
import { BASE_URL } from "../../services/apiClient";
import { toast } from "react-hot-toast";
import Pagination from "../common/Pagination";

export default function PushHistory({ refreshTrigger }) {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.includes('/hr') ? '/hr' : '/admin';

  const { allJDs } = useContext(JDContext);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Table States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [sortBy, setSortBy] = useState({ column: "pushedAt", direction: "desc" });
  const [showFilters, setShowFilters] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [isDownloadingCSV, setIsDownloadingCSV] = useState(false);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const records = await listPushRecords();
      setHistoryRecords(records);
    } catch (err) {
      console.error("Failed to fetch push history:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [refreshTrigger]);

  // Combined History Mapping
  const combinedHistory = historyRecords.map((r) => {
    const jd = allJDs.find((j) => j.id === r.jd_id);
    return {
      ...r,
      title: jd?.title || "Unknown Job Description",
      pushedAt: r.pushed_at,
      status: r.status === 'success' ? 'completed' : 'failed'
    };
  });

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("");
    setSourceFilter("");
    setSortBy({ column: "pushedAt", direction: "desc" });
  };

  // Filter & Sort Logic
  const filteredHistory = combinedHistory.filter((item) => {
    const titleText = (item.title || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = titleText.includes(query);
    const matchesStatus = statusFilter ? item.status === statusFilter : true;
    const matchesSource = sourceFilter ? item.pipeline_type === sourceFilter : true;
    return matchesSearch && matchesStatus && matchesSource;
  });

  const sortedHistory = [...filteredHistory].sort((a, b) => {
    if (!sortBy.column) return 0;
    let aVal = a[sortBy.column] || "";
    let bVal = b[sortBy.column] || "";
    if (sortBy.column === "pushedAt") {
      return sortBy.direction === "asc"
        ? new Date(aVal) - new Date(bVal)
        : new Date(bVal) - new Date(aVal);
    }
    if (typeof aVal === "string") {
      return sortBy.direction === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    } else {
      return sortBy.direction === "asc" ? aVal - bVal : bVal - aVal;
    }
  });

  // Pagination
  const totalResults = sortedHistory.length;
  const totalPages = Math.ceil(totalResults / pageSize);
  const paginatedHistory = sortedHistory.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Sorting Handler
  const handleSort = (column) => {
    setSortBy((prev) => {
      if (prev.column === column) {
        return { column, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { column, direction: "asc" };
    });
  };

  // Friendly date formatter
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Helper to extract human-readable error from raw Python dict / JSON strings
  const extractErrorMessage = (item) => {
    const rawError = item.our_error || item.csod_error_message || item.stage_of_failure;
    if (!rawError) return "Unknown Error";

    const errorStr = String(rawError);
    if (errorStr.includes("{") && errorStr.includes("}")) {
      const matches = [...errorStr.matchAll(/['"]message['"]:\s*['"]([^'"]+)['"]/g)];
      if (matches && matches.length > 0) {
        return matches[matches.length - 1][1];
      }
    }
    return errorStr;
  };

  // Download CSV from API
  const handleDownloadCSV = async () => {
    if (isDownloadingCSV) return;
    setIsDownloadingCSV(true);
    const loadingToast = toast.loading("Generating CSV export...");
    try {
      const response = await fetch(`${BASE_URL}/csod/export-pipeline-pushes`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) throw new Error(`Export failed: ${response.status}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `csod_pipeline_pushes_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.dismiss(loadingToast);
      toast.success("CSV downloaded successfully!");
    } catch (err) {
      console.error("CSV export failed:", err);
      toast.dismiss(loadingToast);
      toast.error("Failed to download CSV. Please try again.");
    } finally {
      setIsDownloadingCSV(false);
    }
  };

  const isFiltersActive = searchQuery || statusFilter || sourceFilter || sortBy.column !== "pushedAt" || sortBy.direction !== "desc";

  return (
    <div className="bg-white dark:bg-[#0f172a] rounded-[1rem] border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden transition-colors duration-300">

      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between gap-4 font-sans bg-slate-50/30 dark:bg-white/[0.01]">
        {/* Left: Icon + Title */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-slate-100 dark:bg-white/5 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
            <History className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight leading-none">Push History</h2>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 font-bold uppercase tracking-wider truncate">Track and manage your JD synchronizations</p>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search Push History..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-44 pl-8 pr-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-white/5 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 dark:text-white placeholder-slate-400 outline-none transition-all duration-200"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-xl border flex items-center justify-center transition-all duration-200 ${showFilters || isFiltersActive ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:border-blue-400'}`}
            title="Advanced Filters"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>

          {/* Reset */}
          {isFiltersActive && (
            <button onClick={handleResetFilters} className="p-2 rounded-xl border bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 hover:text-rose-500 hover:border-rose-400 transition-all duration-200" title="Reset Filters">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Records Badge */}
          <div className="px-2.5 py-1 bg-slate-100 dark:bg-white/10 rounded-full text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            {filteredHistory.length} Records
          </div>

          {/* Download CSV */}
          <button
            onClick={handleDownloadCSV}
            disabled={isDownloadingCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm"
            title="Download CSV"
          >
            {isDownloadingCSV ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>{isDownloadingCSV ? "Exporting..." : "Download CSV"}</span>
          </button>
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
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2.5 text-xs font-bold rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Sync Source</label>
                <select
                  value={sourceFilter}
                  onChange={(e) => { setSourceFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2.5 text-xs font-bold rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">All Sources</option>
                  <option value="bulk">Bulk Pipeline</option>
                  <option value="foundation">Foundation Pipeline</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table Section */}
      <div className="overflow-x-auto font-sans">
        <table className="w-full text-left border-collapse align-middle">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
              <th
                onClick={() => handleSort("title")}
                className="pl-6 px-3 py-3 text-[9.5px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 cursor-pointer select-none group"
              >
                <div className="flex items-center gap-1.5 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                  <span>JD Title</span>
                  <ArrowUpDown className={`w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity ${sortBy.column === "title" ? "text-blue-500 opacity-100" : ""}`} />
                </div>
              </th>

              <th
                onClick={() => handleSort("pipeline_type")}
                className="px-3 py-3 text-[9.5px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 cursor-pointer select-none group"
              >
                <div className="flex items-center gap-1.5 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                  <span>Sync Source</span>
                  <ArrowUpDown className={`w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity ${sortBy.column === "pipeline_type" ? "text-blue-500 opacity-100" : ""}`} />
                </div>
              </th>

              <th
                onClick={() => handleSort("status")}
                className="px-3 py-3 text-[9.5px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 cursor-pointer select-none group"
              >
                <div className="flex items-center gap-1.5 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                  <span>Status</span>
                  <ArrowUpDown className={`w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity ${sortBy.column === "status" ? "text-blue-500 opacity-100" : ""}`} />
                </div>
              </th>

              <th
                onClick={() => handleSort("pushedAt")}
                className="px-3 py-3 text-[9.5px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 cursor-pointer select-none group"
              >
                <div className="flex items-center gap-1.5 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                  <span>Pushed At</span>
                  <ArrowUpDown className={`w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity ${sortBy.column === "pushedAt" ? "text-blue-500 opacity-100" : ""}`} />
                </div>
              </th>

              <th className="pr-6 py-3 text-[9.5px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {isLoading ? (
              <tr>
                <td colSpan="5" className="px-8 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Fetching sync history...</span>
                  </div>
                </td>
              </tr>
            ) : sortedHistory.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-8 py-16 text-center text-slate-500 italic">
                  {isFiltersActive ? "No matching history logs found" : "No synchronization history found"}
                </td>
              </tr>
            ) : (
              paginatedHistory.map((item, index) => {
                const isFailed = item.status === 'failed';
                return (
                  <tr
                    key={item.id || index}
                    className="group transition-colors duration-200 hover:bg-slate-50/50 dark:hover:bg-white/[0.02]"
                  >
                    {/* JD Title */}
                    <td className="pl-6 px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-blue-50 dark:bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500 dark:text-blue-400 shrink-0">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white truncate max-w-[150px] text-xs">{item.title || "Untitled Job Description"}</span>
                      </div>
                    </td>

                    {/* Sync Source */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        <Database className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.pipeline_type === 'bulk' ? "Bulk" : "Foundation"}</span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-3 py-3">
                      {isFailed ? (
                        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-full border border-rose-100 dark:border-rose-500/20">
                          <AlertCircle className="w-3 h-3" />
                          <span className="text-[8.5px] font-black uppercase tracking-wider">Failed</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-100 dark:border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          <span className="text-[8.5px] font-black uppercase tracking-wider">Completed</span>
                        </div>
                      )}
                    </td>

                    {/* Timestamp */}
                    <td className="px-3 py-3 text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">
                      {formatDate(item.pushedAt)}
                    </td>

                    {/* Actions */}
                    <td className="pr-6 py-3 text-right">
                      {isFailed ? (
                        <div className="flex justify-end max-w-[250px] ml-auto">
                          <span className="text-[10px] font-medium text-rose-500 text-right leading-relaxed whitespace-normal break-words">
                            {extractErrorMessage(item)}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            const ouRefId = item.ou_ref_id || item.csod_ou_id;
                            if (ouRefId) {
                              navigate(`${basePath}/csod-jd/${ouRefId}`);
                            } else {
                              toast.error("No Cornerstone Org Unit ID (OU ID) associated with this sync record.");
                            }
                          }}
                          className="inline-flex items-center gap-1 text-blue-600 dark:text-indigo-400 hover:text-blue-700 dark:hover:text-indigo-300 font-black text-[10.5px] transition-colors uppercase tracking-wider"
                        >
                          View in CSOD
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {sortedHistory.length > 0 && (
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
        />
      )}
    </div>
  );
}