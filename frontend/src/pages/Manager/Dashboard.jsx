import React, { useContext, useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { JDContext } from "../../context/JDContext";
import { 
  FileText, 
  Edit3, 
  Send, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  ArrowRight,
  Clock,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Plus,
  Layout,
  Target,
  Users,
  Award,
  Zap,
  Activity
} from "lucide-react";
import { mockManagerJDs } from "../../mock/mockManagerDashboard";
import ProfileBadge from "../../components/common/ProfileBadge";

// Help function for greeting
function getGreeting(hour) {
  if (hour < 12) return { label: "Good morning", emoji: "🫧🌤️☁" };
  if (hour < 17) return { label: "Good afternoon", emoji: "☀️" };
  return { label: "Good evening", emoji: "🌙" };
}

export default function ManagerDashboard() {
  const { user, myJDs, receivedJDs, refreshMyJDs, refreshReceivedJDs } = useContext(JDContext);
  
  useEffect(() => {
    refreshMyJDs();
    refreshReceivedJDs();
  }, []);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Review');
  const [isWorkflowExpanded, setIsWorkflowExpanded] = useState(false);

  const stats = useMemo(() => [
    { label: 'Pending Review', value: (receivedJDs || []).filter(j => j.status === 'pending' || j.status === 'in_review' || j.status === 'active' || j.status.startsWith('Review Step')).length, color: 'text-purple-600' },
    { label: 'Approved', value: myJDs.filter(j => j.status === 'approved' || (j.history?.some(h => (h.updatedBy === user.full_name || h.user === user.full_name)) && j.status !== 'rejected' && j.status !== 'declined')).length, color: 'text-emerald-600' },
    { label: 'Revisions Requested', value: myJDs.filter(j => (j.status === 'rejected' || j.status === 'declined') && j.history?.some(h => (h.updatedBy === user.full_name || h.user === user.full_name))).length, color: 'text-orange-600' }
  ], [myJDs, receivedJDs, user.full_name]);

  const tabs = useMemo(() => {
    // Deduplicate by ID to prevent duplicates and inflated counts
    const allUnique = Array.from(new Map([...(receivedJDs || []), ...(myJDs || [])].map(j => [j.id, j])).values());
    
    const groups = [
      { label: 'Review', count: allUnique.filter(j => ['pending', 'in_review', 'active', 'submitted'].includes(j.status?.toLowerCase()) || j.status?.toLowerCase().startsWith('review step')).length },
      { label: 'Approved', count: allUnique.filter(j => j.status?.toLowerCase() === 'approved').length },
      { label: 'Rejected', count: allUnique.filter(j => ['rejected', 'declined'].includes(j.status?.toLowerCase())).length },
    ];
    return groups;
  }, [myJDs, receivedJDs]);

  const displayJDs = useMemo(() => {
    // Deduplicate by ID to prevent duplicates
    const allUnique = Array.from(new Map([...(receivedJDs || []), ...(myJDs || [])].map(j => [j.id, j])).values());
    
    const tabName = activeTab?.toLowerCase();
    
    if (tabName === 'review') {
      return allUnique.filter(j => ['pending', 'in_review', 'active', 'submitted'].includes(j.status?.toLowerCase()) || j.status?.toLowerCase().startsWith('review step'));
    } else if (tabName === 'approved') {
      return allUnique.filter(j => j.status?.toLowerCase() === 'approved');
    } else if (tabName === 'rejected') {
      return allUnique.filter(j => ['rejected', 'declined'].includes(j.status?.toLowerCase()));
    } else if (tabName === 'final') {
      return allUnique.filter(j => ['final', 'finalized'].includes(j.status?.toLowerCase()));
    } else if (tabName === 'draft') {
      return allUnique.filter(j => j.status?.toLowerCase() === 'draft');
    }
    
    // Default to the first tab's logic if no match (e.g. legacy state)
    return allUnique.filter(j => ['pending', 'in_review', 'active', 'submitted'].includes(j.status?.toLowerCase()) || j.status?.toLowerCase().startsWith('review step'));
  }, [activeTab, myJDs, receivedJDs]);

  const now = new Date();
  const greeting = getGreeting(now.getHours());
  const firstName = user?.full_name?.split(" ")[0] || user?.name?.split(" ")[0] || "Manager";

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        
        {/* ─── HERO & WORKFLOW SIDE-BY-SIDE ─── */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* Main Welcome - Bento Style (40%) */}
          <div className="w-full lg:basis-[40%] bg-gradient-to-br from-slate-900 to-slate-800 dark:from-[#0f172a] dark:to-[#020617] rounded-[2rem] p-6 relative overflow-hidden shadow-2xl shadow-slate-900/10 border border-slate-800/10 dark:border-white/5 h-auto self-start">
            {/* Glossy Overlay */}
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05)_0%,transparent_50%)] animate-pulse" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative z-10 h-full flex flex-col justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-indigo-100 text-[10px] font-black uppercase tracking-[0.2em] mb-3 backdrop-blur-xl border border-white/10">
                  <Sparkles className="w-3 h-3 text-amber-400" /> Executive Console
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tighter leading-[1.1] mb-2">
                  <span className="opacity-50 font-medium text-xl sm:text-2xl">{greeting.label},</span><br />
                  <span className="text-2xl sm:text-3xl">{user?.full_name || user?.name || "Manager"} {greeting.emoji}</span>
                </h1>
                <p className="text-slate-400 text-sm font-medium max-w-xs leading-relaxed">
                  {user?.role} at <span className="text-white font-bold">{user?.org_name || 'your organization'}</span>.
                  Your recruitment intelligence dashboard is ready. Total <span className="text-white font-bold">{myJDs.length} active pipelines</span>.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={() => navigate('/manager/my-jds')}
                  className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-[1rem] flex items-center gap-2 font-black text-[11px] shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all hover:-translate-y-1"
                >
                  <Plus className="w-4 h-4" /> REVIEW PENDING JDs
                </button>
              </div>
            </div>
          </div>

          <div className="w-full lg:basis-[60%] bg-white rounded-[40px] border border-blue-50 shadow-[0_20px_50px_rgba(37,99,235,0.05)] relative overflow-hidden group transition-all duration-500">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full translate-x-1/2 -translate-y-1/2 opacity-30 transition-transform duration-700 group-hover:scale-110" />
            
            <div 
              onClick={() => setIsWorkflowExpanded(!isWorkflowExpanded)}
              className="p-10 cursor-pointer flex justify-between items-center group/header"
            >
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl group-hover/header:rotate-12 transition-all shadow-lg shadow-indigo-500/20">
                    <Activity className="text-white" size={20} />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Timeline Workflow</h2>
                </div>
                <p className="text-slate-500 font-medium tracking-tight">Interactive journey of job description lifecycle</p>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsWorkflowExpanded(!isWorkflowExpanded);
                }}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border shadow-sm active:scale-95 z-20 ${
                  isWorkflowExpanded 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xl' 
                    : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50 hover:text-slate-600'
                }`}
              >
                {isWorkflowExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
              </button>
            </div>

            <AnimatePresence>
              {isWorkflowExpanded && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-12">
                    {/* TIMELINE Header Badge */}
                    <div className="flex justify-center mb-8">
                       <div className="bg-slate-900 text-white text-[10px] font-black tracking-[0.3em] px-6 py-2 rounded-full uppercase shadow-lg">
                          Timeline Flow
                       </div>
                    </div>

                    <div className="relative min-h-[500px]">
                        {/* Wavy Central Line */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-slate-100 -translate-x-1/2 rounded-full overflow-hidden">
                           <motion.div 
                              initial={{ height: 0 }}
                              animate={{ height: "100%" }}
                              transition={{ duration: 1.5, ease: "easeInOut" }}
                              className="w-full bg-gradient-to-b from-orange-400 via-blue-500 to-purple-600"
                           />
                        </div>

                        {/* Steps Container */}
                        <div className="space-y-4 relative">
                            {/* Step 1 - Right */}
                            <motion.div 
                               initial={{ opacity: 0, x: 20 }}
                               animate={{ opacity: 1, x: 0 }}
                               transition={{ delay: 0.3 }}
                               className="flex items-center"
                            >
                               <div className="w-1/2" />
                               <div className="w-10 h-10 rounded-full border-4 border-white bg-orange-500 shadow-lg shadow-orange-500/30 z-10 -ml-5" />
                               <div className="w-1/2 pl-6">
                                  <div className="bg-white p-4 rounded-3xl border border-orange-100 shadow-sm hover:shadow-md transition-shadow relative">
                                     <div className="absolute left-0 top-1/2 -translate-x-2 -translate-y-1/2 w-4 h-4 bg-white border-l border-b border-orange-100 rotate-45" />
                                     <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1 items-center flex gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500" /> STAGE 01
                                     </p>
                                     <h3 className="text-sm font-black text-slate-800 leading-tight">Draft Initiation</h3>
                                     <p className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-tighter">Initial structure & skills</p>
                                  </div>
                                </div>
                            </motion.div>

                            {/* Step 2 - Left */}
                            <motion.div 
                               initial={{ opacity: 0, x: -20 }}
                               animate={{ opacity: 1, x: 0 }}
                               transition={{ delay: 0.6 }}
                               className="flex items-center flex-row-reverse"
                            >
                               <div className="w-1/2" />
                               <div className="w-10 h-10 rounded-full border-4 border-white bg-cyan-500 shadow-lg shadow-cyan-500/30 z-10 -mr-5" />
                               <div className="w-1/2 pr-6 text-right">
                                  <div className="bg-white p-4 rounded-3xl border border-cyan-100 shadow-sm hover:shadow-md transition-shadow relative">
                                     <div className="absolute right-0 top-1/2 translate-x-2 -translate-y-1/2 w-4 h-4 bg-white border-r border-t border-cyan-100 rotate-45" />
                                     <p className="text-[10px] font-black text-cyan-600 uppercase tracking-widest mb-1 items-center flex gap-2 flex-row-reverse">
                                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" /> STAGE 02
                                     </p>
                                     <h3 className="text-sm font-black text-slate-800 leading-tight uppercase tracking-tighter">Manager Review</h3>
                                     <p className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-tighter">Section-level refinement</p>
                                  </div>
                                </div>
                            </motion.div>

                            {/* Step 3 - Right */}
                            <motion.div 
                               initial={{ opacity: 0, x: 20 }}
                               animate={{ opacity: 1, x: 0 }}
                               transition={{ delay: 0.9 }}
                               className="flex items-center"
                            >
                               <div className="w-1/2" />
                               <div className="w-10 h-10 rounded-full border-4 border-white bg-blue-500 shadow-lg shadow-blue-500/30 z-10 -ml-5" />
                               <div className="w-1/2 pl-6">
                                  <div className="bg-white p-4 rounded-3xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow relative">
                                     <div className="absolute left-0 top-1/2 -translate-x-2 -translate-y-1/2 w-4 h-4 bg-white border-l border-b border-blue-100 rotate-45" />
                                     <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 items-center flex gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> STAGE 03
                                     </p>
                                     <h3 className="text-sm font-black text-slate-800 leading-tight">Collaborate</h3>
                                     <p className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-tighter">Real-time feedback loop</p>
                                  </div>
                                </div>
                            </motion.div>

                            {/* Step 4 - Left */}
                            <motion.div 
                               initial={{ opacity: 0, x: -20 }}
                               animate={{ opacity: 1, x: 0 }}
                               transition={{ delay: 1.2 }}
                               className="flex items-center flex-row-reverse"
                            >
                               <div className="w-1/2" />
                               <div className="w-10 h-10 rounded-full border-4 border-white bg-pink-500 shadow-lg shadow-pink-500/30 z-10 -mr-5" />
                               <div className="w-1/2 pr-6 text-right">
                                  <div className="bg-white p-4 rounded-3xl border border-pink-100 shadow-sm hover:shadow-md transition-shadow relative">
                                     <div className="absolute right-0 top-1/2 translate-x-2 -translate-y-1/2 w-4 h-4 bg-white border-r border-t border-pink-100 rotate-45" />
                                     <p className="text-[10px] font-black text-pink-600 uppercase tracking-widest mb-1 items-center flex gap-2 flex-row-reverse">
                                        <div className="w-1.5 h-1.5 rounded-full bg-pink-500" /> STAGE 04
                                     </p>
                                     <h3 className="text-sm font-black text-slate-800 leading-tight">Finalized</h3>
                                     <p className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-tighter">Approved & ready to post</p>
                                  </div>
                                </div>
                            </motion.div>

                            {/* Step 5 - Center Final */}
                            <motion.div 
                               initial={{ scale: 0 }}
                               animate={{ scale: 1 }}
                               transition={{ delay: 1.5, type: "spring" }}
                               className="flex justify-center pt-4"
                            >
                               <div className="w-12 h-12 rounded-full border-4 border-white bg-purple-600 flex items-center justify-center shadow-xl shadow-purple-500/40 z-20">
                                  <Award className="text-white" size={24} />
                               </div>
                            </motion.div>
                        </div>
                    </div>

                    <motion.div 
                       initial={{ opacity: 0 }}
                       animate={{ opacity: 1 }}
                       transition={{ delay: 1.8 }}
                       className="mt-10 p-6 bg-slate-900 rounded-[2.5rem] shadow-2xl relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
                        <div className="relative z-10 flex items-center gap-4">
                           <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-400">
                             <Zap size={20} />
                           </div>
                           <p className="text-xs text-slate-400 font-medium leading-relaxed">
                             <span className="text-white font-black uppercase tracking-widest mr-2">Optimization:</span> 
                             Our new workflow reduces the gap between drafting and posting by 40% through direct manager collaboration.
                           </p>
                        </div>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Action Required Banner */}
        {stats[0].value > 0 && (
          <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100 flex items-center gap-5 mb-8">
            <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-purple-200">
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 tracking-tight">Action Required</h3>
              <p className="text-sm text-purple-700 font-medium">You have {stats[0].value} job description{stats[0].value > 1 ? 's' : ''} waiting for your review</p>
            </div>
          </div>
        )}

        {/* Mini Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-2 group hover:border-purple-100 transition-all">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className={`text-4xl font-extrabold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs and List */}
        <div className="space-y-6 pt-4">
          <div className="flex gap-2 p-1.5 bg-slate-100/50 rounded-2xl w-fit border border-slate-100 shadow-sm">
            {tabs.map((tab) => (
              <button
                key={tab.label}
                onClick={() => setActiveTab(tab.label)}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  activeTab === tab.label 
                    ? 'bg-white text-slate-900 shadow-md border border-slate-100' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {displayJDs.length === 0 ? (
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="flex flex-col items-center justify-center py-20 bg-white/50 dark:bg-white/5 rounded-[40px] border-2 border-dashed border-slate-100 dark:border-white/10 group hover:border-indigo-200 transition-all duration-500"
            >
               <div className="w-24 h-24 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-6 relative overflow-hidden">
                 <div className="absolute inset-0 bg-indigo-500/10 scale-0 group-hover:scale-150 transition-transform duration-700 rounded-full" />
                 <FileText className="w-10 h-10 text-slate-300 dark:text-slate-700 relative z-10 group-hover:text-indigo-400 transition-colors" />
               </div>
               <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">No JDs for {activeTab}</h3>
                <p className="text-slate-400 dark:text-slate-500 font-medium text-center max-w-xs px-6 leading-relaxed">
                  {activeTab === 'Review' 
                    ? "Excellent! You've cleared all pending reviews. Great job keeping the recruitment pipeline moving smoothly."
                    : activeTab === 'Approved'
                    ? "No approved JDs yet. Once you verify and approve a review, the final JD will appear in this archive."
                    : "No revisions requested currently. Your collaborative feedback loop is perfectly up to date."}
                </p>
            </motion.div>
          ) : (
            <div className="max-h-[720px] overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {displayJDs.map((jd) => (
                  <div key={jd.id} className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 group relative overflow-hidden flex flex-col">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    
                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <div className="flex-1 min-w-0 pr-2">
                        <h3 className="text-lg font-black text-slate-900 mb-1 group-hover:text-blue-600 transition-colors tracking-tight leading-tight truncate">{jd.title}</h3>
                        <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest">
                          {jd.department} • {jd.location} • {jd.type}
                        </p>
                      </div>
                      <span className={`shrink-0 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 border ${
                        jd.status?.toLowerCase() === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        (['submitted', 'in_review', 'active', 'pending'].includes(jd.status?.toLowerCase()) || jd.status?.toLowerCase().startsWith('review step')) ? 'bg-slate-900 text-white border-slate-900 shadow shadow-slate-200' :
                        (['rejected', 'declined'].includes(jd.status?.toLowerCase())) ? 'bg-rose-50 text-rose-700 border-rose-100' :
                        'bg-orange-50 text-orange-700 border-orange-100'
                      }`}>
                        {jd.status?.toLowerCase() === 'approved' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                        {jd.status?.toLowerCase() === 'approved' ? 'Approved' : 
                         (['rejected', 'declined'].includes(jd.status?.toLowerCase())) ? 'Rejected' : 
                         (['submitted', 'in_review', 'active', 'pending'].includes(jd.status?.toLowerCase()) || jd.status?.toLowerCase().startsWith('review step')) ? 'Review' : 
                         jd.status?.toLowerCase() === 'final' ? 'Final' :
                         jd.status?.charAt(0).toUpperCase() + jd.status?.slice(1)}
                      </span>
                    </div>
                    
                    <div className="flex gap-6 border-y border-slate-50 py-3 mb-4 relative z-10">
                        <div>
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Created by</p>
                           <p className="text-xs font-bold text-slate-700 truncate max-w-[100px]">{jd.authorName || "HR"}</p>
                        </div>
                       <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Submitted</p>
                          <p className="text-xs font-bold text-slate-700">
                            {jd.updated_at ? new Date(jd.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : jd.submittedAt || "N/A"}
                          </p>
                       </div>
                       {jd.reviewedAt && (
                         <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Reviewed</p>
                            <p className="text-xs font-bold text-slate-700">{jd.reviewedAt}</p>
                         </div>
                       )}
                    </div>

                    <button 
                      onClick={() => navigate(`/manager/review/${jd.id}`)}
                      className="mt-auto w-full bg-slate-900 text-white py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-blue-600 transition-all shadow-lg shadow-slate-200 active:scale-[0.97] relative z-10"
                    >
                      {activeTab === 'Approved' ? <Eye size={14} /> : <CheckCircle2 size={14} />}
                      {activeTab === 'Approved' ? 'View Full JD' : 'Review & Collaborate'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
  );
}
