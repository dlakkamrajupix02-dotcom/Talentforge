// import { useEffect, useState } from "react";
// import PageLayout from "../../layout/PageLayout";

// import JDForm from "../../components/JDForm";
// import JDPreview from "../../components/JDPreview";
// import CompliancePanel from "../../components/CompliancePanel";
// import ActionBar from "../../components/ActionBar";
// import { useLocation } from "react-router-dom";

// import { useContext } from "react";
// import { JDContext } from "../../context/JDContext";

// import { 
//   generateJD, 
//   createFromTemplate, 
//   autosaveJD, 
//   finalizeJD 
// } from "../../services/jdService";

// export default function GenerateJD() {

//   const location = useLocation();

//   useEffect(() => {

//   if (location.state?.template) {

//     setJD(location.state.template.content);

//   }

// }, [location.state]);

//  useEffect(() => {

//   if (location.state?.jd) {

//     const data = location.state.jd;

//     const normalizedJD = {
//       title: data.title || "",
//       summary: data.summary || "",
//       responsibilities: data.responsibilities || [],

//       qualifications: {
//         required:
//           data.qualifications?.required || [],
//         preferred:
//           data.qualifications?.preferred || []
//       },

//       eeo_statement:
//         data.eeo_statement ||
//         "We are an Equal Opportunity Employer..."
//     };

//     setJD(normalizedJD);

//   }

// }, [location.state]);
//   const { addJD } = useContext(JDContext);

//   const [jd, setJD] = useState(null);
//   const [loading, setLoading] = useState(false);

//   const handleGenerate = async (formData) => {

//     setLoading(true);

//     const result = await generateJD(formData);

//     setJD(result);

//     setLoading(false);
//   };

//   const handleReset = () => {

//   setJD(null);

// };

//   const handleSave = (status) => {

//   const savedJD = {
//     title: "Generated JD",
//     content: jd,
//     status
//   };

//   addJD(savedJD);

//   alert("JD saved!");

// };

//   return (
//     <PageLayout>

//       <div className="flex h-full">

//         {/* LEFT PANEL */}
//         <div className="w-1/3 border-r p-6">

//           <JDForm onGenerate={handleGenerate} />

//         </div>


//         {/* CENTER EDITOR */}

//         <div className="flex-1 p-6 overflow-auto">


//           {loading && (
//             <p className="text-gray-500">
//               Generating JD...
//             </p>
//           )}

//           {!loading && (
//             <JDPreview
//               jd={jd}
//               setJD={setJD}
//             />
//           )}

//           {jd && (
//             <ActionBar
//   jd={jd}
//   onSave={handleSave}
//   onReset={handleReset}
// />
//           )}

//         </div>


//         {/* RIGHT PANEL */}

//         <div className="w-1/5 border-l">

//           <CompliancePanel />

//         </div>

//       </div>

//     </PageLayout>
//   );
// }


import { useEffect, useState, useRef, useCallback } from "react";
import {
  FileText,
  Plus,
  Search,
  Sparkles,
  AlertCircle,
  ArrowLeft,
  Home,
  Shield,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useLocation, useParams, useNavigate } from "react-router-dom";

import JDForm from "../../components/common/JDForm";
import JDPreview from "../../components/common/JDPreview";
import CompliancePanel from "../../components/common/CompliancePanel";
import ActionBar from "../../components/common/ActionBar";
import EmptyJDState from "../../components/common/EmptyJDState";

import { useContext } from "react";
import { JDContext } from "../../context/JDContext";
import toast from "react-hot-toast";

import {
  generateJD,
  createFromTemplate,
  getJDById,
  updateSection,
  autosaveJD,
  finalizeJD,
  createSkeletonJD
} from "../../services/jdService";
import { getTemplateById } from "../../services/templateService";
import { getMockJDByTitle } from "../../mock/mockJD";
import { formatSingleSalary, formatSalaryRange, normalizeSectionsOrder } from "../../utils/formatJD";
import JDSkeletonLoader from "../../components/common/JDSkeletonLoader";
import GenerationErrorState from "../../components/common/GenerationErrorState";
import { Loader2 } from "lucide-react";

const CONTENT_META_KEYS = new Set([
  "_section_order",
  "_source",
  "_custom_fields_metadata",
  "Job Details",
  "sections_order",
  "sections_metadata",
]);

/** Build user_sections payload from wizard JD Content step (names with optional pre-filled data). */
function buildUserSectionsFromForm(formData) {
  const content = formData?.content || {};
  const order = Array.isArray(content._section_order) ? content._section_order : [];
  const keys = order.length
    ? order
        .map((item) => (typeof item === "object" && item !== null ? (item.point || item.title || "") : String(item)))
        .filter((name) => name.trim() && !CONTENT_META_KEYS.has(name))
    : Object.keys(content).filter((k) => !k.startsWith("_") && !CONTENT_META_KEYS.has(k));

  return keys.map((name) => {
    const raw = content[name];
    const meta = content._custom_fields_metadata?.[name] || {};
    const isArray = Array.isArray(raw);
    const type = meta.type || (isArray ? "points" : "text");
    let normalizedContent = null;

    if (isArray) {
      const points = raw
        .map((item) => {
          if (typeof item === "object" && item !== null) {
            return {
              point: item.title || item.point || "",
              weight: parseInt(item.weight, 10) || 0,
            };
          }
          return { point: String(item || ""), weight: 0 };
        })
        .filter((p) => p.point.trim());
      if (points.length) normalizedContent = points;
    } else if (typeof raw === "string" && raw.trim()) {
      normalizedContent = raw.trim();
    } else if (raw != null && raw !== "") {
      normalizedContent = raw;
    }

    return {
      name,
      type,
      content: normalizedContent,
      generate_if_empty: true,
      metadata: {
        push_to_csod: meta.push_to_csod !== false,
        view_section: meta.view_section !== false,
        field_type: meta.fieldType || null,
      },
    };
  });
}


