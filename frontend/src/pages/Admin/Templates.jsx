import { useContext, useEffect, useState, useRef, useMemo } from "react";
import TemplateCardSkeleton from "../../components/Admin/TemplateCardSkeleton";
import FilterDropdown from "../../components/common/FilterDropdown";
import { getTemplates, usePublicTemplate, getTemplateIndustries } from "../../services/templateService";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { JDContext } from "../../context/JDContext";
import toast from "react-hot-toast";
import {
  LayoutTemplate,
  Sparkles,
  Search,
  Globe,
  X,
  ArrowRight,
  ChevronDown,
  Briefcase,
  Heart,
  FolderHeart,
  MapPin,
  FileText,
  Award,
  Zap,
  Eye,
  Copy,
  Download,
  Check,
  RotateCcw,
  BookOpen,
  Sliders,
  CheckSquare,
  Building2,
  ShieldAlert,
  Wrench,
  Link,
  Hash,
  Target,
  Banknote,
} from "lucide-react";

import MorphingCard from "../../components/common/MorphingCard";
import Pagination from "../../components/common/Pagination";
import TemplateLibraryHero3D from "../../components/admin/TemplateLibraryHero3D";

const TEMPLATE_INDUSTRY_PRESETS = [
  "Airlines",
  "Aviation",
  "Educational Service",
  "Finance",
  "Healthcare",
  "Hospital",
  "Legal Service",
  "Logistics",
  "Manufacturing",
  "Retail",
  "Technology"
];

const popularTags = ["Critical Care", "Oncologist", "Trauma Surgeon", "Developer", "Retail"];

