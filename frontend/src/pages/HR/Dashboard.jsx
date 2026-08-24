import React, { useState, useMemo, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import {
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronRight,
  MoreVertical,
  Briefcase,
  MapPin,
  TrendingUp,
  Calendar,
  ArrowUpRight,
  X,
  LayoutGrid,
  List,
  Sparkles,
  History,
  CheckCircle,
  MessageSquare,
  ArrowUpDown,
  Zap,
  Activity,
  Layers
} from 'lucide-react';
import { JDContext } from '../../context/JDContext';
import { mockHRJDs } from '../../mock/mockHRDashboard';
import * as workflowService from '../../services/workflowService';
import WorkflowModal from '../../components/common/WorkflowModal';
import ProfileBadge from '../../components/common/ProfileBadge';
import toast from 'react-hot-toast';

// ─── Helpers ────────────────────────────────────────────────────────────────
function getGreeting(hour) {
  if (hour < 12) return { label: "Good morning", emoji: "🫧🌤️☁" };
  if (hour < 17) return { label: "Good afternoon", emoji: "☀️" };
  return { label: "Good evening", emoji: "🌙" };
}

function getRelativeTime(dateInput) {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "Recently";
  const diff = new Date() - date;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

// ─── Components ─────────────────────────────────────────────────────────────

/**
 * Premium Status Badge with dynamic glows
 */
function StatusBadge({ status }) {
  const mapping = {
    'approved': { label: 'Approved', bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20', icon: CheckCircle2, glow: 'shadow-emerald-500/20' },
    'submitted': { label: 'Review', bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20', icon: Clock, glow: 'shadow-amber-500/20' },
    'in_review': { label: 'Review', bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20', icon: Clock, glow: 'shadow-amber-500/20' },
    'active': { label: 'Review', bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20', icon: Clock, glow: 'shadow-amber-500/20' },
    'pending': { label: 'Review', bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20', icon: Clock, glow: 'shadow-amber-500/20' },
    'rejected': { label: 'Rejected', bg: 'bg-rose-500/10', text: 'text-rose-500', border: 'border-rose-500/20', icon: AlertCircle, glow: 'shadow-rose-500/20' },
    'declined': { label: 'Rejected', bg: 'bg-rose-500/10', text: 'text-rose-500', border: 'border-rose-500/20', icon: AlertCircle, glow: 'shadow-rose-500/20' },
    'draft': { label: 'Draft', bg: 'bg-slate-500/10', text: 'text-slate-500', border: 'border-slate-500/20', icon: FileText, glow: 'shadow-slate-500/20' },
    'final': { label: 'Final', bg: 'bg-indigo-500/10', text: 'text-indigo-500', border: 'border-indigo-500/20', icon: CheckCircle, glow: 'shadow-indigo-500/20' },
    'finalized': { label: 'Final', bg: 'bg-indigo-500/10', text: 'text-indigo-500', border: 'border-indigo-500/20', icon: CheckCircle, glow: 'shadow-indigo-500/20' },
    'public_view': { label: 'JD Published', bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20', icon: Zap, glow: 'shadow-blue-500/20' },
    'published': { label: 'JD Published', bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20', icon: Zap, glow: 'shadow-blue-500/20' }
  };

  const key = status.toLowerCase();
  const style = mapping[key] || (status.startsWith('Review Step') ? mapping['submitted'] : mapping['draft']);
  const Icon = style.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${style.bg} ${style.text} ${style.border} ${style.glow} shadow-sm transition-all duration-300`}>
      <Icon size={12} />
      {style.label}
    </span>
  );
}

/**
 * Animated Stat Card with progress track
 */
function StatCard({ label, value, trend, trendUp, icon: Icon, delay }) {
  return (
    <div
      className="bg-white dark:bg-[#0f172a] rounded-[1.5rem] p-5 border border-slate-200/60 dark:border-white/5 shadow-sm hover:shadow-xl hover:border-indigo-500/30 dark:hover:border-indigo-500/30 transition-all group flex flex-col justify-between overflow-hidden relative"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-indigo-500/20 transition-colors" />

      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-indigo-500/10 text-slate-600 dark:text-indigo-400 flex items-center justify-center transition-transform group-hover:scale-110">
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-[10px] font-bold ${trendUp ? 'text-emerald-500' : 'text-rose-500'}`}>
            {trendUp ? <TrendingUp size={12} /> : <TrendingUp size={12} className="rotate-180" />}
            {trend}
          </div>
        )}
      </div>

      <div className="relative z-10">
        <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-1">{value}</div>
        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</div>
      </div>
    </div>
  );
}

/**
 * Next-Gen Content Card
 */
function JobCard({ jd, onClick, viewMode, onSubmit }) {
  const [isHovered, setIsHovered] = useState(false);

  const handleAction = (e) => {
    const submittable = ['draft', 'final', 'finalized', 'rejected', 'declined'].includes(jd.status?.toLowerCase());
    const isPending = ['submitted', 'in_review', 'active', 'pending'].includes(jd.status?.toLowerCase()) || jd.status?.startsWith('Review Step');
    if (submittable && !isPending) {
      onSubmit(jd.id);
    }
  };

  if (viewMode === 'list') {
    return (
      <div
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group relative bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200/60 dark:border-white/5 p-5 flex items-center gap-6 cursor-pointer hover:shadow-2xl hover:border-indigo-500/30 transition-all duration-300"
      >
        <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
          <Briefcase className="w-6 h-6 text-slate-400 dark:text-indigo-400" />
        </div>

        <div className="flex-1 min-0">
          <h3 className="text-base font-bold text-slate-900 dark:text-white truncate mb-1 group-hover:text-indigo-500 transition-colors">
            {jd.title}
          </h3>
          <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
            <span>{jd.department || 'General'}</span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span>{jd.location || 'Remote'}</span>
          </div>
        </div>

        <div className="hidden md:flex flex-col items-end gap-1 shrink-0">
          <StatusBadge status={jd.status} />
          {(() => {
            const submittable = ['draft', 'final', 'finalized', 'rejected', 'declined'].includes(jd.status?.toLowerCase());
            const isPending = ['submitted', 'in_review', 'active', 'pending'].includes(jd.status?.toLowerCase()) || jd.status?.startsWith('Review Step');
            return (submittable && !isPending) && (
              <button 
                onClick={handleAction}
                className="mt-1 px-3 py-1 bg-indigo-500 text-white text-[9px] font-black uppercase tracking-widest rounded-md hover:bg-indigo-600 transition-colors"
              >
                Submit
              </button>
            );
          })()}
        </div>

        <div className="p-2 rounded-lg bg-slate-50 dark:bg-white/5 group-hover:bg-indigo-500 group-hover:text-white transition-all">
          <ChevronRight size={18} />
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative bg-white dark:bg-[#0f172a] rounded-[2rem] border border-slate-200/60 dark:border-white/5 p-6 cursor-pointer hover:shadow-2xl hover:border-indigo-500/30 transition-all duration-500 flex flex-col h-full"
    >
      <div className="flex items-start justify-between mb-6">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-indigo-500/10 flex items-center justify-center group-hover:rotate-6 transition-transform">
          <Briefcase className="w-6 h-6 text-slate-400 dark:text-indigo-400" />
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={jd.status} />
          {(() => {
            const submittable = ['draft', 'final', 'finalized', 'rejected', 'declined'].includes(jd.status?.toLowerCase());
            const isPending = ['submitted', 'in_review', 'active', 'pending'].includes(jd.status?.toLowerCase()) || jd.status?.startsWith('Review Step');
            return (submittable && !isPending) && (
              <button 
                onClick={handleAction}
                className="px-4 py-1.5 bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-indigo-600 shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
              >
                Submit for Review
              </button>
            );
          })()}
        </div>
      </div>

      <div className="flex-1">
        <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-2 group-hover:text-indigo-500 transition-colors">
          {jd.title}
        </h3>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.1em] mb-4">
          {jd.department || 'General'} • {jd.location || 'Remote'}
        </p>
      </div>

      <div className="pt-4 mt-auto border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <Calendar size={12} /> {(() => {
            const date = new Date(jd.createdAt);
            return isNaN(date.getTime()) ? "JUST NOW" : date.toLocaleDateString();
          })()}
        </div>
        <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all">
          <ArrowUpRight size={14} />
        </div>
      </div>
    </div>
  );
}

// ─── MAIN DASHBOARD ──────────────────────────────────────────────────────────

export default function HRDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [viewMode, setViewMode] = useState('grid');

  const { user, myJDs, refreshMyJDs } = useContext(JDContext);
  
  useEffect(() => {
    refreshMyJDs();
  }, []);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [currentJdId, setCurrentJdId] = useState(null);
  const [availableWorkflows, setAvailableWorkflows] = useState([]);
  const [targetDept, setTargetDept] = useState("");
  const now = new Date();
  const greeting = getGreeting(now.getHours());
  const firstName = user?.full_name?.split(" ")[0] || user?.name?.split(" ")[0] || "there";

  const stats = useMemo(() => [
    { label: 'Pipeline Strength', value: myJDs.length, icon: Layers, trend: '+12%', trendUp: true, delay: 100 },
    { label: 'Active Drafts', value: myJDs.filter(j => j.status === 'draft').length, icon: FileText, trend: '+3', trendUp: true, delay: 200 },
    { label: 'Pending Review', value: myJDs.filter(j => ['submitted', 'rejected', 'declined'].includes(j.status?.toLowerCase()) || j.status?.startsWith('Review Step')).length, icon: Clock, trend: '-2', trendUp: false, delay: 300 },
    { label: 'Final Approved', value: myJDs.filter(j => j.status === 'approved').length, icon: CheckCircle2, trend: '+8%', trendUp: true, delay: 400 },
  ], [myJDs]);

  const formatStatusLabel = (status) => {
    const s = status?.toLowerCase();
    if (s === 'draft') return 'Draft';
    if (s === 'final' || s === 'finalized') return 'Final';
    if (s === 'approved') return 'Approved';
    if (s === 'declined' || s === 'rejected') return 'Rejected';
    if (s === 'submitted' || s === 'in_review' || s === 'active' || s === 'pending' || s?.startsWith('review step')) return 'Review';
    return status?.charAt(0).toUpperCase() + status?.slice(1) || 'Draft';
  };

  const tabs = useMemo(() => {
    // Standard set of tabs as requested by the user
    const groups = [
      { key: 'All', label: 'All', count: myJDs.length },
      { key: 'draft', label: 'Draft', count: myJDs.filter(j => j.status?.toLowerCase() === 'draft').length },
      { key: 'final', label: 'Final', count: myJDs.filter(j => ['final', 'finalized'].includes(j.status?.toLowerCase())).length },
      { key: 'review', label: 'Review', count: myJDs.filter(j => ['submitted', 'in_review', 'active', 'pending'].includes(j.status?.toLowerCase()) || j.status?.toLowerCase().startsWith('review step')).length },
      { key: 'approved', label: 'Approved', count: myJDs.filter(j => j.status?.toLowerCase() === 'approved').length },
      { key: 'rejected', label: 'Rejected', count: myJDs.filter(j => ['rejected', 'declined'].includes(j.status?.toLowerCase())).length },
    ];
    return groups;
  }, [myJDs]);

  const filteredJDs = useMemo(() => {
    let result = [...myJDs];
    const tab = tabs.find(t => t.label === activeTab);
    
    if (activeTab !== 'All') {
      if (activeTab === 'Review') {
        result = result.filter(j => ['submitted', 'in_review', 'active', 'pending'].includes(j.status?.toLowerCase()) || j.status?.toLowerCase().startsWith('review step'));
      } else if (activeTab === 'Final') {
        result = result.filter(j => ['final', 'finalized'].includes(j.status?.toLowerCase()));
      } else if (activeTab === 'Rejected') {
        result = result.filter(j => ['rejected', 'declined'].includes(j.status?.toLowerCase()));
      } else {
        result = result.filter(j => j.status?.toLowerCase() === tab?.key);
      }
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(j => 
        j.title.toLowerCase().includes(term) || 
        (j.department && j.department.toLowerCase().includes(term))
      );
    }

    result.sort((a, b) => sortOrder === 'asc' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title));
    return result;
  }, [activeTab, searchTerm, sortOrder, myJDs]);

  const chartOption = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const now = new Date();
    const last7Days = [];
    const counts = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayName = days[d.getDay() === 0 ? 6 : d.getDay() - 1]; // Align Mon-Sun
      last7Days.push(dayName);
      
      const count = myJDs.filter(j => {
        const jdDate = new Date(j.createdAt);
        return jdDate.toDateString() === d.toDateString();
      }).length;
      counts.push(count);
    }

    return {
      animation: true,
      backgroundColor: "transparent",
      grid: { top: 20, right: 10, bottom: 20, left: 20, containLabel: true },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(15,23,42,0.9)",
        textStyle: { color: "#fff", fontSize: 11 },
        borderColor: "rgba(255,255,255,0.1)",
        borderRadius: 12,
        padding: [8, 12]
      },
      xAxis: {
        type: "category",
        data: last7Days,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: "#94a3b8", fontSize: 10, fontWeight: 600, margin: 12 }
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { color: "rgba(148,163,184,0.05)", type: "solid" } },
        axisLabel: { color: "#94a3b8", fontSize: 10 }
      },
      series: [{
        name: "Velocity",
        type: "line",
        smooth: 0.4,
        data: counts,
        lineStyle: { width: 4, color: "#6366f1", shadowColor: "rgba(99,102,241,0.3)", shadowBlur: 10 },
        itemStyle: { color: "#6366f1", borderWidth: 2 },
        symbol: "circle",
        symbolSize: 8,
        showSymbol: false,
        areaStyle: {
          color: {
            type: "linear", x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: "rgba(99,102,241,0.2)" }, { offset: 1, color: "rgba(99,102,241,0)" }]
          }
        }
      }]
    };
  }, [myJDs]);

  const recentActivities = useMemo(() => {
    const activities = [];
    myJDs.forEach(jd => {
      if (jd.history) {
        jd.history.forEach(h => {
          activities.push({
            id: `${jd.id}-${h.timestamp}`,
            type: h.status === 'approved' ? 'approve' : (h.status === 'rejected' || h.status === 'declined' ? 'revision' : 'create'),
            user: h.updatedBy || "User",
            target: jd.title,
            date: new Date(h.timestamp)
          });
        });
      }
    });
    return activities.sort((a,b) => b.date - a.date).slice(0, 5);
  }, [myJDs]);

  const handleOpenWorkflow = async (id) => {
    const jd = myJDs.find(j => j.id === id);
    setCurrentJdId(id);
    setTargetDept(jd?.department || "");
    try {
      const data = await workflowService.listWorkflows();
      const workflowsArray = Array.isArray(data) ? data : (data?.workflows || []);
      setAvailableWorkflows(workflowsArray);
      setShowWorkflowModal(true);
    } catch (err) {
      console.error("Failed to fetch workflows", err);
      toast.error("Could not load workflows");
    }
  };

  const handleWorkflowConfirm = async (workflowId) => {
    try {
      await workflowService.triggerWorkflow(currentJdId, workflowId);
      toast.success("Workflow initiated successfully!");
      setShowWorkflowModal(false);
      // Optional: refresh JDs or update local state status
    } catch (e) {
      console.error("Workflow trigger failed:", e);
      toast.error("Failed to initiate workflow review.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] font-sans selection:bg-indigo-500/30">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ─── NEXT-GEN HEADER ─── */}
        <div className="grid grid-cols-12 gap-6 items-stretch">

          {/* Main Welcome - Bento Style */}
          <div className="col-span-12 lg:col-span-8 bg-gradient-to-br from-slate-900 to-slate-800 dark:from-[#0f172a] dark:to-[#020617] rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl shadow-slate-900/10 border border-slate-800/10 dark:border-white/5">
            {/* Glossy Overlay */}
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05)_0%,transparent_50%)] animate-pulse" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative z-10 h-full flex flex-col justify-between gap-8">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full text-indigo-100 text-[11px] font-black uppercase tracking-[0.2em] mb-4 backdrop-blur-xl border border-white/10">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Executive Console
                </div>
                <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tighter leading-[1.1] mb-4">
                  <span className="opacity-50 font-medium">{greeting.label},</span><br />
                  {user?.full_name || user?.name || "Professional"} {greeting.emoji}
                </h1>
                <p className="text-slate-400 text-lg font-medium max-w-lg leading-relaxed">
                  {user?.role} at <span className="text-white font-bold">{user?.org_name || 'your organization'}</span>.
                  Your recruitment intelligence dashboard is ready. Total <span className="text-white font-bold">{myJDs.length} active pipelines</span> across 4 departments.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={() => navigate('/hr/generate')}
                  className="px-8 py-3.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-[1.25rem] flex items-center gap-3 font-black text-sm shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all hover:-translate-y-1"
                >
                  <Plus className="w-5 h-5" /> START NEW JD
                </button>
              </div>
            </div>
          </div>

          {/* Activity Velocity Box */}
          <div className="col-span-12 lg:col-span-4 bg-white dark:bg-[#0f172a] rounded-[2.5rem] p-8 border border-slate-200/60 dark:border-white/5 shadow-sm relative overflow-hidden">
            <div className="relative z-10 h-full flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-500" /> Recruitment Velocity
                </h3>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              </div>

              <div className="flex-1 min-h-[160px]">
                <ReactECharts option={chartOption} style={{ height: '100%' }} notMerge opts={{ renderer: 'svg' }} />
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 dark:border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Weekly Peak</span>
                  <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">+24 JDs</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── QUICK ANALYTICS ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <StatCard key={i} {...stat} />
          ))}
        </div>

        {/* ─── OPERATIONAL TIMELINE & LIST ─── */}
        <div className="grid grid-cols-12 gap-8 items-start">

          {/* Operations Timeline - Desktop Sidebar */}
          <div className="hidden lg:block col-span-3 sticky top-8 space-y-6">
            <div className="bg-white/40 dark:bg-[#0f172a]/40 backdrop-blur-xl rounded-[2rem] p-6 border border-white/50 dark:border-white/5 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <History className="w-3.5 h-3.5" /> Recent Actions
              </h3>
              <div className="space-y-6">
                {recentActivities.map((act) => (
                  <div key={act.id} className="relative pl-5 border-l border-slate-200 dark:border-white/10 group">
                    <div className="absolute left-[-4.5px] top-0 w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-indigo-500 transition-colors" />
                    <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight mb-1">{act.user}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-2">{act.type === 'approve' ? 'Approved' : act.type === 'revision' ? 'Requested Revision on' : 'Created'} {act.target}</p>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{getRelativeTime(act.date)}</span>
                  </div>
                ))}
              </div>
              <button className="w-full mt-8 py-3 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                View Full Timeline
              </button>
            </div>
          </div>

          {/* Main List Section */}
          <div className="col-span-12 lg:col-span-9 space-y-6">

            {/* Command Center: Search & Tabs */}
            <div className="bg-white dark:bg-[#0f172a] rounded-[2rem] p-4 border border-slate-200/60 dark:border-white/5 shadow-sm flex flex-col md:flex-row items-center gap-4">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search Your JDs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-[#020617] border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white"
                />
              </div>

              <div className="flex p-1 bg-slate-50 dark:bg-[#020617] rounded-2xl w-full md:w-auto overflow-x-auto no-scrollbar">
                {tabs.map((tab) => (
                  <button
                    key={tab.label}
                    onClick={() => setActiveTab(tab.label)}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === tab.label ? 'bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {tab.label} <span className={`px-1.5 py-0.5 rounded-lg text-[9px] ${activeTab === tab.label ? 'bg-indigo-500 text-white' : 'bg-slate-200/50 dark:bg-white/10'}`}>{tab.count}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-3 bg-slate-50 dark:bg-[#020617] rounded-2xl hover:bg-slate-100 transition-all text-slate-400"
                  title={sortOrder === 'asc' ? 'Sort Z to A' : 'Sort A to Z'}
                >
                  <ArrowUpDown size={18} />
                </button>
                <div className="flex p-1 bg-slate-50 dark:bg-[#020617] rounded-2xl border border-slate-100 dark:border-white/5">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-[#0f172a] text-indigo-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    title="Grid View"
                  >
                    <LayoutGrid size={18} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-[#0f172a] text-indigo-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    title="List View"
                  >
                    <List size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Empty State */}
            {filteredJDs.length === 0 ? (
              <div className="bg-white dark:bg-[#0f172a] rounded-[3rem] p-16 text-center border-2 border-dashed border-slate-200 dark:border-white/5">
                <div className="w-20 h-20 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                  <Search size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">No results found</h3>
                <p className="text-slate-400 mb-8 max-w-xs mx-auto">Try adjusting your filters or search keywords to find what you're looking for.</p>
                <button onClick={() => { setSearchTerm(''); setActiveTab('All'); }} className="px-6 py-2.5 bg-indigo-500 text-white rounded-xl font-bold text-sm">Clear Filters</button>
              </div>
            ) : (
              <div className="max-h-[720px] overflow-y-auto pr-2 custom-scrollbar">
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'space-y-4'}>
                  {filteredJDs.map((jd) => (
                    <JobCard
                      key={jd.id}
                      jd={jd}
                      viewMode={viewMode}
                      onClick={() => navigate(`/hr/jd/${jd.id}`)}
                      onSubmit={handleOpenWorkflow}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>


      <WorkflowModal 
        isOpen={showWorkflowModal}
        onClose={() => setShowWorkflowModal(false)}
        onConfirm={handleWorkflowConfirm}
        workflows={availableWorkflows}
        targetDepartment={targetDept}
      />
    </div>
  );
}