// Example data for the "Try an example" feature
const EXAMPLE_JD_DATA = {
  title: "ICU Registered Nurse",
  companyName: "City Hospital",
  jobId: "CRI_ICU_01",
  jobFamily: "Nursing",
  jobLevel: "L3",
  department: "Critical Care",
  location: "Bengaluru, India",
  city: "Bengaluru",
  countryCode: "IN",
  seniority: "Senior",
  industry: "Healthcare",
  skills: "• 3+ years ICU experience\n• BLS/ACLS certification\n• Ventilator management\n• Critical thinking under pressure\n• Epic EMR proficiency",
  salary: "8,00,000 - 12,00,000",
  context: "12-bed ICU unit, night shift availability required, background verification mandatory"
};

// Modal Component to select Creation Type: AI vs Manual Skeleton
function JDCreationTypeModal({ isOpen, onClose, onSelectAI, onSelectManual, isCreating }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 dark:bg-[#020617]/80 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0f172a] rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-6 duration-300 p-8 sm:p-10">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
            <Plus className="w-8 h-8" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Create Job Description
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base mt-2 max-w-md mx-auto">
            Choose how you'd like to build your job description today
          </p>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
          {/* Option 1: AI Generation */}
          <button
            type="button"
            onClick={onSelectAI}
            disabled={isCreating}
            className="group relative flex flex-col p-6 bg-gradient-to-b from-slate-50 to-white dark:from-white/[0.03] dark:to-white/[0.01] hover:from-indigo-50/50 hover:to-blue-50/50 dark:hover:from-indigo-500/10 dark:hover:to-blue-500/10 rounded-3xl border-2 border-slate-200 dark:border-white/10 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 text-left transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 active:translate-y-0 cursor-pointer overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 group-hover:scale-110 transition-transform duration-300">
                <Sparkles className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold rounded-full uppercase tracking-wider">
                AI Powered
              </span>
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              Create using AI
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6 flex-1">
              Fill in basic role details and let AI craft a structured, compliant job description with competencies in seconds.
            </p>

            <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-auto group-hover:gap-3 transition-all">
              <span>Start with Form</span>
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </div>
          </button>

          {/* Option 2: Manual Creation */}
          <button
            type="button"
            onClick={onSelectManual}
            disabled={isCreating}
            className="group relative flex flex-col p-6 bg-gradient-to-b from-slate-50 to-white dark:from-white/[0.03] dark:to-white/[0.01] hover:from-emerald-50/50 hover:to-teal-50/50 dark:hover:from-emerald-500/10 dark:hover:to-teal-500/10 rounded-3xl border-2 border-slate-200 dark:border-white/10 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 text-left transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1 active:translate-y-0 cursor-pointer overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 group-hover:scale-110 transition-transform duration-300">
                {isCreating ? (
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                ) : (
                  <FileText className="w-6 h-6" />
                )}
              </div>
              <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold rounded-full uppercase tracking-wider">
                Instant Blank
              </span>
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              Create Manually
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6 flex-1">
              Start instantly with an empty skeleton and fill in duties, competencies, and qualifications directly in the live editor.
            </p>

            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-auto group-hover:gap-3 transition-all">
              <span>{isCreating ? "Creating Shell..." : "Open Blank Editor"}</span>
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </div>
          </button>
        </div>

        {/* Footer / Close */}
        <div className="flex items-center justify-center pt-2">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            Dismiss (defaults to AI form)
          </button>
        </div>

      </div>
    </div>
  );
}

