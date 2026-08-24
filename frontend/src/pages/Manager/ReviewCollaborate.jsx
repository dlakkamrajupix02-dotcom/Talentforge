import React, { useContext, useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate, Link } from "react-router-dom";
import { JDContext } from "../../context/JDContext";
import toast from "react-hot-toast";
import { maybePromptAfterSuccess } from "../../services/feedbackService";
import { formatSalaryRange, stripHighlightTags, rebalanceWeights, resolveSectionsOrder, resolveSectionObject, resolveSectionMeta, unwrapSectionData, sectionTextValue, isStableSection, isSectionContentEmpty, isWeightedSectionData, normalizeForWeightedList } from "../../utils/formatJD";

import * as jdService from "../../services/jdService";
import * as organizationService from "../../services/organizationService";
import SearchableDropdown from "../../components/common/SearchableDropdown";
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
  ChevronDown,
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
  XCircle,
  Loader2,
  TrendingUp,
  UserPlus,
  FileText,
  Type,
  GitCompare,
  ArrowRight,
  Search,
  Shield,
  Archive
} from "lucide-react";

import VersionCompareView from "../../components/common/VersionCompareView";


const extractText = (item) => {
  if (!item) return "";
  if (typeof item === "string") return item; // Don't strip here, let components handle it
  if (Array.isArray(item)) return item.map(extractText).join(", ");
  if (typeof item === "object") {
    const val = item.title || item.point || item.duty || item.description ||
      item.summary || item.text || item.message || "";
    if (typeof val === "object") return extractText(val);
    return String(val || "");
  }
  return String(item);
};

