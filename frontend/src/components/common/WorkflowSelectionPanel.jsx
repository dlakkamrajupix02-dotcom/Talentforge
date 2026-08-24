import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  X, 
  Search, 
  Link as LinkIcon, 
  AlertCircle,
  Play,
  ArrowRight,
  Eye
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function WorkflowSelectionPanel({ 
  isOpen, 
  onClose, 
  onConfirm, 
  workflows = [], 
  targetDepartment = "" 
}) {
  const [workflowSearch, setWorkflowSearch] = useState("");
  const [expandedWorkflowId, setExpandedWorkflowId] = useState(null);

  const filteredWorkflows = useMemo(() => {
    let list = Array.isArray(workflows) ? workflows.filter(wf => wf && wf.active !== false) : [];

    if (workflowSearch.trim()) {
      const search = workflowSearch.toLowerCase();
      list = list.filter(wf => 
        (wf.name || "").toLowerCase().includes(search) || 
        (wf.department || "").toLowerCase().includes(search)
      );
    } else if (targetDepartment) {
      const deptWorkflows = list.filter(wf => 
        (wf.department || "").toLowerCase() === targetDepartment.toLowerCase()
      );
      if (deptWorkflows.length > 0) {
        list = deptWorkflows;
      }
    }
    
    return list;
  }, [workflows, workflowSearch, targetDepartment]);

  useEffect(() => {
    if (isOpen) {
      setWorkflowSearch("");
      setExpandedWorkflowId(null);
    }
  }, [isOpen]);

  // Prevent background scrolling when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2000] flex justify-end">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/30 dark:bg-[#020617]/50 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Slide-out Panel */}
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-[550px] h-full bg-white dark:bg-[#0f172a] shadow-2xl flex flex-col border-l border-slate-200 dark:border-white/10"
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 pb-4 shrink-0 border-b border-slate-100 dark:border-white/5 bg-white/80 dark:bg-[#020617]/80 backdrop-blur-xl">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">Select Approval Workflow</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Choose the review path for this Job Description
                </p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="px-6 py-4 shrink-0 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="text"
                  placeholder="Search workflows by name or department..."
                  value={workflowSearch}
                  onChange={(e) => setWorkflowSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 dark:text-white font-medium"
                />
              </div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-55/30 dark:bg-transparent">
              {(() => {
                if (!workflows || workflows.length === 0) {
                  return (
                    <div className="text-center py-12 px-6">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200 dark:border-white/10">
                        <LinkIcon className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-sm text-slate-500 font-sans font-bold mb-1">No active workflows found</p>
                      <p className="text-xs text-slate-400 font-sans">Please contact your administrator to set up approval pipelines.</p>
                    </div>
                  );
                }

                if (filteredWorkflows.length === 0) {
                  return (
                    <div className="text-center py-12 px-6">
                      <div className="w-16 h-16 bg-amber-50 dark:bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-200 dark:border-amber-500/20">
                        <AlertCircle className="w-8 h-8 text-amber-500" />
                      </div>
                      <p className="text-sm text-slate-500 font-sans font-bold mb-1">No matching workflows found</p>
                      <p className="text-xs text-slate-400 font-sans">
                        No matching approval paths were found. 
                        {targetDepartment && ` No workflow exists for the "${targetDepartment}" department.`}
                      </p>
                    </div>
                  );
                }

                return filteredWorkflows.map(wf => {
                  const wfId = wf.id || wf._id || wf.workflow_id;
                  const isExpanded = expandedWorkflowId === wfId;

                  return (
                    <div
                      key={wfId}
                      className="w-full p-5 bg-white dark:bg-[#1e293b]/20 rounded-2xl border-2 border-slate-100 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 hover:shadow-xl transition-all group relative overflow-hidden flex flex-col gap-4"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                      
                      <div className="flex items-center justify-between w-full relative z-10">
                        <span className="font-bold text-slate-900 dark:text-white text-base">
                          {wf.name || "Untitled Workflow"}
                        </span>
                        <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
                          {wf.department || "General"}
                        </span>
                      </div>

                      {/* Expanded Vertical Timeline or Compact Horizontal Steps */}
                      {isExpanded ? (
                        <div className="flex flex-col gap-4 pl-2 relative z-10 border-l-2 border-dashed border-indigo-100 dark:border-indigo-500/20 ml-2.5 py-1">
                          {(wf.steps || []).map((step, idx) => (
                            <div key={idx} className="relative flex items-start gap-4">
                              <div className="absolute -left-[19px] top-1 w-4 h-4 rounded-full bg-indigo-500 dark:bg-indigo-600 flex items-center justify-center text-[9px] font-black text-white ring-4 ring-white dark:ring-[#0f172a]">
                                {idx + 1}
                              </div>
                              <div className="flex-1 min-w-0 bg-slate-50 dark:bg-white/[0.02] p-3 rounded-xl border border-slate-100 dark:border-white/5">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                    {step.step_name || step.name || `Step ${idx + 1}`}
                                  </span>
                                  <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/10 rounded text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                                    {step.role || "Manager"}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
                                  <span className="truncate">{step.user_email || step.reviewerEmail || step.email || "TBD"}</span>
                                  {typeof (step.sla_days ?? step.sla) !== 'undefined' && (
                                    <span className="font-semibold text-indigo-600 dark:text-indigo-400 shrink-0">
                                      SLA: {step.sla_days || step.sla} days
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        /* Step Trail */
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar w-full relative z-10">
                          {(wf.steps || []).map((step, idx) => (
                            <div key={idx} className="flex items-center gap-2 shrink-0">
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center text-[10px] font-black shadow">
                                  {idx + 1}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-slate-900 dark:text-white font-bold leading-none truncate max-w-[80px]">
                                    {(step.step_name || step.name || "").trim() || `Step ${idx + 1}`}
                                  </span>
                                  <span className="text-[8px] text-slate-400 truncate max-w-[60px] font-medium mt-0.5">
                                    {step.user_email || step.reviewerEmail || step.email || 'TBD'}
                                  </span>
                                </div>
                              </div>
                              {idx < (wf.steps?.length || 0) - 1 && (
                                <ArrowRight size={10} className="text-slate-300 dark:text-slate-600 shrink-0" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Action Bar */}
                      <div className="flex items-center justify-between border-t border-slate-100 dark:border-white/5 pt-3.5 mt-1 relative z-10 w-full">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedWorkflowId(isExpanded ? null : wfId);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                        >
                          <Eye size={14} />
                          {isExpanded ? "Hide Details" : "View Details"}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onConfirm(wfId);
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/20 hover:shadow-xl transition-all"
                        >
                          <Play size={12} className="fill-current" />
                          Select Workflow
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] flex items-center justify-between shrink-0">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Select to trigger workflow
              </span>
              <button 
                onClick={onClose}
                className="px-6 py-2.5 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-xl transition-all border border-slate-200 dark:border-white/10"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
