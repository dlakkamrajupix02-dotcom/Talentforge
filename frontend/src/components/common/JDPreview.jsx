//  import EditableList from "./EditableList";

// import EmptyJDState from "./EmptyJDState";



// export default function JDPreview({ jd, setJD }) {



//   if (!jd) return  <EmptyJDState />;



//   return (

//     <div className="space-y-8">



//       {/* HEADER */}



//       <div>

//         <h2 className="text-xl font-semibold">

//           {jd.title}

//         </h2>

//       </div>



//       {/* SUMMARY */}



//       <div>



//         <div className="flex justify-between items-center">



//           <h3 className="font-semibold">Summary</h3>



//           <button className="text-blue-600 text-sm">

//             Regenerate

//           </button>



//         </div>



//         <textarea

//           className="border w-full p-2 mt-2"

//           value={jd.summary}

//           onChange={(e) =>

//             setJD({ ...jd, summary: e.target.value })

//           }

//         />



//       </div>



//       {/* RESPONSIBILITIES */}



//       <div>



//         <div className="flex justify-between">



//           <h3 className="font-semibold">

//             Responsibilities

//           </h3>



//           <button className="text-blue-600 text-sm">

//             Regenerate

//           </button>



//         </div>



//         <EditableList

//           items={jd.responsibilities}

//           setItems={(items) =>

//             setJD({ ...jd, responsibilities: items })

//           }

//         />



//       </div>



//       {/* QUALIFICATIONS */}



//       <div>



//         <div className="flex justify-between">



//           <h3 className="font-semibold">

//             Qualifications

//           </h3>



//           <button className="text-blue-600 text-sm">

//             Regenerate

//           </button>



//         </div>



//         {/* REQUIRED */}



//         <h4 className="mt-3 text-sm font-medium">

//           Required

//         </h4>



//         <EditableList

//         items={jd?.qualifications?.required || []}

//           setItems={(items) =>

//             setJD({

//               ...jd,

//               qualifications: {

//                 ...jd.qualifications,

//                 required: items

//               }

//             })

//           }

//         />



//         {/* PREFERRED */}



//         <h4 className="mt-4 text-sm font-medium">

//           Preferred

//         </h4>



//         <EditableList

//          items={jd?.qualifications?.preferred || []}

//           setItems={(items) =>

//             setJD({

//               ...jd,

//               qualifications: {

//                 ...jd.qualifications,

//                 preferred: items

//               }

//             })

//           }

//         />



//       </div>



//       {/* EEO STATEMENT */}



//       <div>



//         <h3 className="font-semibold">

//           Equal Opportunity Statement

//         </h3>



//         <p className="text-sm text-gray-500">

//           This standard EEOC footer is required for all job postings.

//         </p>



//         <textarea

//           className="border w-full p-2 mt-2"

//           value={jd.eeo_statement}

//           onChange={(e) =>

//             setJD({

//               ...jd,

//               eeo_statement: e.target.value

//             })

//           }

//         />



//       </div>



//     </div>

//   );

// }



import { useState, useRef, useEffect, useContext } from "react";

import {

  FileText,

  Sparkles,

  RefreshCw,

  CheckCircle2,

  AlertCircle,

  Building2,

  MapPin,

  Briefcase,

  Clock,

  DollarSign,

  Users,

  Edit3,

  AlignLeft,

  List,

  X,

  Lock,

  Unlock,

  Send,

  Wand2,

  MessageSquare,

  Bot,

  Printer,

  Layers,

  Upload,

  Image,

  Loader2,

  Eye,

  EyeOff,

  GripVertical

} from "lucide-react";

import { Search, ChevronDown, Check, Save, Zap, Edit2, PlayCircle, Plus, Trash2, Cloud, CloudOff } from "lucide-react";

import { Reorder } from "framer-motion";

import * as organizationService from "../../services/organizationService";

import EditableList from "./EditableList";

import WeightedEditableList from "./WeightedEditableList";

import AddSectionModal from "./AddSectionModal";

import EmptyJDState from "./EmptyJDState";

import { JDContext } from "../../context/JDContext";

import {

  updateSection,

  regenerateSection,

  regeneratePoint,
  
  deleteSection

} from "../../services/jdService";

import { BASE_URL } from "../../services/apiClient";

import toast from "react-hot-toast";

import AIPromptModal from "./AIPromptModal";

import { formatSalaryRange, formatJDText, stripHighlightTags, isStableSection, unwrapSectionData, sectionTextValue, isWeightedSectionData, normalizeForEditableList, normalizeForWeightedList, toBackendSectionData, resolveSectionMeta, resolvePushToCsod, deleteAndReindexStableSections, resolveSectionsOrder, resolveSectionObject, resolveWeightLockState, resolveWeightLockKey, applySectionsOrder, normalizeSectionsOrder, isSectionContentEmpty, prepareRegeneratePayload, normalizeRegeneratedSectionContent } from "../../utils/formatJD";



const extractText = (item) => {

  if (!item) return "";

  if (typeof item === "string") return stripHighlightTags(item);

  if (typeof item === "object") {

    const val = item.title || item.point || item.duty || item.description ||

      item.summary || item.text || item.message || "";

    return stripHighlightTags(String(val || ""));

  }

  return String(item);

};



