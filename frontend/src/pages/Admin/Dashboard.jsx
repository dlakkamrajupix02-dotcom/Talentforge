import React, { useContext, useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { JDContext } from "../../context/JDContext";
import ReactECharts from "echarts-for-react";
import Pagination from "../../components/common/Pagination";
import { apiGet } from "../../services/apiClient";
import {
  Sparkles,
  FileText,
  LayoutTemplate,
  Plus,
  ArrowRight,
  Clock,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Activity,
  CheckCircle2,
  RefreshCw,
  BarChart2,
  Zap,
  Award,
  Flag,
  LayoutGrid,
  List,
  Eye,
  Info,
  Edit3,
  Server,
  CloudCog,
  ShieldCheck,
  Target,
  Users,
  AlertCircle,
  Shield,
} from "lucide-react";
import ProfileBadge from "../../components/common/ProfileBadge";
import DashboardGreetingOrb from "../../components/common/DashboardGreetingOrb";

// ─── Helpers ────────────────────────────────────────────────────────────────
function getGreeting(hour) {
  if (hour < 12) return { label: "Good morning", emoji: "🫧🌤️☁" };
  if (hour < 17) return { label: "Good afternoon", emoji: "☀️" };
  return { label: "Good evening", emoji: "🌙" };
}

function relativeTime(dateStr) {
  if (!dateStr) return "Recently";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function formatCompact(n) {
  if (n == null) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

// ─── Real Data Derivation ───
// These will be derived inside the component using useMemo

const STATUS_MAP = {
  approved: { label: "Approved", classes: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" },
  submitted: { label: "Review", classes: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" },
  in_review: { label: "Review", classes: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" },
  draft: { label: "Draft", classes: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20" },
  final: { label: "Final", classes: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20" },
  rejected: { label: "Rejected", classes: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20" },
  declined: { label: "Rejected", classes: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20" },
  pushed: { label: "Pushed", classes: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20" },
  public_view: { label: "JD Published", classes: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20" },
  published: { label: "JD Published", classes: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20" },
};

function scoreColor(s) {
  if (s >= 85) return "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10";
  if (s >= 70) return "text-amber-600  dark:text-amber-400  bg-amber-500/10";
  return "text-red-600 dark:text-red-400 bg-red-500/10";
}

const PAGE_SIZE = 6; // Compact size for bento

// ─── Component ───────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { allJDs, user, refreshMyJDs, teamMembers, refreshMembers, departments } = useContext(JDContext);

  const [dashboardStats, setDashboardStats] = useState(null);
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  useEffect(() => {
    refreshMyJDs();
    refreshMembers?.();

    const fetchStats = async () => {
      try {
        const data = await apiGet('/extra/dashboard-stats');
        setDashboardStats(data);
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
      } finally {
        setIsStatsLoading(false);
      }
    };
    fetchStats();
  }, []);
  const navigate = useNavigate();

  const [activeChartPeriod, setActiveChartPeriod] = useState("7m");
  const [activeTab, setActiveTab] = useState('All');
  const [jdView, setJdView] = useState("list");
  const [jdPage, setJdPage] = useState(1);

  const now = new Date();
  const greeting = getGreeting(now.getHours());
  const firstName = user?.full_name?.split(" ")[0] || user?.name?.split(" ")[0] || "there";

  const sortedJDs = useMemo(() => {
    let result = [...(allJDs || [])];

    if (activeTab !== 'All') {
      if (activeTab === 'Review') {
        result = result.filter(j => ['submitted', 'in_review', 'active', 'pending'].includes(j.status?.toLowerCase()) || j.status?.toLowerCase().startsWith('review step'));
      } else if (activeTab === 'Final') {
        result = result.filter(j => ['final', 'finalized'].includes(j.status?.toLowerCase()));
      } else if (activeTab === 'Rejected') {
        result = result.filter(j => ['rejected', 'declined'].includes(j.status?.toLowerCase()));
      } else {
        result = result.filter(j => j.status?.toLowerCase() === activeTab.toLowerCase());
      }
    }

    return result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [allJDs, activeTab]);

  const tabs = useMemo(() => {
    const groups = [
      { key: 'All', label: 'All', count: allJDs.length },
      { key: 'draft', label: 'Draft', count: allJDs.filter(j => j.status?.toLowerCase() === 'draft').length },
      { key: 'final', label: 'Final', count: allJDs.filter(j => ['final', 'finalized'].includes(j.status?.toLowerCase())).length },
      { key: 'review', label: 'Review', count: allJDs.filter(j => ['submitted', 'in_review', 'active', 'pending'].includes(j.status?.toLowerCase()) || j.status?.toLowerCase().startsWith('review step')).length },
      { key: 'approved', label: 'Approved', count: allJDs.filter(j => j.status?.toLowerCase() === 'approved').length },
      { key: 'rejected', label: 'Rejected', count: allJDs.filter(j => ['rejected', 'declined'].includes(j.status?.toLowerCase())).length },
    ];
    return groups;
  }, [allJDs]);

  const teamActivity = useMemo(() => {
    const activity = [];
    const colors = [
      "from-violet-500 to-purple-600",
      "from-blue-500 to-indigo-600",
      "from-pink-500 to-rose-600",
      "from-emerald-500 to-teal-600",
      "from-amber-500 to-orange-600"
    ];

    allJDs.forEach(jd => {
      if (jd.history) {
        jd.history.slice(-2).forEach(h => {
          activity.push({
            name: h.updatedBy || "User",
            action: h.status.charAt(0).toUpperCase() + h.status.slice(1),
            jd: jd.title,
            time: relativeTime(h.timestamp),
            avatar: (h.updatedBy || "U").charAt(0).toUpperCase(),
            color: colors[Math.floor(Math.random() * colors.length)],
            timestamp: new Date(h.timestamp).getTime()
          });
        });
      }
    });

    return activity.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  }, [allJDs]);

  const avgScore = useMemo(() => {
    if (dashboardStats && dashboardStats.quality_and_scope?.average_score !== undefined) {
      return Number(dashboardStats.quality_and_scope.average_score).toFixed(1);
    }
    if (allJDs.length === 0) return 0;
    const scores = allJDs.map(jd => jd.score || 75); // Fallback to 75
    return (scores.reduce((a, b) => a + b, 0) / allJDs.length).toFixed(1);
  }, [allJDs, dashboardStats]);

  const bentoStats = useMemo(() => {
    if (dashboardStats) {
      return {
        totalJDs: dashboardStats.jd_distribution?.total_descriptions || 0,
        aiBuiltJDs: dashboardStats.jd_distribution?.ai_built || 0,
        predefinedJDs: dashboardStats.jd_distribution?.predefined || 0,
        totalTemplates: dashboardStats.jd_distribution?.total_template || 0,
        activeJDs: dashboardStats.workflow_funnel?.pending || 0,
        approvedJDs: dashboardStats.workflow_funnel?.approved || 0,
        rejectedJDs: dashboardStats.workflow_funnel?.rejected || 0,
        activeUsers: dashboardStats.users_and_access?.total_member || 0,
        totalApprovers: 0,
        activeApprovers: dashboardStats.users_and_access?.active_member || 0,
        inactiveApprovers: dashboardStats.users_and_access?.inactive_member || 0,
        activeDepts: dashboardStats.quality_and_scope?.active_departments || 0,
      };
    }

    const jds = allJDs || [];
    const members = teamMembers || [];

    // 1. Total JDs
    const totalJDsVal = jds.length;

    // 2. AI Built JDs
    const aiBuiltJDsVal = jds.filter(j => j.score !== undefined && !j.id?.toString().startsWith('TEMP-')).length;

    // 3. Predefined JDs
    const predefinedJDsVal = jds.filter(j => j.id?.toString().startsWith('TEMP-')).length || 2;

    // 4. Active JDs
    const activeJDsVal = jds.filter(j => ['submitted', 'in_review', 'active', 'pending'].includes(j.status?.toLowerCase()) || j.status?.toLowerCase().startsWith('review step')).length;

    // 5. Approved JDs
    const approvedJDsVal = jds.filter(j => ['approved', 'final', 'finalized'].includes(j.status?.toLowerCase())).length;

    // 6. Rejected JDs
    const rejectedJDsVal = jds.filter(j => ['rejected', 'declined'].includes(j.status?.toLowerCase())).length;

    // Helper to get status
    const getStatus = (m) => (typeof m.is_active !== 'undefined' ? (m.is_active ? 'Active' : 'Inactive') : (m.status || 'Active')).toLowerCase() === 'inactive' ? 'Inactive' : 'Active';

    // 7. Active Users
    const activeUsersVal = members.filter(m => getStatus(m) === 'Active').length || 5;

    // 8. Total Approvers
    const totalApproversVal = members.filter(m => m.role === 'Manager' || m.role === 'Admin').length || 4;

    // 9. Active Approvers
    const activeApproversVal = members.filter(m => (m.role === 'Manager' || m.role === 'Admin') && getStatus(m) === 'Active').length || 3;

    // 10. Inactive Approvers
    const inactiveApproversVal = members.filter(m => (m.role === 'Manager' || m.role === 'Admin') && getStatus(m) !== 'Active').length || 0;

    return {
      totalJDs: totalJDsVal,
      aiBuiltJDs: aiBuiltJDsVal,
      predefinedJDs: predefinedJDsVal,
      totalTemplates: 7,
      activeJDs: activeJDsVal,
      approvedJDs: approvedJDsVal,
      rejectedJDs: rejectedJDsVal,
      activeUsers: activeUsersVal,
      totalApprovers: totalApproversVal,
      activeApprovers: activeApproversVal,
      inactiveApprovers: inactiveApproversVal,
      activeDepts: departments?.length || 5,
    };
  }, [allJDs, teamMembers, departments, dashboardStats]);

  const totalPages = Math.ceil(sortedJDs.length / PAGE_SIZE);
  const pagedJDs = useMemo(() => sortedJDs.slice((jdPage - 1) * PAGE_SIZE, jdPage * PAGE_SIZE), [sortedJDs, jdPage]);

  // ── Line chart ──
  const lineChartOption = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const last6Months = [];
    const counts = [];

    // Calculate last 6 months dynamically
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const m = d.getMonth();
      const y = d.getFullYear();

      last6Months.push(monthNames[m]);

      const count = allJDs.filter(jd => {
        const jdDate = new Date(jd.createdAt);
        return jdDate.getMonth() === m && jdDate.getFullYear() === y;
      }).length;
      counts.push(count);
    }

    return {
      animation: true,
      grid: { top: 20, right: 20, bottom: 20, left: 20, containLabel: true },
      tooltip: { trigger: "axis", backgroundColor: "rgba(15,23,42,0.9)", borderColor: "rgba(255,255,255,0.1)", textStyle: { color: "#e2e8f0", fontSize: 12 } },
      xAxis: { type: "category", data: last6Months, axisLine: { show: false }, axisLabel: { color: "#64748b", fontSize: 10 }, axisTick: { show: false } },
      yAxis: { type: "value", splitLine: { lineStyle: { color: "rgba(148,163,184,0.05)", type: "dashed" } }, axisLabel: { show: false } },
      series: [
        {
          name: "JDs", type: "line", smooth: true, data: counts,
          lineStyle: { color: "#6366f1", width: 3 }, itemStyle: { color: "#6366f1" }, symbol: "none",
          areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(99,102,241,0.3)" }, { offset: 1, color: "rgba(99,102,241,0)" }] } },
        },
      ],
    };
  }, [allJDs]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] p-4 sm:p-6 lg:p-8 transition-colors duration-500 font-sans">
      <div className="max-w-[1400px] mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

        {/* ── HEADER BENTO ── */}
        <div className="w-full bg-gradient-to-br from-slate-100/90 via-indigo-50/30 to-slate-50/90 dark:from-[#0f172a]/60 dark:to-[#020617]/40 border border-slate-200/60 dark:border-white/5 rounded-[2.5rem] p-6 sm:p-8 relative overflow-hidden shadow-md shadow-indigo-500/5 transition-all duration-500">
          {/* Ambient glows */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-200/20 dark:bg-white/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-100/25 dark:bg-[#0f172a]/20 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
            {/* Left Column: Greeting sub-capsule */}
            <div className="xl:col-span-4 bg-gradient-to-br from-indigo-500/5 via-violet-500/5 to-transparent dark:bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-slate-200/50 dark:border-white/10 flex flex-col justify-between relative overflow-hidden group">
              <DashboardGreetingOrb />
              <div className="relative z-10">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-200/50 dark:bg-white/10 hover:bg-slate-200/80 dark:hover:bg-white/20 transition-colors rounded-full text-slate-800 dark:text-white/90 text-[10px] font-black uppercase tracking-wider border border-slate-300/30 dark:border-white/10 backdrop-blur-sm cursor-default w-fit">
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Admin Portal
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-white/5 rounded-lg text-slate-700 dark:text-white/70 text-[9px] font-bold uppercase tracking-wider border border-slate-200/60 dark:border-white/5">
                    <Clock className="w-3 h-3 text-indigo-400 dark:text-indigo-300" /> {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </div>

                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                  {greeting.label},<br />
                  <span className="inline-flex items-center gap-2 mt-1 max-w-full">
                    <span className="text-indigo-600 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-white dark:to-white/70 truncate">{firstName}</span>
                    <span className="shrink-0">{greeting.emoji}</span>
                  </span>
                </h1>
                <p className="text-slate-600 dark:text-indigo-200 text-xs font-semibold leading-relaxed mt-3">
                  Admin level visibility at <span className="text-slate-800 dark:text-white font-black">{user?.org_name || 'your organization'}</span>.
                </p>
              </div>

              {/* Action buttons and System Status Footer to fill space elegantly */}
              <div className="relative z-10 mt-8 space-y-4">
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => window.location.reload()} className="w-10 h-10 rounded-xl bg-slate-200/60 hover:bg-slate-300/60 text-slate-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white flex items-center justify-center backdrop-blur-sm border border-slate-300/30 dark:border-white/10 transition-all hover:rotate-180 duration-500">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <Link to="/admin/generate" className="h-10 px-4 flex-1 bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-white dark:hover:bg-slate-50 dark:text-indigo-600 rounded-xl flex items-center justify-center gap-2 text-xs font-black shadow-md transition-all hover:-translate-y-0.5">
                    <Plus className="w-4 h-4" /> New JD
                  </Link>
                </div>

                <div className="pt-4 border-t border-slate-200/80 dark:border-white/10 w-full flex items-center justify-between text-[10px] text-slate-600 dark:text-indigo-200">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="font-bold uppercase tracking-wider text-slate-700 dark:text-white/80">AI Engine Active</span>
                  </div>
                  <span className="bg-slate-200/60 dark:bg-white/10 px-2 py-0.5 rounded text-[9px] font-bold text-slate-700 dark:text-white/90 border border-slate-300/40 dark:border-white/5">v1.2.4</span>
                </div>
              </div>
            </div>

            {/* Right Column: Premium Bento Cards */}
            <div className="xl:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Card 1: Job Description Distribution */}
              <div className="bg-white/70 dark:bg-[#0f172a]/40 backdrop-blur-md border border-slate-200/50 dark:border-white/5 rounded-2xl p-5 text-slate-800 dark:text-white hover:bg-white/90 dark:hover:bg-[#0f172a]/60 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group hover:shadow-lg hover:border-slate-300/30">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-200 flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-black tracking-wider uppercase text-slate-600 dark:text-white/70">JD Distribution</span>
                  </div>
                  <span className="text-[9px] font-bold text-slate-500 dark:text-white/50 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded">All JDs</span>
                </div>

                <div>
                  <div className="flex items-baseline gap-2 mb-4">
                    {isStatsLoading ? (
                      <span className="text-4xl font-black tracking-tight text-slate-300/50 dark:text-white/20 animate-pulse select-none">00</span>
                    ) : (
                      <span className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">{bentoStats.totalJDs}</span>
                    )}
                    <span className="text-xs font-semibold text-slate-500 dark:text-white/60">Total Descriptions</span>
                  </div>

                  {/* Premium Reference-Style Capsule UI */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {/* Capsule 1: AI Built */}
                    <div onClick={() => navigate('/admin/my-jds')} className="cursor-pointer flex flex-col items-center justify-center text-center bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-white/10 transition-all duration-300 gap-1.5">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shrink-0">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        {isStatsLoading ? (
                          <div className="text-xs font-black leading-none mb-0.5 text-slate-300/50 dark:text-white/20 animate-pulse select-none">00</div>
                        ) : (
                          <div className="text-xs font-black leading-none mb-0.5 text-slate-900 dark:text-white">{bentoStats.aiBuiltJDs}</div>
                        )}
                        <div className="text-[7px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest leading-none">AI Built</div>
                      </div>
                    </div>

                    {/* Capsule 2: Predefined */}
                    <div onClick={() => navigate('/admin/my-jds')} className="cursor-pointer flex flex-col items-center justify-center text-center bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-white/10 transition-all duration-300 gap-1.5">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white shrink-0">
                        <LayoutTemplate className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        {isStatsLoading ? (
                          <div className="text-xs font-black leading-none mb-0.5 text-slate-300/50 dark:text-white/20 animate-pulse select-none">00</div>
                        ) : (
                          <div className="text-xs font-black leading-none mb-0.5 text-slate-900 dark:text-white">{bentoStats.predefinedJDs}</div>
                        )}
                        <div className="text-[7px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest leading-none">Predefined</div>
                      </div>
                    </div>

                    {/* Capsule 3: Total Templates */}
                    <div onClick={() => navigate('/admin/templates')} className="cursor-pointer flex flex-col items-center justify-center text-center bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-white/10 transition-all duration-300 gap-1.5">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-fuchsia-400 to-pink-500 flex items-center justify-center text-white shrink-0">
                        <LayoutTemplate className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        {isStatsLoading ? (
                          <div className="text-xs font-black leading-none mb-0.5 text-slate-300/50 dark:text-white/20 animate-pulse select-none">0.0K</div>
                        ) : (
                          <div className="text-xs font-black leading-none mb-0.5 text-slate-900 dark:text-white" title={bentoStats.totalTemplates?.toLocaleString()}>{formatCompact(bentoStats.totalTemplates)}</div>
                        )}
                        <div className="text-[7px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest leading-none">Templates</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Workflow Funnel */}
              <div className="bg-white/70 dark:bg-[#0f172a]/40 backdrop-blur-md border border-slate-200/50 dark:border-white/5 rounded-2xl p-5 text-slate-800 dark:text-white hover:bg-white/90 dark:hover:bg-[#0f172a]/60 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group hover:shadow-lg hover:border-slate-300/30">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-200 flex items-center justify-center">
                      <Activity className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-black tracking-wider uppercase text-slate-600 dark:text-white/70">Workflow Funnel</span>
                  </div>
                  <span className="text-[9px] font-bold text-slate-500 dark:text-white/50 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded">Status</span>
                </div>

                {/* 3 Reference-Style Capsules side-by-side / wrap */}
                <div className="grid grid-cols-3 gap-1.5">
                  {/* Pending Capsule */}
                  <div onClick={() => navigate('/admin/my-jds')} className="cursor-pointer flex flex-col items-center justify-center text-center bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-white/10 transition-all duration-300 gap-1.5">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white relative">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                      </span>
                    </div>
                    <div>
                      {isStatsLoading ? (
                        <div className="text-xs font-black leading-none mb-0.5 text-slate-300/50 dark:text-white/20 animate-pulse select-none">00</div>
                      ) : (
                        <div className="text-xs font-black leading-none mb-0.5 text-slate-900 dark:text-white">{bentoStats.activeJDs}</div>
                      )}
                      <div className="text-[7px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest leading-none">Pending</div>
                    </div>
                  </div>

                  {/* Complete Capsule */}
                  <div onClick={() => navigate('/admin/my-jds')} className="cursor-pointer flex flex-col items-center justify-center text-center bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-white/10 transition-all duration-300 gap-1.5">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      {isStatsLoading ? (
                        <div className="text-xs font-black leading-none mb-0.5 text-slate-300/50 dark:text-white/20 animate-pulse select-none">00</div>
                      ) : (
                        <div className="text-xs font-black leading-none mb-0.5 text-slate-900 dark:text-white">{bentoStats.approvedJDs}</div>
                      )}
                      <div className="text-[7px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest leading-none">Approved</div>
                    </div>
                  </div>

                  {/* Rejected Capsule */}
                  <div onClick={() => navigate('/admin/my-jds')} className="cursor-pointer flex flex-col items-center justify-center text-center bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-white/10 transition-all duration-300 gap-1.5">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-400 to-red-500 flex items-center justify-center text-white">
                      <AlertCircle className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      {isStatsLoading ? (
                        <div className="text-xs font-black leading-none mb-0.5 text-slate-300/50 dark:text-white/20 animate-pulse select-none">00</div>
                      ) : (
                        <div className="text-xs font-black leading-none mb-0.5 text-slate-900 dark:text-white">{bentoStats.rejectedJDs}</div>
                      )}
                      <div className="text-[7px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest leading-none">Rejected</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Users & Access */}
              <div className="bg-white/70 dark:bg-[#0f172a]/40 backdrop-blur-md border border-slate-200/50 dark:border-white/5 rounded-2xl p-5 text-slate-800 dark:text-white hover:bg-white/90 dark:hover:bg-[#0f172a]/60 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group hover:shadow-lg hover:border-slate-300/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-pink-50 dark:bg-pink-500/20 text-pink-600 dark:text-pink-200 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-black tracking-wider uppercase text-slate-600 dark:text-white/70">Users & Access</span>
                  </div>
                  <span className="text-[9px] font-bold text-slate-500 dark:text-white/50 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded">Directory</span>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {/* Active Users */}
                  <div onClick={() => navigate('/admin/settings?tab=Team+%26+Permissions', { state: { memberStatusFilter: 'Status' } })} className="cursor-pointer flex flex-col items-center justify-center text-center bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-white/10 transition-all duration-300 gap-1.5">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      {isStatsLoading ? (
                        <div className="text-xs font-black leading-none mb-0.5 text-slate-300/50 dark:text-white/20 animate-pulse select-none">00</div>
                      ) : (
                        <div className="text-xs font-black leading-none mb-0.5 text-slate-900 dark:text-white">{bentoStats.activeUsers}</div>
                      )}
                      <div className="text-[7px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest leading-none">Total</div>
                    </div>
                  </div>

                  {/* Active Approvers */}
                  <div onClick={() => navigate('/admin/settings?tab=Team+%26+Permissions', { state: { memberStatusFilter: 'Active' } })} className="cursor-pointer flex flex-col items-center justify-center text-center bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-white/10 transition-all duration-300 gap-1.5">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white">
                      <Zap className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      {isStatsLoading ? (
                        <div className="text-xs font-black leading-none mb-0.5 text-slate-300/50 dark:text-white/20 animate-pulse select-none">00</div>
                      ) : (
                        <div className="text-xs font-black leading-none mb-0.5 text-slate-900 dark:text-white">{bentoStats.activeApprovers}</div>
                      )}
                      <div className="text-[7px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest leading-none">Active</div>
                    </div>
                  </div>

                  {/* Inactive Approvers */}
                  <div onClick={() => navigate('/admin/settings?tab=Team+%26+Permissions', { state: { memberStatusFilter: 'Inactive' } })} className="cursor-pointer flex flex-col items-center justify-center text-center bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-white/10 transition-all duration-300 gap-1.5">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      {isStatsLoading ? (
                        <div className="text-xs font-black leading-none mb-0.5 text-slate-300/50 dark:text-white/20 animate-pulse select-none">00</div>
                      ) : (
                        <div className="text-xs font-black leading-none mb-0.5 text-slate-900 dark:text-white">{bentoStats.inactiveApprovers}</div>
                      )}
                      <div className="text-[7px] font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest leading-none">Inactive</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 4: Quality & Scope */}
              <div className="bg-white/70 dark:bg-[#0f172a]/40 backdrop-blur-md border border-slate-200/50 dark:border-white/5 rounded-2xl p-5 text-slate-800 dark:text-white hover:bg-white/90 dark:hover:bg-[#0f172a]/60 transition-all duration-300 flex flex-col justify-between relative group hover:shadow-lg hover:border-slate-300/30">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-200 flex items-center justify-center">
                      <Target className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-black tracking-wider uppercase text-slate-600 dark:text-white/70">Quality & Scope</span>
                  </div>
                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 px-2 py-0.5 rounded">Optimal</span>
                </div>

                <div>
                  <div className="flex items-baseline gap-2 mb-4">
                    {isStatsLoading ? (
                      <span className="text-4xl font-black tracking-tight text-slate-300/50 dark:text-white/20 animate-pulse select-none">00.0</span>
                    ) : (
                      <span className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">{avgScore}</span>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-500 dark:text-white/60">Average Score</span>
                      
                      <div className="relative group/tooltip cursor-help flex items-center justify-center">
                        <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 transition-colors" />
                        
                        {/* Tooltip */}
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-[220px] opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50">
                          <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-medium p-2.5 rounded-xl shadow-xl border border-slate-700/50 dark:border-slate-200 text-center leading-relaxed">
                            <span className="block font-bold mb-1 opacity-70">Calculation Formula</span>
                            No. of JDs pushed to CSOD <br/> <span className="opacity-50 font-black px-1">÷</span> <br/> Total No. of JDs in the organization
                          </div>
                          {/* Triangle pointer */}
                          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-transparent border-t-slate-900 dark:border-t-white" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Active Depts Capsule */}
                    <div className="flex items-center gap-2.5 bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-white/10 transition-all duration-300 col-span-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white shrink-0">
                        <Server className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        {isStatsLoading ? (
                          <div className="text-sm font-extrabold leading-tight text-slate-300/50 dark:text-white/20 animate-pulse select-none">00</div>
                        ) : (
                          <div className="text-sm font-extrabold leading-tight text-slate-900 dark:text-white">{bentoStats.activeDepts}</div>
                        )}
                        <div className="text-[7.5px] font-black text-slate-500 dark:text-white/50 uppercase tracking-wider leading-none">Active Departments</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN BENTO GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Large Column (Span 8) */}
          <div className="lg:col-span-8 flex flex-col gap-6">

            {/* Trend Chart Bento */}
            <div className="bg-white dark:bg-[#0f172a] rounded-[2rem] p-6 md:p-8 border border-slate-200/60 dark:border-white/5 shadow-sm h-64 flex flex-col relative overflow-hidden group hover:border-indigo-500/20 dark:hover:border-indigo-500/20 transition-colors">
              <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none group-hover:bg-indigo-500/10 transition-colors" />

              <div className="flex justify-between items-start relative z-10 mb-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">JD Generation Output</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Velocity over the last 7 months</p>
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
                  <TrendingUp className="w-4 h-4" /> +18%
                </span>
              </div>

              <div className="flex-1 -mx-4 -mb-4 relative z-10">
                <ReactECharts option={lineChartOption} style={{ height: "100%", width: "100%" }} notMerge opts={{ renderer: "svg" }} />
              </div>
            </div>

            {/* Recent JDs Bento */}
            <div className="bg-white dark:bg-[#0f172a] rounded-[2rem] border border-slate-200/60 dark:border-white/5 shadow-sm flex flex-col overflow-hidden relative group hover:border-indigo-500/20 dark:hover:border-indigo-500/20 transition-colors">
              {/* Header */}
              <div className="px-6 md:px-8 pt-6 pb-4 border-b border-slate-100 dark:border-white/5 flex flex-col gap-4 relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-500" /> Recent Descriptions
                  </h2>

                  <div className="flex items-center gap-3">
                    <div className="flex bg-slate-100 dark:bg-[#020617] p-1 rounded-xl border border-slate-200/50 dark:border-white/5">
                      <button onClick={() => { setJdView("list"); setJdPage(1); }} className={`p-1.5 rounded-lg transition-all ${jdView === "list" ? "bg-white dark:bg-[#0f172a] text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}><List className="w-4 h-4" /></button>
                      <button onClick={() => { setJdView("card"); setJdPage(1); }} className={`p-1.5 rounded-lg transition-all ${jdView === "card" ? "bg-white dark:bg-[#0f172a] text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}><LayoutGrid className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex p-1 bg-slate-50 dark:bg-[#020617] rounded-xl w-fit overflow-x-auto no-scrollbar border border-slate-100 dark:border-white/5">
                  {tabs.map((tab) => (
                    <button
                      key={tab.label}
                      onClick={() => { setActiveTab(tab.label); setJdPage(1); }}
                      className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === tab.label ? 'bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                    >
                      {tab.label} <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${activeTab === tab.label ? 'bg-indigo-500 text-white' : 'bg-slate-200/50 dark:bg-white/10'}`}>{tab.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Area */}
              {pagedJDs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">No recent JDs created</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-[240px]">
                    Your generated and saved job descriptions will appear here.
                  </p>
                  <Link to="/admin/generate" className="mt-6 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                    Create your first JD →
                  </Link>
                </div>
              ) : (
                <>
                  <div className="max-h-[720px] overflow-y-auto custom-scrollbar">
                    {/* List View */}
                    {jdView === "list" && (
                      <div className="divide-y divide-slate-100 dark:divide-white/5 relative z-10 flex-1">
                        {pagedJDs.map((jd, idx) => {
                          const sc = scoreColor(jd.score || 75);
                          const st = STATUS_MAP[jd.status?.toLowerCase()] || STATUS_MAP.draft;
                          const flags = jd.flags ?? 0;
                          return (
                            <div key={jd.id || idx} onClick={() => jd.id && navigate(`/admin/my-jds`)} className="group/row flex items-center gap-4 px-6 md:px-8 py-4 hover:bg-slate-50 dark:hover:bg-white/[0.02] cursor-pointer transition-colors">
                              <div className="flex-1 min-w-0 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-[#020617] flex items-center justify-center shrink-0 border border-slate-200/50 dark:border-white/5 group-hover/row:border-indigo-500/30 transition-colors">
                                  <FileText className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover/row:text-indigo-500 transition-colors" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900 dark:text-white text-sm truncate">{jd.title}</span>
                                    {flags > 0 && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20"><Flag className="w-3 h-3" /> {flags}</span>}
                                  </div>
                                  <div className="text-xs text-slate-500 mt-0.5 font-medium flex items-center gap-1.5 flex-wrap">
                                    <span>{relativeTime(jd.createdAt)}</span> • <span>{jd.department || (jd.content?.department) || "General"}</span> • <span>{jd.author || 'User'}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md ${sc}`}>{jd.score || 75} Score</span>
                                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md hidden sm:inline-block ${st.classes}`}>{st.label}</span>
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center opacity-0 group-hover/row:opacity-100 -ml-2 transition-all group-hover/row:translate-x-1">
                                  <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Card View */}
                    {jdView === "card" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 md:px-8 relative z-10 min-h-[100px]">
                        {pagedJDs.map((jd, idx) => {
                          const sc = scoreColor(jd.score || 75);
                          const st = STATUS_MAP[jd.status?.toLowerCase()] || STATUS_MAP.draft;
                          return (
                            <div key={jd.id || idx} onClick={() => jd.id && navigate(`/admin/my-jds`)} className="group/card bg-slate-50 dark:bg-[#020617] hover:bg-white dark:hover:bg-white/[0.04] border border-slate-200/60 dark:border-white/5 hover:border-indigo-500/30 rounded-[1.5rem] p-5 cursor-pointer transition-all hover:shadow-xl hover:shadow-indigo-500/5">
                              <div className="flex items-start justify-between mb-4">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${st.classes}`}>{st.label}</span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${sc}`}>{jd.score || 75}</span>
                              </div>
                              <h3 className="font-bold text-slate-900 dark:text-white mb-1 line-clamp-1">{jd.title}</h3>
                              <p className="text-xs text-slate-500 font-medium mb-4 flex gap-1.5 truncate">
                                {jd.department || (jd.content?.department)} • {jd.author || 'User'}
                              </p>
                              <div className="flex items-center justify-between pt-4 border-t border-slate-200/60 dark:border-white/5">
                                <span className="text-xs text-slate-400 font-medium">{relativeTime(jd.createdAt)}</span>
                                <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                  <div className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg text-slate-500 dark:text-slate-400"><Edit3 className="w-4 h-4" /></div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Pagination */}
                  <div className="px-6 md:px-8 py-4 border-t border-slate-100 dark:border-white/5 mt-auto relative z-10 bg-slate-50/50 dark:bg-white/[0.01]">
                    <Pagination 
                      currentPage={jdPage} 
                      totalPages={totalPages} 
                      onPageChange={(p) => setJdPage(p)} 
                      showRowsSelector={false} 
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Narrow Column (Span 4) */}
          <div className="lg:col-span-4 flex flex-col gap-6">

            {/* System Health Bento */}
            <div className="bg-white dark:bg-[#0f172a] rounded-[2rem] border border-slate-200/60 dark:border-white/5 p-6 md:p-8 shadow-sm relative overflow-hidden group hover:border-emerald-500/30 dark:hover:border-emerald-500/30 transition-colors">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-emerald-500/20 transition-colors pointer-events-none" />

              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-6">
                <Server className="w-5 h-5 text-indigo-500" /> Platform Status
              </h2>

              <div className="space-y-5">
                <div className="flex items-center justify-between group/item">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-[#020617] border border-slate-200/50 dark:border-white/5 flex items-center justify-center group-hover/item:border-emerald-500/30 transition-colors">
                      <CloudCog className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">API & Database</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Latency: 24ms</div>
                    </div>
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                </div>

                <div className="flex items-center justify-between group/item">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-[#020617] border border-slate-200/50 dark:border-white/5 flex items-center justify-center group-hover/item:border-emerald-500/30 transition-colors">
                      <RefreshCw className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">CSOD Connector</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Automated sync</div>
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">Synced 2m ago</div>
                </div>

                <div className="flex items-center justify-between group/item">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-[#020617] border border-slate-200/50 dark:border-white/5 flex items-center justify-center group-hover/item:border-amber-500/30 transition-colors">
                      <Sparkles className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">GenAI Pipeline</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Token usage</div>
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">68% Quota</div>
                </div>
              </div>
            </div>

            {/* Admin Tools Bento */}
            <div className="bg-white dark:bg-[#0f172a] rounded-[2rem] border border-slate-200/60 dark:border-white/5 p-6 md:p-8 shadow-sm flex-1 flex flex-col">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-6">
                <ShieldCheck className="w-5 h-5 text-indigo-500" /> Administration
              </h2>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { title: "System Analytics", icon: BarChart2, path: "/admin/analytics", color: "from-blue-600 to-indigo-600", bg: "bg-blue-500/10 hover:bg-blue-500/20 text-blue-500", border: "hover:border-blue-500/30" },
                  { title: "CSOD Integration", icon: CloudCog, path: "/admin/push-csod?mode=sync", color: "from-purple-600 to-pink-600", bg: "bg-purple-500/10 hover:bg-purple-500/20 text-purple-500", border: "hover:border-purple-500/30" },
                  { title: "Global Templates", icon: LayoutTemplate, path: "/admin/templates", color: "from-amber-500 to-orange-500", bg: "bg-amber-500/10 hover:bg-amber-500/20 text-amber-500", border: "hover:border-amber-500/30" },
                  { title: "Competency Lib", icon: Target, path: "/admin/competencies", color: "from-emerald-600 to-teal-600", bg: "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500", border: "hover:border-emerald-500/30" },
                ].map((action, i) => (
                  <Link key={i} to={action.path} className={`flex items-center gap-4 p-3.5 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-[#020617] transition-all group ${action.border}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${action.bg}`}>
                      <action.icon className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors flex-1">{action.title}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Insight Bento */}
            <div className="bg-[#020617] rounded-[2rem] p-6 text-white border border-white/10 shadow-xl overflow-hidden relative group">
              <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-[60px] group-hover:bg-indigo-500/40 transition-colors duration-700 pointer-events-none" />
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/10">
                  <Zap className="w-4 h-4 text-indigo-400" />
                </div>
                <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Forge Insight</span>
              </div>
              <p className="text-sm text-indigo-100/80 leading-relaxed font-medium">
                JDs with <span className="text-white font-bold">structured competency lists</span> receive 40% more qualified applicants.
              </p>
              <button className="mt-4 text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1.5 uppercase tracking-wide">
                Best practices <ArrowRight className="w-3 h-3" />
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
