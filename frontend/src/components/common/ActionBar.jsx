// import { formatJDText } from "../../utils/formatJD";

// export default function ActionBar({
//   jd,
//   onSave,
//   onReset
// }) {

//   const handleCopy = () => {

//     const text = formatJDText(jd);

//     navigator.clipboard.writeText(text);

//     alert("JD copied");

//   };

//   const handleTXT = () => {

//     const text = formatJDText(jd);

//     const blob = new Blob([text], { type: "text/plain" });

//     const url = URL.createObjectURL(blob);

//     const a = document.createElement("a");

//     a.href = url;
//     a.download = "job-description.txt";

//     a.click();

//   };

//   return (
//     <div className="flex gap-3 mt-6 border-t pt-4">

//       <button
//         className="border px-4 py-2"
//         onClick={() => onSave("draft")}
//       >
//         Save Draft
//       </button>

//       <button
//         className="bg-green-600 text-white px-4 py-2"
//         onClick={() => onSave("final")}
//       >
//         Finalised ✓
//       </button>

//       <button
//         className="border px-4 py-2"
//         onClick={handleCopy}
//       >
//         Copy
//       </button>

//       <button
//         className="border px-4 py-2"
//         onClick={handleTXT}
//       >
//         Download TXT
//       </button>

//       <button
//         className="border px-4 py-2"
//         onClick={onReset}
//       >
//         Start Over
//       </button>

//     </div>
//   );
// }


import { formatJDText } from "../../utils/formatJD";
import { 
  Save, 
  CheckCircle2, 
  Copy, 
  Download, 
  RotateCcw, 
  FileText,
  Check,
  Loader2,
  Printer,
  AlertCircle,
  Send
} from "lucide-react";
import { useState, useContext } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import * as jdService from "../../services/jdService";
import WorkflowSelectionPanel from "./WorkflowSelectionPanel";

