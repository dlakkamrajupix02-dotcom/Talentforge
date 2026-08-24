import { useState, useCallback, useEffect, useContext, useRef } from "react";
import SyncImporterHeaderScene from "../common/SyncImporterHeaderScene";
import {
  CloudUpload,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileUp,
  Info,
  ChevronRight,
  ShieldCheck,
  Zap,
  Trash2,
  ExternalLink,
  Calendar,
  Save,
  LayoutTemplate,
  ChevronDown,
  Edit2,
  ChevronLeft,
  Eye,
  MoreHorizontal,
  Search,
  Clock,
  LayoutGrid,
  List,
  Check,
  Send,
  Plus,
  Type,
  AlignLeft,
  Layers,
  Circle,
  GripVertical
} from "lucide-react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { getSabaJds, uploadSabaDocuments, getSabaSupportedFormats, deleteSabaJd, updateSabaJd, bulkConvertSabaJds } from "../../services/sabaService";
import toast from "react-hot-toast";
import WorkflowModal from "../common/WorkflowModal";
import { JDContext } from "../../context/JDContext";
import { apiPost } from "../../services/apiClient";

const formatDateTime = (dateString) => {
  if (!dateString) return "";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 hour should be 12
    const strHours = String(hours).padStart(2, '0');
    return `${day}/${month}/${year} ${strHours}:${minutes} ${ampm}`;
  } catch (e) {
    return dateString;
  }
};

const getUpdatedTimeInfo = (template) => {
  const createdAt = template.created_at || template.date;
  const updatedAt = template.updated_at;
  if (!updatedAt) return null;
  const createdTime = new Date(createdAt).getTime();
  const updatedTime = new Date(updatedAt).getTime();
  if (isNaN(updatedTime) || updatedTime <= createdTime + 1000) {
    return null;
  }
  return formatDateTime(updatedAt);
};

