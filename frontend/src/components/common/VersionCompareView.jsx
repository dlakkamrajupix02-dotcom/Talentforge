import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  GitCompare, ArrowLeft, CheckCircle2, AlertCircle, Sparkles, 
  Trash2, User, Calendar, Award, RefreshCw, X, ChevronRight, Download, Eye, Columns, Split,
  ChevronUp, ChevronDown
} from "lucide-react";
import * as jdService from "../../services/jdService";
import toast from "react-hot-toast";


// Helper to strip highlight tags from text
const stripHighlightTags = (text) => {
  if (!text || typeof text !== 'string') return "";
  return text
    .replace(/\[\[mod:.*?\]\]/gi, '')
    .replace(/\[\[\/mod\]\]/gi, '')
    .replace(/<ins>/g, '')
    .replace(/<\/ins>/g, '')
    .replace(/<del>/g, '')
    .replace(/<\/del>/g, '')
    .trim();
};

const extractText = (val) => {
  if (!val) return "";
  if (typeof val === 'string') return stripHighlightTags(val);
  if (typeof val === 'object') return stripHighlightTags(val.point || val.title || val.duty || val.description || "");
  return String(val);
};

const normalizeComplexList = (list) => {
  if (!Array.isArray(list)) return [];
  return list.map(item => {
    if (typeof item === 'string') return { title: stripHighlightTags(item), description: "", weight: 0 };
    return {
      title: extractText(item.title || item.point || item.duty || "Item"),
      description: extractText(item.description || ""),
      weight: parseInt(item.weight) || 0
    };
  });
};

const normalizeList = (list) => {
  if (!Array.isArray(list)) return [];
  return list.map(extractText).filter(Boolean).map(item => ({ title: item, description: "", weight: 0 }));
};

// Sentence-level diffing helper
function diffParagraphs(oldText, newText) {
  const oldClean = stripHighlightTags(oldText || "");
  const newClean = stripHighlightTags(newText || "");
  
  if (oldClean === newClean) {
    return [{ text: oldClean, type: 'unchanged' }];
  }
  
  const splitSentences = (txt) => {
    if (!txt) return [];
    return txt.split(/(?<=[.!?])\s+/).filter(Boolean);
  };
  
  const oldSentences = splitSentences(oldClean);
  const newSentences = splitSentences(newClean);
  
  const result = [];
  const oldMatched = new Set();
  
  newSentences.forEach((newSent) => {
    const oldIdx = oldSentences.findIndex((oldSent, idx) => oldSent === newSent && !oldMatched.has(idx));
    if (oldIdx !== -1) {
      oldMatched.add(oldIdx);
      result.push({ text: newSent, type: 'unchanged' });
    } else {
      // Find a semi-close match for "modified"
      const closeIdx = oldSentences.findIndex((oldSent, idx) => {
        if (oldMatched.has(idx)) return false;
        const wordsOld = oldSent.toLowerCase().split(/\s+/);
        const wordsNew = newSent.toLowerCase().split(/\s+/);
        const overlap = wordsNew.filter(w => wordsOld.includes(w)).length;
        return overlap > Math.max(wordsOld.length, wordsNew.length) * 0.4;
      });
      
      if (closeIdx !== -1) {
        oldMatched.add(closeIdx);
        result.push({
          text: newSent,
          oldText: oldSentences[closeIdx],
          type: 'modified'
        });
      } else {
        result.push({ text: newSent, type: 'added' });
      }
    }
  });
  
  oldSentences.forEach((oldSent, idx) => {
    if (!oldMatched.has(idx)) {
      result.push({ text: oldSent, type: 'removed' });
    }
  });
  
  return result;
}

// Helper to format date
const formatDate = (dateStr) => {
  if (!dateStr || dateStr === "Loading...") return "N/A";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "N/A";
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[date.getMonth()];
    const day = date.getDate();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return `${month} ${day} - ${hours}:${minutes}${ampm}`;
  } catch (e) {
    return "N/A";
  }
};

const extractDate = (jdObj) => {
  if (!jdObj) return null;
  let date = jdObj.updated_at || jdObj.updatedAt || jdObj.created_at || jdObj.createdAt;
  if (!date && Array.isArray(jdObj.history) && jdObj.history.length > 0) {
    date = jdObj.history[jdObj.history.length - 1].timestamp || jdObj.history[jdObj.history.length - 1].created_at;
  }
  if (!date && Array.isArray(jdObj.audit_history) && jdObj.audit_history.length > 0) {
    date = jdObj.audit_history[jdObj.audit_history.length - 1].timestamp;
  }
  return date;
};

const extractAuthor = (jdObj, fallbackAuthor) => {
  if (!jdObj) return fallbackAuthor || "TalentForge Creator";
  return jdObj.authorName || 
         jdObj.author || 
         jdObj.createdBy || 
         jdObj.author_name || 
         jdObj.userName || 
         jdObj.user?.full_name || 
         (Array.isArray(jdObj.history) && jdObj.history.length > 0 ? jdObj.history[0].updatedBy || jdObj.history[0].user : null) ||
         fallbackAuthor || 
         "TalentForge Creator";
};

const getJdCharacterCount = (jdObj) => {
  if (!jdObj) return 0;
  const content = jdObj.content || jdObj || {};
  
  const strip = (txt) => {
    if (!txt) return "";
    return stripHighlightTags(String(txt));
  };
  
  const getListText = (list) => {
    if (!Array.isArray(list)) return "";
    return list.map(item => {
      if (typeof item === 'string') return strip(item);
      return strip(item.title || item.point || item.duty || item.description || "");
    }).join(" ");
  };

  const s_summary = strip(content.summary || jdObj.description || jdObj.overview || "");
  const s_duties = strip(content.essential_duties_and_responsibilities || "");
  const s_resp = getListText(content.responsibilities || content.key_duties || jdObj.responsibilities || []);
  const s_core = getListText(content.core_competencies || content.coreCompetencies || jdObj.coreCompetencies || []);
  const s_func = getListText(content.functional_competencies || content.functionalCompetencies || jdObj.functionalCompetencies || []);
  const s_req = getListText(content.qualifications?.required || content.qualifications_required || jdObj.qualifications_required || []);
  const s_pref = getListText(content.qualifications?.preferred || content.qualifications_preferred || jdObj.qualifications_preferred || []);
  const s_eeo = strip(content.eeo_statement || content.eeo || "");

  const fullText = [s_summary, s_duties, s_resp, s_core, s_func, s_req, s_pref, s_eeo].filter(Boolean).join(" ");
  return fullText.length || jdObj.word_count || jdObj.wordCount || 0;
};