const renderHighlightedText = (text) => {

  if (!text || typeof text !== 'string') return text;



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





// Image Library Modal Component

function ImageLibraryModal({ isOpen, onClose, onSelect }) {

  const [images, setImages] = useState([]);

  const [isLoading, setIsLoading] = useState(false);



  useEffect(() => {

    if (isOpen) {

      fetchImages();

    }

  }, [isOpen]);



  const fetchImages = async () => {

    setIsLoading(true);

    try {

      const response = await organizationService.listOrgImages();

      // Handle both raw array and object-wrapped responses (e.g. {images: [], total: 0})

      const list = Array.isArray(response) ? response : (response?.images || response?.data?.images || response?.data || []);

      setImages(Array.isArray(list) ? list : []);

    } catch (error) {

      console.error("Failed to fetch images:", error);

      toast.error("Could not load image library.");

    } finally {

      setIsLoading(false);

    }

  };



  if (!isOpen) return null;



  return (

    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">

      <div

        className="absolute inset-0 bg-slate-900/60 dark:bg-[#020617]/90 backdrop-blur-md animate-in fade-in duration-300"

        onClick={onClose}

      />



      <div className="relative w-full max-w-4xl bg-white dark:bg-[#0f172a] rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">

        <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">

          <div>

            <h3 className="font-black text-xl text-slate-900 dark:text-white flex items-center gap-3">

              <Image className="w-6 h-6 text-indigo-500" /> Brand Asset Library

            </h3>

            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Select an approved brand logo</p>

          </div>

          <button

            onClick={onClose}

            className="p-3 hover:bg-slate-100 dark:hover:bg-white/5 rounded-2xl transition-all active:scale-90"

          >

            <X className="w-5 h-5 text-slate-400" />

          </button>

        </div>



        <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">

          {isLoading ? (

            <div className="py-20 flex flex-col items-center justify-center gap-4">

              <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />

              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Syncing Library...</p>

            </div>

          ) : images.length === 0 ? (

            <div className="py-20 flex flex-col items-center justify-center text-center">

              <div className="w-20 h-20 bg-slate-50 dark:bg-white/5 rounded-[2rem] flex items-center justify-center text-slate-200 dark:text-slate-800 mb-6 border border-slate-100 dark:border-white/5">

                <Image className="w-10 h-10" />

              </div>

              <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Library is empty</h4>

              <p className="text-sm text-slate-400 dark:text-slate-500 max-w-sm">Contact your administrator to upload brand assets in the Settings panel.</p>

            </div>

          ) : (

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">

              {images.map((img) => (

                <button

                  key={img.id}

                  onClick={() => onSelect(img.image_url.startsWith('http') ? img.image_url : BASE_URL + img.image_url)}

                  className="group relative flex flex-col items-center bg-slate-50 dark:bg-[#020617] rounded-3xl border border-slate-100 dark:border-white/5 p-4 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 active:scale-95 overflow-hidden"

                >

                  <div className="aspect-square w-full flex items-center justify-center bg-white dark:bg-white/5 rounded-2xl mb-3 shadow-inner group-hover:scale-105 transition-transform duration-500">

                    <img

                      src={img.image_url.startsWith('http') ? img.image_url : BASE_URL + img.image_url}

                      alt={img.label}

                      className="max-w-[80%] max-h-[80%] object-contain"

                    />

                  </div>

                  <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tight text-center truncate w-full p-1 group-hover:text-indigo-500 transition-colors">

                    {img.label}

                  </span>



                  {/* Selection Indicator */}

                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">

                    <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white shadow-lg">

                      <CheckCircle2 className="w-3.5 h-3.5" />

                    </div>

                  </div>

                </button>

              ))}

            </div>

          )}

        </div>



        <div className="p-6 bg-slate-50/50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 flex justify-end">

          <button

            onClick={onClose}

            className="px-8 py-3 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-black text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all shadow-sm"

          >

            CLOSE

          </button>

        </div>

      </div>

    </div>

  );

}



// Section Header with AI Prompt Trigger

function SectionHeader({ title, icon: Icon, onRegenerate, isGenerating, itemCount, description, readOnly, hasWeights, weightLocked, onToggleWeightLock, hasSectionLock, sectionLocked, onToggleSectionLock, hideVisibilityToggles, onTitleChange, onDeleteSection, csodPushed, onToggleCSOD }) {

  const [isHovered, setIsHovered] = useState(false);

  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const [tempTitle, setTempTitle] = useState(title);



  useEffect(() => {

    setTempTitle(title);

  }, [title]);



  const handleSaveTitle = () => {

    if (tempTitle.trim() && tempTitle.trim() !== title && onTitleChange) {

      onTitleChange(tempTitle.trim());

    }

    setIsEditingTitle(false);

  };



  const handleKeyDown = (e) => {

    if (e.key === 'Enter') handleSaveTitle();

    if (e.key === 'Escape') {

      setTempTitle(title);

      setIsEditingTitle(false);

    }

  };



  return (

    <div

      className="flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-white/5 group transition-colors hover:bg-slate-50/30 dark:hover:bg-white/[0.02] rounded-t-[2.5rem]"

      onMouseEnter={() => setIsHovered(true)}

      onMouseLeave={() => setIsHovered(false)}

    >

      <div className="flex items-center gap-4">

        {!readOnly && (

          <div className="text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 p-1 flex items-center justify-center cursor-grab active:cursor-grabbing" title="Drag to reorder section">

            <GripVertical className="w-5 h-5" />

          </div>

        )}

        <div className="w-12 h-12 bg-white dark:bg-white/5 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-white/10 shadow-sm group-hover:border-blue-200 dark:group-hover:border-indigo-500 group-hover:shadow-blue-500/10 dark:group-hover:shadow-indigo-500/10 transition-all duration-300">

          <Icon className="w-6 h-6 text-blue-600 dark:text-indigo-400" />

        </div>

        <div>

          <div className="flex items-center gap-2.5">

            {isEditingTitle ? (

              <input

                type="text"

                value={tempTitle}

                onChange={(e) => setTempTitle(e.target.value)}

                onBlur={handleSaveTitle}

                onKeyDown={handleKeyDown}

                autoFocus

                className="font-bold text-slate-800 dark:text-white text-lg tracking-tight bg-slate-100 dark:bg-slate-800 border border-emerald-500 rounded px-2 py-0.5 outline-none w-64"

              />

            ) : (

              <>

                <h3 className="font-bold text-slate-800 dark:text-white text-lg tracking-tight">{title}</h3>

                {onTitleChange && !readOnly && (

                  <button

                    onClick={() => setIsEditingTitle(true)}

                    className="p-1 text-slate-400 hover:text-emerald-500 transition-colors opacity-0 group-hover:opacity-100"

                    title="Rename section"

                  >

                    <Edit2 className="w-4 h-4" />

                  </button>

                )}

              </>

            )}

            {itemCount !== undefined && itemCount > 0 && !isEditingTitle && (

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

        {!readOnly && onDeleteSection && (
          <button
            onClick={onDeleteSection}
            className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 dark:border-white/10 text-slate-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all duration-300 shadow-sm"
            title="Delete Section"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        {hasSectionLock && !hideVisibilityToggles && (

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

            {sectionLocked ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}

          </button>

        )}



        {hasWeights && !hideVisibilityToggles && (
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

        {onToggleCSOD && !hideVisibilityToggles && (
          <button
            onClick={onToggleCSOD}
            className={`
              flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300 shadow-sm
              ${csodPushed 
                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100 hover:scale-105 active:scale-95" 
                : "bg-slate-50 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 hover:text-emerald-500 hover:border-emerald-200 hover:scale-105 active:scale-95"
              }
            `}
            title={csodPushed ? "Pushed to CSOD" : "Not Pushed to CSOD"}
          >
            {csodPushed ? <Cloud className="w-4 h-4" /> : <CloudOff className="w-4 h-4" />}
          </button>
        )}



        {onRegenerate && !readOnly && (

          <button

            onClick={onRegenerate}

            disabled={isGenerating}

            className={`

              flex items-center gap-2.5 px-4 py-2 rounded-xl text-[13px] font-bold transition-all duration-300

              ${isGenerating

                ? "bg-blue-600 dark:bg-indigo-600 text-white shadow-lg shadow-blue-600/20 dark:shadow-indigo-600/20 translate-x-0 opacity-100"

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

            )}

          </button>

        )}

      </div>

    </div>

  );

}



// Clean Text Area

function CleanTextArea({ value, onChange, placeholder, rows = 4, readOnly }) {

  const [isFocused, setIsFocused] = useState(false);



  return (

    <div className={`

      relative rounded-xl border-2 transition-all duration-200 overflow-hidden bg-white dark:bg-white/[0.02]

      ${readOnly ? "border-slate-100 dark:border-white/5 bg-slate-50/30" : isFocused

        ? "border-blue-500 dark:border-indigo-500 shadow-lg shadow-blue-500/10 dark:shadow-indigo-500/10"

        : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"

      }

    `}>

      {readOnly ? (

        <div className="w-full p-4 text-slate-700 dark:text-slate-200 leading-relaxed text-[15px] whitespace-pre-wrap">

          {renderHighlightedText(value)}

        </div>

      ) : (

        <textarea

          value={stripHighlightTags(value) || ""}

          onChange={(e) => !readOnly && onChange(e.target.value)}

          onFocus={() => !readOnly && setIsFocused(true)}

          onBlur={() => setIsFocused(false)}

          placeholder={placeholder}

          rows={rows}

          readOnly={readOnly}

          className={`w-full p-4 bg-transparent outline-none resize-none text-slate-700 dark:text-slate-200 leading-relaxed text-[15px] ${readOnly ? "cursor-default" : ""}`}

        />

      )}

      <div className={`

        absolute bottom-2 right-2 px-2 py-1 bg-slate-100 dark:bg-white/10 rounded text-xs text-slate-400 dark:text-slate-500 font-medium

        transition-opacity duration-200

        ${isFocused ? "opacity-100" : "opacity-0"}

      `}>

        {value?.length || 0} chars

      </div>

    </div>

  );

}





export default function JDPreview({ jd, setJD, onAutoSave, syncStatus, readOnly, hideRefineAI, hideVisibilityToggles }) {

  const { coreCompetenciesDB, functionalCompetenciesDB } = useContext(JDContext);

  const [generatingSection, setGeneratingSection] = useState(null);

  const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false);

  const [promptModal, setPromptModal] = useState({ isOpen: false, section: null, title: "", pointIndex: null, existingData: "" });

  const [libraryModalOpen, setLibraryModalOpen] = useState(false);

  const [logoPreview, setLogoPreview] = useState(jd?.company_logo || "/logo.png");



  useEffect(() => {

    if (jd?.company_logo && jd.company_logo !== logoPreview) {

      setLogoPreview(jd.company_logo);

    }

  }, [jd?.company_logo]);



  const handleDeleteSection = async (sectionKey) => {
    if (window.confirm(`Are you sure you want to delete the "${sectionKey.replace(/_/g, ' ')}" section?`)) {
      try {
        let serverPayload = null;
        if (jd?.id) {
          serverPayload = await deleteSection(jd.id, sectionKey);
        }
        setJD((prev) => {
          const reindexed = serverPayload?.content
            ? { content: serverPayload.content, sections_metadata: serverPayload.sections_metadata || prev.sections_metadata }
            : deleteAndReindexStableSections(prev.content || {}, prev.sections_metadata || {}, sectionKey);

          const newState = {
            ...prev,
            content: reindexed.content,
            sections_metadata: reindexed.sections_metadata,
            sections_order: reindexed.content?.sections_order,
          };

          Object.keys(newState).forEach((k) => {
            if (k.startsWith("section_")) delete newState[k];
          });
          Object.keys(reindexed.content || {}).forEach((k) => {
            if (k.startsWith("section_")) newState[k] = reindexed.content[k];
          });

          return newState;
        });
        toast.success("Section deleted successfully!");
      } catch (err) {
        toast.error("Failed to delete section from database.");
      }
    }
  };

  const handleAddNewSection = (fieldConfig) => {
    let createdKey = null;
    let createdSection = null;

    setJD((prev) => {
      const content = { ...(prev.content || {}) };
      let maxN = 0;
      for (const k of Object.keys(content)) {
        if (k.startsWith("section_")) {
          const num = parseInt(k.replace("section_", ""), 10);
          if (!isNaN(num) && num > maxN) maxN = num;
        }
      }
      const labelKey = `section_${maxN + 1}`;
      const existingOrder = resolveSectionsOrder(prev);
      const newOrder = [...existingOrder.filter((k) => k !== labelKey), labelKey];

      const defaultSection = {
        name: fieldConfig.label,
        type: fieldConfig.type === "points" ? "points" : "text",
        section_data: fieldConfig.type === "points" ? [] : "",
        metadata: {
          view: "unlocked",
          push_to_csod: fieldConfig.push_to_csod !== false
        }
      };

      content[labelKey] = defaultSection;
      content.sections_order = newOrder;

      const updatedMeta = {
        ...(prev.sections_metadata || {}),
        order: newOrder,
        labels: { ...(prev.sections_metadata?.labels || {}), [labelKey]: fieldConfig.label },
        locks: { ...(prev.sections_metadata?.locks || {}), [labelKey]: "unlocked" },
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

      createdKey = labelKey;
      createdSection = defaultSection;

      const next = { ...prev, content, sections_metadata: updatedMeta };
      if (next[labelKey] !== undefined) delete next[labelKey];
      return next;
    });

    if (onAutoSave && createdKey && createdSection) {
      onAutoSave(createdKey, createdSection);
    }

    setIsAddSectionModalOpen(false);
    toast.success(`Custom section "${fieldConfig.label}" added!`);
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

    if (!jd.id) {

      toast.error("No JD ID found. Please save as draft first.");

      return;

    }



    setGeneratingSection(promptModal.section);

    setPromptModal({ ...promptModal, isOpen: false });



    try {

      const apiSection = promptModal.section;

      let result;

      

      if (promptModal.pointIndex !== null && promptModal.pointIndex !== undefined) {

        result = await regeneratePoint(apiSection, promptModal.existingData, prompt);

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



            const currentList = [...(jd[promptModal.section] || jd.content?.[promptModal.section] || [])];

            currentList[promptModal.pointIndex] = preserveObject(currentList, promptModal.pointIndex);

            updateSectionField(promptModal.section, currentList, {
              label: promptModal.title,
              type: jd?.sections_metadata?.[promptModal.section]?.type || "points"
            });

        }

        return;

      }



      result = await regenerateSection(
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



  const debounceTimeouts = useRef({});



  useEffect(() => {

    return () => {

      Object.values(debounceTimeouts.current).forEach(clearTimeout);

    };

  }, []);



  const updateSectionField = (sectionKey, rawValue, meta = {}) => {
    const content = { ...(jd?.content || {}) };
    const existing = content[sectionKey] ?? jd?.[sectionKey];
    const preservedName = meta.label
      || (isStableSection(existing) ? existing.name : null)
      || jd?.sections_metadata?.labels?.[sectionKey]
      || jd?.sections_metadata?.[sectionKey]?.label
      || sectionKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const sectionType = meta.type
      || (isStableSection(existing) ? existing.type : null)
      || jd?.sections_metadata?.[sectionKey]?.type
      || (isWeightedSectionData(rawValue, sectionKey, meta) ? "weighted_list" : (Array.isArray(rawValue) ? "points" : "text"));
    const weighted = isWeightedSectionData(rawValue, sectionKey, { ...meta, type: sectionType });
    const normalizedRaw = isStableSection(rawValue) ? unwrapSectionData(rawValue) : rawValue;
    const sectionData = (sectionType === "points" || sectionType === "weighted_list")
      ? toBackendSectionData(normalizedRaw, weighted)
      : normalizedRaw;

    const autosavePayload = isStableSection(existing) ? {
      ...existing,
      name: preservedName,
      type: sectionType,
      section_data: sectionData
    } : {
      name: preservedName,
      type: sectionType,
      section_data: sectionData,
      metadata: { view: "unlocked", push_to_csod: true }
    };

    setJD((prev) => {
      const nextContent = { ...(prev.content || {}) };
      nextContent[sectionKey] = autosavePayload;
      const next = { ...prev, content: nextContent };
      if (next[sectionKey] !== undefined) delete next[sectionKey];
      return next;
    });

    if (onAutoSave && autosavePayload) {
      if (debounceTimeouts.current[sectionKey]) {
        clearTimeout(debounceTimeouts.current[sectionKey]);
      }
      debounceTimeouts.current[sectionKey] = setTimeout(() => {
        onAutoSave(sectionKey, autosavePayload);
      }, 1500);
    }
  };


  const updateField = (field, value) => {
    if (field === "sections_order" && Array.isArray(value)) {
      const normalizedOrder = normalizeSectionsOrder(value);
      setJD((prev) => applySectionsOrder(prev, normalizedOrder));

      if (onAutoSave) {
        if (debounceTimeouts.current[field]) {
          clearTimeout(debounceTimeouts.current[field]);
        }
        debounceTimeouts.current[field] = setTimeout(() => {
          onAutoSave(field, normalizedOrder);
        }, 500);
      }
      return;
    }

    if (!['title', 'department', 'location', 'city', 'country_code', 'seniority', 'industry', 'salary_symbol', 'salary_min_value', 'salary_max_value', 'salary_period', 'employment_type', 'job_id', 'jobId', 'job_family', 'jobFamily', 'job_level', 'jobLevel', 'company_name', 'companyName', 'company_logo', 'sections_metadata'].includes(field)
      && String(field).startsWith("section_")) {
      updateSectionField(field, value, {
        label: jd?.sections_metadata?.labels?.[field] || jd?.sections_metadata?.[field]?.label,
        type: jd?.sections_metadata?.[field]?.type
      });
      return;
    }

    setJD((prev) => {

      let newState;

      if (['title', 'department', 'location', 'city', 'country_code', 'seniority', 'industry', 'salary_symbol', 'salary_min_value', 'salary_max_value', 'salary_period', 'employment_type', 'job_id', 'jobId', 'job_family', 'jobFamily', 'job_level', 'jobLevel', 'company_name', 'companyName', 'company_logo', 'sections_metadata'].includes(field)) {

        newState = { ...prev, [field]: value };

      } else {
        const content = { ...(prev.content || {}) };
        const existing = content[field] ?? prev[field];
        if (isStableSection(existing)) {
          content[field] = { ...existing, section_data: value };
        } else {
          content[field] = value;
        }
        newState = { ...prev, content };
      }



      if (['salary_min_value', 'salary_max_value', 'salary_symbol', 'salary_period'].includes(field)) {

        newState.salary_range = formatSalaryRange(

          newState.salary_min_value,

          newState.salary_max_value,

          newState.salary_symbol || "₹",

          newState.salary_period || "/yr"

        );

      }



      return newState;

    });



    if (onAutoSave) {

      if (debounceTimeouts.current[field]) {

        clearTimeout(debounceTimeouts.current[field]);

      }

      debounceTimeouts.current[field] = setTimeout(() => {

        onAutoSave(field, value);

      }, 1500);

    }

  };



  if (!jd) return <EmptyJDState />;



  return (

    <div className="bg-slate-50/50 dark:bg-slate-950 transition-colors duration-300">

      <AIPromptModal

        isOpen={promptModal.isOpen}

        onClose={() => setPromptModal({ ...promptModal, isOpen: false })}

        onSubmit={handlePromptSubmit}

        sectionTitle={promptModal.title}

        isGenerating={!!generatingSection}

        isPointLevel={promptModal.pointIndex !== null && promptModal.pointIndex !== undefined}

      />



      <ImageLibraryModal

        isOpen={libraryModalOpen}

        onClose={() => setLibraryModalOpen(false)}

        onSelect={(url) => {

          setLogoPreview(url);

          updateField("company_logo", url);

          setLibraryModalOpen(false);

        }}

      />



      <div className="max-w-[90%] mx-auto px-6 py-8 space-y-8 print:px-0 animate-in fade-in slide-in-from-bottom-4 duration-700">

        {/* Document Header */}

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden print:shadow-none print:border-none">

          <div className="bg-slate-900 dark:bg-black/40 text-white px-8 py-4 flex items-center justify-center print:bg-slate-900 print:text-white relative">

            <div

              className={`flex flex-col items-center gap-4 relative group ${readOnly ? "cursor-default" : "cursor-pointer"}`}

              onClick={() => !readOnly && setLibraryModalOpen(true)}

            >

              <div className="bg-white/10 p-3 rounded-2xl relative overflow-hidden backdrop-blur-md border border-white/10 shadow-2xl">

                <img

                  src={logoPreview}

                  alt="Company Logo"

                  className="h-16 w-auto object-contain min-w-[200px]"

                  onError={(e) => {

                    e.target.onerror = null;

                    e.target.src = "/company-logo-demo.png";

                  }}

                />

              </div>

            </div>

          </div>



          <div className="px-10 py-6 print:px-0">

            <h2 className="text-center text-3xl font-bold text-slate-800 dark:text-white mb-5 pb-4 border-b-2 border-slate-100 dark:border-white/5">

              Job Description

            </h2>



            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-6 gap-x-8 text-sm text-slate-700 dark:text-slate-300">

              <div className="flex flex-col gap-1">

                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Job Title</span>

                <input

                  type="text"

                  value={jd.title || ""}

                  onChange={(e) => updateField("title", e.target.value)}

                  readOnly={readOnly}

                  className="w-full bg-transparent outline-none py-1.5 font-bold text-slate-900 dark:text-white text-lg"

                  placeholder="Enter Job Title"

                />

              </div>



              <div className="flex flex-col gap-1">

                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Job ID</span>

                <input

                  type="text"

                  value={jd.jobId || jd.job_id || ""}

                  onChange={(e) => updateField("jobId", e.target.value)}

                  readOnly={readOnly}

                  className="w-full bg-transparent outline-none py-1.5 font-bold text-slate-900 dark:text-white"

                  placeholder="N/A"

                />

              </div>



              <div className="flex flex-col gap-1">

                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Department</span>

                <input

                  type="text"

                  value={jd.department || ""}

                  onChange={(e) => updateField("department", e.target.value)}

                  readOnly={readOnly}

                  className="w-full bg-transparent outline-none py-1.5 font-bold text-slate-900 dark:text-white"

                  placeholder="N/A"

                />

              </div>



              <div className="flex flex-col gap-1">

                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Job Family</span>

                <input

                  type="text"

                  value={jd.jobFamily || jd.job_family || ""}

                  onChange={(e) => updateField("jobFamily", e.target.value)}

                  readOnly={readOnly}

                  className="w-full bg-transparent outline-none py-1.5 font-bold text-slate-900 dark:text-white"

                  placeholder="N/A"

                />

              </div>



              <div className="flex flex-col gap-1">

                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Salary Range</span>

                <div className="flex items-center gap-2">

                  <span className="font-bold text-slate-900 dark:text-white text-sm py-1.5">

                    {jd.salary_symbol || "₹"}

                  </span>

                  <input

                    type="text"

                    value={jd.salary_min_value || ""}

                    onChange={(e) => updateField("salary_min_value", e.target.value)}

                    readOnly={readOnly}

                    className="w-16 bg-transparent outline-none font-bold text-slate-900 dark:text-white text-sm"

                    placeholder="Min"

                  />

                  <span className="text-slate-400">-</span>

                  <input

                    type="text"

                    value={jd.salary_max_value || ""}

                    onChange={(e) => updateField("salary_max_value", e.target.value)}

                    readOnly={readOnly}

                    className="w-16 bg-transparent outline-none font-bold text-slate-900 dark:text-white text-sm"

                    placeholder="Max"

                  />

                  <select

                    value={jd.salary_period || "/yr"}

                    onChange={(e) => updateField("salary_period", e.target.value)}

                    disabled={readOnly}

                    className="bg-transparent outline-none font-bold text-slate-900 dark:text-white text-sm"

                  >

                    <option value="/yr">/yr</option>

                    <option value="/mo">/mo</option>

                    <option value="/hr">/hr</option>

                  </select>

                </div>

              </div>



              <div className="flex flex-col gap-1">

                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Industry</span>

                <input

                  type="text"

                  value={jd.industry || ""}

                  onChange={(e) => updateField("industry", e.target.value)}

                  readOnly={readOnly}

                  className="w-full bg-transparent outline-none py-1.5 font-bold text-slate-900 dark:text-white"

                  placeholder="N/A"

                />

              </div>



              <div className="flex flex-col gap-1">

                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Job Level</span>

                <input

                  type="text"

                  value={jd.jobLevel || jd.job_level || ""}

                  onChange={(e) => updateField("jobLevel", e.target.value)}

                  readOnly={readOnly}

                  className="w-full bg-transparent outline-none py-1.5 font-bold text-slate-900 dark:text-white"

                  placeholder="N/A"

                />

              </div>



              <div className="flex flex-col gap-1">

                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</span>

                <input

                  type="text"

                  value={jd.location || ""}

                  onChange={(e) => updateField("location", e.target.value)}

                  readOnly={readOnly}

                  className="w-full bg-transparent outline-none py-1.5 font-bold text-slate-900 dark:text-white"

                  placeholder="e.g. Mumbai, India"

                />

              </div>



              <div className="flex flex-col gap-1">

                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Employment</span>

                <input

                  type="text"

                  value={jd.employment_type || jd.employmentType || ""}

                  onChange={(e) => updateField("employment_type", e.target.value)}

                  readOnly={readOnly}

                  className="w-full bg-transparent outline-none py-1.5 font-bold text-slate-900 dark:text-white"

                  placeholder="e.g. Full-Time"

                />

              </div>

            </div>

          </div>

        </div>



        {/* Dynamic Content Sections */}

        {(() => {
          const IGNORED_KEYS = ["id", "org_id", "creator_id", "template_id", "title", "companyName", "company_name", "jobId", "job_id", "jobFamily", "job_family", "jobLevel", "job_level", "department", "location", "city", "countryCode", "country_code", "seniority", "industry", "salary_range", "salary_symbol", "salary_min_value", "salary_max_value", "salary_period", "salary_unit", "salary_range_formatted", "employmentType", "employment_type", "key_skills", "skills", "additional_context", "context", "image_url", "company_logo", "content", "custom_fields", "sections_metadata", "eeoc_flags", "eeocFlags", "eeoc_cleared", "status", "public_jd_id", "wordCount", "word_count", "generation_mode", "finalized_at", "parent_jd_id", "is_main", "version_history", "created_at", "updated_at", "createdAt", "updatedAt", "creatorName", "creator_name", "authorName", "author_name", "canEdit", "can_edit", "csod_ou_id", "csodOuId", "csod_pushed_at", "csodPushedAt", "deleted_at", "deletedAt", "model_used", "modelUsed", "input_prompt", "inputPrompt", "_section_order", "_source", "_custom_fields_metadata", "sections_order", "headers_metadata"];
          const STANDARD_SECTIONS = ["basic", "salary"];

          const uniqueSortedKeys = resolveSectionsOrder(jd);

          const visibleKeys = uniqueSortedKeys.filter((sectionKey) => {
            if (["basic", "salary", "_section_order", "_source"].includes(sectionKey.trim().toLowerCase())) return false;
            if (IGNORED_KEYS.some(k => k.toLowerCase() === sectionKey.toLowerCase().trim()) || sectionKey.endsWith('_view') || sectionKey.startsWith('weight_view_')) return false;
            if (sectionKey.toLowerCase().includes('_section_order')) return false;
            if (sectionKey.startsWith("section_") && resolveSectionObject(jd, sectionKey) === undefined) return false;

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

          return (
            <Reorder.Group
              values={visibleKeys}
              onReorder={(newOrder) => {
                updateField("sections_order", newOrder);
              }}
              className="space-y-8"
            >
              {visibleKeys.map((sectionKey) => {
                const sectionObj = resolveSectionObject(jd, sectionKey);
                if (!sectionObj) return null;
                const meta = resolveSectionMeta(sectionKey, sectionObj, jd?.sections_metadata);
                const titleStr = meta.label;
                const isPoints = meta.type === 'points' || meta.type === 'weighted_list';
                const isLocked = isStableSection(sectionObj)
                  ? sectionObj.metadata?.view === 'locked'
                  : (jd?.[sectionKey + '_view'] === 'locked');
                const isWeightLocked = resolveWeightLockState(jd, sectionKey, titleStr);
                const weighted = isWeightedSectionData(
                  unwrapSectionData(sectionObj),
                  sectionKey,
                  meta
                );

                let sectionContent = unwrapSectionData(sectionObj);

                return (
                  <Reorder.Item
                    key={sectionKey}
                    value={sectionKey}
                    className="relative"
                    dragListener={!readOnly}
                  >
                    <section id={`jd-${sectionKey}`} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200/60 dark:border-white/10 shadow-xl overflow-hidden transition-all duration-500 hover:shadow-2xl">
                      <SectionHeader
                        title={titleStr}
                        icon={AlignLeft}
                        onRegenerate={hideRefineAI ? null : () => handleRegenerateClick(sectionKey, titleStr)}
                        isGenerating={generatingSection === sectionKey}
                        description=""
                        readOnly={readOnly}
                        hasWeights={weighted}
                        weightLocked={isWeightLocked}
                        onToggleWeightLock={() => {
                          const weightLockKey = resolveWeightLockKey(jd, sectionKey, titleStr);
                          const nextLock = isWeightLocked ? 'unlocked' : 'locked';
                          setJD((prev) => {
                            const nextContent = { ...(prev.content || {}) };
                            nextContent[weightLockKey] = nextLock;
                            return { ...prev, content: nextContent, [weightLockKey]: nextLock };
                          });
                          if (onAutoSave) {
                            onAutoSave(weightLockKey, nextLock);
                          }
                        }}
                        hasSectionLock={true}
                        sectionLocked={isLocked}
                        onToggleSectionLock={() => {
                          const nextLock = isLocked ? 'unlocked' : 'locked';
                          setJD((prev) => {
                            const nextContent = { ...prev.content };
                            if (nextContent[sectionKey] && typeof nextContent[sectionKey] === 'object') {
                              const metaObj = nextContent[sectionKey].metadata || {};
                              nextContent[sectionKey] = {
                                ...nextContent[sectionKey],
                                metadata: { ...metaObj, view: nextLock }
                              };
                            }
                            const currentMeta = prev.sections_metadata || {};
                            const nextMeta = {
                              ...currentMeta,
                              locks: { ...(currentMeta.locks || {}), [sectionKey]: nextLock }
                            };
                            return { ...prev, content: nextContent, sections_metadata: nextMeta };
                          });
                          if (onAutoSave) {
                            onAutoSave(sectionKey, isStableSection(sectionObj) ? {
                              ...(jd.content?.[sectionKey] || sectionObj || {}),
                              metadata: { ...(jd.content?.[sectionKey]?.metadata || sectionObj?.metadata || {}), view: nextLock }
                            } : nextLock);
                          }
                        }}
                        hideVisibilityToggles={hideVisibilityToggles}
                        onTitleChange={(newTitle) => {
                          setJD((prev) => {
                            const nextContent = { ...prev.content };
                            if (nextContent[sectionKey] && typeof nextContent[sectionKey] === 'object') {
                              nextContent[sectionKey] = { ...nextContent[sectionKey], name: newTitle };
                            }
                            const currentMeta = prev.sections_metadata || {};
                            const nextMeta = {
                              ...currentMeta,
                              labels: { ...(currentMeta.labels || {}), [sectionKey]: newTitle }
                            };
                            return { ...prev, content: nextContent, sections_metadata: nextMeta };
                          });
                          if (onAutoSave) {
                            onAutoSave(sectionKey, isStableSection(sectionObj) ? {
                              ...(jd.content?.[sectionKey] || sectionObj || {}),
                              name: newTitle
                            } : newTitle);
                          }
                        }}
                        onDeleteSection={() => handleDeleteSection(sectionKey)}
                        csodPushed={resolvePushToCsod(jd, sectionKey, sectionObj)}
                        onToggleCSOD={!readOnly ? () => {
                          const currentCSOD = resolvePushToCsod(jd, sectionKey, sectionObj);
                          const nextCSOD = !currentCSOD;
                          setJD((prev) => {
                            const nextContent = { ...(prev.content || {}) };
                            const existing = nextContent[sectionKey] ?? sectionObj;
                            if (nextContent[sectionKey] && typeof nextContent[sectionKey] === "object") {
                              nextContent[sectionKey] = {
                                ...nextContent[sectionKey],
                                metadata: {
                                  ...(nextContent[sectionKey].metadata || {}),
                                  push_to_csod: nextCSOD
                                }
                              };
                            } else if (isStableSection(existing)) {
                              nextContent[sectionKey] = {
                                ...existing,
                                metadata: { ...(existing.metadata || {}), push_to_csod: nextCSOD }
                              };
                            }
                            const currentMeta = prev.sections_metadata || {};
                            const nextMeta = {
                              ...currentMeta,
                              [sectionKey]: { ...(currentMeta[sectionKey] || {}), push_to_csod: nextCSOD }
                            };
                            return { ...prev, content: nextContent, sections_metadata: nextMeta };
                          });
                          if (onAutoSave) {
                            const existing = jd.content?.[sectionKey] || sectionObj;
                            onAutoSave(sectionKey, isStableSection(existing) ? {
                              ...(existing || {}),
                              metadata: { ...(existing?.metadata || {}), push_to_csod: nextCSOD }
                            } : nextCSOD);
                          }
                        } : null}
                      />

                      {!isLocked && (
                        <div className="p-8 pt-2">
                          <div className="bg-slate-50/50 dark:bg-white/5 rounded-[2rem] p-6 border border-slate-100 dark:border-white/5 focus-within:bg-white dark:focus-within:bg-white/10 focus-within:border-blue-200/60 dark:focus-within:border-indigo-500/30 focus-within:shadow-inner transition-all duration-500">
                            {isPoints ? (
                              (() => {
                                const handleSectionItems = (items) => {
                                  updateSectionField(sectionKey, toBackendSectionData(items, weighted), meta);
                                };

                                if (weighted) {
                                  return (
                                    <WeightedEditableList
                                      items={normalizeForWeightedList(sectionContent)}
                                      setItems={handleSectionItems}
                                      readOnly={readOnly}
                                      hideWeight={isWeightLocked}
                                      onRegeneratePoint={hideRefineAI ? null : (idx, data) => handleRegeneratePointClick(sectionKey, titleStr, idx, data)}
                                    />
                                  );
                                }
                                return (
                                  <EditableList
                                    items={normalizeForEditableList(sectionContent)}
                                    setItems={handleSectionItems}
                                    readOnly={readOnly}
                                    onRegeneratePoint={hideRefineAI ? null : (idx, data) => handleRegeneratePointClick(sectionKey, titleStr, idx, data)}
                                  />
                                );
                              })()
                            ) : (
                              <textarea
                                value={sectionTextValue(sectionContent)}
                                onChange={(e) => updateSectionField(sectionKey, e.target.value, meta)}
                                readOnly={readOnly}
                                placeholder={`Enter ${titleStr}...`}
                                className="w-full min-h-[120px] bg-transparent outline-none resize-y text-slate-700 dark:text-slate-300"
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </section>
                  </Reorder.Item>
                );
              })}
            </Reorder.Group>
          );

        })()}



        {!readOnly && (

          <div className="flex justify-center pt-4 print:hidden">

            <button

              onClick={() => setIsAddSectionModalOpen(true)}

              className="flex items-center gap-2.5 px-6 py-3.5 bg-blue-50 dark:bg-indigo-500/10 text-blue-600 dark:text-indigo-400 font-bold rounded-xl hover:bg-blue-100 transition-all border border-blue-200"

            >

              <Plus className="w-5 h-5" /> Add New Section

            </button>

          </div>

        )}

      </div>



      <AddSectionModal

        isOpen={isAddSectionModalOpen}

        onClose={() => setIsAddSectionModalOpen(false)}

        onAddSection={handleAddNewSection}

      />

    </div>

  );

}

