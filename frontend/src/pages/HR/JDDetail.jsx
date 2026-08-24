import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileEdit,
  User,
  Calendar,
  Briefcase,
  MapPin,
  DollarSign,
  Send,
  History,
  Info,
  Layers,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Gift,
  Target,
  Trophy,
  Activity,
  Award,
  MoreVertical,
  Zap,
  Plus,
  MessageSquare,
  RefreshCw,
  Edit3,
  AlignLeft,
  List,
  CheckCircle2 as CheckCircleIcon,
  Wand2,
  Trash2,
  Save,
  Check,
  X,
  Type,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Cloud,
  CloudOff,
  ChevronDown,
  GitCompare,
  Circle
} from 'lucide-react';
import { mockHRJDs } from '../../mock/mockHRDashboard';
import { useContext } from 'react';
import { JDContext } from '../../context/JDContext';
import * as jdService from '../../services/jdService';
import VersionCompareView from '../../components/common/VersionCompareView';

import * as workflowService from '../../services/workflowService';
import WorkflowSelectionPanel from '../../components/common/WorkflowSelectionPanel';
import toast from 'react-hot-toast';
import { formatSalaryRange, stripHighlightTags, resolveSectionsOrder, resolveSectionObject, resolveSectionMeta, unwrapSectionData, sectionTextValue, isStableSection, isWeightedSectionData, isSectionContentEmpty, normalizeForWeightedList, resolvePushToCsod, toBackendSectionData } from '../../utils/formatJD';
import { isPdfImportedJd, PDF_IMPORT_MODE } from '../../utils/importedJd';
import * as orgService from '../../services/organizationService';
import SearchableDropdown from '../../components/common/SearchableDropdown';
import UserSelectionPanel from '../../components/common/UserSelectionPanel';

const extractText = (item) => {
  if (!item) return "";
  if (typeof item === "string") return item;
  if (typeof item === "object") {
    const val = item.title || item.point || item.duty || item.description || "";
    return String(val || "");
  }
  return String(item);
};

