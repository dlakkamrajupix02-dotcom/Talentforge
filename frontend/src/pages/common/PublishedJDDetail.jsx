import React, { useState, useEffect, useContext, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { JDContext } from "../../context/JDContext";
import * as jdService from "../../services/jdService";
import * as applicationService from "../../services/applicationService";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  DollarSign,
  Calendar,
  User,
  CheckCircle2,
  Users,
  Check,
  Mail,
  AlignLeft,
  List,
  Wand2,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Copy,
  Download
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatSalaryRange, stripHighlightTags, resolveSectionsOrder, resolveSectionObject, resolveSectionMeta, unwrapSectionData, sectionTextValue, isStableSection, isSectionContentEmpty, isWeightedSectionData, normalizeForWeightedList, resolveWeightLockState } from "../../utils/formatJD";

const StaticDisplay = ({ label, value }) => (
  <div className="flex flex-col gap-1.5 min-w-0">
    {label && <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>}
    <div className="flex items-center gap-2 text-slate-800 dark:text-white font-bold py-1 min-w-0">
      <span className="truncate" title={String(value || "N/A")}>{value || "N/A"}</span>
    </div>
  </div>
);

const normalizeComplexList = (list) => {
  if (!Array.isArray(list)) return [];
  return list.map(item => {
    if (typeof item === 'string') return { title: item, description: "", weight: 0 };
    return {
      title: item.title || item.point || item.duty || "Item",
      description: item.description || "",
      weight: item.weight || 0
    };
  });
};

const normalizeList = (list) => {
  if (!Array.isArray(list)) return [];
  return list.map(item => {
    if (typeof item === 'string') return item;
    return item.title || item.point || item.duty || "";
  }).filter(Boolean);
};