export default function ActionBar({ 
  jd, 
  onSave, 
  onReset, 
  onSendForReview,
  user,
  workflows = [],
  syncStatus = 'saved' 
}) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleCopy = async () => {
    try {
      if (jd.id) {
        // Attempt backend export
        const result = await jdService.exportClipboard(jd.id);
        const text = result?.text || result?.data || formatJDText(jd);
        await navigator.clipboard.writeText(text);
      } else {
        // Local fallback
        const text = formatJDText(jd);
        await navigator.clipboard.writeText(text);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Clipboard export failed:", error);
      toast.error("Failed to copy to clipboard.");
    }
  };

  const handleWord = async () => {
    setDownloading(true);
    try {
      if (jd.id) {
        if (jd.company_logo) {
          try {
            await jdService.updateSection(jd.id, "image_url", jd.company_logo);
          } catch (e) {
            console.warn("Failed to force sync logo before word export:", e);
          }
        }
        await jdService.exportWord(jd.id, jd.title);
      } else {
        toast.error("Please save JD as draft before Word export.");
      }
    } catch (error) {
      console.error("Word export failed:", error);
      toast.error("Failed to download Word document.");
    } finally {
      setTimeout(() => setDownloading(false), 500);
    }
  };

  // handleSaveDraft is removed as autosave is now automatic per section
  const extractStr = (item) => {
    if (!item) return "";
    if (typeof item === 'string') return item;
    if (typeof item === 'object') {
      return String(item.point || item.title || item.duty || item.text || "");
    }
    return String(item);
  };

  const getItemsText = (items) => {
    if (!Array.isArray(items)) return "";
    return items.map(extractStr).join(" ");
  };

  const s_summary = extractStr(jd.summary || "");
  const s_duties = extractStr(jd.essential_duties_and_responsibilities || "");
  const s_resp = getItemsText(jd.responsibilities || []);
  const s_core = getItemsText(jd.coreCompetencies || jd.core_competencies || []);
  const s_func = getItemsText(jd.functionalCompetencies || jd.functional_competencies || []);
  const s_req = getItemsText(jd.qualifications?.required || jd.qualifications_required || []);
  const s_pref = getItemsText(jd.qualifications?.preferred || jd.qualifications_preferred || []);
  const s_eeo = extractStr(jd.eeo_statement || jd.eeo || "");

  const calculatedChars = [s_summary, s_duties, s_resp, s_core, s_func, s_req, s_pref, s_eeo].filter(Boolean).join(" ").length;
  const totalChars = calculatedChars > 0 ? calculatedChars : (jd.wordCount || jd.word_count || 0);

  const isSaba = jd.generation_mode === 'saba' || jd.source === 'saba' || jd._source === 'saba' || (jd.industry && jd.industry.toLowerCase().includes('imported'));
  const isLimitExceeded = totalChars > 3990 && !isSaba;

  const handleFinalize = async () => {
    if (isLimitExceeded) {
      toast.error("Character limit exceeded (Max 3990). Please reduce text before finalizing.");
      return;
    }
    setFinalizing(true);
    await onSave("final");
    setFinalizing(false);
  };

  return (
    <div className="sticky bottom-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      <div className="max-w-[90%] mx-auto flex flex-wrap items-center justify-between gap-3">
        
        {/* Left: Status Info */}
        <div className="flex items-center gap-3 text-sm text-slate-500 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl">
            <FileText className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-700">{jd.title || "Untitled JD"}</span>
          </div>
          
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black tracking-widest transition-all duration-300 ${isLimitExceeded ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20 animate-pulse' : 'bg-slate-100 text-indigo-600'}`}>
            <span>CHARACTERS:</span>
            <span className="font-mono font-extrabold">{totalChars} {!isSaba && '/ 3990'}</span>
          </div>
          
          <div className="flex items-center gap-2 text-xs font-medium ml-1">
            {syncStatus === 'saving' && (
              <div className="flex items-center gap-2 text-blue-600 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving to cloud...</span>
              </div>
            )}
            {syncStatus === 'saved' && (
              <div className="flex items-center gap-2 text-emerald-600">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                <span>Cloud Auto Saved</span>
              </div>
            )}
            {syncStatus === 'error' && (
              <div className="flex items-center gap-2 text-red-500">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Sync Error</span>
              </div>
            )}
          </div>

          {isLimitExceeded && (
            <div className="flex items-center gap-2 text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200 px-3 py-1.5 rounded-xl shadow-sm animate-pulse ml-1">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Limit exceeded (+{totalChars - 3990} chars)</span>
            </div>
          )}
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          
          {/* Secondary Actions */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={handleCopy}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${copied 
                  ? "bg-green-100 text-green-700" 
                  : "text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm"
                }
              `}
              title="Copy to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </button>

            <button
              onClick={handleWord}
              disabled={downloading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm transition-all duration-200 disabled:opacity-50"
              title="Download as Word"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Word
            </button>

            <button
              onClick={async () => {
                setDownloading(true);
                try {
                  if (jd.id) {
                    // Force save the latest logo to ensure the backend uses it for the export
                    if (jd.company_logo) {
                      try {
                        await jdService.updateSection(jd.id, "image_url", jd.company_logo);
                      } catch (e) {
                        console.warn("Failed to force sync logo before export:", e);
                      }
                    }
                    await jdService.exportPDF(jd.id, jd.title);
                  } else {
                    toast.error("Please save JD as draft before PDF export.");
                  }
                } catch (e) {
                  console.error("PDF Export failed:", e);
                  toast.error("Failed to generate PDF");
                } finally {
                  setDownloading(false);
                }
              }}
              disabled={downloading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white hover:shadow-sm transition-all duration-200 ml-1 disabled:opacity-50"
              title="Download as PDF"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              PDF
            </button>

            <div className="w-px h-6 bg-slate-300" />

            <button
              onClick={onReset}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
              title="Start fresh"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>

          <div className="w-px h-8 bg-slate-300 hidden sm:block" />

          {/* Primary Actions */}
          <div className="flex items-center gap-2">
            {/* Save as Draft */}
            <button
              type="button"
              onClick={isLimitExceeded ? () => toast.error("Character limit exceeded (Max 3990). Please reduce text before saving.") : () => onSave("draft")}
              disabled={finalizing || isLimitExceeded}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${isLimitExceeded ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60' : 'text-slate-700 bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm'}`}
            >
              <Save className="w-4 h-4" />
              Save Draft
            </button>

            <button
              type="button"
              onClick={isLimitExceeded ? () => toast.error("Character limit exceeded (Max 3990). Please reduce text before finalizing.") : handleFinalize}
              disabled={finalizing || isLimitExceeded}
              className={`
                flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg transition-all duration-200
                ${isLimitExceeded ? 'bg-slate-300 cursor-not-allowed opacity-60' : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 hover:shadow-xl hover:shadow-emerald-500/25 hover:-translate-y-0.5 active:translate-y-0'}
              `}
            >
              {finalizing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Finalize
            </button>

            {((user?.role || '').toLowerCase().includes('hr') || (user?.role || '').toLowerCase().includes('admin')) && 
             ['draft', 'finalized', 'final', 'approved', 'rejected', 'declined'].includes(jd.status || 'draft') && (() => {
               const isSubmitDisabled = isSending || isLimitExceeded;
               return (
                 <button
                   type="button"
                   onClick={() => setShowWorkflowModal(true)}
                   disabled={isSubmitDisabled}
                   className={`
                     flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ml-2
                     ${isSubmitDisabled 
                       ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60 shadow-none' 
                       : 'text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30'
                     }
                   `}
                   title="Submit for review"
                 >
                   {isSending ? (
                     <Loader2 className="w-4 h-4 animate-spin" />
                   ) : (
                     <Send className="w-4 h-4" />
                   )}
                   Submit for Review
                 </button>
               );
             })()}
           </div>
        </div>
      </div>

      <WorkflowSelectionPanel
        isOpen={showWorkflowModal}
        onClose={() => setShowWorkflowModal(false)}
        onConfirm={async (workflowId) => {
          setShowWorkflowModal(false);
          setIsSending(true);
          try {
            if (onSendForReview) {
              await onSendForReview(jd.id, workflowId);
              toast.success("Submitted for review successfully!");
              const userRole = (user?.role || "").toLowerCase();
              const basePath = userRole.includes('admin') ? 'admin' : (userRole.includes('hr') ? 'hr' : 'manager');
              navigate(`/${basePath}/my-jds`, { state: { statusFilter: 'in_review' } });
            }
          } catch (error) {
            console.error("Failed to send for review:", error);
            toast.error("Failed to submit for review.");
          } finally {
            setIsSending(false);
          }
        }}
        workflows={workflows}
        targetDepartment={jd.department}
      />
    </div>
  );
}