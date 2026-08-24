import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText,
  Search,
  Download,
  ExternalLink,
  Filter,
  CheckCircle2,
  Calendar,
  User,
  Star,
  TrendingUp,
  Info,
  Clock,
  Briefcase,
  Award,
  Zap,
  Target,
  ChevronUp,
  Sparkles,
  ShieldCheck,
  MapPin,
  ArrowDown,
  Crown,
  Building2,
  Users,
  TrendingUp as TrendIcon,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

import { getMyTasks, downloadSignedPdf } from '../../services/candidateService';

const MyPerformance = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [signedJDs, setSignedJDs] = useState([]);
  const [appraisals, setAppraisals] = useState([]);
  const [activeTab, setActiveTab] = useState('jds');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const data = await getMyTasks('completed');
        const allItems = Array.isArray(data) ? data : [];
        const jds = allItems.filter(item => item.type === 'JD_SIGN_OFF');
        const apprs = allItems.filter(item => item.type === 'APPRAISAL');

        const processedJDs = jds.map(jd => {
          let signedDate = jd.signedDate;
          if (!signedDate && jd.completed_at) {
            try {
              signedDate = new Date(jd.completed_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });
            } catch (e) {
              signedDate = jd.completed_at;
            }
          }
          return {
            ...jd,
            signedDate: signedDate || 'Completed'
          };
        });

        const processedApprs = apprs.map(appr => {
          let completedDate = appr.completedDate;
          if (!completedDate && appr.completed_at) {
            try {
              completedDate = new Date(appr.completed_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });
            } catch (e) {
              completedDate = appr.completed_at;
            }
          }
          return {
            ...appr,
            completedDate: completedDate || 'Completed'
          };
        });

        setSignedJDs(processedJDs);
        setAppraisals(processedApprs);

        const autoSelectId = location.state?.autoSelectId;
        if (autoSelectId) {
          const jd = jds.find(j => j.id === autoSelectId || j.jd_id === autoSelectId);
          if (jd) {
            setSelectedDoc({ ...jd, type: 'JD' });
            setActiveTab('jds');
          } else {
            const appr = apprs.find(a => a.id === autoSelectId);
            if (appr) {
              setSelectedDoc({ ...appr, type: 'APPRAISAL' });
              setActiveTab('appraisals');
            }
          }
          window.history.replaceState({}, document.title);
        }
      } catch (error) {
        toast.error('Failed to load performance history.');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [location.state?.autoSelectId]);

  useEffect(() => {
    setSelectedDoc(null);
  }, [activeTab]);

  const [mainTab, setMainTab] = useState('history');
  const [isDownloading, setIsDownloading] = useState(false);

  const handleExportPDF = async (doc) => {
    if (isDownloading) return;
    if (!doc?.id) return;

    const loadingToast = toast.loading(`Generating ${doc.title} PDF...`);
    setIsDownloading(true);

    try {
      const blob = await downloadSignedPdf(doc.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.title || 'Signed_Job_Description'}_Signed.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.dismiss(loadingToast);
      toast.success("Signed PDF downloaded successfully!");
    } catch (error) {
      console.error("Failed to export PDF:", error);
      toast.dismiss(loadingToast);
      toast.error("Could not export signed PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const filteredJDs = signedJDs.filter(jd =>
    jd.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAppraisals = appraisals.filter(appr =>
    appr.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ─── Career Data ──────────────────────────────────────────────────
  const careerData = {
    currentRole: {
      designation: "Software Design Engineer II",
      department: "Engineering",
      employmentType: "Full-Time",
      effectiveDate: "Mar 01, 2025",
      status: "Current Role",
      reportingManager: "Rajesh Sharma",
      timeInRole: "4 months"
    },
    previousRoles: [
      {
        id: 2,
        designation: "Software Design Engineer I",
        status: "Promoted",
        effectiveDate: "Aug 15, 2023",
        department: "Engineering",
        employmentType: "Full-Time",
        duration: "1.5 years"
      },
      {
        id: 1,
        designation: "Software Design Engineer Trainee",
        status: "Joined Company",
        effectiveDate: "Jan 10, 2022",
        department: "Engineering",
        employmentType: "Full-Time",
        duration: "1.6 years"
      }
    ],
    insights: {
      joiningDate: "Jan 10, 2022",
      totalPromotions: 2,
      nextLevel: "Senior Software Engineer",
      avgTimePerRole: "1.5 years",
      totalTenure: "3.5 Years"
    }
  };

  // ─── Animation Variants ───────────────────────────────────────────
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.05 }
    }
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
    }
  };

  const scaleIn = {
    hidden: { opacity: 0, scale: 0.92 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
    }
  };

  const lineGrow = {
    hidden: { scaleY: 0 },
    visible: {
      scaleY: 1,
      transition: { duration: 0.5, ease: "easeOut" }
    }
  };

  const nodePop = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: { type: "spring", stiffness: 400, damping: 18 }
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-10">
      <div className="max-w-5xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">My Jobs</h1>
          <p className="text-slate-500 mt-2 font-medium">Access your career records, role history, and signed documents.</p>
        </div>

        {/* Main Tabs */}
        <div className="flex gap-8 mb-8 border-b border-slate-200">
          <button
            onClick={() => setMainTab('history')}
            className={`pb-4 px-2 font-bold text-sm transition-all border-b-2 flex items-center gap-2 ${mainTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}
          >
            <TrendingUp size={16} />
            Role History
          </button>
          <button
            onClick={() => setMainTab('documents')}
            className={`pb-4 px-2 font-bold text-sm transition-all border-b-2 flex items-center gap-2 ${mainTab === 'documents' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}
          >
            <FileText size={16} />
            Documents
          </button>
        </div>

        {mainTab === 'history' && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="space-y-8"
          >
            {/* ── Summary Cards Row ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <motion.div variants={fadeUp} className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex items-center gap-3 hover:shadow-md hover:border-slate-300/80 transition-all duration-300">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  <Star size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current</p>
                  <p className="font-bold text-slate-900 text-xs truncate">SDE II</p>
                </div>
              </motion.div>

              <motion.div variants={fadeUp} className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex items-center gap-3 hover:shadow-md hover:border-slate-300/80 transition-all duration-300">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <ChevronUp size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Promotions</p>
                  <p className="font-bold text-slate-900 text-xs">2</p>
                </div>
              </motion.div>

              <motion.div variants={fadeUp} className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex items-center gap-3 hover:shadow-md hover:border-slate-300/80 transition-all duration-300">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <Calendar size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tenure</p>
                  <p className="font-bold text-slate-900 text-xs">3.5 Years</p>
                </div>
              </motion.div>

              <motion.div variants={fadeUp} className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex items-center gap-3 hover:shadow-md hover:border-slate-300/80 transition-all duration-300">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                  <Building2 size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Department</p>
                  <p className="font-bold text-slate-900 text-xs">Engineering</p>
                </div>
              </motion.div>
            </div>

            {/* ── Hero Card: Current Role ── */}
            <motion.div
              variants={scaleIn}
              className="relative overflow-hidden rounded-3xl border border-indigo-200/40 shadow-xl shadow-indigo-100/40"
            >
              {/* Gradient Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/60" />
              <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-indigo-100/30 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
              <div className="absolute bottom-0 left-0 w-56 h-56 bg-gradient-to-tr from-purple-100/20 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

              <div className="relative p-8 lg:p-10">
                {/* Badge Row */}
                <div className="flex items-center gap-3 mb-6">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-md shadow-indigo-200">
                    <Crown size={12} />
                    Current Role
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/80 backdrop-blur-sm text-indigo-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-indigo-100">
                    <Sparkles size={12} />
                    Active
                  </span>
                </div>

                {/* Main Content */}
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1">Your Designation</p>
                    <h2 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
                      {careerData.currentRole.designation}
                    </h2>
                  </div>

                  {/* Avatar + Manager */}
                  <div className="flex items-center gap-3 bg-white/60 backdrop-blur-sm rounded-2xl border border-indigo-100/50 px-4 py-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-200">
                      RS
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reporting To</p>
                      <p className="text-sm font-bold text-slate-800">{careerData.currentRole.reportingManager}</p>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="my-6 h-px bg-gradient-to-r from-indigo-200/40 via-slate-200/30 to-transparent" />

                {/* Meta Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <MapPin size={10} />
                      Department
                    </div>
                    <p className="text-sm font-bold text-slate-800">{careerData.currentRole.department}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <Clock size={10} />
                      Employment
                    </div>
                    <p className="text-sm font-bold text-slate-800">{careerData.currentRole.employmentType}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <Calendar size={10} />
                      Effective Since
                    </div>
                    <p className="text-sm font-bold text-slate-800">{careerData.currentRole.effectiveDate}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <TrendIcon size={10} />
                      Time in Role
                    </div>
                    <p className="text-sm font-bold text-slate-800">{careerData.currentRole.timeInRole}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ── Career Progression Section ── */}
            <div>
              <motion.div variants={fadeUp} className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-slate-200" />
                <div className="flex items-center gap-2 px-4">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                    <ArrowDown size={14} className="text-slate-500" />
                  </div>
                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Career Progression</span>
                </div>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent via-slate-200 to-slate-200" />
              </motion.div>

              <div className="relative pl-6">
                {/* Vertical Connector Line */}
                <div className="absolute left-[11px] top-2 bottom-8 w-0.5 bg-gradient-to-b from-slate-200 via-indigo-200 to-slate-200 rounded-full" />

                <div className="space-y-0">
                  {careerData.previousRoles.map((role, index) => {
                    const isLast = index === careerData.previousRoles.length - 1;
                    return (
                      <motion.div
                        key={role.id}
                        variants={fadeUp}
                        className="relative pb-8 last:pb-0"
                      >
                        {/* Milestone Node */}
                        <motion.div
                          variants={nodePop}
                          className="absolute left-[-17px] top-3 z-10"
                        >
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${role.status === 'Promoted'
                              ? 'bg-emerald-50 border-emerald-300'
                              : 'bg-blue-50 border-blue-300'
                            }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${role.status === 'Promoted' ? 'bg-emerald-500' : 'bg-blue-500'
                              }`} />
                          </div>
                        </motion.div>

                        {/* Role Card */}
                        <div className="ml-4 group">
                          <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm hover:shadow-md hover:border-slate-300/80 transition-all duration-300 hover:-translate-y-0.5">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                {/* Status + Date */}
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full ${role.status === 'Promoted'
                                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                      : 'bg-blue-50 text-blue-600 border border-blue-100'
                                    }`}>
                                    {role.status === 'Promoted' ? (
                                      <ChevronUp size={9} />
                                    ) : (
                                      <Briefcase size={9} />
                                    )}
                                    {role.status}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-400">•</span>
                                  <span className="text-[10px] font-bold text-slate-400">{role.effectiveDate}</span>
                                </div>

                                {/* Designation */}
                                <h3 className="text-base font-bold text-slate-800 leading-tight mb-2">
                                  {role.designation}
                                </h3>

                                {/* Meta */}
                                <div className="flex flex-wrap items-center gap-3">
                                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                    <MapPin size={11} className="text-slate-400" />
                                    <span className="font-medium">{role.department}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                    <Clock size={11} className="text-slate-400" />
                                    <span className="font-medium">{role.employmentType}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                    <Calendar size={11} />
                                    <span className="font-medium">{role.duration}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Duration Pill */}
                              <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100 shrink-0">
                                <Clock size={12} className="text-slate-400" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{role.duration}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Career Insights ── */}
            <motion.div
              variants={fadeUp}
              className="pt-4"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md shadow-amber-200">
                  <Zap size={16} className="text-white" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 tracking-tight">Career Insights</h2>
                  <p className="text-[11px] text-slate-500 font-medium">Key metrics from your journey</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: Calendar, label: "Joining Date", value: careerData.insights.joiningDate, color: "bg-blue-50 text-blue-600" },
                  { icon: Award, label: "Promotions", value: careerData.insights.totalPromotions, color: "bg-emerald-50 text-emerald-600" },
                  { icon: Target, label: "Next Level", value: careerData.insights.nextLevel, color: "bg-indigo-50 text-indigo-600" },
                  { icon: Clock, label: "Avg. per Role", value: careerData.insights.avgTimePerRole, color: "bg-amber-50 text-amber-600" }
                ].map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                    className="group bg-white rounded-xl border border-slate-200/60 p-4 hover:shadow-lg hover:border-slate-300/80 transition-all duration-300"
                  >
                    <div className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform duration-300`}>
                      <item.icon size={15} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{item.label}</p>
                    <p className="font-bold text-slate-900 text-xs leading-tight">{item.value}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {mainTab === 'documents' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[32px] border border-slate-100 shadow-sm">
                <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
                <p className="text-slate-500 font-medium">Fetching documents...</p>
              </div>
            ) : (
              <div className={`grid grid-cols-1 lg:grid-cols-12 gap-10 relative ${activeTab === 'appraisals' ? 'overflow-hidden max-h-[500px]' : ''}`}>
                {activeTab === 'appraisals' && (
                  <div className="absolute inset-0 z-50 backdrop-blur-[2px] bg-white/5 flex items-center justify-center p-4 text-center rounded-[32px] overflow-hidden">
                    <div className="bg-white/95 backdrop-blur-2xl p-8 rounded-[32px] border border-white shadow-2xl max-w-sm w-full animate-in fade-in zoom-in duration-500">
                      <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-100 rotate-3">
                        <TrendingUp className="text-white" size={32} />
                      </div>
                      <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tighter uppercase">Coming Soon</h2>
                      <p className="text-slate-500 font-bold text-xs mb-8 leading-relaxed px-2">
                        Comprehensive Appraisal history and analytics are coming in the next version of TalentForge.
                      </p>
                      <button
                        onClick={() => setActiveTab('jds')}
                        className="w-full py-3.5 bg-[#0f172a] text-white rounded-xl font-black hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2 mx-auto shadow-xl shadow-slate-200 text-sm"
                      >
                        View My Signed JDs
                      </button>
                    </div>
                  </div>
                )}

                <div className={`lg:col-span-5 space-y-4 ${activeTab === 'appraisals' ? 'opacity-40 pointer-events-none' : ''}`}>
                  <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      placeholder="Search documents..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-medium"
                    />
                  </div>

                  {activeTab === 'jds' ? (
                    filteredJDs.map((jd) => (
                      <div
                        key={jd.id}
                        onClick={() => setSelectedDoc({ ...jd, type: 'JD' })}
                        className={`p-6 rounded-[24px] border-2 transition-all cursor-pointer group ${selectedDoc?.id === jd.id ? 'bg-white border-indigo-600 shadow-xl shadow-indigo-100' : 'bg-white border-transparent hover:border-slate-200 shadow-sm'}`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            <FileText size={24} />
                          </div>
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-full">
                            {jd.status}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-lg mb-1">{jd.title}</h3>
                        <div className="flex items-center gap-3 text-slate-500 text-sm">
                          <Calendar size={14} />
                          <span>{jd.signedDate}</span>
                          {jd.version && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span>v{jd.version}</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    filteredAppraisals.map((appr) => (
                      <div
                        key={appr.id}
                        onClick={() => setSelectedDoc({ ...appr, type: 'APPRAISAL' })}
                        className={`p-6 rounded-[24px] border-2 transition-all cursor-pointer group ${selectedDoc?.id === appr.id ? 'bg-white border-indigo-600 shadow-xl shadow-indigo-100' : 'bg-white border-transparent hover:border-slate-200 shadow-sm'}`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                            <TrendingUp size={24} />
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-black text-indigo-600">{appr.score}%</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Overall Score</div>
                          </div>
                        </div>
                        <h3 className="font-bold text-slate-900 text-lg mb-1">{appr.title}</h3>
                        <div className="flex items-center gap-3 text-slate-500 text-sm">
                          <Calendar size={14} />
                          <span>{appr.completedDate}</span>
                        </div>
                      </div>
                    ))
                  )}

                  {((activeTab === 'jds' && filteredJDs.length === 0) || (activeTab === 'appraisals' && filteredAppraisals.length === 0)) && (
                    <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-sm">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Filter className="text-slate-300" size={32} />
                      </div>
                      <h4 className="font-bold text-slate-900">No documents found</h4>
                      <p className="text-sm text-slate-500">Your signed records will appear here.</p>
                    </div>
                  )}
                </div>

                <div className={`lg:col-span-7 ${activeTab === 'appraisals' ? 'opacity-40 pointer-events-none' : ''}`}>
                  {selectedDoc ? (
                    <div className="bg-white rounded-[32px] border border-slate-100 shadow-2xl shadow-slate-200/50 p-8 lg:p-10 animate-in fade-in slide-in-from-right-4 duration-500 sticky top-24">
                      <div className="flex justify-between items-center gap-6 mb-8 border-b border-slate-100 pb-6">
                        <div>
                          <h2 className="text-xl lg:text-2xl font-black text-slate-900 mb-1.5 leading-tight">{selectedDoc.title}</h2>
                          <div className="flex items-center gap-4 text-slate-400 font-bold text-xs tracking-wide">
                            <div className="flex items-center gap-1.5">
                              <Calendar size={14} className="text-slate-400" />
                              {selectedDoc.signedDate || selectedDoc.completedDate}
                            </div>
                            {selectedDoc.version && (
                              <div className="flex items-center gap-1.5">
                                <Info size={14} className="text-slate-400" />
                                Version {selectedDoc.version}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleExportPDF(selectedDoc)}
                          disabled={isDownloading}
                          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-100 shrink-0"
                        >
                          {isDownloading ? (
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <Download size={14} />
                          )}
                          Export PDF
                        </button>
                      </div>

                      {selectedDoc.type === 'APPRAISAL' || selectedDoc.type === 'Self-Assessment' ? (
                        <div className="space-y-8">
                          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</div>
                              <div className="text-xl font-black text-indigo-600">{selectedDoc.status}</div>
                              <div className="text-sm font-bold text-slate-900 mt-1">{selectedDoc.type}</div>
                            </div>
                            <div>
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Overall Score</div>
                              <div className="text-2xl font-black text-slate-900">{selectedDoc.score !== 'N/A' ? `${selectedDoc.score}%` : 'Pending Review'}</div>
                            </div>
                          </div>

                          <div className="space-y-6">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                              <Star className="text-amber-400 fill-amber-400" size={18} />
                              Competency Ratings
                            </h3>

                            {selectedDoc.ratings ? (
                              Object.entries(selectedDoc.ratings).map(([name, rating], i) => (
                                <div key={i} className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                  <div className="flex justify-between items-start mb-3">
                                    <h4 className="font-bold text-slate-900">{name}</h4>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${rating.includes('Exceeds') ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                      {rating}
                                    </span>
                                  </div>
                                  {selectedDoc.comments?.[name] && (
                                    <p className="text-sm text-slate-600 leading-relaxed italic">"{selectedDoc.comments[name]}"</p>
                                  )}
                                </div>
                              ))
                            ) : (
                              selectedDoc.competencies?.map((comp, i) => (
                                <div key={i} className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                  <div className="flex justify-between items-start mb-3">
                                    <div>
                                      <h4 className="font-bold text-slate-900">{comp.name}</h4>
                                      <p className="text-xs text-slate-500 font-medium">Weight: {comp.weight}%</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${comp.rating.includes('Exceeds') ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                      {comp.rating}
                                    </span>
                                  </div>
                                  <p className="text-sm text-slate-600 leading-relaxed italic">"{comp.comments}"</p>
                                </div>
                              ))
                            )}
                          </div>

                          {selectedDoc.comments?.['Self-Assessment'] && (
                            <div className="space-y-4 pt-4">
                              <h3 className="font-bold text-slate-900">Final Reflection</h3>
                              <div className="p-6 bg-indigo-50/30 rounded-2xl border border-indigo-100/50 text-slate-700 leading-relaxed text-sm italic">
                                {selectedDoc.comments['Self-Assessment']}
                              </div>
                            </div>
                          )}

                          {selectedDoc.managerComments && (
                            <div className="space-y-4 pt-4">
                              <h3 className="font-bold text-slate-900">Manager Summary</h3>
                              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-slate-700 leading-relaxed text-sm italic">
                                {selectedDoc.managerComments}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-8">
                          <div className="p-8 bg-slate-50 rounded-[28px] border border-slate-100 flex flex-col items-center justify-center text-center">
                            <FileText size={48} className="text-slate-300 mb-4" />
                            <h4 className="font-bold text-slate-900 mb-2">Job Description Document</h4>
                            <p className="text-sm text-slate-500 max-w-xs mx-auto mb-6">
                              This is a verified copy of the job description signed on {selectedDoc.signedDate}.
                            </p>
                            <button
                              onClick={() => navigate(`/enduser/jd-review/${selectedDoc.id}`)}
                              className="text-indigo-600 font-bold text-sm flex items-center gap-2 hover:underline"
                            >
                              <ExternalLink size={16} /> View Document Content
                            </button>
                          </div>

                          <div className="pt-8 border-t border-slate-100">
                            <h3 className="font-bold text-slate-900 mb-6">Digital Signature Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="p-5 bg-white border border-slate-100 rounded-2xl">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Signee</div>
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                                    <User size={20} />
                                  </div>
                                  <div>
                                    <div className="font-bold text-slate-900">{localStorage.getItem('jdforge_user') ? JSON.parse(localStorage.getItem('jdforge_user')).full_name : 'Sahil Kumar'}</div>
                                    <div className="text-xs text-slate-500">Employee</div>
                                  </div>
                                </div>
                              </div>
                              <div className="p-4 bg-white border border-slate-100 rounded-xl flex flex-col items-center justify-center min-h-[80px]">
                                {selectedDoc.signature_data && selectedDoc.signature_data !== 'password' ? (
                                  <img src={selectedDoc.signature_data} alt="Digital Signature" className="h-8 object-contain" />
                                ) : (
                                  <div style={{ fontFamily: '"Great Vibes", cursive' }} className="text-2xl text-slate-800 mb-1">
                                    {localStorage.getItem('jdforge_user') ? JSON.parse(localStorage.getItem('jdforge_user')).full_name : 'Sahil Kumar'}
                                  </div>
                                )}
                                <div className="text-[8px] font-black text-emerald-600 uppercase tracking-[0.2em] flex items-center gap-1 mt-1.5">
                                  <CheckCircle2 size={9} /> Electronically Verified
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full min-h-[600px] flex flex-col items-center justify-center p-12 bg-white rounded-[32px] border border-dashed border-slate-200 shadow-sm">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                        <FileText size={40} className="text-slate-200" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-400">Select a document to view details</h3>
                      <p className="text-slate-400 text-sm mt-2 text-center max-w-xs">
                        Your full document history including digital signatures will be displayed here.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Google Font for cursive signature */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');
      `}</style>
    </div>
  );
};

export default MyPerformance;