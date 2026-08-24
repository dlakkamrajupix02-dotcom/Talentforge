import { useState, useContext, useEffect } from "react";
import { useLocation } from "react-router-dom";
import CSODConnection from "../../components/Admin/CSODConnection";
import PushJDList from "../../components/Admin/PushJDList";
import PushHistory from "../../components/Admin/PushHistory";
import BulkImportSaba from "../../components/Admin/BulkImportSaba";
import { JDContext } from "../../context/JDContext";
import { listPushRecords, listJDIds, getJDById } from "../../services/jdService";
import {
  ChevronDown,
  ChevronUp,
  Settings2,
  Info,
  Database,
  CloudUpload,
  ChevronRight,
  Zap,
  LayoutGrid,
  History,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  FileText,
  MapPin,
  Building,
  X,
  Wifi,
  Cpu,
  RefreshCw,
  Server,
  Workflow
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function PushToCSOD() {
  const { pushQueue } = useContext(JDContext);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialMode = searchParams.get("mode") || "sync";

  const [activeMode, setActiveMode] = useState(initialMode); // 'import' | 'sync'
  
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const mode = params.get("mode");
    if (mode && (mode === "sync" || mode === "import")) {
      setActiveMode(mode);
    }
  }, [location.search]);

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editData, setEditData] = useState(null);
  const [activeConnection, setActiveConnection] = useState(null);
  const isConnected = !!activeConnection && activeConnection.status === 'connected';

  // Sub-tabs within "Push to CSOD" view
  const [activeSubTab, setActiveSubTab] = useState("queue"); // 'queue' | 'history'

  // Sync Progress Tracking State
  const [syncProgress, setSyncProgress] = useState({
    isSyncing: false,
    currentStep: 0,
    selectedCount: 0,
    jobs: []
  });

  // History stats state
  const [historyCount, setHistoryCount] = useState({ success: 0, failed: 0, total: 0 });
  const [jds, setJds] = useState([]);
  const [isLoadingJDs, setIsLoadingJDs] = useState(true);

  const fetchHistoryStats = async () => {
    try {
      const records = await listPushRecords();
      const allSuccess = records.filter(r => r.status === 'success' || r.status === 'completed').length;
      const allFailed = records.filter(r => r.status === 'failed' || r.status === 'error').length;
      // Sort by most recent to get the last push status
      const sorted = [...records].sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));
      const lastStatus = sorted[0]?.status || null;
      const lastPushOk = lastStatus === 'success' || lastStatus === 'completed';
      setHistoryCount({
        success: allSuccess,
        failed: allFailed,
        total: records.length,
        lastPushStatus: sorted[0] ? (lastPushOk ? 'success' : 'failed') : null,
      });
    } catch (err) {
      console.error("Failed to fetch history stats:", err);
    }
  };

  const fetchJDs = async () => {
    setIsLoadingJDs(true);
    try {
      const jdList = await listJDIds("push_to_csod");
      const eligibleJDs = jdList.filter(item => item.status === "push_to_csod");
      const detailedJDs = await Promise.all(
        eligibleJDs.map(async (item) => {
          try {
            const details = await getJDById(item.jd_id);
            return {
              ...details,
              status: details.status || item.status,
              pushedToCSOD: item.status === "pushed_to_csod" || details.status === "pushed_to_csod"
            };
          } catch (e) {
            console.error(`Failed to fetch details for ${item.jd_id}`, e);
            return null;
          }
        })
      );
      const validJDs = detailedJDs
        .filter(Boolean)
        .filter((jd) => jd.status === "push_to_csod");
      setJds(validJDs);
    } catch (err) {
      console.error("Failed to load JDs for sync queue:", err);
    } finally {
      setIsLoadingJDs(false);
    }
  };

  useEffect(() => {
    const mode = new URLSearchParams(location.search).get("mode");
    if (mode === "sync" || mode === "import") {
      setActiveMode(mode);
    }
  }, [location.search]);

  useEffect(() => {
    if (activeMode === "sync") {
      fetchHistoryStats();
      fetchJDs();
    }
  }, [activeMode, refreshTrigger]);

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
    setEditData(null);
  };

  // Only show JDs that are actually in the push queue
  const displayJDs = jds || [];

  // Compute Queue statistics
  const uniqueDepts = [...new Set(displayJDs.map(j => j.department).filter(Boolean))];
  const uniqueLocs = [...new Set(displayJDs.map(j => j.location).filter(Boolean))];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] pb-20 transition-colors duration-500 overflow-x-hidden">
      {/* Inline styles for custom premium CSS animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes marchRight {
          to {
            stroke-dashoffset: -20;
          }
        }
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .flow-line-active {
          stroke-dasharray: 6, 6;
          animation: marchRight 0.8s linear infinite;
        }
        .flow-line-idle {
          stroke-dasharray: 6, 6;
          animation: marchRight 4s linear infinite;
        }
        .animate-spin-slow {
          animation: spinSlow 12s linear infinite;
        }
        .animate-spin-fast {
          animation: spinSlow 2s linear infinite;
        }
      `}} />

      {/* Dynamic Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/10 dark:bg-blue-600/5 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 -left-24 w-72 h-72 bg-purple-500/10 dark:bg-purple-600/5 rounded-full blur-[100px]" />
      </div>

      {/* Header Section */}
      <div className="relative z-10 bg-white/85 dark:bg-[#020617]/85 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 mb-6 sticky top-0 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-900 dark:bg-white rounded-xl flex items-center justify-center text-white dark:text-slate-900 shadow-xl transition-transform hover:rotate-3">
                <Workflow className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">Synchronization</h1>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">Enterprise Pipeline</p>
              </div>
            </div>

            {/* Premium Mode Toggle */}
            <div className="flex p-1 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 relative w-fit self-start md:self-center shadow-inner">
              <motion.div
                layoutId="activeToggle"
                className="absolute inset-1 bg-white dark:bg-white/10 rounded-lg shadow-md ring-1 ring-slate-200 dark:ring-white/10"
                initial={false}
                animate={{ x: activeMode === "sync" ? 0 : "100%" }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                style={{ width: "calc(50% - 4px)" }}
              />

              <button
                onClick={() => setActiveMode("sync")}
                className={`relative z-10 flex items-center gap-2 px-4 py-1.5 text-[11px] font-black uppercase tracking-wider transition-colors duration-300 ${activeMode === 'sync' ? 'text-blue-600 dark:text-white' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Push to CSOD
              </button>

              <button
                onClick={() => setActiveMode("import")}
                className={`relative z-10 flex items-center gap-2 px-4 py-1.5 text-[11px] font-black uppercase tracking-wider transition-colors duration-300 ${activeMode === 'import' ? 'text-blue-600 dark:text-white' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Zap className="w-3.5 h-3.5" />
                JD Import
              </button>

            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <AnimatePresence mode="wait">
          {activeMode === "sync" ? (
            <motion.div
              key="sync-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35 }}
              className="space-y-6"
            >

              {/* LIVE ENTERPRISE PIPELINE CANVAS */}
              <div className="bg-slate-900 dark:bg-[#070b13] text-white rounded-[2.5rem] border border-slate-800 p-8 shadow-2xl relative overflow-hidden transition-all duration-500">
                {/* Ambient Grid Overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

                {/* Background Spotlights */}
                <div className={`absolute top-1/2 left-1/4 -translate-y-1/2 w-48 h-48 rounded-full blur-[80px] pointer-events-none transition-colors duration-500 ${syncProgress.isSyncing ? 'bg-blue-500/20' : 'bg-blue-500/10'}`} />
                <div className={`absolute top-1/2 right-1/4 -translate-y-1/2 w-48 h-48 rounded-full blur-[80px] pointer-events-none transition-colors duration-500 ${syncProgress.isSyncing ? 'bg-emerald-500/20' : 'bg-emerald-500/10'}`} />

                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">

                  {/* Node 1: PDF Import Source Hub */}
                  <div className="flex flex-col items-center text-center space-y-3 min-w-[150px]">
                    <div className={`
                      w-16 h-16 border rounded-full flex items-center justify-center shadow-lg relative group transition-all duration-300 hover:scale-105
                      ${syncProgress.isSyncing
                        ? 'bg-blue-500/20 border-blue-400 shadow-blue-500/20'
                        : 'bg-blue-500/10 border-blue-500/30'
                      }
                    `}>
                      <div className={`absolute inset-0.5 rounded-full bg-blue-500/5 ${syncProgress.isSyncing ? 'animate-ping' : ''}`} />
                      <CloudUpload className={`w-8 h-8 transition-colors ${syncProgress.isSyncing ? 'text-blue-300' : 'text-blue-400'}`} />
                      {/* Queue Count Badge */}
                      <span className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md">
                        {displayJDs.length}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">PDF Import Hub</h4>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5">Ingested JDs Ready</p>
                    </div>
                  </div>

                  {/* Flow Vector 1 (Wavy Cubic Bezier) */}
                  <div className="hidden lg:block flex-1 max-w-[200px] h-10 relative">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 160 40">
                      <path
                        d="M 10,20 C 45,5 115,35 150,20"
                        fill="none"
                        stroke="#334155"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      <path
                        d="M 10,20 C 45,5 115,35 150,20"
                        fill="none"
                        stroke="#60a5fa"
                        strokeWidth="3"
                        strokeLinecap="round"
                        className={syncProgress.isSyncing ? "flow-line-active" : displayJDs.length > 0 ? "flow-line-idle" : "hidden"}
                      />
                    </svg>
                  </div>

                  {/* Node 2: Core Processing & Mapping Engine */}
                  <div className="flex flex-col items-center text-center space-y-3 min-w-[150px]">
                    <div className={`
                      w-16 h-16 border rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-105
                      ${syncProgress.isSyncing
                        ? 'bg-purple-500/20 border-purple-400 shadow-purple-500/20'
                        : 'bg-purple-500/10 border-purple-500/30'
                      }
                    `}>
                      <Cpu className={`w-8 h-8 text-purple-400 ${syncProgress.isSyncing ? 'animate-spin-fast' : isConnected ? 'animate-spin-slow' : ''}`} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">Sync Processor</h4>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5">Validation & Auth</p>
                    </div>
                  </div>

                  {/* Flow Vector 2 (Wavy Cubic Bezier) */}
                  <div className="hidden lg:block flex-1 max-w-[200px] h-10 relative">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 160 40">
                      <path
                        d="M 10,20 C 45,35 115,5 150,20"
                        fill="none"
                        stroke="#334155"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      <path
                        d="M 10,20 C 45,35 115,5 150,20"
                        fill="none"
                        stroke="#34d399"
                        strokeWidth="3"
                        strokeLinecap="round"
                        className={syncProgress.isSyncing ? "flow-line-active" : isConnected ? "flow-line-idle" : "hidden"}
                      />
                    </svg>
                  </div>

                  {/* Node 3: Cornerstone Gateway Target */}
                  <div className="flex flex-col items-center text-center space-y-3 min-w-[150px]">
                    <div className={`
                      w-16 h-16 rounded-full flex items-center justify-center shadow-lg relative transition-all duration-300 hover:scale-105
                      ${isConnected
                        ? "bg-emerald-500/10 border border-emerald-500/30"
                        : "bg-rose-500/10 border border-rose-500/30"
                      }
                    `}>
                      {isConnected ? (
                        <>
                          <div className="absolute inset-0.5 rounded-full bg-emerald-500/5 animate-pulse" />
                          <Server className="w-8 h-8 text-emerald-400" />
                        </>
                      ) : (
                        <Server className="w-8 h-8 text-rose-400" />
                      )}

                      {/* Connection status light */}
                      <span className={`
                        absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 shadow-md animate-pulse
                        ${isConnected ? "bg-emerald-500" : "bg-rose-500"}
                      `} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">CSOD Gateway</h4>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                        {isConnected ? activeConnection.connection_name : "Not Connected"}
                      </p>
                    </div>
                  </div>

                </div>

                {/* Live Sync Progress Dashboard Overlay */}
                <AnimatePresence>
                  {syncProgress.isSyncing && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: "auto", marginTop: 24 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden w-full bg-slate-950/65 rounded-3xl border border-slate-800/80 p-6 space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/50 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-ping" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 leading-none">Transmission In Progress</span>
                        </div>
                        <div className="text-[10px] font-bold text-slate-300 text-left sm:text-right max-w-md line-clamp-1">
                          Active: <span className="font-black text-white">{syncProgress.jobs.join(", ")}</span>
                        </div>
                      </div>

                      {/* Interactive Pipelines Horizontal Stepper */}
                      <div className="grid grid-cols-5 gap-3 pt-1">
                        {[
                          { step: 1, name: "Validation" },
                          { step: 2, name: "Authentication" },
                          { step: 3, name: "Data Mapping" },
                          { step: 4, name: "CSOD Pipeline" },
                          { step: 5, name: "Verification" }
                        ].map((s) => {
                          const isDone = syncProgress.currentStep > s.step;
                          const isActive = syncProgress.currentStep === s.step;
                          return (
                            <div key={s.step} className="flex flex-col items-center space-y-2">
                              <div className="h-2 w-full rounded-full transition-all duration-500 relative overflow-hidden bg-slate-800">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${isDone ? "bg-emerald-500 w-full shadow-[0_0_8px_#10b981]" : isActive ? "bg-blue-500 w-1/2 animate-pulse shadow-[0_0_8px_#3b82f6]" : "w-0"}`}
                                />
                              </div>
                              <span className={`text-[9px] font-black uppercase tracking-wider transition-colors duration-300 ${isDone ? "text-emerald-400" : isActive ? "text-blue-400 animate-pulse" : "text-slate-500"}`}>
                                {s.name}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Pipeline Stats Footer */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800/80 text-center">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Pipeline Latency</span>
                    <p className="text-xs font-black text-slate-200 uppercase">{isConnected ? "120ms" : "Offline"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Last Push</span>
                    <p className={`text-xs font-black uppercase ${historyCount.lastPushStatus === 'success' ? 'text-emerald-400' : historyCount.lastPushStatus === 'failed' ? 'text-rose-400' : 'text-slate-500'}`}>
                      {historyCount.lastPushStatus === 'success' ? 'Completed' : historyCount.lastPushStatus === 'failed' ? 'Failed' : 'No Data'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Synced Log</span>
                    <p className="text-xs font-black text-slate-200 uppercase">{historyCount.total} Records</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Validation Level</span>
                    <p className="text-xs font-black text-blue-400 uppercase">High Security</p>
                  </div>
                </div>

              </div>

              {/* 2-Column Dashboard Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                {/* LEFT SIDEBAR: Connection Settings & Sync Analytics */}
                <div className="space-y-6 lg:col-span-1 lg:sticky lg:top-24">
                  {/* Connection Card (The main controller, fully visible on the screen) */}
                  <CSODConnection
                    onSaveSuccess={triggerRefresh}
                    onStatusChange={setActiveConnection}
                    activeConnection={activeConnection}
                    editData={editData}
                    onCancel={() => setEditData(null)}
                  />

                  {/* Active Queue Statistics Widget */}
                  <div className="bg-white dark:bg-[#0f172a] rounded-[1rem] border border-slate-200 dark:border-white/10 p-6 shadow-sm space-y-5">
                    <div>
                      <h4 className="font-black text-xs uppercase tracking-widest text-slate-400">Queue Analytics</h4>
                      <p className="text-[10px] font-bold text-slate-500 mt-0.5 uppercase">Breakdown of pending synchronizations</p>
                    </div>

                    <div className="space-y-4">
                      {/* Depts count */}
                      <div className="p-3.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-600">
                            <Building className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Departments</span>
                        </div>
                        <span className="text-xs font-black bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2.5 py-0.5 rounded-full">{uniqueDepts.length}</span>
                      </div>

                      {/* Locations count */}
                      <div className="p-3.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-600">
                            <MapPin className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Locations</span>
                        </div>
                        <span className="text-xs font-black bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full">{uniqueLocs.length}</span>
                      </div>
                    </div>

                    {/* Progress Bar of Pipeline */}
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <span>Pipeline health</span>
                        <span className={isConnected ? "text-emerald-500" : "text-rose-500"}>{isConnected ? "Operational" : "Disconnected"}</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${isConnected ? "bg-emerald-500 w-full" : "bg-slate-300 dark:bg-slate-700 w-1/4"}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: Interactive Tabbed Panel (2/3 Width Workspace) */}
                <div className="lg:col-span-2 space-y-6">

                  {/* Modern Toolbar Header */}
                  <div className="flex p-1 bg-white dark:bg-[#0f172a] rounded-[1rem] border border-slate-200 dark:border-white/10 shadow-sm relative w-fit shadow-inner">
                    <div className="flex p-1 bg-slate-100 dark:bg-white/5 rounded-xl relative w-fit">
                      <motion.div
                        layoutId="subTabToggle"
                        className="absolute inset-1 bg-white dark:bg-white/10 rounded-lg shadow-md ring-1 ring-slate-200 dark:ring-white/10"
                        initial={false}
                        animate={{ x: activeSubTab === "queue" ? 0 : "100%" }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        style={{ width: "calc(50% - 4px)" }}
                      />

                      <button
                        onClick={() => setActiveSubTab("queue")}
                        className={`relative z-10 flex items-center gap-2 px-5 py-2 text-[11px] font-black uppercase tracking-wider transition-colors duration-300 ${activeSubTab === 'queue' ? 'text-blue-600 dark:text-white' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        Active Queue
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full transition-colors ${activeSubTab === 'queue' ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'bg-slate-200 dark:bg-white/5 text-slate-500'}`}>
                          {displayJDs.length}
                        </span>
                      </button>

                      <button
                        onClick={() => setActiveSubTab("history")}
                        className={`relative z-10 flex items-center gap-2 px-5 py-2 text-[11px] font-black uppercase tracking-wider transition-colors duration-300 ${activeSubTab === 'history' ? 'text-blue-600 dark:text-white' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        <History className="w-3.5 h-3.5" />
                        Sync History
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full transition-colors ${activeSubTab === 'history' ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'bg-slate-200 dark:bg-white/5 text-slate-500'}`}>
                          {historyCount.total}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Main Table View Panel */}
                  <div className="w-full">
                    <AnimatePresence mode="wait">
                      {activeSubTab === "queue" ? (
                        <motion.div
                          key="queue-panel"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                        >
                          <PushJDList
                            onPushSuccess={triggerRefresh}
                            isConnected={isConnected}
                            activeConnection={activeConnection}
                            onSyncProgress={setSyncProgress}
                            jds={jds}
                            isLoadingJDs={isLoadingJDs}
                            refreshJDs={fetchJDs}
                          />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="history-panel"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                        >
                          <PushHistory
                            refreshTrigger={refreshTrigger}
                            onEdit={setEditData}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                </div>

              </div>

            </motion.div>
          ) : (
            <motion.div
              key="import-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35 }}
            >
              <BulkImportSaba />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