export default function GenerateJD() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState(null);

  const location = useLocation();
  const {
    user,
    addJD,
    updateJD: updateJDContext,
    myJDs,
    allJDs,
    workflows,
    submitJDWithWorkflow
  } = useContext(JDContext);

  const [jd, setJD] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generationError, setGenerationError] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [formData, setFormData] = useState(null);

  const [isComplianceOpen, setIsComplianceOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState('saved'); // 'saved', 'saving', 'error'
  const isGeneratingRef = useRef(false);
  const userRole = (user?.role || "").toLowerCase();

  const isEditing = !!id || !!location.state?.jd || !!location.state?.template;
  const isNewCreation = !id && !location.state;
  const [showSidebar, setShowSidebar] = useState(isEditing);
  const [showCreationModal, setShowCreationModal] = useState(isNewCreation);
  const [creatingSkeleton, setCreatingSkeleton] = useState(false);

  // Sync showSidebar when mode changes
  useEffect(() => {
    if (isNewCreation) {
      setShowSidebar(false);
    } else {
      setShowSidebar(!isEditing);
    }
  }, [isEditing, isNewCreation]);


  const handleCreateSkeleton = async () => {
    setCreatingSkeleton(true);
    try {
      const result = await createSkeletonJD({ title: "Offline creation", industry: "Offline" });
      const mappedJD = mapBackendResponseToJD(result);
      mappedJD.generation_mode = "manual";
      const jdId = mappedJD.id || result.id || result.jd_id || `skel_${Date.now()}`;

      setJD(mappedJD);
      setEditingId(jdId);
      setShowCreationModal(false);
      setShowSidebar(false);

      const uid = user?.userId || user?.id || user?.email;
      const draftJD = {
        id: jdId,
        title: mappedJD.title || "Offline creation",
        status: 'draft',
        generation_mode: 'manual',
        content: { ...mappedJD, generation_mode: 'manual' },
        createdBy: uid,
        author: user?.full_name || user?.name || "HR User",
        department: mappedJD.department || "General",
        createdAt: new Date().toISOString(),
        history: [{ status: 'draft', timestamp: new Date().toISOString(), updatedBy: user?.full_name || user?.name || "HR User" }],
        comments: []
      };
      addJD(draftJD);

      const role = (user?.role || "").toLowerCase();
      const isAdmin = role.includes('admin');
      const isHR = role.includes('hr');
      const base = isAdmin ? 'admin' : (isHR ? 'hr' : 'manager');

      navigate(`/${base}/generate/manual/${jdId}`, { replace: true });
      toast.success("Blank Job Description created! Fill in the details below.");
    } catch (error) {
      console.error("Failed to create skeleton JD on server, using local fallback:", error);
      const fallbackId = `skel_${Date.now()}`;
      const fallbackJD = {
        id: fallbackId,
        title: "Offline creation",
        generation_mode: "manual",
        companyName: "",
        jobId: "",
        department: "",
        jobFamily: "",
        jobLevel: "",
        industry: "Offline",
        location: "",
        city: "",
        countryCode: "US",
        seniority: "",
        salary_symbol: "₹",
        salary_min_value: "",
        salary_max_value: "",
        salary_period: "/yr",
        salary_range: "",
        skills: "",
        context: "",
        summary: "",
        employment_type: "",
        essential_duties_and_responsibilities: "",
        responsibilities: [],
        coreCompetencies: [],
        functionalCompetencies: [],
        qualifications: { required: [], preferred: [] },
        eeo_statement: "",
        company_logo: "/logo.png",
        wordCount: 0,
        eeocFlags: [],
        custom_fields: []
      };

      setJD(fallbackJD);
      setEditingId(fallbackId);
      setShowCreationModal(false);
      setShowSidebar(false);

      const uid = user?.userId || user?.id || user?.email;
      addJD({
        id: fallbackId,
        title: "Offline creation",
        status: 'draft',
        generation_mode: 'manual',
        content: { ...fallbackJD, generation_mode: 'manual' },
        createdBy: uid,
        author: user?.full_name || user?.name || "User",
        department: "General",
        createdAt: new Date().toISOString(),
        history: [{ status: 'draft', timestamp: new Date().toISOString(), updatedBy: user?.full_name || "User" }],
        comments: []
      });

      const role = (user?.role || "").toLowerCase();
      const isAdmin = role.includes('admin');
      const isHR = role.includes('hr');
      const base = isAdmin ? 'admin' : (isHR ? 'hr' : 'manager');

      navigate(`/${base}/generate/manual/${fallbackId}`, { replace: true });
      toast.success("Blank Job Description created! Fill in the details below.");
    } finally {
      setCreatingSkeleton(false);
    }
  };

  useEffect(() => {
    // RESET STATE for "Create New JD" mode
    if (!id && !location.state) {
      setJD(null);
      setFormData(null);
      setEditingId(null);
      setGenerationError(false);
      setNotFound(false);
      setLoading(false);
      isGeneratingRef.current = false;
      setShowSidebar(false);
      setShowCreationModal(true);
      return;
    }


    if (!location.state) return;


    // TEMPLATE FLOW or USE TEMPLATE from Error UI
    if (location.state.template || location.state.jd) {
      // Clear error states so the preview UI can show up
      setGenerationError(false);
      setLoading(false);
      setNotFound(false);
      isGeneratingRef.current = false;

      const data = location.state.template || location.state.jd;
      const normalizedJD = location.state.template
        ? { 
            ...data.content, 
            title: data.title, 
            id: data.id, 
            employment_type: data.employment_type || data.employmentType || data.content?.employment_type || data.content?.employmentType || "" 
          }
        : mapBackendResponseToJD(data);

      setJD(normalizedJD);
      setEditingId(location.state.template ? null : (data.id || normalizedJD.id));

      // If navigating from search or error UI, we want to pre-fill the form
      if (location.state.jd) {
        setFormData({
          title: normalizedJD.title,
          companyName: normalizedJD.companyName,
          jobId: normalizedJD.jobId,
          department: normalizedJD.department,
          jobFamily: normalizedJD.jobFamily,
          jobLevel: normalizedJD.jobLevel,
          industry: normalizedJD.industry,
          location: normalizedJD.location,
          city: normalizedJD.city,
          countryCode: normalizedJD.countryCode,
          seniority: normalizedJD.seniority,
          salary_symbol: normalizedJD.salary_symbol,
          salary_min_value: normalizedJD.salary_min_value,
          salary_max_value: normalizedJD.salary_max_value,
          salary_period: normalizedJD.salary_period || normalizedJD.salary_unit,
          skills: normalizedJD.skills,
          context: normalizedJD.context
        });
      }
    }
  }, [location.key, id]);

  // handleAutoSave - Per-section debounced autosave using updateSection API
  const handleAutoSave = async (section, content) => {
    if (!editingId) return;

    setSyncStatus('saving');
    try {
      // Map section names to backend-expected names
      const mapping = {
        summary: 'summary',
        responsibilities: 'key_duties',
        coreCompetencies: 'core_competencies',
        functionalCompetencies: 'functional_competencies',
        qualifications_required: 'qualifications_required',
        qualifications_preferred: 'qualifications_preferred',
        eeo_statement: 'eeo_statement',
        title: 'title',
        jobId: 'job_id',
        department: 'department',
        jobFamily: 'job_family',
        jobLevel: 'job_level',
        companyName: 'company_name',
        company_logo: 'image_url'
      };

      const apiSection = mapping[section] || section;

      // For lists, we still need the point/weight schema — but never for order arrays
      let apiContent = content;
      const orderSections = new Set(["_section_order", "section_order", "sections_order"]);
      if (Array.isArray(content) && !orderSections.has(apiSection)) {
        apiContent = content.map(item => ({
          point: item.title || item.point || (typeof item === 'string' ? item : ""),
          weight: parseInt(item.weight) || 0
        }));
      } else if (orderSections.has(apiSection)) {
        apiContent = normalizeSectionsOrder(content);
      }

      // Ensure "Saving..." is visible for at least 1.5s for meaningful feedback
      const minDelay = new Promise(resolve => setTimeout(resolve, 1500));
      await Promise.all([
        updateSection(editingId, apiSection, apiContent),
        minDelay
      ]);

      setSyncStatus('saved');

      // SYNC LOCALLY to ensure persistence in case of page navigation
      if (editingId && jd) {
        const standardFields = ['title', 'department', 'location', 'industry', 'jobLevel', 'employmentType', 'seniority', 'salary_symbol', 'salary_min_value', 'salary_max_value', 'salary_period', 'jobFamily', 'job_family', 'jobId', 'job_id', 'companyName', 'company_name', 'company_logo'];
        let updated;
        if (standardFields.includes(section)) {
          updated = { ...jd, [section]: content };
        } else {
          updated = { ...jd, content: { ...(jd.content || {}), [section]: content } };
        }
        updateJDContext(editingId, updated);
      }
    } catch (error) {
      console.warn(`Autosave API connection failed, syncing locally only for ${section}`);

      // Still sync locally even if API fails
      if (editingId && jd) {
        const standardFields = ['title', 'department', 'location', 'industry', 'jobLevel', 'employmentType', 'seniority', 'salary_symbol', 'salary_min_value', 'salary_max_value', 'salary_period', 'jobFamily', 'job_family', 'jobId', 'job_id', 'companyName', 'company_name', 'company_logo'];
        let updated;
        if (standardFields.includes(section)) {
          updated = { ...jd, [section]: content };
        } else {
          updated = { ...jd, content: { ...(jd.content || {}), [section]: content } };
        }
        updateJDContext(editingId, updated);
      }

      // In non-backend mode, always show as 'saved' after minDelay if we didn't crash
      setSyncStatus('saved');
    }
  };
  // NEW: Fetch JD by ID from URL
  useEffect(() => {
    if (id && (!jd || jd.id !== id)) {
      const fetchJD = async () => {
        // Skip API fetch for template IDs - they should be handled by location.state
        if (id.startsWith('TEMP-') || id.startsWith('jd_mock')) {
          setLoading(false);
          return;
        }

        setLoading(true);
        setNotFound(false);
        try {
          const result = await getJDById(id);
          if (result && (result.content || result.job_description)) {
            const mapped = mapBackendResponseToJD(result);
            
            // If the employment_type is available in the location state, use it instantly
            if (location.state?.employment_type) {
              mapped.employment_type = location.state.employment_type;
            }

            setJD(mapped);
            setEditingId(id);

            // Asynchronously fetch template's employment_type if not already present in the mapped data
            if (result.template_id && !mapped.employment_type) {
              getTemplateById(result.template_id)
                .then((template) => {
                  if (template && (template.employment_type || template.employmentType)) {
                    setJD(currentJd => ({
                      ...currentJd,
                      employment_type: template.employment_type || template.employmentType
                    }));
                  }
                })
                .catch((err) => {
                  console.warn("Failed to fetch template for employment type:", err);
                });
            }
            // Also update formData for the form panel to ensure left panel is pre-filled
            setFormData({
              title: mapped.title,
              companyName: mapped.companyName,
              jobId: mapped.jobId,
              department: mapped.department,
              jobFamily: mapped.jobFamily,
              jobLevel: mapped.jobLevel,
              industry: mapped.industry,
              location: mapped.location,
              city: mapped.city,
              countryCode: mapped.countryCode,
              seniority: mapped.seniority,
              salary_symbol: mapped.salary_symbol,
              salary_min_value: mapped.salary_min_value,
              salary_max_value: mapped.salary_max_value,
              salary_period: mapped.salary_period || mapped.salary_unit,
              skills: mapped.skills,
              context: mapped.context
            });
          } else {
            setNotFound(true);
          }
        } catch (error) {
          console.error("Failed to fetch persistent JD:", error);
          // If 400 or 404, show not found UI
          if (error.status === 400 || error.status === 404) {
            setNotFound(true);
          } else {
            toast.error("Could not load the Job Description.");
          }
        } finally {
          setLoading(false);
        }
      };
      fetchJD();
    }
  }, [id]);


  // Helper function to map backend data to frontend state
  const mapBackendResponseToJD = (result, fallbackData = null) => {
    // Backend fetch uses 'content', generation uses 'job_description'
    const gen = result.content || result.job_description || {};
    const input = result.input_data || {};
    const jdId = result.id || result.jd_id;

    // Normalizing responsibilities from different potential formats
    let duties = [];
    const sourceDuties = gen.key_duties || gen.key_duties_with_weight_distribution || gen.essential_duties_and_responsibilities || [];

    if (Array.isArray(sourceDuties)) {
      duties = sourceDuties.map((item, idx) => ({
        id: item.id || `duty-${Date.now()}-${idx}-${Math.random()}`,
        title: item.point || item.duty || item.title || (typeof item === 'string' ? item : ""),
        weight: parseInt(item.weight) || 0,
        description: item.description || ""
      }));
    }

    // Normalizing competencies & qualifications
    const mapItems = (data, prefix = "item") => {
      if (!data) return [];
      if (Array.isArray(data)) {
        return data.map((item, idx) => ({
          id: item.id || `${prefix}-${Date.now()}-${idx}-${Math.random()}`,
          title: item.point || item.title || (typeof item === 'string' ? item : ""),
          weight: parseInt(item.weight) || 0,
          description: item.description || ""
        }));
      }
      if (typeof data === 'string') {
        return data.split(". ").filter(c => c.trim()).map((c, idx) => ({
          id: `${prefix}-${Date.now()}-${idx}-${Math.random()}`,
          title: c.trim(),
          description: "",
          weight: 0
        }));
      }
      return [];
    };

    const symbol = input.salary_symbol || result.salary_symbol || gen.salary_symbol || fallbackData?.salary_symbol || "₹";
    const normalizeSalary = (val) => {
      if (!val) return "";
      const num = parseFloat(val.toString().replace(/,/g, ""));
      if (isNaN(num)) return val;
      if ((symbol === "₹" || symbol === "INR") && num >= 1000) return (num / 100000).toString();
      if (symbol === "$" && num >= 1000) return (num / 1000).toString();
      return num.toString();
    };

    const minVal = normalizeSalary(input.salary_min_value || result.salary_min_value || gen.salary_min_value || fallbackData?.salary_min_value || "");
    const maxVal = normalizeSalary(input.salary_max_value || result.salary_max_value || gen.salary_max_value || fallbackData?.salary_max_value || "");

    const mapped = {
      title: input.title || result.job_title || result.title || gen.title || "",
      companyName: input.company_name || result.company_name || gen.company_name || "",
      jobId: input.job_id || result.job_id || gen.job_id || "",
      department: input.department || result.department || gen.department || "",
      jobFamily: input.job_family || result.job_family || gen.job_family || "",
      jobLevel: input.job_level || result.job_level || gen.job_level || "",
      industry: input.industry || result.industry || gen.industry || "",
      location: input.location || result.location || gen.location || "",
      city: input.city || result.city || gen.city || "",
      countryCode: input.country_code || result.country_code || gen.country_code || fallbackData?.countryCode || "US",
      seniority: input.seniority || result.seniority || gen.seniority || fallbackData?.seniority || "",
      salary_symbol: symbol,
      salary_min_value: minVal,
      salary_max_value: maxVal,
      salary_period: input.salary_period || result.salary_period || gen.salary_period || result.salary_unit || gen.salary_unit || fallbackData?.salary_period || "/yr",
      salary_range: input.salary_range_formatted || result.salary_range_formatted || gen.salary_range_formatted || formatSalaryRange(
        minVal,
        maxVal,
        symbol,
        input.salary_period || result.salary_period || gen.salary_period || result.salary_unit || gen.salary_unit || fallbackData?.salary_period || "/yr"
      ),
      skills: input.key_skills_and_requirements || input.key_skills || result.key_skills || gen.key_skills || fallbackData?.skills || "",
      context: input.additional_context || result.additional_context || gen.additional_context || fallbackData?.context || "",
      id: jdId,
      employment_type: result.employment_type || result.employmentType || gen.employment_type || gen.employmentType || fallbackData?.employment_type || fallbackData?.employmentType || "",
      company_logo: input.company_logo || result.image_url || result.company_logo || gen.company_logo || fallbackData?.company_logo || "/logo.png",
      wordCount: result.word_count || gen.word_count || 0,
      eeocFlags: result.eeoc_flags || gen.eeoc_flags || [],
      generation_mode: result.generation_mode || result.content?.generation_mode || gen.generation_mode || fallbackData?.generation_mode || (location.state?.template ? "template" : "ai"),
      org_id: result.org_id,
      creator_id: result.creator_id,
      content: { ...gen },
      ...Object.keys(gen || {}).reduce((acc, k) => {
        if (!['summary', 'essential_duties_and_responsibilities_text', 'essential_duties_and_responsibilities', 'core_competencies', 'functional_competencies', 'qualifications_required', 'qualifications_preferred', 'eeo_statement', 'title', 'company_name', 'job_id', 'department', 'job_family', 'job_level', 'industry', 'location', 'city', 'country_code', 'seniority', 'salary_symbol', 'salary_min_value', 'salary_max_value', 'salary_period', 'salary_unit', 'salary_range_formatted', 'key_skills', 'skills', 'additional_context', 'context', 'employment_type', 'employmentType', 'weight_view_responsibilities_view', 'weight_view_corecompetencies_view', 'weight_view_functionalcompetencies_view', 'weight_view_qualifications_required_view', 'weight_view_qualifications_preferred_view', 'generation_mode'].includes(k) && !k.endsWith('_view')) {
          acc[k] = gen[k];
        }
        return acc;
      }, {}),
      sections_metadata: result.sections_metadata || gen.sections_metadata || fallbackData?.sections_metadata || {},
      weight_view_responsibilities_view: gen.weight_view_responsibilities_view || "unlocked",
      weight_view_corecompetencies_view: gen.weight_view_corecompetencies_view || "unlocked",
      weight_view_functionalcompetencies_view: gen.weight_view_functionalcompetencies_view || "unlocked",
      weight_view_qualifications_required_view: gen.weight_view_qualifications_required_view || "unlocked",
      weight_view_qualifications_preferred_view: gen.weight_view_qualifications_preferred_view || "unlocked"
    };

    return mapped;
  };

  const mapJDToAutosavePayload = (jdData) => {
    const mapItems = (list) => {
      if (!Array.isArray(list)) return [];
      return list.map(item => ({
        point: item.title || item.point || (typeof item === 'string' ? item : ""),
        weight: parseInt(item.weight) || 0
      }));
    };

    const payload = {
      summary: jdData.summary,
      essential_duties_and_responsibilities: jdData.essential_duties_and_responsibilities,
      key_duties: mapItems(jdData.responsibilities),
      core_competencies: mapItems(jdData.coreCompetencies),
      functional_competencies: mapItems(jdData.functionalCompetencies),
      qualifications_required: mapItems(jdData.qualifications?.required),
      qualifications_preferred: mapItems(jdData.qualifications?.preferred),
      eeo_statement: jdData.eeo_statement,
      salary_symbol: jdData.salary_symbol,
      salary_min_value: jdData.salary_min_value,
      salary_max_value: jdData.salary_max_value,
      salary_period: jdData.salary_period || jdData.salary_unit,
      company_logo: jdData.company_logo,
      employment_type: jdData.employment_type || jdData.employmentType || "",
      sections_metadata: jdData.sections_metadata || {},
      weight_view_responsibilities_view: jdData.weight_view_responsibilities_view || "unlocked",
      weight_view_corecompetencies_view: jdData.weight_view_corecompetencies_view || "unlocked",
      weight_view_functionalcompetencies_view: jdData.weight_view_functionalcompetencies_view || "unlocked",
      weight_view_qualifications_required_view: jdData.weight_view_qualifications_required_view || "unlocked",
      weight_view_qualifications_preferred_view: jdData.weight_view_qualifications_preferred_view || "unlocked"
    };

    // Add dynamic sections
    Object.keys(jdData || {}).forEach(k => {
      if (!['id', 'org_id', 'creator_id', 'title', 'companyName', 'jobId', 'department', 'jobFamily', 'jobLevel', 'industry', 'location', 'city', 'countryCode', 'seniority', 'salary_symbol', 'salary_min_value', 'salary_max_value', 'salary_period', 'salary_range', 'skills', 'context', 'summary', 'essential_duties_and_responsibilities', 'responsibilities', 'coreCompetencies', 'functionalCompetencies', 'qualifications', 'eeo_statement', 'employment_type', 'company_logo', 'wordCount', 'eeocFlags', 'custom_fields', 'generation_mode', 'weight_view_responsibilities_view', 'weight_view_corecompetencies_view', 'weight_view_functionalcompetencies_view', 'weight_view_qualifications_required_view', 'weight_view_qualifications_preferred_view', 'sections_metadata'].includes(k) && !k.endsWith('_view')) {
        const val = jdData[k];
        if (k === "_section_order") {
          payload[k] = val;
        } else if (Array.isArray(val)) {
          payload[k] = val.map(l => ({ point: l.title || l.point || (typeof l === 'string' ? l : "") }));
        } else {
          payload[k] = val;
        }
      }
    });

    return payload;
  };





  // NEW: handleApplySuggestion - Automatically injects compliance fixes into the JD
  const handleApplySuggestion = (check) => {
    if (!jd) return;

    // Extract the text to add (look for text between single quotes or after "Add: ")
    let textToAdd = check.suggestion;
    const quoteMatch = check.suggestion.match(/'([^']+)'/);
    if (quoteMatch) {
      textToAdd = quoteMatch[1];
    } else {
      textToAdd = textToAdd.replace(/^(Add: |Suggestion: Add |Suggestion: )/i, "");
    }

    const section = check.remediationSection || "eeo_statement";
    const currentSectionContent = jd[section] || "";

    // Avoid duplicate addition if already contains the text
    if (currentSectionContent.includes(textToAdd.substring(0, 20))) {
      toast.error("This fix appears to be already applied.");
      return;
    }

    const newContent = currentSectionContent ? `${currentSectionContent}\n\n${textToAdd}` : textToAdd;

    // 1. Update State
    setJD(prev => ({
      ...prev,
      [section]: newContent
    }));

    // 2. Update Backend (Autosave) immediately
    handleAutoSave(section, newContent);

    // 3. Visual Feedback: Scroll to section and show success
    setTimeout(() => {
      const element = document.getElementById(`jd-${section}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add a temporary highlight class
        element.classList.add('ring-2', 'ring-emerald-500', 'ring-offset-4');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-emerald-500', 'ring-offset-4');
        }, 2000);
      }
    }, 100);

    toast.success(`Compliance fix applied to ${section.replace('_', ' ')}`);
  };

  const handleGenerate = useCallback(async (formData, isGenerating = true) => {
    if (loading || isGeneratingRef.current) {
      console.warn("[GenerateJD] Generation already in progress, aborting duplicate trigger.");
      return;
    }

    console.log(`[GenerateJD] Starting ${isGenerating ? 'generation' : 'save'} for:`, formData.title);
    isGeneratingRef.current = true;
    setFormData(formData);
    setLoading(true);
    setGenerationError(false);

    // Map frontend camelCase to backend snake_case
    const apiRequest = {
      title: formData.title,
      company_name: formData.companyName,
      job_id: formData.jobId,
      job_family: formData.jobFamily,
      job_level: formData.jobLevel,
      industry: formData.industry,
      department: formData.department,
      location: formData.location,
      city: formData.city,
      country_code: formData.countryCode,
      seniority: formData.seniority,
      salary_range: formatSalaryRange(formData.salary_min_value, formData.salary_max_value, formData.salary_symbol, formData.salary_period),

      salary_symbol: formData.salary_symbol,
      salary_min_value: formData.salary_min_value,
      salary_max_value: formData.salary_max_value,
      salary_period: formData.salary_period,
      key_skills_and_requirements: formData.skills,
      core_competencies: formData.coreCompetencies?.map(c => ({
        point: c.title || c.point || "",
        weight: parseInt(c.weight) || 0
      })) || [],
      functional_competencies: formData.functionalCompetencies?.map(c => ({
        point: c.title || c.point || "",
        weight: parseInt(c.weight) || 0
      })) || [],
      additional_context: formData.context,
      model_name: formData.model_name,
      custom_fields: (formData.custom_fields || []).reduce((acc, field) => {
        if (field.name && field.value) {
          if (Array.isArray(field.value)) {
            acc[field.name] = field.value.map(l => ({ point: l.title || l.point || l }));
          } else {
            acc[field.name] = [{ point: field.value }];
          }
        }
        return acc;
      }, {}),
      user_sections: buildUserSectionsFromForm(formData),
      sections_order: formData.content?._section_order || [],
    };


    try {
      let result;
      
      if (!isGenerating && editingId) {
        // Just save edits without AI generation
        const updatedJD = { ...location.state?.jd, content: formData.content };
        
        const standardFields = ['title', 'department', 'location', 'industry', 'jobLevel', 'employmentType', 'seniority', 'summary', 'essentialDuties', 'responsibilities', 'coreCompetencies', 'functionalCompetencies', 'qualifications', 'eeocStatement', 'companyName'];
        
        for (const field of standardFields) {
           const hasValue = typeof formData[field] === 'string' ? formData[field].trim() !== '' : (Array.isArray(formData[field]) ? formData[field].length > 0 : !!formData[field]);
           const existedBefore = location.state?.jd && location.state.jd[field] !== undefined;
           
           if (hasValue || existedBefore) {
               updatedJD[field] = formData[field];
           }
           // Remove standard frontend keys from the 'content' bag to avoid duplicate sections
           if (updatedJD.content && updatedJD.content[field] !== undefined) {
               delete updatedJD.content[field];
           }
        }

        await updateJDContext(editingId, updatedJD);
        setJD(updatedJD);
        toast.success("Changes saved successfully!");
        
        const isAdmin = userRole.includes('admin');
        const isHR = userRole.includes('hr');
        const base = isAdmin ? 'admin' : (isHR ? 'hr' : 'manager');
        navigate(`/${base}/generate/${editingId}`, { replace: true });
        
        setLoading(false);
        isGeneratingRef.current = false;
        return;
      }

      // If we're starting from a template, use the specialized creation API
      if (location.state?.template && !editingId) {
        result = await createFromTemplate(location.state.template.id, apiRequest);
      } else {
        result = await generateJD(apiRequest);
      }

      if (result && (result.jd_id || result.id)) {
        // Fetch the perfectly migrated JD from the backend to ensure stable section_N formatting
        const fetchId = result.jd_id || result.id;
        const fetchedJd = await getJDById(fetchId);
        
        if (fetchedJd && (fetchedJd.content || fetchedJd.job_description)) {
          const mappedJD = mapBackendResponseToJD(fetchedJd, formData);
          const jdId = mappedJD.id || fetchId;

          setJD(mappedJD);
          setEditingId(jdId);

        // Auto-save as draft immediately so it appears in the JD Library
        const uid = user?.userId || user?.id || user?.email;
        const draftJD = {
          id: jdId,
          title: mappedJD.title || formData?.title || "Untitled JD",
          status: 'draft',
          content: { ...mappedJD },
          createdBy: uid,
          author: user?.full_name || user?.name || "HR User",
          department: formData?.department || "General",
          createdAt: new Date().toISOString(),
          history: [{ status: 'draft', timestamp: new Date().toISOString(), updatedBy: user?.full_name || user?.name || "HR User" }],
          comments: []
        };
        addJD(draftJD);

        // Update URL to persist the JD - handle role-based base path
        const isAdmin = userRole.includes('admin');
        const isHR = userRole.includes('hr');
        const base = isAdmin ? 'admin' : (isHR ? 'hr' : 'manager');

        navigate(`/${base}/generate/${jdId}`, { replace: true });
        } // Close fetchedJd condition
      } else {
        // Fallback or error handling
        setJD({ ...formData, ...result });
      }
    } catch (error) {
      console.error("Generation failed:", error);
      setGenerationError(true);
      setLoading(false);
      isGeneratingRef.current = false;
      toast.error(error.message || "Job Description generation failed. Please try again.");
    } finally {

      setLoading(false);
      isGeneratingRef.current = false;
      console.log("[GenerateJD] Generation lifecycle complete.");
    }
  }, [loading, user, userRole, location.state, editingId, addJD, navigate]);

  const handleReset = () => {
    setJD(null);
    setFormData(null);
    setEditingId(null);
    setShowCreationModal(true);

    const userRole = (user?.role || "").toLowerCase();
    const isAdmin = userRole.includes('admin');
    const isHR = userRole.includes('hr');
    const base = isAdmin ? 'admin' : (isHR ? 'hr' : 'manager');

    navigate(`/${base}/generate`, { replace: true });
  };


  // const handleSave = (status) => {
  //   const savedJD = {
  //     title: "Generated JD",
  //     content: jd,
  //     status
  //   };
  //   addJD(savedJD);
  //   alert("JD saved!");
  // };

  const handleSave = async (status) => {
    if (!editingId) {
      toast.error("Please generate a JD first.");
      return;
    }

    const userRole = (user?.role || "").toLowerCase();
    const isHR = userRole.includes('hr');
    const isAdmin = userRole.includes('admin');
    // Resolve uid — authService stores both id and userId on mock users
    const uid = user?.userId || user?.id || user?.email;
    const base = isAdmin ? 'admin' : (isHR ? 'hr' : 'manager');

    try {
      const payload = mapJDToAutosavePayload(jd);

      if (status === "draft") {
        // Explicitly Save as draft on backend
        await autosaveJD(editingId, payload);

        // Mock fallback/Local sync logic
        const draftJD = {
          id: editingId,
          title: formData?.title || jd?.title || "Untitled JD",
          status: 'draft',
          content: { ...jd },
          createdBy: uid,
          author: user?.full_name || user?.name || "HR User",
          department: formData?.department || "General",
          createdAt: new Date().toISOString(),
          history: [{ status: 'draft', timestamp: new Date().toISOString(), updatedBy: user?.full_name || "User" }],
          comments: []
        };
        updateJDContext(editingId, draftJD);
        toast.success('Saved as Draft in Cloud!');
        navigate(`/${base}/my-jds`);

      } else if (status === "final") {
        // Finalize on backend
        await finalizeJD(editingId);

        // HR marks as finalized; Admin/Manager finalizes directly
        const targetStatus = isHR ? 'finalized' : 'approved';
        const savedJD = {
          id: editingId,
          title: formData?.title || jd?.title || "Untitled JD",
          status: targetStatus,
          content: { ...jd },
          createdBy: uid,
          author: user?.full_name || user?.name || "HR User",
          department: formData?.department || "General",
          createdAt: new Date().toISOString(),
          history: [{
            status: targetStatus,
            timestamp: new Date().toISOString(),
            updatedBy: user?.full_name || user?.name || (isAdmin ? "Admin" : (isHR ? "HR" : "Manager"))
          }],
          comments: []
        };

        updateJDContext(editingId, savedJD);
        setJD(prev => ({ ...prev, status: targetStatus }));
        toast.success(isHR ? 'Job Description finalized in Cloud!' : 'Job Description approved in Cloud!');
      }
    } catch (error) {
      console.error("Save/Finalize API failed, updating local only:", error);
      // Even if API fails, update local state
      toast.error("Cloud sync failed, saved locally instead.");
      if (status === "final") {
        const targetStatus = isHR ? 'finalized' : 'approved';
        setJD(prev => ({ ...prev, status: targetStatus }));
      } else {
        navigate(`/${base}/my-jds`);
      }
    }
  };

  // NEW: Handle filling form with example data from EmptyJDState
  const handleFillExample = (exampleData) => {
    setFormData(exampleData);
    // Optional: Scroll to form or show toast
    // toast.success("Example loaded! Click Generate JD to create.");
  };

  const [sidebarWidth, setSidebarWidth] = useState(400);
  const sidebarRef = useRef(null);

  const handleMouseMove = (e) => {
    const newWidth = e.clientX;
    if (newWidth > 390 && newWidth < 650) {
      if (sidebarRef.current) {
        sidebarRef.current.style.width = `${newWidth}px`;
        sidebarRef.current.style.minWidth = `${newWidth}px`;
      }
    }
  };

  const handleMouseUp = () => {
    if (sidebarRef.current) {
      const finalWidth = parseInt(sidebarRef.current.style.width);
      if (!isNaN(finalWidth)) {
        setSidebarWidth(finalWidth);
      }
    }
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div className="flex h-full overflow-hidden relative">
      {/* CREATION TYPE SELECTION MODAL */}
      <JDCreationTypeModal
        isOpen={showCreationModal}
        onClose={() => setShowCreationModal(false)}
        onSelectAI={() => {
          setShowCreationModal(false);
          setShowSidebar(true);
        }}
        onSelectManual={handleCreateSkeleton}
        isCreating={creatingSkeleton}
      />

      {/* LEFT PANEL */}

      {showSidebar && (
        <>
          <div
            ref={sidebarRef}
            className="border-r border-slate-200 dark:border-white/10 bg-white dark:bg-[#020617] flex flex-col transition-colors duration-300"
            style={{ width: `${sidebarWidth}px`, minWidth: `${sidebarWidth}px` }}
          >
            <div className="flex-1 overflow-y-auto p-6">
              <JDForm
                onGenerate={handleGenerate}
                initialData={formData}
              />
            </div>
          </div>

          {/* RESIZE HANDLE */}
          <div
            className="w-1.5 hover:w-2 bg-slate-100 dark:bg-white/5 hover:bg-blue-400 dark:hover:bg-indigo-500 cursor-col-resize transition-all duration-200 relative z-10 flex-shrink-0"
            onMouseDown={handleMouseDown}
          >
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-slate-200 dark:bg-white/10" />
          </div>
        </>
      )}

      {/* CENTER EDITOR */}
      <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50 dark:bg-slate-950 relative transition-colors duration-300">
        {notFound ? (
          <JDNotFound />
        ) : generationError ? (
          <GenerationErrorState onRetry={handleGenerate} formData={formData} />
        ) : loading ? (
          <JDSkeletonLoader />
        ) : jd ? (

          <>
            {isEditing && (
              <button
                onClick={() => {
                  const role = (user?.role || "").toLowerCase();
                  const basePath = role.includes('admin') ? 'admin' : (role.includes('hr') ? 'hr' : 'manager');
                  if (location.state?.template || location.state?.fromTemplate) {
                    navigate(`/${basePath}/templates`);
                  } else {
                    navigate(`/${basePath}/my-jds`);
                  }
                }}
                className="mb-4 flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all shadow-sm w-fit"
              >
                <ArrowLeft size={16} />
                {location.state?.template || location.state?.fromTemplate ? 'Back to Templates' : 'Back to Library'}
              </button>
            )}
            <JDPreview
              jd={jd}
              setJD={setJD}
              onAutoSave={handleAutoSave}
              syncStatus={syncStatus}
              readOnly={jd.status === 'submitted' || jd.status === 'approved' || jd.status === 'pushed'}
            />
            <ActionBar
              jd={jd}
              onSave={handleSave}
              onReset={handleReset}
              syncStatus={syncStatus}
              user={user}
              workflows={workflows}
              onSendForReview={submitJDWithWorkflow}
            />
          </>
        ) : (
          <EmptyJDState onFillExample={handleFillExample} />
        )}
      </div>

      {/* RIGHT PANEL */}
      <div className={`transition-all duration-300 border-l border-slate-200 dark:border-white/10 bg-white dark:bg-[#020617] relative flex flex-col ${isComplianceOpen ? 'w-1/5' : 'w-14'}`}>
        {/* Toggle Button */}
        <button
          onClick={() => setIsComplianceOpen(!isComplianceOpen)}
          title={isComplianceOpen ? "Collapse Panel" : "Expand Panel"}
          className={`absolute top-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[11px] font-semibold tracking-wide shadow-lg shadow-emerald-200 hover:shadow-emerald-300 hover:scale-105 active:scale-95 transition-all duration-200 select-none ${isComplianceOpen ? "-left-8" : "-left-[4.5rem]"}`}
        >
          {isComplianceOpen ? (
            <>
              <ChevronRight size={12} />
              <span>Hide</span>
            </>
          ) : (
            <>
              <Shield size={12} />
              <span>Compliance</span>
            </>
          )}
        </button>

        {isComplianceOpen ? (
          notFound ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 dark:text-slate-500">
              <Shield className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm font-medium text-slate-900 dark:text-white">Compliance Scanner</p>
              <p className="text-xs mt-1 leading-relaxed">Compliance metrics are not available for missing or deleted Job Descriptions.</p>
            </div>
          ) : (
            <CompliancePanel
              jdContent={jd}
              onApplySuggestion={handleApplySuggestion}
            />
          )
        ) : (
          <div className="h-full flex flex-col items-center pt-8 gap-8 text-slate-400 dark:text-slate-600">
            <div
              className="cursor-pointer hover:text-emerald-500 transition-colors"
              onClick={() => setIsComplianceOpen(true)}
            >
              <Shield size={20} />
            </div>
            <div className="flex flex-col items-center gap-6 select-none cursor-pointer" onClick={() => setIsComplianceOpen(true)}>
              <p className="[writing-mode:vertical-lr] rotate-180 text-[11px] font-bold uppercase tracking-[0.2em] opacity-40 dark:opacity-60 hover:opacity-100 transition-opacity">
                Compliance
              </p>
              <div className="w-1 h-32 bg-slate-100 dark:bg-white/5 rounded-full relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full bg-emerald-500 rounded-full" style={{ height: '75%' }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Low-profile but premium JD Not Found UI
function JDNotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="w-20 h-20 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mb-6 shadow-sm border border-red-100 dark:border-red-500/20">
        <AlertCircle className="w-10 h-10 text-red-500 dark:text-red-400" />
      </div>

      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Job Description Not Found</h2>
      <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8 leading-relaxed">
        The Job Description you're looking for might have been deleted, moved, or the link is invalid. Check the ID and try again.
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => {
            const role = user?.role?.toLowerCase() || "";
            const path = role.includes('admin') ? 'admin' : role.includes('hr') ? 'hr' : 'manager';
            navigate(`/${path}/my-jds`);
          }}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-white/5 border-2 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-white/10 transition-all shadow-sm"
        >
          <Home className="w-5 h-5" />
          My JDs List
        </button>

        <button
          onClick={() => navigate("/admin/generate")}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 dark:bg-indigo-600 text-white font-semibold rounded-xl hover:bg-blue-700 dark:hover:bg-indigo-700 transition-all shadow-lg shadow-blue-500/25 dark:shadow-indigo-500/25 group"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          Create New JD
        </button>
      </div>

      <button
        onClick={() => window.history.back()}
        className="mt-8 text-sm font-medium text-slate-400 hover:text-slate-600 flex items-center gap-1.5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Go back to previous page
      </button>
    </div>
  );
}
