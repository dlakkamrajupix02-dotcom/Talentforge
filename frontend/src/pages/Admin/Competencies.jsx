import React, { useContext, useEffect, useState, useMemo } from "react";
import { JDContext } from "../../context/JDContext";
import * as organizationService from "../../services/organizationService";
import toast from "react-hot-toast";
import {
  Target,
  FileText,
  UploadCloud,
  Plus,
  Trash2,
  X,
  Check,
  Search,
  Settings as SettingsIcon,
  Box,
  Sparkles,
  Layers,
  Activity,
  AlertTriangle,
  Info,
  ChevronDown
} from "lucide-react";

export default function Competencies() {
  const { user, isAuthenticated } = useContext(JDContext);

  // States for Competency Library
  const [competencyLibrary, setCompetencyLibrary] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [compFilter, setCompFilter] = useState("All Categories");
  const [compSort, setCompSort] = useState({ field: "competency_name", dir: "asc" });

  // Search filter inside the page
  const [searchTerm, setSearchTerm] = useState("");

  // Modal & Creation States
  const [showCompetencyModal, setShowCompetencyModal] = useState(false);
  const [competencySource, setCompetencySource] = useState("custom"); // 'custom' or 'onet'
  const [competencyName, setCompetencyName] = useState("");
  const [competencyDesc, setCompetencyDesc] = useState("");
  const [competencyType, setCompetencyType] = useState("Core"); // 'Core' or 'Functional'
  const [isSavingCompetency, setIsSavingCompetency] = useState(false);

  // O*NET preview state (unused for now as per v2 message)
  const [onetSearch, setOnetSearch] = useState("");

  // Custom Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    title: "",
    message: "",
    onConfirm: () => {},
    confirmText: "Delete",
    variant: "danger"
  });

  const confirmAction = (config) => {
    setConfirmConfig({
      ...config,
      onConfirm: () => {
        config.onConfirm();
        setShowConfirmModal(false);
      }
    });
    setShowConfirmModal(true);
  };

  const refreshCompetencies = async () => {
    if (!isAuthenticated) return;
    setIsRefreshing(true);
    try {
      const data = await organizationService.getCompetencies();
      setCompetencyLibrary(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to refresh competencies:", error);
      toast.error("Could not refresh competency library");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshCompetencies();
  }, [isAuthenticated]);

  const filteredCompetencies = useMemo(() => {
    let filtered = Array.isArray(competencyLibrary) ? competencyLibrary : [];

    // Filter by Category Pill
    if (compFilter !== "All Categories") {
      filtered = filtered.filter((c) => c.category_name === compFilter);
    }

    // Filter by Search Query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          (c.competency_name || "").toLowerCase().includes(q) ||
          (c.description || "").toLowerCase().includes(q)
      );
    }

    // Sort entries
    return [...filtered].sort((a, b) => {
      const aVal = a[compSort.field] || "";
      const bVal = b[compSort.field] || "";
      if (aVal < bVal) return compSort.dir === "asc" ? -1 : 1;
      if (aVal > bVal) return compSort.dir === "asc" ? 1 : -1;
      return 0;
    });
  }, [competencyLibrary, compFilter, compSort, searchTerm]);

  const toggleSort = (field) => {
    setCompSort((prev) => ({
      field,
      dir: prev.field === field && prev.dir === "asc" ? "desc" : "asc"
    }));
  };

  const saveCompetency = async () => {
    if (!competencyName.trim()) {
      toast.error("Competency name is required");
      return;
    }

    setIsSavingCompetency(true);
    try {
      const payload = {
        competencyName: competencyName.trim(),
        categoryName: competencyType === "Core" ? "Core Competencies" : "Functional Competencies",
        description: competencyDesc.trim(),
        orgId: user?.orgId || user?.org_id || "123e4567-e89b-12d3-a456-426614174000"
      };

      await organizationService.addCompetency(payload);
      toast.success("Competency added to library");

      setShowCompetencyModal(false);
      setCompetencyName("");
      setCompetencyDesc("");
      setCompetencyType("Core");
      refreshCompetencies();
    } catch (error) {
      console.error("Failed to add competency:", error);
      toast.error(error.message || "Failed to add competency");
    } finally {
      setIsSavingCompetency(false);
    }
  };

  const handleDeleteCompetency = async (id) => {
    confirmAction({
      title: "Delete Competency?",
      message: "This item will be permanently removed from the shared competency library. JDs using this item will keep their existing text.",
      onConfirm: async () => {
        try {
          await organizationService.deleteCompetency(id);
          toast.success("Competency removed from library");
          refreshCompetencies();
        } catch (error) {
          console.error("Failed to delete competency:", error);
          toast.error("Delete failed");
        }
      }
    });
  };

  // Derive counts for KPIs
  const coreCount = useMemo(() => {
    return competencyLibrary.filter((c) => c.category_name?.includes("Core")).length;
  }, [competencyLibrary]);

  const functionalCount = useMemo(() => {
    return competencyLibrary.filter((c) => c.category_name?.includes("Functional")).length;
  }, [competencyLibrary]);

  return (
    <div className="flex-1 p-6 md:p-10 bg-slate-50 dark:bg-slate-950 overflow-y-auto transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header & KPI Metrics */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
              <div className="p-3 bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 rounded-2xl shadow-xl shadow-slate-900/20">
                <Target className="w-6 h-6 text-white" />
              </div>
              Competency Library
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg max-w-2xl">
              Configure the organizational skill taxonomy. Map global behavioral and technical competencies across all Job Descriptions.
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* KPI Cards */}
            <div className="bg-white dark:bg-[#020617] px-5 py-3 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex items-center gap-4">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white leading-none">
                  {coreCount}
                </div>
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">
                  Core Metrics
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#020617] px-5 py-3 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex items-center gap-4">
              <div className="p-2 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white leading-none">
                  {functionalCount}
                </div>
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">
                  Functional
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Bento Box */}
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200/60 dark:border-white/5 shadow-sm dark:shadow-2xl rounded-[2.5rem] p-8 lg:p-10 relative overflow-hidden group hover:border-indigo-500/30 transition-colors">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-[80px] -mr-40 -mt-40 pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search competencies by name or description..."
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-[#020617] transition-all text-sm dark:text-white placeholder:text-slate-400"
              />
            </div>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 bg-white dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center gap-2 shadow-sm">
                <UploadCloud className="w-4 h-4 text-indigo-500" /> Import O*NET
              </button>
              <button
                onClick={() => setShowCompetencyModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Competency
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-8 relative z-10">
            {["All Categories", "Core Competencies", "Functional Competencies"].map((f, i) => (
              <span
                key={i}
                onClick={() => setCompFilter(f)}
                className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all border ${
                  compFilter === f
                    ? "bg-slate-900 text-white border-slate-900 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30"
                    : "bg-white dark:bg-[#020617] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 border-slate-200 dark:border-white/10"
                }`}
              >
                {f}
              </span>
            ))}
          </div>

          <div className="border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden bg-white dark:bg-[#020617] shadow-inner relative z-10">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/80 dark:bg-[#020617]/80 border-b border-slate-200 dark:border-white/5 backdrop-blur-sm">
                  <tr>
                    <th
                      onClick={() => toggleSort("competency_name")}
                      className="px-6 py-4 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest cursor-pointer hover:text-indigo-500 transition-colors"
                    >
                      Competency {compSort.field === "competency_name" && (compSort.dir === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      onClick={() => toggleSort("category_name")}
                      className="px-6 py-4 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest cursor-pointer hover:text-indigo-500 transition-colors"
                    >
                      Category {compSort.field === "category_name" && (compSort.dir === "asc" ? "↑" : "↓")}
                    </th>
                    <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                      Description
                    </th>
                    <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 bg-white dark:bg-[#0f172a]">
                  {filteredCompetencies.map((c, i) => {
                    const isCore = c.category_name?.includes("Core");
                    return (
                      <tr
                        key={c.competency_id || i}
                        className="hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors group cursor-pointer"
                      >
                        <td className="px-6 py-5">
                          <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {c.competency_name}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold border inline-block ${
                              isCore
                                ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20"
                                : "bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-500/20"
                            }`}
                          >
                            {c.category_name}
                          </span>
                        </td>
                        <td className="px-6 py-5 min-w-[300px]">
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 max-w-md">
                            {c.description || "No description provided."}
                          </p>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCompetency(c.competency_id);
                            }}
                            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredCompetencies.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center text-slate-300">
                            <FileText className="w-6 h-6" />
                          </div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            No competencies found in this category.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Glass Modal: Add Competency */}
      {showCompetencyModal && (
        <div className="fixed inset-0 z-[40] flex items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-300 pointer-events-none"
            onClick={() => setShowCompetencyModal(false)}
          />

          <div className="bg-white dark:bg-[#0f172a] rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.2)] dark:shadow-[0_0_50px_rgba(99,102,241,0.1)] border border-slate-200 dark:border-white/10 w-full max-w-lg overflow-hidden flex flex-col relative z-10 animate-in zoom-in-95 duration-300">
            <div className="bg-white/80 dark:bg-[#020617]/80 backdrop-blur-xl border-b border-slate-100 dark:border-white/5 px-8 py-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-indigo-500">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Add Competency</h2>
                  <p className="text-[11px] text-slate-500 font-medium">Define a new competency for your library</p>
                </div>
              </div>
              <button
                onClick={() => setShowCompetencyModal(false)}
                className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-white/5 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors border border-transparent dark:hover:border-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 md:p-8 space-y-5 bg-slate-50/30 dark:bg-transparent max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-300 mb-2">Source</label>
                <div className="flex border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden p-1 bg-white dark:bg-[#020617] shadow-sm">
                  <button
                    onClick={() => setCompetencySource("custom")}
                    className={`flex-1 py-2 text-xs font-bold transition-all rounded-lg flex items-center justify-center gap-2 ${
                      competencySource === "custom"
                        ? "bg-indigo-50 dark:bg-[#0f172a] text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-white/10 shadow-sm"
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-transparent"
                    }`}
                  >
                    {competencySource === "custom" && <Check className="w-3.5 h-3.5" />} Custom
                  </button>
                  <button
                    onClick={() => setCompetencySource("onet")}
                    className={`flex-1 py-2 text-xs font-bold transition-all rounded-lg flex items-center justify-center gap-2 ${
                      competencySource === "onet"
                        ? "bg-indigo-50 dark:bg-[#0f172a] text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-white/10 shadow-sm"
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-transparent"
                    }`}
                  >
                    {competencySource === "onet" ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <SettingsIcon className="w-3.5 h-3.5" />
                    )}{" "}
                    O*NET Aligned
                  </button>
                </div>
              </div>

              {/* O*NET Search Container visible only when O*NET Aligned is selected */}
              {competencySource === "onet" && (
                <div className="relative group/onet overflow-hidden rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300 min-h-[220px] flex items-center justify-center">
                  <div className="absolute inset-0 p-5 border border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-500/5 space-y-4 blur-sm group-hover/onet:blur-md transition-all duration-700">
                    <label className="block text-[11px] font-bold text-indigo-700 dark:text-indigo-400 opacity-50">
                      Search O*NET Competency Database
                    </label>
                    <div className="relative opacity-30">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        disabled
                        type="text"
                        placeholder="Search O*NET skills..."
                        className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold outline-none text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 opacity-20">
                      {["Cognitive Abilities", "Social Skills", "Resource Management", "Technical Skills", "Complex Problem Solving"].map((skill) => (
                        <span
                          key={skill}
                          className="px-3 py-1.5 bg-white dark:bg-[#0f172a] border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Always visible or hover-intensified Overlay */}
                  <div className="relative z-20 flex flex-col items-center gap-3 p-6 text-center">
                    <div className="w-16 h-16 bg-white dark:bg-[#020617] rounded-[2rem] border border-indigo-100 dark:border-white/10 shadow-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 transform group-hover/onet:scale-110 transition-transform duration-500">
                      <Box className="w-8 h-8 animate-pulse" />
                    </div>
                    <div className="space-y-1 transform group-hover/onet:translate-y-[-4px] transition-transform duration-500">
                      <span className="block text-[12px] font-black uppercase tracking-[0.4em] text-indigo-600 dark:text-indigo-400">
                        Available in v2
                      </span>
                      <span className="block text-[13px] font-bold text-slate-600 dark:text-slate-300">
                        The O*NET Aligned Database will be ready in the next update
                      </span>
                    </div>
                  </div>

                  {/* Subtle glass layer */}
                  <div className="absolute inset-0 z-10 bg-white/40 dark:bg-[#020617]/40 backdrop-blur-[2px] group-hover/onet:backdrop-blur-0 transition-all duration-700" />
                </div>
              )}

              {competencySource === "custom" && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-300 mb-2">
                      Competency Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={competencyName}
                      onChange={(e) => setCompetencyName(e.target.value)}
                      placeholder="e.g. Critical Thinking"
                      className="w-full px-4 py-2.5 bg-white dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:border-indigo-500 transition-all text-slate-900 dark:text-white font-medium shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-300 mb-2">Description</label>
                    <textarea
                      rows={2}
                      value={competencyDesc}
                      onChange={(e) => setCompetencyDesc(e.target.value)}
                      placeholder="Describe what this competency means (optional)..."
                      className="w-full px-4 py-3 bg-white dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:border-indigo-500 transition-all text-slate-900 dark:text-white font-medium shadow-sm resize-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-300 mb-2">
                  Category <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { t: "Core", d: "Org-wide foundational skills" },
                    { t: "Functional", d: "Role-specific technical skills" }
                  ].map((cat) => (
                    <div
                      key={cat.t}
                      onClick={() => setCompetencyType(cat.t)}
                      className={`p-4 rounded-2xl border flex flex-col gap-2 cursor-pointer transition-all duration-300 ${
                        competencyType === cat.t
                          ? "bg-indigo-50/50 dark:bg-indigo-500/10 border-indigo-500/50 ring-4 ring-indigo-500/5 shadow-lg"
                          : "bg-white dark:bg-[#020617] border-slate-200 dark:border-white/10 hover:border-indigo-400/50 hover:bg-slate-50/50 dark:hover:bg-white/[0.02]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[13px] font-black uppercase tracking-tight ${
                            competencyType === cat.t
                              ? "text-indigo-600 dark:text-indigo-400"
                              : "text-slate-900 dark:text-white"
                          }`}
                        >
                          {cat.t}
                        </span>
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            competencyType === cat.t
                              ? "border-indigo-600 bg-indigo-600 text-white shadow-md"
                              : "border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-white/5 text-transparent"
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                        {cat.d}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 bg-indigo-50/30 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/10 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                    Library Sync Preview
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`text-xs font-bold ${
                      competencyName ? "text-slate-900 dark:text-white" : "text-slate-400"
                    }`}
                  >
                    {competencyName || "Enter competency name..."}
                  </span>
                  <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded text-[9px] font-black uppercase tracking-widest">
                    {competencyType}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {competencySource === "onet" ? "O*NET ALIGNED" : "CUSTOM ASSET"}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50/50 dark:bg-[#020617]/50 border-t border-slate-100 dark:border-white/5 flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => setShowCompetencyModal(false)}
                disabled={isSavingCompetency}
                className="px-6 py-2.5 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={saveCompetency}
                disabled={isSavingCompetency || !competencyName.trim()}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-indigo-500/20"
              >
                {isSavingCompetency ? "Adding..." : "Add Competency"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Standard Confirmation Modal (Glassmorphism) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[40] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
            onClick={() => setShowConfirmModal(false)}
          />

          <div className="bg-white dark:bg-[#0f172a] rounded-[2rem] shadow-2xl border border-white/20 w-full max-w-sm overflow-hidden relative z-10 animate-in zoom-in-95 duration-300">
            <div className="p-8 text-center">
              <div
                className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-6 ${
                  confirmConfig.variant === "danger"
                    ? "bg-rose-500/10 text-rose-500"
                    : "bg-indigo-500/10 text-indigo-500"
                }`}
              >
                <AlertTriangle className="w-8 h-8" />
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{confirmConfig.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                {confirmConfig.message}
              </p>
            </div>

            <div className="flex border-t border-slate-100 dark:border-white/5">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-4 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-r border-slate-100 dark:border-white/5"
              >
                Cancel
              </button>
              <button
                onClick={confirmConfig.onConfirm}
                className={`flex-1 py-4 text-sm font-bold transition-colors hover:opacity-90 ${
                  confirmConfig.variant === "danger"
                    ? "text-rose-500 hover:bg-rose-500/5"
                    : "text-indigo-600 hover:bg-indigo-600/5"
                }`}
              >
                {confirmConfig.confirmText || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
