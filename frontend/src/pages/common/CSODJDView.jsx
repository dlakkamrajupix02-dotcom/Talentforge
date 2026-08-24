import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCSODOUByExternalId } from "../../services/jdService";
import { 
  ArrowLeft, 
  Database, 
  FileText, 
  User, 
  Calendar, 
  CheckCircle2, 
  XCircle,
  Hash,
  Activity,
  Award,
  Loader2,
  ExternalLink,
  AlignLeft,
  Briefcase,
  List,
  Target,
  Trophy,
  Gift,
  ShieldCheck,
  Zap,
  Info,
  Copy,
  Check
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { sanitizedHtmlProps } from "../../utils/markdownHtmlConverter";

const StaticDisplay = ({ label, value, icon: Icon }) => (
  <div className="flex flex-col gap-1.5">
    {label && <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>}
    <div className="flex items-center gap-2 text-xs text-slate-800 dark:text-white font-bold py-1">
      {Icon && <Icon className="w-4 h-4 text-slate-400" />}
      <span>{value || "N/A"}</span>
    </div>
  </div>
);

const JDSectionHeader = ({ title, icon: Icon, itemCount, description }) => {
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
    </div>
  );
};

export default function CSODJDView() {
  const { ouid } = useParams();
  const navigate = useNavigate();
  const [csodData, setCsodData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (csodData?.externalId) {
      const textToCopy = csodData.externalId;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(textToCopy);
        } else {
          // Fallback for non-HTTPS environments
          const textArea = document.createElement("textarea");
          textArea.value = textToCopy;
          textArea.style.position = "absolute";
          textArea.style.left = "-999999px";
          document.body.appendChild(textArea);
          textArea.select();
          try {
            document.execCommand('copy');
          } catch (error) {
            console.error("Fallback copy failed", error);
          } finally {
            textArea.remove();
          }
        }
        setCopied(true);
        toast.success("External Code copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy: ", err);
        toast.error("Failed to copy to clipboard");
      }
    }
  };

  useEffect(() => {
    const fetchCSODDetails = async () => {
      setIsLoading(true);
      try {
        const response = await getCSODOUByExternalId(ouid);
        if (response && response.data && response.data.length > 0) {
          setCsodData(response.data[0]);
        } else {
          setCsodData(null);
        }
      } catch (err) {
        console.error("Failed to fetch CSOD OU details:", err);
        toast.error("Failed to load details from Cornerstone (CSOD)");
      } finally {
        setIsLoading(false);
      }
    };

    if (ouid) {
      fetchCSODDetails();
    }
  }, [ouid]);

  // Extract list items from raw CSOD HTML string
  const parseListItems = (html) => {
    if (!html) return [];
    const regex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    const items = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
      // Remove track changes markers and mod tags inside list items
      let cleanItem = match[1].trim();
      cleanItem = cleanItem.replace(/\[\[mod:[^\]]*\]\]/g, "");
      cleanItem = cleanItem.replace(/\[\[\/mod\]\]/g, "");
      items.push(cleanItem);
    }
    return items;
  };

  // Parse CSOD description HTML into sections using any <b>TITLE</b> headers present
  const parseSections = (html) => {
    if (!html) return [];

    let cleaned = html;
    cleaned = cleaned.replace(/\[\[mod:[^\]]*\]\]/g, "");
    cleaned = cleaned.replace(/\[\[\/mod\]\]/g, "");

    const headerRegex = /<b>([^<]+)<\/b>/gi;
    const matches = [...cleaned.matchAll(headerRegex)];
    if (matches.length === 0) {
      return [{
        title: "Job Profile Details",
        icon: FileText,
        desc: "Full details of the job profile in Cornerstone OnDemand",
        content: cleaned
      }];
    }

    const iconForTitle = (title) => {
      const t = title.toLowerCase();
      if (t.includes("summary") || t.includes("overview")) return AlignLeft;
      if (t.includes("competenc")) return Award;
      if (t.includes("skill") || t.includes("abilit")) return Target;
      if (t.includes("education") || t.includes("qualification")) return Trophy;
      if (t.includes("certification") || t.includes("licens")) return ShieldCheck;
      if (t.includes("dut") || t.includes("responsibilit")) return Briefcase;
      if (t.includes("experience")) return Briefcase;
      if (t.includes("disclaimer") || t.includes("statement")) return ShieldCheck;
      return List;
    };

    const results = [];
    for (let i = 0; i < matches.length; i++) {
      const rawTitle = matches[i][1].trim();
      const title = rawTitle.split(/\s+/).map((w) =>
        w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      ).join(" ");
      const startIndex = matches[i].index + matches[i][0].length;
      const endIndex = i + 1 < matches.length ? matches[i + 1].index : cleaned.length;
      let sectionContent = cleaned.substring(startIndex, endIndex).trim();
      sectionContent = sectionContent.replace(/^(<br\s*\/?>)+|(<br\s*\/?>)+$/gi, "");

      if (sectionContent) {
        results.push({
          title,
          icon: iconForTitle(rawTitle),
          desc: "",
          content: sectionContent
        });
      }
    }

    return results.length > 0 ? results : [{
      title: "Job Profile Details",
      icon: FileText,
      desc: "Full details of the job profile in Cornerstone OnDemand",
      content: cleaned
    }];
  };

  const handleGoBack = () => {
    navigate("/admin/push-csod?mode=sync");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-[#020617]">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
          <p className="text-slate-500 font-bold text-sm">Retrieving CSOD live profile schema...</p>
        </div>
      </div>
    );
  }

  if (!csodData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#020617]">
        <div className="text-center p-12 bg-white dark:bg-[#0f172a] rounded-[3rem] shadow-2xl border border-slate-100 dark:border-white/5">
          <div className="w-20 h-20 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle size={40} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">CSOD Record Not Found</h2>
          <p className="text-slate-400 mb-8 max-w-xs mx-auto">Could not fetch Live organization unit data for ID <span className="font-mono font-bold text-rose-500">{ouid}</span>.</p>
          <button 
            onClick={handleGoBack} 
            className="px-8 py-3 bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95"
          >
            Return to Sync History
          </button>
        </div>
      </div>
    );
  }

  const parsedSections = parseSections(csodData.description);

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] font-sans selection:bg-indigo-500/30 pb-20">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Modern Navigation Header */}
        <div className="flex items-center justify-between">
          <button 
            onClick={handleGoBack}
            className="group flex items-center gap-4 text-slate-900 dark:text-white font-black text-xs uppercase tracking-[0.25em] hover:text-indigo-500 transition-colors"
          >
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200/60 dark:border-white/5 flex items-center justify-center shadow-sm group-hover:shadow-md transition-all group-hover:border-indigo-500/30">
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" strokeWidth={3} />
            </div>
            Back to Sync History
          </button>
          
          <div className="flex items-center gap-3">
             <div className="h-12 flex items-center gap-2 px-6 bg-white dark:bg-[#0f172a] border border-slate-200/60 dark:border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-300 shadow-sm border-dashed">
                <ShieldCheck size={16} /> LIVE DATA SOURCE: <span className="text-blue-500 ml-1 italic font-bold">CORNERSTONE CSOD</span>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8 items-start">
          
          {/* ─── MAIN CONTENT (Left Column) ─── */}
          <div className="col-span-12 lg:col-span-8 space-y-8">
            
            {/* High-Fidelity Header Card */}
            <div className="bg-white dark:bg-[#0f172a] rounded-[3rem] p-12 border border-slate-200/60 dark:border-white/5 shadow-sm relative overflow-hidden group">
               <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none transition-transform duration-1000 animate-pulse" />
               <div className="relative z-10 space-y-8">
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-sm">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    CSOD Profile Synchronized
                  </span>
                  
                  <div className="space-y-6">
                    <h1 className="text-5xl sm:text-6xl font-black text-slate-900 dark:text-white tracking-tighter leading-[0.9]">
                      {csodData.name ? csodData.name.split(" -- ")[0] : "Untitled Job Profile"}
                    </h1>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2 border-t border-slate-100 dark:border-white/5">
                      <StaticDisplay label="CSOD OU ID" value={csodData.id} />
                      <StaticDisplay label="Type Category" value={csodData.typeId === 4 ? "4 (Job Profile)" : csodData.typeId} />
                      <StaticDisplay label="Parent ID" value={csodData.parentId} />
                    </div>
                  </div>
               </div>
            </div>

            {/* Dynamic Content Sections matching our signature format */}
            <div className="space-y-8">
              {parsedSections.map((section, idx) => {
                const listItems = parseListItems(section.content);
                const isList = listItems.length > 0;
                
                return (
                  <section 
                    key={section.title || idx}
                    className="bg-white dark:bg-[#0f172a] rounded-[2.5rem] border border-slate-200/60 dark:border-white/5 shadow-sm overflow-hidden transition-all duration-500"
                  >
                    <JDSectionHeader
                      title={section.title}
                      icon={section.icon || FileText}
                      itemCount={isList ? listItems.length : undefined}
                      description={section.desc}
                    />
                    <div className="p-8 pt-2">
                      <div className="bg-slate-50/50 dark:bg-white/5 rounded-[2rem] p-6 border border-slate-100 dark:border-white/5">
                        {isList ? (
                          // High fidelity list layouts tailored to match exactly our standard JD styles
                          (() => {
                            const normalizedTitle = section.title.toLowerCase();
                            
                            const extractWeight = (text) => {
                              const regex = /\s*-\s*(\d+%)\s*$/;
                              const match = text.match(regex);
                              if (match) {
                                return { content: text.replace(regex, '').trim(), weight: match[1] };
                              }
                              return { content: text, weight: null };
                            };
                            
                            // 1. Key Responsibilities List Style with numbered rounded indicators
                            if (normalizedTitle.includes("key responsibilities") || normalizedTitle.includes("duties")) {
                              return (
                                <div className="space-y-4">
                                  {listItems.map((item, i) => {
                                    const { content, weight } = extractWeight(item);
                                    return (
                                      <div key={i} className="group flex gap-4 items-center p-4 bg-white dark:bg-white/[0.01] rounded-2xl border border-slate-100 dark:border-white/5 transition-all duration-300 hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-100 dark:hover:border-indigo-500/30">
                                        <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0 shadow-sm text-[10px] font-black text-indigo-500 transition-colors duration-300 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600">
                                          {String(i + 1).padStart(2, '0')}
                                        </div>
                                        <div className="flex-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 leading-relaxed uppercase" {...sanitizedHtmlProps(content)} />
                                        {weight && (
                                          <div className="flex flex-col items-center justify-center shrink-0 pl-6 border-l border-slate-100 dark:border-white/5">
                                            <span className="text-[13px] font-black text-indigo-600 dark:text-indigo-400 leading-none mb-1">{weight}</span>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Weight</span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            }
                            
                            // 2. Core Competencies List Style (emerald capsules)
                            if (normalizedTitle.includes("core competencies")) {
                              return (
                                <div className="space-y-4">
                                  {listItems.map((item, i) => {
                                    const { content, weight } = extractWeight(item);
                                    return (
                                      <div key={i} className="group relative overflow-hidden p-5 bg-emerald-50/50 dark:bg-emerald-500/5 rounded-2xl border border-emerald-100/50 dark:border-emerald-500/10 flex items-center justify-between transition-all duration-300 hover:bg-white dark:hover:bg-emerald-500/10 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-0.5">
                                        <div className="absolute inset-y-0 left-0 w-1.5 bg-emerald-400 transform scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-bottom" />
                                        <div className="text-[11px] font-bold text-slate-750 dark:text-slate-300 leading-relaxed" {...sanitizedHtmlProps(content)} />
                                        {weight && (
                                          <div className="px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold shadow-sm shrink-0">
                                            {weight}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            }
                            
                            // 3. Functional Competencies List Style (blue capsules)
                            if (normalizedTitle.includes("functional competencies")) {
                              return (
                                <div className="space-y-4">
                                  {listItems.map((item, i) => {
                                    const { content, weight } = extractWeight(item);
                                    return (
                                      <div key={i} className="group relative overflow-hidden p-5 bg-blue-50/50 dark:bg-blue-500/5 rounded-2xl border border-blue-100/50 dark:border-blue-500/10 flex items-center justify-between transition-all duration-300 hover:bg-white dark:hover:bg-blue-500/10 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-0.5">
                                        <div className="absolute inset-y-0 left-0 w-1.5 bg-blue-400 transform scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-bottom" />
                                        <div className="text-[11px] font-bold text-slate-750 dark:text-slate-300 leading-relaxed" {...sanitizedHtmlProps(content)} />
                                        {weight && (
                                          <div className="px-2.5 py-1 rounded-full bg-blue-500 text-white text-[10px] font-bold shadow-sm shrink-0">
                                            {weight}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            }

                            // 4. Required Qualifications List Style (rose checks)
                            if (normalizedTitle.includes("required qualifications")) {
                              return (
                                <ul className="space-y-4">
                                  {listItems.map((item, i) => {
                                    const { content, weight } = extractWeight(item);
                                    return (
                                      <li key={i} className="flex gap-4 items-center group transition-transform duration-300 hover:translate-x-1 cursor-default">
                                        <div className="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-500/15 flex items-center justify-center shrink-0 transition-colors duration-300 group-hover:bg-rose-500">
                                          <CheckCircle2 size={12} className="text-rose-500 transition-colors duration-300 group-hover:text-white" />
                                        </div>
                                        <div className="flex-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 leading-tight" {...sanitizedHtmlProps(content)} />
                                        {weight && (
                                          <span className="text-[11px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded-full">{weight}</span>
                                        )}
                                      </li>
                                    );
                                  })}
                                </ul>
                              );
                            }

                            // 5. Preferred Qualifications List Style (amber checks)
                            if (normalizedTitle.includes("preferred qualifications")) {
                              return (
                                <ul className="space-y-4">
                                  {listItems.map((item, i) => {
                                    const { content, weight } = extractWeight(item);
                                    return (
                                      <li key={i} className="flex gap-4 items-center group transition-transform duration-300 hover:translate-x-1 cursor-default">
                                        <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-500/15 flex items-center justify-center shrink-0 transition-colors duration-300 group-hover:bg-amber-500">
                                          <CheckCircle2 size={12} className="text-amber-500 transition-colors duration-300 group-hover:text-white" />
                                        </div>
                                        <div className="flex-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 leading-tight" {...sanitizedHtmlProps(content)} />
                                        {weight && (
                                          <span className="text-[11px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full">{weight}</span>
                                        )}
                                      </li>
                                    );
                                  })}
                                </ul>
                              );
                            }
                            
                            // Default list fallback (Standard Indigo checked list items)
                            return (
                              <ul className="space-y-4">
                                {listItems.map((item, i) => {
                                  const { content, weight } = extractWeight(item);
                                  return (
                                    <li key={i} className="flex gap-4 items-center group">
                                      <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 flex items-center justify-center shrink-0">
                                        <CheckCircle2 size={12} className="text-indigo-500" />
                                      </div>
                                      <div className="flex-1 text-sm font-medium text-slate-600 dark:text-slate-400 leading-tight" {...sanitizedHtmlProps(content)} />
                                      {weight && (
                                        <span className="text-[11px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-full">{weight}</span>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            );
                          })()
                        ) : (
                          // Paragraph Fallback for Narrative/Summary/EEO sections
                          <div 
                            className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 text-sm leading-relaxed
                              prose-headings:text-slate-900 dark:prose-headings:text-white prose-headings:font-bold prose-headings:mt-6 prose-headings:mb-3
                              prose-p:mb-4 prose-ul:list-disc prose-ul:pl-6 prose-ul:mb-4 prose-li:mb-1.5"
                            {...sanitizedHtmlProps(section.content)}
                          />
                        )}
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>

          </div>

          {/* ─── SIDEBAR (Right Column) ─── */}
          <div className="col-span-12 lg:col-span-4 space-y-8 sticky top-10">
            
            {/* Status Integration Card */}
            <div className="bg-white dark:bg-[#0f172a] rounded-[2.5rem] p-8 border border-slate-200/60 dark:border-white/5 shadow-sm space-y-8 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-2xl rounded-full" />
               <div className="flex items-center justify-between relative z-10">
                 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                   <Zap className="w-4 h-4 text-indigo-500" /> Synchronization Status
                 </h3>
                 <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_currentColor]" />
               </div>

               <div className="p-8 rounded-[2rem] border bg-emerald-500/10 border-emerald-500/20 flex flex-col items-center text-center gap-5 relative z-10 transition-all duration-500 group-hover:scale-[1.02]">
                  <div className="w-16 h-16 rounded-3xl bg-white dark:bg-[#020617] flex items-center justify-center border-2 border-white dark:border-white/10 shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-emerald-500/10 opacity-20" />
                    <CheckCircle2 size={32} className="text-emerald-600 relative z-10" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                      Synchronized
                    </p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest opacity-60 italic">Cornerstone Active OU</p>
                  </div>
               </div>
            </div>

            {/* OU Properties Card */}
            <div className="bg-white dark:bg-[#0f172a] rounded-[2.5rem] p-8 border border-slate-200/60 dark:border-white/5 shadow-sm space-y-6">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-500" /> OU Properties
               </h3>
               <div className="space-y-4">
                 <div className="p-4 bg-slate-50/50 dark:bg-white/[0.03] rounded-2xl border border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Org Unit ID</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">{csodData.id}</span>
                 </div>
                  <div className="p-4 bg-slate-50/50 dark:bg-white/[0.03] rounded-2xl border border-slate-100 dark:border-white/5 flex items-center justify-between gap-4">
                     <span className="text-xs font-bold text-slate-400 shrink-0">External Code</span>
                     <div className="flex items-center gap-2 max-w-[65%]">
                       <span 
                         title={csodData.externalId || "N/A"}
                         className="text-sm font-black text-slate-900 dark:text-white truncate cursor-help"
                       >
                         {csodData.externalId || "N/A"}
                       </span>
                       {csodData.externalId && (
                         <button
                           onClick={handleCopy}
                           className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-400 hover:text-indigo-500 transition-colors shrink-0"
                           title="Copy External Code"
                         >
                           {copied ? (
                             <Check size={14} className="text-emerald-500" />
                           ) : (
                             <Copy size={14} />
                           )}
                         </button>
                       )}
                     </div>
                  </div>
                 <div className="p-4 bg-slate-50/50 dark:bg-[#0f172a] border border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Type Category</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">{csodData.typeId === 4 ? "Job Profile" : csodData.typeId}</span>
                 </div>
                 <div className="p-4 bg-slate-50/50 dark:bg-white/[0.03] rounded-2xl border border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Parent ID</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">{csodData.parentId}</span>
                 </div>
               </div>
            </div>

            {/* Custom CSOD Fields Section */}
            {csodData.customFields && csodData.customFields.length > 0 && (
              <div className="bg-white dark:bg-[#0f172a] rounded-[2.5rem] p-8 border border-slate-200/60 dark:border-white/5 shadow-sm space-y-6">
                 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-500" /> Custom CSOD Fields
                 </h3>
                 <div className="space-y-4">
                    {csodData.customFields.map((field) => (
                      <div key={field.id} className="p-5 bg-slate-50 dark:bg-white/[0.03] rounded-3xl border border-slate-100 dark:border-white/5 hover:border-indigo-500/20 transition-all">
                         <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Field ID: {field.id}</span>
                         </div>
                         <p className="text-sm text-slate-800 dark:text-slate-200 font-bold leading-relaxed">{field.value || "No Value"}</p>
                      </div>
                    ))}
                 </div>
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}