const WeightBar = ({ weight }) => (
  <div className="w-16 shrink-0 flex flex-col items-end gap-1.5">
    <span className="text-sm font-black text-indigo-500 leading-none tabular-nums">{weight}%</span>
    <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, weight))}%` }}
      />
    </div>
  </div>
);

const SabaPublishedJDContent = ({ jd, content }) => {
  const sectionsOrder = resolveSectionsOrder(jd);

  return (
    <>
      {sectionsOrder.map((sectionKey) => {
        if (sectionKey === "sections_order") return null;
        const sectionObj = resolveSectionObject(jd, sectionKey);
        if (!sectionObj) return null;

        const meta = resolveSectionMeta(sectionKey, sectionObj, jd?.sections_metadata);
        const sectionContent = unwrapSectionData(sectionObj);
        const isUserCreated = !!(
          jd?.sections_metadata?.[sectionKey] || jd?.sections_metadata?.labels?.[sectionKey]
        );
        if (isSectionContentEmpty(sectionObj) && !isUserCreated) return null;

        const isLocked = isStableSection(sectionObj)
          ? (sectionObj.metadata?.view ?? sectionObj.METADATA?.view) === "locked"
          : jd?.[`${sectionKey}_view`] === "locked";
        const isWeightLocked = resolveWeightLockState(jd, sectionKey, meta.label);
        const weighted = isWeightedSectionData(sectionContent, sectionKey, meta);
        const isPoints = meta.type === "points" || meta.type === "weighted_list" || Array.isArray(sectionContent);

        if (isLocked) return null;

        return (
          <section key={sectionKey} className="bg-white dark:bg-[#0f172a] rounded-[2.5rem] p-8 border border-slate-200/60 dark:border-white/5 shadow-sm space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-white/5 pb-4">
              <AlignLeft className="w-5 h-5 text-indigo-500" />
              <h3 className="font-black text-slate-800 dark:text-white text-md uppercase tracking-tight">{meta.label}</h3>
            </div>

            {isPoints ? (
              <div className="space-y-3 pt-2">
                {(weighted ? normalizeForWeightedList(sectionContent) : (Array.isArray(sectionContent) ? sectionContent : [])).map((item, i) => {
                  const isObj = typeof item === "object" && item !== null;
                  const title = isObj ? (item.point || item.title || item.name || "") : item;
                  const desc = isObj ? item.description : "";
                  const weight = isObj ? item.weight : undefined;

                  return (
                    <div key={i} className="flex gap-4 items-start p-4 bg-slate-50/80 dark:bg-white/[0.02] rounded-2xl border border-slate-100 dark:border-white/5 group hover:border-indigo-200/60 dark:hover:border-indigo-500/20 transition-colors">
                      <div className="w-8 h-8 rounded-xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0 shadow-sm text-[10px] font-black text-indigo-500">
                        {String(i + 1).padStart(2, "0")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-700 dark:text-slate-300 text-sm font-medium leading-relaxed">
                          {stripHighlightTags(String(title || ""))}
                        </p>
                        {desc && (
                          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-relaxed italic">
                            {stripHighlightTags(String(desc))}
                          </p>
                        )}
                      </div>
                      {!isWeightLocked && weight !== undefined && weight > 0 && (
                        <WeightBar weight={weight} />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-slate-50/50 dark:bg-white/[0.03] rounded-2xl p-6 border border-slate-100 dark:border-white/5 pt-2">
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {stripHighlightTags(sectionTextValue(sectionObj))}
                </p>
              </div>
            )}
          </section>
        );
      })}
    </>
  );
};

export default function PublishedJDDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(JDContext);

  const [jd, setJd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const userRole = user?.role?.toLowerCase() || "";
  const isAdmin = userRole.includes("admin");
  const isHR = userRole.includes("hr");
  const isManager = userRole.includes("manager");
  const isEndUser = userRole.includes("enduser") || userRole === "user";

  const backPath = isHR 
    ? "/hr/job-openings" 
    : isManager 
      ? "/manager/job-openings" 
      : isEndUser 
        ? "/enduser/job-openings" 
        : "/admin/job-openings";

  const [applications, setApplications] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);

  const fetchApplications = async (publicJdId) => {
    if (!publicJdId) return;
    setLoadingApps(true);
    try {
      const data = await applicationService.getApplications(publicJdId);
      const mapped = (Array.isArray(data) ? data : []).map(app => ({
        id: app.id,
        name: app.applicant_name || app.name || "Anonymous Applicant",
        email: app.applicant_email || app.email || "",
        status: app.status || "Applied",
        appliedAt: app.created_at || app.appliedAt || new Date().toISOString()
      }));
      setApplications(mapped);
    } catch (err) {
      console.error("Failed to load applications:", err);
    } finally {
      setLoadingApps(false);
    }
  };

  useEffect(() => {
    const fetchJD = async () => {
      setLoading(true);
      try {
        const jdData = await jdService.getJDById(id);
        setJd(jdData);
        const targetPublicId = jdData?.public_jd_id || id;
        if (targetPublicId) {
          await fetchApplications(targetPublicId);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load Job Description details.");
      } finally {
        setLoading(false);
      }
    };
    fetchJD();
  }, [id]);

  const hasApplied = useMemo(() => {
    if (!user) return false;
    return applications.some(app => (app.email || "").toLowerCase() === user.email.toLowerCase());
  }, [applications, user]);

  const handleApply = async () => {
    if (!user) {
      toast.error("Please login to apply.");
      return;
    }
    const targetPublicId = jd?.public_jd_id || id;
    if (!targetPublicId) {
      toast.error("Invalid Job Description ID.");
      return;
    }
    const loadingToast = toast.loading("Submitting application...");
    try {
      await applicationService.submitApplication({
        public_jd_id: targetPublicId,
        metadata: {}
      });
      toast.dismiss(loadingToast);
      toast.success("Application submitted successfully!");
      await fetchApplications(targetPublicId);
    } catch (err) {
      toast.dismiss(loadingToast);
      console.error(err);
      toast.error(err.message || "Failed to submit application.");
    }
  };

  const handleCopyId = (e, val) => {
    e.stopPropagation();
    navigator.clipboard.writeText(val);
    setCopiedId(true);
    toast.success("Public JD ID copied!");
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleExportExcel = async () => {
    const targetPublicId = jd?.public_jd_id || id;
    if (!targetPublicId) {
      toast.error("Invalid Job Description ID for export.");
      return;
    }
    setIsExporting(true);
    const exportToast = toast.loading("Exporting applications to Excel...");
    try {
      const blob = await applicationService.exportApplicationsExcel(targetPublicId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Applications_${stripHighlightTags(jd.title || content.title).replace(/\s+/g, "_")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.dismiss(exportToast);
      toast.success("Excel exported successfully!");
    } catch (err) {
      toast.dismiss(exportToast);
      console.error(err);
      toast.error(err.message || "Failed to export Excel file.");
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#020617]">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
          <p className="text-slate-500 font-bold text-sm">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (!jd) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#020617] p-8">
        <div className="text-center p-12 bg-white dark:bg-[#0f172a] rounded-[3rem] shadow-2xl border border-slate-100 max-w-md w-full">
          <AlertCircle size={48} className="text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase mb-2">Not Found</h2>
          <p className="text-slate-400 mb-6">The requested job opening could not be loaded.</p>
          <button onClick={() => navigate(backPath)} className="px-6 py-3 bg-indigo-500 text-white rounded-xl font-bold">
            Back to Openings
          </button>
        </div>
      </div>
    );
  }

  const content = jd.content || jd;
  const salary = jd.salary_range || formatSalaryRange(
    jd.salary_min_value || content.salary_min_value,
    jd.salary_max_value || content.salary_max_value,
    jd.salary_symbol || content.salary_symbol || "$",
    jd.salary_period || content.salary_period || ""
  );

  const responsibilities = normalizeComplexList(content.responsibilities || content.key_duties || content.essential_duties_and_responsibilities || jd.responsibilities);
  const coreCompetencies = normalizeComplexList(content.core_competencies || content.coreCompetencies || jd.coreCompetencies);
  const functionalCompetencies = normalizeComplexList(content.functional_competencies || content.functionalCompetencies || jd.functionalCompetencies);
  const requiredQuals = normalizeComplexList(content.qualifications?.required || content.qualifications_required || jd.qualifications_required);
  const preferredQuals = normalizeComplexList(content.qualifications?.preferred || content.qualifications_preferred || jd.qualifications_preferred);

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-[#020617] p-8 font-sans transition-all duration-300">
      {/* Decorative Blur Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        {/* Back Button */}
        <button
          onClick={() => navigate(backPath)}
          className="flex items-center gap-2.5 px-5 py-3 bg-white dark:bg-[#0f172a] hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border border-slate-200/80 dark:border-white/10 shadow-sm active:scale-95"
        >
          <ArrowLeft size={16} />
          Back to Openings
        </button>

        <div className="grid grid-cols-12 gap-8 items-start">
          {/* ─── LEFT COLUMN: JD DETAILS ─── */}
          <div className="col-span-12 lg:col-span-8 space-y-8">
            {/* Header Card */}
            <div className="bg-white dark:bg-[#0f172a] rounded-[3rem] p-12 border border-slate-200/60 dark:border-white/5 shadow-sm relative overflow-hidden group">
              <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
              <div className="relative z-10 space-y-8">
                <div className="flex justify-between items-start">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                    Published Open Position
                  </span>
                </div>

                <div className="space-y-6">
                  <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none uppercase">
                    {stripHighlightTags(jd.title || content.title)}
                  </h1>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100 dark:border-white/5">
                    <StaticDisplay label="Seniority" value={jd.seniority || content.seniority} />
                    <StaticDisplay label="Department" value={jd.department} />
                    <StaticDisplay label="Location" value={jd.location} />
                    <StaticDisplay label="Employment Type" value={jd.employment_type || jd.employmentType} />
                    <StaticDisplay label="Salary Range" value={salary !== "TBD" ? salary : "Competitive Salary"} />
                    <StaticDisplay label="Public JD ID" value={
                      jd.public_jd_id 
                        ? (jd.public_jd_id.length > 12 ? `${jd.public_jd_id.substring(0, 12)}...` : jd.public_jd_id) 
                        : (jd.job_id || jd.jobId || "N/A")
                    } />
                  </div>
                </div>
              </div>
            </div>
            {/* Content Sections */}
            <SabaPublishedJDContent jd={jd} content={content} />
          </div>

          {/* ─── RIGHT COLUMN: APPLICATIONS OR APPLY ACTION ─── */}
          <div className="col-span-12 lg:col-span-4 space-y-6 sticky top-10">
            {isAdmin ? (
              /* ADMIN APPLICANTS VIEW */
              <div className="bg-white dark:bg-[#0f172a] rounded-[2.5rem] p-8 border border-slate-200/60 dark:border-white/5 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-500" />
                    Applications
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-indigo-500/10 text-indigo-500 text-[10px] font-black rounded-full border border-indigo-500/20">
                      {applications.length} Candidates
                    </span>
                    <button
                      onClick={handleExportExcel}
                      disabled={isExporting || applications.length === 0}
                      className="p-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-xl shadow-sm transition-all flex items-center justify-center active:scale-95 shrink-0"
                      title={isExporting ? "Exporting..." : "Export applicants as Excel (.xlsx)"}
                    >
                      {isExporting ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {loadingApps ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-2">
                      <div className="w-6 h-6 border-2 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Loading applicants...</p>
                    </div>
                  ) : applications.length > 0 ? (
                    applications.map((app, i) => (
                      <div key={app.id || i} className="p-4 bg-slate-50 dark:bg-white/[0.03] rounded-3xl border border-slate-100 dark:border-white/5 hover:border-indigo-500/20 transition-all flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm tracking-tight">{app.name}</h4>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <Mail size={12} />
                              {app.email}
                            </p>
                          </div>
                          <span className="px-2 py-0.5 bg-indigo-500 text-white rounded-lg text-[8px] font-black uppercase tracking-wider shrink-0">
                            {app.status}
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-400 font-medium">
                          Applied: {app.appliedAt && !isNaN(Date.parse(app.appliedAt)) ? new Date(app.appliedAt).toLocaleDateString([], { dateStyle: 'medium' }) : "N/A"}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 space-y-2">
                      <Users className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No applicant till now</p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">No candidates have applied for this position yet.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* NON-ADMIN APPLY ACTION */
              <div className="bg-white dark:bg-[#0f172a] rounded-[2.5rem] p-8 border border-slate-200/60 dark:border-white/5 shadow-sm space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-2xl rounded-full" />
                
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-4 relative z-10">
                  <Briefcase className="w-4 h-4 text-indigo-500" />
                  Job Application
                </h3>

                <div className="relative z-10 space-y-4">
                  {hasApplied ? (
                    <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-[2rem] text-center space-y-3">
                      <CheckCircle2 size={32} className="text-emerald-500 mx-auto" />
                      <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Application Submitted</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                        You have already applied for this position. We will review your profile shortly.
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        By applying, your TalentForge profile details (Full name, Email, and role credentials) will be submitted to the recruitment team for evaluation.
                      </p>
                      <button
                        onClick={handleApply}
                        className="w-full py-5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] hover:shadow-xl hover:shadow-indigo-500/20 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        Apply for this Position
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Quick Share Card */}
            {jd.public_jd_id && (
              <div className="bg-white dark:bg-[#0f172a] rounded-[2.5rem] p-8 border border-slate-200/60 dark:border-white/5 shadow-sm space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Share Position</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={jd.public_jd_id}
                    className="flex-1 bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-[10px] font-medium text-slate-500 truncate"
                  />
                  <button
                    onClick={(e) => handleCopyId(e, jd.public_jd_id)}
                    className="p-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl text-slate-500 dark:text-slate-300 transition-colors"
                  >
                    {copiedId ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