const renderHighlightedText = (text) => {
  if (!text) return "";
  if (typeof text !== 'string') {
    if (typeof text === 'object' && text !== null) {
      if (Array.isArray(text)) return "";
      const strVal = text.title || text.point || text.description || text.duty || text.text || text.message || "";
      if (typeof strVal === 'string') {
        text = strVal;
      } else {
        return "";
      }
    } else {
      return "";
    }
  }

  const regex = /\[\[mod:(#[0-9A-F]{6}|#[0-9A-F]{3}|[a-z]+):(.*?)]]([\s\S]*?)\[\[\/mod]]/gi;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const [_, color, rest, content] = match;
    const nameParts = rest.split(':');
    const name = nameParts[0];
    const rawTimestamp = nameParts.length > 1 ? nameParts.slice(1).join(':') : null;

    let formattedTimestamp = null;
    if (rawTimestamp) {
      try {
        const dateObj = new Date(rawTimestamp);
        if (!isNaN(dateObj.getTime())) {
          formattedTimestamp = new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            timeZoneName: 'short'
          }).format(dateObj);
        } else {
          formattedTimestamp = rawTimestamp; // Fallback
        }
      } catch (e) {
        formattedTimestamp = rawTimestamp;
      }
    }

    const isBlackBg = color.toLowerCase() === '#000000' || color.toLowerCase() === '#000' || color.toLowerCase() === 'black';
    const textColor = isBlackBg ? 'white' : 'black';

    parts.push(
      <span
        key={match.index}
        className="relative group inline-block"
      >
        <span
          style={{
            backgroundColor: `${color}15`,
            borderBottom: `2px solid ${color}`,
          }}
          className="px-1 rounded-sm text-slate-900 dark:text-white"
        >
          {content}
        </span>
        <span
          style={{
            backgroundColor: `${color}18`,
            border: `1px solid ${color}40`
          }}
          className="ml-1.5 px-2 py-0.5 text-[10px] font-black rounded uppercase tracking-tight shadow-sm inline-flex items-center gap-1.5 align-middle transition-all duration-300 hover:scale-125 hover:shadow-md cursor-help origin-left hover:z-20 relative text-slate-800 dark:text-slate-200"
        >
          <span className="whitespace-nowrap">{name}</span>
          {formattedTimestamp && <span className="opacity-80 font-bold tracking-wide text-[9px] lowercase whitespace-nowrap">{formattedTimestamp}</span>}
        </span>
      </span>
    );

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
};

const normalizeList = (list) => {
  if (!Array.isArray(list)) return [];
  return list.map(extractText).filter(Boolean);
};

const normalizeComplexList = (list) => {
  if (!Array.isArray(list)) return [];
  return list.map(item => {
    if (typeof item === 'string') return { title: item, description: "", weight: 0 };
    return {
      title: extractText(item.title || item.point || item.duty || "Item"),
      description: extractText(item.description || ""),
      weight: item.weight || 0
    };
  });
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const StatusBadge = ({ status }) => {
  const config = getStatusConfig(status);
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${config.bg} ${config.text} ${config.border} shadow-sm transition-all duration-300`}>
      <Icon size={12} />
      {extractText(status)}
    </span>
  );
};

const getStatusConfig = (status = '') => {
  const normStatus = status.toLowerCase();
  const configs = {
    'public_view': {
      bg: 'bg-blue-500/10',
      text: 'text-blue-600',
      border: 'border-blue-500/20',
      icon: Zap,
      msg: 'Job Description is live',
      accent: 'bg-blue-500'
    },
    'published': {
      bg: 'bg-blue-500/10',
      text: 'text-blue-600',
      border: 'border-blue-500/20',
      icon: Zap,
      msg: 'Job Description is live',
      accent: 'bg-blue-500'
    },
    'approved': {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-600',
      border: 'border-emerald-500/20',
      icon: CheckCircle2,
      msg: 'Ready to push to CSOD',
      accent: 'bg-emerald-500'
    },
    'completed': {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-600',
      border: 'border-emerald-500/20',
      icon: CheckCircle2,
      msg: 'Ready to push to CSOD',
      accent: 'bg-emerald-500'
    },
    'submitted': {
      bg: 'bg-blue-500/10',
      text: 'text-blue-600',
      border: 'border-blue-500/20',
      icon: Clock,
      msg: 'Waiting for manager approval',
      accent: 'bg-blue-500'
    },
    'pending approval': {
      bg: 'bg-blue-500/10',
      text: 'text-blue-600',
      border: 'border-blue-500/20',
      icon: Clock,
      msg: 'Waiting for manager approval',
      accent: 'bg-blue-500'
    },
    'rejected': {
      bg: 'bg-rose-500/10',
      text: 'text-rose-600',
      border: 'border-rose-500/20',
      icon: AlertCircle,
      msg: 'Rejected',
      accent: 'bg-rose-500'
    },
    'returned_to_initiator': {
      bg: 'bg-rose-500/10',
      text: 'text-rose-600',
      border: 'border-rose-500/20',
      icon: AlertCircle,
      msg: 'Rejected',
      accent: 'bg-rose-500'
    },
    'returned': {
      bg: 'bg-rose-500/10',
      text: 'text-rose-600',
      border: 'border-rose-500/20',
      icon: AlertCircle,
      msg: 'Rejected',
      accent: 'bg-rose-500'
    },
    'declined': {
      bg: 'bg-rose-500/10',
      text: 'text-rose-600',
      border: 'border-rose-500/20',
      icon: AlertCircle,
      msg: 'Rejected',
      accent: 'bg-rose-500'
    },
    'revision requested': {
      bg: 'bg-rose-500/10',
      text: 'text-rose-600',
      border: 'border-rose-500/20',
      icon: AlertCircle,
      msg: 'Rejected',
      accent: 'bg-rose-500'
    },
    'final': {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-600',
      border: 'border-emerald-500/20',
      icon: CheckCircle2,
      msg: 'Finalized and ready for review',
      accent: 'bg-emerald-500'
    },
    'waiting_for_approval': {
      bg: 'bg-blue-500/10',
      text: 'text-blue-600',
      border: 'border-blue-500/20',
      icon: Clock,
      msg: 'Waiting for manager approval',
      accent: 'bg-blue-500'
    },
    'draft': {
      bg: 'bg-slate-500/10',
      text: 'text-slate-500',
      border: 'border-slate-500/20',
      icon: FileEdit,
      msg: 'Please finalize to submit',
      accent: 'bg-slate-500'
    }
  };
  return configs[normStatus] || configs['draft'];
};

const JDSectionHeader = ({ title, icon: Icon, onRegenerate, isGenerating, itemCount, description, canEdit, hasWeights, weightLocked, onToggleWeightLock, hasSectionLock, sectionLocked, onToggleSectionLock, csodPushed, onToggleCSOD, csodOnlyMode }) => {
  return (
    <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-white/5 group transition-colors hover:bg-slate-50/30 dark:hover:bg-white/[0.02]">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-white dark:bg-white/5 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-white/10 shadow-sm group-hover:border-blue-200 dark:group-hover:border-indigo-500 transition-all duration-300">
          <Icon className="w-6 h-6 text-blue-600 dark:text-indigo-400" />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="font-bold text-slate-800 dark:text-white text-lg tracking-tight">{title}</h3>
            {itemCount !== undefined && itemCount > 0 && (
              <span className="px-2.5 py-0.5 bg-blue-50 dark:bg-indigo-500/10 text-blue-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wider rounded-full border border-blue-100 dark:border-indigo-500/20">
                {itemCount} Items
              </span>
            )}
          </div>
          {description && (
            <p className="text-[13px] text-slate-400 font-medium mt-0.5">{description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {!csodOnlyMode && hasSectionLock && (
          <button
            onClick={onToggleSectionLock}
            className={`
              flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300 shadow-sm
              ${sectionLocked
                ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 hover:bg-rose-100 hover:scale-105 active:scale-95"
                : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100 hover:scale-105 active:scale-95"
              }
            `}
            title={sectionLocked ? "Section Hidden" : "Section Visible"}
          >
            {sectionLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </button>
        )}

        {!csodOnlyMode && hasWeights && (
          <button
            onClick={onToggleWeightLock}
            className={`
              flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300 shadow-sm
              ${weightLocked
                ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 hover:bg-rose-100 hover:scale-105 active:scale-95"
                : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100 hover:scale-105 active:scale-95"
              }
            `}
            title={weightLocked ? "Weights Locked (Hidden)" : "Weights Unlocked (Visible)"}
          >
            {weightLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </button>
        )}

        {(csodOnlyMode || onToggleCSOD) && (
          <button
            type="button"
            onClick={onToggleCSOD || undefined}
            disabled={!onToggleCSOD}
            className={`
              flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300 shadow-sm
              ${csodPushed
                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100 hover:scale-105 active:scale-95"
                : "bg-slate-50 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 hover:text-emerald-500 hover:border-emerald-200 hover:scale-105 active:scale-95"
              }
              ${!onToggleCSOD ? "opacity-80 cursor-default hover:scale-100" : ""}
            `}
            title={csodPushed ? "Included in CSOD push" : "Excluded from CSOD push"}
          >
            {csodPushed ? <Cloud className="w-4 h-4" /> : <CloudOff className="w-4 h-4" />}
          </button>
        )}

        {!csodOnlyMode && canEdit && onRegenerate && (
          <button
            onClick={onRegenerate}
            disabled={isGenerating}
            className={`
              flex items-center gap-2.5 px-4 py-2 rounded-xl text-[13px] font-bold transition-all duration-300
              ${isGenerating
                ? "bg-blue-600 dark:bg-indigo-600 text-white shadow-lg shadow-blue-600/20 dark:shadow-indigo-600/20 opacity-100"
                : "bg-blue-50 dark:bg-indigo-500/10 text-blue-600 dark:text-indigo-400 border border-blue-100 dark:border-indigo-500/20 opacity-100"
              }
              ${isGenerating ? "cursor-wait" : "hover:bg-blue-600 hover:text-white dark:hover:bg-indigo-600 hover:scale-105 active:scale-95"}
            `}
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>AI Writing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Refine with AI</span>
              </>
            )
            }
          </button>
        )}
      </div>
    </div>
  );
};

const StaticDisplay = ({ label, value, icon: Icon }) => (
  <div className="flex flex-col gap-1.5 min-w-0">
    {label && <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>}
    <div className="flex items-center gap-2 text-xs text-slate-800 dark:text-white font-bold py-1 min-w-0">
      {Icon && <Icon className="w-4 h-4 text-slate-400 shrink-0" />}
      <span className="truncate" title={String(value || "N/A")}>{value || "N/A"}</span>
    </div>
  </div>
);

const TimelineItem = ({ label, date, user, isLast }) => (
  <div className="relative pl-8 group pb-8">
    {!isLast && (
      <div className="absolute left-[11px] top-6 bottom-[-8px] w-[2px] bg-slate-100 dark:bg-white/5 group-hover:bg-indigo-500/30 transition-colors" />
    )}
    <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-white dark:bg-[#0f172a] border-2 border-slate-100 dark:border-white/10 flex items-center justify-center group-hover:border-indigo-500 transition-colors z-10 shadow-sm">
      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover:bg-indigo-500 transition-colors" />
    </div>
    <div className="space-y-1">
      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-bold text-slate-900 dark:text-white">{date}</p>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
        <User size={10} /> by {extractText(user)}
      </p>
    </div>
  </div>
);

// ─── Main Component ─────────────────────────────────────────────────────────

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

const ConfigureCustomFieldModal = ({ isOpen, onClose, onSave }) => {
  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState("TextBox");
  const [placeholder, setPlaceholder] = useState("");
  const [useCustomValue, setUseCustomValue] = useState(false);
  const [required, setRequired] = useState(false);
  const [hideFromCandidates, setHideFromCandidates] = useState(false);
  const [pushToCSOD, setPushToCSOD] = useState(false);
  const [viewSection, setViewSection] = useState(true);
  const [optionsInput, setOptionsInput] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!label.trim()) {
      toast.error("Field label is required");
      return;
    }
    const resolvedType = (fieldType === "Weights" || fieldType === "Checkbox") ? "points" : "text";
    const options = ["Dropdown", "MultipleChoice", "Checkbox"].includes(fieldType)
      ? optionsInput.split(",").map(o => o.trim()).filter(Boolean)
      : [];
    if (["Dropdown", "MultipleChoice", "Checkbox"].includes(fieldType) && options.length === 0) {
      toast.error("At least one option is required");
      return;
    }
    onSave({
      label: label.trim(),
      type: resolvedType,
      fieldType,
      placeholder: placeholder.trim(),
      use_custom_value: useCustomValue,
      required,
      hide_from_candidates: hideFromCandidates,
      push_to_csod: pushToCSOD,
      view_section: viewSection,
      options
    });
  };

  const types = [
    { key: "TextBox", label: "Text Box", desc: "Single-line free text", icon: Type },
    { key: "Dropdown", label: "Dropdown", desc: "Select one from list", icon: ChevronDown },
    { key: "Paragraph", label: "Paragraph", desc: "Multi-line rich text", icon: AlignLeft },
    { key: "DateTime", label: "Date / Time", desc: "Date and time picker", icon: Calendar },
    { key: "Weights", label: "Weights (%)", desc: "Percentage-based weights", icon: Layers },
    { key: "MultipleChoice", label: "Multiple Choice", desc: "Single selection (radio)", icon: Circle },
    { key: "Checkbox", label: "Checkbox", desc: "Multi-select options", icon: CheckCircle2 }
  ];

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#0f172a] rounded-[2rem] w-full max-w-xl max-h-[90vh] overflow-y-auto p-8 border border-slate-200 dark:border-white/5 shadow-2xl relative flex flex-col gap-6 custom-scrollbar animate-in zoom-in-95 duration-200 text-left">
        
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-900 dark:text-white">Configure Custom Field</h3>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
              Field Label <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Years of Experience"
              className="w-full px-5 py-3.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-2xl text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              required
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
              Field Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {types.map((t) => {
                const Icon = t.icon;
                const isSelected = fieldType === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setFieldType(t.key)}
                    className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'bg-indigo-50/55 border-indigo-500 dark:bg-indigo-500/5 dark:border-indigo-500'
                        : 'bg-white dark:bg-[#0f172a] border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                      <Icon size={16} />
                    </div>
                    <div className="space-y-0.5">
                      <p className={`text-xs font-black uppercase tracking-wider ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {t.label}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {t.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {["Dropdown", "MultipleChoice", "Checkbox"].includes(fieldType) && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                Options (comma-separated) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={optionsInput}
                onChange={(e) => setOptionsInput(e.target.value)}
                placeholder="e.g. Option 1, Option 2, Option 3"
                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-2xl text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
              Placeholder Text
            </label>
            <input
              type="text"
              value={placeholder}
              onChange={(e) => setPlaceholder(e.target.value)}
              placeholder="Hint text shown inside the field..."
              className="w-full px-5 py-3.5 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-2xl text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>

          <div className="space-y-4">
            {[
              { key: "useCustomValue", label: "Use Custom Value", desc: "Store a separate internal key distinct from the display label", val: useCustomValue, set: setUseCustomValue },
              { key: "required", label: "Mark as Required", desc: "Candidate must fill this field before submitting", val: required, set: setRequired },
              { key: "hideFromCandidates", label: "Hide from Candidates", desc: "Field is visible to recruiters only, not publicly shown", val: hideFromCandidates, set: setHideFromCandidates }
            ].map((toggle) => (
              <div key={toggle.key} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/5 last:border-0">
                <div className="space-y-0.5 pr-4">
                  <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wide">{toggle.label}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{toggle.desc}</p>
                </div>
                <ToggleSwitch checked={toggle.val} onChange={toggle.set} />
              </div>
            ))}

            <div className="bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/10 p-4 rounded-2xl flex items-center justify-between">
              <div className="space-y-0.5 pr-4">
                <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Push to CSOD</p>
                <p className="text-[10px] text-slate-400 font-medium">Sync this field with Cornerstone OnDemand when publishing</p>
              </div>
              <ToggleSwitch checked={pushToCSOD} onChange={setPushToCSOD} />
            </div>

            <div className="bg-purple-50/50 dark:bg-purple-500/5 border border-purple-100 dark:border-purple-500/10 p-4 rounded-2xl flex items-center justify-between mt-2">
              <div className="space-y-0.5 pr-4">
                <p className="text-xs font-black text-purple-600 dark:text-purple-400 uppercase tracking-wide">View Section</p>
                <p className="text-[10px] text-slate-400 font-medium">Make this section visible</p>
              </div>
              <ToggleSwitch checked={viewSection} onChange={setViewSection} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-white dark:bg-transparent border border-slate-200 dark:border-white/10 rounded-xl text-xs font-black uppercase tracking-wider text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-500/20 transition-all"
            >
              Save Field
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SabaJDContent = ({ jd, content, canEdit, setFullDetails, handleToggleLock, csodOnlyMode, canManageCsodMetadata, handleToggleCSOD }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [editBuffer, setEditBuffer] = useState(null);

  const getSectionFieldType = (sectionTitle) => {
    const dyn = jd.custom_fields?.dynamic_sections || [];
    const match = dyn.find(d => d.key === sectionTitle || d.id === sectionTitle || d.heading === sectionTitle);
    return match?.fieldType || "Paragraph";
  };

  const getSectionPlaceholder = (sectionTitle) => {
    const dyn = jd.custom_fields?.dynamic_sections || [];
    const match = dyn.find(d => d.key === sectionTitle || d.id === sectionTitle || d.heading === sectionTitle);
    return match?.placeholder || "Enter details...";
  };

  const getSectionOptions = (sectionTitle) => {
    const dyn = jd.custom_fields?.dynamic_sections || [];
    const match = dyn.find(d => d.key === sectionTitle || d.id === sectionTitle || d.heading === sectionTitle);
    return match?.options || [];
  };

  const handleAddField = async (fieldConfig) => {
    const defaultValue = fieldConfig.type === "points" ? [] : "";
    const newFieldObj = {
      name: fieldConfig.label,
      value: defaultValue,
      type: fieldConfig.type,
      placeholder: fieldConfig.placeholder,
      use_custom_value: fieldConfig.use_custom_value,
      required: fieldConfig.required,
      hide_from_candidates: fieldConfig.hide_from_candidates,
      push_to_csod: fieldConfig.push_to_csod
    };

    const existingCF = jd.custom_fields || {};
    const existingDyn = existingCF.dynamic_sections || [];
    
    const fieldsPayload = [
      ...existingDyn.map(d => ({
        name: d.heading || d.key,
        value: jd.content[d.key] || "",
        type: d.type,
        placeholder: d.placeholder || "",
        use_custom_value: d.use_custom_value || false,
        required: d.required || false,
        hide_from_candidates: d.hide_from_candidates || false,
        push_to_csod: d.push_to_csod || false
      })),
      newFieldObj
    ];

    try {
      const response = await jdService.updateSection(jd.id, "custom_fields", fieldsPayload);
      if (response && response.content) {
        setFullDetails(prev => ({
          ...prev,
          custom_fields: response.custom_fields || prev.custom_fields,
          content: response.content || prev.content
        }));
      }
      
      if (fieldConfig.hide_from_candidates) {
        const normKey = fieldConfig.label.trim().replace(/\s+/g, "_").toLowerCase();
        await handleToggleLock(`${normKey}_view`, "unlocked");
      }
      
      toast.success("Custom field added successfully!");
      setIsModalOpen(false);
    } catch (err) {
      console.error("Failed to add custom field:", err);
      toast.error("Could not add custom field.");
    }
  };

  const handleSaveSection = async (sectionTitle) => {
    try {
      const existing = content[sectionTitle];
      const meta = resolveSectionMeta(sectionTitle, existing, jd?.sections_metadata);
      const unwrapped = unwrapSectionData(existing);
      const weighted = isWeightedSectionData(unwrapped, sectionTitle, meta);

      let formattedBuffer = editBuffer;
      if (Array.isArray(editBuffer)) {
        formattedBuffer = toBackendSectionData(editBuffer, weighted);
      }

      let valueToSave = formattedBuffer;
      if (isStableSection(existing)) {
        valueToSave = {
          ...existing,
          section_data: formattedBuffer
        };
      }
      const response = await jdService.updateSection(jd.id, sectionTitle, valueToSave);
      if (response && response.content) {
        setFullDetails(prev => ({
          ...prev,
          content: response.content || prev.content
        }));
      }
      toast.success("Section updated successfully!");
      setEditingSection(null);
      setEditBuffer(null);
    } catch (err) {
      console.error("Failed to save section changes:", err);
      toast.error("Could not save section changes.");
    }
  };

  return (
    <>
      {(() => {
        const rawOrder = content?._section_order || [];
        const order = rawOrder.map(item => typeof item === 'object' && item !== null ? (item.point || item.title || "") : String(item)).filter(Boolean);
        const filteredEntries = Object.entries(content)
          .filter(([sectionTitle]) => {
            const isViewOrWeightKey = sectionTitle.endsWith("_view") || sectionTitle.startsWith("weight_view_");
            const isMetadataKey = ["Job Details", "id", "title", "job_id", "generation_mode", "org_id", "creator_id", "created_at", "updated_at", "status", "_section_order", "_source", "_custom_fields_metadata", "sections_metadata", "custom_fields", "sections_order", "headers_metadata"].includes(sectionTitle);
            return !isViewOrWeightKey && !isMetadataKey;
          });

        const sortedEntries = [...filteredEntries].sort((a, b) => {
          const idxA = order.indexOf(a[0]);
          const idxB = order.indexOf(b[0]);
          if (idxA === -1 && idxB === -1) return 0;
          if (idxA === -1) return 1;
          if (idxB === -1) return -1;
          return idxA - idxB;
        });

        return sortedEntries.map(([sectionTitle, sectionContent]) => {
          const unwrapped = unwrapSectionData(sectionContent);
          const meta = resolveSectionMeta(sectionTitle, sectionContent, jd?.sections_metadata);
          const titleStr = meta?.label || (jd.custom_fields?.section_labels || {})[sectionTitle] || sectionTitle;

          let isSectionEmpty = isSectionContentEmpty(sectionContent);
          
          if (isSectionEmpty) return null;
          
          const sectionLockKey = `${sectionTitle}_view`;
          const sectionWeightLockKey = `weight_view_${sectionTitle}_view`;
          const isLocked = isStableSection(sectionContent)
            ? (sectionContent.metadata?.view ?? sectionContent.METADATA?.view) === 'locked'
            : (jd[sectionLockKey] === "locked" || (jd.content && jd.content[sectionLockKey] === "locked"));
          const isWeightLocked = jd[sectionWeightLockKey] === "locked" || (jd.content && jd.content[sectionWeightLockKey] === "locked");
          const hasWeights = Array.isArray(unwrapped) && unwrapped.some(item => item && typeof item === 'object' && 'weight' in item);
          const isEditingThis = editingSection === sectionTitle;
          const weighted = isWeightedSectionData(unwrapped, sectionTitle, meta);

          return (
            <section key={sectionTitle} className="bg-white dark:bg-[#0f172a] rounded-[2.5rem] border border-slate-200/60 dark:border-white/5 shadow-sm overflow-hidden transition-all duration-500">
              <JDSectionHeader
                title={titleStr}
                icon={AlignLeft}
                itemCount={Array.isArray(unwrapped) ? unwrapped.length : undefined}
                canEdit={false}
                csodOnlyMode={csodOnlyMode}
                csodPushed={resolvePushToCsod(jd, sectionTitle, sectionContent)}
                onToggleCSOD={canManageCsodMetadata ? () => handleToggleCSOD(sectionTitle, sectionContent) : null}
                hasSectionLock={!csodOnlyMode}
                sectionLocked={isLocked}
                onToggleSectionLock={!csodOnlyMode ? () => handleToggleLock(sectionLockKey, isLocked ? 'locked' : 'unlocked') : undefined}
                hasWeights={!csodOnlyMode && hasWeights}
                weightLocked={isWeightLocked}
                onToggleWeightLock={!csodOnlyMode && hasWeights ? () => handleToggleLock(sectionWeightLockKey, isWeightLocked ? 'locked' : 'unlocked') : undefined}
              />
              {!isLocked && (
                <div className="p-8 pt-2">
                  {canEdit && !isEditingThis && (
                    <div className="flex justify-end mb-4">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSection(sectionTitle);
                          const normalized = weighted ? normalizeForWeightedList(unwrapped) : unwrapped;
                          setEditBuffer(JSON.parse(JSON.stringify(normalized)));
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors shadow-sm"
                      >
                        <Edit3 size={12} /> Edit Section
                      </button>
                    </div>
                  )}

                  {isEditingThis ? (
                    <div className="space-y-4 pt-2">
                      {(() => {
                        const fType = getSectionFieldType(sectionTitle);
                        const placeholderText = getSectionPlaceholder(sectionTitle);
                        const options = getSectionOptions(sectionTitle);

                        if (fType === "TextBox") {
                          return (
                            <input
                              type="text"
                              value={editBuffer || ""}
                              onChange={(e) => setEditBuffer(e.target.value)}
                              className="w-full px-5 py-3.5 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/5 rounded-2xl text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                              placeholder={placeholderText}
                            />
                          );
                        }
                        if (fType === "DateTime") {
                          return (
                            <input
                              type="datetime-local"
                              value={editBuffer || ""}
                              onChange={(e) => setEditBuffer(e.target.value)}
                              className="w-full px-5 py-3.5 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/5 rounded-2xl text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                            />
                          );
                        }
                        if (fType === "Dropdown") {
                          return (
                            <select
                              value={editBuffer || ""}
                              onChange={(e) => setEditBuffer(e.target.value)}
                              className="w-full px-5 py-3.5 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/5 rounded-2xl text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
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
                            <div className="space-y-2.5 p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-150 dark:border-white/5 rounded-2xl">
                              {options.map((opt) => (
                                <label key={opt} className="flex items-center gap-3 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={sectionTitle}
                                    value={opt}
                                    checked={editBuffer === opt}
                                    onChange={(e) => setEditBuffer(e.target.value)}
                                    className="w-4 h-4 text-indigo-600 border-slate-350 focus:ring-indigo-500"
                                  />
                                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{opt}</span>
                                </label>
                              ))}
                            </div>
                          );
                        }
                        if (fType === "Checkbox") {
                          return (
                            <div className="space-y-2.5 p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-150 dark:border-white/5 rounded-2xl">
                              {options.map((opt) => {
                                const isChecked = Array.isArray(editBuffer) && editBuffer.includes(opt);
                                return (
                                  <label key={opt} className="flex items-center gap-3 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      value={opt}
                                      checked={isChecked}
                                      onChange={(e) => {
                                        const current = Array.isArray(editBuffer) ? editBuffer : [];
                                        const next = e.target.checked
                                          ? [...current, opt]
                                          : current.filter(item => item !== opt);
                                        setEditBuffer(next);
                                      }}
                                      className="w-4 h-4 text-indigo-600 rounded border-slate-350 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{opt}</span>
                                  </label>
                                );
                              })}
                            </div>
                          );
                        }
                        if (Array.isArray(editBuffer) || fType === "Weights") {
                          return (
                            <div className="space-y-3">
                              {(Array.isArray(editBuffer) ? editBuffer : []).map((item, idx) => {
                                const isObj = typeof item === 'object' && item !== null;
                                const titleVal = isObj ? (item.title || item.point || item.name || item.text || "") : item;
                                const descVal = isObj ? (item.description || "") : "";
                                const weightVal = isObj ? (item.weight || 0) : undefined;

                                return (
                                  <div key={idx} className="flex gap-4 items-start p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl">
                                    <div className="flex-1 space-y-3">
                                      <input
                                        type="text"
                                        value={titleVal}
                                        onChange={(e) => {
                                          const copy = [...editBuffer];
                                          if (isObj) {
                                            copy[idx] = { ...copy[idx], title: e.target.value };
                                          } else {
                                            copy[idx] = e.target.value;
                                          }
                                          setEditBuffer(copy);
                                        }}
                                        className="w-full px-4 py-2 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/5 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100"
                                        placeholder="Item text"
                                      />
                                      {isObj && (
                                        <textarea
                                          value={descVal}
                                          onChange={(e) => {
                                            const copy = [...editBuffer];
                                            copy[idx] = { ...copy[idx], description: e.target.value };
                                            setEditBuffer(copy);
                                          }}
                                          className="w-full px-4 py-2 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/5 rounded-xl text-xs text-slate-600 dark:text-slate-300 resize-none h-16"
                                          placeholder="Description (optional)"
                                        />
                                      )}
                                    </div>
                                    {isObj && weightVal !== undefined && (
                                      <div className="w-20 shrink-0">
                                        <input
                                          type="number"
                                          value={weightVal}
                                          onChange={(e) => {
                                            const copy = [...editBuffer];
                                            copy[idx] = { ...copy[idx], weight: parseInt(e.target.value) || 0 };
                                            setEditBuffer(copy);
                                          }}
                                          className="w-full px-3 py-2 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/5 rounded-xl text-xs font-bold text-center"
                                          placeholder="Weight"
                                        />
                                      </div>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditBuffer(editBuffer.filter((_, i) => i !== idx));
                                      }}
                                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-colors shrink-0"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                );
                              })}

                              <button
                                type="button"
                                onClick={() => {
                                  const hasObj = Array.isArray(editBuffer) && editBuffer.some(item => typeof item === 'object' && item !== null);
                                  const newItem = hasObj ? { title: "", description: "", weight: 0 } : "";
                                  setEditBuffer([...(Array.isArray(editBuffer) ? editBuffer : []), newItem]);
                                }}
                                className="w-full py-3 bg-white dark:bg-[#0f172a] border border-dashed border-slate-200 dark:border-white/10 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-all"
                              >
                                <Plus size={14} /> Add Item
                              </button>
                            </div>
                          );
                        }
                        if (typeof editBuffer === 'object' && editBuffer !== null) {
                          return (
                            <div className="grid grid-cols-1 gap-4">
                              {Object.entries(editBuffer).map(([k, v]) => (
                                <div key={k} className="flex gap-4 items-center">
                                  <div className="w-1/3 text-xs font-bold text-slate-500 uppercase tracking-wider">{k}</div>
                                  <input
                                    type="text"
                                    value={typeof v === 'object' ? JSON.stringify(v) : v}
                                    onChange={(e) => {
                                      setEditBuffer({ ...editBuffer, [k]: e.target.value });
                                    }}
                                    className="flex-1 px-4 py-2 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/5 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100"
                                  />
                                </div>
                              ))}
                            </div>
                          );
                        }
                        
                        return (
                          <textarea
                            value={editBuffer || ""}
                            onChange={(e) => setEditBuffer(e.target.value)}
                            className="w-full px-5 py-4 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/5 rounded-2xl text-sm text-slate-700 dark:text-slate-300 font-medium resize-none h-40 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                            placeholder={placeholderText}
                          />
                        );
                      })()}

                      <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-white/5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSection(null);
                            setEditBuffer(null);
                          }}
                          className="px-4 py-2 bg-white dark:bg-transparent border border-slate-200 dark:border-white/10 rounded-xl text-xs font-black uppercase tracking-wider text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveSection(sectionTitle)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-indigo-500/25 transition-all flex items-center gap-1.5"
                        >
                          <Save size={12} /> Save Section
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {Array.isArray(unwrapped) ? (
                        <div className="space-y-4">
                          {(weighted ? normalizeForWeightedList(unwrapped) : unwrapped).map((item, i) => {
                            const isObj = typeof item === 'object' && item !== null;
                            const title = isObj ? (item.point || item.title || item.name || item.text || "") : item;
                            const desc = isObj ? item.description : "";
                            const weight = isObj ? item.weight : undefined;

                            return (
                              <div key={i} className="flex gap-4 items-center p-4 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-100 dark:border-white/5 transition-all hover:bg-slate-100 dark:hover:bg-white/[0.04] justify-between">
                                <div className="flex gap-4 items-start flex-1">
                                  <div className="w-8 h-8 rounded-xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0 shadow-sm text-[10px] font-black text-indigo-500 mt-0.5">
                                    {String(i + 1).padStart(2, '0')}
                                  </div>
                                  <div className="space-y-2 flex-1">
                                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 tracking-tight uppercase">
                                      {title}
                                    </h4>
                                    {desc && (
                                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed italic">
                                        {desc}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                {!isWeightLocked && weight !== undefined && (
                                  <div className="w-16 shrink-0 flex flex-col items-center border-l border-slate-200 dark:border-white/10 pl-4 text-right">
                                    <span className="text-sm font-black text-indigo-500 leading-none">{weight}%</span>
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Weight</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : typeof unwrapped === 'object' && unwrapped !== null ? (
                        <div className="grid grid-cols-1 gap-4">
                          {Object.entries(unwrapped).map(([k, v]) => (
                            <div key={k} className="p-4 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-100 dark:border-white/5 flex flex-col justify-center">
                              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{k}</p>
                              <p className="text-sm font-black text-slate-800 dark:text-slate-200">{typeof v === 'object' ? JSON.stringify(v) : v}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-slate-50/50 dark:bg-white/5 rounded-[2rem] p-6 border border-slate-100 dark:border-white/5">
                          <div className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                            {unwrapped}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </section>
          );
        });
      })()}

      {canEdit && (
        <>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="w-full py-5 bg-slate-50 dark:bg-white/[0.02] border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[2.5rem] flex items-center justify-center gap-3 text-sm font-black uppercase tracking-wider text-slate-400 hover:text-indigo-600 hover:border-indigo-500 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/10 transition-all duration-300 group shadow-sm"
          >
            <Plus size={18} className="group-hover:scale-110 transition-transform" />
            Add Custom Section / Field
          </button>

          <ConfigureCustomFieldModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSave={handleAddField}
          />
        </>
      )}
    </>
  );
};

export default function JDDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    allJDs,
    submitJD,
    user: currentUser,
    normalizeJD,
    getWorkflowStatus,
    getJDHistory,
    refreshMyJDs
  } = useContext(JDContext);

  const getDashboardPath = () => {
    const role = currentUser?.role?.toLowerCase() || "";
    if (role.includes("admin")) return "/admin/dashboard";
    if (role.includes("manager")) return "/manager/dashboard";
    return "/hr/dashboard";
  };

  const [fullDetails, setFullDetails] = useState(null);
  const [selectedVersionId, setSelectedVersionId] = useState(null);
  const [fetchedVersionDetails, setFetchedVersionDetails] = useState(null);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [isVersionLoading, setIsVersionLoading] = useState(false);
  const [workflowRunDetails, setWorkflowRunDetails] = useState(null);
  const [jdHistoryData, setJdHistoryData] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [candidateUsers, setCandidateUsers] = useState([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [selectedCandidateEmails, setSelectedCandidateEmails] = useState([]);
  const [alreadyAssignedEmails, setAlreadyAssignedEmails] = useState([]);
  const [showUserSelectionPanel, setShowUserSelectionPanel] = useState(false);
  const [isMakeLiveChecked, setIsMakeLiveChecked] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    if (showAssignModal) {
      const fetchCandidates = async () => {
        setIsLoadingCandidates(true);
        try {
          const data = await orgService.listCandidateUsers();
          const candidates = Array.isArray(data) ? data : (data?.candidates || data?.users || data?.results || data?.data || []);
          setCandidateUsers(candidates);

          const assignmentsRes = await orgService.getAllAssignments();
          const allAssignments = Array.isArray(assignmentsRes) ? assignmentsRes : (assignmentsRes?.assignments || []);

          const assignedEmails = allAssignments.filter(a => {
            const aJdId = a.original_jd_id || a.jd_id || a.job_description_id || a.jd;
            const jdMatch = aJdId
              ? String(aJdId) === String(id)
              : a.jd_title === fullDetails?.title;
            return jdMatch;
          }).map(a => (a.candidate_email || a.email || "").toLowerCase());

          setAlreadyAssignedEmails(assignedEmails);
        } catch (error) {
          console.error("[JDDetail] Failed to fetch candidate users:", error);
        } finally {
          setIsLoadingCandidates(false);
        }
      };
      fetchCandidates();
    } else {
      setSelectedCandidateEmails([]);
      setCandidateUsers([]);
      setAlreadyAssignedEmails([]);
    }
  }, [showAssignModal, id, fullDetails?.title]);

  const handleAssignJD = async (emails, dueDate) => {
    if (!emails || emails.length === 0) {
      toast.error("Please select at least one candidate email");
      return;
    }
    if (!dueDate) {
      toast.error("Please select a due date");
      return;
    }

    setIsAssigning(true);
    try {
      const assignmentsRes = await orgService.getAllAssignments();
      const allAssignments = Array.isArray(assignmentsRes) ? assignmentsRes : (assignmentsRes?.assignments || []);

      const alreadyAssigned = allAssignments.filter(a => {
        const aJdId = a.original_jd_id || a.jd_id || a.job_description_id || a.jd;
        const jdMatch = aJdId
          ? String(aJdId) === String(id)
          : a.jd_title === fullDetails?.title;

        return jdMatch && emails.some(email =>
          email.toLowerCase() === (a.candidate_email || a.email || "").toLowerCase()
        );
      });

      if (alreadyAssigned.length > 0) {
        const conflictEmails = alreadyAssigned.map(a => a.candidate_email).join(', ');
        toast.error(`JD already assigned to: ${conflictEmails}.`);
        setIsAssigning(false);
        return;
      }

      const payload = {
        jd_id: id,
        data: emails.map(email => ({
          email: email,
          due_date: new Date(dueDate).toISOString()
        }))
      };
      await orgService.bulkAssignJD(payload);
      toast.success(`JD assigned successfully!`, { icon: '🤝' });
      setShowAssignModal(false);
    } catch (error) {
      console.error("Failed to assign JD:", error);
      toast.error(error.message || "Failed to assign JD");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleMakeJobLive = async () => {
    if (!id || !isMakeLiveChecked) return;
    setIsPublishing(true);
    try {
      await jdService.updateJDStatus(id, "public_view");
      toast.success("Job description is now live!");
      setIsMakeLiveChecked(false);
      if (refreshMyJDs) {
        await refreshMyJDs();
      }
      const jdVal = await jdService.getJDById(id);
      if (jdVal) {
        setFullDetails(jdVal);
        const initialStatus = jdVal?.status?.toLowerCase() || "";
        const isRawDraft = ['draft', 'created'].includes(initialStatus);
        if (!isRawDraft) {
          const wfState = await getWorkflowStatus(id);
          if (wfState) {
            setWorkflowRunDetails(wfState);
          }
        }
      }
    } catch (error) {
      console.error("Failed to make job live:", error);
      toast.error(error.message || "Failed to make job live.");
    } finally {
      setIsPublishing(false);
    }
  };

  const [availableWorkflows, setAvailableWorkflows] = useState([]);

  useEffect(() => {
    // Auto-select user's version on initial load
    if (fullDetails?.version_history && selectedVersionId === null) {
      const myVersion = fullDetails.version_history.find(v => v.user_id === (currentUser?.userId || currentUser?.id));
      if (myVersion) {
        setSelectedVersionId(myVersion.jd_id);
      } else {
        // Handle delegate edge case: If URL param 'id' is a known version, use it.
        const urlVersion = fullDetails.version_history.find(v => v.jd_id === id);
        if (urlVersion) {
          setSelectedVersionId(urlVersion.jd_id);
        } else {
          setSelectedVersionId(fullDetails.id || id);
        }
      }
    }
  }, [fullDetails, currentUser, selectedVersionId, id]);

  useEffect(() => {
    const fetchVersionData = async () => {
      if (!selectedVersionId || selectedVersionId === fullDetails?.id || selectedVersionId === id) {
        setFetchedVersionDetails(null);
        return;
      }
      setIsVersionLoading(true);
      try {
        const jdVal = await jdService.getJDById(selectedVersionId);
        setFetchedVersionDetails(jdVal);
      } catch (error) {
        console.error("Failed to fetch version details:", error);
      } finally {
        setIsVersionLoading(false);
      }
    };
    fetchVersionData();
  }, [selectedVersionId, fullDetails?.id, id]);

  useEffect(() => {
    const fetchFullData = async () => {
      if (!id) return;
      setIsLoadingDetails(true);
      try {
        const jdVal = await jdService.getJDById(id);
        if (jdVal) {
          setFullDetails(jdVal);

          // Only query workflow run details if the JD is not a raw draft / newly created state
          const initialStatus = jdVal?.status?.toLowerCase() || "";
          const isRawDraft = ['draft', 'created'].includes(initialStatus);

          if (!isRawDraft) {
            const wfState = await getWorkflowStatus(id);
            if (wfState) {
              setWorkflowRunDetails(wfState);
            }
          } else {
            setWorkflowRunDetails(null);
          }
        }
      } catch (error) {
        console.error("Failed to fetch full JD details:", error);
      } finally {
        setIsLoadingDetails(false);
      }
    };
    fetchFullData();

    // Fetch workflows
    const fetchWorkflows = async () => {
      try {
        const data = await workflowService.listWorkflows();
        const workflowsArray = Array.isArray(data) ? data : (data?.workflows || []);
        setAvailableWorkflows(workflowsArray);
      } catch (err) {
        console.error("Failed to fetch workflows", err);
      }
    };
    fetchWorkflows();
  }, [id, getWorkflowStatus]);

  const handleToggleLock = async (field, currentVal) => {
    const newVal = currentVal === "locked" ? "unlocked" : "locked";
    const viewMatch = /^section_(\d+)_view$/.exec(field);

    setFullDetails(prev => {
      const updated = { ...prev };
      if (viewMatch) {
        const baseKey = `section_${viewMatch[1]}`;
        const nextContent = { ...(updated.content || {}) };
        if (nextContent[baseKey] && typeof nextContent[baseKey] === "object") {
          nextContent[baseKey] = {
            ...nextContent[baseKey],
            metadata: { ...(nextContent[baseKey].metadata || {}), view: newVal },
          };
        }
        delete nextContent[field];
        updated.content = nextContent;
      } else {
        updated[field] = newVal;
        if (updated.content) {
          updated.content = { ...updated.content, [field]: newVal };
        }
      }
      return updated;
    });

    try {
      await jdService.updateSection(id, field, newVal);
      toast.success(`Section visibility updated.`);
    } catch (error) {
      console.error(`Failed to update ${field}:`, error);
      toast.error(`Failed to update section visibility.`);
      setFullDetails(prev => {
        const reverted = { ...prev };
        reverted[field] = currentVal;
        if (reverted.content) reverted.content = { ...reverted.content, [field]: currentVal };
        return reverted;
      });
    }
  };

  const handleToggleCSOD = async (sectionKey, sectionObj) => {
    const base = fullDetails || jd;
    const existing = base?.content?.[sectionKey] ?? sectionObj ?? resolveSectionObject(base, sectionKey);
    const currentCSOD = resolvePushToCsod(base, sectionKey, existing);
    const nextCSOD = !currentCSOD;

    const buildUpdated = (prev, pushed) => {
      const updated = { ...prev };
      const nextContent = { ...(updated.content || {}) };
      const sec = nextContent[sectionKey] ?? existing;

      if (sec && typeof sec === 'object' && !Array.isArray(sec)) {
        nextContent[sectionKey] = {
          ...sec,
          metadata: { ...(sec.metadata || {}), push_to_csod: pushed },
        };
      }

      const currentMeta = updated.sections_metadata || {};
      updated.sections_metadata = {
        ...currentMeta,
        [sectionKey]: { ...(currentMeta[sectionKey] || {}), push_to_csod: pushed },
      };
      updated.content = nextContent;
      return updated;
    };

    setFullDetails((prev) => buildUpdated(prev || base, nextCSOD));

    try {
      if (isStableSection(existing)) {
        await jdService.updateSection(id, sectionKey, {
          ...existing,
          metadata: { ...(existing.metadata || {}), push_to_csod: nextCSOD },
        });
      } else {
        const nextMeta = {
          ...(base.sections_metadata || {}),
          [sectionKey]: { ...((base.sections_metadata || {})[sectionKey] || {}), push_to_csod: nextCSOD },
        };
        await jdService.updateSection(id, 'sections_metadata', nextMeta);
      }
      toast.success(nextCSOD ? 'Section included in CSOD push' : 'Section excluded from CSOD push');
    } catch (error) {
      console.error('Failed to update CSOD metadata:', error);
      toast.error('Failed to update CSOD metadata');
      setFullDetails((prev) => buildUpdated(prev || base, currentCSOD));
    }
  };

  const [isMerging, setIsMerging] = useState(false);

  const handleMergeVersion = () => {
    if (!fetchedVersionDetails || !fullDetails) return;
    setShowMergeModal(true);
  };

  const executeMerge = async () => {
    setShowMergeModal(false);
    setIsMerging(true);
    try {
      const content = fetchedVersionDetails.content || fetchedVersionDetails || {};
      const masterId = fullDetails.id;

      const formatList = (list) => {
        if (!Array.isArray(list)) return list;
        return list.map(item => ({
          point: item.title || item.point || item.duty || (typeof item === 'string' ? item : ""),
          weight: parseInt(item.weight) || 0
        }));
      };

      const flatPayload = {
        summary: content.summary,
        essential_duties_and_responsibilities: content.essential_duties_and_responsibilities,
        key_duties: formatList(content.key_duties || content.responsibilities),
        core_competencies: formatList(content.core_competencies || content.coreCompetencies),
        functional_competencies: formatList(content.functional_competencies || content.functionalCompetencies),
        qualifications_required: formatList(content.qualifications_required || content.qualifications?.required),
        qualifications_preferred: formatList(content.qualifications_preferred || content.qualifications?.preferred),
        eeo_statement: content.eeo_statement,
        title: fetchedVersionDetails.title || fetchedVersionDetails.content?.title || fullDetails.title
      };

      await jdService.autosaveJD(masterId, flatPayload);

      toast.success("Successfully merged version into Master!");

      const updated = await jdService.getJDById(masterId);
      if (updated) setFullDetails(updated);
      setSelectedVersionId(masterId);

    } catch (error) {
      console.error("Failed to merge version:", error);
      toast.error("Failed to merge version into Master.");
    } finally {
      setIsMerging(false);
    }
  };

  // Find in context first, then handle status-based visibility
  const rawJd = useMemo(() => {
    let base = fullDetails || allJDs.find(j => j.id === id) || mockHRJDs.find(j => j.id === id);
    if (!base) return null;

    if (selectedVersionId && selectedVersionId !== base.id && fetchedVersionDetails) {
      return {
        ...fetchedVersionDetails,
        version_history: base.version_history // ensure dropdown has access to all versions
      };
    }
    return base;
  }, [fullDetails, allJDs, mockHRJDs, id, selectedVersionId, fetchedVersionDetails]);

  const jd = useMemo(() => {
    if (!rawJd) return null;

    // Normalize raw data first
    const normalizedBase = normalizeJD(rawJd);

    // Merge everything through a unified structure
    const merged = {
      ...normalizedBase,
      ...workflowRunDetails, // Unified structure from backend
      // Priority for direct workflow run data for status, unless database status is terminal/live/archived
      status: ['public_view', 'published', 'archived', 'archive'].includes(normalizedBase.status?.toLowerCase())
        ? normalizedBase.status
        : (workflowRunDetails?.status || normalizedBase.status),
    };

    const canEditRole = currentUser?.role?.toLowerCase().includes('manager');
    const isOwner = merged.createdBy === currentUser?.userId || merged.creator_id === currentUser?.userId;

    // Final check: if user is creator but NOT manager, they see it read-only
    // but if user is manager, they can edit.
    merged.canEdit = canEditRole;

    // Merging additional audit history if available directly in the wf run
    if (workflowRunDetails?.audit_history && Array.isArray(workflowRunDetails.audit_history)) {
      merged.history = [...merged.history, ...workflowRunDetails.audit_history];
    }

    // Pass the merged object back through normalizeJD to deduplicate and cross-pollinate comments
    return normalizeJD(merged);
  }, [rawJd, workflowRunDetails, normalizeJD, currentUser]);

  const canEdit = jd?.canEdit || currentUser?.role?.toLowerCase().includes('manager');
  const isApproved = ['approved', 'completed'].includes(jd?.status?.toLowerCase());
  const isDraft = ['draft', 'created'].includes(jd?.status?.toLowerCase());
  const isFinalized = ['finalized', 'final'].includes(jd?.status?.toLowerCase());
  const isCompleted = ['completed', 'approved'].includes(jd?.status?.toLowerCase());
  const isRejected = ['rejected', 'revision requested', 'returned', 'declined', 'returned_to_initiator'].includes(jd?.status?.toLowerCase());
  const isPending = ['submitted', 'pending approval', 'waiting_for_approval', 'in_review', 'under_review', 'active'].includes(jd?.status?.toLowerCase()) || jd?.status?.startsWith('Review Step');
  const isPublished = ['published', 'public_view'].includes(jd?.status?.toLowerCase()) || !!jd?.public_jd_id || !!jd?.content?.public_jd_id || !!rawJd?.public_jd_id;
  const csodOnlyMode = isApproved || isPublished;
  const canManageCsodMetadata = csodOnlyMode && currentUser?.role?.toLowerCase().includes('admin');

  const handleSubmit = async () => {
    setShowWorkflowModal(true);
  };

  const handleWorkflowConfirm = async (workflowId) => {
    try {
      await workflowService.triggerWorkflow(id, workflowId);
      toast.success("Workflow initiated successfully!");
      setShowWorkflowModal(false);
      const role = currentUser?.role?.toLowerCase() || "";
      if (role.includes("admin")) {
        navigate('/admin/my-jds');
      } else {
        navigate(getDashboardPath());
      }
    } catch (e) {
      console.error("Workflow trigger failed:", e);
      toast.error("Failed to initiate workflow review.");
    }
  };

  // Refined salary logic to prefer structured range over "TBD"
  const salaryRange = useMemo(() => {
    if (!jd) return "TBD";
    const content = jd.content || jd;
    if (jd.salary_range || jd.salary_range_formatted || content.salary_range_formatted) {
      return jd.salary_range || jd.salary_range_formatted || content.salary_range_formatted;
    }
    if (jd.salary || jd.salaryRange || content.salary) {
      return extractText(jd.salary || jd.salaryRange || content.salary);
    }
    if (jd.salary_min_value || content.salary_min_value) {
      return formatSalaryRange(
        jd.salary_min_value || content.salary_min_value,
        jd.salary_max_value || content.salary_max_value,
        jd.salary_symbol || content.salary_symbol || "$",
        jd.salary_period || content.salary_period || ""
      );
    }

    return "TBD";
  }, [jd]);

  if (isLoadingDetails && !jd) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-[#020617]">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
          <p className="text-slate-500 font-bold text-sm">Decoding structured schema...</p>
        </div>
      </div>
    );
  }

  if (!jd || (!jd.content && !jd.summary && resolveSectionsOrder(jd).length === 0)) {
    const isNotFound = !jd;
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#020617]">
        <div className="text-center p-12 bg-white dark:bg-[#0f172a] rounded-[3rem] shadow-2xl border border-slate-100 dark:border-white/5">
          <div className="w-20 h-20 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={40} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
            {isNotFound ? "Job Description Not Found" : "Structured Data Not Found"}
          </h2>
          <p className="text-slate-400 mb-8 max-w-md mx-auto">
            {isNotFound
              ? "The requested Job Description could not be found. It may have been deleted, or the ID in the URL is incorrect."
              : "This JD is using an outdated format. Please update it to the new TalentForge schema."}
          </p>
          <button
            onClick={() => {
              const role = currentUser?.role?.toLowerCase() || "";
              if (role.includes("admin")) {
                navigate('/admin/my-jds');
              } else {
                navigate(getDashboardPath());
              }
            }}
            className="px-8 py-3 bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95"
          >
            {currentUser?.role?.toLowerCase().includes("admin") ? "Return to Library" : "Return to Dashboard"}
          </button>
        </div>
      </div>
    );
  }

  const content = jd.content || jd;

  const responsibilities = normalizeComplexList(content.responsibilities || content.key_duties || content.essential_duties_and_responsibilities || jd.responsibilities);
  const coreCompetencies = normalizeComplexList(content.core_competencies || content.coreCompetencies || jd.coreCompetencies);
  const functionalCompetencies = normalizeComplexList(content.functional_competencies || content.functionalCompetencies || jd.functionalCompetencies);
  const requiredQuals = normalizeComplexList(content.qualifications?.required || content.qualifications_required || jd.qualifications_required);
  const preferredQuals = normalizeComplexList(content.qualifications?.preferred || content.qualifications_preferred || jd.qualifications_preferred);
  const skills = normalizeList(content.skills || jd.skills);
  const tools = normalizeList(content.tools || jd.tools);
  const benefits = normalizeList(content.benefits || jd.benefits);
  const history = (jd.history && jd.history.length > 0) ? jd.history : [];
  const comments = (jd.comments && jd.comments.length > 0) ? jd.comments : [];
  const experience = extractText(content.experience || jd.experience || "");
  const eeo = extractText(content.eeo_statement || content.eeo || "");

  const salary = salaryRange;

  const config = getStatusConfig(isPublished ? 'published' : jd.status);

  const formatJdToHtml = (contentObj, maxChars = 3990) => {
    let currentLength = 0;
    const htmlParts = [];

    const addSection = (title, text) => {
      if (!text || currentLength >= maxChars) return;
      if (Array.isArray(text) && text.length === 0) return;
      if (typeof text === 'string' && !text.trim()) return;

      const overhead = title.length + 50;
      let remainingBudget = maxChars - currentLength - overhead;

      if (remainingBudget <= 0) return;

      const sectionHtml = [`<b>${title.toUpperCase()}</b><br/>`];

      if (Array.isArray(text)) {
        sectionHtml.push("<ul>");
        for (const item of text) {
          const point = (typeof item === 'object' && item !== null) ? (item.point || item.title || item.duty || "") : item;
          if (point) {
            const cleanPoint = stripHighlightTags(String(point)).substring(0, remainingBudget);
            sectionHtml.push(`<li>${cleanPoint}</li>`);
            remainingBudget -= cleanPoint.length + 10;
          }
        }
        sectionHtml.push("</ul>");
      } else {
        const paragraphs = String(text).split("\n");
        for (const p of paragraphs) {
          if (p.trim() && remainingBudget > 0) {
            const cleanP = stripHighlightTags(p.trim()).substring(0, remainingBudget);
            sectionHtml.push(`<p>${cleanP}</p>`);
            remainingBudget -= cleanP.length + 7;
          }
        }
      }

      sectionHtml.push("<br/>");
      const sectionStr = sectionHtml.join("");
      htmlParts.push(sectionStr);
      currentLength += sectionStr.length;
    };

    addSection("Summary", contentObj.summary);
    addSection("Duties and Responsibilities", contentObj.essential_duties_and_responsibilities);
    addSection("Key Responsibilities", contentObj.key_duties);
    addSection("Core Competencies", contentObj.core_competencies);
    addSection("Functional Competencies", contentObj.functional_competencies);
    addSection("Required Qualifications", contentObj.qualifications_required);
    addSection("Preferred Qualifications", contentObj.qualifications_preferred);
    addSection("EEO Statement", contentObj.eeo_statement);

    return htmlParts.join("");
  };

  const totalJdChars = (() => {
    if (!jd) return 0;

    const liveContentObj = {
      summary: content.summary || "",
      essential_duties_and_responsibilities: content.essential_duties_and_responsibilities || "",
      key_duties: responsibilities || [],
      core_competencies: coreCompetencies || [],
      functional_competencies: functionalCompetencies || [],
      qualifications_required: requiredQuals || [],
      qualifications_preferred: preferredQuals || [],
      eeo_statement: eeo || ""
    };

    return formatJdToHtml(liveContentObj).length;
  })();

  if (isCompareMode) {
    return (
      <div className="h-screen bg-[#f8fafc] dark:bg-[#020617] font-sans selection:bg-indigo-500/30 p-8 overflow-hidden">
        <div className="max-w-[1720px] mx-auto h-full">
          <VersionCompareView
            jd={fullDetails}
            versionHistory={fullDetails?.version_history || []}
            onClose={() => {
              setIsCompareMode(false);
              const fetchFullData = async () => {
                try {
                  const updated = await jdService.getJDById(id);
                  if (updated) setFullDetails(updated);
                } catch (e) {
                  console.error(e);
                }
              };
              fetchFullData();
            }}
            onRestore={async (vId) => {
              const vData = await jdService.getJDById(vId);
              if (!vData) return;
              const content = vData.content || vData || {};
              const formatList = (list) => {
                if (!Array.isArray(list)) return list;
                return list.map(item => ({
                  point: item.title || item.point || item.duty || (typeof item === 'string' ? item : ""),
                  weight: parseInt(item.weight) || 0
                }));
              };
              const flatPayload = {
                summary: content.summary,
                essential_duties_and_responsibilities: content.essential_duties_and_responsibilities,
                key_duties: formatList(content.key_duties || content.responsibilities),
                core_competencies: formatList(content.core_competencies || content.coreCompetencies),
                functional_competencies: formatList(content.functional_competencies || content.functionalCompetencies),
                qualifications_required: formatList(content.qualifications_required || content.qualifications?.required),
                qualifications_preferred: formatList(content.qualifications_preferred || content.qualifications_preferred || content.qualifications?.preferred),
                eeo_statement: content.eeo_statement,
                title: vData.title || vData.content?.title || fullDetails.title
              };
              await jdService.autosaveJD(fullDetails.id, flatPayload);
              toast.success("Successfully restored version to Master!");
              const updated = await jdService.getJDById(fullDetails.id);
              if (updated) setFullDetails(updated);
              setIsCompareMode(false);
            }}
            currentUser={currentUser}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] font-sans selection:bg-indigo-500/30 pb-20">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

        {/* Modern Navigation Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              const role = currentUser?.role?.toLowerCase() || "";
              if (role.includes("admin")) {
                navigate('/admin/my-jds');
              } else {
                navigate(getDashboardPath());
              }
            }}
            className="group flex items-center gap-4 text-slate-900 dark:text-white font-black text-xs uppercase tracking-[0.25em] hover:text-indigo-500 transition-colors"
          >
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200/60 dark:border-white/5 flex items-center justify-center shadow-sm group-hover:shadow-md transition-all group-hover:border-indigo-500/30">
              <ArrowLeft size={20} strokeWidth={3} className="group-hover:-translate-x-1 transition-transform" />
            </div>
            {currentUser?.role?.toLowerCase().includes("admin") ? "Back to Library" : "Back to Dashboard"}
          </button>

          <div className="flex items-center gap-3">
            {jd?.word_count && (
              <div className={`h-12 flex items-center gap-2 px-6 bg-white dark:bg-[#0f172a] border-2 ${jd.word_count > 3990 ? 'border-rose-500/50 bg-rose-50/50 dark:bg-rose-950/20 shadow-lg shadow-rose-500/10' : 'border-slate-200/60 dark:border-white/5 shadow-sm'} rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300`}>
                <Type size={16} className={jd.word_count > 3990 ? "text-rose-500 animate-pulse" : "text-indigo-500"} />
                <span className={jd.word_count > 3990 ? "text-rose-600 dark:text-rose-400" : "text-slate-400 dark:text-slate-300"}>TOTAL CHARACTERS:</span>
                <span className={`ml-1 italic font-mono text-xs ${jd.word_count > 3990 ? "text-rose-600 dark:text-rose-400" : "text-indigo-500"}`}>{jd.word_count} / 3990</span>
              </div>
            )}
            <div className="h-12 flex items-center gap-2 px-6 bg-white dark:bg-[#0f172a] border border-slate-200/60 dark:border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-300 shadow-sm border-dashed">
              <ShieldCheck size={16} /> COMPLIANCE CLEARANCE: <span className="text-emerald-500 ml-1 italic">ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Slim Sticky Floating Warning Banner */}
        {jd?.word_count > 3990 && (
          <div className="sticky top-4 z-50 bg-red-50 dark:bg-rose-950/90 border-2 border-red-200 dark:border-rose-800 rounded-2xl p-4 shadow-xl shadow-red-500/10 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500 mb-6">
            <div className="flex items-center gap-3 min-w-0">
              <AlertCircle className="w-6 h-6 shrink-0 text-red-600 dark:text-rose-400 animate-bounce" />
              <span className="text-red-800 dark:text-rose-200 text-sm font-bold truncate sm:overflow-visible sm:whitespace-normal">
                Warning: Job Description exceeds the limit by <span className="font-black bg-rose-200 dark:bg-rose-800 px-2 py-0.5 rounded-lg text-rose-900 dark:text-rose-100">{jd.word_count - 3990} extra characters</span>. Please reduce text for CSOD posting.
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-12 gap-8 items-start">

          {/* ─── MAIN CONTENT ─── */}
          <div className="col-span-12 lg:col-span-8 space-y-8">

            {/* High-Fidelity Header Card */}
            <div className="bg-white dark:bg-[#0f172a] rounded-[3rem] p-12 border border-slate-200/60 dark:border-white/5 shadow-sm relative overflow-hidden group">
              <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none transition-transform duration-1000" />
              <div className="relative z-10 space-y-8">
                <div className="flex justify-between items-start">
                  <StatusBadge status={isPublished ? 'published' : jd.status} />
                  {jd.version_history && jd.version_history.length > 0 && (
                    <div className="relative flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Version:</span>
                      <div className="relative">
                        <select
                          value={selectedVersionId || fullDetails?.id || id}
                          onChange={(e) => setSelectedVersionId(e.target.value)}
                          className="appearance-none bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 pr-10 text-sm font-bold text-slate-700 dark:text-white cursor-pointer outline-none focus:border-indigo-500 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-white/5"
                        >
                          <option value={fullDetails?.id || id}>Master (Current)</option>
                          {jd.version_history.map((v, idx) => (
                            <option key={v.jd_id} value={v.jd_id}>
                              Version {v.version || idx + 1}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>

                      <button
                        onClick={() => setIsCompareMode(true)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                      >
                        <GitCompare className="w-4 h-4" /> Compare Versions
                      </button>

                      {selectedVersionId && selectedVersionId !== fullDetails?.id && selectedVersionId !== id && currentUser?.role?.toLowerCase().includes("admin") && (
                        <button
                          onClick={handleMergeVersion}
                          disabled={isMerging}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                        >
                          {isMerging ? "Merging..." : "Merge to Master"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-6">
                  <h1 className="text-5xl sm:text-6xl font-black text-slate-900 dark:text-white tracking-tighter leading-[0.9]">
                    {canEdit ? (
                      <div className="group relative">
                        <input
                          type="text"
                          value={jd.title}
                          onChange={(e) => setFullDetails(prev => ({ ...prev, title: e.target.value }))}
                          className="bg-transparent border-none outline-none w-full text-inherit font-inherit tracking-inherit leading-inherit border-b-2 border-transparent hover:border-slate-200 focus:border-indigo-500 transition-all"
                        />
                        <Edit3 className="absolute -right-8 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ) : stripHighlightTags(extractText(jd.title))}
                  </h1>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    <StaticDisplay label="Job ID" value={jd.job_id || jd.jobId} />
                    <StaticDisplay label="Department" value={jd.department} />
                    <StaticDisplay label="Job Family" value={jd.job_family || jd.jobFamily} />
                    <StaticDisplay label="Industry" value={jd.industry} />
                    <StaticDisplay label="Location" value={jd.location} />
                    <StaticDisplay label="Job Level" value={jd.job_level || jd.jobLevel} />
                    <StaticDisplay label="Seniority" value={jd.seniority} />
                    <StaticDisplay label="Employment" value={jd.employment_type || jd.employmentType} />
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Salary Range</span>
                      <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-white tracking-tight">
                        {jd.salary_range || formatSalaryRange(
                          jd.salary_min_value || content.salary_min_value,
                          jd.salary_max_value || content.salary_max_value,
                          jd.salary_symbol || content.salary_symbol || "$",
                          jd.salary_period || ""
                        )}


                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Sections */}
            {jd.generation_mode === 'saba' ? (
              <div className="space-y-8">
                <SabaJDContent
                  jd={jd}
                  content={content}
                  canEdit={canEdit}
                  setFullDetails={setFullDetails}
                  handleToggleLock={handleToggleLock}
                  csodOnlyMode={csodOnlyMode}
                  canManageCsodMetadata={canManageCsodMetadata}
                  handleToggleCSOD={handleToggleCSOD}
                />
              </div>
            ) : (
              <>
                <div className="space-y-8">
              {(() => {
                const sectionKeys = resolveSectionsOrder(jd).filter((sectionKey) => {
                  if (["basic", "salary", "_section_order", "_source", "sections_order"].includes(String(sectionKey).trim().toLowerCase())) return false;
                  if (String(sectionKey).endsWith("_view") || String(sectionKey).startsWith("weight_view_")) return false;
                  if (String(sectionKey).startsWith("section_") && resolveSectionObject(jd, sectionKey) === undefined) return false;

                  const sectionObj = resolveSectionObject(jd, sectionKey);
                  const isUserCreated = !!(
                    jd?.sections_metadata?.[sectionKey]
                    || jd?.sections_metadata?.labels?.[sectionKey]
                  );
                  if (isUserCreated) return true;

                  const isEmpty = isSectionContentEmpty(sectionObj);
                  if (isEmpty && (jd?.status === 'saba' || jd?.source === 'saba' || jd?._source === 'saba' || jd?.generation_mode === 'saba' || (jd?.industry && jd?.industry.toLowerCase().includes('imported')))) {
                    return false;
                  }
                  return !isEmpty;
                });

                return sectionKeys.map((sectionKey) => {
                  const sectionObj = resolveSectionObject(jd, sectionKey);
                  const meta = resolveSectionMeta(sectionKey, sectionObj, jd?.sections_metadata);
                  const titleStr = meta.label;
                  const sectionContent = unwrapSectionData(sectionObj);
                  const isPoints = meta.type === 'points' || meta.type === 'weighted_list' || Array.isArray(sectionContent);
                  const weighted = isWeightedSectionData(sectionContent, sectionKey, meta);
                  const isLocked = isStableSection(sectionObj)
                    ? sectionObj.metadata?.view === 'locked'
                    : (jd?.[sectionKey + '_view'] === 'locked' || jd?.content?.[sectionKey + '_view'] === 'locked');

                  const isUserCreated = !!(
                    jd?.sections_metadata?.[sectionKey] || jd?.sections_metadata?.labels?.[sectionKey]
                  );
                  if (isSectionContentEmpty(sectionObj) && !isUserCreated) return null;

                  return (
                    <section key={sectionKey} className="bg-white dark:bg-[#0f172a] rounded-[2.5rem] border border-slate-200/60 dark:border-white/5 shadow-sm overflow-hidden transition-all duration-500">
                      <JDSectionHeader
                        title={titleStr}
                        icon={AlignLeft}
                        description=""
                        canEdit={false}
                        csodOnlyMode={csodOnlyMode}
                        csodPushed={resolvePushToCsod(jd, sectionKey, sectionObj)}
                        onToggleCSOD={canManageCsodMetadata ? () => handleToggleCSOD(sectionKey, sectionObj) : null}
                        hasSectionLock={!csodOnlyMode}
                        sectionLocked={isLocked}
                        onToggleSectionLock={!csodOnlyMode ? () => handleToggleLock(sectionKey + '_view', isLocked ? 'unlocked' : 'locked') : undefined}
                      />
                      {!isLocked && (
                        <div className="p-8 pt-2">
                          <div className="bg-slate-50/50 dark:bg-white/5 rounded-[2rem] p-6 border border-slate-100 dark:border-white/5">
                            {isPoints ? (
                              <ul className="space-y-4">
                                {(weighted ? normalizeForWeightedList(sectionContent) : (Array.isArray(sectionContent) ? sectionContent : [])).map((item, i) => {
                                  const pointText = typeof item === 'object'
                                    ? (item.title || item.point || item.duty || item.text || '')
                                    : item;
                                  const description = typeof item === 'object' ? (item.description || '') : '';
                                  const weight = typeof item === 'object' ? item.weight : null;
                                  return (
                                    <li key={i} className="flex gap-4 group justify-between items-start">
                                      <div className="flex gap-4">
                                        <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 mt-0.5">
                                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                        </div>
                                        <div className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-tight">
                                          {renderHighlightedText(pointText)}
                                          {description && <p className="text-xs text-slate-500 mt-1 italic">{renderHighlightedText(description)}</p>}
                                        </div>
                                      </div>
                                      {weight > 0 && (
                                        <span className="px-2 py-0.5 bg-indigo-500 text-white rounded-lg text-[9px] font-semibold uppercase shrink-0 mt-0.5">{weight}%</span>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            ) : (
                              <div className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                                {renderHighlightedText(sectionTextValue(sectionObj))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </section>
                  );
                });
              })()}
              </div>
            </>
            )}
          </div>

          {/* ─── SIDEBAR ─── */}
          <div className="col-span-12 lg:col-span-4 space-y-8 sticky top-10">

            {/* Action Card */}
            <div className="bg-white dark:bg-[#0f172a] rounded-[2.5rem] p-8 border border-slate-200/60 dark:border-white/5 shadow-sm space-y-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-2xl rounded-full" />
              <div className="flex items-center justify-between relative z-10">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Zap className="w-4 h-4 text-indigo-500" /> Pipeline Status
                </h3>
                <div className={`w-2.5 h-2.5 rounded-full ${config.accent} animate-pulse shadow-[0_0_10px_currentColor]`} />
              </div>

              <div className={`p-8 rounded-[2rem] border ${config.bg} ${config.border} flex flex-col items-center text-center gap-5 relative z-10 transition-all duration-500 group-hover:scale-[1.02]`}>
                <div className="w-16 h-16 rounded-3xl bg-white dark:bg-[#020617] flex items-center justify-center border-2 border-white dark:border-white/10 shadow-2xl relative overflow-hidden">
                  <div className={`absolute inset-0 ${config.bg} opacity-20`} />
                  <config.icon size={32} className={`${config.text} relative z-10`} />
                </div>
                <div className="space-y-1">
                  <p className="text-xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                    {isApproved ? 'Approved' : isRejected ? 'Rejected' : isFinalized ? 'Final' : extractText(jd.status)}
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest opacity-60 italic">{config.msg}</p>
                </div>
              </div>

              <div className="space-y-4 relative z-10">
                {(isDraft || isRejected) && (
                  <button
                    onClick={() => {
                      const role = currentUser?.role?.toLowerCase() || "";
                      const path = role.includes("admin") ? "/admin/generate" : "/hr/generate";
                      navigate(`${path}/${jd.id}`, { state: { jd } });
                    }}
                    className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] hover:shadow-2xl hover:shadow-indigo-500/20 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center justify-center gap-3"
                  >
                    <FileEdit size={16} strokeWidth={2.5} /> {isRejected ? "Refine" : "Master Edit Mode"}
                  </button>
                )}
                {(isDraft || isFinalized || isRejected) && !isPending && (
                  <button
                    onClick={handleSubmit}
                    title="Submit for review"
                    className="w-full py-5 bg-white dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] text-slate-900 dark:text-white hover:bg-slate-50 transition-all flex items-center justify-center gap-3 shadow-sm hover:shadow-md active:scale-95"
                  >
                    <Send size={16} className="text-indigo-500" strokeWidth={2.5} /> Submit for Review
                  </button>
                )}
                {isPending && (
                  <div className="w-full py-5 bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 flex items-center justify-center gap-3 italic">
                    <Clock size={16} /> Under Manager Review
                  </div>
                )}
                {(isApproved || isPublished) && (
                  <div className="space-y-4">
                    {isPublished ? (
                      <div className="w-full py-5 bg-blue-500/10 border border-blue-500/20 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] text-blue-600 flex items-center justify-center gap-3">
                        <Zap size={16} /> Job is Already Published
                      </div>
                    ) : (
                      <div className="w-full py-5 bg-emerald-500/10 border border-emerald-500/20 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] text-emerald-600 flex items-center justify-center gap-3">
                        <CheckCircle2 size={16} /> Approved & Ready to Post
                      </div>
                    )}

                    {currentUser?.role?.toLowerCase().includes('admin') && (
                      <>
                        <button
                          onClick={() => setShowAssignModal(true)}
                          className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] hover:shadow-2xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center justify-center gap-3"
                        >
                          <User size={16} strokeWidth={2.5} /> Assign to User
                        </button>

                        {!isPublished && (
                          <div className="space-y-3 mt-4 pt-4 border-t border-slate-100 dark:border-white/5">
                            <label className="flex items-start gap-3 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isMakeLiveChecked}
                                onChange={(e) => setIsMakeLiveChecked(e.target.checked)}
                                className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-white/15 text-indigo-600 focus:ring-indigo-500/30 transition-all cursor-pointer"
                              />
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-normal">
                                I confirm that I want to publish this job description to make it live.
                              </span>
                            </label>
                            <button
                              onClick={handleMakeJobLive}
                              disabled={!isMakeLiveChecked || isPublishing}
                              className={`w-full py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3
                                ${(!isMakeLiveChecked || isPublishing)
                                  ? "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-white/10"
                                  : "bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-2xl hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 cursor-pointer"
                                }
                              `}
                            >
                              {isPublishing ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Zap className="w-4 h-4" />
                              )}
                              Make Job Live
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Collaboration Hub Card */}
            {((comments && comments.length > 0) || isRejected || isApproved) && (
              <div className="bg-white dark:bg-[#0f172a] rounded-[2.5rem] p-8 border border-slate-200/60 dark:border-white/5 shadow-sm space-y-6">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <MessageSquare size={16} className="text-indigo-500" /> Collaboration Hub
                </h3>
                <div className="space-y-4">
                  {comments.map((c, i) => (
                    <div key={i} className="p-5 bg-slate-50 dark:bg-white/[0.03] rounded-3xl border border-slate-100 dark:border-white/5 hover:border-indigo-500/20 transition-all">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-wider">{extractText(c.userName || c.user)}</span>
                        <span className="px-2 py-0.5 bg-indigo-500 text-white rounded-lg text-[8px] font-black uppercase tracking-widest">{extractText(c.role)}</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-bold leading-relaxed mb-2 italic">"{extractText(c.message)}"</p>
                      <p className="text-[9px] text-slate-400 font-medium">{(() => {
                        const d = new Date(c.timestamp);
                        return isNaN(d.getTime()) ? "Recently" : d.toLocaleString();
                      })()}</p>
                    </div>
                  ))}
                  {isApproved && (comments.length === 0) && (
                    <div className="p-6 bg-emerald-500/5 rounded-3xl border border-emerald-500/20 flex flex-col items-center text-center gap-3">
                      <CheckCircle2 size={24} className="text-emerald-500" />
                      <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest px-2">JD Approved by Manager</p>
                    </div>
                  )}
                  {isRejected && (jd.comments?.length === 0) && (
                    <div className="p-6 bg-rose-500/5 rounded-3xl border border-rose-500/20 flex flex-col items-center text-center gap-3">
                      <AlertCircle size={24} className="text-rose-500" />
                      <p className="text-xs font-bold text-rose-500 uppercase tracking-widest px-2">Manager requested revisions with no specific comment</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Audit Card */}
            <div className="bg-white dark:bg-[#0f172a] rounded-[2.5rem] p-8 border border-slate-200/60 dark:border-white/5 shadow-sm space-y-10">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-500" /> Integrity Audit
              </h3>
              <div className="space-y-4">
                {(() => {
                  const isWorkflowCompleted = workflowRunDetails?.status?.toLowerCase() === 'completed';
                  const filteredHistory = history.filter(step => {
                    const statusLower = step.status?.toLowerCase();
                    if (statusLower === 'delegated') return false;
                    // If the workflow is completed, we filter out generic "approved" or "completed" history entries
                    // because they will be beautifully and specifically rendered as completed steps below.
                    if (isWorkflowCompleted && ['approved', 'completed'].includes(statusLower)) {
                      return false;
                    }
                    return true;
                  });
                  return filteredHistory.map((step, i) => {
                    const hasWorkflowSteps = !!(workflowRunDetails?.resolved_steps && workflowRunDetails.resolved_steps.length > 0);
                    const hasWorkflowPending = isPending && workflowRunDetails?.resolved_steps?.some((_, idx) => idx >= workflowRunDetails.current_step_index);
                    const isLastHistory = i === filteredHistory.length - 1;

                    return (
                      <div key={i} className="flex gap-4 relative">
                        {(!isLastHistory || hasWorkflowPending || (isLastHistory && hasWorkflowSteps && workflowRunDetails?.status?.toLowerCase() === 'completed')) && (
                          <div className="absolute left-[13px] top-6 bottom-[-16px] w-[2px] bg-slate-100 dark:bg-white/5" />
                        )}
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-4 border-white dark:border-[#0f172a] shadow-sm relative z-10 ${(isLastHistory && !isPending) ? 'bg-indigo-500' : 'bg-emerald-500'
                          }`}>
                          <CheckCircle2 size={10} className="text-white" />
                        </div>
                        <div className="flex-1 pb-6">
                          <div className="flex justify-between items-start mb-1">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{extractText(step.status)}</p>
                            <p className="text-[9px] text-slate-400 font-medium">{(() => {
                              const d = new Date(step.timestamp);
                              return isNaN(d.getTime()) ? "Recently" : d.toLocaleDateString();
                            })()}</p>
                          </div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight mb-1">
                            Action by <span className="text-indigo-500">{extractText(step.updatedBy || step.user || "System")}</span>
                          </p>


                        </div>
                      </div>
                    );
                  })
                })()}

                {/* Active/Pending/Completed Workflow Steps inside Integrity Audit */}
                {workflowRunDetails?.resolved_steps?.map((step, idx) => {
                  const isWorkflowCompleted = workflowRunDetails.status?.toLowerCase() === 'completed';
                  const isCurrent = !isWorkflowCompleted && idx === workflowRunDetails.current_step_index;
                  const isCompletedStep = isWorkflowCompleted || (idx < workflowRunDetails.current_step_index);

                  // Completed workflow steps are normally recorded in history, so we don't duplicate them during active review.
                  // But if the entire workflow run is completed, we want to show all steps as completed!
                  if (isCompletedStep && !isWorkflowCompleted) return null;

                  const isLastStep = idx === workflowRunDetails.resolved_steps.length - 1;

                  return (
                    <div key={`wf-${idx}`} className="flex gap-4 relative">
                      {!isLastStep && (
                        <div className="absolute left-[13px] top-6 bottom-[-16px] w-[2px] bg-slate-100 dark:bg-white/5" />
                      )}
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-4 border-white dark:border-[#0f172a] shadow-sm relative z-10 ${isCurrent
                        ? 'bg-indigo-600 animate-pulse'
                        : isCompletedStep
                          ? 'bg-emerald-500'
                          : 'bg-slate-200 dark:bg-white/5'
                        }`}>
                        {isCurrent ? (
                          <Activity size={10} className="text-white" />
                        ) : isCompletedStep ? (
                          <CheckCircle2 size={10} className="text-white" />
                        ) : (
                          <Clock size={10} className="text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 pb-6">
                        <div className="flex justify-between items-start mb-1">
                          <p className={`text-[10px] font-black uppercase tracking-widest ${isCurrent
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : isCompletedStep
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-400'
                            }`}>
                            {step.step_name}
                          </p>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${isCurrent
                            ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/10'
                            : isCompletedStep
                              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/10'
                              : 'bg-slate-100 dark:bg-white/5 text-slate-400'
                            }`}>
                            {isCurrent ? 'In Review' : isCompletedStep ? 'Completed' : 'Pending'}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight mb-1">
                          Action by <span className="text-indigo-500">{step.full_name}</span>
                        </p>

                        {/* Tree Structure Delegation Branch */}
                        {step.delegated_to_name && (
                          <div className="mt-3 flex gap-3.5 pl-5 relative group/branch">
                            {/* L-shaped connecting line to main vertical timeline */}
                            <div className="absolute left-[-30px] top-[-22px] w-[30px] h-[34px] border-l-2 border-b-2 border-slate-200 dark:border-white/10 rounded-bl-xl pointer-events-none" />

                            {/* Delegated Circle Node */}
                            <div className="w-6 h-6 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-sm border border-indigo-500/10 z-10 relative">
                              <User size={12} strokeWidth={2.5} />
                            </div>

                            <div className="min-w-0 space-y-0.5 self-center">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">Delegated Reviewer</span>
                                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-white/10 shrink-0" />
                                <span className={`px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest rounded border shrink-0 leading-none ${isCompletedStep
                                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/15'
                                  : currentUser?.email?.toLowerCase() === step.delegated_to_email?.toLowerCase()
                                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/15'
                                    : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/15'
                                  }`}>
                                  {isCompletedStep ? "Completed" : currentUser?.email?.toLowerCase() === step.delegated_to_email?.toLowerCase() ? "Assigned to you" : "Assigned to verify"}
                                </span>
                              </div>
                              <p className="text-xs font-black text-slate-800 dark:text-white leading-tight">
                                {step.delegated_to_name}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>

      <WorkflowSelectionPanel
        isOpen={showWorkflowModal}
        onClose={() => setShowWorkflowModal(false)}
        onConfirm={handleWorkflowConfirm}
        workflows={availableWorkflows}
        targetDepartment={jd.department || ""}
      />

      {/* Assign JD Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-[40] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-[#020617]/80 backdrop-blur-sm" onClick={() => !isAssigning && setShowAssignModal(false)} />
          <div className="relative bg-white dark:bg-[#0f172a] rounded-[2.5rem] border border-slate-200 dark:border-white/10 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300 z-10 overflow-visible text-left">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />

            <div className="relative z-10">
              <div className="px-8 pt-8 pb-6 border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shadow-inner">
                      <Plus className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Assign JD to User</h3>
                      <p className="text-xs text-slate-500 font-medium">Link this JD to a candidate</p>
                    </div>
                  </div>
                  <button onClick={() => setShowAssignModal(false)} className="p-2 h-10 w-10 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all outline-none focus:ring-2 focus:ring-indigo-500/20"><X className="w-5 h-5" /></button>
                </div>
              </div>

              <div className="p-8 pb-4">
                <div className="bg-slate-50 dark:bg-white/[0.02] p-4 rounded-2xl border border-slate-200 dark:border-white/5 mb-6">
                  <p className="text-xs text-slate-400 uppercase font-black tracking-widest mb-1">Selected JD</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{jd.title}</p>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleAssignJD(selectedCandidateEmails, e.target.due_date.value);
                }}>
                  <div className="space-y-6 mb-8">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2.5">Candidate Email</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowUserSelectionPanel(true)}
                          className="w-full pl-4 pr-4 py-3.5 bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold outline-none hover:border-indigo-500 transition-all text-slate-900 dark:text-white flex items-center justify-between"
                        >
                          {selectedCandidateEmails.length > 0 ? (
                            <span>{selectedCandidateEmails.length} User(s) selected</span>
                          ) : (
                            <span className="text-slate-400">{isLoadingCandidates ? "Loading users..." : "Select users or groups..."}</span>
                          )}
                          <User className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2.5">Due Date</label>
                      <div className="relative">
                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          required
                          name="due_date"
                          type="date"
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 dark:text-white font-sans"
                        />
                      </div>
                      <p className="mt-2 text-[10px] text-slate-400 font-medium tracking-tight">The candidate will be linked to this JD via their email address.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setShowAssignModal(false)}
                      disabled={isAssigning}
                      className="flex-1 py-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 font-bold text-sm rounded-[1.5rem] hover:bg-slate-100 transition-all disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isAssigning}
                      className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-[1.5rem] flex items-center justify-center gap-2 transition-all shadow-xl shadow-indigo-500/30 active:scale-[0.98] disabled:opacity-50"
                    >
                      {isAssigning ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          ASSIGNING...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          ASSIGN JD
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      <UserSelectionPanel
        isOpen={showUserSelectionPanel}
        onClose={() => setShowUserSelectionPanel(false)}
        users={candidateUsers}
        initialSelectedEmails={selectedCandidateEmails}
        onConfirm={(emails) => {
          setSelectedCandidateEmails(emails);
          setShowUserSelectionPanel(false);
        }}
        conflictValues={alreadyAssignedEmails}
      />

      {/* Merge Confirmation Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowMergeModal(false)} />
          <div className="bg-white dark:bg-[#0f172a] rounded-[2.5rem] w-full max-w-md relative z-10 overflow-hidden shadow-2xl border border-slate-200/50 dark:border-white/5 animate-in zoom-in-95 duration-200">
            <div className="p-8 pb-6">
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mb-6">
                <AlertCircle size={32} strokeWidth={2.5} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Merge to Master?</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                You are about to permanently overwrite the Master JD with this version's content. This action will update the main record for everyone. Are you absolutely sure?
              </p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 flex gap-3">
              <button
                onClick={() => setShowMergeModal(false)}
                className="flex-1 py-4 bg-white dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-2xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={executeMerge}
                disabled={isMerging}
                className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-colors shadow-sm shadow-emerald-500/20 text-sm disabled:opacity-50"
              >
                {isMerging ? 'Merging...' : 'Yes, Merge It'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