export default function Templates() {
  const { user, detectedRegion } = useContext(JDContext);

  const getSafeRegion = () => {
    if (user?.region && user.region !== "string") return user.region;
    if (detectedRegion && detectedRegion !== "string") return detectedRegion;
    return "IN";
  };

  const location = useLocation();
  const [searchParams] = useSearchParams();
  const initialSearch = location.state?.search || searchParams.get("search") || "";
  const initialRegion = initialSearch ? "All" : getSafeRegion();

  const [templates, setTemplates] = useState([]);
  const [industry, setIndustry] = useState("All");
  const [activeRegion, setActiveRegion] = useState(initialRegion);
  const [searchQuery, setSearchQuery] = useState(initialSearch || "");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(initialSearch || "");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);
  const [usingTemplateId, setUsingTemplateId] = useState(null);
  const [dynamicIndustries, setDynamicIndustries] = useState([]);
  const [viewMode, setViewMode] = useState("grid");
  const [loading, setLoading] = useState(true);

  // Custom Dropdown States
  const [isIndustryOpen, setIsIndustryOpen] = useState(false);
  const [isRegionOpen, setIsRegionOpen] = useState(false);

  // Selected template state
  const [selectedSplitTemplate, setSelectedSplitTemplate] = useState(null);

  // Customize summary text
  const [customizedSummary, setCustomizedSummary] = useState("");
  const [copied, setCopied] = useState(false);

  // Bookmarks State (Curated list)
  const [bookmarks, setBookmarks] = useState(() => {
    const stored = localStorage.getItem("jdforge_bookmarked_template_ids");
    return stored ? JSON.parse(stored) : [];
  });

  // Keyboard shortcut focus
  const searchInputRef = useRef(null);

  useEffect(() => {
    const fetchIndustries = async () => {
      const inds = await getTemplateIndustries();
      setDynamicIndustries(Array.isArray(inds) ? inds : []);
    };
    fetchIndustries();
  }, []);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [totalTemplates, setTotalTemplates] = useState(0);

  // Dynamic Layout Ref for Sticky Panel (bypasses state for 60fps scroll)
  const rightPanelRef = useRef(null);
  const pillRef = useRef(null);

  // Custom Dropdown click-outside logic
  const industryDropdownRef = useRef(null);
  const regionDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (industryDropdownRef.current && !industryDropdownRef.current.contains(e.target)) {
        setIsIndustryOpen(false);
      }
      if (regionDropdownRef.current && !regionDropdownRef.current.contains(e.target)) {
        setIsRegionOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleScroll = (e) => {
    const currentScrollY = e.target.scrollTop;
    
    if (rightPanelRef.current) {
      rightPanelRef.current.style.height = `calc(100vh - ${Math.max(200, 440 - currentScrollY)}px)`;
    }

    if (pillRef.current) {
      // Toggle a data attribute to let Tailwind smoothly transition the background!
      pillRef.current.setAttribute('data-scrolled', currentScrollY > 100 ? 'true' : 'false');
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, industry, activeRegion]);

  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [animatingCard, setAnimatingCard] = useState(null);

  const navigate = useNavigate();
  const cardRefs = useRef({});

  // Keyboard listener for Cmd/Ctrl+K or "/" to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "/") {
        if (document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);


  const handlePreview = (template, cardElement) => {
    if (!cardElement) return;
    const rect = cardElement.getBoundingClientRect();
    setAnimatingCard({
      template,
      rect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      }
    });

    setTimeout(() => {
      setPreviewTemplate(template);
    }, 50);
  };

  const handleClosePreview = () => {
    setPreviewTemplate(null);
    setTimeout(() => {
      setAnimatingCard(null);
    }, 300);
  };

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await getTemplates({
        page: currentPage,
        limit: pageSize,
        industry: industry === "All" ? undefined : industry,
        country_code: activeRegion === "All" ? undefined : activeRegion,
        title: debouncedSearchQuery || undefined
      });

      setTemplates(data.templates || []);
      setTotalTemplates(data.total || 0);

      // Auto-select first item
      if (data.templates && data.templates.length > 0) {
        setSelectedSplitTemplate(data.templates[0]);
      } else {
        setSelectedSplitTemplate(null);
      }
    } catch (error) {
      console.error("Failed to load templates:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [currentPage, pageSize, industry, activeRegion, debouncedSearchQuery]);

  const handleToggleBookmark = (id) => {
    setBookmarks(prev => {
      const isCurrentlyBookmarked = prev.includes(id);
      const next = isCurrentlyBookmarked ? prev.filter(item => item !== id) : [...prev, id];
      localStorage.setItem("jdforge_bookmarked_template_ids", JSON.stringify(next));
      toast.dismiss();
      if (isCurrentlyBookmarked) {
        toast("Removed from Saved Collection", { icon: "📁" });
      } else {
        toast.success("Saved to Collection!", { icon: "💖" });
      }
      return next;
    });
  };



  const regions = [
    { label: "All Regions", value: "All" },
    { label: "US Region", value: "US" },
    { label: "IN Region", value: "IN" },
    { label: "UK Region", value: "UK" },
    { label: "CA Region", value: "CA" },
    { label: "AU Region", value: "AU" }
  ];

  const industryOptions = useMemo(() => {
    const inds = new Set([...TEMPLATE_INDUSTRY_PRESETS, ...dynamicIndustries]);
    for (const t of templates) {
      if (t.industry) {
        inds.add(String(t.industry).trim());
      }
    }
    
    // Map value (for backend query) to label (for UI)
    const optionsMap = new Map();
    for (const ind of inds) {
      let val = ind;
      let label = ind;
      
      const lower = ind.toLowerCase();
      if (lower === "education services" || lower === "educational service" || lower === "education") {
         val = "Education Services"; // backend value
         label = "Educational Service";
      } else if (lower === "legal services" || lower === "legal service" || lower === "legal") {
         val = "Legal Services"; // backend value
         label = "Legal Service";
      } else if (lower === "healthcare") {
         val = "Healthcare";
         label = "Healthcare";
      } else if (lower === "hospital administration" || lower === "hospital") {
         val = "Hospital";
         label = "Hospital";
      }
      
      // Ensure we don't overwrite with a less preferred case
      if (!optionsMap.has(val)) {
        optionsMap.set(val, label);
      }
    }

    if (industry && industry !== "All") {
       if (!optionsMap.has(industry)) optionsMap.set(industry, industry);
    }
    
    const sortedVals = Array.from(optionsMap.keys())
      .filter(Boolean)
      .sort((a, b) => optionsMap.get(a).localeCompare(optionsMap.get(b), undefined, { sensitivity: "base" }));
      
    const finalOptions = [{ label: "All Industries", value: "All" }];
    const uniqueLabels = new Set(["All Industries"]);
    
    for (const v of sortedVals) {
       const lbl = optionsMap.get(v);
       if (!uniqueLabels.has(lbl)) {
          uniqueLabels.add(lbl);
          finalOptions.push({ label: lbl, value: v });
       }
    }
    
    return finalOptions;
  }, [templates, industry, dynamicIndustries]);
  const handleUseTemplate = async (template) => {
    if (usingTemplateId) return;

    const loadingToast = toast.loading("Creating job description...");
    setUsingTemplateId(template.id);

    try {
      const newJD = await usePublicTemplate(template.id);

      toast.dismiss(loadingToast);
      toast.success("Job description created successfully!");

      const userRole = (user?.role || "").toLowerCase();
      const isAdmin = userRole.includes('admin');
      const isHR = userRole.includes('hr');
      const base = isAdmin ? 'admin' : (isHR ? 'hr' : 'manager');

      const path = (isAdmin || isHR)
        ? `/${base}/jd/${newJD.id}`
        : `/${base}/review/${newJD.id}`;

      const tplContent = template.content || {};
      const innerTplContent = tplContent.content || tplContent;
      const empType = template.employment_type || template.employmentType || innerTplContent.employment_type || innerTplContent.employmentType || "";

      navigate(path, {
        state: {
          fromTemplate: true,
          employment_type: empType
        }
      });
    } catch (error) {
      console.error("Failed to use template:", error);
      toast.dismiss(loadingToast);
      toast.error(error.message || "Could not create job description from template.");
    } finally {
      setUsingTemplateId(null);
    }
  };

  const extractString = (val) => {
    if (!val) return "";
    if (typeof val === "string") return val;
    if (typeof val === "object") {
      return String(val.point || val.title || val.duty || val.description || val.name || val.text || JSON.stringify(val));
    }
    return String(val);
  };

  // Pre-calculations
  const selectedTemplate = selectedSplitTemplate || templates[0];
  const totalPages = Math.ceil(totalTemplates / pageSize);

  const templateContent = selectedTemplate?.content || {};
  const innerContent = templateContent.content || templateContent;

  const baseSummary = selectedTemplate?.professional_summary || selectedTemplate?.responsibilities_overview || innerContent.summary || "";
  const splitSummary = customizedSummary || baseSummary;

  const splitDuties = selectedTemplate?.key_responsibilities || innerContent.duties || innerContent.responsibilities || innerContent.key_duties || [];
  const splitQuals = selectedTemplate?.key_qualifications || innerContent.qualifications || innerContent.skills || [
    ...(innerContent.qualifications_required || innerContent.qualifications?.required || []),
    ...(innerContent.qualifications_preferred || innerContent.qualifications?.preferred || []),
    ...(innerContent.required_licenses_certifications || innerContent.licenses_and_certifications || [])
  ];

  const reqQualsRaw = innerContent.qualifications_required || innerContent.qualifications?.required || [];
  const prefQualsRaw = innerContent.qualifications_preferred || innerContent.qualifications?.preferred || [];
  const hasStructuredQuals = reqQualsRaw.length > 0 || prefQualsRaw.length > 0;
  const finalReqQuals = hasStructuredQuals ? reqQualsRaw : splitQuals;
  const finalPrefQuals = prefQualsRaw;

  const splitCoreCompetencies = selectedTemplate?.core_competencies || innerContent.core_competencies || splitQuals || [];
  const splitFunctionalCompetencies = selectedTemplate?.functional_competencies || innerContent.functional_competencies || [];
  const splitTools = selectedTemplate?.tools_and_technologies || innerContent.tools_and_technologies || selectedTemplate?.tools_technologies || innerContent.tools_technologies || [];
  const splitCompliance = selectedTemplate?.compliance_and_regulatory || innerContent.compliance_and_regulatory || selectedTemplate?.compliance_regulatory || innerContent.compliance_regulatory || [];

  const rightPanelDept = selectedTemplate?.department || innerContent.department || templateContent.department || "";
  const rightPanelEmp = selectedTemplate?.employment_type || selectedTemplate?.employmentType || innerContent.employment_type || innerContent.employmentType || "";

  // Sync custom summary when active template switches
  useEffect(() => {
    setCustomizedSummary("");
  }, [selectedTemplate?.id]);

  const handleCopyText = () => {
    const textToCopy = `Title: ${selectedTemplate.title}\nSummary: ${splitSummary}\nDuties:\n${splitDuties.map((d, i) => `${i + 1}. ${extractString(d)}`).join("\n")}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success("Copied spec details!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      onScroll={handleScroll}
      className="h-full bg-[#f4f6f9] text-slate-800 flex flex-col font-sans relative overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300/80 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400"
    >

      {/* Delicate background blur accent spots */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-40">
        <div className="absolute top-[5%] left-[20%] w-[400px] h-[400px] rounded-full bg-indigo-200/40 blur-[120px]" />
        <div className="absolute bottom-[10%] right-[10%] w-[450px] h-[450px] rounded-full bg-rose-200/30 blur-[135px]" />
      </div>

      {/* ─── PREMIUM DARK HEADER ─── */}
      <div className="relative z-10 mx-6 mt-6 mb-8 bg-gradient-to-b from-slate-900 to-slate-800 p-8 sm:p-10 rounded-[2rem] shadow-xl shadow-slate-900/10 border border-slate-800 overflow-hidden shrink-0">
        <div className="absolute top-0 left-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 right-10 w-72 h-72 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 grid lg:grid-cols-[1fr_minmax(220px,280px)] gap-6 items-stretch">
          <div className="flex flex-col justify-center min-w-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-indigo-100 text-[10px] font-bold uppercase tracking-widest mb-4 border border-white/10 backdrop-blur-md w-fit">
              <LayoutTemplate className="w-3.5 h-3.5 text-amber-400" /> Standardized Suite
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2 leading-tight">
              Template Library
            </h1>
            <p className="text-slate-300 text-sm font-medium leading-relaxed max-w-xl">
              Access, customize, and manage standard organizational job descriptions.
            </p>
          </div>

          <div className="flex flex-col gap-3 min-h-[200px]">
            <div className="flex flex-col bg-white/5 border border-white/10 backdrop-blur-md px-4 py-3 rounded-2xl shadow-sm text-center shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total Templates</span>
              <span className="text-2xl font-black text-white tabular-nums">{totalTemplates.toLocaleString('en-IN')}</span>
            </div>
            <div className="relative rounded-[1.25rem] border border-white/10 bg-white/[0.04] backdrop-blur-sm overflow-hidden h-[160px] shadow-inner shadow-amber-500/5">
              <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900/60 border border-white/10">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Live Catalog</span>
              </div>
              <TemplateLibraryHero3D templateCount={totalTemplates} />
            </div>
          </div>
        </div>
      </div>

      {/* ─── FLOATING COMMAND PILL (Sticky) ─── */}
      <div className="sticky top-4 z-50 mx-6 mb-8 transition-all shrink-0">
        <div 
          ref={pillRef}
          data-scrolled="false"
          className={`max-w-[800px] mx-auto backdrop-blur-2xl rounded-[100px] p-2 flex items-center gap-2 transition-all duration-500 ease-in-out pointer-events-auto border data-[scrolled=false]:bg-white/60 data-[scrolled=false]:border-white data-[scrolled=false]:shadow-[0_8px_32px_rgba(0,0,0,0.08)] data-[scrolled=true]:bg-white data-[scrolled=true]:border-slate-200 data-[scrolled=true]:shadow-[0_12px_40px_rgba(0,0,0,0.12)] hover:bg-white ${isSearchFocused ? '!max-w-[1200px]' : ''}`}
        >

          {/* Search */}
          <div className="relative group flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search timeline..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className="w-full bg-transparent outline-none pl-10 pr-28 py-2 text-slate-700 placeholder:text-slate-400 text-[13px] font-semibold"
            />
            {/* Keyboard Shortcut Badges */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none opacity-60 group-focus-within:opacity-0 transition-opacity duration-300">
              <span className="px-1.5 py-0.5 rounded-md border border-slate-300 bg-white/50 text-[9px] font-black text-slate-500 shadow-sm flex items-center">
                <span className="font-sans mr-0.5 text-[10px]">⌘</span>/
              </span>
              <span className="text-[9px] font-bold text-slate-400">or</span>
              <span className="px-1.5 py-0.5 rounded-md border border-slate-300 bg-white/50 text-[9px] font-black text-slate-500 shadow-sm">
                Ctrl /
              </span>
            </div>
          </div>

          <div className="w-[1px] h-6 bg-slate-300 mx-1" />

          {/* Filters */}
          <div className="flex items-center gap-1 shrink-0">
            
            {/* Custom Industry Dropdown */}
            <div className="relative" ref={industryDropdownRef}>
              <button
                onClick={() => { setIsIndustryOpen(!isIndustryOpen); setIsRegionOpen(false); }}
                className="flex items-center gap-2 pl-4 pr-3 py-2 hover:bg-slate-100/50 rounded-[100px] transition-colors text-[12px] font-bold text-slate-700 outline-none"
              >
                {industryOptions.find(o => o.value === industry)?.label || "All Sectors"}
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-300 ${isIndustryOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isIndustryOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-slate-100 p-1.5 z-50 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-2 duration-200 max-h-[300px] overflow-y-auto custom-scrollbar">
                    <button
                      onClick={() => { setIndustry("All"); setIsIndustryOpen(false); }}
                      className={`text-left px-3 py-2.5 rounded-xl text-[12px] font-bold transition-colors ${industry === "All" ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      All Sectors
                    </button>
                    {industryOptions.filter(opt => opt.value !== "All").map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { setIndustry(opt.value); setIsIndustryOpen(false); }}
                        className={`text-left px-3 py-2.5 rounded-xl text-[12px] font-bold transition-colors ${industry === opt.value ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
              )}
            </div>

            <div className="w-[1px] h-4 bg-slate-200 mx-1" />

            {/* Custom Region Dropdown */}
            <div className="relative" ref={regionDropdownRef}>
              <button
                onClick={() => { setIsRegionOpen(!isRegionOpen); setIsIndustryOpen(false); }}
                className="flex items-center gap-2 pl-3 pr-4 py-2 hover:bg-slate-100/50 rounded-[100px] transition-colors text-[12px] font-bold text-slate-700 outline-none"
              >
                {regions.find(r => r.value === activeRegion)?.label || "All Regions"}
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-300 ${isRegionOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isRegionOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-slate-100 p-1.5 z-50 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-2 duration-200">
                    {regions.map(reg => (
                      <button
                        key={reg.value}
                        onClick={() => { setActiveRegion(reg.value); setIsRegionOpen(false); }}
                        className={`text-left px-3 py-2.5 rounded-xl text-[12px] font-bold transition-colors ${activeRegion === reg.value ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        {reg.label}
                      </button>
                    ))}
                  </div>
              )}
            </div>
            
          </div>

        </div>
      </div>



      {/* ─── DYNAMIC STUDIO WORKBENCH MAIN CANVAS ─── */}
      <div className="flex-1 flex flex-col lg:flex-row px-6 pb-6 gap-6 relative z-10">

        {/* LEFT COLUMN: CONNECTED ROADMAP TIMELINE */}
        <main className="flex-1 flex flex-col">

          <div className="mb-4 flex items-center justify-between px-2">
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">
                Available Templates
              </p>
              <h2 className="text-xs font-extrabold text-slate-600 mt-2 flex items-center gap-1.5">
                <span>{activeRegion === "All" ? "Global Scope" : `${activeRegion} Region`}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span>{industry === "All" ? "All Industries" : industry}</span>
              </h2>
            </div>

            {/* <span className="text-[10px] font-bold text-slate-500">
              {totalTemplates.toLocaleString('en-IN')} Templates
            </span> */}
          </div>

          {/* Timeline scroll deck */}
          <div className="pr-1 pb-4">
            <div className="relative pl-8 space-y-4 2xl:space-y-6">
              {/* Elegant vertical roadmap connector laser line */}
              <div className="absolute left-3 top-4 bottom-4 w-0.5 bg-gradient-to-b from-indigo-300 via-indigo-500 to-indigo-300 pointer-events-none" />

              {loading ? (
                Array.from({ length: pageSize }).map((_, index) => (
                  <div key={index} className="relative p-4 2xl:p-5 mr-3 bg-white border border-white shadow-[3px_3px_10px_#e2e8f0] rounded-[20px] 2xl:rounded-[28px] flex flex-col justify-between gap-3 2xl:gap-4 animate-pulse">
                    
                    {/* Glowing active node point on the timeline line */}
                    <div className="absolute -left-7 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 bg-slate-100 border-slate-200" />
                    
                    <div>
                      {/* Top metadata badge caps */}
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-4 bg-slate-100 rounded-md" />
                          <div className="w-24 h-4 bg-slate-50 rounded-md" />
                        </div>
                      </div>

                      {/* Header Title */}
                      <div className="w-48 h-5 bg-slate-200 rounded-md mt-1" />

                      {/* Summary */}
                      <div className="w-full h-3 bg-slate-100/80 rounded-md mt-3 2xl:mt-4" />
                      <div className="w-4/5 h-3 bg-slate-100/80 rounded-md mt-1.5" />
                    </div>

                    {/* Stats footer row */}
                    <div className="pt-2.5 2xl:pt-3 border-t border-slate-50 flex flex-wrap items-center gap-3">
                      <div className="w-16 h-6 bg-slate-100/60 rounded-lg" />
                      <div className="w-20 h-6 bg-slate-100/60 rounded-lg" />
                      <div className="w-28 h-6 bg-slate-100/60 rounded-lg" />
                      <div className="w-16 h-6 bg-slate-100/60 rounded-lg" />
                    </div>
                  </div>
                ))
              ) : templates.length > 0 ? (
                templates.map((tpl, index) => {
                  const isSelected = selectedTemplate?.id === tpl.id;
                  const config = industryConfig[tpl.industry] || industryConfig.Technology;
                  const isBookmarked = bookmarks.includes(tpl.id);
                  const tplContent = tpl.content || {};
                  const innerTplContent = tplContent.content || tplContent;
                  const summaryText = tpl.professional_summary || tpl.responsibilities_overview || innerTplContent.summary || "";
                  const dCount = tpl.key_responsibilities?.length || innerTplContent.duties?.length || innerTplContent.responsibilities?.length || innerTplContent.key_duties?.length || 0;
                  const qCount = tpl.key_qualifications?.length || innerTplContent.qualifications?.length || innerTplContent.skills?.length || 0;

                  const deptVal = tpl.department || innerTplContent.department || tplContent.department || "";
                  const empVal = tpl.employment_type || tpl.employmentType || innerTplContent.employment_type || innerTplContent.employmentType || "";
                  const codeVal = tpl.template_code || tpl.id?.slice(0, 8) || "N/A";
                  const levelVal = tpl.job_level || tpl.jobLevel || innerTplContent.job_level || innerTplContent.jobLevel || innerTplContent.level || "Standard Level";

                  // Step count indicators
                  const stepNum = (currentPage - 1) * pageSize + index + 1;
                  const stageStr = stepNum <= 2 ? "Stage 01: Core Associate" : stepNum <= 4 ? "Stage 02: Operational Lead" : "Stage 03: Executive Director";

                  return (
                    <div
                      key={tpl.id}
                      ref={el => cardRefs.current[tpl.id] = el}
                      onClick={() => setSelectedSplitTemplate(tpl)}
                      className={`relative p-4 2xl:p-5 mr-3 bg-white border transition-all duration-300 rounded-[20px] 2xl:rounded-[28px] cursor-pointer flex flex-col justify-between gap-3 2xl:gap-4 group ${isSelected
                        ? 'border-indigo-500 bg-white shadow-[6px_6px_20px_#d1d9e6] ring-1 ring-indigo-500/10'
                        : 'border-white shadow-[3px_3px_10px_#e2e8f0] hover:shadow-md hover:-translate-y-0.5'
                        }`}
                    >
                      {/* Glowing active node point on the timeline line */}
                      <div className={`absolute -left-7 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 transition-all ${isSelected
                        ? 'bg-indigo-600 border-white scale-125 shadow-md shadow-indigo-500/20'
                        : 'bg-white border-indigo-400 group-hover:scale-110'
                        }`} />

                      <div>
                        {/* Top metadata badge caps */}
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-0.5 text-[8px] font-black rounded-md ${config.bg} ${config.text}`}>
                              {stageStr}
                            </span>

                            {(tpl.location || innerTplContent.location) && (
                              <span className="text-[9px] font-bold text-slate-500 flex items-center gap-1">
                                <MapPin className="w-2.5 h-2.5 text-rose-400" />
                                {tpl.location || innerTplContent.location}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Header Title */}
                        <h3 className="font-extrabold text-slate-900 text-sm tracking-tight leading-tight group-hover:text-indigo-600 transition-colors">
                          {tpl.title}
                        </h3>

                        <p className="text-[11px] text-slate-500 line-clamp-1 2xl:line-clamp-2 mt-1.5 2xl:mt-2 leading-relaxed font-sans">
                          {summaryText}
                        </p>
                      </div>

                      {/* Stats footer row */}
                      <div className="pt-2.5 2xl:pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-[10px] font-bold text-slate-500 gap-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-lg">
                            <Hash className="w-3.5 h-3.5 text-indigo-500" />
                            {codeVal}
                          </span>
                          <span className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-lg">
                            <Target className="w-3.5 h-3.5 text-emerald-500" />
                            {levelVal}
                          </span>
                          {deptVal && (
                            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-lg" title={deptVal}>
                              <Building2 className="w-3.5 h-3.5 text-indigo-500/70" />
                              {deptVal}
                            </span>
                          )}
                          {empVal && (
                            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-lg" title={empVal}>
                              <Briefcase className="w-3.5 h-3.5 text-amber-500/70" />
                              {empVal}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center bg-white border border-white rounded-[28px] shadow-[3px_3px_10px_#e2e8f0]">
                  <Briefcase className="w-12 h-12 text-slate-300 mb-3" />
                  <h4 className="text-sm font-extrabold text-slate-700">No timeline steps found</h4>
                  <p className="text-xs text-slate-400 max-w-xs mt-1">Try resetting filters or adjusting search queries.</p>
                </div>
              )}
            </div>
          </div>

          {/* Pagination bar */}
          {templates.length > 0 && (
            <div className="mt-4 p-2 rounded-2xl bg-white border border-white shadow-[3px_3px_10px_#e2e8f0]">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                pageSize={pageSize}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setCurrentPage(1);
                }}
                totalResults={totalTemplates}
              />
            </div>
          )}

        </main>

        {/* RIGHT COLUMN: EXECUTIVE WORKSPACE SPECS DRAW PANEL (FIXED POSITIONED) */}
        <section 
          ref={rightPanelRef}
          style={{ height: 'calc(100vh - 440px)' }}
          className="w-full lg:w-[220px] xl:w-[250px] 2xl:w-[450px] bg-white border border-slate-100 shadow-[6px_6px_20px_#d1d9e6] rounded-[32px] flex flex-col shrink-0 sticky top-28 z-20 overflow-hidden"
        >
          {loading ? (
            <div className="flex flex-col h-full overflow-hidden animate-pulse">
              {/* Draft info block header skeleton */}
              <div className="p-4 2xl:p-6 border-b border-slate-200/60 bg-slate-50/50">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-slate-200/60" />
                  <div className="w-32 h-6 bg-slate-200/60 rounded-xl" />
                </div>
                
                <div className="w-3/4 h-5 bg-slate-200 rounded-md mb-2" />
                
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <div className="w-16 h-3 bg-slate-200/70 rounded" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                  <div className="w-20 h-3 bg-slate-200/70 rounded" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                  <div className="w-24 h-3 bg-slate-200/70 rounded" />
                </div>
                
                <div className="mt-3">
                  <div className="w-16 h-4 bg-slate-200/70 rounded" />
                </div>
              </div>

              {/* Slate content paper skeleton */}
              <div className="flex-1 p-4 2xl:p-6 space-y-6 2xl:space-y-8 overflow-hidden bg-white">
                <div className="space-y-3">
                  <div className="w-32 h-3 bg-slate-200 rounded-md mb-3" />
                  <div className="w-full h-2.5 bg-slate-100 rounded-md mb-2" />
                  <div className="w-full h-2.5 bg-slate-100 rounded-md mb-2" />
                  <div className="w-full h-2.5 bg-slate-100 rounded-md mb-2" />
                  <div className="w-3/4 h-2.5 bg-slate-100 rounded-md" />
                </div>

                <div className="space-y-3 pt-2">
                  <div className="w-40 h-3 bg-slate-200 rounded-md mb-3" />
                  {[1, 2, 3].map((_, idx) => (
                    <div key={idx} className="flex gap-3 mb-3">
                      <div className="w-5 h-5 rounded-full bg-slate-200 shrink-0" />
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="w-full h-2.5 bg-slate-100 rounded-md" />
                        <div className="w-5/6 h-2.5 bg-slate-100 rounded-md" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 pt-2">
                  <div className="w-36 h-3 bg-slate-200 rounded-md mb-3" />
                  <div className="w-full h-10 bg-slate-50 border border-slate-100 rounded-xl" />
                  <div className="w-full h-10 bg-slate-50 border border-slate-100 rounded-xl" />
                </div>
              </div>

              {/* Action dispatcher buttons skeleton */}
              <div className="p-6 border-t border-slate-200/60 bg-slate-50/50 flex flex-col gap-3 shrink-0">
                <div className="w-full h-14 bg-slate-200/60 rounded-xl" />
              </div>
            </div>
          ) : selectedTemplate ? (
            <div className="flex flex-col h-full overflow-hidden">

              {/* Draft info block header */}
              <div className="p-4 2xl:p-6 border-b border-slate-200/60 bg-slate-50/50">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shadow-inner">
                    <BookOpen className="w-5 h-5 animate-pulse" />
                  </div>

                  {/* Standard verified checklist */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-xl">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                    <span className="text-[9px] 2xl:text-[10px] font-black uppercase text-indigo-600 font-mono tracking-wider">
                      JD TEMPLATE ACTIVE
                    </span>
                  </div>
                </div>

                <h2 className="text-sm 2xl:text-base font-black text-slate-900 tracking-tight leading-tight">
                  {selectedTemplate.title}
                </h2>

                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-[8px] 2xl:text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">
                    ID: {selectedTemplate.template_code || selectedTemplate.id.slice(0, 8)}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                  <span className="text-[9px] 2xl:text-[10px] font-bold text-indigo-600">
                    {selectedTemplate.industry}
                  </span>

                  {rightPanelDept && (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                      <span className="text-[9px] 2xl:text-[10px] font-bold text-indigo-600 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                        {rightPanelDept}
                      </span>
                    </>
                  )}
                </div>

                {rightPanelEmp && (
                  <div className="flex items-center gap-1.5 mt-2.5">
                    <Briefcase className="w-4 h-4 text-amber-500" />
                    <span className="text-[10px] 2xl:text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                      {rightPanelEmp}
                    </span>
                  </div>
                )}
              </div>

              {/* Slate content paper */}
              <div className="flex-1 overflow-y-auto p-4 2xl:p-6 space-y-6 2xl:space-y-8 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300/80 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400">

                <div className="space-y-3 animate-in fade-in duration-300">
                  <h3 className="text-[9px] 2xl:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4" /> Professional Summary
                  </h3>
                  <div className="px-1">
                    <p className="text-slate-600 text-[11px] 2xl:text-[13px] font-medium leading-relaxed font-sans">
                      {splitSummary || <span className="italic text-slate-400">No summary available.</span>}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 animate-in fade-in duration-300 delay-75">
                  <h3 className="text-[9px] 2xl:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                    <Briefcase className="w-4 h-4" /> Key Responsibilities
                  </h3>
                  {splitDuties.length > 0 ? (
                    <div className="space-y-3">
                      {splitDuties.map((duty, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <span className="w-[22px] h-[22px] rounded-full bg-blue-600 text-white text-[11px] font-black shrink-0 flex items-center justify-center mt-0.5">
                            {idx + 1}
                          </span>
                          <p className="text-slate-700 text-[11px] 2xl:text-[13px] font-bold leading-relaxed pt-0.5">
                            {extractString(duty)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs italic text-slate-500">No responsibilities mapped.</p>
                  )}
                </div>

                {splitCoreCompetencies.length > 0 && (
                  <div className="space-y-3 animate-in fade-in duration-300 delay-100">
                    <h3 className="text-[9px] 2xl:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                      <Award className="w-4 h-4" /> Core Competencies
                    </h3>
                    <div className="space-y-2">
                      {splitCoreCompetencies.map((qual, idx) => (
                        <div key={idx} className="px-3 2xl:px-4 py-2 2xl:py-3 bg-white border border-slate-100 rounded-xl">
                          <p className="text-slate-700 text-[11px] 2xl:text-[13px] font-bold">
                            {extractString(qual)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {splitFunctionalCompetencies.length > 0 && (
                  <div className="space-y-3 animate-in fade-in duration-300 delay-150">
                    <h3 className="text-[9px] 2xl:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                      <Link className="w-4 h-4" /> Functional Competencies
                    </h3>
                    <div className="space-y-2">
                      {splitFunctionalCompetencies.map((comp, idx) => (
                        <div key={idx} className="px-3 2xl:px-4 py-2 2xl:py-3 bg-white border border-slate-100 rounded-xl">
                          <p className="text-slate-700 text-[11px] 2xl:text-[13px] font-bold">
                            {extractString(comp)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {splitTools.length > 0 && (
                  <div className="space-y-3 animate-in fade-in duration-300 delay-200">
                    <h3 className="text-[9px] 2xl:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                      <Wrench className="w-4 h-4" /> Tools & Technologies
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {splitTools.map((tool, idx) => (
                        <span key={idx} className="px-2 py-1 2xl:px-3 2xl:py-1.5 bg-white border border-slate-200 text-slate-700 text-[10px] 2xl:text-[12px] font-bold rounded-lg">
                          {extractString(tool)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {splitCompliance.length > 0 && (
                  <div className="space-y-3 animate-in fade-in duration-300 delay-300">
                    <h3 className="text-[9px] 2xl:text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-2 mb-2">
                      <ShieldAlert className="w-4 h-4" /> Compliance & Regulatory
                    </h3>
                    <div className="space-y-2">
                      {splitCompliance.map((comp, idx) => (
                        <div key={idx} className="p-2 2xl:p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl shadow-sm">
                          <p className="text-[11px] 2xl:text-sm font-bold uppercase tracking-wide">
                            {extractString(comp)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(finalReqQuals.length > 0 || finalPrefQuals.length > 0) && (
                  <div className="space-y-4 animate-in fade-in duration-300 delay-300 pt-2 border-t border-slate-100">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                      <Award className="w-4 h-4" /> Qualifications
                    </h3>

                    {finalReqQuals.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Required</h4>
                        <ul className="space-y-2 pl-4">
                          {finalReqQuals.map((qual, idx) => (
                            <li key={idx} className="text-slate-600 text-[13px] font-medium leading-relaxed relative before:absolute before:left-[-12px] before:top-[8px] before:w-1.5 before:h-1.5 before:bg-blue-500 before:rounded-full">
                              {extractString(qual)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {finalPrefQuals.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Preferred</h4>
                        <ul className="space-y-2 pl-4">
                          {finalPrefQuals.map((qual, idx) => (
                            <li key={idx} className="text-slate-600 text-[13px] font-medium leading-relaxed relative before:absolute before:left-[-12px] before:top-[8px] before:w-1.5 before:h-1.5 before:bg-blue-500 before:rounded-full">
                              {extractString(qual)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Action dispatcher buttons */}
              <div className="p-6 border-t border-slate-200/60 bg-slate-50/50 flex flex-col gap-3">
                <button
                  onClick={() => handleUseTemplate(selectedTemplate)}
                  disabled={usingTemplateId === selectedTemplate.id}
                  className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-98 ${usingTemplateId === selectedTemplate.id
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20 hover:shadow-lg'
                    }`}
                >
                  {usingTemplateId === selectedTemplate.id ? "Deploying..." : "USE THIS TEMPLATE"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6 text-center">
              <Briefcase className="w-12 h-12 mb-3 text-slate-300" />
              <h4 className="text-sm font-extrabold text-slate-700">No draft loaded</h4>
              <p className="text-xs text-slate-400 max-w-xs mt-1">Select any job role profile from the feed to inspect and customize details immediately.</p>
            </div>
          )}
        </section>

      </div>

      {/* Morphing preview card modal */}
      {previewTemplate && animatingCard && (
        <MorphingCard
          cardData={animatingCard}
          onClose={handleClosePreview}
          onUse={handleUseTemplate}
        />
      )}
    </div>
  );
}

const CheckCircle2 = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const industryConfig = {
  Technology: { bg: "bg-indigo-50 border border-indigo-100", text: "text-indigo-600" },
  Healthcare: { bg: "bg-emerald-50 border border-emerald-100", text: "text-emerald-600" },
  Finance: { bg: "bg-amber-50 border border-amber-100", text: "text-amber-600" },
  Manufacturing: { bg: "bg-slate-100 border border-slate-200", text: "text-slate-600" },
  Logistics: { bg: "bg-cyan-50 border border-cyan-100", text: "text-cyan-600" },
  Retail: { bg: "bg-rose-50 border border-rose-100", text: "text-rose-600" },
  Aviation: { bg: "bg-teal-50 border border-teal-100", text: "text-teal-600" },
  Airlines: { bg: "bg-sky-50 border border-sky-100", text: "text-sky-600" },
  Hospital: { bg: "bg-red-50 border border-red-100", text: "text-red-600" }
};
