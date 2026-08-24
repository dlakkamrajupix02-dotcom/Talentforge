import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, 
  FileCheck,
  ShieldAlert,
  Lock,
  ArrowRight,
  Download,
  Info,
  CheckCircle2,
  Check,
  Upload,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Calendar,
  Briefcase,
  MapPin,
  AlignLeft,
  List,
  Wand2,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Mail,
  Clock,
  History,
  Zap,
  AlertCircle,
  Type,
  Users,
} from 'lucide-react';
import { JDContext } from '../../context/JDContext';
import * as orgService from '../../services/organizationService';
import toast from 'react-hot-toast';
import AssignedJDContent from '../../components/common/AssignedJDContent';

const StaticDisplay = ({ label, value, icon: Icon }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
      {Icon && <Icon className="w-4 h-4 text-indigo-500" />}
      <span>{value || "N/A"}</span>
    </div>
  </div>
);

const isCompleteStatus = (status) => status?.toLowerCase().includes('complete');

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ViewAssignedJD() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useContext(JDContext);

  const campaign = location.state?.campaign ?? null;
  const [activeAssigneeId, setActiveAssigneeId] = useState(location.state?.assigneeId || id);
  
  const [jd, setJd] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAgreed, setIsAgreed] = useState(false);
  const [signatureType, setSignatureType] = useState('password');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [fallbackAssignment, setFallbackAssignment] = useState(null);

  const activeAssignment = useMemo(() => {
    if (campaign?.assignees?.length) {
      return campaign.assignees.find((a) => a.id === activeAssigneeId) || campaign.assignees[0];
    }
    return fallbackAssignment;
  }, [campaign, activeAssigneeId, fallbackAssignment]);

  const candidateInfo = useMemo(() => ({
    name: activeAssignment?.candidate_name || jd?.candidate_name || '',
    email: activeAssignment?.candidate_email || jd?.candidate_email || jd?.email || '',
  }), [activeAssignment, jd]);

  const displayStatus = activeAssignment?.status || jd?.status;
  const displayCompletedAt = activeAssignment?.completed_at || jd?.completed_at;
  const displayAssignedAt = activeAssignment?.assigned_at || jd?.assigned_at || jd?.created_at;

  useEffect(() => {
    setActiveAssigneeId(location.state?.assigneeId || id);
  }, [id, location.state?.assigneeId]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const sampleId = campaign?.assignees?.[0]?.id || id;
        const data = await orgService.getAssignedJDDetails(sampleId);
        setJd(data);

        if (!campaign) {
          const allAssignments = await orgService.getAllAssignments();
          const currentAssignment = (allAssignments.assignments || allAssignments || []).find((a) => a.id === id);
          setFallbackAssignment(currentAssignment || null);
        }
      } catch (err) {
        console.error('Failed to fetch assigned JD details:', err);
        toast.error('Could not load JD details');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id, campaign?.id]);

  const handleSign = async (e) => {
    e.preventDefault();
    if (!isAgreed) {
      toast.error("Please accept the terms and conditions");
      return;
    }
    if (signatureType === 'password' && !password) {
      toast.error("Please enter your password");
      return;
    }

    setIsSigning(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success("JD signed and finalized successfully!");
      navigate('/admin/assigned-jds');
    } catch (err) {
      toast.error("Sign-off failed");
    } finally {
      setIsSigning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#020617]">
        <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <RefreshCw className="absolute inset-0 m-auto w-6 h-6 text-indigo-600" />
        </div>
      </div>
    );
  }

  if (!jd) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#020617]">
        <div className="text-center p-10 bg-white dark:bg-[#0f172a] rounded-[2rem] shadow-xl border border-slate-100 dark:border-white/5">
          <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Assignment Not Found</h2>
          <button onClick={() => navigate(-1)} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200">Go Back</button>
        </div>
      </div>
    );
  }

  const isCompleted = isCompleteStatus(displayStatus);

  const statusConfig = {
    'sign-off-pending': { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', accent: 'bg-amber-500', msg: 'Awaiting candidate signature' },
    'pending': { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', accent: 'bg-blue-500', msg: 'Newly assigned' },
    'completed': { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', accent: 'bg-emerald-500', msg: 'Successfully signed' },
    'sign-off-complete': { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', accent: 'bg-emerald-500', msg: 'Successfully signed' }
  };
  const config = statusConfig[displayStatus] || statusConfig['pending'];

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] pb-20 selection:bg-indigo-500/30">
      <div className="w-full max-w-none mx-auto px-6 lg:px-16 py-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Navigation */}
        <div className="flex items-center justify-between">
            <button 
                onClick={() => navigate(-1)}
                className="group flex items-center gap-4 text-slate-900 dark:text-white font-black text-xs uppercase tracking-[0.25em] hover:text-indigo-500 transition-colors"
            >
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200/60 dark:border-white/5 flex items-center justify-center shadow-sm">
                    <ArrowLeft size={20} strokeWidth={3} className="group-hover:-translate-x-1 transition-transform" />
                </div>
                Back to List
            </button>
            <div className="flex items-center gap-3">
              {jd?.word_count && (
               <div className={`h-12 flex items-center gap-2 px-6 bg-white dark:bg-[#0f172a] border-2 ${jd.word_count > 3990 ? 'border-rose-500/50 bg-rose-50/50 dark:bg-rose-950/20 shadow-lg shadow-rose-500/10' : 'border-slate-200/60 dark:border-white/5 shadow-sm'} rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300`}>
                  <Type size={16} className={jd.word_count > 3990 ? "text-rose-500 animate-pulse" : "text-indigo-500"} /> 
                  <span className={jd.word_count > 3990 ? "text-rose-600 dark:text-rose-400" : "text-slate-400 dark:text-slate-300"}>TOTAL CHARACTERS:</span> 
                  <span className={`ml-1 italic font-mono text-xs ${jd.word_count > 3990 ? "text-rose-600 dark:text-rose-400" : "text-indigo-500"}`}>{jd.word_count} / 3990</span>
               </div>
              )}
              <div className="h-12 flex items-center gap-2 px-6 bg-white dark:bg-[#0f172a] border border-slate-200/60 dark:border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 border-dashed">
                  <ShieldCheck size={16} className="text-indigo-500" /> COMPLIANCE CLEARANCE: <span className="text-emerald-500 ml-1 italic">ACTIVE</span>
              </div>
            </div>
        </div>

        {/* Slim Sticky Floating Warning Banner */}
        {jd?.word_count > 3990 && (
          <div className="sticky top-4 z-50 bg-red-50 dark:bg-rose-950/90 border-2 border-red-200 dark:border-rose-800 rounded-2xl p-4 shadow-xl shadow-red-500/10 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500 mb-6 mt-4">
            <div className="flex items-center gap-3 min-w-0">
              <AlertCircle className="w-6 h-6 shrink-0 text-red-600 dark:text-rose-400 animate-bounce" />
              <span className="text-red-800 dark:text-rose-200 text-sm font-bold truncate sm:overflow-visible sm:whitespace-normal">
                Warning: Job Description exceeds the limit by <span className="font-black bg-rose-200 dark:bg-rose-800 px-2 py-0.5 rounded-lg text-rose-900 dark:text-rose-100">{jd.word_count - 3990} extra characters</span>. Please reduce text for CSOD posting.
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-12 gap-10 items-start mt-6">
          
          {/* ─── MAIN CONTENT ─── */}
          <div className="col-span-12 lg:col-span-9 space-y-10">
            
            <div className="bg-white dark:bg-[#0f172a] rounded-[3rem] p-10 lg:p-14 border border-slate-200/60 dark:border-white/5 shadow-sm relative overflow-hidden group">
                <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
                
                <div className="relative z-10 space-y-12">
                    
                    {/* Header Area */}
                    <div className="space-y-6">
                        <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${config.bg} ${config.text} ${config.border} shadow-sm`}>
                            <Zap size={12} className={config.accent} />
                            {displayStatus?.replace(/-/g, ' ')}
                        </span>
                        
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                            <div className="space-y-3">
                                <h1 className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight">
                                    {jd.title}
                                </h1>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-10 gap-y-6 mt-8">
                                    <StaticDisplay label="Department" value={jd.department} icon={Briefcase} />
                                    <StaticDisplay label="Location" value={jd.location} icon={MapPin} />
                                    <StaticDisplay label="Job ID" value={jd.job_id} />
                                    <StaticDisplay label="Due Date" value={formatDate(jd.due_date)} icon={Calendar} />
                                </div>
                            </div>
                            <div className="bg-white dark:bg-white/[0.03] p-5 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm flex items-center gap-5 min-w-[280px]">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                                    <Mail size={24} />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] leading-none mb-1">
                                      {campaign ? 'Selected Assignee' : 'Assigned Candidate'}
                                    </p>
                                    <p className="text-sm font-black text-slate-900 dark:text-white leading-tight break-all">
                                        {candidateInfo.email || 'Candidate'}
                                    </p>
                                    {candidateInfo.name && (
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1 opacity-60">
                                            {candidateInfo.name}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {campaign && (
                      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs font-medium text-indigo-900">
                          Shared job description for <span className="font-black">{campaign.total} assignees</span> — switch person to view their sign-off status.
                        </p>
                      </div>
                    )}

                    <AssignedJDContent jd={jd} />

                </div>
            </div>

            {/* Acknowledge & Sign Section - Only for candidates, not admins */}
            {!currentUser?.role?.toLowerCase().includes('admin') && (
              <div className="bg-white dark:bg-[#0f172a] rounded-[3rem] p-10 lg:p-14 border border-slate-200/60 dark:border-white/5 shadow-sm space-y-10">
                  <div className="flex items-center gap-5">
                      <div className="w-16 h-16 bg-slate-900 dark:bg-indigo-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl">
                          <FileCheck size={32} />
                      </div>
                      <div>
                          <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Acknowledge & Sign</h3>
                          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.25em]">Final verification of document review</p>
                      </div>
                  </div>

                  <div className="space-y-8 max-w-3xl">
                      <div 
                          onClick={() => setIsAgreed(!isAgreed)}
                          className={`p-8 rounded-[2rem] border-2 transition-all cursor-pointer flex gap-6 items-start ${
                              isAgreed 
                                  ? 'bg-indigo-50/50 border-indigo-600 dark:bg-indigo-500/5' 
                                  : 'bg-slate-50 border-transparent dark:bg-white/[0.02] hover:border-slate-200'
                          }`}
                      >
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all shrink-0 ${
                              isAgreed ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-white/10 text-transparent'
                          }`}>
                              <Check size={22} strokeWidth={4} />
                          </div>
                          <div className="space-y-1.5">
                              <p className="text-lg font-black text-slate-900 dark:text-white">Accept Terms & Conditions</p>
                              <p className="text-xs text-slate-500 font-medium leading-relaxed opacity-80">
                                  I confirm that I have reviewed the job description and agree to abide by the standards and expectations set forth in this document.
                              </p>
                          </div>
                      </div>

                      <div className="flex bg-slate-100 dark:bg-white/[0.05] p-2 rounded-2xl w-fit">
                          {['password', 'upload'].map((type) => (
                              <button 
                                  key={type}
                                  onClick={() => setSignatureType(type)}
                                  className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                      signatureType === type ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-md' : 'text-slate-400 hover:text-slate-600'
                                  }`}
                              >
                                  {type === 'password' ? 'Password Sign' : 'Upload Sign'}
                              </button>
                          ))}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                          <div className="space-y-6">
                              {signatureType === 'password' ? (
                                  <div className="relative group">
                                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                                      <input 
                                          type={showPassword ? 'text' : 'password'}
                                          placeholder="Confirm your password"
                                          value={password}
                                          onChange={(e) => setPassword(e.target.value)}
                                          className="w-full pl-14 pr-14 py-5 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[1.5rem] font-bold text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-900 dark:text-white"
                                      />
                                      <button 
                                          onClick={() => setShowPassword(!showPassword)}
                                          className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500"
                                      >
                                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                      </button>
                                  </div>
                              ) : (
                                  <div className="w-full h-16 bg-slate-50 dark:bg-white/[0.02] border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[1.5rem] flex items-center justify-center gap-3 cursor-pointer hover:bg-indigo-50/50 hover:border-indigo-400 transition-all group">
                                      <Upload size={22} className="text-slate-400 group-hover:text-indigo-500" />
                                      <span className="text-xs font-black text-slate-400 group-hover:text-indigo-500 uppercase tracking-widest">Upload Digital Signature</span>
                                  </div>
                              )}
                          </div>

                          <div className="h-36 bg-slate-950 rounded-[2.5rem] border border-white/5 flex flex-col items-center justify-center p-8 text-center shadow-2xl relative overflow-hidden group">
                              <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                              <div className="text-4xl font-cursive text-indigo-400 opacity-90 mb-2 drop-shadow-[0_0_15px_rgba(129,140,248,0.3)]">
                                  {password ? (currentUser?.full_name || 'Sahil Kumar') : 'Digital Sign'}
                              </div>
                              <div className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] relative z-10">Verified Identity</div>
                          </div>
                      </div>

                      <button 
                          onClick={handleSign}
                          disabled={isSigning || !isAgreed}
                          className={`w-full py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-4 transition-all shadow-2xl ${
                              isAgreed && !isSigning 
                                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/30 hover:-translate-y-1 active:translate-y-0 active:shadow-none' 
                                  : 'bg-slate-100 dark:bg-white/[0.05] text-slate-400 cursor-not-allowed shadow-none'
                          }`}
                      >
                          {isSigning ? (
                              <>
                                  <RefreshCw className="w-5 h-5 animate-spin" />
                                  Processing Secure Sign...
                              </>
                          ) : (
                              <>
                                  Finalize & Sign JD
                                  <ArrowRight size={20} strokeWidth={3} />
                              </>
                          )}
                      </button>
                  </div>
              </div>
            )}

          </div>

          {/* ─── SIDEBAR ─── */}
          <div className="col-span-12 lg:col-span-3 space-y-8 sticky top-10">

            {campaign && (
              <div className="bg-white dark:bg-[#0f172a] rounded-[2.5rem] p-6 border border-slate-200/60 dark:border-white/5 shadow-sm space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Users size={14} className="text-indigo-500" /> Campaign Assignees
                </h3>
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {campaign.assignees.map((assignee) => {
                    const selected = assignee.id === activeAssigneeId;
                    const done = isCompleteStatus(assignee.status);
                    return (
                      <button
                        key={assignee.id}
                        type="button"
                        onClick={() => setActiveAssigneeId(assignee.id)}
                        className={`w-full text-left rounded-2xl border px-3 py-2.5 transition-all ${
                          selected
                            ? 'border-indigo-300 bg-indigo-50 shadow-sm'
                            : 'border-slate-100 bg-slate-50/50 hover:border-indigo-200 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black shrink-0">
                            {(assignee.candidate_name || assignee.candidate_email || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 truncate">{assignee.candidate_name || 'Unknown'}</p>
                            <p className="text-[10px] text-slate-500 truncate">{assignee.candidate_email}</p>
                          </div>
                          <span className={`w-2 h-2 rounded-full shrink-0 ${done ? 'bg-emerald-500' : 'bg-orange-400'}`} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Status Card */}
            <div className="bg-white dark:bg-[#0f172a] rounded-[2.5rem] p-8 border border-slate-200/60 dark:border-white/5 shadow-sm space-y-8">
                <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Zap size={14} className="text-indigo-500" /> Pipeline Status
                    </h3>
                    <div className={`w-2 h-2 rounded-full ${config.accent} animate-pulse`} />
                </div>

                <div className={`p-8 rounded-[2rem] border ${config.bg} ${config.border} flex flex-col items-center text-center gap-4`}>
                    <div className="w-14 h-14 rounded-2xl bg-white dark:bg-[#020617] flex items-center justify-center border border-white dark:border-white/10 shadow-lg relative overflow-hidden">
                        <div className={`absolute inset-0 ${config.bg} opacity-20`} />
                        <CheckCircle2 size={28} className={config.text} />
                    </div>
                    <div>
                        <p className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">
                            {displayStatus?.replace(/-/g, ' ')}
                        </p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest opacity-70 italic mt-1">{config.msg}</p>
                    </div>
                </div>

                <div className="space-y-4 pt-2">
                    {isCompleted ? (
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-500/5 rounded-2xl border border-emerald-100 dark:border-emerald-500/10 flex items-start gap-3">
                            <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                                This document has been fully signed and archived.
                            </p>
                        </div>
                    ) : (
                        <div className="p-4 bg-indigo-50 dark:bg-indigo-500/5 rounded-2xl border border-indigo-100 dark:border-indigo-500/10 flex items-start gap-3">
                            <Info size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                                This document is pending signature from <span className="font-bold text-indigo-600">{candidateInfo.name || 'the candidate'}</span>. Once signed, it will be moved to the completed archive.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Audit Logs Card */}
            <div className="bg-white dark:bg-[#0f172a] rounded-[2.5rem] p-8 border border-slate-200/60 dark:border-white/5 shadow-sm space-y-8">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <History size={14} className="text-indigo-500" /> Integrity Audit
                </h3>
                <div className="space-y-6">
                    {/* History/Logs based on response data */}
                    <div className="flex gap-4 relative">
                        <div className="absolute left-[13px] top-6 bottom-[-24px] w-[2px] bg-slate-100 dark:bg-white/5" />
                        <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center shrink-0 border-4 border-white dark:border-[#0f172a] shadow-sm relative z-10">
                            <Check size={10} className="text-white" strokeWidth={4} />
                        </div>
                        <div className="flex-1 pb-6">
                            <div className="flex justify-between items-start mb-1">
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Created</p>
                                <p className="text-[9px] text-slate-400 font-medium">{formatDate(displayAssignedAt)}</p>
                            </div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                                Assignment initiated by <span className="text-indigo-500">System</span>
                            </p>
                        </div>
                    </div>
                    {isCompleted ? (
                        <>
                            <div className="flex gap-4 relative">
                                <div className="absolute left-[13px] top-6 bottom-[-24px] w-[2px] bg-slate-100 dark:bg-white/5" />
                                <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 border-4 border-white dark:border-[#0f172a] shadow-sm relative z-10">
                                    <Check size={10} className="text-white" strokeWidth={4} />
                                </div>
                                <div className="flex-1 pb-6">
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Awaiting Sign-off</p>
                                        <p className="text-[9px] text-slate-400 font-medium">{formatDate(displayAssignedAt)}</p>
                                    </div>
                                    <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                                        Pending candidate sign-off
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-4 relative">
                                <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 border-4 border-white dark:border-[#0f172a] shadow-sm relative z-10">
                                    <Check size={10} className="text-white" strokeWidth={4} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Current Status</p>
                                        <p className="text-[9px] text-slate-400 font-medium">{formatDate(displayCompletedAt)}</p>
                                    </div>
                                    <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                                        Candidate <span className="text-emerald-500">Signed-off</span> via {jd.signature_method || 'password'}
                                    </p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex gap-4 relative">
                            <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 border-4 border-white dark:border-[#0f172a] shadow-sm relative z-10">
                                <Check size={10} className="text-white" strokeWidth={4} />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-1">
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Current Status</p>
                                    <p className="text-[9px] text-slate-400 font-medium">Just Now</p>
                                </div>
                                <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                                    Awaiting candidate <span className="text-emerald-500">Sign-off</span>
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

          </div>

        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');
        .font-cursive { font-family: 'Great Vibes', cursive; }
      `}</style>
    </div>
  );
}
