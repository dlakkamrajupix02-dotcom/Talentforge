import React, { useState, useEffect, useRef, useCallback, useContext } from "react";

import { useParams, useNavigate, useLocation } from "react-router-dom";

import {

  ArrowLeft,

  Save,

  Check,

  Plus,

  Trash2,

  Sparkles,

  RefreshCw,

  FileText,

  Building2,

  MapPin,

  Briefcase,

  Clock,

  DollarSign,

  Award,

  ShieldCheck,

  ChevronDown,

  ChevronUp,

  Zap,

  Eye,

  Sliders,

  Send,

  Layers,

  LayoutGrid,

  CheckCircle2,

  HelpCircle,

  AlertCircle,

  Edit2,

  PanelRightClose,

  PanelRightOpen,
  EyeOff,
  Cloud,
  CloudOff,
  PieChart,
  Lock,
  Unlock
} from "lucide-react";

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';

import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';

import { CSS } from '@dnd-kit/utilities';

import { GripVertical } from 'lucide-react';

import { JDContext } from "../../context/JDContext";

import JDPreview from "../../components/common/JDPreview";

import ActionBar from "../../components/common/ActionBar";

import * as jdService from "../../services/jdService";

import toast from "react-hot-toast";

import { rebalanceWeights, isStableSection, unwrapSectionData, isWeightedSectionData, normalizeForEditableList, normalizeForWeightedList, toBackendSectionData, resolveSectionMeta, deleteAndReindexStableSections, resolveSectionsOrder, resolveSectionObject, resolveWeightLockState, applySectionsOrder, normalizeSectionsOrder, prepareRegeneratePayload, normalizeRegeneratedSectionContent } from "../../utils/formatJD";

import AddSectionModal from "../../components/common/AddSectionModal";

import EditableList from "../../components/common/EditableList";

import WeightedEditableList from "../../components/common/WeightedEditableList";

import AIPromptModal from "../../components/common/AIPromptModal";



const TOP_LEVEL_JD_FIELDS = new Set([
  "title", "department", "location", "city", "country_code", "seniority", "industry",
  "salary_symbol", "salary_min_value", "salary_max_value", "salary_period", "employment_type",
  "job_id", "jobId", "job_family", "jobFamily", "job_level", "jobLevel", "company_name",
  "companyName", "company_logo", "sections_metadata", "sections_order"
]);


function EditableSectionTitle({ title, onSave }) {

  const [isEditing, setIsEditing] = useState(false);

  const [tempTitle, setTempTitle] = useState(title);



  useEffect(() => {

    setTempTitle(title);

  }, [title]);



  const handleSave = () => {

    if (tempTitle.trim() && tempTitle.trim() !== title) {

      onSave(tempTitle.trim());

    }

    setIsEditing(false);

  };



  const handleKeyDown = (e) => {

    if (e.key === 'Enter') handleSave();

    if (e.key === 'Escape') {

      setTempTitle(title);

      setIsEditing(false);

    }

  };



  if (isEditing) {

    return (

      <input

        type="text"

        value={tempTitle}

        onChange={(e) => setTempTitle(e.target.value)}

        onBlur={handleSave}

        onKeyDown={handleKeyDown}

        autoFocus

        onClick={(e) => e.stopPropagation()}

        className="font-bold text-slate-800 dark:text-white text-sm tracking-tight bg-slate-50 dark:bg-slate-900 border border-emerald-500 rounded px-2 py-0.5 outline-none"

      />

    );

  }



  return (

    <div className="flex items-center gap-2 group/title" onClick={(e) => e.stopPropagation()}>

      <span>{title}</span>

      <button

        type="button"

        onClick={(e) => {

          e.stopPropagation();

          setIsEditing(true);

        }}

        className="p-1 text-slate-400 hover:text-emerald-500 transition-colors opacity-0 group-hover/title:opacity-100"

        title="Rename section"

      >

        <Edit2 className="w-3.5 h-3.5" />

      </button>

    </div>

  );

}



function SortableSection({ id, children, orderIndex, onDelete, extraActions }) {

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  

  const style = {

    transform: CSS.Transform.toString(transform),

    transition,

    order: orderIndex,

    zIndex: isDragging ? 50 : 1,

    position: 'relative'

  };

  

  return (

    <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-50' : ''}>

      <div className="absolute right-12 top-3.5 z-20 flex items-center gap-1">
        {extraActions}

        <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(id); }} className="p-1 text-slate-400 hover:text-red-500 transition-colors bg-white/80 dark:bg-slate-800/80 rounded" title="Delete Section">

          <Trash2 className="w-4 h-4" />

        </button>

        <div {...attributes} {...listeners} className="p-1 text-slate-400 hover:text-blue-500 transition-colors cursor-grab active:cursor-grabbing bg-white/80 dark:bg-slate-800/80 rounded" title="Drag to reorder">

          <GripVertical className="w-4 h-4" />

        </div>

      </div>

      {children}

    </div>

  );

}