export default function VersionCompareView({ jd, versionHistory = [], onClose, onRestore, currentUser, onlyDiffChecker = false }) {
  const [versionsData, setVersionsData] = useState({});
  const [loadingIds, setLoadingIds] = useState(new Set());
  const [selectedVersionId, setSelectedVersionId] = useState(null);
  const [baselineVersionId, setBaselineVersionId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all"); // 'all', 'added', 'removed', 'modified', 'unchanged'
  const [viewMode, setViewMode] = useState(onlyDiffChecker ? "diffchecker" : "dashboard"); // 'dashboard' or 'diffchecker'
  const centerColRef = useRef(null);

  const handleScrollChange = (direction) => {
    if (!centerColRef.current) return;
    const elements = Array.from(centerColRef.current.querySelectorAll('.diff-change-item'));
    if (elements.length === 0) return;

    const container = centerColRef.current;
    const containerRect = container.getBoundingClientRect();
    
    // Find the height of the sticky header if present
    const stickyHeader = container.querySelector('.sticky-diff-header');
    const headerHeight = stickyHeader ? stickyHeader.offsetHeight : 0;

    let targetIndex = -1;
    const offsetThreshold = 20; // safe margin

    if (direction === 'down') {
      targetIndex = elements.findIndex(el => {
        const rect = el.getBoundingClientRect();
        return rect.top > containerRect.top + headerHeight + offsetThreshold;
      });
    } else {
      // direction === 'up'
      for (let i = elements.length - 1; i >= 0; i--) {
        const rect = elements[i].getBoundingClientRect();
        if (rect.top < containerRect.top + headerHeight + offsetThreshold - 2) {
          targetIndex = i;
          break;
        }
      }
    }

    if (targetIndex !== -1 && elements[targetIndex]) {
      const el = elements[targetIndex];
      const rect = el.getBoundingClientRect();
      // Scroll so that the element's top is aligned below the sticky header with 12px margin
      const targetScrollTop = container.scrollTop + (rect.top - containerRect.top) - headerHeight - 12;
      container.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth'
      });
    }
  };

  // Sort versions by step_index
  const sortedVersions = useMemo(() => {
    if (!versionHistory) return [];
    return [...versionHistory].sort((a, b) => (a.step_index || 0) - (b.step_index || 0));
  }, [versionHistory]);

  // Load all version details
  useEffect(() => {
    if (!sortedVersions.length) return;

    if (sortedVersions.length > 1) {
      // Set Left (newer) to the last version in history (newest version in history)
      const lastVersion = sortedVersions[sortedVersions.length - 1];
      setSelectedVersionId(lastVersion.jd_id);
      // Set Right (older) to the second last version in history
      setBaselineVersionId(sortedVersions[sortedVersions.length - 2].jd_id);
    } else {
      // If only 1 version in history, compare Master (Newer, Left) vs Version 1 (Older, Right)
      setSelectedVersionId(jd?.id);
      setBaselineVersionId(sortedVersions[0].jd_id);
    }

    // Add Master to versionsData if available
    if (jd) {
      setVersionsData(prev => ({ ...prev, [jd.id]: jd }));
    }

    // Fetch missing versions
    sortedVersions.forEach(async (v) => {
      if (!versionsData[v.jd_id] && !loadingIds.has(v.jd_id)) {
        setLoadingIds(prev => new Set(prev).add(v.jd_id));
        try {
          const vData = await jdService.getJDById(v.jd_id);
          if (vData) {
            setVersionsData(prev => ({ ...prev, [v.jd_id]: vData }));
          }
        } catch (e) {
          console.error(`Failed to fetch version ${v.jd_id}:`, e);
        } finally {
          setLoadingIds(prev => {
            const next = new Set(prev);
            next.delete(v.jd_id);
            return next;
          });
        }
      }
    });
  }, [sortedVersions, jd]);

  // Set default baseline whenever selected version changes
  const handleSelectVersion = (versionId) => {
    setSelectedVersionId(versionId);
    const leftIdx = getVersionChronologicalIndex(versionId);
    const rightIdx = getVersionChronologicalIndex(baselineVersionId);
    
    if (!baselineVersionId || leftIdx <= rightIdx) {
      if (leftIdx > 0) {
        setBaselineVersionId(sortedVersions[leftIdx - 1].jd_id);
      } else {
        setBaselineVersionId(null);
      }
    }
  };

  const getVersionChronologicalIndex = (versionId) => {
    if (versionId === jd?.id) return sortedVersions.length;
    return sortedVersions.findIndex(v => v.jd_id === versionId);
  };

  const handleToggleChecked = (id) => {
    if (selectedVersionId === id) {
      setSelectedVersionId(baselineVersionId);
      setBaselineVersionId(null);
    } else if (baselineVersionId === id) {
      setBaselineVersionId(null);
    } else {
      if (!selectedVersionId) {
        setSelectedVersionId(id);
      } else if (!baselineVersionId) {
        const id1Idx = getVersionChronologicalIndex(selectedVersionId);
        const id2Idx = getVersionChronologicalIndex(id);
        if (id1Idx < id2Idx) {
          setBaselineVersionId(selectedVersionId);
          setSelectedVersionId(id);
        } else {
          setBaselineVersionId(id);
        }
      } else {
        const oldSelected = selectedVersionId;
        const id1Idx = getVersionChronologicalIndex(oldSelected);
        const id2Idx = getVersionChronologicalIndex(id);
        if (id1Idx < id2Idx) {
          setBaselineVersionId(oldSelected);
          setSelectedVersionId(id);
        } else {
          setBaselineVersionId(id);
          setSelectedVersionId(oldSelected);
        }
      }
    }
  };

  const selectedJd = versionsData[selectedVersionId];
  const baselineJd = versionsData[baselineVersionId] || jd;

  // Diff Calculations
  const getDiffs = (section) => {
    if (!selectedJd) return [];

    let oldList = [];
    let newList = [];

    const baselineContent = baselineJd?.content || baselineJd || {};
    const selectedContent = selectedJd?.content || selectedJd || {};

    if (section === "summary") {
      return diffParagraphs(baselineContent.summary || "", selectedContent.summary || "");
    }
    if (section === "eeo") {
      return diffParagraphs(baselineContent.eeo_statement || "", selectedContent.eeo_statement || "");
    }

    // Determine target fields
    if (section === "responsibilities") {
      oldList = normalizeComplexList(baselineContent.responsibilities || baselineContent.key_duties || baselineContent.essential_duties_and_responsibilities || baselineJd?.responsibilities);
      newList = normalizeComplexList(selectedContent.responsibilities || selectedContent.key_duties || selectedContent.essential_duties_and_responsibilities || selectedJd?.responsibilities);
    } else if (section === "core_competencies") {
      oldList = normalizeComplexList(baselineContent.core_competencies || baselineContent.coreCompetencies || baselineJd?.coreCompetencies);
      newList = normalizeComplexList(selectedContent.core_competencies || selectedContent.coreCompetencies || selectedJd?.coreCompetencies);
    } else if (section === "functional_competencies") {
      oldList = normalizeComplexList(baselineContent.functional_competencies || baselineContent.functionalCompetencies || baselineJd?.functionalCompetencies);
      newList = normalizeComplexList(selectedContent.functional_competencies || selectedContent.functionalCompetencies || selectedJd?.functionalCompetencies);
    } else if (section === "qualifications_required") {
      oldList = normalizeComplexList(baselineContent.qualifications?.required || baselineContent.qualifications_required || baselineJd?.qualifications_required);
      newList = normalizeComplexList(selectedContent.qualifications?.required || selectedContent.qualifications_required || selectedJd?.qualifications_required);
    } else if (section === "qualifications_preferred") {
      oldList = normalizeComplexList(baselineContent.qualifications?.preferred || baselineContent.qualifications_preferred || baselineJd?.qualifications_preferred);
      newList = normalizeComplexList(selectedContent.qualifications?.preferred || selectedContent.qualifications_preferred || selectedJd?.qualifications_preferred);
    }

    const diffResult = [];
    const matchedOldIdx = new Set();

    // Scan for additions & modifications
    newList.forEach((itemNew) => {
      const oldIdx = oldList.findIndex((itemOld, idx) => 
        !matchedOldIdx.has(idx) && 
        itemOld.title.toLowerCase().trim() === itemNew.title.toLowerCase().trim()
      );

      if (oldIdx !== -1) {
        matchedOldIdx.add(oldIdx);
        const itemOld = oldList[oldIdx];
        const isModified = 
          itemOld.description.toLowerCase().trim() !== itemNew.description.toLowerCase().trim() ||
          itemOld.weight !== itemNew.weight;

        if (isModified) {
          diffResult.push({
            type: "modified",
            title: itemNew.title,
            description: itemNew.description,
            oldDescription: itemOld.description,
            weight: itemNew.weight,
            oldWeight: itemOld.weight
          });
        } else {
          diffResult.push({
            type: "unchanged",
            title: itemNew.title,
            description: itemNew.description,
            weight: itemNew.weight
          });
        }
      } else {
        diffResult.push({
          type: "added",
          title: itemNew.title,
          description: itemNew.description,
          weight: itemNew.weight
        });
      }
    });

    // Scan for removals
    oldList.forEach((itemOld, idx) => {
      if (!matchedOldIdx.has(idx)) {
        diffResult.push({
          type: "removed",
          title: itemOld.title,
          description: itemOld.description,
          weight: itemOld.weight
        });
      }
    });

    return diffResult;
  };

  const sectionsToCompare = [
    { id: "summary", title: "Summary Overview" },
    { id: "responsibilities", title: "Essential Duties & Responsibilities" },
    { id: "core_competencies", title: "Core Competencies" },
    { id: "functional_competencies", title: "Functional Competencies" },
    { id: "qualifications_required", title: "Required Qualifications" },
    { id: "qualifications_preferred", title: "Preferred Qualifications" },
    { id: "eeo", title: "Equal Opportunity Statement" }
  ];

  // Calculate detailed counts for the current comparison
  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    let modified = 0;

    sectionsToCompare.forEach(sec => {
      const diffs = getDiffs(sec.id);
      diffs.forEach(d => {
        if (d.type === "added") added++;
        else if (d.type === "removed") removed++;
        else if (d.type === "modified") modified++;
      });
    });

    const currentCharCount = getJdCharacterCount(selectedJd);
    const oldCharCount = getJdCharacterCount(baselineJd);
    const charCountDiff = currentCharCount - oldCharCount;

    return { added, removed, modified, charCountDiff, currentCharCount, oldCharCount };
  }, [selectedJd, baselineJd, jd]);

  const selectedVersionItem = sortedVersions.find(v => v.jd_id === selectedVersionId);
  const selectedVersionName = selectedVersionId === jd?.id 
    ? "Master Version" 
    : selectedVersionItem 
      ? `Version ${selectedVersionItem.version || (sortedVersions.indexOf(selectedVersionItem) + 1)}`
      : "Version History";

  const baselineVersionItem = sortedVersions.find(v => v.jd_id === baselineVersionId);
  const baselineVersionName = baselineVersionId === jd?.id 
    ? "Master Version" 
    : baselineVersionItem 
      ? `Version ${baselineVersionItem.version || (sortedVersions.indexOf(baselineVersionItem) + 1)}`
      : "Baseline Version";

  // Filter diff items according to filter state
  const filterDiffItems = (items) => {
    if (activeFilter === "all") return items;
    return items.filter(item => item.type === activeFilter);
  };

  const handleRestore = async (vId) => {
    const vData = versionsData[vId];
    if (!vData) return;

    const vItem = sortedVersions.find(v => v.jd_id === vId);
    const vName = vId === jd?.id 
      ? "Master Version" 
      : vItem 
        ? `Version ${vItem.version || (sortedVersions.indexOf(vItem) + 1)}`
        : "Selected Version";

    const confirmMerge = window.confirm(`Are you sure you want to merge all content from "${vName}" into the Master (Current) record? This will overwrite the current Master version.`);
    if (!confirmMerge) return;

    try {
      if (onRestore) {
        await onRestore(vId);
      } else {
        // Fallback merge logic
        const content = vData.content || vData || {};
        const masterId = jd.id;
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
          title: vData.title || vData.content?.title || jd.title
        };
        await jdService.autosaveJD(masterId, flatPayload);
        toast.success("Successfully restored version!");
        if (onClose) onClose();
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to restore version.");
    }
  };

  // Resolve user info from history
  const getVersionAuthor = (v) => {
    const vData = versionsData[v.jd_id];
    return extractAuthor(vData, v.user_name || "Creator");
  };

  const getVersionLength = (v) => {
    const vData = versionsData[v.jd_id];
    return vData ? getJdCharacterCount(vData) : 0;
  };

  const getVersionStatus = (v) => {
    const vData = versionsData[v.jd_id];
    return vData ? (vData.status || "Draft") : "In Review";
  };

  const getStatusColor = (status) => {
    const s = String(status).toLowerCase();
    if (s.includes("publish")) return "bg-emerald-500 text-emerald-600 border-emerald-500/20";
    if (s.includes("approv") || s.includes("complet")) return "bg-teal-500 text-teal-600 border-teal-500/20";
    if (s.includes("review") || s.includes("submitt") || s.includes("pending")) return "bg-amber-500 text-amber-600 border-amber-500/20";
    if (s.includes("reject") || s.includes("declin") || s.includes("returned")) return "bg-rose-500 text-rose-600 border-rose-500/20";
    return "bg-slate-500 text-slate-600 border-slate-500/20";
  };

  const getVersionDate = (v) => {
    const vData = versionsData[v.jd_id];
    const dateVal = extractDate(vData) || v.timestamp || v.updated_at || v.created_at;
    if (dateVal) return formatDate(dateVal);
    return "Loading...";
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-[#020617] rounded-[2.5rem] border border-slate-200/60 dark:border-white/5 overflow-hidden shadow-2xl relative">
      
      {/* HEADER BAR */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-slate-200/60 dark:border-white/5 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="group w-10 h-10 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200/50 flex items-center justify-center transition-all hover:scale-95"
            title="Back to Detail View"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600 group-hover:text-indigo-600 transition-colors" />
          </button>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-indigo-500 animate-pulse" />
              Version Comparison Hub
            </h2>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
              Analyze modifications, character limit trends & timeline changes
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Comparison select dropdowns */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200/60">
            <span className="text-xs font-black text-slate-400 uppercase">Compare:</span>
            <select
              value={selectedVersionId || ""}
              onChange={(e) => handleSelectVersion(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value={jd?.id}>Master (Current)</option>
              {[...sortedVersions].reverse().map((v) => {
                const vNum = sortedVersions.indexOf(v) + 1;
                return (
                  <option 
                    key={v.jd_id} 
                    value={v.jd_id}
                    disabled={getVersionChronologicalIndex(v.jd_id) === 0}
                  >
                    Version {v.version || vNum}
                  </option>
                );
              })}
            </select>
            <span className="text-xs text-slate-400 font-bold">vs</span>
            <select
              value={baselineVersionId || ""}
              onChange={(e) => setBaselineVersionId(e.target.value || null)}
              className="bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="">Select Version</option>
              {[...sortedVersions].reverse().map((v) => {
                const vNum = sortedVersions.indexOf(v) + 1;
                const isDisabled = getVersionChronologicalIndex(v.jd_id) >= getVersionChronologicalIndex(selectedVersionId);
                return (
                  <option 
                    key={v.jd_id} 
                    value={v.jd_id} 
                    disabled={isDisabled}
                  >
                    Version {v.version || vNum}
                  </option>
                );
              })}
            </select>
          </div>

          {!onlyDiffChecker && (
            <button
              onClick={() => setViewMode(prev => prev === "dashboard" ? "diffchecker" : "dashboard")}
              className="px-4 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/10 hover:bg-slate-50 hover:text-indigo-600 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
              title={viewMode === "dashboard" ? "Show side-by-side diff checker" : "Show standard comparison dashboard"}
            >
              {viewMode === "dashboard" ? (
                <>
                  <Columns className="w-4 h-4 text-slate-500 hover:text-indigo-500" />
                  See Diff Checker
                </>
              ) : (
                <>
                  <Split className="w-4 h-4 text-slate-500 hover:text-indigo-500" />
                  See Dashboard
                </>
              )}
            </button>
          )}

          {!onlyDiffChecker && (
            <button
              onClick={() => selectedVersionId && handleRestore(selectedVersionId)}
              disabled={!selectedVersionId || selectedVersionId === jd?.id}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md ${
                (!selectedVersionId || selectedVersionId === jd?.id)
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
              title={`Merge ${selectedVersionName !== "Master Version" && selectedVersionName !== "Version History" ? selectedVersionName : "Selected Version"} into the Master record`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${(!selectedVersionId || selectedVersionId === jd?.id) ? "" : "animate-spin-slow"}`} />
              Merge {selectedVersionName !== "Master Version" && selectedVersionName !== "Version History" ? selectedVersionName : "Selected"} to Master
            </button>
          )}

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all"
          >
            Exit Compare Mode
          </button>
        </div>
      </div>

      {/* DASHBOARD LAYOUT */}
      <div className="grid grid-cols-12 flex-1 overflow-hidden">
        
        {/* LEFT COLUMN: TIMELINE */}
        {!onlyDiffChecker && (
          <div className="col-span-12 lg:col-span-3 border-r border-slate-200/60 dark:border-white/5 overflow-y-auto p-6 bg-white/40">
            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-6">
              VERSION TIMELINE
            </h3>

            <div className="relative pl-6 space-y-6">
              {/* Timeline thread connector */}
              <div className="absolute left-[9px] top-3 bottom-6 w-[2px] bg-slate-200/60 dark:bg-white/5" />

              {/* Master JD node at base */}
              <div 
                onClick={() => handleToggleChecked(jd?.id)}
                className={`relative p-4 rounded-2xl border transition-all cursor-pointer ${
                  selectedVersionId === jd?.id 
                    ? "bg-indigo-50 border-indigo-200 shadow-md scale-[1.02]" 
                    : baselineVersionId === jd?.id
                      ? "bg-slate-50 border-slate-300 border-dashed"
                      : "bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200"
                }`}
              >
                <div className={`absolute left-[-22px] top-[18px] w-3 h-3 rounded-full border-2 z-10 transition-colors ${
                  selectedVersionId === jd?.id 
                    ? "border-indigo-500 bg-indigo-500" 
                    : baselineVersionId === jd?.id
                      ? "border-slate-400 bg-slate-400"
                      : "border-slate-200 bg-white"
                }`} />
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedVersionId === jd?.id || baselineVersionId === jd?.id}
                      onChange={() => handleToggleChecked(jd?.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer border-slate-300"
                    />
                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">Master (Current)</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black border uppercase tracking-wider ${getStatusColor(jd?.status)}`}>
                    {jd?.status || "Live"}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-bold mb-2">Original repository master</p>
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                  <span>Length: {getJdCharacterCount(jd)} chars</span>
                  {selectedVersionId === jd?.id && (
                    <span className="text-[8px] bg-indigo-500 text-white font-black px-1.5 py-0.5 rounded uppercase tracking-widest">Target (Newer)</span>
                  )}
                  {baselineVersionId === jd?.id && (
                    <span className="text-[8px] bg-slate-600 text-white font-black px-1.5 py-0.5 rounded uppercase tracking-widest">Baseline (Older)</span>
                  )}
                </div>
              </div>

              {/* History Nodes */}
              {[...sortedVersions].reverse().map((v, idx) => {
                const isActive = selectedVersionId === v.jd_id;
                const isBaseline = baselineVersionId === v.jd_id;
                const isChecked = isActive || isBaseline;
                const author = getVersionAuthor(v);
                const length = getVersionLength(v);
                const status = getVersionStatus(v);
                const dateText = getVersionDate(v);
                const isLoading = loadingIds.has(v.jd_id);

                return (
                  <div 
                    key={v.jd_id}
                    onClick={() => handleToggleChecked(v.jd_id)}
                    className={`relative p-4 rounded-2xl border transition-all cursor-pointer ${
                      isActive 
                        ? "bg-indigo-50 border-indigo-200 shadow-md scale-[1.02]" 
                        : isBaseline 
                          ? "bg-slate-50 border-slate-300 border-dashed"
                          : "bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200 shadow-sm"
                    }`}
                  >
                    {/* Visual Node */}
                    <div className={`absolute left-[-22px] top-[18px] w-3 h-3 rounded-full border-2 z-10 transition-colors ${
                      isActive 
                        ? "border-indigo-500 bg-indigo-500" 
                        : isBaseline 
                          ? "border-slate-400 bg-slate-400" 
                          : "border-slate-200 bg-white"
                    }`} />

                    {isLoading ? (
                      <div className="animate-pulse space-y-2">
                        <div className="h-4 bg-slate-200 rounded w-2/3" />
                        <div className="h-3 bg-slate-200 rounded w-1/2" />
                      </div>
                    ) : (
                      <div>
                        <div className="flex justify-between items-start mb-1.5">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleChecked(v.jd_id)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer border-slate-300"
                            />
                            <span className="text-xs font-black text-slate-900 dark:text-white tracking-tight uppercase">
                              Version {v.version || sortedVersions.length - idx}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black border uppercase tracking-wider ${getStatusColor(status)}`}>
                            {status}
                          </span>
                        </div>
                        
                        <div className="space-y-1 mb-3">
                          <p className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {dateText}
                          </p>
                          <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                            <User className="w-3 h-3 text-indigo-500" /> By {author}
                          </p>
                        </div>

                        {v.comment && (
                          <p className="text-[10px] italic font-semibold text-slate-500 dark:text-slate-400 leading-snug bg-slate-50/50 p-2 rounded-xl mb-3 border border-slate-100">
                            &ldquo;{v.comment}&rdquo;
                          </p>
                        )}

                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-extrabold text-indigo-600 dark:text-indigo-400">Length: {length} chars</span>
                          {isActive && (
                            <span className="text-[8px] bg-indigo-500 text-white font-black px-1.5 py-0.5 rounded uppercase tracking-widest">Target (Newer)</span>
                          )}
                          {isBaseline && (
                            <span className="text-[8px] bg-slate-600 text-white font-black px-1.5 py-0.5 rounded uppercase tracking-widest">Baseline (Older)</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CENTER COLUMN: DIFF VIEW */}
        <div 
          ref={centerColRef}
          className={`overflow-y-auto ${viewMode === 'diffchecker' ? 'p-8' : 'px-8 pb-8 pt-0'} flex flex-col bg-white transition-all duration-300 ${
            onlyDiffChecker 
              ? "col-span-12" 
              : viewMode === "diffchecker" 
                ? "col-span-12 lg:col-span-9" 
                : "col-span-12 lg:col-span-6"
          }`}
        >
          
          {viewMode === "diffchecker" ? (
            <div className="flex-grow flex flex-col space-y-8">
              {/* SIDE-BY-SIDE DIFF SUMMARY HEADER */}
              <div className="grid grid-cols-2 gap-6 shrink-0">
                <div className="bg-rose-50/50 dark:bg-rose-950/15 border border-rose-200/50 dark:border-rose-900/30 px-6 py-4 rounded-[2rem] flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-black">
                      -
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-rose-800 dark:text-rose-300 uppercase tracking-widest">Removals</h4>
                      <p className="text-lg font-black text-rose-900 dark:text-rose-200 mt-0.5">{stats.removed} items</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest bg-rose-100/50 dark:bg-rose-950/30 px-3 py-1 rounded-xl">
                    Original ({baselineVersionName})
                  </span>
                </div>

                <div className="bg-emerald-50/50 dark:bg-emerald-950/15 border border-emerald-200/50 dark:border-emerald-900/30 px-6 py-4 rounded-[2rem] flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
                      +
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-widest">Additions</h4>
                      <p className="text-lg font-black text-emerald-900 dark:text-emerald-200 mt-0.5">{stats.added} items</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-100/50 dark:bg-emerald-950/30 px-3 py-1 rounded-xl">
                    Changed ({selectedVersionName})
                  </span>
                </div>
              </div>

              {/* RENDER DIFF SECTIONS SIDE BY SIDE */}
              <div className="space-y-8">
                {sectionsToCompare.map((sec) => {
                  const diffItems = getDiffs(sec.id);
                  const isNarrative = ["summary", "eeo"].includes(sec.id);

                  if (diffItems.length === 0) return null;

                  return (
                    <div key={sec.id} className="border border-slate-100 dark:border-white/5 p-6 rounded-3xl bg-slate-50/10 space-y-4">
                      {/* Section Title */}
                      <div className="bg-slate-100/60 dark:bg-white/5 px-4 py-2 rounded-xl text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        {sec.title}
                      </div>

                      {/* Side by Side Diff Rows */}
                      <div className="space-y-3">
                        {isNarrative ? (
                          // Narrative Paragraph split diff row alignment
                          diffItems.map((item, idx) => {
                            const isAdded = item.type === "added";
                            const isRemoved = item.type === "removed";
                            const isModified = item.type === "modified";

                            return (
                              <div key={idx} className="grid grid-cols-2 gap-4 items-stretch text-sm leading-relaxed whitespace-pre-wrap">
                                {/* Left Side: Original sentence */}
                                <div className={`p-4 rounded-2xl border flex flex-col justify-center ${
                                  isAdded
                                    ? "bg-[repeating-linear-gradient(-45deg,rgba(0,0,0,0.03),rgba(0,0,0,0.03)_8px,transparent_8px,transparent_16px)] dark:bg-[repeating-linear-gradient(-45deg,rgba(255,255,255,0.01),rgba(255,255,255,0.01)_8px,transparent_8px,transparent_16px)] border-dashed border-slate-200 dark:border-white/5 opacity-40 min-h-[50px]"
                                    : isRemoved
                                      ? "bg-rose-50 text-rose-800 dark:bg-rose-950/20 dark:text-rose-300 border-rose-200/50 dark:border-rose-500/10 line-through"
                                      : isModified
                                        ? "bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-300 border-amber-200/50 dark:border-amber-500/10"
                                        : "bg-white dark:bg-[#0f172a] border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-400"
                                }`}>
                                  {!isAdded && (
                                    <span>
                                      {isRemoved ? "- " : isModified ? "~ " : ""}
                                      {isModified ? item.oldText : item.text}
                                    </span>
                                  )}
                                </div>

                                {/* Right Side: Changed sentence */}
                                <div className={`p-4 rounded-2xl border flex flex-col justify-center ${
                                  isRemoved
                                    ? "bg-[repeating-linear-gradient(-45deg,rgba(0,0,0,0.03),rgba(0,0,0,0.03)_8px,transparent_8px,transparent_16px)] dark:bg-[repeating-linear-gradient(-45deg,rgba(255,255,255,0.01),rgba(255,255,255,0.01)_8px,transparent_8px,transparent_16px)] border-dashed border-slate-200 dark:border-white/5 opacity-40 min-h-[50px]"
                                    : isAdded
                                      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-500/10"
                                      : isModified
                                        ? "bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-300 border-amber-200/50 dark:border-amber-500/10"
                                        : "bg-white dark:bg-[#0f172a] border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-400"
                                }`}>
                                  {!isRemoved && (
                                    <span>
                                      {isAdded ? "+ " : isModified ? "~ " : ""}
                                      {item.text}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          // List item row alignment
                          diffItems.map((item, idx) => {
                            const isAdded = item.type === "added";
                            const isRemoved = item.type === "removed";
                            const isModified = item.type === "modified";

                            return (
                              <div key={idx} className="grid grid-cols-2 gap-4 items-stretch">
                                {/* Left Side: Original item */}
                                <div className={`p-4 rounded-2xl border flex flex-col justify-center ${
                                  isAdded
                                    ? "bg-[repeating-linear-gradient(-45deg,rgba(0,0,0,0.03),rgba(0,0,0,0.03)_8px,transparent_8px,transparent_16px)] dark:bg-[repeating-linear-gradient(-45deg,rgba(255,255,255,0.01),rgba(255,255,255,0.01)_8px,transparent_8px,transparent_16px)] border-dashed border-slate-200 dark:border-white/5 opacity-40 min-h-[60px]"
                                    : isRemoved
                                      ? "bg-rose-50 text-rose-800 dark:bg-rose-950/20 dark:text-rose-300 border-rose-200/50 dark:border-rose-500/10 line-through"
                                      : isModified
                                        ? "bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-300 border-amber-200/50 dark:border-amber-500/10"
                                        : "bg-white dark:bg-[#0f172a] border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-400"
                                }`}>
                                  {!isAdded && (
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-black">{isRemoved ? "- " : isModified ? "~ " : ""}</span>
                                        <h5 className="text-xs font-bold uppercase tracking-tight">{item.title}</h5>
                                      </div>
                                      {(isModified ? item.oldDescription : item.description) && (
                                        <p className="text-[10px] italic leading-relaxed text-slate-500">{isModified ? item.oldDescription : item.description}</p>
                                      )}
                                      {item.weight > 0 && (
                                        <span className="text-[9px] font-black text-indigo-500 block">Weight: {isModified ? item.oldWeight : item.weight}%</span>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Right Side: Changed item */}
                                <div className={`p-4 rounded-2xl border flex flex-col justify-center ${
                                  isRemoved
                                    ? "bg-[repeating-linear-gradient(-45deg,rgba(0,0,0,0.03),rgba(0,0,0,0.03)_8px,transparent_8px,transparent_16px)] dark:bg-[repeating-linear-gradient(-45deg,rgba(255,255,255,0.01),rgba(255,255,255,0.01)_8px,transparent_8px,transparent_16px)] border-dashed border-slate-200 dark:border-white/5 opacity-40 min-h-[60px]"
                                    : isAdded
                                      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-500/10"
                                      : isModified
                                        ? "bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-300 border-amber-200/50 dark:border-amber-500/10"
                                        : "bg-white dark:bg-[#0f172a] border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-400"
                                }`}>
                                  {!isRemoved && (
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-black">{isAdded ? "+ " : isModified ? "~ " : ""}</span>
                                        <h5 className="text-xs font-bold uppercase tracking-tight">{item.title}</h5>
                                      </div>
                                      {item.description && (
                                        <p className="text-[10px] italic leading-relaxed text-slate-500">{item.description}</p>
                                      )}
                                      {item.weight > 0 && (
                                        <span className="text-[9px] font-black text-indigo-500 block">Weight: {item.weight}%</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {/* STICKY HEADER WRAPPER */}
              <div className="sticky-diff-header sticky top-0 z-10 bg-white/95 dark:bg-[#020617]/95 backdrop-blur-md pt-8 pb-4 mb-6 -mx-8 px-8 border-b border-slate-100 dark:border-white/5">
                {/* DIFF FILTER BAR */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100/60 dark:border-white/5 mb-4">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <Eye className="w-4 h-4 text-slate-500" />
                    Diff Dashboard
                  </h3>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 p-1 bg-slate-50 border border-slate-200/50 rounded-xl">
                    {[
                      { id: "all", label: "All Changes", style: "hover:bg-slate-200" },
                      { id: "added", label: "+ Added", style: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/10 hover:bg-emerald-100/50" },
                      { id: "removed", label: "- Removed", style: "text-rose-600 bg-rose-50 dark:bg-rose-950/20 border border-rose-500/10 hover:bg-rose-100/50" },
                      { id: "modified", label: "~ Modified", style: "text-amber-600 bg-amber-50 dark:bg-amber-950/20 border border-amber-500/10 hover:bg-amber-100/50" },
                      { id: "unchanged", label: "Unchanged", style: "text-slate-500 hover:bg-slate-200" }
                    ].map(pill => (
                      <button
                        key={pill.id}
                        onClick={() => setActiveFilter(pill.id)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                          activeFilter === pill.id 
                            ? "bg-slate-900 text-white shadow-sm" 
                            : pill.style
                        }`}
                      >
                        {pill.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* COMPARISON BANNER */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-50/40 dark:bg-indigo-950/25 border border-indigo-100/50 dark:border-indigo-500/10 rounded-2xl mb-0">
                  <div className="flex items-center gap-2.5">
                    <GitCompare className="w-4 h-4 text-indigo-500 animate-pulse" />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      Comparing Target: <span className="font-extrabold text-indigo-600 dark:text-indigo-400 uppercase">{selectedVersionName} (Newer)</span> ➔ Baseline: <span className="font-extrabold text-slate-800 dark:text-white uppercase">{baselineVersionName} (Older)</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1 border-l border-indigo-100/80 dark:border-indigo-500/20 pl-2.5 ml-2">
                    <button
                      onClick={() => handleScrollChange('up')}
                      className="p-1 rounded-lg hover:bg-indigo-100/80 dark:hover:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 transition-all hover:scale-105 active:scale-95"
                      title="Previous change"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleScrollChange('down')}
                      className="p-1 rounded-lg hover:bg-indigo-100/80 dark:hover:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 transition-all hover:scale-105 active:scale-95"
                      title="Next change"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* RENDER DIFF SECTIONS */}
              <div className="space-y-10 flex-1">
                {sectionsToCompare.map((sec) => {
                  const diffItems = getDiffs(sec.id);
                  const filteredItems = filterDiffItems(diffItems);
                  const isNarrative = ["summary", "eeo"].includes(sec.id);

                  if (filteredItems.length === 0) return null;

                  return (
                    <section key={sec.id} className="space-y-4 border border-slate-100 p-6 rounded-3xl bg-slate-50/30">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <div className="w-1.5 h-3.5 bg-indigo-500 rounded-full" />
                          {sec.title}
                        </h4>
                        <span className="text-[10px] font-bold text-slate-400">
                          {filteredItems.length} items
                        </span>
                      </div>

                      {/* Render elements */}
                      <div className="space-y-3">
                        {isNarrative ? (
                          // Narrative/Paragraph Diff (split by sentences)
                          <div className="bg-white p-5 rounded-2xl border border-slate-100 text-sm leading-relaxed whitespace-pre-wrap text-slate-600 space-y-2">
                            {filteredItems.map((item, idx) => {
                              if (item.type === "added") {
                                return (
                                  <ins key={idx} className="diff-change-item bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded no-underline block">
                                    + {item.text}
                                  </ins>
                                );
                              }
                              if (item.type === "removed") {
                                return (
                                  <del key={idx} className="diff-change-item bg-rose-50 text-rose-800 line-through dark:bg-rose-950/20 dark:text-rose-300 border border-rose-500/20 px-2 py-0.5 rounded block">
                                    - {item.text}
                                  </del>
                                );
                              }
                              if (item.type === "modified") {
                                return (
                                  <span key={idx} className="diff-change-item bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-300 border border-amber-500/20 px-2 py-1 rounded block">
                                    ~ {item.text} 
                                    <span className="block text-xs font-semibold text-amber-600/70 mt-1">
                                      [was: {item.oldText}]
                                    </span>
                                  </span>
                                );
                              }
                              return <span key={idx} className="block">{item.text} </span>;
                            })}
                          </div>
                        ) : (
                          // List Diffs
                          filteredItems.map((item, idx) => {
                            const isAdded = item.type === "added";
                            const isRemoved = item.type === "removed";
                            const isModified = item.type === "modified";
                            const isChange = isAdded || isRemoved || isModified;
                            
                            let styleClass = "bg-white border-slate-100";
                            if (isAdded) styleClass = "bg-emerald-50/50 border-emerald-200 text-emerald-800";
                            if (isRemoved) styleClass = "bg-rose-50/50 border-rose-200 text-rose-800 line-through";
                            if (isModified) styleClass = "bg-amber-50/50 border-amber-200 text-amber-800";

                            return (
                              <div 
                                key={idx} 
                                className={`flex gap-4 items-start p-4 rounded-2xl border transition-all ${styleClass} ${isChange ? "diff-change-item" : ""}`}
                              >
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black">
                                      {isAdded ? "+ " : isRemoved ? "- " : isModified ? "~ " : ""}
                                    </span>
                                    <h5 className="text-xs font-bold uppercase tracking-tight">
                                      {item.title}
                                    </h5>
                                  </div>
                                  {item.description && (
                                    <p className={`text-[11px] font-medium leading-relaxed italic ${
                                      isRemoved ? "text-rose-500" : isAdded ? "text-emerald-600" : "text-slate-500"
                                    }`}>
                                      {item.description}
                                    </p>
                                  )}
                                  {isModified && item.oldDescription && (
                                    <p className="text-[10px] text-amber-600/70 italic font-semibold leading-relaxed">
                                      [was: {item.oldDescription}]
                                    </p>
                                  )}
                                </div>
                                
                                {/* Weight badge if any */}
                                {item.weight > 0 && (
                                  <div className="w-16 shrink-0 text-right border-l border-slate-200/50 pl-3">
                                    <span className="text-xs font-black text-indigo-500">{item.weight}%</span>
                                    {isModified && item.oldWeight !== item.weight && (
                                      <span className="block text-[8px] text-slate-400 font-semibold line-through">
                                        {item.oldWeight}%
                                      </span>
                                    )}
                                    <span className="block text-[7px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Weight</span>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>

              {/* BOTTOM DIFFERENCE BANNER */}
              <div className={`mt-8 p-6 rounded-[2rem] border flex items-center justify-between shadow-sm relative overflow-hidden shrink-0 ${
                stats.charCountDiff > 0 
                  ? "bg-emerald-50/40 border-emerald-200 text-emerald-800" 
                  : stats.charCountDiff < 0 
                    ? "bg-rose-50/40 border-rose-200 text-rose-800" 
                    : "bg-indigo-50/40 border-indigo-200 text-indigo-800"
              }`}>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-tight">Character Count Delta</h4>
                  <p className="text-xs font-medium opacity-80 mt-0.5">
                    Comparing selected version character count against baseline version (Max 3990)
                  </p>
                </div>
                
                <div className="text-right">
                  <div className="text-2xl font-black tracking-tighter">
                    {stats.oldCharCount} &rarr; {stats.currentCharCount} 
                    <span className={`ml-2 text-base px-2.5 py-0.5 rounded-lg border font-black inline-block ${
                      stats.charCountDiff > 0 
                        ? "bg-emerald-500 text-white border-emerald-600 shadow-sm" 
                        : stats.charCountDiff < 0 
                          ? "bg-rose-500 text-white border-rose-600 shadow-sm" 
                          : "bg-indigo-500 text-white border-indigo-600 shadow-sm"
                    }`}>
                      {stats.charCountDiff >= 0 ? `+${stats.charCountDiff}` : stats.charCountDiff} chars
                    </span>
                  </div>
                </div>
              </div>

              {/* SCROLL TO TOP BUTTON */}
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => centerColRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 group hover:scale-105 active:scale-95"
                >
                  <ChevronUp className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                  Scroll to Top
                </button>
              </div>
            </>
          )}

        </div>

        {/* RIGHT COLUMN: METADATA & ANALYTICS */}
        {!onlyDiffChecker && viewMode !== "diffchecker" && (
          <div className="col-span-12 lg:col-span-3 border-l border-slate-200/60 dark:border-white/5 overflow-y-auto p-6 flex flex-col justify-between bg-white/40">
            
            <div className="space-y-8">
              {/* CURRENT SELECTED VERSION DETAILS */}
              <div className="bg-white dark:bg-[#0f172a] rounded-[2rem] p-6 border border-slate-200/60 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Selected</h4>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5 uppercase tracking-tight">
                      {selectedVersionName}
                    </h3>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${
                    selectedJd?.id === jd?.id ? "bg-emerald-500" : "bg-indigo-500"
                  } animate-pulse`} />
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Character Count</span>
                    <p className={`text-xs font-black mt-1.5 ${stats.currentCharCount > 3990 ? "text-rose-600" : "text-slate-900"}`}>{stats.currentCharCount} / 3990</p>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                      <div 
                        className={`h-1.5 rounded-full transition-all duration-500 ${stats.currentCharCount > 3990 ? "bg-rose-500" : "bg-indigo-500"}`} 
                        style={{ width: `${Math.min((stats.currentCharCount / 3990) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Status</span>
                    <p className="text-xs font-black text-slate-700 capitalize mt-1.5">{selectedJd?.status || "Published"}</p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 space-y-2">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Last Modified By</span>
                  <p className="text-xs font-bold text-slate-700">{selectedJd ? getVersionAuthor({ jd_id: selectedJd.id }) : "TalentForge"}</p>
                  <p className="text-[10px] text-slate-400 font-semibold">{selectedJd ? formatDate(selectedJd.updated_at || selectedJd.updatedAt || selectedJd.created_at || selectedJd.createdAt) : ""}</p>
                </div>
              </div>

              {/* CHARACTERS OVER VERSIONS VERTICAL BAR CHART */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                  CHARACTERS OVER VERSIONS
                </h4>
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-sm h-48 flex items-end justify-between gap-2">
                  
                  {/* Fallback Master Bar */}
                  <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end group cursor-pointer"
                    onClick={() => setSelectedVersionId(jd?.id)}
                  >
                    <div className="relative w-full h-full flex items-end">
                      <div 
                        className={`w-full rounded-t-lg transition-all duration-500 shadow-inner ${
                          selectedVersionId === jd?.id
                            ? "bg-indigo-500 shadow-indigo-500/20 scale-x-110"
                            : getJdCharacterCount(jd) > 3990
                              ? "bg-rose-400 group-hover:bg-rose-500"
                              : "bg-slate-200 group-hover:bg-slate-300"
                        }`}
                        style={{ height: `${Math.min((getJdCharacterCount(jd) / 3990) * 100, 100)}%` }}
                        title={`Master: ${getJdCharacterCount(jd)} characters`}
                      />
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-wider ${
                      selectedVersionId === jd?.id ? "text-indigo-600 font-black" : "text-slate-400"
                    }`}>Mst</span>
                  </div>

                  {/* History bars */}
                  {sortedVersions.map((v, i) => {
                    const lenVal = getVersionLength(v);
                    const isCurrentBar = selectedVersionId === v.jd_id;

                    return (
                      <div 
                        key={v.jd_id} 
                        className="flex-1 flex flex-col items-center gap-2 h-full justify-end group cursor-pointer"
                        onClick={() => handleSelectVersion(v.jd_id)}
                      >
                        <div className="relative w-full h-full flex items-end">
                          <div 
                            className={`w-full rounded-t-lg transition-all duration-500 shadow-inner ${
                              isCurrentBar 
                                ? "bg-indigo-500 shadow-indigo-500/20 scale-x-110" 
                                : lenVal > 3990
                                  ? "bg-rose-400 group-hover:bg-rose-500"
                                  : "bg-slate-200 group-hover:bg-slate-300"
                            }`}
                            style={{ height: `${Math.min((lenVal / 3990) * 100, 100)}%` }}
                            title={`Version ${v.version || i + 1}: ${lenVal} characters`}
                          />
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-wider ${
                          isCurrentBar ? "text-indigo-600 font-black" : "text-slate-400"
                        }`}>v{v.version || i + 1}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CHANGE SUMMARY TABLE */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                  CHANGE SUMMARY
                </h4>
                
                <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-sm overflow-hidden text-xs font-bold text-slate-600">
                  <div className="flex justify-between items-center p-4 border-b border-slate-100">
                    <span>Sections Added</span>
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-black text-2xs">{stats.added}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 border-b border-slate-100">
                    <span>Sections Removed</span>
                    <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-black text-2xs">{stats.removed}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 border-b border-slate-100">
                    <span>Modified Entries</span>
                    <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-black text-2xs">{stats.modified}</span>
                  </div>
                  <div className="flex justify-between items-center p-4">
                    <span>Delta Characters</span>
                    <span className={`px-2 py-0.5 rounded font-black text-2xs ${
                      stats.charCountDiff >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                    }`}>
                      {stats.charCountDiff >= 0 ? `+${stats.charCountDiff}` : stats.charCountDiff} chars
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ACTION BUTTON CONTAINER */}
            <div className="pt-6 mt-6 border-t border-slate-200/50 space-y-3">
              <button
                onClick={onClose}
                className="w-full py-3.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-[1.5rem] font-black uppercase text-xs tracking-wider transition-all active:scale-98"
              >
                Close
              </button>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
