import React, { useContext, useMemo } from "react";
import { JDContext } from "../../context/JDContext";
import { useNavigate } from "react-router-dom";
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  Eye, 
  LayoutGrid, 
  Shield, 
  Briefcase,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Award,
  ChevronLeft,
  ChevronRight,
  Filter,
  XCircle
} from "lucide-react";
import { motion } from "framer-motion";

export default function ManagerMyJDs() {
  const navigate = useNavigate();
  const { receivedJDs, isLoadingJDs, user } = useContext(JDContext);
  const [activeFilter, setActiveFilter] = React.useState('all');
  const [currentPage, setCurrentPage] = React.useState(1);
  const ITEMS_PER_PAGE = 12;

  const filteredJDs = useMemo(() => {
    if (activeFilter === 'all') return receivedJDs;
    if (activeFilter === 'pending') {
      return receivedJDs.filter(jd => 
        ['pending', 'submitted', 'waiting_for_approval', 'in_review'].includes((jd.status || "").toLowerCase())
      );
    }
    if (activeFilter === 'approved') {
      return receivedJDs.filter(jd => (jd.status || "").toLowerCase() === 'approved');
    }
    if (activeFilter === 'rejected') {
      return receivedJDs.filter(jd => ['rejected', 'declined'].includes((jd.status || "").toLowerCase()));
    }
    return receivedJDs;
  }, [receivedJDs, activeFilter]);

  const totalPages = Math.ceil(filteredJDs.length / ITEMS_PER_PAGE);
  const paginatedJDs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredJDs.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredJDs, currentPage]);

  // Reset to page 1 when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter]);

  const stats = useMemo(() => {
    return {
      total: receivedJDs.length,
      pending: receivedJDs.filter(jd => 
        ['pending', 'submitted', 'waiting_for_approval', 'in_review'].includes((jd.status || "").toLowerCase())
      ).length,
      approved: receivedJDs.filter(jd => 
        (jd.status || "").toLowerCase() === 'approved'
      ).length,
      rejected: receivedJDs.filter(jd => 
        ['rejected', 'declined'].includes((jd.status || "").toLowerCase())
      ).length
    };
  }, [receivedJDs]);

  if (isLoadingJDs) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Syncing Assignments...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 transition-colors duration-300">
      {/* Premium Header Section */}
      <div className="relative overflow-hidden bg-white dark:bg-[#020617] border-b border-slate-200 dark:border-white/10 pt-12 pb-20">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-indigo-500/5 to-transparent pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-8 relative z-10 flex flex-col gap-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="max-w-2xl">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 mb-4"
              >
                <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-full text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                  Manager Portal
                </div>
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-4"
              >
                Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-violet-600">Review Queue</span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-lg text-slate-500 dark:text-slate-400 font-medium"
              >
                Manage and audit job descriptions assigned to your department for final approval.
              </motion.p>
            </div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-4 overflow-x-auto py-4 px-2 no-scrollbar scroll-smooth w-full"
            >
               <StatBox 
                label="Assigned" 
                value={stats.total} 
                icon={Briefcase} 
                color="blue" 
                isActive={activeFilter === 'all'}
                onClick={() => setActiveFilter('all')}
               />
               <StatBox 
                label="Pending" 
                value={stats.pending} 
                icon={Clock} 
                color="amber" 
                isActive={activeFilter === 'pending'}
                onClick={() => setActiveFilter('pending')}
               />
               <StatBox 
                label="Complete" 
                value={stats.approved} 
                icon={CheckCircle2} 
                color="emerald" 
                isActive={activeFilter === 'approved'}
                onClick={() => setActiveFilter('approved')}
               />
               <StatBox 
                label="Rejected" 
                value={stats.rejected} 
                icon={XCircle} 
                color="rose" 
                isActive={activeFilter === 'rejected'}
                onClick={() => setActiveFilter('rejected')}
               />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Showcase Grid */}
      <div className="max-w-7xl mx-auto px-8 -mt-10 relative z-20">
        {filteredJDs.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-[#0f172a] rounded-[2.5rem] border border-slate-200 dark:border-white/10 p-20 text-center shadow-xl"
          >
            <div className="w-24 h-24 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="w-12 h-12 text-slate-200 dark:text-slate-800" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 font-black uppercase tracking-tight">Queue is clear</h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium italic">No {activeFilter !== 'all' ? activeFilter : ''} job descriptions are currently in this view.</p>
          </motion.div>
        ) : (
          <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {paginatedJDs.map((jd, index) => (
                <ShowcaseCard 
                  key={jd.id} 
                  jd={jd} 
                  index={index} 
                  onClick={() => navigate(`/manager/review/${jd.id}`)}
                />
              ))}
            </div>

            {/* Pagination UI */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 py-8">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-3 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-2xl text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="flex items-center gap-2">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`
                        w-12 h-12 rounded-2xl text-xs font-black transition-all duration-300
                        ${currentPage === i + 1 
                          ? "bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 scale-110" 
                          : "bg-white dark:bg-[#0f172a] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border border-slate-200 dark:border-white/10"}
                      `}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-3 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-2xl text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, icon: Icon, color, isActive, onClick }) {
  const themes = {
    blue: "from-blue-500 to-indigo-600 shadow-blue-500/20 ring-blue-500/20",
    amber: "from-amber-400 to-orange-500 shadow-amber-500/20 ring-amber-500/20",
    emerald: "from-emerald-400 to-teal-600 shadow-emerald-500/20 ring-emerald-500/20",
    rose: "from-rose-500 to-red-600 shadow-rose-500/20 ring-rose-500/20"
  };

  const activeColors = {
    blue: "border-blue-500 bg-blue-50/50 dark:bg-blue-500/10",
    amber: "border-amber-500 bg-amber-50/50 dark:bg-amber-500/10",
    emerald: "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10",
    rose: "border-rose-500 bg-rose-50/50 dark:bg-rose-500/10"
  };

  return (
    <button 
        onClick={onClick}
        className={`
            relative p-4 rounded-3xl border transition-all duration-300 flex items-center gap-4 min-w-[160px] overflow-hidden
            ${isActive 
                ? `bg-white dark:bg-[#0f172a] ${activeColors[color]} shadow-xl scale-105 z-10` 
                : "bg-white dark:bg-[#0f172a] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 shadow-lg shadow-slate-200/10 dark:shadow-none hover:-translate-y-1"}
        `}
    >
      <div className={`
        w-10 h-10 rounded-2xl bg-gradient-to-br ${themes[color]} flex items-center justify-center text-white shadow-lg transition-transform duration-300
        ${isActive ? "scale-110 shadow-xl" : ""}
      `}>
        <Icon size={18} />
      </div>
      <div className="text-left">
        <div className="text-2xl font-black text-slate-900 dark:text-white leading-none">
            {value}
        </div>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{label}</div>
      </div>

      {isActive && (
        <motion.div 
            layoutId="activeIndicator"
            className={`absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r ${themes[color]}`}
        />
      )}
    </button>
  );
}

function ShowcaseCard({ jd, index, onClick }) {
  const status = (jd.status || "pending").toLowerCase();
  const isPending = ['pending', 'submitted', 'waiting_for_approval', 'in_review'].includes(status);
  const isRejected = ['rejected', 'declined'].includes(status);
  const isApproved = status === 'approved';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 * index }}
      onClick={onClick}
      className="group relative bg-white dark:bg-[#0f172a] rounded-[2.5rem] p-8 border border-slate-200 dark:border-white/10 hover:border-indigo-500/50 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 cursor-pointer overflow-hidden"
    >
      {/* Decorative Blur */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors" />

      {/* Top Section */}
      <div className="flex items-start justify-between mb-8">
        <div className={`p-4 rounded-2xl transition-colors duration-300 ${
          isPending ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600' : 
          isRejected ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600' :
          'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600'
        }`}>
          {isRejected ? <XCircle size={24} /> : <FileText size={24} />}
        </div>
        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all duration-300 ${
          isPending ? 'bg-amber-500/5 border-amber-200 text-amber-600' : 
          isRejected ? 'bg-rose-500/5 border-rose-200 text-rose-600' :
          'bg-emerald-500/5 border-emerald-200 text-emerald-600'
        }`}>
          {isPending ? 'Pending Review' : isRejected ? 'Rejected' : 'Approved'}
        </div>
      </div>

      {/* Title & Info */}
      <div className="mb-8">
        <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight mb-2 group-hover:text-indigo-500 transition-colors">
          {jd.title}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
          <TrendingUp size={14} className="text-indigo-500" />
          {jd.seniority || 'Mid-Senior'} Level • {jd.department || 'Technology'}
        </p>
      </div>

      {/* Meta Features */}
      <div className="grid grid-cols-2 gap-4 mb-8 pt-6 border-t border-slate-50 dark:border-white/5">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Section Count</span>
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">5 High-Impact</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Priority</span>
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">High</span>
        </div>
      </div>

      {/* Action Area */}
      <div className="flex items-center justify-between">
        <div className="flex -space-x-2">
          {[1, 2].map((i) => (
            <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-[#0f172a] bg-slate-100 dark:bg-white/10 flex items-center justify-center text-[10px] font-black text-slate-500">
              {i === 1 ? 'JD' : 'AI'}
            </div>
          ))}
        </div>
        
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-widest group-hover:translate-x-2 transition-transform duration-300">
          Open Audit <ArrowRight size={14} />
        </div>
      </div>
    </motion.div>
  );
}