export default function ManualJDEditor() {

  const { id } = useParams();

  const navigate = useNavigate();

  const location = useLocation();



  const {

    user,

    myJDs,

    allJDs,

    addJD,

    updateJD: updateJDContext,

    refreshMyJDs,

    workflows,

    submitJDWithWorkflow

  } = useContext(JDContext);



  const role = (user?.role || "").toLowerCase();

  const isAdmin = role.includes("admin");

  const isHR = role.includes("hr");

  const base = isAdmin ? "admin" : (isHR ? "hr" : "manager");



  const [jd, setJD] = useState(null);

  const [isLoading, setIsLoading] = useState(true);

  const [syncStatus, setSyncStatus] = useState("saved"); // 'saved', 'saving', 'error'

  const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false);
  const [generatingSection, setGeneratingSection] = useState(null);
  const [promptModal, setPromptModal] = useState({ isOpen: false, section: null, title: "", pointIndex: null, existingData: "" });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const hasLoadedRef = useRef(null);



  useEffect(() => {

    hasLoadedRef.current = null;

  }, [id]);



  // ALL ACCORDIONS CLOSED BY DEFAULT

  const [openSections, setOpenSections] = useState({

    basic: false,

    salary: false,

    summary: false,

    duties: false,

    coreComp: false,

    funcComp: false,

    qualifications: false,

    eeo: false,

    customFields: false

  });



  const toggleSection = (sec) => {

    setOpenSections(prev => ({ ...prev, [sec]: !prev[sec] }));

  };



  const sensors = useSensors(

    useSensor(PointerSensor),

    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })

  );



  const STANDARD_SECTIONS = ['basic', 'salary'];

  const IGNORED_KEYS = [ "id", "org_id", "creator_id", "template_id", "title", "companyName", "company_name", "jobId", "job_id", "jobFamily", "job_family", "jobLevel", "job_level", "department", "location", "city", "countryCode", "country_code", "seniority", "industry", "salary_range", "salary_symbol", "salary_min_value", "salary_max_value", "salary_period", "salary_unit", "salary_range_formatted", "employmentType", "employment_type", "key_skills", "skills", "additional_context", "context", "image_url", "company_logo", "content", "custom_fields", "sections_metadata", "eeoc_flags", "eeocFlags", "eeoc_cleared", "status", "public_jd_id", "wordCount", "word_count", "generation_mode", "finalized_at", "parent_jd_id", "is_main", "version_history", "created_at", "updated_at", "createdAt", "updatedAt", "creatorName", "creator_name", "authorName", "author_name", "canEdit", "can_edit", "csod_ou_id", "csodOuId", "csod_pushed_at", "csodPushedAt", "deleted_at", "deletedAt", "model_used", "modelUsed", "input_prompt", "inputPrompt", "_section_order", "_source", "_custom_fields_metadata", "sections_order", "headers_metadata" ];

  // Use sections_order from content (stable-key format) as the source of truth
  const sectionsOrder = resolveSectionsOrder(jd);
  
  // Fallback: if no sections_order, check sections_metadata.order
  const metaOrder = Array.isArray(jd?.sections_metadata?.order) ? jd.sections_metadata.order : [];
  
  const dynamicSectionKeys = sectionsOrder.length > 0 ? sectionsOrder : metaOrder;

  // Ensure STANDARD_SECTIONS always come first and are not duplicated
  const filteredDynamicKeys = dynamicSectionKeys.filter(k =>
    !STANDARD_SECTIONS.includes(k.toLowerCase().trim()) &&
    (!String(k).startsWith("section_") || resolveSectionObject(jd, k) !== undefined)
  );
  const currentOrder = [...new Set([...STANDARD_SECTIONS, ...filteredDynamicKeys])];

  const getOrder = (key) => {
    const idx = currentOrder.indexOf(key);
    return idx !== -1 ? idx : 999;
  };



  const handleRegenerateClick = (section, title) => {
    const payload = prepareRegeneratePayload(section, jd);
    setPromptModal({
      isOpen: true,
      section,
      title,
      pointIndex: null,
      existingData: payload.existingData,
      sectionLabel: payload.sectionLabel,
      sectionType: payload.sectionType,
    });
  };

  const handleRegeneratePointClick = (section, title, index, existingData) => {
    let existingText = existingData;
    if (typeof existingData === 'object' && existingData !== null) {
      existingText = existingData.title || existingData.description || JSON.stringify(existingData);
    }
    setPromptModal({ isOpen: true, section, title, pointIndex: index, existingData: existingText });
  };

  const handlePromptSubmit = async (prompt) => {
    if (!jd?.id) {
      toast.error("Please wait until JD is initialized.");
      return;
    }
    setGeneratingSection(promptModal.section);
    setPromptModal({ ...promptModal, isOpen: false });

    try {
      const apiSection = promptModal.section;
      let result;

      if (promptModal.pointIndex !== null && promptModal.pointIndex !== undefined) {
        result = await jdService.regeneratePoint(apiSection, promptModal.existingData, prompt);
        let newPoint = result?.new_point || result?.data?.new_point || result?.new_content || result;
        if (typeof newPoint === 'object' && newPoint !== null) {
          newPoint = newPoint.new_point || newPoint.content || newPoint.text || JSON.stringify(newPoint);
        }
        
        if (newPoint) {
          const preserveObject = (list, index) => {
            const existing = list[index];
            if (typeof existing === 'object' && existing !== null) {
              return { ...existing, title: newPoint };
            }
            return newPoint;
          };
          const sectionObj = resolveSectionObject(jd, promptModal.section);
          const currentList = [...(unwrapSectionData(sectionObj) || [])];
          currentList[promptModal.pointIndex] = preserveObject(currentList, promptModal.pointIndex);
          const meta = resolveSectionMeta(promptModal.section, sectionObj, jd?.sections_metadata);
          updateSectionField(promptModal.section, currentList, { label: promptModal.title, type: meta.type || "points" });
        }
        return;
      }

      result = await jdService.regenerateSection(
        apiSection,
        promptModal.existingData,
        prompt,
        jd,
        { sectionLabel: promptModal.sectionLabel || promptModal.title, sectionType: promptModal.sectionType }
      );
      let updatedContent = result?.new_content || result?.data || result;

      if (updatedContent && typeof updatedContent === 'object' && !Array.isArray(updatedContent)) {
        updatedContent = updatedContent.text || updatedContent.content || updatedContent.value || JSON.stringify(updatedContent);
      }

      if (updatedContent) {
        const sectionKey = promptModal.section;
        const existingSection = resolveSectionObject(jd, sectionKey);
        const meta = resolveSectionMeta(sectionKey, existingSection, jd?.sections_metadata);
        const normalizedValue = normalizeRegeneratedSectionContent(updatedContent, meta, sectionKey);
        updateSectionField(sectionKey, normalizedValue, { label: promptModal.title, type: meta.type });
      }
    } catch (error) {
      console.error(`Regeneration of ${promptModal.section} failed:`, error);
      toast.error("AI Assistant failed to regenerate section. Please try again.");
    } finally {
      setGeneratingSection(null);
    }
  };

  const handleDragEnd = async (event) => {

    const { active, over } = event;

    if (over && active.id !== over.id) {

      const oldIndex = currentOrder.indexOf(active.id);

      const newIndex = currentOrder.indexOf(over.id);

      const newOrder = arrayMove(currentOrder, oldIndex, newIndex);

      updateJDState((prev) => applySectionsOrder(prev, newOrder), "sections_order");

      try {
        await jdService.updateSection(id, "sections_order", newOrder);

      } catch (err) {

        toast.error("Failed to save section order");

      }

    }

  };



  const handleDeleteSection = async (sectionKey) => {

    if (!window.confirm("Are you sure you want to permanently delete this section?")) return;

    updateJDState(prev => {
      const reindexed = deleteAndReindexStableSections(
        prev.content || {},
        prev.sections_metadata || {},
        sectionKey
      );
      const next = {
        ...prev,
        content: reindexed.content,
        sections_metadata: reindexed.sections_metadata,
        sections_order: reindexed.content.sections_order,
      };
      Object.keys(next).forEach((k) => {
        if (k.startsWith("section_")) delete next[k];
      });
      Object.keys(reindexed.content).forEach((k) => {
        if (k.startsWith("section_")) next[k] = reindexed.content[k];
      });
      return next;
    }, 'sections_metadata');

    try {

      await jdService.deleteSection(id, sectionKey);

      toast.success("Section deleted");

    } catch (err) {

      toast.error("Failed to delete section");

    }

  };





  // Load existing JD or initialize new skeleton JD

  useEffect(() => {

    if (hasLoadedRef.current === id) return;

    let isMounted = true;

    const loadJD = async () => {

      setIsLoading(true);

      try {

        // 1. Check local context first

        const existingInContext = (allJDs || []).find(j => String(j.id) === String(id)) ||

          (myJDs || []).find(j => String(j.id) === String(id));



        if (existingInContext) {

          const content = existingInContext.content || existingInContext;

          const normalized = {
            ...content,
            id: existingInContext.id,

            sections_metadata: existingInContext.sections_metadata || content.sections_metadata || {},
            content: content.content || content,

            title: content.title || existingInContext.title || "Offline creation",

            companyName: content.companyName || content.company_name || "",

            jobId: content.jobId || content.job_id || "",

            department: content.department || existingInContext.department || "",

            jobFamily: content.jobFamily || content.job_family || "",

            jobLevel: content.jobLevel || content.job_level || "",

            industry: content.industry || "General",

            location: content.location || "",

            city: content.city || "",

            countryCode: content.countryCode || content.country_code || "US",

            seniority: content.seniority || "Mid Level",

            salary_symbol: content.salary_symbol || "₹",

            salary_min_value: content.salary_min_value || "",

            salary_max_value: content.salary_max_value || "",

            salary_period: content.salary_period || "/yr",

            salary_range: content.salary_range || "",

            skills: content.skills || "",

            context: content.context || "",

            summary: content.summary || "",

            employment_type: content.employment_type || content.employmentType || "Full-time",

            essential_duties_and_responsibilities: content.essential_duties_and_responsibilities || content.role_narrative || "",

            responsibilities: Array.isArray(content.responsibilities) ? content.responsibilities : (

              Array.isArray(content.key_duties) ? content.key_duties.map((d, i) => ({

                id: d.id || `duty-${i}`,

                title: d.point || d.title || (typeof d === 'string' ? d : ""),

                weight: d.weight || 0,

                description: d.description || ""

              })) : []

            ),

            coreCompetencies: Array.isArray(content.coreCompetencies) ? content.coreCompetencies : (Array.isArray(content.core_competencies) ? content.core_competencies : []),

            functionalCompetencies: Array.isArray(content.functionalCompetencies) ? content.functionalCompetencies : (Array.isArray(content.functional_competencies) ? content.functional_competencies : []),

            qualifications: {

              required: Array.isArray(content.qualifications?.required) ? content.qualifications.required : [],

              preferred: Array.isArray(content.qualifications?.preferred) ? content.qualifications.preferred : []

            },

            eeo_statement: content.eeo_statement || "",

            custom_fields: Array.isArray(content.custom_fields) ? content.custom_fields : [],

            generation_mode: "manual",

            status: existingInContext.status || "draft"

          };



          if (isMounted) {

            setJD(normalized);

            setIsLoading(false);

            hasLoadedRef.current = id;

          }

          return;

        }



        // 2. Fetch from API if not in context

        if (id && !id.startsWith("skel_")) {

          const res = await jdService.getJDById(id);

          if (res && isMounted) {

            const content = res.content || res.job_description || res;

            const mapped = {
              ...content,
              id: res.id || id,

              sections_metadata: res.sections_metadata || content.sections_metadata || {},
              content: content.content || content,

              title: content.title || res.title || "Offline creation",

              companyName: content.company_name || content.companyName || "",

              jobId: res.job_id || content.job_id || content.jobId || "",

              department: content.department || res.department || "",

              jobFamily: content.job_family || content.jobFamily || "",

              jobLevel: content.job_level || content.jobLevel || "",

              industry: content.industry || "General",

              location: content.location || "",

              city: content.city || "",

              countryCode: content.country_code || content.countryCode || "US",

              seniority: content.seniority || "Mid Level",

              salary_symbol: content.salary_symbol || "₹",

              salary_min_value: content.salary_min_value || "",

              salary_max_value: content.salary_max_value || "",

              salary_period: content.salary_period || "/yr",

              salary_range: content.salary_range || "",

              skills: content.skills || "",

              context: content.context || "",

              summary: content.summary || "",

              employment_type: content.employment_type || "Full-time",

              essential_duties_and_responsibilities: content.essential_duties_and_responsibilities || content.role_narrative || "",

              responsibilities: Array.isArray(content.key_duties)

                ? content.key_duties.map((d, i) => ({

                  id: d.id || `duty-${i}`,

                  title: d.point || d.title || (typeof d === 'string' ? d : ""),

                  weight: d.weight || 0,

                  description: d.description || ""

                }))

                : (Array.isArray(content.responsibilities) ? content.responsibilities : []),

              coreCompetencies: Array.isArray(content.core_competencies)

                ? content.core_competencies.map((c, i) => ({

                  id: c.id || `core-${i}`,

                  title: c.point || c.title || (typeof c === 'string' ? c : ""),

                  weight: c.weight || 0,

                  description: c.description || ""

                }))

                : (Array.isArray(content.coreCompetencies) ? content.coreCompetencies : []),

              functionalCompetencies: Array.isArray(content.functional_competencies)

                ? content.functional_competencies.map((c, i) => ({

                  id: c.id || `func-${i}`,

                  title: c.point || c.title || (typeof c === 'string' ? c : ""),

                  weight: c.weight || 0,

                  description: c.description || ""

                }))

                : (Array.isArray(content.functionalCompetencies) ? content.functionalCompetencies : []),

              qualifications: {

                required: Array.isArray(content.qualifications_required)

                  ? content.qualifications_required.map((q, i) => ({

                    id: q.id || `req-${i}`,

                    title: q.point || q.title || (typeof q === 'string' ? q : ""),

                    weight: q.weight || 0,

                    description: q.description || ""

                  }))

                  : (Array.isArray(content.qualifications?.required) ? content.qualifications.required : []),

                preferred: Array.isArray(content.qualifications_preferred)

                  ? content.qualifications_preferred.map((q, i) => ({

                    id: q.id || `pref-${i}`,

                    title: q.point || q.title || (typeof q === 'string' ? q : ""),

                    weight: q.weight || 0,

                    description: q.description || ""

                  }))

                  : (Array.isArray(content.qualifications?.preferred) ? content.qualifications.preferred : [])

              },

              eeo_statement: content.eeo_statement || "We are an Equal Opportunity Employer...",

              custom_fields: Array.isArray(content.custom_fields) ? content.custom_fields : [],

              generation_mode: "manual",

              status: res.status || "draft"

            };

            setJD(mapped);

            setIsLoading(false);

            hasLoadedRef.current = id;

            return;

          }

        }



        // 3. Fallback blank skeleton structure

        if (isMounted) {

          setJD({

            id: id || `skel_${Date.now()}`,

            title: "Offline creation",

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

            employment_type: "Full-time",

            essential_duties_and_responsibilities: "",

            responsibilities: [],

            coreCompetencies: [],

            functionalCompetencies: [],

            qualifications: { required: [], preferred: [] },

            eeo_statement: "",

            custom_fields: [],

            generation_mode: "manual",

            status: "draft"

          });

          hasLoadedRef.current = id;

        }

      } catch (err) {

        console.error("Failed to load JD for manual editor:", err);

      } finally {

        if (isMounted) setIsLoading(false);

      }

    };

    loadJD();



    return () => { isMounted = false; };

  }, [id, allJDs, myJDs]);





  // Formatters for API payload

  const formatListItems = (list) => {

    if (!Array.isArray(list)) return [];

    return list.map(item => ({

      point: item.title || item.point || (typeof item === 'string' ? item : ""),

      weight: parseInt(item.weight) || 0

    }));

  };



  const mapJDToAutosavePayload = (jdData) => {
    const stableContent = (jdData.content && typeof jdData.content === "object" && !Array.isArray(jdData.content))
      ? { ...jdData.content }
      : {};

    return {
      title: jdData.title || "Offline creation",
      department: jdData.department || "General",
      job_id: jdData.jobId || jdData.job_id || "",
      job_family: jdData.jobFamily || jdData.job_family || "",
      job_level: jdData.jobLevel || jdData.job_level || "",
      seniority: jdData.seniority || "",
      industry: jdData.industry || "General",
      location: jdData.location || "",
      employment_type: jdData.employment_type || "Full-time",
      summary: jdData.summary || "",
      essential_duties_and_responsibilities: jdData.essential_duties_and_responsibilities || "",
      key_duties: formatListItems(jdData.responsibilities),
      core_competencies: formatListItems(jdData.coreCompetencies),
      functional_competencies: formatListItems(jdData.functionalCompetencies),
      qualifications_required: formatListItems(jdData.qualifications?.required),
      qualifications_preferred: formatListItems(jdData.qualifications?.preferred),
      eeo_statement: jdData.eeo_statement || "",
      salary_symbol: jdData.salary_symbol || "₹",
      salary_min_value: jdData.salary_min_value || "",
      salary_max_value: jdData.salary_max_value || "",
      salary_period: jdData.salary_period || "/yr",
      company_logo: jdData.company_logo || "/logo.png",
      sections_metadata: jdData.sections_metadata || {},
      generation_mode: "manual",
      ...stableContent,
      sections_order: stableContent.sections_order || jdData.sections_order,
    };
  };



  const getSectionRawValue = (nextState, sectionName) => {
    if (sectionName === "sections_order") {
      return normalizeSectionsOrder(nextState.content?.sections_order ?? nextState.sections_order);
    }
    const contentSection = nextState.content?.[sectionName];
    if (isStableSection(contentSection)) {
      return contentSection;
    }
    if (sectionName === "responsibilities") return formatListItems(nextState.responsibilities);
    if (sectionName === "coreCompetencies") return formatListItems(nextState.coreCompetencies);
    if (sectionName === "functionalCompetencies") return formatListItems(nextState.functionalCompetencies);
    if (sectionName === "qualifications_required") return formatListItems(nextState.qualifications?.required);
    if (sectionName === "qualifications_preferred") return formatListItems(nextState.qualifications?.preferred);
    return contentSection ?? nextState[sectionName];
  };



  // Debounced Auto-Save & Context Sync (Per-section set tracking)

  const saveTimeoutRef = useRef(null);

  const pendingSectionsRef = useRef(new Set());



  const updateJDState = useCallback((updater, changedSection = null) => {

    setJD(prev => {

      const next = typeof updater === 'function' ? updater(prev) : { ...updater };

      if (changedSection && !TOP_LEVEL_JD_FIELDS.has(changedSection)) {
        const nextContent = { ...(next.content || {}) };
        const existingSection = nextContent[changedSection];
        const incoming = next[changedSection];

        if (isStableSection(incoming)) {
          nextContent[changedSection] = incoming;
          delete next[changedSection];
        } else if (incoming !== undefined) {
          const baseSection = isStableSection(existingSection)
            ? existingSection
            : (isStableSection(next[changedSection]) ? next[changedSection] : null);

          if (baseSection) {
            nextContent[changedSection] = { ...baseSection, section_data: incoming };
          } else {
            const meta = next.sections_metadata?.[changedSection] || next.sections_metadata?.labels?.[changedSection];
            const isPoints = meta?.type === "points" || meta?.type === "weighted_list" || Array.isArray(incoming);
            nextContent[changedSection] = {
              name: typeof meta === "object" ? (meta.label || changedSection) : (meta || changedSection.replace(/_/g, " ")),
              type: isPoints ? "points" : "text",
              section_data: incoming,
              metadata: { view: "unlocked", push_to_csod: true }
            };
          }
          delete next[changedSection];
        }

        next.content = nextContent;
      }



      // Sync to Context asynchronously to avoid React state updater side-effects

      setTimeout(() => {

        if (next?.id) {

          updateJDContext(next.id, {
            title: next.title,
            department: next.department,
            generation_mode: "manual",
            content: next.content || {},
            sections_metadata: next.sections_metadata || {},
            sections_order: next.content?.sections_order || next.sections_order,
            updatedAt: new Date().toISOString()
          });

        }

      }, 0);



      // Schedule Debounced Server Sync for ONLY sections modified in current batch

      if (next.id && !next.id.startsWith("skel_")) {

        setSyncStatus("saving");



        if (changedSection) {

          pendingSectionsRef.current.add(changedSection);

        }



        if (saveTimeoutRef.current) {

          clearTimeout(saveTimeoutRef.current);

        }



        saveTimeoutRef.current = setTimeout(async () => {

          try {

            const sectionsToSave = Array.from(pendingSectionsRef.current);

            pendingSectionsRef.current.clear(); // Reset so saved sections aren't called again on future edits



            if (sectionsToSave.length > 0) {

              await Promise.allSettled(

                sectionsToSave.map(async (sec) => {

                  const apiSection = sec;

                  const rawVal = getSectionRawValue(next, sec);

                  if (rawVal !== undefined && rawVal !== null) {

                    await jdService.updateSection(next.id, apiSection, rawVal);

                  }

                })

              );

            }



            // Single autosave call with full payload

            const payload = mapJDToAutosavePayload(next);

            await jdService.autosaveJD(next.id, payload);



            setSyncStatus("saved");

          } catch (err) {

            console.warn("Autosave notice:", err);

            setSyncStatus("saved");

          }

        }, 1000);

      }



      return next;

    });

  }, [updateJDContext]);



  // Per-section save handler for JDPreview

  const handlePerSectionAutoSave = useCallback((section, value) => {
    if (section === "sections_order" && Array.isArray(value)) {
      updateJDState((prev) => applySectionsOrder(prev, value), "sections_order");
      return;
    }
    updateJDState(prev => ({ ...prev, [section]: value }), section);
  }, [updateJDState]);



  // Manual Save Handler

  const handleSaveDraft = async () => {

    if (!jd) return;

    setSyncStatus("saving");

    try {

      const uid = user?.userId || user?.id || user?.email;

      const draftObj = {

        id: jd.id,

        title: jd.title || "Offline creation",

        status: jd.status || "draft",

        generation_mode: "manual",

        content: { ...jd, generation_mode: "manual" },

        createdBy: uid,

        author: user?.full_name || user?.name || "HR User",

        department: jd.department || "General",

        createdAt: new Date().toISOString(),

        history: [{ status: 'draft', timestamp: new Date().toISOString(), updatedBy: user?.full_name || "HR User" }],

        comments: []

      };



      addJD(draftObj);

      if (!jd.id.startsWith("skel_")) {

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        const pending = Array.from(pendingSectionsRef.current);

        pendingSectionsRef.current.clear();



        if (pending.length > 0) {

          await Promise.allSettled(

            pending.map(async (sec) => {

              const apiSection = sec;

              const rawVal = getSectionRawValue(jd, sec);

              if (rawVal !== undefined && rawVal !== null) {

                await jdService.updateSection(jd.id, apiSection, rawVal);

              }

            })

          );

        }



        const payload = mapJDToAutosavePayload(jd);

        await jdService.autosaveJD(jd.id, payload);

      }

      setSyncStatus("saved");

      toast.success("Draft saved successfully!");

    } catch (err) {

      console.error("Save draft failed:", err);

      toast.success("Draft saved locally!");

      setSyncStatus("saved");

    }

  };



  // Helper field updater

  const updateField = (field, value) => {

    updateJDState(prev => ({ ...prev, [field]: value }), field);

  };

  const updateSectionField = (sectionKey, rawValue, meta) => {
    const sectionType = meta?.type
      || (isWeightedSectionData(rawValue, sectionKey, meta) ? "weighted_list" : (Array.isArray(rawValue) ? "points" : "text"));
    const isPoints = sectionType === "points" || sectionType === "weighted_list";
    const weighted = isWeightedSectionData(rawValue, sectionKey, { ...meta, type: sectionType });
    const sectionData = isPoints
      ? toBackendSectionData(rawValue, weighted)
      : rawValue;

    updateJDState((prev) => {
      const next = { ...prev };
      const nextContent = { ...(next.content || {}) };
      const existing = nextContent[sectionKey];

      if (isStableSection(existing)) {
        nextContent[sectionKey] = { ...existing, type: sectionType, section_data: sectionData };
      } else {
        nextContent[sectionKey] = {
          name: meta?.label || sectionKey.replace(/_/g, " "),
          type: sectionType,
          section_data: sectionData,
          metadata: { view: "unlocked", push_to_csod: true }
        };
      }

      next.content = nextContent;
      if (next[sectionKey] !== undefined) {
        delete next[sectionKey];
      }
      return next;
    }, sectionKey);
  };



  // List Item Actions

  const addDuty = () => {

    updateJDState(prev => ({

      ...prev,

      responsibilities: [

        ...(prev.responsibilities || []),

        { id: `duty-${Date.now()}`, title: "", weight: 0, description: "" }

      ]

    }), 'responsibilities');

  };



  const updateDuty = (index, key, value) => {

    updateJDState(prev => {

      let list = [...(prev.responsibilities || [])];

      if (key === 'weight') {

        list = rebalanceWeights(list, index, value);

      } else {

        list[index] = { ...list[index], [key]: value };

      }

      return { ...prev, responsibilities: list };

    }, 'responsibilities');

  };



  const removeDuty = (index) => {

    updateJDState(prev => {

      const list = prev.responsibilities || [];

      const itemToRemove = list[index];

      const removedWeight = Number(itemToRemove?.weight) || 0;

      const updated = list.filter((_, i) => i !== index);



      if (updated.length > 0 && removedWeight > 0) {

        const remainingWeight = updated.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);

        if (remainingWeight === 0) {

          const avg = Math.floor(100 / updated.length);

          let remainder = 100 % updated.length;

          updated.forEach(item => {

            item.weight = avg + (remainder-- > 0 ? 1 : 0);

          });

        } else {

          let distributed = 0;

          updated.forEach((item, i) => {

            if (i === updated.length - 1) {

              item.weight = (Number(item.weight) || 0) + (removedWeight - distributed);

            } else {

              const proportion = (Number(item.weight) || 0) / remainingWeight;

              const add = Math.round(proportion * removedWeight);

              item.weight = (Number(item.weight) || 0) + add;

              distributed += add;

            }

          });

        }

      }

      return { ...prev, responsibilities: updated };

    }, 'responsibilities');

  };



  // Core Competencies

  const addCoreComp = () => {

    updateJDState(prev => ({

      ...prev,

      coreCompetencies: [

        ...(prev.coreCompetencies || []),

        { id: `core-${Date.now()}`, title: "", weight: 0, description: "" }

      ]

    }), 'coreCompetencies');

  };



  const updateCoreComp = (index, key, value) => {

    updateJDState(prev => {

      const list = [...(prev.coreCompetencies || [])];

      list[index] = { ...list[index], [key]: value };

      return { ...prev, coreCompetencies: list };

    }, 'coreCompetencies');

  };



  const removeCoreComp = (index) => {

    updateJDState(prev => ({

      ...prev,

      coreCompetencies: (prev.coreCompetencies || []).filter((_, i) => i !== index)

    }), 'coreCompetencies');

  };



  // Functional Competencies

  const addFuncComp = () => {

    updateJDState(prev => ({

      ...prev,

      functionalCompetencies: [

        ...(prev.functionalCompetencies || []),

        { id: `func-${Date.now()}`, title: "", weight: 0, description: "" }

      ]

    }), 'functionalCompetencies');

  };



  const updateFuncComp = (index, key, value) => {

    updateJDState(prev => {

      const list = [...(prev.functionalCompetencies || [])];

      list[index] = { ...list[index], [key]: value };

      return { ...prev, functionalCompetencies: list };

    }, 'functionalCompetencies');

  };



  const removeFuncComp = (index) => {

    updateJDState(prev => ({

      ...prev,

      functionalCompetencies: (prev.functionalCompetencies || []).filter((_, i) => i !== index)

    }), 'functionalCompetencies');

  };



  // Qualifications

  const addQual = (type) => {

    updateJDState(prev => ({

      ...prev,

      qualifications: {

        ...prev.qualifications,

        [type]: [

          ...(prev.qualifications?.[type] || []),

          { id: `${type}-${Date.now()}`, title: "", weight: 0, description: "" }

        ]

      }

    }), type === 'required' ? 'qualifications_required' : 'qualifications_preferred');

  };



  const updateQual = (type, index, key, value) => {

    updateJDState(prev => {

      const list = [...(prev.qualifications?.[type] || [])];

      list[index] = { ...list[index], [key]: value };

      return {

        ...prev,

        qualifications: {

          ...prev.qualifications,

          [type]: list

        }

      };

    }, type === 'required' ? 'qualifications_required' : 'qualifications_preferred');

  };



  const removeQual = (type, index) => {

    updateJDState(prev => ({

      ...prev,

      qualifications: {

        ...prev.qualifications,

        [type]: (prev.qualifications?.[type] || []).filter((_, i) => i !== index)

      }

    }), type === 'required' ? 'qualifications_required' : 'qualifications_preferred');

  };



  const handleAddNewSection = (fieldConfig) => {
    const existingOrder = Array.isArray(jd?.content?.sections_order) ? jd.content.sections_order : (Array.isArray(jd?.sections_metadata?.order) ? jd.sections_metadata.order : []);
    
    // Find the next available section_N key
    let maxN = 0;
    for (const k of Object.keys(jd?.content || {})) {
        if (k.startsWith("section_")) {
            const num = parseInt(k.replace("section_", ""));
            if (!isNaN(num) && num > maxN) maxN = num;
        }
    }
    const labelKey = `section_${maxN + 1}`;

    const currentMeta = jd.sections_metadata || {};
    const updatedMeta = {
      ...currentMeta,
      [labelKey]: {
        label: fieldConfig.label,
        type: fieldConfig.type,
        fieldType: fieldConfig.fieldType,
        placeholder: fieldConfig.placeholder,
        use_custom_value: fieldConfig.use_custom_value,
        required: fieldConfig.required,
        hide_from_candidates: fieldConfig.hide_from_candidates,
        push_to_csod: fieldConfig.push_to_csod,
        options: fieldConfig.options || []
      }
    };

    const newSectionOrder = [...existingOrder, labelKey];
    updatedMeta.order = newSectionOrder;

    updateJDState(prev => ({ 
      ...prev, 
      sections_metadata: updatedMeta,
      content: { ...(prev.content || {}), sections_order: newSectionOrder }
    }), 'sections_metadata');

    setTimeout(() => {
      const defaultValue = {
        name: fieldConfig.label,
        type: fieldConfig.type === "points" ? "points" : "text",
        section_data: fieldConfig.type === "points" ? [] : "",
        metadata: {
          view: "unlocked",
          push_to_csod: fieldConfig.push_to_csod !== false
        }
      };

      updateJDState(prev => ({
        ...prev,
        content: { ...(prev.content || {}), [labelKey]: defaultValue }
      }), labelKey);
      setIsAddSectionModalOpen(false);
      toast.success(`Custom section "${fieldConfig.label}" added!`);
    }, 50);
  };



  if (isLoading || !jd) {

    return (

      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6">

        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />

        <p className="text-sm font-semibold text-slate-400">Loading Manual Editor Environment...</p>

      </div>

    );

  }



  return (

    <div className="min-h-screen bg-slate-100 dark:bg-[#090d16] flex flex-col font-sans transition-colors duration-300">



      {/* ── TOP STICKY EDITOR BAR ── */}

      <div className="bg-white/90 dark:bg-[#020617]/90 backdrop-blur-md border-b border-slate-200 dark:border-white/10 sticky top-0 z-50 px-6 py-3 shadow-sm flex items-center justify-between">

        <div className="flex items-center gap-4">

          <button

            onClick={() => navigate(`/${base}/my-jds`)}

            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"

            title="Back to My JDs"

          >

            <ArrowLeft className="w-5 h-5" />

          </button>



          <div className="flex flex-col">

            <div className="flex items-center gap-2">

              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider rounded-md">

                Manual Editor

              </span>

              <span className="text-xs font-semibold text-slate-400">

                • {syncStatus === 'saving' ? 'Saving changes...' : 'All changes saved'}

              </span>

            </div>

            <input

              type="text"

              value={jd.title}

              onChange={(e) => updateField('title', e.target.value)}

              placeholder="Job Description Title..."

              className="text-base sm:text-lg font-bold text-slate-900 dark:text-white bg-transparent outline-none border-b border-transparent hover:border-slate-300 dark:hover:border-white/20 focus:border-emerald-500 transition-colors py-0.5"

            />

          </div>

        </div>



        <div className="flex items-center gap-3">

          <button

            onClick={handleSaveDraft}

            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all shadow-sm"

          >

            <Save className="w-4 h-4" />

            <span>Save Draft</span>

          </button>



          <button

            onClick={() => {

              handleSaveDraft();

              navigate(`/${base}/my-jds`);

            }}

            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0"

          >

            <Check className="w-4 h-4" />

            <span>Finish & Close</span>

          </button>

        </div>

      </div>



      {/* ── SPLIT WORKSPACE AREA (70% PREVIEW / 30% EDITOR) ── */}

      <div className="flex-1 max-w-[1920px] w-full mx-auto flex flex-col lg:flex-row gap-0 overflow-hidden">



        {/* ── LEFT SIDE: LIVE DOCUMENT PREVIEW ── */}

        <div className={`border-r border-slate-200 dark:border-white/10 p-6 overflow-y-auto max-h-[calc(100vh-65px)] bg-slate-50 dark:bg-[#070a12]/50 relative transition-all duration-500 ease-in-out ${sidebarCollapsed ? 'w-full' : 'w-full lg:w-[70%]'}`}>

          {/* Floating sidebar re-open toggle */}
          {sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="fixed right-4 top-1/2 -translate-y-1/2 z-50 p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-lg hover:shadow-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all group"
              title="Open Editor Panel"
            >
              <PanelRightOpen className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-emerald-500 transition-colors" />
            </button>
          )}

          <div className="bg-white dark:bg-[#0f172a] rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/80 dark:border-white/10 mb-8">

            <JDPreview
              jd={jd}
              setJD={updateJDState}
              onAutoSave={handlePerSectionAutoSave}
              syncStatus={syncStatus}
              hideRefineAI={false}
              hideVisibilityToggles={false}
            />

          </div>
          
          <ActionBar
            jd={jd}
            onSave={async (status) => {
              await handleSaveDraft();
              if (status === "final" && jd?.id && !jd.id.startsWith("skel_")) {
                try {
                  await jdService.finalizeJD(jd.id);
                  toast.success("Job Description Finalized Successfully!");
                } catch (error) {
                  console.error("Failed to finalize JD:", error);
                  toast.error("Failed to finalize. Saved as draft.");
                }
              }
            }}
            onReset={() => {
              if (window.confirm("Are you sure you want to discard all changes and start over?")) {
                window.location.reload();
              }
            }}
            syncStatus={syncStatus}
            user={user}
            workflows={workflows}
            onSendForReview={submitJDWithWorkflow}
          />

        </div>



        {/* ── RIGHT SIDE: WORDPRESS / CMS FORM CONTROLS ── */}

        <div className={`overflow-y-auto max-h-[calc(100vh-65px)] flex flex-col gap-5 bg-white dark:bg-[#0c121e] transition-all duration-500 ease-in-out ${sidebarCollapsed ? 'w-0 p-0 overflow-hidden opacity-0' : 'w-full lg:w-[30%] p-5 opacity-100'}`}>



          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10" style={{ order: -1 }}>

            <h2 className="text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">

              <Sliders className="w-4 h-4 text-emerald-500" /> Document Content Editor

            </h2>

            <button
              onClick={() => setSidebarCollapsed(true)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-emerald-500 transition-all"
              title="Collapse Editor Panel"
            >
              <PanelRightClose className="w-4 h-4" />
            </button>

          </div>



          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>

  <SortableContext items={currentOrder} strategy={verticalListSortingStrategy}>

    {currentOrder.map((sectionKey, idx) => {

      // Dynamic Section Fallback

      if (["id", "org_id", "creator_id", "template_id", "title", "companyName", "company_name", "jobId", "job_id", "jobFamily", "job_family", "jobLevel", "job_level", "department", "location", "city", "countryCode", "country_code", "seniority", "industry", "salary_range", "salary_symbol", "salary_min_value", "salary_max_value", "salary_period", "salary_unit", "salary_range_formatted", "employmentType", "employment_type", "key_skills", "skills", "additional_context", "context", "image_url", "company_logo", "custom_fields", "sections_metadata", "eeoc_flags", "eeocFlags", "eeoc_cleared", "status", "public_jd_id", "wordCount", "word_count", "generation_mode", "finalized_at", "parent_jd_id", "is_main", "version_history", "created_at", "updated_at", "_section_order", "_source", "_custom_fields_metadata", "sections_order", "headers_metadata"].includes(sectionKey) || sectionKey.endsWith('_view')) {

          return null;

      }

      

      const sectionObj = resolveSectionObject(jd, sectionKey);
      const meta = resolveSectionMeta(sectionKey, sectionObj, jd?.sections_metadata);
      const titleStr = meta.label;
      const isPoints = meta.type === "points" || meta.type === "weighted_list";
      const isJobDetails = sectionKey === "basic" || meta.type === "job_details";
      const isSalary = sectionKey === "salary" || meta.type === "salary";
      const isSectionOpen = openSections[sectionKey];
      const sectionData = unwrapSectionData(sectionObj);
      const weighted = isWeightedSectionData(sectionData, sectionKey, meta);
      const isWeightLocked = resolveWeightLockState(jd, sectionKey, titleStr);



      const extraActions = null;

      return (

        <SortableSection key={sectionKey} id={sectionKey} onDelete={handleDeleteSection} extraActions={extraActions}>

          <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-white/[0.02]">

            <div

              className="w-full px-5 py-3.5 flex items-center justify-between bg-slate-100/80 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200 font-bold text-sm hover:bg-slate-200/60 transition-colors cursor-pointer"

              onClick={() => toggleSection(sectionKey)}

            >

              <div className="flex items-center gap-2.5">

                <LayoutGrid className="w-4 h-4 text-emerald-500" />

                <EditableSectionTitle

                  title={titleStr}

                  onSave={(newTitle) => {
                    // Update label in sections_metadata
                    const currentMeta = jd.sections_metadata || {};
                    updateJDState(prev => {
                        const next = { ...prev };
                        const prevMeta = next.sections_metadata || {};
                        next.sections_metadata = {
                            ...prevMeta,
                            [sectionKey]: { ...(prevMeta[sectionKey] || {}), label: newTitle }
                        };

                        if (next.content && next.content[sectionKey] && isStableSection(next.content[sectionKey])) {
                            next.content[sectionKey] = {
                                ...next.content[sectionKey],
                                name: newTitle
                            };
                        }
                        
                        return next;
                    }, 'sections_metadata');
                    
                    // The backend now correctly handles 'sections_metadata' payloads
                  }}
                />

              </div>

              <button type="button" className="p-1">

                {isSectionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}

              </button>

            </div>



            {isSectionOpen && (

              <div className="p-5">

                {isJobDetails ? (

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    <div>

                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Job Title</label>

                      <input type="text" value={jd?.title || ''} onChange={(e) => updateField('title', e.target.value)} className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:border-emerald-500 dark:text-white" />

                    </div>

                    <div>

                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Department</label>

                      <input type="text" value={jd?.department || ''} onChange={(e) => updateField('department', e.target.value)} className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:border-emerald-500 dark:text-white" />

                    </div>

                    <div>

                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Location</label>

                      <input type="text" value={jd?.location || ''} onChange={(e) => updateField('location', e.target.value)} className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:border-emerald-500 dark:text-white" />

                    </div>

                    <div>

                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Job Family</label>

                      <input type="text" value={jd?.job_family || ''} onChange={(e) => updateField('job_family', e.target.value)} className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:border-emerald-500 dark:text-white" />

                    </div>

                  </div>

                ) : isSalary ? (

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                    <div>

                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Currency Symbol</label>

                      <input type="text" value={jd?.salary_symbol || ''} onChange={(e) => updateField('salary_symbol', e.target.value)} className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:border-emerald-500 dark:text-white" />

                    </div>

                    <div>

                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Min Salary</label>

                      <input type="text" value={jd?.salary_min_value || ''} onChange={(e) => updateField('salary_min_value', e.target.value)} className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:border-emerald-500 dark:text-white" />

                    </div>

                    <div>

                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Max Salary</label>

                      <input type="text" value={jd?.salary_max_value || ''} onChange={(e) => updateField('salary_max_value', e.target.value)} className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:border-emerald-500 dark:text-white" />

                    </div>

                  </div>

                ) : isPoints ? (

                  (() => {
                    if (weighted) {
                      return (
                        <WeightedEditableList
                          items={normalizeForWeightedList(sectionData)}
                          setItems={(newItems) => updateSectionField(sectionKey, newItems, meta)}
                          hideWeight={isWeightLocked}
                          onRegeneratePoint={(idx, data) => handleRegeneratePointClick(sectionKey, titleStr, idx, data)}
                        />
                      );
                    }

                    return (
                      <EditableList
                        items={normalizeForEditableList(sectionData)}
                        setItems={(newItems) => updateSectionField(sectionKey, newItems, meta)}
                        onRegeneratePoint={(idx, data) => handleRegeneratePointClick(sectionKey, titleStr, idx, data)}
                      />
                    );
                  })()

                ) : (

                  <textarea

                    value={typeof sectionData === "string" ? sectionData : ""}

                    onChange={(e) => updateSectionField(sectionKey, e.target.value, meta)}

                    placeholder={`Enter ${titleStr}...`}

                    className="w-full min-h-[120px] px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-emerald-500 resize-y"

                  />

                )}

              </div>

            )}

          </div>

        </SortableSection>

      );

    })}

  </SortableContext>

</DndContext>



        <div className="flex justify-center mt-6">

          <button

            type="button"

            onClick={() => setIsAddSectionModalOpen(true)}

            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl flex items-center gap-2 transition-all shadow-md"

          >

            <Plus className="w-4 h-4" /> ADD SECTION

          </button>

        </div>



      </div>

      </div>

      

      <AddSectionModal
        isOpen={isAddSectionModalOpen}
        onClose={() => setIsAddSectionModalOpen(false)}
        onAddSection={handleAddNewSection}
      />

      <AIPromptModal
        isOpen={promptModal.isOpen}
        onClose={() => setPromptModal({ ...promptModal, isOpen: false })}
        onSubmit={handlePromptSubmit}
        sectionTitle={promptModal.title}
        isGenerating={generatingSection === promptModal.section}
        isPointLevel={promptModal.pointIndex !== null && promptModal.pointIndex !== undefined}
      />
    </div>

  );

}