const renderHighlightedText = (text) => {
  if (!text) return "";
  if (typeof text !== 'string') {
    if (typeof text === 'object' && text !== null) {
      const strVal = text.title || text.point || text.description || text.duty || text.text || text.message || "";
      if (typeof strVal === 'string') {
        return renderHighlightedText(strVal);
      }
      return String(strVal);
    }
    return String(text);
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
  if (!config) return null;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${config.bg} ${config.text} ${config.border} shadow-sm transition-all duration-300`}>
      <Icon size={12} />
      {stripHighlightTags(extractText(status || 'Draft'))}
    </span>
  );
};

const getStatusConfig = (status = '') => {
  const normStatus = (status || '').toLowerCase();
  const configs = {
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
      msg: 'Continue polishing or submit',
      accent: 'bg-slate-500'
    },
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
    }
  };
  return configs[normStatus] || configs[Object.keys(configs).find(k => normStatus.includes(k))] || configs['draft'];
};

const JDSectionHeader = ({ title, icon: Icon, itemCount, description, onEdit, isEditing, onSave, onCancel, showEdit, disabledSave }) => {
  return (
    <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-white/5 group transition-colors hover:bg-slate-50/30 dark:hover:bg-white/[0.02] rounded-t-[2.5rem]">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-white dark:bg-white/5 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-white/10 shadow-sm group-hover:border-indigo-200 dark:group-hover:border-indigo-500 transition-all duration-300">
          <Icon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="font-black text-slate-800 dark:text-white text-lg tracking-tight uppercase">{title}</h3>
            {itemCount > 0 && (
              <span className="px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider rounded-full border border-indigo-100 dark:border-indigo-500/20">
                {itemCount} Items
              </span>
            )}
          </div>
          {description && (
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1 opacity-70 italic">{description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {showEdit && !isEditing && (
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-all duration-300 border border-slate-100 dark:border-white/10"
          >
            <Edit3 size={12} />
            Edit
          </button>
        )}
        {isEditing && (
          <div className="flex gap-2">
            <button
              onClick={disabledSave ? () => toast.error("Character limit exceeded (Max 3990). Please reduce text before saving.") : onSave}
              disabled={disabledSave}
              className={`flex items-center gap-1.5 px-4 py-2 ${disabledSave ? 'bg-slate-300 cursor-not-allowed opacity-50' : 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20'} text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all`}
            >
              <CheckCircle2 size={12} /> Save
            </button>
            <button
              onClick={onCancel}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/20 transition-all"
            >
              <X size={12} /> Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const StaticDisplay = ({ label, value, icon: Icon }) => (
  <div className="flex flex-col gap-1.5 min-w-0">
    {label && <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>}
    <div className="flex items-center gap-2 text-slate-800 dark:text-white font-bold py-1 min-w-0">
      {Icon && <Icon className="w-4 h-4 text-slate-400 shrink-0" />}
      <span className="truncate" title={String(value || "N/A")}>{value || "N/A"}</span>
    </div>
  </div>
);

const TimelineItem = ({ label, date, user, isLast, children }) => (
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
      {children}
    </div>
  </div>
);

// ─── Editable Section ───────────────────────────────────────────────────────

function EditableSection({ title, content, onSave, showEdit }) {
  const { user } = useContext(JDContext);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(content);

  const isArray = Array.isArray(content);

  const handleSave = () => {
    // Compare stripped versions to see if anything actually changed
    const cleanDraft = isArray ? draft.map(stripHighlightTags) : stripHighlightTags(draft);
    const cleanContent = isArray ? content.map(stripHighlightTags) : stripHighlightTags(content);

    const hasChanged = JSON.stringify(cleanDraft) !== JSON.stringify(cleanContent);

    if (hasChanged) {
      const color = user?.color_code || "#6366f1";
      const name = user?.full_name || "Reviewer";

      const highlightedData = isArray
        ? draft.map(item => {
          const cleanItem = stripHighlightTags(item);
          const originalCleanItem = (content.find(c => stripHighlightTags(c) === cleanItem));
          // Only highlight if this specific item is new or changed
          if (!originalCleanItem) {
            return `[[mod:${color}:${name}]]${cleanItem}[[/mod]]`;
          }
          return item; // Keep as is (might already have old highlight)
        })
        : `[[mod:${color}:${name}]]${draft}[[/mod]]`;

      onSave(highlightedData);
    } else {
      onSave(draft);
    }

    setIsEditing(false);
    toast.success(`${title} updated`);
  };

  const handleEdit = () => {
    // When entering edit mode, strip all tags so user edits clean text
    if (isArray) {
      setDraft(content.map(stripHighlightTags));
    } else {
      setDraft(stripHighlightTags(content));
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDraft(content);
    setIsEditing(false);
  };

  const addItem = () => setDraft(prev => [...prev, ""]);

  const updateItem = (i, val) =>
    setDraft(prev => prev.map((item, idx) => (idx === i ? val : item)));

  const removeItem = (i) =>
    setDraft(prev => prev.filter((_, idx) => idx !== i));

  return (
    <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm relative mb-6 hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300 group/section">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-black text-slate-900 tracking-tight">{title}</h3>
        {showEdit && !isEditing && (
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all duration-300 border border-slate-100"
          >
            <Edit3 size={12} />
            Edit
          </button>
        )}
        {isEditing && (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-all"
            >
              <CheckCircle2 size={13} /> Save
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all"
            >
              <X size={13} /> Cancel
            </button>
          </div>
        )}
      </div>

      {/* VIEW MODE */}
      {!isEditing && (
        isArray ? (
          <ul className="space-y-3">
            {(Array.isArray(content) ? content : []).map((item, i) => (
              <li key={i} className="flex gap-3 text-slate-600 text-sm leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-200 mt-2 shrink-0" />
                <div className="flex-1">
                  {renderHighlightedText(item)}
                </div>
              </li>
            ))}
            {(!content || content.length === 0) && (
              <p className="text-slate-400 text-sm italic">No items yet.</p>
            )}
          </ul>
        ) : (
          <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
            {renderHighlightedText(content) || <span className="italic text-slate-400">No content.</span>}
          </div>
        )
      )}

      {/* EDIT MODE */}
      {isEditing && (
        isArray ? (
          <div className="space-y-2">
            {draft.map((item, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-3 shrink-0" />
                <input
                  type="text"
                  value={item}
                  onChange={(e) => updateItem(i, e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                  placeholder="Enter item..."
                />
                <button
                  onClick={() => removeItem(i)}
                  className="p-2 text-rose-400 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button
              onClick={addItem}
              className="mt-2 text-xs font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 px-4 py-2 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-all border border-indigo-100"
            >
              <Plus size={12} />
              Add Item
            </button>
          </div>
        ) : (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            className="w-full px-4 py-3 text-sm border border-slate-200 rounded-2xl focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all resize-none leading-relaxed"
          />
        )
      )}
    </div>
  );
}


const SidebarCard = ({ title, icon: Icon, children }) => (
  <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm mb-6">
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 bg-purple-50 rounded-lg">
        <Icon className="text-purple-600" size={16} />
      </div>
      <h4 className="font-bold text-slate-900 text-sm tracking-tight">{title}</h4>
    </div>
    {children}
  </div>
);

const SabaReviewJDContent = ({
  jd,
  content,
  isPending,
  hasAlreadyActed,
  editingSection,
  setEditingSection,
  draftContent,
  setDraftContent,
  handleUpdateSection,
  totalJdChars,
}) => {
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
        const isWeightLocked = jd?.[`weight_view_${sectionKey}_view`] === "locked";
        const weighted = isWeightedSectionData(sectionContent, sectionKey, meta);
        const isPoints = meta.type === "points" || meta.type === "weighted_list" || Array.isArray(sectionContent);

        if (isLocked) return null;

        const isEditing = editingSection === sectionKey;

        return (
          <section key={sectionKey} className="bg-white dark:bg-[#0f172a] rounded-[2.5rem] border border-slate-200/60 dark:border-white/5 shadow-sm overflow-hidden group">
            <JDSectionHeader
              title={meta.label}
              icon={AlignLeft}
              itemCount={Array.isArray(sectionContent) ? sectionContent.length : undefined}
              showEdit={isPending && !hasAlreadyActed}
              isEditing={isEditing}
              disabledSave={totalJdChars > 3990}
              onEdit={() => {
                setEditingSection(sectionKey);
                if (isPoints) {
                  const normalized = weighted ? normalizeForWeightedList(sectionContent) : (Array.isArray(sectionContent) ? sectionContent : []);
                  setDraftContent(normalized.map(item => {
                    if (typeof item === 'object' && item !== null) {
                      return {
                        ...item,
                        title: stripHighlightTags(item.title || item.point || item.name || ""),
                        point: stripHighlightTags(item.point || item.title || item.name || ""),
                        description: stripHighlightTags(item.description || ""),
                        weight: item.weight || 0
                      };
                    }
                    return stripHighlightTags(String(item));
                  }));
                } else {
                  setDraftContent(stripHighlightTags(sectionTextValue(sectionObj)));
                }
              }}
              onSave={() => handleUpdateSection(sectionKey, draftContent)}
              onCancel={() => setEditingSection(null)}
            />
            <div className="p-8 pt-2">
              {isEditing ? (
                isPoints ? (
                  <div className="space-y-4">
                    {draftContent.map((item, i) => {
                      const isObj = typeof item === 'object' && item !== null;
                      const titleVal = isObj ? (item.title || item.point || "") : item;
                      const descVal = isObj ? item.description : "";
                      const weightVal = isObj ? item.weight : undefined;

                      return (
                        <div key={i} className="space-y-3 p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-indigo-100 dark:border-indigo-500/20">
                          <div className="flex gap-4 items-center">
                            <div className="flex-1">
                              <input
                                type="text"
                                value={titleVal}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val.length > titleVal.length && totalJdChars >= 3990) {
                                    toast.error("Max character limit reached (3990). Cannot add more text.");
                                    return;
                                  }
                                  const newDraft = [...draftContent];
                                  if (isObj) {
                                    newDraft[i] = {
                                      ...newDraft[i],
                                      title: val,
                                      point: val
                                    };
                                  } else {
                                    newDraft[i] = val;
                                  }
                                  setDraftContent(newDraft);
                                }}
                                className="w-full bg-white dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm font-black uppercase tracking-tight"
                                placeholder="Item Text"
                              />
                            </div>
                            {!isWeightLocked && weightVal !== undefined && (
                              <div className="w-24 shrink-0">
                                <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-xl">
                                  <input
                                    type="number"
                                    value={weightVal}
                                    onChange={(e) => {
                                      const updated = rebalanceWeights(draftContent, i, e.target.value);
                                      setDraftContent(updated);
                                    }}
                                    className="w-full bg-transparent outline-none text-xs font-black text-indigo-500"
                                  />
                                  <span className="text-[10px] font-black text-slate-400">%</span>
                                </div>
                              </div>
                            )}
                            <button
                              onClick={() => {
                                setDraftContent(draftContent.filter((_, idx) => idx !== i));
                              }}
                              className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          {isObj && (
                            <div className="flex gap-4">
                              <input
                                type="text"
                                value={descVal}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val.length > descVal.length && totalJdChars >= 3990) {
                                    toast.error("Max character limit reached (3990). Cannot add more text.");
                                    return;
                                  }
                                  const newDraft = [...draftContent];
                                  newDraft[i] = {
                                    ...newDraft[i],
                                    description: val
                                  };
                                  setDraftContent(newDraft);
                                }}
                                className="w-full bg-white dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-xs italic font-medium"
                                placeholder="Description (optional)"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <button
                      onClick={() => {
                        const isObjType = draftContent.length > 0 && typeof draftContent[0] === 'object';
                        const newItem = weighted
                          ? { title: "", point: "", description: "", weight: 0 }
                          : (isObjType ? { title: "", point: "", description: "" } : "");
                        setDraftContent([...draftContent, newItem]);
                      }}
                      className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-all duration-300"
                    >
                      + Add Item
                    </button>
                  </div>
                ) : (
                  <div className="bg-slate-50/50 dark:bg-white/5 rounded-[2rem] p-6 border border-slate-100 dark:border-white/5">
                    <textarea
                      value={draftContent}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.length > draftContent.length && totalJdChars >= 3990) {
                          toast.error("Max character limit reached (3990). Cannot add more text.");
                          return;
                        }
                        setDraftContent(val);
                      }}
                      className="w-full bg-transparent outline-none text-slate-600 dark:text-slate-400 font-medium leading-relaxed resize-y h-40 focus:ring-0"
                      autoFocus
                    />
                  </div>
                )
              ) : (
                isPoints ? (
                  <div className="space-y-4">
                    {(weighted ? normalizeForWeightedList(sectionContent) : (Array.isArray(sectionContent) ? sectionContent : [])).map((item, i) => {
                      const isObj = typeof item === 'object' && item !== null;
                      const title = isObj ? (item.point || item.title || item.name || "") : item;
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
                                {renderHighlightedText(title)}
                              </h4>
                              {desc && (
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed italic">
                                  {renderHighlightedText(desc)}
                                </p>
                              )}
                            </div>
                          </div>
                          {!isWeightLocked && weight !== undefined && weight > 0 && (
                            <div className="w-16 shrink-0 flex flex-col items-center border-l border-slate-200 dark:border-white/10 pl-4 text-right">
                              <span className="text-sm font-black text-indigo-500 leading-none">{weight}%</span>
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Weight</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-slate-50/50 dark:bg-white/5 rounded-[2rem] p-6 border border-slate-100 dark:border-white/5 group-hover:bg-white dark:group-hover:bg-white/10 transition-all duration-500">
                    <div className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                      {renderHighlightedText(sectionTextValue(sectionObj))}
                    </div>
                  </div>
                )
              )}
            </div>
          </section>
        );
      })}
    </>
  );
};

export default function ReviewCollaborate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    receivedJDs,
    approveJD,
    reviewJD: contextReviewJD,
    updateJD,
    user,
    refreshReceivedJDs,
    refreshMyJDs,
    normalizeJD,
    getWorkflowStatus,
    getJDHistory,
    teamMembers,
    coreCompetenciesDB,
    functionalCompetenciesDB
  } = useContext(JDContext);

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const [showDelegateDrawer, setShowDelegateDrawer] = useState(false);
  const [drawerSearchTerm, setDrawerSearchTerm] = useState("");
  const [feedbackInput, setFeedbackInput] = useState("");
  const [delegateEmail, setDelegateEmail] = useState("");
  const [delegateComment, setDelegateComment] = useState("");
  const [editedContent, setEditedContent] = useState({});
  const [fullDetails, setFullDetails] = useState(null);
  const [selectedVersionId, setSelectedVersionId] = useState(null);
  const [fetchedVersionDetails, setFetchedVersionDetails] = useState(null);
  const [allVersionsData, setAllVersionsData] = useState({});
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [isVersionLoading, setIsVersionLoading] = useState(false);
  const [workflowRunDetails, setWorkflowRunDetails] = useState(null);
  const [jdHistoryData, setJdHistoryData] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSection, setEditingSection] = useState(null); // 'summary', 'responsibilities', etc.
  const [draftContent, setDraftContent] = useState("");
  const [activeManagers, setActiveManagers] = useState([]);
  const [isLoadingManagers, setIsLoadingManagers] = useState(false);

  useEffect(() => {
    if (showDelegateDrawer && activeManagers.length === 0) {
      const fetchManagers = async () => {
        setIsLoadingManagers(true);
        try {
          const data = await organizationService.getManagers('active');
          setActiveManagers(data || []);
        } catch (error) {
          console.error("Failed to fetch active managers:", error);
          toast.error("Failed to load active managers");
        } finally {
          setIsLoadingManagers(false);
        }
      };
      fetchManagers();
    }
  }, [showDelegateDrawer, activeManagers.length]);

  const filteredManagers = useMemo(() => {
    const list = Array.isArray(activeManagers) ? activeManagers : [];
    const managers = list.filter(
      (m) =>
        m.email !== user?.email
    );

    if (!drawerSearchTerm.trim()) return managers;

    return managers.filter((m) => {
      const name = (m.name || m.full_name || "").toLowerCase();
      const email = (m.email || m.email_id || m.email_address || m.user?.email || "").toLowerCase();
      const query = drawerSearchTerm.toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [activeManagers, drawerSearchTerm, user]);

  const handleCloseDelegateModal = () => {
    setShowDelegateModal(false);
    setShowDelegateDrawer(false);
    setDrawerSearchTerm("");
  };

  const jdFromContext = useMemo(() => {
    return receivedJDs.find(j => j.id === id);
  }, [id, receivedJDs]);

  useEffect(() => {
    // Auto-select user's version on initial load
    if (fullDetails?.version_history && selectedVersionId === null) {
      const myVersion = fullDetails.version_history.find(v => v.user_id === (user?.userId || user?.id));
      if (myVersion) {
        setSelectedVersionId(myVersion.jd_id);
        return;
      }

      // Delegate fallback:
      if (workflowRunDetails) {
        const delegateEmail = workflowRunDetails?.current_approver?.delegated_to_email;
        const isDelegate = delegateEmail && user?.email?.toLowerCase() === delegateEmail.toLowerCase();

        if (isDelegate) {
          const delegatorUserId = workflowRunDetails?.current_approver?.user_id || workflowRunDetails?.current_approver?.id;
          const delegatorVersion = fullDetails.version_history.find(v => v.user_id === delegatorUserId);
          if (delegatorVersion) {
            setSelectedVersionId(delegatorVersion.jd_id);
            return;
          }
        }
      }

      // Handle delegate edge case: If URL param 'id' is a known version, use it.
      const urlVersion = fullDetails.version_history.find(v => v.jd_id === id);
      if (urlVersion) {
        setSelectedVersionId(urlVersion.jd_id);
      } else {
        setSelectedVersionId(fullDetails.id || id);
      }
    }
  }, [fullDetails, user, selectedVersionId, id, workflowRunDetails]);

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
        setAllVersionsData(prev => ({ ...prev, [selectedVersionId]: jdVal }));
      } catch (error) {
        console.error("Failed to fetch version details:", error);
      } finally {
        setIsVersionLoading(false);
      }
    };
    fetchVersionData();
  }, [selectedVersionId, fullDetails?.id, id]);

  useEffect(() => {
    const fetchAllVersions = async () => {
      if (!fullDetails?.version_history) return;
      try {
        const versions = fullDetails.version_history;
        const fetched = { ...allVersionsData };
        let hasNew = false;

        const promises = versions.map(async (v) => {
          if (!fetched[v.jd_id] && v.jd_id !== fullDetails.id && v.jd_id !== id) {
            const data = await jdService.getJDById(v.jd_id);
            if (data) {
              fetched[v.jd_id] = data;
              hasNew = true;
            }
          }
        });

        await Promise.all(promises);
        if (hasNew) setAllVersionsData(fetched);
      } catch (e) {
        console.error("Failed to fetch version history data:", e);
      }
    };
    fetchAllVersions();
  }, [fullDetails?.version_history, id]);

  useEffect(() => {
    const fetchFullDetails = async () => {
      const targetId = jdFromContext?.original_jd_id || id;
      if (!targetId) return;
      setIsLoadingDetails(true);
      try {
        const [jdData, wfData] = await Promise.allSettled([
          jdService.getJDById(targetId),
          getWorkflowStatus(targetId)
        ]);

        if (jdData.status === 'fulfilled' && jdData.value) {
          setFullDetails(jdData.value);
        }
        if (wfData.status === 'fulfilled' && wfData.value) {
          setWorkflowRunDetails(wfData.value);
        }
      } catch (error) {
        console.error("Failed to fetch full JD details:", error);
      } finally {
        setIsLoadingDetails(false);
      }
    };
    fetchFullDetails();
  }, [id, jdFromContext?.original_jd_id, getWorkflowStatus]);

  const isCurrentUserDelegate = useMemo(() => {
    const delegateEmail = workflowRunDetails?.current_approver?.delegated_to_email;
    return delegateEmail && user?.email?.toLowerCase() === delegateEmail.toLowerCase();
  }, [workflowRunDetails, user]);

  const isCurrentUserDelegator = useMemo(() => {
    const approverEmail = workflowRunDetails?.current_approver?.email;
    const delegateEmail = workflowRunDetails?.current_approver?.delegated_to_email;
    return delegateEmail && approverEmail && user?.email?.toLowerCase() === approverEmail.toLowerCase();
  }, [workflowRunDetails, user]);

  const delegationComment = useMemo(() => {
    if (!workflowRunDetails?.comments_trail) return null;
    const delegatedLogs = workflowRunDetails.comments_trail.filter(c => c.decision === 'delegated');
    if (delegatedLogs.length === 0) return null;
    return delegatedLogs[delegatedLogs.length - 1];
  }, [workflowRunDetails]);

  // Calculate final JD object by merging context data and full detail data
  const jd = useMemo(() => {
    let sourceData = fullDetails ? JSON.parse(JSON.stringify(fullDetails)) : {};

    if (selectedVersionId && fullDetails?.version_history) {
      const sortedVersions = [...fullDetails.version_history].sort((a, b) => a.step_index - b.step_index);
      const selectedIdx = sortedVersions.findIndex(v => v.jd_id === selectedVersionId);

      if (selectedIdx !== -1) {
        for (let i = 0; i <= selectedIdx; i++) {
          const vId = sortedVersions[i].jd_id;
          const vData = allVersionsData[vId] || (vId === fetchedVersionDetails?.id ? fetchedVersionDetails : null);

          if (vData) {
            sourceData = {
              ...sourceData,
              ...vData,
              content: {
                ...(sourceData.content || {}),
                ...(vData.content || {})
              }
            };
          }
        }
      } else if (selectedVersionId === fullDetails.id) {
        // explicitly master, sourceData is already fullDetails
      } else if (fetchedVersionDetails) {
        sourceData = {
          ...sourceData,
          ...fetchedVersionDetails,
          content: { ...(sourceData.content || {}), ...(fetchedVersionDetails.content || {}) }
        };
      }
    } else if (!selectedVersionId && jdFromContext) {
      sourceData = {
        ...sourceData,
        ...jdFromContext,
        content: { ...(sourceData.content || {}), ...(jdFromContext.content || {}) }
      };
    }

    const normalizedSource = normalizeJD(sourceData);

    const merged = {
      ...normalizedSource,
      ...workflowRunDetails, // Unified structure from backend
      status: workflowRunDetails?.status || normalizedSource.status,
      version_history: fullDetails?.version_history || normalizedSource.version_history,
      id: selectedVersionId || normalizedSource.id
    };

    return normalizeJD(merged);
  }, [selectedVersionId, fullDetails, allVersionsData, fetchedVersionDetails, jdFromContext, workflowRunDetails, normalizeJD]);

  const getSelectedVersionLabel = () => {
    if (!selectedVersionId || selectedVersionId === (fullDetails?.id || id)) {
      return "Master (Current)";
    }
    if (fullDetails?.version_history) {
      const sorted = [...fullDetails.version_history].sort((a, b) => a.step_index - b.step_index);
      const idx = sorted.findIndex(v => v.jd_id === selectedVersionId);
      if (idx !== -1) {
        const v = sorted[idx];
        return `Version ${v.version || idx + 1}`;
      }
    }
    return "Selected Version";
  };

  if (!jd && !isLoadingDetails) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-slate-400 font-bold uppercase tracking-[0.2em]">Job Description Not Found</p>
      </div>
    );
  }

  if (isLoadingDetails && !jd) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Fetching Details...</p>
      </div>
    );
  }

  const isPending = ['submitted', 'pending', 'in_review', 'active', 'waiting_for_approval'].includes(jd?.status?.toLowerCase()) || jd?.status?.toLowerCase().startsWith("review step");
  const isApproved = ['approved', 'completed'].includes(jd?.status?.toLowerCase());
  const isFinalized = ['final', 'finalized'].includes(jd?.status?.toLowerCase());
  const isRevision = ['rejected', 'declined', 'returned_to_initiator', 'returned', 'revision requested'].includes(jd?.status?.toLowerCase());

  const hasAlreadyActed = jd?.history?.some(h => h.updatedByEmail === user.email);

  // Merge edits into context before taking action
  const flushEdits = () => {
    if (Object.keys(editedContent).length > 0) {
      const updatedContent = { ...(jd.content || jd), ...editedContent };
      updateJD(jd.id, { content: updatedContent });
    }
  };

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      flushEdits();
      const masterId = jdFromContext?.original_jd_id || id;
      await approveJD(masterId, feedbackInput || 'Approved by Manager');
      setShowApproveModal(false);
      toast.success("JD Approved successfully!");
      maybePromptAfterSuccess("jd_approved", { jd_id: masterId });
      navigate('/manager/dashboard');
    } catch (error) {
      console.error("Approval failed:", error);
      toast.error("Failed to approve JD. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!feedbackInput.trim()) {
      toast.error("Please provide feedback for revisions.");
      return;
    }
    setIsSubmitting(true);
    try {
      flushEdits();
      const masterId = jdFromContext?.original_jd_id || id;
      await contextReviewJD(masterId, 'declined', feedbackInput);
      toast.success("Revisions requested.");
      navigate('/manager/dashboard');
    } catch (error) {
      console.error("Rejection failed:", error);
      toast.error("Failed to request revisions. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelegate = async () => {
    if (!delegateEmail.trim()) {
      toast.error("Please provide the email of the person you are delegating to.");
      return;
    }
    setIsSubmitting(true);
    try {
      const masterId = jdFromContext?.original_jd_id || id;
      await jdService.delegateWorkflowStep(masterId, delegateEmail, delegateComment);
      setShowDelegateModal(false);
      setShowDelegateDrawer(false);
      setDelegateEmail("");
      setDelegateComment("");
      setDrawerSearchTerm("");
      toast.success("JD Review delegated successfully!");
      navigate('/manager/dashboard');
    } catch (error) {
      console.error("Delegation failed:", error);
      toast.error(error.message || "Failed to delegate JD. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendFeedback = async () => {
    if (!feedbackInput.trim()) return;
    setIsSubmitting(true);
    try {
      flushEdits();
      // We'll use the 'Return for Revision' or similar if we just want to comment
      // For now, let's just use the contextReviewJD with a custom status if needed, 
      // but usually feedback is part of a decision.
      // If the backend doesn't have a 'Just Comment' endpoint, we might have to skip this 
      // or use a specific status.
      const masterId = jdFromContext?.original_jd_id || id;
      await contextReviewJD(masterId, 'Comment', feedbackInput);
      setFeedbackInput("");
      setEditedContent({});
      toast.success("Feedback sent.");
    } catch (error) {
      console.error("Feedback failed:", error);
      toast.error("Failed to send feedback.");
    } finally {
      setIsSubmitting(false);
    }
  };


  // Map structured content if available, else use description
  const content = jd.content || jd || {};

  const getListData = (...paths) => {
    for (const path of paths) {
      if (Array.isArray(path) && path.length > 0) return path;
    }
    return [];
  };

  const responsibilities = normalizeComplexList(getListData(content.responsibilities, content.key_duties, content.essential_duties_and_responsibilities, jd.responsibilities, jd.key_duties));
  const coreCompetencies = normalizeComplexList(getListData(content.core_competencies, content.coreCompetencies, jd.core_competencies, jd.coreCompetencies));
  const functionalCompetencies = normalizeComplexList(getListData(content.functional_competencies, content.functionalCompetencies, jd.functional_competencies, jd.functionalCompetencies));
  const requiredQuals = normalizeList(getListData(content.qualifications?.required, content.qualifications_required, jd.qualifications?.required, jd.qualifications_required));
  const preferredQuals = normalizeList(getListData(content.qualifications?.preferred, content.qualifications_preferred, jd.qualifications?.preferred, jd.qualifications_preferred));
  const benefits = normalizeList(getListData(content.benefits, jd.benefits));
  const overview = content.summary || jd.description || jd.overview || "No overview provided.";
  const skills = normalizeList(content.skills || jd.skills);
  const experience = extractText(content.experience || jd.experience || "");
  const tools = normalizeList(content.tools || jd.tools);
  const eeo = extractText(content.eeo_statement || content.eeo || "");

  const config = getStatusConfig(jd.status);

  const handleUpdateSection = async (sectionName, newVal) => {
    if (totalJdChars > 3990) {
      toast.error("Character limit exceeded (Max 3990). Please reduce text before saving.");
      return;
    }
    try {
      const color = user?.color_code || "#6366f1";
      const name = user?.full_name || "Reviewer";

      if (sectionName === 'responsibilities' && typeof newVal === 'object' && !Array.isArray(newVal)) {
        const oldNarrative = jd.content?.role_narrative || jd.content?.essential_duties_and_responsibilities || "";
        const cleanOldNarrative = stripHighlightTags(Array.isArray(oldNarrative) ? oldNarrative.join(" ") : String(oldNarrative)).trim();
        const cleanNewNarrative = stripHighlightTags(newVal.roleNarrative).trim();
        let highlightedNarrative = newVal.roleNarrative;

        if (cleanNewNarrative !== cleanOldNarrative && cleanNewNarrative !== "") {
          const timestamp = new Date().toISOString();
          highlightedNarrative = `[[mod:${color}:${name}:${timestamp}]]${newVal.roleNarrative}[[/mod]]`;
        } else {
          highlightedNarrative = Array.isArray(oldNarrative) ? oldNarrative.join(" ") : String(oldNarrative);
        }

        await jdService.updateSection(jd.id, 'essential_duties_and_responsibilities', highlightedNarrative);
        newVal = newVal.duties;
      }

      // Use getListData to properly resolve currentVal depending on the section, mirroring the rendering logic
      let currentVal = [];
      if (sectionName === 'responsibilities') {
        currentVal = getListData(jd.content?.responsibilities, jd.content?.key_duties, jd.content?.essential_duties_and_responsibilities, jd.responsibilities, jd.key_duties);
      } else if (sectionName === 'core_competencies') {
        currentVal = getListData(jd.content?.core_competencies, jd.content?.coreCompetencies, jd.core_competencies, jd.coreCompetencies);
      } else if (sectionName === 'functional_competencies') {
        currentVal = getListData(jd.content?.functional_competencies, jd.content?.functionalCompetencies, jd.functional_competencies, jd.functionalCompetencies);
      } else if (sectionName === 'qualifications_required') {
        currentVal = getListData(jd.content?.qualifications?.required, jd.content?.qualifications_required, jd.qualifications?.required, jd.qualifications_required);
      } else if (sectionName === 'qualifications_preferred') {
        currentVal = getListData(jd.content?.qualifications?.preferred, jd.content?.qualifications_preferred, jd.qualifications?.preferred, jd.qualifications_preferred);
      } else {
        currentVal = jd.content?.[sectionName] || jd[sectionName] || [];
      }

      const sectionObj = resolveSectionObject(jd, sectionName);
      const sectionContent = unwrapSectionData(sectionObj);
      const meta = resolveSectionMeta(sectionName, sectionObj, jd?.sections_metadata);
      const isWeighted = isWeightedSectionData(sectionContent, sectionName, meta);
      const hasObjects = Array.isArray(sectionContent) && sectionContent.some(item => typeof item === 'object' && item !== null);

      const isObjectSection = ['responsibilities', 'key_duties', 'essential_duties_and_responsibilities', 'core_competencies', 'functional_competencies'].includes(sectionName) || isWeighted || hasObjects;

      let highlightedVal = newVal;

      if (Array.isArray(newVal)) {
        if (!isObjectSection) {
          // For plain string sections (qualifications, skills, benefits, tools)
          highlightedVal = newVal.map(item => {
            const strVal = typeof item === 'object' && item !== null ? (item.title || item.point || item.description || "") : String(item);
            const cleanStrVal = stripHighlightTags(strVal).trim();
            if (!cleanStrVal) return null;

            // Check if this exact string existed in currentVal
            const originalStr = Array.isArray(currentVal) ? currentVal.find(curr => {
              const currStr = typeof curr === 'object' && curr !== null ? (curr.title || curr.point || curr.description || "") : String(curr);
              return stripHighlightTags(currStr).trim() === cleanStrVal;
            }) : null;

            if (originalStr) {
              // Return original exactly as it was (preserving existing string or tags)
              return typeof originalStr === 'object' && originalStr !== null ? (originalStr.title || originalStr.point || originalStr.description || cleanStrVal) : originalStr;
            } else {
              // New or modified string
              const timestamp = new Date().toISOString();
              return `[[mod:${color}:${name}:${timestamp}]]${cleanStrVal}[[/mod]]`;
            }
          }).filter(Boolean);
        } else {
          // For object sections (responsibilities, competencies)
          highlightedVal = newVal.map(item => {
            const isObj = typeof item === 'object' && item !== null;
            const cleanItemTitle = stripHighlightTags(isObj ? (item.title || item.point || "") : item).trim();
            if (!cleanItemTitle) return null;

            const originalItem = Array.isArray(currentVal) ? currentVal.find(curr => {
              const isCurrObj = typeof curr === 'object' && curr !== null;
              const cleanCurrTitle = stripHighlightTags(isCurrObj ? (curr.title || curr.point || "") : curr).trim();
              return cleanCurrTitle === cleanItemTitle && cleanCurrTitle !== "";
            }) : null;

            const highlightWrap = (text) => {
              const timestamp = new Date().toISOString();
              return `[[mod:${color}:${name}:${timestamp}]]${stripHighlightTags(text)}[[/mod]]`;
            };

            if (!originalItem) {
              if (!isObj) {
                return {
                  point: highlightWrap(item),
                  title: highlightWrap(item),
                  weight: 0
                };
              } else {
                const newItem = { ...item };
                if (newItem.title !== undefined) newItem.title = highlightWrap(newItem.title);
                if (newItem.description !== undefined && newItem.description) {
                  newItem.description = highlightWrap(newItem.description);
                }
                newItem.point = highlightWrap(newItem.point || newItem.title || "");
                return newItem;
              }
            } else {
              const preservedItem = typeof originalItem === 'object' ? { ...originalItem } : { point: originalItem, title: originalItem };
              if (isObj && item.weight !== undefined) {
                preservedItem.weight = item.weight;
              }
              if (isObj && item.description !== undefined) {
                const cleanOldDesc = stripHighlightTags(preservedItem.description || "").trim();
                const cleanNewDesc = stripHighlightTags(item.description || "").trim();
                if (cleanNewDesc !== cleanOldDesc && cleanNewDesc !== "") {
                  const timestamp = new Date().toISOString();
                  preservedItem.description = `[[mod:${color}:${name}:${timestamp}]]${cleanNewDesc}[[/mod]]`;
                } else {
                  preservedItem.description = item.description;
                }
              }
              if (preservedItem.point === undefined || preservedItem.point === "") {
                preservedItem.point = preservedItem.title || "";
              }
              return preservedItem;
            }
          }).filter(Boolean);
        }
      } else if (typeof newVal === 'string') {
        const cleanOld = stripHighlightTags(Array.isArray(currentVal) ? currentVal.join(" ") : (currentVal || ""));
        const cleanNew = stripHighlightTags(newVal);
        if (cleanNew !== cleanOld && cleanNew.trim() !== "") {
          const timestamp = new Date().toISOString();
          highlightedVal = `[[mod:${color}:${name}:${timestamp}]]${newVal}[[/mod]]`;
        } else {
          highlightedVal = currentVal;
        }
      }

      let apiSectionName = sectionName;
      if (sectionName === 'responsibilities') {
        apiSectionName = 'key_duties';
      }

      await jdService.updateSection(jd.id, apiSectionName, highlightedVal);
      // Refresh details to sync
      const targetId = jdFromContext?.original_jd_id || id;
      if (jd.id === targetId) {
        const updated = await jdService.getJDById(targetId);
        if (updated) setFullDetails(updated);
      } else {
        const updatedVersion = await jdService.getJDById(jd.id);
        if (updatedVersion) {
          setFetchedVersionDetails(updatedVersion);
          setAllVersionsData(prev => ({ ...prev, [jd.id]: updatedVersion }));
        }
      }
      setEditingSection(null);
      toast.success(`${sectionName} updated`);
    } catch (error) {
      console.error(`Failed to update section ${sectionName}:`, error);
      toast.error(`Could not save ${sectionName}`);
    }
  };

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

  const getLiveJdChars = () => {
    if (!jd) return 0;

    const extractStr = (item) => {
      if (!item) return "";
      if (typeof item === 'string') return stripHighlightTags(item);
      if (typeof item === 'object') {
        return stripHighlightTags(String(item.point || item.title || item.duty || item.text || ""));
      }
      return String(item);
    };

    const getItemsText = (items) => {
      if (!Array.isArray(items)) return "";
      return items.map(extractStr).join(" ");
    };

    const s_summary = extractStr(editingSection === 'summary' ? draftContent : (overview || ""));
    const s_duties = extractStr(editingSection === 'responsibilities' ? draftContent?.roleNarrative : (content.essential_duties_and_responsibilities || ""));
    const s_resp = getItemsText(editingSection === 'responsibilities' ? draftContent?.duties : (responsibilities || []));
    const s_core = getItemsText(editingSection === 'core_competencies' ? draftContent : (coreCompetencies || []));
    const s_func = getItemsText(editingSection === 'functional_competencies' ? draftContent : (functionalCompetencies || []));

    let s_req = "";
    let s_pref = "";
    if (editingSection === 'qualifications') {
      s_req = getItemsText(draftContent?.required || []);
      s_pref = getItemsText(draftContent?.preferred || []);
    } else {
      s_req = getItemsText(requiredQuals || []);
      s_pref = getItemsText(preferredQuals || []);
    }
    const s_eeo = extractStr(eeo || "");

    const fullText = [s_summary, s_duties, s_resp, s_core, s_func, s_req, s_pref, s_eeo].filter(Boolean).join(" ");
    const calcLen = fullText.length;
    return calcLen > 0 ? calcLen : (jd.word_count || jd.wordCount || 0);
  };

  const totalJdChars = getLiveJdChars();

  if (isCompareMode) {
    return (
      <div className="h-screen bg-[#f8fafc] dark:bg-[#020617] font-sans selection:bg-indigo-500/30 p-8 overflow-hidden">
        <div className="max-w-[1720px] mx-auto h-full">
          <VersionCompareView
            jd={fullDetails}
            versionHistory={fullDetails?.version_history || []}
            onClose={() => {
              setIsCompareMode(false);
              const fetchFullDetails = async () => {
                const targetId = jdFromContext?.original_jd_id || id;
                if (!targetId) return;
                try {
                  const updated = await jdService.getJDById(targetId);
                  if (updated) setFullDetails(updated);
                } catch (e) {
                  console.error(e);
                }
              };
              fetchFullDetails();
            }}
            currentUser={user}
            onlyDiffChecker={true}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] font-sans selection:bg-indigo-500/30 pb-20">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

        {/* Modern Navigation Header (Static Flow) */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <button
            onClick={() => navigate('/manager/dashboard')}
            className="group flex items-center gap-4 text-slate-900 dark:text-white font-black text-xs uppercase tracking-[0.25em] hover:text-indigo-500 transition-colors"
          >
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200/60 dark:border-white/5 flex items-center justify-center shadow-sm group-hover:shadow-md transition-all group-hover:border-indigo-500/30">
              <ArrowLeft size={20} strokeWidth={3} className="group-hover:-translate-x-1 transition-transform" />
            </div>
            Back to Dashboard
          </button>

          <div className="flex items-center gap-3 flex-wrap">
            <div className={`h-12 flex items-center gap-3 px-6 bg-white dark:bg-[#0f172a] border-2 ${totalJdChars > 3990 ? 'border-rose-500/50 bg-rose-50/50 dark:bg-rose-950/20 shadow-lg shadow-rose-500/10' : 'border-slate-200/60 dark:border-white/10 shadow-sm'} rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300`}>
              <div className={`w-3 h-3 rounded-full ${totalJdChars > 3990 ? 'bg-rose-500 animate-ping' : 'bg-indigo-500'}`} />
              <span className="text-slate-400 dark:text-slate-300">CHARACTERS:</span>
              <span className={`font-mono font-extrabold text-sm px-2.5 py-1 rounded-xl ${totalJdChars > 3990 ? "bg-rose-500 text-white shadow-md shadow-rose-500/20" : "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"}`}>
                {totalJdChars} / 3990
              </span>
            </div>
            <div className="h-12 flex items-center gap-2 px-6 bg-white dark:bg-[#0f172a] border border-slate-200/60 dark:border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-300 shadow-sm border-dashed">
              <ShieldCheck size={16} /> COMPLIANCE CLEARANCE: <span className="text-emerald-500 ml-1 italic">ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Slim Sticky Floating Warning Banner */}
        {totalJdChars > 3990 && (
          <div className="sticky top-4 z-50 bg-red-50 dark:bg-rose-950/90 border-2 border-red-200 dark:border-rose-800 rounded-2xl p-4 shadow-xl shadow-red-500/10 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-3 min-w-0">
              <AlertCircle className="w-6 h-6 shrink-0 text-red-600 dark:text-rose-400 animate-bounce" />
              <span className="text-red-800 dark:text-rose-200 text-sm font-bold truncate sm:overflow-visible sm:whitespace-normal">
                Job Description exceeds character limit ({totalJdChars} / 3990). Please reduce text before saving.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Excess:</span>
              <span className="bg-red-600 text-white font-mono text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm">
                +{totalJdChars - 3990} chars
              </span>
            </div>
          </div>
        )}

        {/* Delegation Status Banner */}
        {workflowRunDetails?.current_approver?.delegated_to_name && (isCurrentUserDelegate || isCurrentUserDelegator) && (
          <div className="relative overflow-hidden bg-indigo-50/80 dark:bg-indigo-500/10 border border-indigo-100/80 dark:border-indigo-500/20 rounded-[2rem] p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 backdrop-blur-md">
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-start gap-4 relative z-10">
              <div className="w-12 h-12 bg-indigo-500/20 dark:bg-indigo-500/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shrink-0 border border-indigo-500/10 shadow-inner">
                <UserPlus size={22} className="animate-pulse" />
              </div>
              <div className="min-w-0 space-y-1">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-indigo-500 text-white shadow-sm leading-none mb-1">
                  {isCurrentUserDelegate ? 'Delegated Task' : 'Outward Delegation'}
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight leading-none">
                  {isCurrentUserDelegate ? (
                    <>Review Delegated to you by <span className="text-indigo-600 dark:text-indigo-400">{workflowRunDetails.current_approver.full_name}</span></>
                  ) : (
                    <>You have delegated this review to <span className="text-indigo-600 dark:text-indigo-400">{workflowRunDetails.current_approver.delegated_to_name}</span></>
                  )}
                </h3>
                {isCurrentUserDelegate && delegationComment?.comment && (
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 italic mt-1.5 leading-relaxed bg-white/40 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-xl px-4 py-2">
                    &ldquo;{delegationComment.comment}&rdquo;
                  </p>
                )}
                {isCurrentUserDelegator && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    It is currently pending action from <span className="font-bold text-slate-700 dark:text-slate-300">{workflowRunDetails.current_approver.delegated_to_name}</span> ({workflowRunDetails.current_approver.delegated_to_email}).
                  </p>
                )}
              </div>
            </div>

            {/* Context action callouts */}
            {isCurrentUserDelegate && (
              <div className="shrink-0 flex items-center gap-2 relative z-10 self-stretch md:self-auto bg-white/40 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5 px-4 py-3 rounded-2xl">
                <Zap size={14} className="text-amber-500 shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 leading-none">
                  Authorized delegate reviewer
                </span>
              </div>
            )}
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
                  <StatusBadge status={jd.status} />
                  {jd.version_history && jd.version_history.length > 0 && (
                    <div className="relative flex items-center gap-2.5">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Version:</span>
                      <div className="bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 dark:text-white shadow-sm">
                        {getSelectedVersionLabel()}
                      </div>
                      <button
                        onClick={() => setIsCompareMode(true)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                      >
                        <GitCompare className="w-4 h-4" /> See Diff Checker
                      </button>
                    </div>
                  )}
                </div>
                <div className="space-y-6">
                  <h1 className="text-5xl sm:text-6xl font-black text-slate-900 dark:text-white tracking-tighter leading-[0.9]">
                    {extractText(jd.title)}
                  </h1>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <StaticDisplay label="Job ID" value={jd.job_id || jd.jobId} />
                    <StaticDisplay label="Department" value={jd.department} />
                    <StaticDisplay label="Job Family" value={jd.job_family || jd.jobFamily} />
                    <StaticDisplay label="Industry" value={jd.industry} />
                    <StaticDisplay label="Location" value={jd.location} />
                    <StaticDisplay label="Job Level" value={jd.job_level || jd.jobLevel} />
                    <StaticDisplay label="Seniority" value={jd.seniority} />
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Salary Range</span>
                      <div className="flex items-center gap-1.5 text-lg font-black text-slate-900 dark:text-white tracking-tight">
                        {jd.salary_range || formatSalaryRange(
                          jd.salary_min_value,
                          jd.salary_max_value,
                          jd.salary_symbol || "$",
                          jd.salary_period || ""
                        )}

                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Sections */}
            <div className="space-y-8">
              <SabaReviewJDContent
                jd={jd}
                content={content}
                isPending={isPending}
                hasAlreadyActed={hasAlreadyActed}
                editingSection={editingSection}
                setEditingSection={setEditingSection}
                draftContent={draftContent}
                setDraftContent={setDraftContent}
                handleUpdateSection={handleUpdateSection}
                totalJdChars={totalJdChars}
              />
              {false && (
                <>
                  {jd.summary_view !== "locked" && (
                <section className="bg-white dark:bg-[#0f172a] rounded-[2.5rem] border border-slate-200/60 dark:border-white/5 shadow-sm overflow-hidden group">
                  <JDSectionHeader
                    title="Summary"
                    icon={AlignLeft}
                    description="Strategic overview of the role and its impact"
                    showEdit={isPending && !hasAlreadyActed}
                    isEditing={editingSection === 'summary'}
                    disabledSave={totalJdChars > 3990}
                    onEdit={() => {
                      setEditingSection('summary');
                      setDraftContent(stripHighlightTags(overview));
                    }}
                    onSave={() => handleUpdateSection('summary', draftContent)}
                    onCancel={() => setEditingSection(null)}
                  />
                  <div className="p-8 pt-2">
                    <div className="bg-slate-50/50 dark:bg-white/5 rounded-[2rem] p-6 border border-slate-100 dark:border-white/5 group-hover:bg-white dark:group-hover:bg-white/10 transition-all duration-500">
                      {editingSection === 'summary' ? (
                        <textarea
                          value={draftContent}
                          onChange={(e) => {
                            const newVal = e.target.value;
                            if (newVal.length > draftContent.length && totalJdChars >= 3990) {
                              toast.error("Max character limit reached (3990). Cannot add more text.");
                              return;
                            }
                            setDraftContent(newVal);
                          }}
                          className="w-full bg-transparent outline-none text-slate-600 dark:text-slate-400 font-medium leading-relaxed resize-none h-40 focus:ring-0"
                          autoFocus
                        />
                      ) : (
                        <div className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed whitespace-pre-wrap">
                          {renderHighlightedText(overview)}
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* Responsibilities Section */}
              {jd.responsibilities_view !== "locked" && (
                <section className="bg-white dark:bg-[#0f172a] rounded-[2.5rem] border border-slate-200/60 dark:border-white/5 shadow-sm overflow-hidden group">
                  <JDSectionHeader
                    title="Essential Duties & Responsibilities"
                    icon={List}
                    itemCount={responsibilities.length}
                    description="Key activities and performance areas"
                    showEdit={isPending && !hasAlreadyActed}
                    isEditing={editingSection === 'responsibilities'}
                    disabledSave={totalJdChars > 3990}
                    onEdit={() => {
                      setEditingSection('responsibilities');
                      const oldNarrative = content.role_narrative || content.essential_duties_and_responsibilities || "";
                      setDraftContent({
                        roleNarrative: stripHighlightTags(Array.isArray(oldNarrative) ? oldNarrative.join(" ") : String(oldNarrative)),
                        duties: responsibilities.map(r => ({
                          ...r,
                          title: stripHighlightTags(r.title || r.point || ""),
                          description: stripHighlightTags(r.description || ""),
                          weight: r.weight || 0
                        }))
                      });
                    }}
                    onSave={() => handleUpdateSection('responsibilities', draftContent)}
                    onCancel={() => setEditingSection(null)}
                  />
                  <div className="p-8 pt-2 space-y-8">
                    {editingSection === 'responsibilities' ? (
                      <div className="space-y-4">
                        <div className="mb-6">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-1.5 h-6 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                            <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Role Narrative</h4>
                          </div>
                          <textarea
                            value={draftContent.roleNarrative}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val.length > (draftContent.roleNarrative?.length || 0) && totalJdChars >= 3990) {
                                toast.error("Max character limit reached (3990). Cannot add more text.");
                                return;
                              }
                              setDraftContent({ ...draftContent, roleNarrative: val });
                            }}
                            className="w-full bg-slate-50/50 dark:bg-white/5 p-6 rounded-3xl border border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-400 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-y min-h-[100px]"
                            placeholder="Enter Role Narrative..."
                          />
                        </div>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-1.5 h-6 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                          <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Key Performance Areas</h4>
                        </div>
                        {draftContent.duties.map((resp, i) => (
                          <div key={i} className="space-y-3 p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-indigo-100 dark:border-indigo-500/20">
                            <div className="flex gap-4">
                              <div className="flex-1">
                                <input
                                  value={resp.title}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val.length > (resp.title?.length || 0) && totalJdChars >= 3990) {
                                      toast.error("Max character limit reached (3990). Cannot add more text.");
                                      return;
                                    }
                                    const newDuties = [...draftContent.duties];
                                    newDuties[i] = {
                                      ...newDuties[i],
                                      title: val,
                                      point: newDuties[i].point !== undefined ? val : newDuties[i].point
                                    };
                                    setDraftContent({ ...draftContent, duties: newDuties });
                                  }}
                                  className="w-full bg-white dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm font-black uppercase tracking-tight"
                                  placeholder="Duty Title"
                                />
                              </div>
                              <div className="w-24 shrink-0">
                                <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-xl">
                                  <input
                                    type="number"
                                    value={resp.weight}
                                    onChange={(e) => {
                                      const updatedDuties = rebalanceWeights(draftContent.duties, i, e.target.value);
                                      setDraftContent({ ...draftContent, duties: updatedDuties });
                                    }}
                                    className="w-full bg-transparent outline-none text-xs font-black text-indigo-500"
                                  />
                                  <span className="text-[10px] font-black text-slate-400">%</span>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  const newDuties = draftContent.duties.filter((_, idx) => idx !== i);
                                  setDraftContent({ ...draftContent, duties: newDuties });
                                }}
                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                        <button
                          onClick={() => setDraftContent({ ...draftContent, duties: [...draftContent.duties, { title: "", description: "", weight: 0 }] })}
                          className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-all"
                        >
                          + Add Responsibility
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-1.5 h-6 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                          <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Key Performance Areas</h4>
                        </div>

                        {responsibilities.map((resp, i) => (
                          <div key={i} className="flex gap-4 items-center p-4 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-100 dark:border-white/5 transition-all hover:bg-slate-100 dark:hover:bg-white/[0.04] justify-between">
                            <div className="flex gap-4 items-start flex-1">
                              <div className="w-8 h-8 rounded-xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0 shadow-sm text-[10px] font-black text-indigo-500 mt-0.5">
                                {String(i + 1).padStart(2, '0')}
                              </div>
                              <div className="space-y-2 flex-1">
                                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 tracking-tight uppercase">
                                  {renderHighlightedText(resp.title)}
                                </h4>
                                {resp.description && (
                                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed italic">
                                    {renderHighlightedText(resp.description)}
                                  </p>
                                )}
                              </div>
                            </div>
                            {jd.weight_view_responsibilities_view !== "locked" && (
                              <div className="w-16 shrink-0 flex flex-col items-center border-l border-slate-200 dark:border-white/10 pl-4 text-right">
                                <span className="text-sm font-black text-indigo-500 leading-none">{resp.weight || 0}%</span>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Weight</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Core Competencies Section */}
              {jd.corecompetencies_view !== "locked" && coreCompetencies.length > 0 && (
                <section className="bg-white dark:bg-[#0f172a] rounded-[2.5rem] border border-slate-200/60 dark:border-white/5 shadow-sm group">
                  <JDSectionHeader
                    title="Core Competencies"
                    icon={CheckCircle2}
                    itemCount={coreCompetencies.length}
                    description="Fundamental organizational behaviors"
                    showEdit={isPending && !hasAlreadyActed}
                    isEditing={editingSection === 'core_competencies'}
                    disabledSave={totalJdChars > 3990}
                    onEdit={() => {
                      setEditingSection('core_competencies');
                      setDraftContent(coreCompetencies.map(c => ({
                        ...c,
                        title: stripHighlightTags(c.title || c.point || "")
                      })));
                    }}
                    onSave={() => handleUpdateSection('core_competencies', draftContent)}
                    onCancel={() => setEditingSection(null)}
                  />
                  <div className="p-8 pt-2 grid grid-cols-1 gap-4">
                    {editingSection === 'core_competencies' ? (
                      <div className="space-y-4">
                        {draftContent.map((comp, i) => (
                          <div key={i} className="p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-indigo-100 dark:border-indigo-500/20 space-y-3">
                            <div className="flex gap-4">
                              <input
                                value={comp.title}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val.length > (comp.title?.length || 0) && totalJdChars >= 3990) {
                                    toast.error("Max character limit reached (3990). Cannot add more text.");
                                    return;
                                  }
                                  const newDraft = [...draftContent];
                                  newDraft[i] = {
                                    ...newDraft[i],
                                    title: val,
                                    point: newDraft[i].point !== undefined ? val : newDraft[i].point
                                  };
                                  setDraftContent(newDraft);
                                }}
                                className="flex-1 bg-white dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm font-black uppercase tracking-tight"
                                placeholder="Competency Title"
                              />
                              <div className="w-24 shrink-0 flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-xl">
                                <input
                                  type="number"
                                  value={comp.weight}
                                  onChange={(e) => {
                                    const updated = rebalanceWeights(draftContent, i, e.target.value);
                                    setDraftContent(updated);
                                  }}
                                  className="w-full bg-transparent outline-none text-xs font-black text-indigo-500"
                                />
                                <span className="text-[10px] font-black text-slate-400">%</span>
                              </div>
                              <button onClick={() => setDraftContent(draftContent.filter((_, idx) => idx !== i))} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                        <SearchableDropdown
                          options={coreCompetenciesDB}
                          value=""
                          onChange={(val) => {
                            if (val) {
                              setDraftContent([...draftContent, { title: val, description: "", weight: 0 }]);
                            }
                          }}
                          placeholder="Select or type core competency..."
                          allowCustom={true}
                          className="w-full flex items-center justify-between gap-3 px-6 py-4 rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-indigo-300 hover:bg-indigo-50/30 text-slate-400 dark:text-slate-500 hover:text-indigo-600 transition-all duration-300 text-xs font-black uppercase tracking-widest"
                        />
                      </div>
                    ) : (
                      coreCompetencies.map((comp, i) => (
                        <div key={i} className="p-6 bg-emerald-500/5 rounded-3xl border border-emerald-500/10 flex flex-col gap-2 transition-all hover:bg-emerald-500/10 hover:shadow-lg">
                          <div className="flex justify-between items-start">
                            <h5 className="font-black text-slate-900 dark:text-white text-sm tracking-tight uppercase">
                              {renderHighlightedText(comp.title)}
                            </h5>
                            {jd.weight_view_corecompetencies_view !== "locked" && (
                              <span className="px-2 py-0.5 bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest">{comp.weight}%</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              )}

              {/* Functional Competencies Section */}
              {jd.functionalcompetencies_view !== "locked" && functionalCompetencies.length > 0 && (
                <section className="bg-white dark:bg-[#0f172a] rounded-[2.5rem] border border-slate-200/60 dark:border-white/5 shadow-sm group">
                  <JDSectionHeader
                    title="Functional Competencies"
                    icon={Wand2}
                    itemCount={functionalCompetencies.length}
                    description="Role-specific technical expertise"
                    showEdit={isPending && !hasAlreadyActed}
                    isEditing={editingSection === 'functional_competencies'}
                    disabledSave={totalJdChars > 3990}
                    onEdit={() => {
                      setEditingSection('functional_competencies');
                      setDraftContent(functionalCompetencies.map(c => ({
                        ...c,
                        title: stripHighlightTags(c.title || c.point || ""),
                        weight: c.weight || 0
                      })));
                    }}
                    onSave={() => handleUpdateSection('functional_competencies', draftContent)}
                    onCancel={() => setEditingSection(null)}
                  />
                  <div className="p-8 pt-2 grid grid-cols-1 gap-4">
                    {editingSection === 'functional_competencies' ? (
                      <div className="space-y-4">
                        {draftContent.map((comp, i) => (
                          <div key={i} className="p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-indigo-100 dark:border-indigo-500/20 space-y-3">
                            <div className="flex gap-4">
                              <input
                                value={comp.title}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val.length > (comp.title?.length || 0) && totalJdChars >= 3990) {
                                    toast.error("Max character limit reached (3990). Cannot add more text.");
                                    return;
                                  }
                                  const newDraft = [...draftContent];
                                  newDraft[i] = {
                                    ...newDraft[i],
                                    title: val,
                                    point: newDraft[i].point !== undefined ? val : newDraft[i].point
                                  };
                                  setDraftContent(newDraft);
                                }}
                                className="flex-1 bg-white dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm font-black uppercase tracking-tight"
                                placeholder="Competency Title"
                              />
                              <div className="w-24 shrink-0 flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-xl">
                                <input
                                  type="number"
                                  value={comp.weight}
                                  onChange={(e) => {
                                    const updated = rebalanceWeights(draftContent, i, e.target.value);
                                    setDraftContent(updated);
                                  }}
                                  className="w-full bg-transparent outline-none text-xs font-black text-indigo-500"
                                />
                                <span className="text-[10px] font-black text-slate-400">%</span>
                              </div>
                              <button onClick={() => setDraftContent(draftContent.filter((_, idx) => idx !== i))} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                        <SearchableDropdown
                          options={functionalCompetenciesDB}
                          value=""
                          onChange={(val) => {
                            if (val) {
                              setDraftContent([...draftContent, { title: val, description: "", weight: 0 }]);
                            }
                          }}
                          placeholder="Select or type functional competency..."
                          allowCustom={true}
                          className="w-full flex items-center justify-between gap-3 px-6 py-4 rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-indigo-300 hover:bg-indigo-50/30 text-slate-400 dark:text-slate-500 hover:text-indigo-600 transition-all duration-300 text-xs font-black uppercase tracking-widest"
                        />
                      </div>
                    ) : (
                      functionalCompetencies.map((comp, i) => (
                        <div key={i} className="p-6 bg-indigo-500/5 rounded-3xl border border-indigo-500/10 flex flex-col gap-2 transition-all hover:bg-indigo-500/10 hover:shadow-lg">
                          <div className="flex justify-between items-start">
                            <h5 className="font-black text-slate-900 dark:text-white text-sm tracking-tight uppercase">
                              {renderHighlightedText(comp.title)}
                            </h5>
                            {jd.weight_view_functionalcompetencies_view !== "locked" && (
                              <span className="px-2 py-0.5 bg-indigo-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest">{comp.weight}%</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              )}

              {/* Qualifications */}
              {jd.qualifications_view !== "locked" && (
                <section className="bg-white dark:bg-[#0f172a] rounded-[2.5rem] border border-slate-200/60 dark:border-white/5 shadow-sm overflow-hidden group">
                  <JDSectionHeader
                    title="Qualifications"
                    icon={Briefcase}
                    itemCount={requiredQuals.length + preferredQuals.length}
                    description="Educational and professional requirements"
                    showEdit={isPending}
                    isEditing={editingSection === 'qualifications'}
                    disabledSave={totalJdChars > 3990}
                    onEdit={() => {
                      setEditingSection('qualifications');
                      setDraftContent({
                        required: requiredQuals.map(stripHighlightTags),
                        preferred: preferredQuals.map(stripHighlightTags)
                      });
                    }}
                    onSave={async () => {
                      await handleUpdateSection('qualifications_required', draftContent.required);
                      await handleUpdateSection('qualifications_preferred', draftContent.preferred);
                    }}
                    onCancel={() => setEditingSection(null)}
                  />
                  <div className="p-8 pt-2 grid grid-cols-1 md:grid-cols-2 gap-12">
                    {editingSection === 'qualifications' ? (
                      <>
                        <div className="space-y-6">
                          <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] border-b border-rose-100 dark:border-rose-500/20 pb-2 flex items-center gap-2">
                            <ShieldCheck size={14} /> Mandatory Requirements
                          </h3>
                          <div className="space-y-3">
                            {draftContent.required.map((q, i) => (
                              <div key={i} className="flex gap-2">
                                <input
                                  value={q}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val.length > (q?.length || 0) && totalJdChars >= 3990) {
                                      toast.error("Max character limit reached (3990). Cannot add more text.");
                                      return;
                                    }
                                    const newRequired = [...draftContent.required];
                                    newRequired[i] = val;
                                    setDraftContent({ ...draftContent, required: newRequired });
                                  }}
                                  className="flex-1 bg-white dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-xs"
                                />
                                <button onClick={() => {
                                  const newRequired = draftContent.required.filter((_, idx) => idx !== i);
                                  setDraftContent({ ...draftContent, required: newRequired });
                                }} className="p-2 text-rose-500"><Trash2 size={14} /></button>
                              </div>
                            ))}
                            <button onClick={() => setDraftContent({ ...draftContent, required: [...draftContent.required, ""] })} className="w-full py-2 border border-dashed border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-400">+ Add Requirement</button>
                          </div>
                        </div>
                        <div className="space-y-6">
                          <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] border-b border-amber-100 dark:border-amber-500/20 pb-2 flex items-center gap-2">
                            <Sparkles size={14} /> Preferred Assets
                          </h3>
                          <div className="space-y-3">
                            {draftContent.preferred.map((q, i) => (
                              <div key={i} className="flex gap-2">
                                <input
                                  value={q}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val.length > (q?.length || 0) && totalJdChars >= 3990) {
                                      toast.error("Max character limit reached (3990). Cannot add more text.");
                                      return;
                                    }
                                    const newPreferred = [...draftContent.preferred];
                                    newPreferred[i] = val;
                                    setDraftContent({ ...draftContent, preferred: newPreferred });
                                  }}
                                  className="flex-1 bg-white dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-xs"
                                />
                                <button onClick={() => {
                                  const newPreferred = draftContent.preferred.filter((_, idx) => idx !== i);
                                  setDraftContent({ ...draftContent, preferred: newPreferred });
                                }} className="p-2 text-rose-500"><Trash2 size={14} /></button>
                              </div>
                            ))}
                            <button onClick={() => setDraftContent({ ...draftContent, preferred: [...draftContent.preferred, ""] })} className="w-full py-2 border border-dashed border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-400">+ Add Asset</button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-6">
                          <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] border-b border-rose-100 dark:border-rose-500/20 pb-2 flex items-center gap-2">
                            <ShieldCheck size={14} /> Mandatory Requirements
                          </h3>
                          <ul className="space-y-4">
                            {requiredQuals.map((q, i) => (
                              <li key={i} className="flex gap-4 group">
                                <div className="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center shrink-0">
                                  <CheckCircleIcon size={12} className="text-rose-500" />
                                </div>
                                <div className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-tight flex-1">
                                  {renderHighlightedText(q)}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="space-y-6">
                          <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] border-b border-amber-100 dark:border-amber-500/20 pb-2 flex items-center gap-2">
                            <Sparkles size={14} /> Preferred Assets
                          </h3>
                          <ul className="space-y-4">
                            {preferredQuals.map((q, i) => (
                              <li key={i} className="flex gap-4 group">
                                <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
                                  <CheckCircleIcon size={12} className="text-amber-500" />
                                </div>
                                <div className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-tight flex-1">
                                  {renderHighlightedText(q)}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}
                  </div>
                </section>
              )}
            </>
          )}

              {eeo && (
                <section className="bg-emerald-50/20 dark:bg-emerald-500/5 rounded-[2.5rem] border border-emerald-100/60 dark:border-emerald-500/20 overflow-hidden">
                  <JDSectionHeader
                    title="Equal Opportunity Statement"
                    icon={AlertCircle}
                    description="Commitment to diversity and inclusion"
                  />
                  <div className="p-8">
                    <div className="bg-white/60 dark:bg-white/5 rounded-[2rem] p-6 border border-emerald-100 dark:border-emerald-500/20">
                      <div className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed italic">
                        {renderHighlightedText(eeo)}
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </div>
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

              {!hasAlreadyActed && (
                <div className={`p-8 rounded-[2rem] border ${config.bg} ${config.border} flex flex-col items-center text-center gap-5 relative z-10 transition-all duration-500 group-hover:scale-[1.02]`}>
                  <div className="w-16 h-16 rounded-3xl bg-white dark:bg-[#020617] flex items-center justify-center border-2 border-white dark:border-white/10 shadow-2xl relative overflow-hidden">
                    <div className={`absolute inset-0 ${config.bg} opacity-20`} />
                    <config.icon size={32} className={`${config.text} relative z-10`} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none uppercase">
                      {extractText(jd.status)}
                    </p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-60 italic">{config.msg}</p>
                  </div>
                </div>
              )}

              <div className="space-y-4 relative z-10">
                {isPending && !hasAlreadyActed && (
                  <>
                    <button
                      onClick={() => setShowApproveModal(true)}
                      disabled={isSubmitting}
                      className="w-full py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-xl active:scale-[0.98] bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20"
                    >
                      <CheckCircle2 size={18} />
                      Approve JD
                    </button>
                    <button
                      onClick={() => setShowRevisionModal(true)}
                      disabled={isSubmitting}
                      className="w-full py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] border-2 flex items-center justify-center gap-3 transition-all active:scale-[0.98] bg-white dark:bg-transparent text-rose-500 border-rose-100 dark:border-rose-500/20 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:border-rose-200 duration-300"
                    >
                      <XCircle size={18} />
                      Request Revisions
                    </button>
                    {!isCurrentUserDelegate && (
                      <button
                        onClick={() => setShowDelegateModal(true)}
                        disabled={isSubmitting}
                        className="w-full py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] border-2 flex items-center justify-center gap-3 transition-all active:scale-[0.98] bg-slate-50 dark:bg-white/5 text-indigo-500 border-indigo-100 dark:border-white/5 hover:bg-indigo-50 dark:hover:bg-white/10 hover:border-indigo-200 duration-300"
                      >
                        <UserPlus size={18} />
                        Delegate Review
                      </button>
                    )}
                  </>
                )}
                {isPending && hasAlreadyActed && (
                  <div className="w-full py-6 px-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[2rem] text-center space-y-2">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-500">
                      <CheckCircle2 size={20} />
                    </div>
                    <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Decision Recorded</p>
                    <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 italic">You have already approved this JD. Waiting for next steps.</p>
                  </div>
                )}
                {isApproved && (
                  <div className="w-full py-5 bg-emerald-500/10 border border-emerald-500/20 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] text-emerald-600 flex items-center justify-center gap-3">
                    <CheckCircle2 size={16} /> Approved & Ready to Post
                  </div>
                )}
                {isRevision && (
                  <div className="w-full py-5 bg-rose-500/10 border border-rose-500/20 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] text-rose-600 flex items-center justify-center gap-3">
                    <AlertCircle size={16} /> Revisions Pending
                  </div>
                )}
              </div>
            </div>

            {/* Timeline Card */}
            <div className="bg-white dark:bg-[#0f172a] rounded-[2.5rem] p-8 border border-slate-200/60 dark:border-white/5 shadow-sm space-y-6">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <History size={16} className="text-indigo-500" /> Audit History
              </h3>
              <div className="space-y-0 relative">
                {(jd?.history || []).map((step, i) => {
                  const isDelegatedStep = step.status?.toLowerCase() === 'delegated';
                  const delName = step.delegated_to_name || workflowRunDetails?.current_approver?.delegated_to_name;

                  return (
                    <TimelineItem
                      key={i}
                      label={step.status}
                      date={new Date(step.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      user={step.updatedBy || "System"}
                      isLast={i === (jd.history.length - 1)}
                    >
                      {isDelegatedStep && delName && (
                        <div className="mt-3 flex gap-2 pl-3 relative">
                          {/* L-shaped line connecting to timeline vertical bar */}
                          <div className="absolute left-[-21px] top-[-16px] w-[21px] h-[26px] border-l-2 border-b-2 border-slate-200 dark:border-white/10 rounded-bl-lg pointer-events-none" />

                          {/* Delegate Mini-Node Card */}
                          <div className="w-4 h-4 rounded bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/10 shadow-sm">
                            <User size={9} strokeWidth={2.5} />
                          </div>

                          <div className="min-w-0">
                            <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">Delegated Reviewer</p>
                            <p className="text-[10px] font-black text-slate-800 dark:text-white leading-tight mt-0.5">{delName}</p>
                          </div>
                        </div>
                      )}
                    </TimelineItem>
                  );
                })}
              </div>
            </div>

            {/* Collaboration Hub Card */}
            <div className="bg-white dark:bg-[#0f172a] rounded-[2.5rem] p-8 border border-slate-200/60 dark:border-white/5 shadow-sm space-y-6">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <MessageSquare size={16} className="text-indigo-500" /> Collaboration Hub
              </h3>

              <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar pr-2">
                {(jd.comments || []).map((f, i) => (
                  <div key={i} className="bg-slate-50/50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5 relative group hover:border-indigo-200 transition-all">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{extractText(f.userName || f.user)}</span>
                      <span className="px-1.5 py-0.5 bg-indigo-500 text-white rounded text-[8px] font-black uppercase tracking-widest">{extractText(f.role || "MEMBER")}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-2 font-medium">{extractText(f.message)}</p>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest opacity-60 italic">{new Date(f.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                ))}
                {(!jd.comments || jd.comments.length === 0) && (
                  <p className="text-center py-8 text-[11px] font-black text-slate-400 uppercase tracking-widest opacity-40">No activity yet</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Approval Modal */}
        {showApproveModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-[#0f172a] rounded-[3rem] p-12 max-w-lg w-full mx-4 shadow-2xl border border-slate-100 dark:border-white/5 animate-in zoom-in duration-300">
              <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 mx-auto">
                <CheckCircle2 className="text-emerald-500" size={40} />
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white text-center mb-4 tracking-tight">Approve this JD?</h3>
              <p className="text-slate-500 dark:text-slate-400 text-center mb-8 font-medium leading-relaxed">
                You are about to authorize the final version of this role definition. It will be marked as complete and authorized.
              </p>

              <div className="space-y-4">
                <textarea
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  placeholder="Final comments for the team (Optional)..."
                  className="w-full h-24 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-[20px] p-4 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                />
                <div className="flex gap-4 pt-4">
                  <button onClick={() => setShowApproveModal(false)} className="flex-1 py-4 bg-slate-50 dark:bg-white/5 text-slate-400 font-bold rounded-2xl">Cancel</button>
                  <button onClick={handleApprove} className="flex-1 py-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/20">Authorize</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delegation Modal */}
        {showDelegateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-[#0f172a] rounded-[3rem] p-12 max-w-lg w-full mx-4 shadow-2xl border border-slate-100 dark:border-white/5 animate-in zoom-in duration-300">
              <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-500/10 rounded-full flex items-center justify-center mb-6 mx-auto">
                <UserPlus className="text-indigo-500" size={40} />
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white text-center mb-4 tracking-tight">Delegate Review</h3>
              <p className="text-slate-500 dark:text-slate-400 text-center mb-8 font-medium leading-relaxed">
                Assign this approval step to another manager. They will receive an email notification and full access to review this JD.
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Manager Email</label>
                  <input
                    type="email"
                    value={delegateEmail}
                    onChange={(e) => setDelegateEmail(e.target.value)}
                    onClick={() => setShowDelegateDrawer(true)}
                    placeholder="Click to select manager email..."
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all cursor-pointer"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Handover Comment</label>
                  <textarea
                    value={delegateComment}
                    onChange={(e) => setDelegateComment(e.target.value)}
                    placeholder="Why are you delegating? (Optional)..."
                    className="w-full h-24 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-[20px] p-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button onClick={handleCloseDelegateModal} className="flex-1 py-4 bg-slate-50 dark:bg-white/5 text-slate-400 font-bold rounded-2xl">Cancel</button>
                  <button onClick={handleDelegate} disabled={isSubmitting} className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2">
                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                    Delegate
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delegation Drawer (Sliding Panel from Right) */}
        {showDelegateDrawer && createPortal(
          <div className="fixed inset-0 overflow-hidden" style={{ zIndex: 99999 }}>
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
              onClick={() => setShowDelegateDrawer(false)}
            />
            {/* Panel */}
            <div className="absolute inset-y-0 right-0 max-w-full flex">
              <div className="w-screen max-w-md bg-white dark:bg-[#0f172a] shadow-2xl border-l border-slate-200 dark:border-white/10 flex flex-col animate-in slide-in-from-right duration-300">
                
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserPlus className="text-indigo-600 dark:text-indigo-400 w-5 h-5" />
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Select Recipient</h3>
                  </div>
                  <button 
                    onClick={() => setShowDelegateDrawer(false)} 
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Subheader / Tabs */}
                <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 flex border-b border-slate-200 dark:border-white/10 gap-4">
                  <button className="px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow-sm">
                    Managers (Active)
                  </button>
                  <button 
                    disabled 
                    className="px-3 py-1.5 bg-slate-200 dark:bg-white/5 text-slate-400 dark:text-slate-600 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1.5 cursor-not-allowed"
                    title="Upcoming Feature"
                  >
                    Groups (Upcoming)
                    <Shield size={10} />
                  </button>
                </div>

                {/* Search Panel */}
                <div className="p-4 border-b border-slate-200 dark:border-white/10">
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search managers..."
                      value={drawerSearchTerm}
                      onChange={(e) => setDrawerSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-all font-semibold"
                    />
                  </div>
                </div>

                {/* Managers List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                  {isLoadingManagers ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                      <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Loading managers...</p>
                    </div>
                  ) : (
                    <>
                      {filteredManagers.map((manager) => {
                        const initials = (manager.name || manager.full_name || "")
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .substring(0, 2)
                          .toUpperCase();
                        
                        const managerEmail = manager.email || manager.email_id || manager.email_address || manager.user?.email || "";
                        return (
                          <div
                            key={manager.id || managerEmail}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (managerEmail) {
                                setDelegateEmail(managerEmail);
                                setShowDelegateDrawer(false);
                              } else {
                                toast.error("This manager does not have an associated email.");
                              }
                            }}
                            className="flex items-center justify-between p-3 bg-slate-50 hover:bg-indigo-50/50 dark:bg-slate-900/40 dark:hover:bg-indigo-950/20 border border-slate-100 dark:border-white/5 hover:border-indigo-200 dark:hover:border-indigo-500/30 rounded-2xl cursor-pointer transition-all duration-200 group/item"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Initials Avatar */}
                              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shadow-inner">
                                {initials || <User className="w-4 h-4" />}
                              </div>
                              
                              <div className="min-w-0">
                                <p className="text-xs font-black text-slate-800 dark:text-white group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 transition-colors truncate">
                                  {manager.name || manager.full_name}
                                </p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold truncate mt-0.5">
                                  {managerEmail || "No Email"}
                                </p>
                              </div>
                            </div>

                            {/* Arrow icon */}
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 dark:text-slate-700 group-hover/item:text-indigo-500 group-hover/item:bg-indigo-100/50 dark:group-hover/item:bg-indigo-500/10 transition-all">
                              <ArrowRight className="w-4 h-4" />
                            </div>
                          </div>
                        );
                      })}

                      {filteredManagers.length === 0 && (
                        <div className="text-center py-12">
                          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">No managers found</p>
                        </div>
                      )}
                    </>
                  )}
                </div>

              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Revision Modal */}
        {showRevisionModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-[#0f172a] rounded-[3rem] p-12 max-w-lg w-full mx-4 shadow-2xl border border-slate-100 dark:border-white/5 animate-in zoom-in duration-300">
              <div className="w-20 h-20 bg-rose-50 dark:bg-rose-500/10 rounded-full flex items-center justify-center mb-6 mx-auto">
                <XCircle className="text-rose-500" size={40} />
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white text-center mb-4 tracking-tight">Request Revision</h3>
              <p className="text-slate-500 dark:text-slate-400 text-center mb-8 font-medium leading-relaxed">
                Please describe the required updates. Your feedback is essential for the refinement process.
              </p>

              <div className="space-y-4">
                <textarea
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  placeholder="Detailed revision points required..."
                  className="w-full h-32 bg-slate-50 dark:bg-white/5 border border-rose-100 dark:border-rose-500/20 rounded-[24px] p-5 text-sm font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
                <div className="flex gap-4 pt-4">
                  <button onClick={() => setShowRevisionModal(false)} className="flex-1 py-4 bg-slate-50 dark:bg-white/5 text-slate-400 font-bold rounded-2xl">Cancel</button>
                  <button onClick={handleReject} className="flex-1 py-4 bg-rose-600 text-white font-bold rounded-2xl shadow-lg shadow-rose-500/20">Send Back</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
