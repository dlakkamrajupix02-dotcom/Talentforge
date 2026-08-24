import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { JDContext } from "../../context/JDContext";
import * as jdService from "../../services/jdService";
import { getAppliedJobs } from "../../services/candidateService";
import toast from "react-hot-toast";
import {
  Briefcase,
  Calendar,
  ArrowRight,
  Copy,
  Check,
  AlertCircle,
  Laptop,
  Heart,
  Coins,
  Users,
  Megaphone,
  Layers,
  Archive,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatSalaryRange } from "../../utils/formatJD";
import JobOpeningsHero from "../../components/job-openings/JobOpeningsHero";
import JobFiltersBar from "../../components/job-openings/JobFiltersBar";
import { AdminJobTabs, EndUserJobTabs } from "../../components/job-openings/JobOpeningsTabs";
import OpeningsSummaryCard from "../../components/job-openings/OpeningsSummaryCard";
import "./job-openings.css";

const getHash = (str) => {
  let hash = 0;
  const s = String(str || "");
  for (let i = 0; i < s.length; i++) {
    hash = s.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

const getDeptIndex = (dept) => {
  const d = (dept || "").toLowerCase();
  if (d.includes("tech") || d.includes("eng") || d.includes("developer") || d.includes("react")) {
    return 0;
  }
  if (d.includes("health") || d.includes("med") || d.includes("science")) {
    return 1;
  }
  if (d.includes("finance") || d.includes("bank") || d.includes("accounting") || d.includes("coins")) {
    return 2;
  }
  if (d.includes("hr") || d.includes("people") || d.includes("recruit")) {
    return 3;
  }
  if (d.includes("sales") || d.includes("market") || d.includes("comm") || d.includes("entertainment") || d.includes("playzone")) {
    return 4;
  }
  if (d.includes("ops") || d.includes("operation") || d.includes("faculty") || d.includes("admin")) {
    return 5;
  }
  return getHash(d) % 6;
};

const getDeptColors = (dept) => {
  const idx = getDeptIndex(dept);
  switch (idx) {
    case 0:
      return {
        accent: "bg-indigo-500",
        badge: "bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
        glow: "group-hover:shadow-[0_20px_50px_rgba(99,102,241,0.12)]"
      };
    case 1:
      return {
        accent: "bg-emerald-500",
        badge: "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        glow: "group-hover:shadow-[0_20px_50px_rgba(16,185,129,0.12)]"
      };
    case 2:
      return {
        accent: "bg-cyan-500",
        badge: "bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
        glow: "group-hover:shadow-[0_20px_50px_rgba(6,182,212,0.12)]"
      };
    case 3:
      return {
        accent: "bg-rose-500",
        badge: "bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/20",
        glow: "group-hover:shadow-[0_20px_50px_rgba(244,63,94,0.12)]"
      };
    case 4:
      return {
        accent: "bg-amber-500",
        badge: "bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/20",
        glow: "group-hover:shadow-[0_20px_50px_rgba(245,158,11,0.12)]"
      };
    case 5:
    default:
      return {
        accent: "bg-violet-500",
        badge: "bg-violet-500/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 border-violet-500/20",
        glow: "group-hover:shadow-[0_20px_50px_rgba(139,92,246,0.12)]"
      };
  }
};

const getDeptIcon = (dept) => {
  const idx = getDeptIndex(dept);
  switch (idx) {
    case 0:
      return <Laptop className="w-4 h-4" />;
    case 1:
      return <Heart className="w-4 h-4" />;
    case 2:
      return <Coins className="w-4 h-4" />;
    case 3:
      return <Users className="w-4 h-4" />;
    case 4:
      return <Megaphone className="w-4 h-4" />;
    case 5:
    default:
      return <Layers className="w-4 h-4" />;
  }
};

const getDeptVectorHeader = (dept) => {
  const idx = getDeptIndex(dept);
  switch (idx) {
    case 0:
      return (
        <svg className="w-full h-full text-indigo-500/10 dark:text-indigo-400/10" viewBox="0 0 300 110" preserveAspectRatio="none">
          <defs>
            <linearGradient id="techHeaderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.04" />
            </linearGradient>
            <pattern id="techDotGrid" width="16" height="16" patternUnits="userSpaceOnUse">
              <circle cx="8" cy="8" r="1" fill="currentColor" fillOpacity="0.3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#techHeaderGrad)" />
          <rect width="100%" height="100%" fill="url(#techDotGrid)" />
          <path d="M 0 30 H 300 M 0 70 H 300 M 80 0 V 110 M 200 0 V 110" fill="none" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.15" />
          <circle cx="80" cy="30" r="3" fill="#6366f1" fillOpacity="0.6" />
          <circle cx="200" cy="70" r="3" fill="#a855f7" fillOpacity="0.6" />
        </svg>
      );
    case 1:
      return (
        <svg className="w-full h-full text-emerald-500/10 dark:text-emerald-400/10" viewBox="0 0 300 110" preserveAspectRatio="none">
          <defs>
            <linearGradient id="healthHeaderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.04" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#healthHeaderGrad)" />
          <path d="M 0 55 L 70 55 L 80 35 L 90 75 L 100 55 L 110 55 L 115 45 L 120 65 L 125 55 L 300 55" fill="none" stroke="#10b981" strokeWidth="1.5" strokeOpacity="0.4" />
          <circle cx="90" cy="75" r="3" fill="#10b981" fillOpacity="0.6" />
          <path d="M 30 75 A 25 25 0 0 1 70 75" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
        </svg>
      );
    case 2:
      return (
        <svg className="w-full h-full text-cyan-500/10 dark:text-cyan-400/10" viewBox="0 0 300 110" preserveAspectRatio="none">
          <defs>
            <linearGradient id="financeHeaderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.04" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#financeHeaderGrad)" />
          <path d="M 0 90 Q 60 70 120 40 T 240 25 T 300 10" fill="none" stroke="#06b6d4" strokeWidth="2" strokeOpacity="0.4" />
          <path d="M 0 100 Q 60 80 120 50 T 240 35 T 300 20" fill="none" stroke="#0ea5e9" strokeWidth="1" strokeOpacity="0.2" />
          <circle cx="300" cy="10" r="3" fill="#06b6d4" />
        </svg>
      );
    case 3:
      return (
        <svg className="w-full h-full text-rose-500/10 dark:text-rose-400/10" viewBox="0 0 300 110" preserveAspectRatio="none">
          <defs>
            <linearGradient id="hrHeaderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#ec4899" stopOpacity="0.04" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#hrHeaderGrad)" />
          <circle cx="100" cy="55" r="30" fill="none" stroke="currentColor" strokeWidth="1" strokeOpacity="0.2" />
          <circle cx="140" cy="55" r="30" fill="none" stroke="currentColor" strokeWidth="1" strokeOpacity="0.2" />
          <circle cx="120" cy="35" r="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
        </svg>
      );
    case 4:
      return (
        <svg className="w-full h-full text-amber-500/10 dark:text-amber-400/10" viewBox="0 0 300 110" preserveAspectRatio="none">
          <defs>
            <linearGradient id="salesHeaderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0.04" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#salesHeaderGrad)" />
          <circle cx="50" cy="55" r="20" fill="none" stroke="currentColor" strokeWidth="1" strokeOpacity="0.15" />
          <circle cx="50" cy="55" r="40" fill="none" stroke="currentColor" strokeWidth="1" strokeOpacity="0.2" strokeDasharray="3 3" />
          <circle cx="50" cy="55" r="60" fill="none" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.25" />
          <circle cx="50" cy="55" r="3" fill="#f59e0b" />
        </svg>
      );
    case 5:
    default:
      return (
        <svg className="w-full h-full text-violet-500/10 dark:text-violet-400/10" viewBox="0 0 300 110" preserveAspectRatio="none">
          <defs>
            <linearGradient id="generalHeaderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0.04" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#generalHeaderGrad)" />
          {/* Abstract geometric flow curves */}
          <path d="M 0 45 C 50 25, 120 75, 180 45 C 240 15, 270 55, 300 35" fill="none" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
          <path d="M 0 65 C 60 45, 100 85, 160 55 C 220 25, 260 75, 300 55" fill="none" stroke="currentColor" strokeWidth="1" strokeOpacity="0.15" strokeDasharray="4 4" />
        </svg>
      );
  }
};

export default function JobOpenings() {
  const { user } = useContext(JDContext);
  const navigate = useNavigate();
  const userRole = user?.role?.toLowerCase() || "";
  const canManageOpenings = ["admin", "super_admin", "hr", "manager"].includes(userRole);
  const isAdmin = canManageOpenings;

  const [jds, setJds] = useState([]);
  const [archivedJds, setArchivedJds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmpType, setSelectedEmpType] = useState("All");
  const [selectedDept, setSelectedDept] = useState("All");
  const [selectedLocation, setSelectedLocation] = useState("All");
  const [selectedWorkMode, setSelectedWorkMode] = useState("All");
  const [selectedSeniority, setSelectedSeniority] = useState("All");
  const [copiedId, setCopiedId] = useState(null);

  const [activeTab, setActiveTab] = useState("open");
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [loadingApplied, setLoadingApplied] = useState(false);
  const [selectedJds, setSelectedJds] = useState([]);

  const toggleSelection = (id) => {
    setSelectedJds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedJds.length === filteredJDs.length) {
      setSelectedJds([]);
    } else {
      setSelectedJds(filteredJDs.map(jd => jd.id));
    }
  };

  const clearSelection = () => {
    setSelectedJds([]);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedJds([]);
  };

  const handleBulkArchive = async () => {
    const activeIds = selectedJds.filter(id => jds.some(jd => jd.id === id));

    if (activeIds.length === 0) return;

    toast.promise(
      jdService.bulkUpdateJDStatus("public_view", "archive_job", activeIds),
      {
        loading: `Archiving ${activeIds.length} job opening(s)...`,
        success: `${activeIds.length} job opening(s) archived successfully!`,
        error: 'Failed to archive job openings.'
      }
    ).then(() => {
      fetchPublicJDs();
      setSelectedJds(prev => prev.filter(id => !activeIds.includes(id)));
    }).catch(err => {
      console.error("Failed to bulk archive JDs:", err);
    });
  };

  const handleBulkUnarchive = async () => {
    const archivedIds = selectedJds.filter(id => archivedJds.some(jd => jd.id === id));

    if (archivedIds.length === 0) return;

    toast.promise(
      jdService.bulkUpdateJDStatus("archive_job", "public_view", archivedIds),
      {
        loading: `Unarchiving ${archivedIds.length} job opening(s)...`,
        success: `${archivedIds.length} job opening(s) unarchived successfully!`,
        error: 'Failed to unarchive job openings.'
      }
    ).then(() => {
      fetchPublicJDs();
      setSelectedJds(prev => prev.filter(id => !archivedIds.includes(id)));
    }).catch(err => {
      console.error("Failed to bulk unarchive JDs:", err);
    });
  };

  const fetchPublicJDs = async () => {
    setLoading(true);
    try {
      // 1. Fetch public (active) JDs
      const res = await jdService.getOrgPublicJDs(null, 0, 1000, "public_view");
      const publicList = Array.isArray(res) ? res : (res?.data || res?.results || res?.job_descriptions || []);
      const activeList = publicList.filter(jd => jd.status !== "archive_job");
      setJds(activeList);

      // 2. Fetch archived JDs (staff with opening management access)
      if (canManageOpenings) {
        let archList = [];
        try {
          const archRes = await jdService.getOrgPublicJDs(null, 0, 1000, "archive_job");
          archList = Array.isArray(archRes) ? archRes : (archRes?.data || archRes?.results || archRes?.job_descriptions || []);
          archList = archList.filter(jd => jd.status === "archive_job");
        } catch (e) {
          console.error("Direct fetch of archived JDs failed, trying fallback:", e);
        }

        if (archList.length === 0) {
          try {
            const idList = await jdService.listJDIds("archive_job");

            if (Array.isArray(idList) && idList.length > 0) {
              const detailed = await Promise.all(
                idList.map(async (item) => {
                  try {
                    return await jdService.getJDById(item.jd_id || item.id);
                  } catch (e) {
                    return null;
                  }
                })
              );
              archList = detailed.filter(Boolean).map(jd => ({
                ...jd,
                status: "archive_job"
              }));
            }
          } catch (fallbackErr) {
            console.warn("Archived JD fallback list failed:", fallbackErr);
          }
        }
        setArchivedJds(archList);
      } else {
        setArchivedJds([]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load published job openings.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAppliedJobsData = async () => {
    setLoadingApplied(true);
    try {
      const res = await getAppliedJobs();
      setAppliedJobs(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Failed to fetch applied jobs", err);
      toast.error("Failed to load applied jobs.");
    } finally {
      setLoadingApplied(false);
    }
  };

  useEffect(() => {
    fetchPublicJDs();
    if (isAdmin) {
      setActiveTab("open");
    } else {
      setActiveTab("openings");
      fetchAppliedJobsData();
    }
  }, [userRole, isAdmin]);

  const handleCopyId = (e, id) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success("Public JD ID copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleViewDetails = (jdId) => {
    if (isAdmin) {
      navigate(`/admin/job-openings/${jdId}`);
    } else if (userRole.includes("hr")) {
      navigate(`/hr/job-openings/${jdId}`);
    } else if (userRole.includes("manager")) {
      navigate(`/manager/job-openings/${jdId}`);
    } else if (userRole.includes("enduser") || userRole === "user") {
      navigate(`/enduser/job-openings/${jdId}`);
    } else {
      navigate(`/hr/job-openings/${jdId}`);
    }
  };

  const departments = ["All", ...new Set([...jds, ...archivedJds].map(jd => jd.department).filter(Boolean))];
  const locations = ["All", ...new Set([...jds, ...archivedJds].map(jd => jd.location || jd.city).filter(Boolean))];

  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedEmpType("All");
    setSelectedDept("All");
    setSelectedLocation("All");
    setSelectedWorkMode("All");
    setSelectedSeniority("All");
  };

  const getWorkMode = (loc) => {
    const l = (loc || "").toLowerCase();
    if (l.includes("remote")) return "remote";
    if (l.includes("hybrid")) return "hybrid";
    return "onsite";
  };

  const getSeniorityBucket = (val) => {
    const s = (val || "").toLowerCase();
    if (s.includes("entry") || s.includes("junior") || s.includes("associate")) return "entry";
    if (s.includes("senior") || s.includes("sr")) return "senior";
    if (s.includes("lead") || s.includes("principal") || s.includes("staff")) return "lead";
    if (s.includes("exec") || s.includes("director") || s.includes("vp") || s.includes("chief")) return "executive";
    if (s.includes("mid") || s.includes("intermediate")) return "mid";
    return s || "mid";
  };

  const currentJDs = (activeTab === "open" || activeTab === "openings") ? jds : archivedJds;

  const filteredJDs = currentJDs.filter(jd => {
    if (!isAdmin) {
      const hasApplied = appliedJobs.some(app => 
        app.public_jd_id === jd.id || 
        app.original_jd_id === jd.id ||
        (jd.original_jd_id && app.original_jd_id === jd.original_jd_id) ||
        (jd.public_jd_id && app.public_jd_id === jd.public_jd_id)
      );
      if (hasApplied) return false;
    }
    const content = jd.content || jd;
    const title = (jd.title || content.title || "").toLowerCase();
    const dept = (jd.department || "").toLowerCase();
    const loc = (jd.location || jd.city || "").toLowerCase();
    const empType = (jd.employment_type || jd.employmentType || content.employment_type || content.employmentType || "").toLowerCase();
    const seniority = jd.seniority || content.seniority || "";

    const queryMatch =
      title.includes(searchTerm.toLowerCase()) ||
      dept.includes(searchTerm.toLowerCase()) ||
      loc.includes(searchTerm.toLowerCase());

    const deptFilterMatch = selectedDept === "All" || dept === selectedDept.toLowerCase();

    const locFilterMatch =
      selectedLocation === "All" ||
      loc === selectedLocation.toLowerCase() ||
      (jd.location || "").toLowerCase() === selectedLocation.toLowerCase() ||
      (jd.city || "").toLowerCase() === selectedLocation.toLowerCase();

    const normalizeEmpType = (val) => val.replace(/[^a-z]/g, "");
    const empTypeFilterMatch = selectedEmpType === "All" || normalizeEmpType(empType) === normalizeEmpType(selectedEmpType.toLowerCase());

    const workMode = getWorkMode(jd.location || jd.city || "");
    const workModeMatch =
      selectedWorkMode === "All" ||
      workMode === selectedWorkMode.toLowerCase();

    const seniorityMatch =
      selectedSeniority === "All" ||
      getSeniorityBucket(seniority) === selectedSeniority.toLowerCase();

    return queryMatch && deptFilterMatch && locFilterMatch && empTypeFilterMatch && workModeMatch && seniorityMatch;
  });

  const selectedActiveCount = selectedJds.filter(id => jds.some(jd => jd.id === id)).length;
  const selectedArchivedCount = selectedJds.filter(id => archivedJds.some(jd => jd.id === id)).length;

  return (
    <div className="jo-page-bg min-h-screen dark:bg-[#020617] p-6 sm:p-8 font-sans transition-all duration-300 relative overflow-hidden">
      {/* Decorative Background Mesh Glows */}
      <div className="absolute top-[-15%] right-[-15%] w-[500px] h-[500px] bg-indigo-500/[0.04] dark:bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-8%] left-[-10%] w-[480px] h-[480px] bg-violet-500/[0.03] dark:bg-violet-500/8 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-[1700px] mx-auto space-y-6 sm:space-y-8 relative z-10">

        <JobOpeningsHero loading={loading} onSync={fetchPublicJDs} />

        {/* Navigation Tabs */}
        {!isAdmin && <EndUserJobTabs activeTab={activeTab} setActiveTab={setActiveTab} />}

        {isAdmin && (
          <AdminJobTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
            openCount={jds.length}
            archivedCount={archivedJds.length}
          />
        )}

        {activeTab !== "applied" ? (
          <>
        <JobFiltersBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedDept={selectedDept}
          onDeptChange={setSelectedDept}
          departments={departments}
          selectedEmpType={selectedEmpType}
          onEmpTypeChange={setSelectedEmpType}
          selectedLocation={selectedLocation}
          onLocationChange={setSelectedLocation}
          locations={locations}
          selectedWorkMode={selectedWorkMode}
          onWorkModeChange={setSelectedWorkMode}
          selectedSeniority={selectedSeniority}
          onSeniorityChange={setSelectedSeniority}
          resultCount={filteredJDs.length}
          onClearAll={clearAllFilters}
        />

        {/* Loading Skeleton */}
        {loading ? (
          <div className="mt-8">
            <div className="h-10 w-full bg-white/30 dark:bg-slate-900/30 backdrop-blur-md rounded-xl border border-white/30 dark:border-white/5 shadow-sm animate-pulse mb-4" />
            
            <div className="columns-1 md:columns-3 gap-8 [column-fill:balance]">
              {/* Bento Hero Skeleton */}
              <div className="relative h-[180px] w-full break-inside-avoid rounded-[2.2rem] overflow-hidden bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-500/10 mb-8 animate-pulse">
                <div className="absolute inset-0 p-6 flex flex-col justify-between">
                  <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-800/50 rounded-2xl self-end" />
                  <div className="space-y-2 mt-auto">
                    <div className="w-32 h-6 bg-indigo-100 dark:bg-indigo-800/50 rounded-lg" />
                    <div className="w-48 h-3 bg-indigo-100 dark:bg-indigo-800/50 rounded-md" />
                  </div>
                </div>
              </div>

              {/* Main Card Skeletons */}
              {[1, 2, 3].map((_, i) => (
                <div key={i} className="group relative flex flex-col justify-between w-full break-inside-avoid min-h-[390px] rounded-[2.2rem] overflow-hidden p-5 shadow-sm border border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/20 mb-8 animate-pulse">
                  <div className="relative z-10 flex items-start justify-between">
                    <div className="w-6 h-6 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                    <div className="w-20 h-6 bg-slate-200 dark:bg-slate-800 rounded-bl-xl absolute right-[-20px] top-[-20px]" />
                  </div>
                  
                  <div className="relative h-24 w-full rounded-2xl overflow-hidden mt-6 bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-xl bg-slate-300 dark:bg-slate-700" />
                  </div>

                  <div className="relative z-10 space-y-4 mt-6">
                    <div className="space-y-3">
                      <div className="w-full h-4 bg-slate-200 dark:bg-slate-800 rounded-md" />
                      <div className="w-2/3 h-4 bg-slate-200 dark:bg-slate-800 rounded-md" />
                      <div className="w-1/2 h-2 bg-slate-200 dark:bg-slate-800 rounded-sm mt-4" />
                    </div>
                  </div>

                  <div className="relative z-10 mt-auto pt-6 flex items-center justify-between">
                    <div className="w-24 h-6 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                    <div className="w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Results count & Select All */}
            <div className="jo-results-bar flex items-center justify-between rounded-2xl px-5 py-3.5 relative z-10">
              <div className="flex items-center gap-3">
                <span className="jo-results-count text-lg font-black tabular-nums">
                  {filteredJDs.length}
                </span>
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                  {filteredJDs.length === 1 ? "opening available" : "openings available"}
                </span>
              </div>

              {isAdmin && filteredJDs.length > 0 && (
                <button
                  onClick={selectAll}
                  className="flex items-center gap-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  <div className={`w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center transition-all duration-200 ${selectedJds.length === filteredJDs.length && filteredJDs.length > 0 ? "bg-indigo-600 border-indigo-600 shadow-[0_2px_8px_rgba(79,70,229,0.35)]" : "bg-white dark:bg-white/5 border-slate-300 dark:border-white/20"}`}>
                    {selectedJds.length === filteredJDs.length && filteredJDs.length > 0 && <Check className="w-3 h-3 text-white stroke-[3]" />}
                  </div>
                  {selectedJds.length === filteredJDs.length && filteredJDs.length > 0 ? "Deselect All" : "Select All"}
                  {selectedJds.length > 0 && (
                    <span className="px-2.5 py-0.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-full">
                      {selectedJds.length} selected
                    </span>
                  )}
                </button>
              )}
            </div>

            <AnimatePresence mode="popLayout">
              {filteredJDs.length > 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="columns-1 md:columns-3 gap-8 [column-fill:balance] animate-in fade-in zoom-in-95 duration-500 mt-4"
                >
                  <OpeningsSummaryCard count={filteredJDs.length} activeTab={activeTab} />

                  {/* ─── DYNAMIC JOB BENTO CARDS ─── */}
                  {filteredJDs.map((jd, idx) => {
                    const content = jd.content || jd;
                    const salary = jd.salary_range || formatSalaryRange(
                      jd.salary_min_value || content.salary_min_value,
                      jd.salary_max_value || content.salary_max_value,
                      jd.salary_symbol || content.salary_symbol || "$",
                      jd.salary_period || content.salary_period || ""
                    );
                    const colors = getDeptColors(jd.department);
                    const isRemote = (jd.location || "").toLowerCase().includes("remote");

                    const isArchived = jd.status === "archive_job";

                    return (
                      <motion.div
                        key={jd.id || idx}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: Math.min(idx * 0.05, 0.25), ease: [0.22, 1, 0.36, 1] }}
                        onClick={() => {
                          if (isArchived) {
                            toggleSelection(jd.id);
                          } else {
                            handleViewDetails(jd.id);
                          }
                        }}
                        className={`jo-job-card group relative flex flex-col justify-between w-full break-inside-avoid min-h-[420px] rounded-[2rem] overflow-hidden cursor-pointer p-5 sm:p-6 mb-8 ${isArchived ? "opacity-60 grayscale-[15%]" : ""}`}
                      >
                        <div className={`absolute top-0 left-0 right-0 h-[3px] ${colors.accent} opacity-90 rounded-t-[2rem]`} aria-hidden="true" />

                        <div className="relative z-10 flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {isAdmin && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSelection(jd.id);
                                }}
                                className={`w-5 h-5 rounded-lg border-[1.5px] flex items-center justify-center transition-all flex-shrink-0 ${
                                  selectedJds.includes(jd.id)
                                    ? "bg-indigo-600 border-indigo-600 shadow-[0_2px_8px_rgba(79,70,229,0.4)]"
                                    : "bg-white/80 dark:bg-slate-900/50 border-slate-200 dark:border-white/15 group-hover:border-indigo-300"
                                }`}
                              >
                                {selectedJds.includes(jd.id) && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                              </button>
                            )}
                            <span className="jo-job-card-index text-2xl font-black tracking-tighter leading-none select-none">
                              {String(idx + 1).padStart(2, "0")}
                              <span className="text-base opacity-60">/{filteredJDs.length}</span>
                            </span>
                          </div>

                          <div className={`jo-location-badge px-3 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase shrink-0 ${
                            isRemote
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                          }`}>
                            {isRemote ? "Remote" : "Onsite"}
                          </div>
                        </div>

                        <div className="jo-job-card-visual relative h-32 w-full mt-5 shrink-0 flex items-center justify-center transition-transform duration-300 group-hover:scale-[1.02]">
                          <div className="absolute inset-0 w-full h-full opacity-90">
                            {getDeptVectorHeader(jd.department)}
                          </div>
                          {isArchived && (
                            <div className="absolute top-3 left-3 z-20 px-2.5 py-1 bg-rose-500 text-white text-[8px] font-black rounded-full uppercase tracking-widest flex items-center gap-1 shadow-lg">
                              <Archive className="w-2.5 h-2.5" />
                              Archived
                            </div>
                          )}
                          <div className={`relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center ${colors.badge} border border-white/60 dark:border-white/10 shadow-lg`}>
                            {getDeptIcon(jd.department)}
                          </div>
                        </div>

                        <div className="relative z-10 space-y-3 mt-5 flex-1">
                          <div className="space-y-2">
                            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200 line-clamp-2">
                              {jd.title || content.title}
                            </h3>
                            <div className="flex flex-wrap gap-1.5">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-[9px] font-bold uppercase text-slate-600 dark:text-slate-400 tracking-wide">
                                {jd.department || "General"}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-[9px] font-bold uppercase text-slate-600 dark:text-slate-400 tracking-wide">
                                {jd.employment_type || jd.employmentType || "Full-time"}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wide">
                                {salary !== "TBD" ? salary : "Competitive"}
                              </span>
                            </div>
                          </div>

                          {jd.public_jd_id && (
                            <button
                              onClick={(e) => handleCopyId(e, jd.public_jd_id)}
                              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors text-[9px] font-bold uppercase tracking-wider"
                            >
                              {copiedId === jd.public_jd_id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                              <span>ID: {jd.public_jd_id.substring(0, 8)}…</span>
                            </button>
                          )}
                        </div>

                        <div className="relative z-10 mt-5 pt-4 border-t border-slate-100/80 dark:border-white/5 flex items-center justify-between gap-3">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {jd.seniority || content.seniority || "Mid"} Level
                          </span>

                          <span className="jo-job-card-cta flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 group-hover:gap-2.5 transition-all duration-200">
                            View Details
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-200" />
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white dark:bg-[#0f172a] rounded-[3rem] border border-slate-200/60 dark:border-white/5 p-16 text-center max-w-xl mx-auto shadow-sm"
                >
                  <div className="w-20 h-20 bg-indigo-50 dark:bg-[#020617] text-indigo-500 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100 dark:border-white/5 shadow-inner">
                    <AlertCircle size={40} className="animate-bounce" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight mb-2">
                    {activeTab === "open" ? "No Job Openings Found" : "No Archived Openings Found"}
                  </h3>
                  <p className="text-slate-400 dark:text-slate-500 text-sm font-medium mb-8 leading-relaxed">
                    {activeTab === "open"
                      ? "There are currently no job descriptions published matching your query or selected filters."
                      : "There are currently no archived job descriptions matching your query or selected filters."
                    }
                  </p>
                  <button
                    onClick={clearAllFilters}
                    className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                  >
                    Clear Filters
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
          </>
        ) : (
          /* Applied Jobs Tab */
          <div className="bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-200/50 dark:border-white/5 shadow-lg relative z-20">
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-6 uppercase tracking-tight flex items-center gap-3">
              <Briefcase className="text-indigo-500" />
              Your Applications
            </h2>
            {loadingApplied ? (
              <div className="flex flex-wrap gap-6 mt-4">
                {[1, 2, 3].map((_, idx) => (
                  <div
                    key={idx}
                    className="group relative flex flex-col justify-between w-full sm:w-[280px] min-h-[260px] rounded-[1.5rem] overflow-hidden cursor-default p-4 shadow-sm border border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/20 mb-2 animate-pulse"
                  >
                    {/* Header skeleton */}
                    <div className="relative z-10 flex items-start justify-between">
                      <div className="w-8 h-6 bg-slate-200 dark:bg-slate-800 rounded-md" />
                      <div className="w-16 h-5 bg-slate-200 dark:bg-slate-800 rounded-bl-xl absolute right-[-16px] top-[-16px]" />
                    </div>

                    {/* Visual Content skeleton */}
                    <div className="relative h-20 w-full rounded-xl overflow-hidden mt-3 bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                      <div className="w-9 h-9 rounded-xl bg-slate-300 dark:bg-slate-700" />
                    </div>

                    {/* Title & Info skeleton */}
                    <div className="relative z-10 space-y-3 mt-3">
                      <div className="space-y-2">
                        <div className="w-3/4 h-3 bg-slate-200 dark:bg-slate-800 rounded-md" />
                        <div className="flex gap-2">
                          <div className="w-10 h-2 bg-slate-200 dark:bg-slate-800 rounded-sm" />
                          <div className="w-14 h-2 bg-slate-200 dark:bg-slate-800 rounded-sm" />
                        </div>
                        <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-sm mt-1" />
                      </div>
                    </div>

                    {/* Footer skeleton */}
                    <div className="relative z-10 mt-4 pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                      <div className="w-16 h-2 bg-slate-200 dark:bg-slate-800 rounded-sm" />
                      <div className="w-10 h-2 bg-slate-200 dark:bg-slate-800 rounded-sm" />
                    </div>
                  </div>
                ))}
              </div>
            ) : appliedJobs.length > 0 ? (
              <div className="flex flex-wrap gap-6 mt-4">
                {appliedJobs.map((app, idx) => {
                  const matchingJd = jds.find(j => 
                    (j.id === app.public_jd_id) || 
                    (j.id === app.original_jd_id) || 
                    (j.original_jd_id && j.original_jd_id === app.original_jd_id) ||
                    (j.public_jd_id && j.public_jd_id === app.public_jd_id)
                  );
                  const content = matchingJd?.content || matchingJd;
                  const jobTitle = content ? (content.title) : null;
                  const dept = content?.department || null;
                  const company = content?.company_name || null;
                  const location = content?.location || null;
                  const empType = content?.employment_type || content?.employmentType || null;
                  const colors = getDeptColors(dept || "General");

                      return (
                    <motion.div
                      key={app.id || idx}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ y: -5, scale: 1.015 }}
                      transition={{ type: "spring", stiffness: 450, damping: 22 }}
                      onClick={() => handleViewDetails(app.public_jd_id || app.original_jd_id)}
                      className={`group relative flex flex-col justify-between w-full sm:w-[280px] min-h-[260px] rounded-[1.5rem] overflow-hidden cursor-pointer p-4 shadow-sm border border-transparent bg-transparent transition-shadow duration-300 ${colors.glow} mb-2`}
                    >
                      {/* Glossy SVG Canvas */}
                      <svg className="absolute inset-0 w-full h-full drop-shadow-[0_12px_40px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_12px_40px_rgba(0,0,0,0.4)] group-hover:drop-shadow-[0_20px_50px_rgba(99,102,241,0.25)] dark:group-hover:drop-shadow-[0_20px_50px_rgba(99,102,241,0.25)] transition-all duration-500" viewBox="0 0 300 260" preserveAspectRatio="none">
                        {/* Light mode solid path */}
                        <path
                          d="M 0,0 L 195,0 C 205,0 205,24 215,24 L 300,24 L 300,260 L 0,260 Z"
                          className="fill-white dark:hidden"
                        />
                        {/* Dark mode translucent path */}
                        <path
                          d="M 0,0 L 195,0 C 205,0 205,24 215,24 L 300,24 L 300,260 L 0,260 Z"
                          className="hidden dark:block fill-slate-800/90"
                        />
                        {/* Glass inner edge highlight */}
                        <path
                          d="M 1,1 L 194,1 C 204,1 204,25 214,25 L 299,25 L 299,259 L 1,259 Z"
                          fill="none"
                          className="stroke-white/60 dark:stroke-white/10"
                          strokeWidth="1.5"
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>

                      {/* Header row elements */}
                      <div className="relative z-10 flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-black text-slate-800 dark:text-white tracking-tighter leading-none select-none">
                            {idx + 1}/{appliedJobs.length}
                          </span>
                        </div>
                        {app.status && (
                          <div className="absolute right-[-16px] top-[-16px] w-[80px] h-[24px] flex items-center justify-center text-[8px] font-black text-indigo-600 dark:text-indigo-400 tracking-widest uppercase select-none bg-indigo-50 dark:bg-indigo-500/20 rounded-bl-xl border-b border-l border-indigo-100 dark:border-indigo-500/30">
                            {app.status}
                          </div>
                        )}
                      </div>

                      {/* Visual Content */}
                      <div className="relative h-20 w-full rounded-xl overflow-hidden mt-3 shrink-0 shadow-sm border border-slate-100 dark:border-white/5 z-10 bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                        <div className="absolute inset-0 w-full h-full">
                          {getDeptVectorHeader(dept || "General")}
                        </div>
                        <div className={`relative z-10 w-9 h-9 rounded-xl flex items-center justify-center ${colors.badge} border border-white/50 dark:border-white/5 shadow-md shadow-slate-100 dark:shadow-none`}>
                          <div className="scale-75">
                            {getDeptIcon(dept || "General")}
                          </div>
                        </div>
                      </div>

                      {/* Title & Info */}
                      <div className="relative z-10 space-y-3 mt-3">
                        <div className="space-y-1">
                          {jobTitle && (
                            <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight uppercase leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200">
                              {jobTitle}
                            </h3>
                          )}
                          <div className="flex flex-wrap gap-2 text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                            {dept && <span>{dept}</span>}
                            {dept && empType && <span>•</span>}
                            {empType && <span>{empType}</span>}
                            {(dept || empType) && app.source && <span>•</span>}
                            {app.source && <span>{app.source}</span>}
                          </div>
                          {(company || location) && (
                            <div className="flex flex-wrap gap-2 text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-1">
                              {company && <span>{company}</span>}
                              {company && location && <span>-</span>}
                              {location && <span>{location}</span>}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="relative z-10 mt-4 pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" />
                          {app.created_at ? new Date(app.created_at).toLocaleDateString() : "Unknown"}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200 dark:border-white/5 shadow-inner">
                  <Archive size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">No applications found</h3>
                <p className="text-slate-500 mt-2 font-medium">You haven't applied to any internal opportunities yet.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FLOATING BULK ACTION BAR */}
      {selectedJds.length > 0 && (activeTab === "open" || activeTab === "archived" || activeTab === "openings") && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-6 duration-300">
          <div className="bg-white dark:bg-[#1e293b] text-[#0F172A] dark:text-white px-5 py-3 rounded-[16px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 dark:border-white/10 flex items-center gap-5 backdrop-blur-xl">
            <div className="flex items-center gap-3 pr-5 border-r border-slate-200/60 dark:border-white/10">
              <div className="w-8 h-8 bg-indigo-600 text-white rounded-[8px] flex items-center justify-center">
                <Check className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm leading-none">{selectedJds.length}</span>
                <span className="text-[10px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide mt-0.5">Selected</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Bulk Archive Button */}
              {selectedActiveCount > 0 && (
                <button
                  onClick={handleBulkArchive}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-[8px] transition-all bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                >
                  <Archive className="w-4 h-4" />
                  Archive {selectedActiveCount} Job{selectedActiveCount > 1 ? 's' : ''}
                </button>
              )}

              {selectedActiveCount > 0 && selectedArchivedCount > 0 && (
                <div className="w-px h-5 bg-slate-200 dark:bg-white/10 mx-1" />
              )}

              {/* Bulk Unarchive Button */}
              {selectedArchivedCount > 0 && (
                <button
                  onClick={handleBulkUnarchive}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-[8px] transition-all bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  <Briefcase className="w-4 h-4" />
                  Unarchive {selectedArchivedCount} Job{selectedArchivedCount > 1 ? 's' : ''}
                </button>
              )}

              <div className="w-px h-5 bg-slate-200 dark:bg-white/10 mx-2" />

              {/* Clear */}
              <button
                onClick={clearSelection}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 rounded-[6px] transition-colors"
                title="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