const ToggleSwitch = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
      checked ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
    }`}
  >
    <span
      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

const CUSTOM_FIELD_TYPES = [
  { key: "TextBox", label: "Text Box", desc: "Single-line free text", icon: Type },
  { key: "Dropdown", label: "Dropdown", desc: "Select one from list", icon: ChevronDown },
  { key: "Paragraph", label: "Paragraph", desc: "Multi-line rich text", icon: AlignLeft },
  { key: "DateTime", label: "Date / Time", desc: "Date and time picker", icon: Calendar },
  { key: "Weights", label: "Weights (%)", desc: "Percentage-based weights", icon: Layers },
  { key: "MultipleChoice", label: "Multiple Choice", desc: "Single selection (radio)", icon: Circle },
  { key: "Checkbox", label: "Checkbox", desc: "Multi-select options", icon: CheckCircle2 }
];

const SUPPORTED_EXTENSIONS_FALLBACK = [".pdf", ".docx", ".word", ".doc", ".html", ".htm", ".txt", ".text", ".rtf"];

const isPdfFile = (file, allowedExtensions) => {
  if (!file) return false;
  const name = file.name?.toLowerCase() || "";
  const exts = allowedExtensions || SUPPORTED_EXTENSIONS_FALLBACK;
  return exts.some(ext => name.endsWith(ext));
};

const fileKey = (file) => `${file.name}-${file.size}-${file.lastModified}`;

const mergePdfFiles = (existing, incoming, allowedExtensions) => {
  const seen = new Set(existing.map(fileKey));
  const next = [...existing];
  incoming.forEach((file) => {
    if (!isPdfFile(file, allowedExtensions)) return;
    const key = fileKey(file);
    if (!seen.has(key)) {
      seen.add(key);
      next.push(file);
    }
  });
  return next;
};

const collectPdfFiles = (fileList, allowedExtensions) => {
  if (!fileList?.length) return [];
  return Array.from(fileList).filter(f => isPdfFile(f, allowedExtensions));
};

const formatImportStatusLabel = (status) => {
  const normalized = String(status || "LIVE").toLowerCase();
  if (normalized === "saba") return "IMPORTED";
  return String(status || "LIVE").toUpperCase();
};

export default function BulkImportSaba() {
  const [files, setFiles] = useState([]);
  const [supportedFormats, setSupportedFormats] = useState({
    formats: [
      { key: "pdf", extensions: [".pdf"], label: "PDF Documents" },
      { key: "docx", extensions: [".docx", ".word"], label: "Word Documents (.docx)" },
      { key: "doc", extensions: [".doc"], label: "Word Documents (.doc)" },
      { key: "html", extensions: [".html", ".htm"], label: "HTML Documents" },
      { key: "txt", extensions: [".txt", ".text"], label: "Text Files" },
      { key: "rtf", extensions: [".rtf"], label: "Rich Text Files" }
    ],
    extensions: [".pdf", ".docx", ".word", ".doc", ".html", ".htm", ".txt", ".text", ".rtf"]
  });
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [importedTemplates, setImportedTemplates] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const ITEMS_PER_PAGE = 6;

  const [isDeletingId, setIsDeletingId] = useState(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearState, setClearState] = useState({ status: 'idle', count: 0, completed: 0, time: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [isDrawerEditing, setIsDrawerEditing] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isCustomFieldModalOpen, setIsCustomFieldModalOpen] = useState(false);
  const [sectionOrder, setSectionOrder] = useState([]);

  // Side-panel custom field config states
  const [sideLabel, setSideLabel] = useState("");
  const [sideFieldType, setSideFieldType] = useState("TextBox");
  const [sidePlaceholder, setSidePlaceholder] = useState("");
  const [sideUseCustomValue, setSideUseCustomValue] = useState(false);
  const [sideRequired, setSideRequired] = useState(false);
  const [sideHideFromCandidates, setSideHideFromCandidates] = useState(false);
  const [sidePushToCSOD, setSidePushToCSOD] = useState(false);
  const [sideViewSection, setSideViewSection] = useState(true);
  const [sideOptionsInput, setSideOptionsInput] = useState("");

  const handleOpenAddSection = () => {
    setSideLabel("");
    setSideFieldType("TextBox");
    setSidePlaceholder("");
    setSideUseCustomValue(false);
    setSideRequired(false);
    setSideHideFromCandidates(false);
    setSidePushToCSOD(false);
    setSideViewSection(true);
    setSideOptionsInput("");
    setIsCustomFieldModalOpen(true);
  };

  const handleSidePanelSubmit = (e) => {
    e.preventDefault();
    if (!sideLabel.trim()) {
      toast.error("Section label is required");
      return;
    }
    const resolvedType = (sideFieldType === "Weights" || sideFieldType === "Checkbox") ? "points" : "text";
    const options = ["Dropdown", "MultipleChoice", "Checkbox"].includes(sideFieldType)
      ? sideOptionsInput.split(",").map(o => o.trim()).filter(Boolean)
      : [];
    if (["Dropdown", "MultipleChoice", "Checkbox"].includes(sideFieldType) && options.length === 0) {
      toast.error("At least one option is required");
      return;
    }

    handleAddCustomField({
      label: sideLabel.trim(),
      type: resolvedType,
      fieldType: sideFieldType,
      placeholder: sidePlaceholder.trim(),
      use_custom_value: sideUseCustomValue,
      required: sideRequired,
      hide_from_candidates: sideHideFromCandidates,
      push_to_csod: sidePushToCSOD,
      view_section: sideViewSection,
      options
    });
  };

  const handleAddCustomField = (fieldConfig) => {
    const labelUpper = fieldConfig.label.toUpperCase();
    if (editData.sections[labelUpper]) {
      toast.error("Section already exists");
      return;
    }
    const defaultValue = fieldConfig.type === "points" ? [] : "";
    const updatedSections = {
      ...editData.sections,
      [labelUpper]: defaultValue
    };
    const currentMeta = editData.sections._custom_fields_metadata || {};
    updatedSections._custom_fields_metadata = {
      ...currentMeta,
      [labelUpper]: {
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
    setEditData({
      ...editData,
      sections: updatedSections
    });
    setSectionOrder(prev => [...prev, labelUpper]);
    setIsCustomFieldModalOpen(false);
    toast.success(`Custom section "${fieldConfig.label}" added!`);
  };

  const getSectionFieldType = (sectionTitle) => {
    const meta = (isDrawerEditing ? editData.sections?._custom_fields_metadata : selectedTemplate?.sections?._custom_fields_metadata) || {};
    return meta[sectionTitle]?.fieldType || "Paragraph";
  };

  const getSectionPlaceholder = (sectionTitle) => {
    const meta = (isDrawerEditing ? editData.sections?._custom_fields_metadata : selectedTemplate?.sections?._custom_fields_metadata) || {};
    return meta[sectionTitle]?.placeholder || "Enter details...";
  };

  const getSectionOptions = (sectionTitle) => {
    const meta = (isDrawerEditing ? editData.sections?._custom_fields_metadata : selectedTemplate?.sections?._custom_fields_metadata) || {};
    return meta[sectionTitle]?.options || [];
  };

  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const { workflows, submitJDWithWorkflow } = useContext(JDContext);

  const handleConfirmWorkflow = async (workflowId) => {
    if (!selectedTemplate) return;
    try {
      const convertedJds = await bulkConvertSabaJds({ jd_ids: [selectedTemplate.id] });
      const convertedJd = convertedJds[0];
      await submitJDWithWorkflow(convertedJd.id, workflowId);
      toast.success("Successfully converted and submitted for review!");
    } catch (error) {
      console.error("Failed to submit workflow:", error);
      toast.error(error?.response?.data?.detail || "Failed to submit for review.");
    } finally {
      setShowWorkflowModal(false);
    }
  };
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
  const [selectedIds, setSelectedIds] = useState([]);

  const handleBulkConvertSelected = async () => {
    if (selectedIds.length === 0) return;
    try {
      await bulkConvertSabaJds({ jd_ids: selectedIds });
      toast.success(`Successfully pushed ${selectedIds.length} JD(s) to Job library!`);
      setSelectedIds([]);
      await loadSabaJds();
    } catch (error) {
      console.error("Bulk convert error:", error);
      toast.error(error?.response?.data?.detail || "Failed to push selected records to Job library.");
    }
  };

  const [editData, setEditData] = useState({
    template_title: "",
    requisition_template_id: "",
    status: "",
    excel_data: {},
    sections: {}
  });

  const [newSectionName, setNewSectionName] = useState("");
  const [showNewSectionForm, setShowNewSectionForm] = useState(false);

  const loadSabaJds = async () => {
    setIsLoading(true);
    try {
      const data = await getSabaJds();
      setImportedTemplates(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch Saba JDs:", error);
      toast.error("Failed to load imported records");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSabaJds();
    const fetchFormats = async () => {
      try {
        const formatsData = await getSabaSupportedFormats();
        if (formatsData && formatsData.extensions) {
          setSupportedFormats(formatsData);
        }
      } catch (err) {
        console.error("Failed to fetch supported formats from server:", err);
      }
    };
    fetchFormats();
  }, []);

  const handleEditInDrawer = () => {
    const secs = JSON.parse(JSON.stringify(selectedTemplate.sections || {}));
    setEditData({
      template_title: selectedTemplate.template_title || selectedTemplate.title || "",
      requisition_template_id: selectedTemplate.requisition_template_id || selectedTemplate.code || "",
      status: selectedTemplate.status || "saba",
      excel_data: selectedTemplate.excel_data || {},
      sections: secs
    });
    // Build section order, excluding fixed/special keys
    const FIXED_KEYS = ["SUMMARY", "ESSENTIAL DUTIES AND RESPONSIBILITIES", "Job Details", "_custom_fields_metadata", "_section_order", "_source"];
    const dynamicKeys = Object.keys(secs).filter(k => !FIXED_KEYS.includes(k));
    setSectionOrder(dynamicKeys);
    setIsDrawerEditing(true);
  };

  // Sync editData sections order when sectionOrder changes via drag
  const handleSectionReorder = (newOrder) => {
    setSectionOrder(newOrder);
    // Rebuild sections object in new order, keeping fixed keys in place
    const FIXED_KEYS = ["SUMMARY", "ESSENTIAL DUTIES AND RESPONSIBILITIES", "Job Details", "_custom_fields_metadata", "_section_order", "_source"];
    const fixedEntries = FIXED_KEYS.filter(k => editData.sections[k] !== undefined).map(k => [k, editData.sections[k]]);
    const dynamicEntries = newOrder.map(k => [k, editData.sections[k]]);
    const allEntries = [...fixedEntries, ...dynamicEntries];
    const reordered = Object.fromEntries(allEntries);
    setEditData(prev => ({ ...prev, sections: reordered }));
  };

  const saveDrawerEdit = async () => {
    if (!selectedTemplate || !editData.template_title.trim()) {
      toast.error("Title cannot be empty");
      return;
    }
    try {
      const nowIso = new Date().toISOString();
      await updateSabaJd(selectedTemplate.id, {
        template_title: editData.template_title,
        requisition_template_id: editData.requisition_template_id,
        status: editData.status,
        excel_data: editData.excel_data,
        sections: editData.sections,
        updated_at: nowIso
      });
      toast.success("Template updated successfully");
      setIsDrawerEditing(false);

      setSelectedTemplate(prev => ({
        ...prev,
        template_title: editData.template_title,
        requisition_template_id: editData.requisition_template_id,
        status: editData.status,
        excel_data: editData.excel_data,
        sections: editData.sections,
        updated_at: nowIso
      }));

      setImportedTemplates(prev =>
        prev.map(t => (t.id === selectedTemplate.id ? {
          ...t,
          template_title: editData.template_title,
          requisition_template_id: editData.requisition_template_id,
          status: editData.status,
          excel_data: editData.excel_data,
          sections: editData.sections,
          updated_at: nowIso
        } : t))
      );
    } catch (error) {
      console.error("Failed to update template:", error);
      toast.error("Failed to save changes");
    }
  };

  const deleteItem = async (id) => {
    try {
      await deleteSabaJd(id);
      setImportedTemplates(prev => prev.filter(t => t.id !== id));
      setSelectedIds(prev => prev.filter(i => i !== id));
      if (selectedTemplate?.id === id) {
        setSelectedTemplate(null);
      }
      toast.success("Template deleted successfully");
    } catch (error) {
      console.error("Failed to delete template:", error);
      toast.error("Failed to delete template");
    } finally {
      setIsDeletingId(null);
    }
  };

  const confirmClearHistory = async () => {
    if (importedTemplates.length === 0) return;
    const countToClear = importedTemplates.length;
    setClearState({ status: 'deleting', count: countToClear, completed: 0, time: 0 });
    const startTime = performance.now();
    let completed = 0;

    try {
      const chunkSize = 5;
      for (let i = 0; i < importedTemplates.length; i += chunkSize) {
        const chunk = importedTemplates.slice(i, i + chunkSize);
        await Promise.all(chunk.map(async (t) => {
          await deleteSabaJd(t.id);
          completed++;
          setClearState(prev => ({ ...prev, completed }));
        }));
      }

      const endTime = performance.now();
      const timeTaken = (endTime - startTime).toFixed(0);

      setImportedTemplates([]);
      setSelectedIds([]);
      setSelectedTemplate(null);
      setClearState({ status: 'success', count: countToClear, completed: countToClear, time: timeTaken });

      setTimeout(() => {
        setShowClearModal(false);
        setTimeout(() => setClearState({ status: 'idle', count: 0, completed: 0, time: 0 }), 300);
      }, 1800);
    } catch (error) {
      console.error("Clear all failed:", error);
      toast.error("Failed to clear all templates");
      setShowClearModal(false);
      setClearState({ status: 'idle', count: 0, completed: 0, time: 0 });
    }
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dropped = collectPdfFiles(e.dataTransfer.files, supportedFormats.extensions);
    if (dropped.length === 0) {
      toast.error(`Please upload valid files (${supportedFormats.extensions.join(", ")})`);
      return;
    }
    if (dropped.length < e.dataTransfer.files.length) {
      toast.error("Some files were skipped — unsupported format");
    }
    setFiles((prev) => mergePdfFiles(prev, dropped, supportedFormats.extensions));
  }, [supportedFormats.extensions]);

  const handleFileSelect = (e) => {
    const selected = collectPdfFiles(e.target.files, supportedFormats.extensions);
    if (selected.length === 0) {
      toast.error(`Please select valid files (${supportedFormats.extensions.join(", ")})`);
      e.target.value = "";
      return;
    }
    if (selected.length < e.target.files.length) {
      toast.error("Some files were skipped — unsupported format");
    }
    setFiles((prev) => mergePdfFiles(prev, selected, supportedFormats.extensions));
    e.target.value = "";
  };

  const handleRemoveFile = (index) => {
    if (index === undefined || index === null) {
      setFiles([]);
      return;
    }
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImport = async () => {
    if (files.length === 0) return;
    setIsUploading(true);
    try {
      const result = await uploadSabaDocuments(files);
      const importedCount = result && Array.isArray(result.job_descriptions) ? result.job_descriptions.length : files.length;
      toast.success(
        importedCount === 1
          ? "1 document imported successfully!"
          : `${importedCount} documents imported successfully!`
      );
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadSabaJds();
    } catch (error) {
      console.error("Saba import error:", error);
      toast.error(error?.response?.data?.detail || error.message || "Failed to import file(s)");
    } finally {
      setIsUploading(false);
    }
  };

  const filteredTemplates = importedTemplates.filter(template => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const title = (template.title || template.template_title || "").toLowerCase();
    const id = (template.job_id || template.requisition_template_id || template.code || "").toLowerCase();
    const department = (template.sections?.["Job Details"]?.["DEPARTMENT"] || "").toLowerCase();
    const family = (template.sections?.["Job Details"]?.["JOB FAMILY"] || "").toLowerCase();
    return title.includes(query) || id.includes(query) || department.includes(query) || family.includes(query);
  });

  const isAllFilteredSelected = filteredTemplates.length > 0 &&
    filteredTemplates.every(t => selectedIds.includes(t.id));

  const isSomeFilteredSelected = filteredTemplates.some(t => selectedIds.includes(t.id));

  const handleToggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      const filteredIdSet = new Set(filteredTemplates.map(t => t.id));
      setSelectedIds(prev => prev.filter(id => !filteredIdSet.has(id)));
    } else {
      const allFilteredIds = filteredTemplates.map(t => t.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const deleteSelectedTemplates = async () => {
    if (selectedIds.length === 0) return;
    const countToClear = selectedIds.length;
    setClearState({ status: 'deleting', count: countToClear, completed: 0, time: 0 });
    const startTime = performance.now();
    let completed = 0;

    try {
      const chunkSize = 5;
      for (let i = 0; i < selectedIds.length; i += chunkSize) {
        const chunk = selectedIds.slice(i, i + chunkSize);
        await Promise.all(chunk.map(async (id) => {
          await deleteSabaJd(id);
          completed++;
          setClearState(prev => ({ ...prev, completed }));
        }));
      }

      const endTime = performance.now();
      const timeTaken = (endTime - startTime).toFixed(0);

      const selectedSet = new Set(selectedIds);
      setImportedTemplates(prev => prev.filter(t => !selectedSet.has(t.id)));
      setSelectedIds([]);
      setClearState({ status: 'success', count: countToClear, completed: countToClear, time: timeTaken });

      setTimeout(() => {
        setShowClearModal(false);
        setTimeout(() => setClearState({ status: 'idle', count: 0, completed: 0, time: 0 }), 300);
      }, 1800);
    } catch (error) {
      console.error("Bulk delete failed:", error);
      toast.error("Failed to delete selected templates");
      setShowClearModal(false);
      setClearState({ status: 'idle', count: 0, completed: 0, time: 0 });
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col animate-in fade-in duration-700">

      {/* TOP HEADER: Upload Area */}
      <div className="flex-shrink-0 bg-white dark:bg-[#0f172a] rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-sm p-6 lg:p-8 flex flex-col lg:flex-row items-center gap-6 lg:gap-5 justify-between relative overflow-hidden min-h-[200px] lg:min-h-[240px]">
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(520px,70%)] h-[180px] bg-gradient-to-r from-blue-500/[0.04] via-indigo-500/[0.07] to-cyan-500/[0.04] rounded-full blur-3xl" />
        </div>

        <div className="flex-1 max-w-xl z-10 text-center lg:text-left relative">
          <div className="flex items-center justify-center lg:justify-start gap-4 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <CloudUpload className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Bulk JD Importer
              </h2>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                Upload PDF documents to sync imported job descriptions.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mt-6">
            <span className="px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-lg flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Enterprise Sync Ready
            </span>
            <span className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-lg flex items-center gap-2">
              <Zap className="w-4 h-4" /> Real-time Multi-format Parser
            </span>
          </div>
        </div>

        <SyncImporterHeaderScene />

        {/* Drag & Drop Upload Zone */}
        <div className="w-full lg:w-auto min-w-[340px] max-w-md z-10">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-[1.5rem] transition-all duration-300 ${dragActive
              ? "border-blue-500 bg-blue-50/50 dark:bg-blue-500/10 scale-[1.02]"
              : "border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] hover:border-blue-300 dark:hover:border-blue-500/30"
              }`}
          >
            {files.length === 0 ? (
              <>
                <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 flex items-center justify-center mb-3">
                  <FileUp className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Drag & Drop Files
                </p>
                <p className="text-xs font-semibold text-slate-400 mb-4 text-center">
                  Select one or multiple documents ({supportedFormats.extensions.join(", ")})
                </p>
                <label className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer">
                  Browse Files
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={supportedFormats.extensions.join(",")}
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </>
            ) : (
              <div className="w-full flex flex-col items-center">
                <div className="w-full mb-3 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {files.length} file{files.length !== 1 ? "s" : ""} queued
                  </p>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile()}
                    className="text-[10px] font-bold text-rose-500 hover:text-rose-600 transition-colors"
                  >
                    Clear all
                  </button>
                </div>
                <div className="w-full max-h-[180px] overflow-y-auto space-y-2 mb-4 custom-scrollbar">
                  {files.map((file, index) => (
                    <div
                      key={fileKey(file)}
                      className="flex items-center gap-3 w-full p-3 bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-white/10 shadow-sm"
                    >
                      <FileText className="w-5 h-5 text-emerald-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {file.name}
                        </p>
                        <p className="text-[10px] font-semibold text-slate-400">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition-colors shrink-0"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <label className="w-full mb-3 px-4 py-2 border border-dashed border-slate-300 dark:border-white/15 rounded-xl text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer text-center">
                  + Add more files
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={supportedFormats.extensions.join(",")}
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={handleImport}
                  disabled={isUploading}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Importing {files.length} file{files.length !== 1 ? "s" : ""}...
                    </>
                  ) : (
                    <>
                      <CloudUpload className="w-4 h-4" /> Start Import Pipeline ({files.length})
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM AREA: Paginated Table & Drawer Dashboard */}
      <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#0f172a] rounded-[2rem] border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm relative">

        {/* Table Header Controls */}
        <div className="flex-shrink-0 px-8 py-5 border-b border-slate-200 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02] flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Import Records</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Total {filteredTemplates.length} Items
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Search Input */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors duration-300 group-focus-within:text-blue-500 text-slate-400">
                <Search className="w-4 h-4 text-inherit" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search templates..."
                className="w-full sm:w-56 focus:sm:w-72 pl-10 pr-4 py-2 text-sm bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 ease-out text-slate-900 dark:text-white placeholder:text-slate-400 shadow-sm hover:border-slate-300 dark:hover:border-white/20"
              />
            </div>

            {/* View Mode Toggle (Grid vs List) */}
            <div className="flex items-center bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/10">
              <button
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === "grid"
                  ? "bg-white dark:bg-[#0f172a] text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                title="Grid / Card View"
              >
                <LayoutGrid className="w-4 h-4" /> Grid
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === "list"
                  ? "bg-white dark:bg-[#0f172a] text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                title="List View"
              >
                <List className="w-4 h-4" /> List
              </button>
            </div>

            {/* Selection & Delete Action (Only shown when at least 1 card is selected) */}
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                <button
                  onClick={handleToggleSelectAll}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl border transition-all ${isAllFilteredSelected
                    ? "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30"
                    : "bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10"
                    }`}
                  title={isAllFilteredSelected ? "Deselect All" : "Select All"}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isAllFilteredSelected
                    ? "bg-blue-600 border-blue-600 text-white"
                    : isSomeFilteredSelected
                      ? "bg-blue-500 border-blue-500 text-white"
                      : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                    }`}>
                    {isAllFilteredSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    {isSomeFilteredSelected && !isAllFilteredSelected && <div className="w-2 h-0.5 bg-white rounded-full" />}
                  </div>
                  <span>{isAllFilteredSelected ? "Deselect All" : "Select All"}</span>
                </button>

                <button
                  onClick={handleBulkConvertSelected}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                >
                  <Send className="w-4 h-4" /> Push to Job library ({selectedIds.length})
                </button>

                <button
                  onClick={() => setShowClearModal(true)}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-lg shadow-rose-600/20 active:scale-95"
                >
                  <Trash2 className="w-4 h-4" /> Delete Selected ({selectedIds.length})
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Paginated Bento Grid / List Layout */}
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 dark:bg-[#0b1121] relative p-6 lg:p-10 overflow-y-auto custom-scrollbar">

          {isLoading ? (
            <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="relative flex flex-col bg-white dark:bg-[#0f172a] rounded-[2rem] border border-slate-200 dark:border-white/10 p-6 shadow-sm overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 dark:bg-slate-800/50 rounded-bl-[100px] -z-10" />

                    <div className="flex items-start justify-between mb-6">
                      <div className="w-12 h-12 rounded-[1rem] bg-slate-100 dark:bg-slate-800 animate-pulse" />
                      <div className="w-16 h-6 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                    </div>

                    <div className="w-3/4 h-6 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse mb-3" />
                    <div className="w-24 h-6 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse mb-6" />

                    <div className="mt-auto pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                      <div className="w-24 h-4 bg-slate-100 dark:bg-slate-800 rounded-md animate-pulse" />
                      <div className="w-24 h-6 bg-slate-100 dark:bg-slate-800 rounded-md animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : filteredTemplates.length > 0 ? (
            <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full">
              {viewMode === "grid" ? (
                /* Grid of Templates */
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                  {filteredTemplates.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((template) => {
                    const isSelected = selectedIds.includes(template.id);
                    return (
                      <div
                        key={template.id}
                        onClick={() => setSelectedTemplate(template)}
                        className={`group relative flex flex-col rounded-[2rem] border p-6 shadow-sm transition-all duration-300 cursor-pointer overflow-hidden transform hover:-translate-y-1.5 ${isSelected
                          ? "border-blue-500/80 dark:border-blue-400/80 bg-gradient-to-b from-blue-50/70 via-indigo-50/20 to-white dark:from-blue-950/40 dark:via-indigo-950/20 dark:to-[#0f172a] shadow-xl shadow-blue-500/10 ring-2 ring-blue-500/30"
                          : "border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0f172a] hover:border-blue-300 dark:hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-500/10"
                          }`}
                      >
                        <div className={`absolute top-0 right-0 w-36 h-36 rounded-bl-[100px] -z-10 transition-all duration-300 ${isSelected ? "bg-blue-500/15" : "bg-blue-500/5 group-hover:bg-blue-500/10"
                          }`} />

                        <div className="flex items-start justify-between mb-5">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleSelect(template.id);
                              }}
                              className={`relative group/chk flex items-center justify-center w-7 h-7 rounded-xl border-2 transition-all duration-300 ${isSelected
                                ? "bg-gradient-to-br from-blue-600 to-indigo-600 border-transparent text-white shadow-md shadow-blue-500/40 scale-105"
                                : "border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-white/5 text-transparent hover:border-blue-500 hover:scale-105"
                                }`}
                              title={isSelected ? "Deselect template" : "Select template"}
                            >
                              <Check className={`w-4 h-4 stroke-[3] transition-all ${isSelected ? "scale-100 opacity-100" : "scale-50 opacity-0 group-hover/chk:opacity-30 group-hover/chk:text-blue-500"}`} />
                            </button>

                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${isSelected
                              ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                              : "bg-blue-50 dark:bg-blue-500/10 text-blue-600 group-hover:scale-110"
                              }`}>
                              <FileText className="w-5 h-5" />
                            </div>
                          </div>

                          <div className="relative w-20 h-8 flex items-center justify-end">
                            <div className="absolute right-0 flex items-center gap-1.5 transition-all duration-300 opacity-0 translate-x-2 group-hover:translate-x-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto z-10">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTemplate(template);
                                  setEditData({
                                    template_title: template.template_title || template.title || "",
                                    requisition_template_id: template.requisition_template_id || template.code || "",
                                    status: template.status || "saba",
                                    excel_data: template.excel_data || {}
                                  });
                                  setIsDrawerEditing(true);
                                }}
                                className="p-1.5 text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 dark:bg-blue-500/10 dark:hover:bg-blue-500 dark:text-blue-400 dark:hover:text-white rounded-lg transition-colors shadow-sm"
                                title="Edit Template"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsDeletingId(template.id);
                                }}
                                className="p-1.5 text-red-600 hover:text-white bg-red-50 hover:bg-red-600 dark:bg-red-500/10 dark:hover:bg-red-500 dark:text-red-400 dark:hover:text-white rounded-lg transition-colors shadow-sm"
                                title="Delete Template"
                              >
                                {isDeletingId === template.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            </div>

                            <div className="absolute right-0 transition-all duration-300 opacity-100 translate-x-0 group-hover:-translate-x-2 group-hover:opacity-0 pointer-events-auto group-hover:pointer-events-none">
                              {(() => {
                                const rawStatus = template.status || template.excel_data?.status || "LIVE";
                                const statusLabel = formatImportStatusLabel(rawStatus);
                                const isActive = statusLabel === "ACTIVE" || statusLabel === "LIVE" || statusLabel === "IMPORTED";

                                return (
                                  <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-xl tracking-widest flex items-center gap-1.5 border whitespace-nowrap ${isActive ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} /> {statusLabel}
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                        </div>

                        <h4 className="text-lg font-black text-slate-900 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
                          {template.title || template.template_title || "Untitled Job Description"}
                        </h4>

                        <div className="mb-5">
                          <p className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100/80 dark:bg-white/5 inline-flex w-max px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-white/5">
                            ID: {template.job_id || template.requisition_template_id || template.code || "N/A"}
                          </p>
                        </div>

                        <div className="mt-auto pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-semibold text-slate-400">
                          {(() => {
                            const updatedTimeStr = getUpdatedTimeInfo(template);
                            if (updatedTimeStr) {
                              return (
                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50/80 dark:bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-200/60 dark:border-amber-500/20" title="Last Updated Date & Time">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>Updated: {updatedTimeStr}</span>
                                </div>
                              );
                            }
                            return (
                              <div className="flex items-center gap-1.5" title="Date & Time">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                <span>{formatDateTime(template.created_at || template.date)}</span>
                              </div>
                            );
                          })()}

                          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-white/5 px-2.5 py-1 rounded-md text-slate-500 dark:text-slate-400 font-medium">
                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                            {template.sections?.["Job Details"]?.["DEPARTMENT"] || template.sections?.["Job Details"]?.["JOB FAMILY"] || template.excel_data?.["EEO Category"] || template.industry || "General"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* List View Table */
                <div className="w-full overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f172a] shadow-sm mb-8">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse font-sans">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.02] text-[10px] font-black uppercase tracking-wider text-slate-400">
                          <th className="py-4 pl-6 pr-3 w-12">
                            <button
                              onClick={handleToggleSelectAll}
                              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isAllFilteredSelected
                                ? "bg-blue-600 border-blue-600 text-white"
                                : isSomeFilteredSelected
                                  ? "bg-blue-500 border-blue-500 text-white"
                                  : "border-slate-300 dark:border-slate-600 bg-white dark:bg-white/5"
                                }`}
                            >
                              {isAllFilteredSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              {isSomeFilteredSelected && !isAllFilteredSelected && <div className="w-2 h-0.5 bg-white rounded-full" />}
                            </button>
                          </th>
                          <th className="py-4 px-4">Template Title & ID</th>
                          <th className="py-4 px-4">Status</th>
                          <th className="py-4 px-4">Category</th>
                          <th className="py-4 px-4">Date & Time</th>
                          <th className="py-4 pr-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs text-slate-700 dark:text-slate-300">
                        {filteredTemplates.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((template) => {
                          const isSelected = selectedIds.includes(template.id);
                          const updatedTimeStr = getUpdatedTimeInfo(template);
                          const rawStatus = template.status || template.excel_data?.status || "LIVE";
                          const statusLabel = formatImportStatusLabel(rawStatus);
                          const isActive = statusLabel === "ACTIVE" || statusLabel === "LIVE" || statusLabel === "IMPORTED";

                          return (
                            <tr
                              key={template.id}
                              onClick={() => setSelectedTemplate(template)}
                              className={`group hover:bg-blue-50/40 dark:hover:bg-white/[0.03] transition-colors cursor-pointer ${isSelected ? "bg-blue-50/60 dark:bg-blue-500/[0.05]" : ""
                                }`}
                            >
                              <td className="py-4 pl-6 pr-3" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => handleToggleSelect(template.id)}
                                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isSelected
                                    ? "bg-blue-600 border-blue-600 text-white"
                                    : "border-slate-300 dark:border-slate-600 bg-white dark:bg-white/5 hover:border-blue-500"
                                    }`}
                                >
                                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </button>
                              </td>

                              <td className="py-4 px-4">
                                <div className="font-black text-slate-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                  {template.title || template.template_title || "Untitled Job Description"}
                                </div>
                                <div className="text-[11px] font-mono font-bold text-slate-400 mt-0.5">
                                  ID: {template.job_id || template.requisition_template_id || template.code || "N/A"}
                                </div>
                              </td>

                              <td className="py-4 px-4">
                                <span className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-lg tracking-widest inline-flex items-center gap-1.5 border ${isActive
                                  ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                  : "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                  }`}>
                                  <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} /> {statusLabel}
                                </span>
                              </td>

                              <td className="py-4 px-4 font-semibold text-slate-600 dark:text-slate-400">
                                <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-md text-xs">
                                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                                  {template.sections?.["Job Details"]?.["DEPARTMENT"] || template.sections?.["Job Details"]?.["JOB FAMILY"] || template.excel_data?.["EEO Category"] || template.industry || "General"}
                                </div>
                              </td>

                              <td className="py-4 px-4 whitespace-nowrap">
                                {updatedTimeStr ? (
                                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-200/50 dark:border-amber-500/20 w-max text-xs" title="Last Updated Date & Time">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>Updated: {updatedTimeStr}</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium text-xs" title="Date & Time">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{formatDateTime(template.created_at || template.date)}</span>
                                  </div>
                                )}
                              </td>

                              <td className="py-4 pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      setSelectedTemplate(template);
                                      setEditData({
                                        template_title: template.template_title || template.title || "",
                                        requisition_template_id: template.requisition_template_id || template.code || "",
                                        status: template.status || "saba",
                                        excel_data: template.excel_data || {}
                                      });
                                      setIsDrawerEditing(true);
                                    }}
                                    className="p-1.5 text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 dark:bg-blue-500/10 dark:hover:bg-blue-500 rounded-lg transition-colors"
                                    title="Edit Template"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setIsDeletingId(template.id)}
                                    className="p-1.5 text-red-600 hover:text-white bg-red-50 hover:bg-red-600 dark:bg-red-500/10 dark:hover:bg-red-500 rounded-lg transition-colors"
                                    title="Delete Template"
                                  >
                                    {isDeletingId === template.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Pagination Controls */}
              {filteredTemplates.length > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-white/10 mt-auto">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredTemplates.length)} of {filteredTemplates.length} records
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="p-2 text-slate-600 dark:text-slate-400 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-50 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300 px-2">
                      Page {currentPage} of {Math.ceil(filteredTemplates.length / ITEMS_PER_PAGE)}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredTemplates.length / ITEMS_PER_PAGE), prev + 1))}
                      disabled={currentPage === Math.ceil(filteredTemplates.length / ITEMS_PER_PAGE)}
                      className="p-2 text-slate-600 dark:text-slate-400 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-50 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-3xl flex items-center justify-center text-slate-400 mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-black text-slate-800 dark:text-slate-200 mb-1">No Import Templates Found</h4>
              <p className="text-xs font-semibold text-slate-400 max-w-sm">
                Upload PDF files above to populate import records into the pipeline.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Item Confirmation Modal */}
      <AnimatePresence>
        {isDeletingId && (
          <div className="fixed top-[64px] inset-x-0 bottom-0 z-[1020] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeletingId(null)}
              className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-[#0f172a] rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden"
            >
              <div className="p-10 text-center">
                <div className="w-20 h-20 bg-rose-50 dark:bg-rose-500/10 rounded-3xl flex items-center justify-center text-rose-500 mx-auto mb-6 shadow-lg shadow-rose-500/10">
                  <Trash2 className="w-10 h-10" />
                </div>

                <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight mb-2">Remove Template?</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">
                  Are you sure you want to remove this template from your recent history?
                </p>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => deleteItem(isDeletingId)}
                    className="w-full py-4 bg-rose-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-xl shadow-rose-600/20 active:translate-y-0.5"
                  >
                    Yes, Remove It
                  </button>
                  <button
                    onClick={() => setIsDeletingId(null)}
                    className="w-full py-4 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Clear / Bulk Delete Modal */}
      <AnimatePresence>
        {showClearModal && (
          <div className="fixed top-[40px] inset-x-0 bottom-0 z-[1020] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (clearState.status !== 'deleting') setShowClearModal(false);
              }}
              className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-[#0f172a] rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden"
            >
              <div className="p-10 text-center min-h-[400px] flex flex-col items-center justify-center">
                {clearState.status === 'idle' && (
                  <div className="animate-in fade-in zoom-in duration-300 w-full">
                    <div className="w-20 h-20 bg-amber-50 dark:bg-amber-500/10 rounded-3xl flex items-center justify-center text-amber-500 mx-auto mb-6 shadow-lg shadow-amber-500/10">
                      <AlertCircle className="w-10 h-10" />
                    </div>

                    <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight mb-2">
                      {selectedIds.length > 0 ? "Delete Selected Records?" : "Clear Import History?"}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">
                      {selectedIds.length > 0 ? (
                        <>This will delete <span className="font-bold text-slate-900 dark:text-white">{selectedIds.length}</span> selected record{selectedIds.length > 1 ? 's' : ''} from your storage.</>
                      ) : (
                        <>This will remove <span className="font-bold text-slate-900 dark:text-white">{importedTemplates.length}</span> records from your local storage.</>
                      )}
                    </p>

                    <div className="flex flex-col gap-3">
                      <button
                        onClick={selectedIds.length > 0 ? deleteSelectedTemplates : confirmClearHistory}
                        className="w-full py-4 bg-rose-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-xl shadow-rose-600/20 active:translate-y-0.5"
                      >
                        {selectedIds.length > 0 ? `Delete ${selectedIds.length} Selected` : "Clear All Records"}
                      </button>
                      <button
                        onClick={() => setShowClearModal(false)}
                        className="w-full py-4 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {clearState.status === 'deleting' && (
                  <div className="flex flex-col items-center justify-center animate-in zoom-in duration-300 w-full py-8">
                    <div className="relative w-24 h-24 mb-6">
                      <div className="absolute inset-0 border-4 border-slate-100 dark:border-white/5 rounded-full" />
                      <div className="absolute inset-0 border-4 border-rose-500 rounded-full border-t-transparent animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center text-rose-500">
                        <Trash2 className="w-8 h-8 animate-pulse" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Wiping Records...</h3>
                    <p className="text-sm font-bold text-slate-500 mb-6">
                      Deleted <span className="text-rose-500">{clearState.completed}</span> of {clearState.count} items
                    </p>

                    <div className="w-full max-w-xs bg-slate-100 dark:bg-white/5 rounded-full h-2 mb-2 overflow-hidden flex items-center">
                      <div
                        className="bg-gradient-to-r from-rose-500 to-rose-400 h-full rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${Math.max(5, (clearState.completed / Math.max(1, clearState.count)) * 100)}%` }}
                      />
                    </div>
                    <div className="text-xs font-black text-rose-500">
                      {Math.round((clearState.completed / Math.max(1, clearState.count)) * 100)}%
                    </div>
                  </div>
                )}

                {clearState.status === 'success' && (
                  <div className="flex flex-col items-center justify-center animate-in zoom-in duration-500 w-full py-8">
                    <div className="w-24 h-24 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mx-auto mb-6 shadow-xl shadow-emerald-500/20">
                      <CheckCircle2 className="w-12 h-12 animate-in slide-in-from-bottom-4 duration-500" />
                    </div>
                    <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mb-4">History Cleared!</h3>
                    <div className="flex items-center justify-center gap-4 text-sm font-bold bg-slate-50 dark:bg-white/5 px-5 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 shadow-sm border border-slate-100 dark:border-white/5">
                      <span className="flex items-center gap-1.5"><FileText className="w-4 h-4 text-slate-400" /> {clearState.count} Deleted</span>
                      <span className="w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
                      <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-amber-500" /> {clearState.time}ms</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Template Detail Drawer */}
      <AnimatePresence>
        {selectedTemplate && (
          <div className="fixed top-[40px] inset-x-0 bottom-0 z-[1010] flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSelectedTemplate(null);
                setIsDrawerEditing(false);
                setIsCustomFieldModalOpen(false);
              }}
              className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
            />

            {/* Side-by-side Add Section Panel */}
            <AnimatePresence>
              {isCustomFieldModalOpen && (
                <motion.div
                  initial={{ x: "50px", opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: "50px", opacity: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="relative w-[380px] bg-slate-50 dark:bg-[#0b1329] h-full border-r border-slate-200 dark:border-white/10 flex flex-col z-0 overflow-y-auto p-6 text-left shadow-2xl custom-scrollbar"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-base font-black text-slate-900 dark:text-white">Configure Section</h3>
                    <button
                      type="button"
                      onClick={() => setIsCustomFieldModalOpen(false)}
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/5 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <form onSubmit={handleSidePanelSubmit} className="space-y-5 flex-1 flex flex-col">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-bold">
                        Section Label <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={sideLabel}
                        onChange={(e) => setSideLabel(e.target.value)}
                        placeholder="e.g. Special Requirements"
                        className="w-full px-4 py-2.5 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/5 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-bold">
                        Field Type
                      </label>
                      <div className="grid grid-cols-1 gap-2">
                        {CUSTOM_FIELD_TYPES.map((t) => {
                          const Icon = t.icon;
                          const isSelected = sideFieldType === t.key;
                          return (
                            <button
                              key={t.key}
                              type="button"
                              onClick={() => setSideFieldType(t.key)}
                              className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                                isSelected
                                  ? 'bg-blue-50/50 border-blue-500 dark:bg-blue-500/5 dark:border-blue-500'
                                  : 'bg-white dark:bg-[#0f172a] border-slate-200 dark:border-white/5 hover:border-slate-350'
                              }`}
                            >
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                <Icon size={12} />
                              </div>
                              <div className="space-y-0.5">
                                <p className={`text-[10px] font-black uppercase tracking-wider ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-355'}`}>
                                  {t.label}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {["Dropdown", "MultipleChoice", "Checkbox"].includes(sideFieldType) && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-bold">
                          Options (comma-separated) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={sideOptionsInput}
                          onChange={(e) => setSideOptionsInput(e.target.value)}
                          placeholder="e.g. Option 1, Option 2, Option 3"
                          className="w-full px-4 py-2.5 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/5 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                          required
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-bold">
                        Placeholder Text
                      </label>
                      <input
                        type="text"
                        value={sidePlaceholder}
                        onChange={(e) => setSidePlaceholder(e.target.value)}
                        placeholder="Hint text shown inside the field..."
                        className="w-full px-4 py-2.5 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/5 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>

                    <div className="space-y-3.5 pt-2">
                      {[
                        { key: "useCustomValue", label: "Use Custom Value", desc: "Separate internal key", val: sideUseCustomValue, set: setSideUseCustomValue },
                        { key: "required", label: "Mark as Required", desc: "Required before submitting", val: sideRequired, set: setSideRequired },
                        { key: "hideFromCandidates", label: "Hide from Candidates", desc: "Visible to recruiters only", val: sideHideFromCandidates, set: setSideHideFromCandidates }
                      ].map((toggle) => (
                        <div key={toggle.key} className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-white/5 last:border-0">
                          <div className="space-y-0.5 pr-2">
                            <p className="text-[10px] font-black text-slate-700 dark:text-slate-350 uppercase tracking-wide">{toggle.label}</p>
                            <p className="text-[9px] text-slate-400 font-medium">{toggle.desc}</p>
                          </div>
                          <ToggleSwitch checked={toggle.val} onChange={toggle.set} />
                        </div>
                      ))}

                      <div className="bg-blue-50/50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10 p-3 rounded-xl flex items-center justify-between">
                        <div className="space-y-0.5 pr-2">
                          <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wide">Push to CSOD</p>
                          <p className="text-[9px] text-slate-400 font-medium font-semibold">Sync with Cornerstone</p>
                        </div>
                        <ToggleSwitch checked={sidePushToCSOD} onChange={setSidePushToCSOD} />
                      </div>

                      <div className="bg-purple-50/50 dark:bg-purple-500/5 border border-purple-100 dark:border-purple-500/10 p-3 rounded-xl flex items-center justify-between mt-2">
                        <div className="space-y-0.5 pr-2">
                          <p className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-wide">View Section</p>
                          <p className="text-[9px] text-slate-400 font-medium font-semibold">Make this section visible</p>
                        </div>
                        <ToggleSwitch checked={sideViewSection} onChange={setSideViewSection} />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-white/5 mt-auto">
                      <button
                        type="button"
                        onClick={() => setIsCustomFieldModalOpen(false)}
                        className="px-4 py-2.5 bg-white dark:bg-transparent border border-slate-200 dark:border-white/10 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-lg shadow-blue-500/20 transition-all"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-2xl bg-white dark:bg-[#0f172a] h-full shadow-2xl border-l border-slate-200 dark:border-white/10 flex flex-col z-10 overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="p-6 sm:p-8 border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-lg flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Imported JD Record Details
                  </span>
                  <button
                    onClick={() => {
                      setSelectedTemplate(null);
                      setIsDrawerEditing(false);
                    }}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {isDrawerEditing ? (
                  <input
                    type="text"
                    defaultValue={editData.template_title}
                    onBlur={(e) => setEditData({ ...editData, template_title: e.target.value })}
                    className="w-full text-2xl sm:text-3xl font-black text-slate-900 dark:text-white bg-white dark:bg-[#0b1121] border border-blue-500 rounded-xl px-4 py-2 mt-2 focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors"
                  />
                ) : (
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight pr-4">
                    {selectedTemplate.template_title || selectedTemplate.title}
                  </h3>
                )}

                {!isDrawerEditing && selectedTemplate && (
                  <div className="flex items-center gap-4 mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400 flex-wrap">
                    <div className="flex items-center gap-1.5" title="Created Date & Time">
                      <Calendar className="w-3.5 h-3.5 text-blue-500" />
                      <span>Created: {formatDateTime(selectedTemplate.created_at || selectedTemplate.date)}</span>
                    </div>
                    {(() => {
                      const updatedTimeStr = getUpdatedTimeInfo(selectedTemplate);
                      if (!updatedTimeStr) return null;
                      return (
                        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-200/50 dark:border-amber-500/20" title="Last Updated Date & Time">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Updated: {updatedTimeStr}</span>
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div className="flex items-center gap-3 mt-6">
                  {isDrawerEditing ? (
                    <>
                      <button onClick={saveDrawerEdit} className="flex-1 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
                        <Save className="w-4 h-4" /> Save Changes
                      </button>
                      <button onClick={() => setIsDrawerEditing(false)} className="flex-1 py-2.5 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl transition-all flex items-center justify-center gap-2">
                        <X className="w-4 h-4" /> Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={handleEditInDrawer} className="flex-1 py-2.5 px-3 text-sm font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl transition-all flex items-center justify-center gap-2">
                        <Edit2 className="w-4 h-4" /> Edit
                      </button>
                      <button onClick={() => setShowWorkflowModal(true)} className="flex-1 py-2.5 px-3 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 rounded-xl transition-all flex items-center justify-center gap-2">
                        <Send className="w-4 h-4" /> Submit
                      </button>
                      <button onClick={() => setIsDeletingId(selectedTemplate.id)} className="py-2.5 px-4 text-sm font-bold text-rose-500 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 rounded-xl transition-all flex items-center justify-center gap-2">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 p-6 sm:p-8 overflow-y-auto custom-scrollbar space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Requisition & Metadata</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-100 dark:border-white/5 flex flex-col justify-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">Job / Requisition ID</p>
                      {isDrawerEditing ? (
                        <input
                          type="text"
                          value={editData.requisition_template_id}
                          onChange={(e) => setEditData({ ...editData, requisition_template_id: e.target.value })}
                          className="w-full text-sm font-mono font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-[#0b1121] border border-blue-500/50 rounded-lg px-3 py-1.5 focus:border-blue-500 outline-none transition-colors"
                        />
                      ) : (
                        <p className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200">
                          {selectedTemplate.job_id || selectedTemplate.requisition_template_id || selectedTemplate.code || "N/A"}
                        </p>
                      )}
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-100 dark:border-white/5 flex flex-col justify-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">Status</p>
                      {isDrawerEditing ? (
                        <select
                          value={editData.status}
                          onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                          className="w-full text-sm font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-[#0b1121] border border-emerald-500/50 rounded-lg px-3 py-1.5 focus:border-emerald-500 outline-none transition-colors"
                        >
                          <option value="saba">IMPORTED</option>
                          <option value="active">ACTIVE</option>
                          <option value="inactive">INACTIVE</option>
                          <option value="draft">DRAFT</option>
                        </select>
                      ) : (
                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                          {formatImportStatusLabel(selectedTemplate.status || "LIVE")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Saba Sections Renderer */}
                {(isDrawerEditing ? editData.sections : selectedTemplate.sections) && (
                  <div className="space-y-6">
                    {/* Summary Block */}
                    {(isDrawerEditing ? editData.sections.SUMMARY !== undefined : selectedTemplate.sections.SUMMARY) && (
                      <div className="p-5 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-100 dark:border-white/5">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Summary</h4>
                        {isDrawerEditing ? (
                          <textarea
                            value={editData.sections.SUMMARY || ""}
                            onChange={(e) => setEditData({
                              ...editData,
                              sections: { ...editData.sections, SUMMARY: e.target.value }
                            })}
                            className="w-full bg-white dark:bg-[#0b1121] text-xs text-slate-700 dark:text-slate-350 rounded-xl px-4 py-3 border border-slate-200 focus:border-blue-500 outline-none resize-none h-32"
                          />
                        ) : (
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                            {selectedTemplate.sections.SUMMARY}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Job Details Grid */}
                    {(isDrawerEditing ? editData.sections["Job Details"] !== undefined : selectedTemplate.sections["Job Details"]) && (
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Job Details</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {Object.entries(isDrawerEditing ? editData.sections["Job Details"] : selectedTemplate.sections["Job Details"]).map(([k, v]) => (
                            <div key={k} className="p-3 bg-slate-50 dark:bg-white/[0.02] rounded-xl border border-slate-100 dark:border-white/5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{k}</span>
                              {isDrawerEditing ? (
                                <input
                                  type="text"
                                  value={String(v || "")}
                                  onChange={(e) => setEditData({
                                    ...editData,
                                    sections: {
                                      ...editData.sections,
                                      "Job Details": { ...editData.sections["Job Details"], [k]: e.target.value }
                                    }
                                  })}
                                  className="w-full text-xs font-bold text-slate-800 dark:text-slate-250 bg-white dark:bg-[#0b1121] border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-500"
                                />
                              ) : (
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{String(v || "N/A")}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Essential Duties Block */}
                    {(isDrawerEditing ? editData.sections["ESSENTIAL DUTIES AND RESPONSIBILITIES"] !== undefined : selectedTemplate.sections["ESSENTIAL DUTIES AND RESPONSIBILITIES"]) && (
                      <div className="p-5 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-100 dark:border-white/5">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Essential Duties & Responsibilities</h4>
                        {isDrawerEditing ? (
                          <textarea
                            value={editData.sections["ESSENTIAL DUTIES AND RESPONSIBILITIES"] || ""}
                            onChange={(e) => setEditData({
                              ...editData,
                              sections: { ...editData.sections, "ESSENTIAL DUTIES AND RESPONSIBILITIES": e.target.value }
                            })}
                            className="w-full bg-white dark:bg-[#0b1121] text-xs text-slate-700 dark:text-slate-350 rounded-xl px-4 py-3 border border-slate-200 focus:border-blue-500 outline-none resize-none h-32"
                          />
                        ) : (
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                            {selectedTemplate.sections["ESSENTIAL DUTIES AND RESPONSIBILITIES"]}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Dynamic Array & Object Sections */}
                    {isDrawerEditing ? (
                      <Reorder.Group
                        axis="y"
                        values={sectionOrder}
                        onReorder={handleSectionReorder}
                        className="space-y-5"
                        as="div"
                      >
                        {sectionOrder.map((sectionTitle) => {
                          const sectionContent = editData.sections[sectionTitle];
                          return (
                            <Reorder.Item
                              key={sectionTitle}
                              value={sectionTitle}
                              as="div"
                              className="p-5 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-100 dark:border-white/5 relative group"
                            >
                              {/* Drag Handle + Delete row */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 transition-colors"
                                    title="Drag to reorder"
                                  >
                                    <GripVertical className="w-4 h-4" />
                                  </div>
                                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{sectionTitle}</h4>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const copy = { ...editData.sections };
                                    delete copy[sectionTitle];
                                    const newOrder = sectionOrder.filter(k => k !== sectionTitle);
                                    setSectionOrder(newOrder);
                                    setEditData({ ...editData, sections: copy });
                                  }}
                                  className="text-rose-500 p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors"
                                  title="Delete Section"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                          {(() => {
                            const fType = getSectionFieldType(sectionTitle);
                            const placeholderText = getSectionPlaceholder(sectionTitle);

                            if (isDrawerEditing) {
                              const options = getSectionOptions(sectionTitle);

                              if (fType === "TextBox") {
                                return (
                                  <input
                                    type="text"
                                    value={String(sectionContent || "")}
                                    onChange={(e) => setEditData({
                                      ...editData,
                                      sections: { ...editData.sections, [sectionTitle]: e.target.value }
                                    })}
                                    placeholder={placeholderText}
                                    className="w-full bg-white dark:bg-[#0b1121] text-xs text-slate-700 dark:text-slate-350 rounded-xl px-4 py-3 border border-slate-200 focus:border-blue-500 outline-none"
                                  />
                                );
                              }
                              if (fType === "DateTime") {
                                return (
                                  <input
                                    type="datetime-local"
                                    value={String(sectionContent || "")}
                                    onChange={(e) => setEditData({
                                      ...editData,
                                      sections: { ...editData.sections, [sectionTitle]: e.target.value }
                                    })}
                                    className="w-full bg-white dark:bg-[#0b1121] text-xs text-slate-700 dark:text-slate-350 rounded-xl px-4 py-3 border border-slate-200 focus:border-blue-500 outline-none"
                                  />
                                );
                              }
                              if (fType === "Dropdown") {
                                return (
                                  <select
                                    value={String(sectionContent || "")}
                                    onChange={(e) => setEditData({
                                      ...editData,
                                      sections: { ...editData.sections, [sectionTitle]: e.target.value }
                                    })}
                                    className="w-full bg-white dark:bg-[#0b1121] text-xs text-slate-750 dark:text-slate-300 rounded-xl px-4 py-3 border border-slate-200 focus:border-blue-500 outline-none"
                                  >
                                    <option value="">{placeholderText || "Select an option..."}</option>
                                    {options.map((opt) => (
                                      <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                );
                              }
                              if (fType === "MultipleChoice") {
                                return (
                                  <div className="space-y-2.5 p-4 bg-white dark:bg-[#0b1121] border border-slate-150 dark:border-white/5 rounded-xl text-left">
                                    {options.map((opt) => (
                                      <label key={opt} className="flex items-center gap-3 cursor-pointer">
                                        <input
                                          type="radio"
                                          name={sectionTitle}
                                          value={opt}
                                          checked={String(sectionContent) === opt}
                                          onChange={(e) => setEditData({
                                            ...editData,
                                            sections: { ...editData.sections, [sectionTitle]: e.target.value }
                                          })}
                                          className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                                        />
                                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-205">{opt}</span>
                                      </label>
                                    ))}
                                  </div>
                                );
                              }
                              if (fType === "Checkbox") {
                                return (
                                  <div className="space-y-2.5 p-4 bg-white dark:bg-[#0b1121] border border-slate-150 dark:border-white/5 rounded-xl text-left">
                                    {options.map((opt) => {
                                      const isChecked = Array.isArray(sectionContent) && sectionContent.includes(opt);
                                      return (
                                        <label key={opt} className="flex items-center gap-3 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            value={opt}
                                            checked={isChecked}
                                            onChange={(e) => {
                                              const current = Array.isArray(sectionContent) ? sectionContent : [];
                                              const next = e.target.checked
                                                ? [...current, opt]
                                                : current.filter(item => item !== opt);
                                              setEditData({
                                                ...editData,
                                                sections: { ...editData.sections, [sectionTitle]: next }
                                              });
                                            }}
                                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                          />
                                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-205">{opt}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                );
                              }
                              if (Array.isArray(sectionContent) || fType === "Weights") {
                                return (
                                  <div className="space-y-3">
                                    {(Array.isArray(sectionContent) ? sectionContent : []).map((item, idx) => {
                                      const isObj = typeof item === 'object';
                                      const titleVal = isObj ? (item.DESCRIPTION || item.description || "") : String(item);
                                      const weightVal = isObj ? (item.WEIGHT || item.weight || 0) : 0;
                                      return (
                                        <div key={idx} className="flex gap-2 items-center bg-white dark:bg-[#0b1121] p-3 rounded-xl border border-slate-200/60 dark:border-white/5">
                                          <input
                                            type="text"
                                            value={titleVal}
                                            onChange={(e) => {
                                              const copySec = [...(Array.isArray(sectionContent) ? sectionContent : [])];
                                              if (isObj) {
                                                copySec[idx] = { ...copySec[idx], description: e.target.value, DESCRIPTION: e.target.value };
                                              } else {
                                                copySec[idx] = { description: e.target.value, weight: 0 };
                                              }
                                              setEditData({
                                                ...editData,
                                                sections: { ...editData.sections, [sectionTitle]: copySec }
                                              });
                                            }}
                                            placeholder="Item description"
                                            className="flex-1 text-xs font-medium text-slate-750 dark:text-slate-300 bg-transparent border-0 outline-none focus:ring-0 p-0"
                                          />

                                          {fType === "Weights" && (
                                            <div className="flex items-center gap-1 shrink-0 bg-slate-50 dark:bg-white/5 px-2 py-1 rounded-lg border border-slate-200/50 dark:border-white/10">
                                              <input
                                                type="number"
                                                value={weightVal}
                                                onChange={(e) => {
                                                  const copySec = [...(Array.isArray(sectionContent) ? sectionContent : [])];
                                                  const valNum = parseInt(e.target.value) || 0;
                                                  if (isObj) {
                                                    copySec[idx] = { ...copySec[idx], weight: valNum, WEIGHT: valNum };
                                                  } else {
                                                    copySec[idx] = { description: String(item), weight: valNum };
                                                  }
                                                  setEditData({
                                                    ...editData,
                                                    sections: { ...editData.sections, [sectionTitle]: copySec }
                                                  });
                                                }}
                                                placeholder="0"
                                                className="w-10 text-center text-xs font-bold text-slate-800 dark:text-slate-200 bg-transparent border-0 outline-none focus:ring-0 p-0"
                                              />
                                              <span className="text-[10px] font-bold text-slate-400">%</span>
                                            </div>
                                          )}

                                          <button
                                            type="button"
                                            onClick={() => {
                                              const copySec = (Array.isArray(sectionContent) ? sectionContent : []).filter((_, i) => i !== idx);
                                              setEditData({
                                                ...editData,
                                                sections: { ...editData.sections, [sectionTitle]: copySec }
                                              });
                                            }}
                                            className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors shrink-0"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      );
                                    })}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newItem = fType === "Weights" ? { description: "", weight: 0 } : "";
                                        setEditData({
                                          ...editData,
                                          sections: { ...editData.sections, [sectionTitle]: [...(Array.isArray(sectionContent) ? sectionContent : []), newItem] }
                                        });
                                      }}
                                      className="text-[11px] font-bold text-blue-500 hover:text-blue-600 flex items-center gap-1 mt-1"
                                    >
                                      <Plus className="w-3 h-3" /> Add Item
                                    </button>
                                  </div>
                                );
                              }
                              if (typeof sectionContent === 'object') {
                                return (
                                  <div className="grid grid-cols-2 gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                                    {Object.entries(sectionContent).map(([k, v]) => (
                                      <div key={k} className="p-2.5 bg-white dark:bg-white/5 rounded-lg border border-slate-100 dark:border-white/5">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">{k}</span>
                                        <input
                                          type="text"
                                          value={String(v || "")}
                                          onChange={(e) => setEditData({
                                            ...editData,
                                            sections: {
                                              ...editData.sections,
                                              [sectionTitle]: { ...editData.sections[sectionTitle], [k]: e.target.value }
                                            }
                                          })}
                                          className="w-full bg-slate-50 dark:bg-[#0b1121] border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-500"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                );
                              }
                              return (
                                <textarea
                                  value={String(sectionContent || "")}
                                  onChange={(e) => setEditData({
                                    ...editData,
                                    sections: { ...editData.sections, [sectionTitle]: e.target.value }
                                  })}
                                  placeholder={placeholderText}
                                  className="w-full bg-white dark:bg-[#0b1121] text-xs text-slate-700 dark:text-slate-350 rounded-xl px-4 py-3 border border-slate-200 focus:border-blue-500 outline-none resize-none h-24"
                                />
                              );
                            }
                            })()}
                            </Reorder.Item>
                          );
                        })}
                      </Reorder.Group>
                ) : (
                  <div className="space-y-5">
                    {Object.entries(selectedTemplate.sections).map(([sectionTitle, sectionContent]) => {
                      if (sectionTitle === "SUMMARY" || sectionTitle === "ESSENTIAL DUTIES AND RESPONSIBILITIES" || sectionTitle === "Job Details" || sectionTitle === "_custom_fields_metadata" || sectionTitle === "_section_order" || sectionTitle === "_source") {
                        return null;
                      }
                      return (
                        <div key={sectionTitle} className="p-5 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-100 dark:border-white/5">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{sectionTitle}</h4>
                          {(() => {
                            if (Array.isArray(sectionContent)) {
                              return (
                                <ul className="space-y-2">
                                  {sectionContent.map((item, idx) => (
                                    <li key={idx} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                      <span className="font-medium leading-relaxed flex items-center gap-1.5">
                                        {typeof item === 'object' ? (item.DESCRIPTION || item.description || JSON.stringify(item)) : String(item)}
                                        {typeof item === 'object' && (item.WEIGHT || item.weight) ? (
                                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 rounded">
                                            {item.WEIGHT || item.weight}%
                                          </span>
                                        ) : null}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              );
                            }
                            if (typeof sectionContent === 'object' && sectionContent !== null) {
                              return (
                                <div className="grid grid-cols-2 gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                                  {Object.entries(sectionContent).map(([k, v]) => (
                                    <div key={k} className="p-2.5 bg-white dark:bg-white/5 rounded-lg border border-slate-100 dark:border-white/5">
                                      <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">{k}</span>
                                      <span>{String(v)}</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            }
                            return (
                              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{String(sectionContent)}</p>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Add Dynamic Section Form inside edit drawer */}
            {isDrawerEditing && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleOpenAddSection}
                      className="w-full py-4 bg-slate-50 dark:bg-white/[0.02] border-2 border-dashed border-slate-250 dark:border-white/10 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 hover:border-indigo-500/50 transition-all"
                    >
                      <Plus className="w-4 h-4" /> Add Section
                    </button>
                  </div>
                )}

                {/* Parsed Excel Data Attributes (Fallback for Legacy Records) */}
                {(isDrawerEditing ? Object.keys(editData.excel_data || {}) : Object.keys(selectedTemplate.excel_data || {})).length > 0 && (
                <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Imported Attributes ({(isDrawerEditing ? Object.keys(editData.excel_data || {}) : Object.keys(selectedTemplate.excel_data || {})).length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(isDrawerEditing ? Object.entries(editData.excel_data || {}) : Object.entries(selectedTemplate.excel_data || {})).map(([key, val]) => {
                    const strVal = typeof val === "boolean" ? (val ? "True" : "False") : String(val || "");
                    const isLongText = strVal.length > 50 || key.toLowerCase().includes('description') || key.toLowerCase().includes('qualification') || key.toLowerCase().includes('keyword');

                    return (
                      <div key={key} className={`p-4 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border flex flex-col justify-center transition-all ${isDrawerEditing ? 'border-blue-500/30 shadow-sm shadow-blue-500/5 bg-white dark:bg-[#0f172a]' : 'border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10'} ${isLongText ? 'md:col-span-2' : 'col-span-1'}`}>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex-shrink-0">
                          {key}
                        </span>
                        {isDrawerEditing ? (
                          isLongText ? (
                            <textarea
                              value={strVal}
                              onChange={(e) => setEditData({
                                ...editData,
                                excel_data: { ...editData.excel_data, [key]: e.target.value }
                              })}
                              rows={4}
                              className="w-full text-sm font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-[#0b1121] border border-slate-200 dark:border-white/10 focus:border-blue-500 rounded-lg px-3 py-2 outline-none transition-colors resize-y min-h-[80px]"
                            />
                          ) : (
                            <input
                              type="text"
                              value={strVal}
                              onChange={(e) => setEditData({
                                ...editData,
                                excel_data: { ...editData.excel_data, [key]: e.target.value }
                              })}
                              className="w-full text-sm font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-[#0b1121] border border-slate-200 dark:border-white/10 focus:border-blue-500 rounded-lg px-3 py-2 outline-none transition-colors"
                            />
                          )
                        ) : (
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-200 break-words whitespace-pre-wrap">
                            {strVal || "N/A"}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <WorkflowModal
        isOpen={showWorkflowModal}
        onClose={() => setShowWorkflowModal(false)}
        onConfirm={handleConfirmWorkflow}
        workflows={workflows}
        targetDepartment={selectedTemplate?.sections?.["Job Details"]?.Department || ""}
      />

    </div>
  );
}
