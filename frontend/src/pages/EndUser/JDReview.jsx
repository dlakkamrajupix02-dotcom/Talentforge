
import React, { useState, useEffect, useContext } from 'react';
import toast from 'react-hot-toast';
import {
  ChevronLeft,
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
  ListChecks,
  CheckCircle,
  Target,
  Award,
  AlignLeft
} from 'lucide-react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { JDContext } from '../../context/JDContext';
import { getJDContent, updateAssignedJD, downloadSignedPdf } from '../../services/candidateService';
import { stripHighlightTags, resolveSectionsOrder, resolveSectionObject, resolveSectionMeta, unwrapSectionData, sectionTextValue, isStableSection, isSectionContentEmpty, isWeightedSectionData, normalizeForWeightedList } from '../../utils/formatJD';

const AssignedJDContent = ({ jd }) => {
  const sectionsOrder = resolveSectionsOrder(jd);

  return (
    <>
      {sectionsOrder.map((sectionKey) => {
        if (sectionKey === "sections_order") return null;

        const sectionObj = resolveSectionObject(jd, sectionKey);
        if (sectionObj === undefined || sectionObj === null) return null;
        
        const meta = resolveSectionMeta(sectionKey, sectionObj, jd?.sections_metadata);
        const isUserCreated = !!(
          jd?.sections_metadata?.[sectionKey] || jd?.sections_metadata?.labels?.[sectionKey]
        );
        if (isSectionContentEmpty(sectionObj) && !isUserCreated) return null;

        const sectionContent = unwrapSectionData(sectionObj);
        const isLocked = isStableSection(sectionObj)
          ? (sectionObj.metadata?.view ?? sectionObj.METADATA?.view) === "locked"
          : (jd?.[`${sectionKey}_view`] === "locked" || jd?.content?.[`${sectionKey}_view`] === "locked");
        const isWeightLocked = jd?.[`weight_view_${sectionKey}_view`] === "locked"
          || jd?.content?.[`weight_view_${sectionKey}_view`] === "locked";
        const weighted = isWeightedSectionData(sectionContent, sectionKey, meta);
        const isPoints = meta.type === "points" || meta.type === "weighted_list" || Array.isArray(sectionContent);

        if (isLocked) return null;

        return (
          <section key={sectionKey} className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-8 space-y-6">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-100">
                <AlignLeft size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 leading-none uppercase">{meta.label}</h3>
              </div>
            </div>

            {isPoints ? (
              <div className="space-y-3 pt-2">
                {(weighted ? normalizeForWeightedList(sectionContent) : (Array.isArray(sectionContent) ? sectionContent : [])).map((item, i) => {
                  const isObj = typeof item === "object" && item !== null;
                  const title = isObj ? (item.title || item.point || item.name || item.text || "") : item;
                  const desc = isObj ? (item.description || "") : "";
                  const weight = isObj ? item.weight : undefined;

                  return (
                    <div key={i} className="flex gap-4 items-start group">
                      <div className="w-6 h-6 rounded-lg bg-indigo-50/50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 shadow-sm text-[10px] font-bold">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-700 dark:text-slate-300 text-sm font-medium leading-relaxed">
                          {title}
                        </p>
                        {desc && (
                          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-relaxed italic">
                            {desc}
                          </p>
                        )}
                      </div>
                      {!isWeightLocked && weight !== undefined && weight > 0 && (
                        <div className="w-12 shrink-0 flex items-center justify-end">
                          <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded text-[10px] font-bold">{weight}%</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap pt-2">
                {sectionTextValue(sectionObj)}
              </p>
            )}
          </section>
        );
      })}
    </>
  );
};

const JDReview = () => {
  const { user } = useContext(JDContext);
  const { id } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const [justSigned, setJustSigned] = useState(false);
  const [signatureType, setSignatureType] = useState('password'); // 'password' or 'upload'
  const [signatureImage, setSignatureImage] = useState(null);
  const [signatureFile, setSignatureFile] = useState(null);
  const [jdData, setJdData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJD = async () => {
      try {
        setLoading(true);
        const data = await getJDContent(id);
        setJdData(data);
        const isCompleted = ['completed', 'accepted', 'signed', 'sign-off-complete'].includes(data.status?.toLowerCase());
        if (data.is_signed || isCompleted) {
          setIsSigned(true);
        }
      } catch (error) {
        toast.error('Failed to load job description.');
      } finally {
        setLoading(false);
      }
    };
    fetchJD();
  }, [id]);

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (isDownloading) return;
    
    const loadingToast = toast.loading("Generating signed PDF...");
    setIsDownloading(true);
    
    try {
      const blob = await downloadSignedPdf(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${jdData?.title || 'Signed_Job_Description'}_Signed.pdf`;
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

  const handleSign = async (e) => {
    e.preventDefault();
    if (!isAgreed) {
      toast.error('Please agree to the terms and conditions.');
      return;
    }

    if (signatureType === 'password' && !password) {
      toast.error('Please enter your password to sign.');
      return;
    }

    if (signatureType === 'upload' && !signatureFile && !signatureImage) {
      toast.error('Please upload your signature image.');
      return;
    }

    setIsSigning(true);
    try {
      const activeUser = user || (localStorage.getItem('jdforge_user') ? JSON.parse(localStorage.getItem('jdforge_user')) : null);
      const activeEmail = activeUser?.email || '';

      const updatePayload = {
        candidate_acknowledgement: "I confirm that I have reviewed the job description and agree to abide by the standards and expectations set forth.",
        candidate_comments: "",
        digital_signature: signatureType === 'password' ? 'Signed electronically via password' : 'Signed electronically via uploaded signature',
        signature_image_url: signatureType === 'upload' ? signatureImage : '',
        status: 'sign-off-complete',
        decision: 'completed'
      };

      await updateAssignedJD(id, updatePayload);

      setJustSigned(true);
      setIsSigned(true);
      toast.success('Document signed successfully!');
      setTimeout(() => navigate('/enduser/performance'), 2000);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to sign document.');
    } finally {
      setIsSigning(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSignatureFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSignatureImage(reader.result);
        toast.success('Signature image ready!');
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Loading document...</p>
      </div>
    );
  }

  if (!jdData) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="text-rose-500 mb-4" size={48} />
        <h1 className="text-2xl font-black text-slate-900 mb-2">Document Not Found</h1>
        <p className="text-slate-500 mb-8">This job description might have been removed or you don't have access.</p>
        <button onClick={() => navigate(-1)} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold">Go Back</button>
      </div>
    );
  }

  const extractText = (val) => {
    if (Array.isArray(val)) {
      return val.map(item => {
        const raw = typeof item === 'object' ? (item.title || item.point || item.text || item.duty || '') : item;
        return stripHighlightTags(String(raw || ''));
      });
    }
    return stripHighlightTags(String(val || ''));
  };

  const sections = {
    summary: stripHighlightTags(jdData.content.summary || jdData.content.job_summary || ''),
    roleNarrative: extractText(jdData.content.role_narrative || jdData.content.roleNarrative || ''),
    duties: extractText(jdData.content.key_duties || jdData.content.essential_duties_and_responsibilities || []),
    coreCompetencies: extractText(jdData.content.core_competencies || []),
    functionalCompetencies: extractText(jdData.content.functional_competencies || []),
    mandatory: extractText(jdData.content.qualifications_required || jdData.content.mandatory_requirements || []),
    preferred: extractText(jdData.content.qualifications_preferred || jdData.content.preferred_assets || [])
  };

  if (justSigned) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="text-emerald-600" size={48} />
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-2">Successfully Signed!</h1>
        <p className="text-slate-500 max-w-md mx-auto mb-8">
          Your Job Description for {jdData.title} has been electronically signed and archived in your performance area.
        </p>
        <button
          onClick={() => navigate('/enduser/performance')}
          className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center gap-2"
        >
          View My Documents <ArrowRight size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col">
      <div className="flex-1 overflow-auto p-4 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Back button and Export */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all text-xs shadow-sm border border-slate-200"
            >
              <ChevronLeft size={16} /> Back to Dashboard
            </button>

            {isSigned && (
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-xl font-bold border border-indigo-100 shadow-sm hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs"
              >
                {isDownloading ? (
                  <div className="w-3.5 h-3.5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                Export PDF
              </button>
            )}
          </div>

          {/* 1. Main Header Card */}
          <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm p-8 lg:p-12">
            <div className="mb-10">
              <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-4 inline-block ${isSigned ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                {isSigned ? '● Completed' : '● Action Required'}
              </span>
              <h1 className="text-4xl lg:text-5xl font-black text-[#0f172a] tracking-tight">{jdData.title}</h1>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-y-8 gap-x-4">
              {[
                { label: 'Job ID', value: jdData.job_id || 'AIR_CC' },
                { label: 'Department', value: jdData.department || 'In-Flight Services' },
                { label: 'Job Family', value: jdData.job_family || 'Customer Service' },
                { label: 'Industry', value: jdData.industry || 'Aviation' },
                { label: 'Location', value: jdData.location || 'Hyderabad, India' },
                { label: 'Job Level', value: jdData.job_level || 'L2' },
                { label: 'Seniority', value: jdData.seniority || 'Mid-Level' },
                { label: 'Employment', value: jdData.employment_type || jdData.employmentType || 'Full-Time' },
                { label: 'Salary Range', value: jdData.salary_range || '₹5L/yr - ₹9L/yr' }
              ].map((item, i) => (
                <div key={i}>
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{item.label}</div>
                  <div className="text-xs font-black text-slate-900 leading-tight">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <AssignedJDContent jd={jdData} />

          {/* Acknowledge & Sign Section */}
          {!isSigned && (
            <div className="bg-white rounded-[40px] border border-slate-200 shadow-xl shadow-indigo-100/10 p-8 lg:p-12">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 leading-none">Acknowledge & Sign</h3>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Final verification of document review</p>
                </div>
              </div>

              <form onSubmit={handleSign} className="space-y-8">
                {/* T&C Checkbox */}
                <div className="flex items-start gap-4 p-6 bg-slate-50 rounded-[32px] border border-slate-100 transition-all hover:bg-white hover:border-indigo-200 group">
                  <div className="relative mt-1">
                    <input
                      type="checkbox"
                      id="jd-acknowledge"
                      checked={isAgreed}
                      onChange={() => setIsAgreed(!isAgreed)}
                      className="peer sr-only"
                    />
                    <label
                      htmlFor="jd-acknowledge"
                      className={`w-6 h-6 border-2 rounded-lg transition-all flex items-center justify-center cursor-pointer ${isAgreed ? 'bg-slate-900 border-slate-900' : 'border-slate-300 bg-white hover:border-slate-400'}`}
                    >
                      {isAgreed && <Check size={16} className="text-white animate-in zoom-in-50 duration-200" />}
                    </label>
                  </div>
                  <div>
                    <span className="block font-black text-slate-900 text-sm">Accept Terms & Conditions</span>
                    <span className="text-xs text-slate-500 leading-relaxed font-medium mt-1 inline-block">
                      I confirm that{" "}
                      <Link
                        to="/terms"
                        className="text-indigo-600 hover:text-indigo-800 underline underline-offset-2 font-bold transition-colors"
                      >
                        I have reviewed the job description and agree to abide by the standards and expectations set forth
                      </Link>
                      .
                    </span>
                  </div>
                </div>

                {/* Digital Signature Options */}
                <div className={`transition-all duration-500 space-y-8 ${isAgreed ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                  <div className="flex gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 w-fit">
                    <button
                      type="button"
                      onClick={() => setSignatureType('password')}
                      className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${signatureType === 'password' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Password Sign
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignatureType('upload')}
                      className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${signatureType === 'upload' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Upload Sign
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    <div className="space-y-4">
                      {signatureType === 'password' ? (
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                            <Lock size={18} />
                          </div>
                          <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={!isAgreed}
                            placeholder="Confirm your password"
                            className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-600 focus:outline-none transition-all font-bold text-slate-900 text-sm placeholder:text-slate-300"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => document.getElementById('sig-upload').click()}
                          className="w-full h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-indigo-400 hover:bg-white transition-all group/upload"
                        >
                          <input id="sig-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                          {signatureImage ? (
                            <img src={signatureImage} alt="Signature" className="h-24 object-contain" />
                          ) : (
                            <>
                              <Upload size={24} className="text-slate-300 group-hover/upload:text-indigo-400" />
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Click to upload image</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <div className={`p-8 rounded-3xl text-center flex flex-col items-center justify-center min-h-[120px] gap-2 relative overflow-hidden transition-all duration-300 ${
                      signatureType === 'password' 
                        ? 'bg-[#0f172a] text-white' 
                        : 'bg-slate-50 text-slate-900 border border-slate-200'
                    }`}>
                      {signatureType === 'password' ? (
                        <div style={{ fontFamily: '"Great Vibes", cursive' }} className="text-3xl text-indigo-400 opacity-90 italic">
                          {password ? user?.full_name || 'Sahil Kumar' : 'Digital Sign'}
                        </div>
                      ) : (
                        signatureImage ? (
                          <img src={signatureImage} alt="Sign" className="h-16 object-contain opacity-90" />
                        ) : (
                          <ImageIcon size={32} className="text-slate-400" />
                        )
                      )}
                      <div className={`text-[8px] font-black uppercase tracking-[0.3em] ${
                        signatureType === 'password' ? 'text-slate-600' : 'text-slate-400'
                      }`}>
                        Verified Identity
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSigning}
                    className={`w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[20px] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-100 active:scale-[0.98] ${isSigning ? 'opacity-80 cursor-not-allowed' : ''}`}
                  >
                    {isSigning ? (
                      <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Finalize & Sign JD
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Google Font for cursive signature */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');
      `}</style>
    </div>
  );
};

export default JDReview;
