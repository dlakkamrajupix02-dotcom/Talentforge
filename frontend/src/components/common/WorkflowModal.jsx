import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  X, 
  Search, 
  Link as LinkIcon, 
  AlertCircle,
  Eye,
  Play,
  ArrowRight
} from "lucide-react";

export default function WorkflowModal({ 
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

    // If there's a search query, filter by it first
    if (workflowSearch.trim()) {
      const search = workflowSearch.toLowerCase();
      list = list.filter(wf => 
        (wf.name || "").toLowerCase().includes(search) || 
        (wf.department || "").toLowerCase().includes(search)
      );
    } else if (targetDepartment) {
      // If no search query but we have a target department, 
      // show matching department workflows first.
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

  if (!isOpen) return null;


  return createPortal(
    <div className="fixed inset-0 z-[40] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      <div className="relative bg-white dark:bg-[#0f172a] rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.3)] border border-slate-200 dark:border-white/10 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0 bg-white/80 dark:bg-[#020617]/80 backdrop-blur-xl">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white font-sans">Select Approval Workflow</h3>
            <p className="text-[13px] text-slate-500 mt-1 font-sans font-medium">Choose the review path for this Job Description</p>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-white/5 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Search */}
        <div className="p-6 pb-2 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Search workflows by name or department..."
              value={workflowSearch}
              onChange={(e) => setWorkflowSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium outline-none focus:border-indigo-500 transition-all text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar bg-slate-50/30 dark:bg-transparent">
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
                  <p className="text-sm text-slate-500 font-sans font-bold mb-1">
                    No matching workflows found
                  </p>
                  <p className="text-xs text-slate-400 font-sans">
                    No matching approval paths were found. 
                    {targetDepartment && ` No workflow exists for the "${targetDepartment}" department.`}
                  </p>
                  
                  {workflows.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-slate-100 dark:border-white/5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Available Departments</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {[...new Set(workflows.map(w => w.department))].filter(Boolean).map(dept => (
                          <span key={dept} className="px-2 py-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-[10px] font-bold text-slate-500">{dept}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            return filteredWorkflows.map(wf => {
              const wfId = wf.id || wf._id || wf.workflow_id;
              const isExpanded = expandedWorkflowId === wfId;

              return (
                <div
                  key={wfId}
                  className="w-full p-5 bg-white dark:bg-[#020617] rounded-2xl border-2 border-slate-100 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 hover:shadow-xl transition-all group relative overflow-hidden flex flex-col gap-4"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                  
                  <div className="flex items-center justify-between w-full relative z-10">
                    <span className="font-bold text-slate-900 dark:text-white text-[17px] font-sans">
                      {wf.name || "Untitled Workflow"}
                    </span>
                    <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
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
                    <div className="flex items-center gap-3 overflow-x-auto pb-1 custom-scrollbar relative z-10">
                      {(wf.steps || []).map((step, idx) => (
                        <div key={idx} className="flex items-center gap-3 shrink-0">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center text-[12px] font-black font-sans shadow-lg">{idx + 1}</div>
                            <div className="flex flex-col">
                              <span className="text-[11px] text-slate-900 dark:text-white font-bold font-sans leading-none truncate max-w-[100px]">
                               {(step.step_name || step.name || "").trim() || `Step ${idx + 1}`}
                              </span>
                              <span 
                                className="text-[10px] text-slate-400 font-sans mt-0.5 truncate max-w-[80px] font-medium"
                                title={step.user_email || step.reviewerEmail || step.email || 'TBD'}
                              >
                               {step.user_email || step.reviewerEmail || step.email || 'TBD'}
                              </span>
                            </div>
                          </div>
                          {idx < (wf.steps?.length || 0) - 1 && (
                            <div className="h-[2px] w-6 bg-slate-200 dark:bg-white/10 shrink-0" />
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
        <div className="px-8 py-6 bg-white dark:bg-[#020617] border-t border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select to initiate sequence</span>
           <button 
             onClick={onClose} 
             className="px-6 py-2.5 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-sm font-bold text-slate-600 dark:text-slate-300 rounded-xl transition-all font-sans border border-slate-200 dark:border-white/10"
           >
             Cancel
           </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
