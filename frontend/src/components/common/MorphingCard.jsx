import { X, ArrowRight } from "lucide-react";

const scrollbarStyles = `
  .premium-scroll::-webkit-scrollbar {
    width: 8px;
  }
  .premium-scroll::-webkit-scrollbar-track {
    background: transparent;
    margin: 20px 0;
  }
  .premium-scroll::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.2);
    border-radius: 20px;
    border: 2px solid transparent;
    background-clip: content-box;
  }
  .premium-scroll::-webkit-scrollbar-thumb:hover {
    background: rgba(148, 163, 184, 0.4);
    background-clip: content-box;
  }
  .dark .premium-scroll::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    background-clip: content-box;
  }
  .dark .premium-scroll::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.2);
    background-clip: content-box;
  }
`;

const extractString = (val) => {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    return String(val.point || val.title || val.duty || val.description || val.name || val.text || JSON.stringify(val));
  }
  return String(val);
};

export default function MorphingCard({ cardData, onClose, onUse }) {
  if (!cardData) return null;
  const { template } = cardData;
  const isCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
  const sidebarWidth = window.innerWidth >= 1024 ? (isCollapsed ? 80 : 270) : 0;
  const availableWidth = window.innerWidth - sidebarWidth;
  const targetWidth = Math.min(1000, availableWidth - 64);
  const navbarHeight = 64;
  const availableHeight = window.innerHeight - navbarHeight;
  const targetHeight = Math.min(850, availableHeight - 40);
  const targetLeft = sidebarWidth + (availableWidth - targetWidth) / 2;
  const targetTop = navbarHeight + (availableHeight - targetHeight) / 2;

  // Data normalization for robust rendering
  // The new API structure nests the JD sections under content.content
  const templateContent = template.content || {};
  const innerContent = templateContent.content || templateContent;

  const displaySummary = template.professional_summary || template.responsibilities_overview || innerContent.summary || "";
  const jobId = template.job_id || template.template_code || innerContent.job_id || innerContent.jobId || "N/A";
  const department = template.department || innerContent.department || templateContent.department || "N/A";
  const jobFamily = template.job_family || innerContent.job_family || innerContent.jobFamily || "N/A";
  const jobLevel = template.job_level || innerContent.job_level || innerContent.jobLevel || "N/A";

  const duties = innerContent.key_duties || innerContent.responsibilities || [];
  const coreComps = innerContent.core_competencies || innerContent.coreCompetencies || [];
  const funcComps = innerContent.functional_competencies || innerContent.functionalCompetencies || [];
  const reqQuals = innerContent.qualifications_required || innerContent.qualifications?.required || innerContent.required_licenses_certifications || innerContent.licenses_and_certifications || [];
  const prefQuals = innerContent.qualifications_preferred || innerContent.qualifications?.preferred || [];

  const salaryRange = innerContent.salary_range || innerContent.salary || "";
  const tools = innerContent.tools_technologies || [];
  const compliance = innerContent.compliance_requirements || [];

  const isTech = template.industry?.toLowerCase().includes('tech');

  return (
    <>
      <style>{scrollbarStyles}</style>
      <div 
        className="fixed inset-0 bg-slate-900/60 dark:bg-[#020617]/90 backdrop-blur-md z-[1000] animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      <div
        className="fixed z-[1001] bg-white dark:bg-[#0f172a] shadow-2xl rounded-[40px] border border-transparent dark:border-white/10 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300"
        style={{
          top: targetTop,
          left: targetLeft,
          width: targetWidth,
          height: targetHeight,
        }}
      >
        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto premium-scroll pr-2 custom-scrollbar">
          {/* Modal Header Area */}
          <div className="p-10 pb-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <span className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest ${
                  isTech ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'
                }`}>
                  {template.industry || "General"}
                </span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  {template.template_code || template.id}
                </span>
              </div>
              <button 
                onClick={onClose} 
                className="p-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 rounded-full transition-all group"
              >
                <X size={20} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-white" />
              </button>
            </div>
            <h2 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter mb-10 leading-tight">
              {template.title}
            </h2>

            {/* Job Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-0 p-6 bg-slate-50/50 dark:bg-white/[0.02] rounded-[32px] border border-slate-100 dark:border-white/5 shadow-inner">
              <div className="px-4 py-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Code</p>
                <p className="text-base font-bold text-slate-900 dark:text-white truncate">{jobId}</p>
              </div>
              <div className="px-4 py-2 border-l border-slate-100 dark:border-white/5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Department</p>
                <p className="text-base font-bold text-slate-900 dark:text-white truncate">{department}</p>
              </div>
              <div className="px-4 py-2 border-l border-slate-100 dark:border-white/5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Job Level</p>
                <p className="text-base font-bold text-slate-900 dark:text-white truncate">{jobLevel}</p>
              </div>
              <div className="px-4 py-2 border-l border-slate-100 dark:border-white/5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Employment</p>
                <p className="text-base font-bold text-slate-900 dark:text-white">{template.employment_type || "N/A"}</p>
              </div>
              <div className="px-4 py-2 border-l border-slate-100 dark:border-white/5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Salary Range</p>
                <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{salaryRange || "N/A"}</p>
              </div>
            </div>
          </div>

          <div className="px-10 pb-8">
          <div className="space-y-16">
            <div>
              <h3 className="text-sm font-black text-indigo-500 uppercase tracking-[0.2em] mb-6">Summary</h3>
              <p className="text-xl font-medium text-slate-600 dark:text-slate-300 leading-relaxed tracking-tight">
                {displaySummary}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-black text-indigo-500 uppercase tracking-[0.2em]">
                  Key Responsibilities ({duties.length})
                </h3>
              </div>
              <div className="space-y-4">
                {duties.map((item, index) => (
                  <div key={index} className="group/resp p-6 bg-white dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.05] rounded-3xl border border-slate-100 dark:border-white/5 transition-all">
                    <div className="flex items-start gap-5">
                      <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-lg shadow-blue-500/20">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-bold text-slate-900 dark:text-white text-base tracking-tight">{extractString(item)}</h4>
                          {item?.weight && (
                            <span className="text-[10px] font-black text-slate-400 bg-slate-50 dark:bg-white/5 px-2 py-1 rounded-md uppercase tracking-widest group-hover/resp:text-blue-500 transition-colors shrink-0">
                              {item.weight}% Weight
                            </span>
                          )}
                        </div>
                        {item?.description && <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed italic">{extractString(item.description)}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Core Competencies */}
            {coreComps.length > 0 && (
              <div>
                <h3 className="text-sm font-black text-indigo-500 uppercase tracking-[0.2em] mb-6">Core Competencies</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {coreComps.map((comp, i) => (
                    <div key={i} className="p-5 bg-white dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 shadow-sm">
                      <p className="font-bold text-slate-900 dark:text-white mb-1.5 text-lg">{extractString(comp)}</p>
                      {comp?.description && <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{extractString(comp.description)}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Functional Competencies */}
            {funcComps.length > 0 && (
              <div>
                <h3 className="text-sm font-black text-indigo-500 uppercase tracking-[0.2em] mb-6">Functional Competencies</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {funcComps.map((comp, i) => (
                    <div key={i} className="p-5 bg-white dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 shadow-sm">
                      <p className="font-bold text-slate-900 dark:text-white mb-1.5 text-lg">{extractString(comp)}</p>
                      {comp?.description && <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{extractString(comp.description)}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tools & Technologies */}
            {tools.length > 0 && (
              <div>
                <h3 className="text-sm font-black text-indigo-500 uppercase tracking-[0.2em] mb-6">Tools & Technologies</h3>
                <div className="flex flex-wrap gap-2">
                  {tools.map((tool, i) => (
                    <span key={i} className="px-4 py-2 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 rounded-full text-sm font-bold border border-slate-200 dark:border-white/10">
                      {extractString(tool)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Compliance Requirements */}
            {compliance.length > 0 && (
              <div>
                <h3 className="text-sm font-black text-rose-500 uppercase tracking-[0.2em] mb-6">Compliance & Regulatory</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {compliance.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 bg-rose-50/30 dark:bg-rose-500/5 rounded-2xl border border-rose-100/50 dark:border-rose-500/10">
                      <div className="w-2 h-2 rounded-full bg-rose-500" />
                      <p className="text-sm font-bold text-rose-900 dark:text-rose-300 uppercase tracking-wider">{extractString(item)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Qualifications */}
            {(reqQuals.length > 0 || prefQuals.length > 0) && (
              <div>
                <h3 className="text-sm font-black text-indigo-500 uppercase tracking-[0.2em] mb-6">Qualifications</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {reqQuals.length > 0 && (
                    <div className="space-y-4">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-white/5 pb-2">Required</p>
                      <ul className="space-y-3">
                        {reqQuals.map((q, i) => (
                          <li key={i} className="flex gap-3 text-slate-600 dark:text-slate-300 text-[15px] leading-relaxed">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                            {extractString(q)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {prefQuals.length > 0 && (
                    <div className="space-y-4">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-white/5 pb-2">Preferred</p>
                      <ul className="space-y-3">
                        {prefQuals.map((q, i) => (
                          <li key={i} className="flex gap-3 text-slate-600 dark:text-slate-300 text-[15px] leading-relaxed">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0" />
                            {extractString(q)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* EEO Statement */}
            {(template.eeo_statement || innerContent.eeo_statement) && (
              <div className="pt-10 border-t border-slate-100 dark:border-white/5">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4">EEO Statement</h3>
                <p className="text-sm text-slate-400 dark:text-slate-500 italic leading-relaxed">
                  {template.eeo_statement || innerContent.eeo_statement}
                </p>
              </div>
            )}
          </div>
        </div>

            {/* Action Footer */}
            <div className="mt-12 p-8 bg-slate-50/80 dark:bg-white/5 backdrop-blur-xl border-t border-slate-100 dark:border-white/10 flex items-center justify-between rounded-[32px]">
              <button 
                onClick={onClose}
                className="px-8 py-4 text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold transition-colors"
              >
                Close
              </button>
              <button 
                onClick={() => onUse(template)}
                className="px-10 py-4 bg-blue-600 dark:bg-indigo-600 text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-blue-700 dark:hover:bg-indigo-700 transition-all shadow-xl shadow-blue-500/30 hover:-translate-y-0.5 flex items-center gap-3 active:scale-[0.98]"
              >
                Use This Template
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </>
    );
}

