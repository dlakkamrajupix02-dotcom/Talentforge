
import React, { useState, useEffect, useContext } from 'react';
import {
  TrendingUp,
  ChevronLeft,
  Info,
  Star,
  Save,
  Download,
  ShieldCheck,
  ChevronRight,
  MessageSquare,
  Lock,
  ArrowRight,
  Check,
  Upload,
  Image as ImageIcon,
  Zap
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { JDContext } from '../../context/JDContext';
import * as candidateService from '../../services/candidateService';
import toast from 'react-hot-toast';

const AppraisalCenter = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(JDContext);
  const [password, setPassword] = useState('');
  const [isSigned, setIsSigned] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);
  const [signatureType, setSignatureType] = useState('password');
  const [signatureImage, setSignatureImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appraisal, setAppraisal] = useState(null);
  const [hasActiveAppraisal, setHasActiveAppraisal] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [ratings, setRatings] = useState({
    'Clinical Judgment': '',
    'Patient Safety': '',
    'Communication': ''
  });

  const [comments, setComments] = useState({
    'Clinical Judgment': '',
    'Patient Safety': '',
    'Communication': '',
    'Self-Assessment': ''
  });

  const competencies = [
    {
      name: 'Clinical Judgment',
      weight: 40,
      description: 'Demonstrates critical thinking and evidence-based decision-making in patient care'
    },
    {
      name: 'Patient Safety',
      weight: 35,
      description: 'Maintains patient safety standards and follows protocols consistently'
    },
    {
      name: 'Communication',
      weight: 25,
      description: 'Communicates effectively with patients, families, and healthcare team members'
    }
  ];

  const ratingOptions = ['Needs Development', 'Meets Expectations', 'Exceeds Expectations'];

  useEffect(() => {
    const fetchAppraisalDetail = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await candidateService.getAppraisalDetail(id);
        setAppraisal(data);
        if (data.status === 'completed') {
          setHasActiveAppraisal(false);
        } else {
          // Load existing data if any
          if (data.ratings) setRatings(prev => ({ ...prev, ...data.ratings }));
          if (data.comments) setComments(prev => ({ ...prev, ...data.comments }));
        }
      } catch (error) {
        toast.error('Failed to load appraisal details.');
        setHasActiveAppraisal(false);
      } finally {
        setLoading(false);
      }
    };

    fetchAppraisalDetail();
  }, [id]);

  const handleSaveDraft = () => {
    // We could implement a draft saving API, but for now we can just show success
    // since the ratings/comments are in state. 
    // Ideally we'd have a POST /candidate-users/appraisal/:id/draft
    toast.success('Progress saved in memory!');
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (Object.values(ratings).some(r => !r)) {
      toast.error('Please rate all competencies.');
      return;
    }
    if (!isAgreed) {
      toast.error('Please agree to the terms and conditions.');
      return;
    }
    if (signatureType === 'password' && !password) {
      toast.error('Please enter your password to sign.');
      return;
    }
    if (signatureType === 'upload' && !signatureImage) {
      toast.error('Please upload your signature image.');
      return;
    }

    try {
      await candidateService.submitAppraisal(id, {
        ratings,
        comments,
        terms_accepted: isAgreed,
        password: signatureType === 'password' ? password : null,
        signature_method: signatureType,
        digital_signature_url: signatureType === 'upload' ? signatureImage : null
      });

      toast.success('Appraisal submitted successfully!');
      setTimeout(() => navigate('/enduser/inbox'), 1500);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit appraisal.');
    }
  };

  return (
    <div className="h-screen bg-[#f8fafc] flex flex-col relative overflow-hidden">
      {/* Coming Soon Overlay */}
      <div className="absolute inset-0 z-40 backdrop-blur-[3px] bg-white/10 flex items-center justify-center p-4 text-center">
        <div className="bg-white/90 backdrop-blur-xl p-8 rounded-[32px] border border-white shadow-2xl max-w-sm w-full animate-in fade-in zoom-in duration-500">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-200 rotate-3">
            <Zap className="text-white" size={28} fill="currentColor" />
          </div>
          <div className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-full mb-3">Future Release</div>
          <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Appraisal Center</h2>
          <p className="text-slate-500 font-bold text-xs mb-6 leading-relaxed px-2">
            We are building a robust performance management ecosystem. The Appraisal Center will be fully functional in the next version of TalentForge.
          </p>
          <button 
            onClick={() => navigate('/enduser/dashboard')}
            className="w-full py-3 bg-[#0f172a] text-white rounded-xl font-bold hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2 mx-auto shadow-xl shadow-slate-200 text-sm"
          >
            <ChevronLeft size={16} /> Back to Dashboard
          </button>
          <div className="mt-6 text-[9px] font-black text-slate-300 uppercase tracking-widest">Stay tuned for updates • Version 2.0</div>
        </div>
      </div>

      <div className="flex-1 p-6 lg:p-10 opacity-60 pointer-events-none">
        <div className="max-w-5xl mx-auto space-y-8">

          {!hasActiveAppraisal ? (
            <div className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in zoom-in-95 duration-500">
              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 border border-slate-100 shadow-sm rotate-3">
                <Zap className="text-slate-300" size={32} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">No Active Appraisal</h2>
              <p className="text-slate-500 max-w-sm mx-auto mb-10 leading-relaxed font-medium">
                Your manager hasn't initiated a performance review for you yet. Active appraisal cycles will appear here for your self-assessment.
              </p>
              <button
                onClick={() => navigate('/enduser/dashboard')}
                className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95"
              >
                Back to Dashboard
              </button>
            </div>
          ) : (
            <>
              {/* Header Section */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200/60">
                <div>
                  <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-500 rounded-lg font-bold hover:bg-slate-50 transition-all text-[11px] uppercase tracking-widest mb-4"
                  >
                    <ChevronLeft size={14} /> Back
                  </button>
                  <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Self-Assessment</h1>
                  <p className="text-slate-500 font-medium">Cycle: Annual Review 2026 • Period: Jan - Dec</p>
                </div>
                <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="text-right">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Completion Progress</div>
                    <div className="text-lg font-black text-slate-900">
                      {Math.round((Object.values(ratings).filter(r => r).length / competencies.length) * 100)}%
                    </div>
                  </div>
                  <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-500"
                      style={{ width: `${(Object.values(ratings).filter(r => r).length / competencies.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Assessment Cards */}
              <div className="space-y-6">
                {competencies.map((comp, idx) => (
                  <div key={idx} className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden group">
                    <div className="p-8 lg:p-10">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-lg border border-indigo-100/50">
                            {idx + 1}
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-slate-900">{comp.name}</h3>
                            <p className="text-sm text-slate-500 font-medium italic">{comp.description}</p>
                          </div>
                        </div>
                        <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 text-right">
                          <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Weightage</span>
                          <span className="text-sm font-black text-slate-900">{comp.weight}%</span>
                        </div>
                      </div>

                      <div className="space-y-8">
                        <div>
                          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Rating Selection</label>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {ratingOptions.map(option => (
                              <button
                                key={option}
                                onClick={() => setRatings({ ...ratings, [comp.name]: option })}
                                className={`px-6 py-4 rounded-2xl text-sm font-bold transition-all border-2 flex items-center justify-between group/opt ${ratings[comp.name] === option ? 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-200' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'}`}
                              >
                                {option}
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${ratings[comp.name] === option ? 'border-white bg-white/20' : 'border-slate-200'}`}>
                                  {ratings[comp.name] === option && <Check size={12} />}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Evidence & Comments</label>
                          <textarea
                            placeholder="Provide specific examples of how you've demonstrated this competency..."
                            value={comments[comp.name]}
                            onChange={(e) => setComments({ ...comments, [comp.name]: e.target.value })}
                            className="w-full p-6 bg-slate-50 border-2 border-transparent rounded-[24px] focus:bg-white focus:border-indigo-600/20 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all text-sm min-h-[120px] resize-none font-medium text-slate-900"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Self Assessment Card */}
              <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8 lg:p-10">
                <h3 className="text-xl font-black text-slate-900 mb-2">Final Self-Assessment Reflection</h3>
                <p className="text-slate-500 text-sm mb-6 font-medium">Share your overall achievements, challenges, and goals for the next period.</p>
                <textarea
                  placeholder="Reflect on your overall performance..."
                  value={comments['Self-Assessment']}
                  onChange={(e) => setComments({ ...comments, 'Self-Assessment': e.target.value })}
                  className="w-full p-6 bg-slate-50 border-2 border-transparent rounded-[28px] focus:bg-white focus:border-indigo-600/20 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all text-sm min-h-[150px] resize-none font-medium text-slate-900"
                />
              </div>

              {/* Sign and Submit Section */}
              <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/40 p-8 lg:p-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                  <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                    <ShieldCheck className="text-indigo-600" size={28} />
                    Submit Review
                  </h3>
                  <button
                    onClick={handleSaveDraft}
                    className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all text-sm"
                  >
                    <Save size={18} /> Save Draft
                  </button>
                </div>

                <div className="space-y-8">
                  <div className="flex items-start gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 transition-colors group">
                    <div className="relative mt-1">
                      <input
                        type="checkbox"
                        id="appr-acknowledge"
                        checked={isAgreed}
                        onChange={() => setIsAgreed(!isAgreed)}
                        className="peer sr-only"
                      />
                      <label
                        htmlFor="appr-acknowledge"
                        className={`w-6 h-6 border-2 rounded-md transition-all flex items-center justify-center shrink-0 cursor-pointer ${isAgreed ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white hover:border-indigo-400'}`}
                      >
                        {isAgreed && <Check size={16} className="text-white animate-in zoom-in-50 duration-200" />}
                      </label>
                    </div>
                    <div>
                      <span className="block font-bold text-slate-900">Final Acknowledgment</span>
                      <span className="text-sm text-slate-500 leading-relaxed font-medium">
                        I confirm that this self-assessment is an honest reflection of my performance and I am ready to submit it for manager review.
                      </span>
                    </div>
                  </div>

                  <div className={`transition-all duration-500 ${isAgreed ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                    <div className="flex gap-2 mb-6 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 w-fit">
                      <button
                        type="button"
                        onClick={() => setSignatureType('password')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${signatureType === 'password' ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-900'}`}
                      >
                        Electronic Sign
                      </button>
                      <button
                        type="button"
                        onClick={() => setSignatureType('upload')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${signatureType === 'upload' ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-900'}`}
                      >
                        Upload Image
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                      <div className="space-y-4">
                        {signatureType === 'password' ? (
                          <>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Enter Login Password</label>
                            <div className="relative">
                              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                <Lock size={18} />
                              </div>
                              <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={!isAgreed}
                                placeholder="Verify with your password"
                                className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-indigo-600 focus:outline-none transition-all font-medium text-slate-900"
                              />
                            </div>
                          </>
                        ) : (
                          <div
                            onClick={() => document.getElementById('appr-sig-upload').click()}
                            className="w-full h-32 bg-white border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group/upload"
                          >
                            <input id="appr-sig-upload" type="file" className="hidden" accept="image/*" onChange={(e) => {
                              if (e.target.files?.[0]) {
                                setSignatureImage(URL.createObjectURL(e.target.files[0]));
                                toast.success('Signature uploaded!');
                              }
                            }} />
                            {signatureImage ? <img src={signatureImage} alt="Sign" className="h-24 object-contain" /> : (
                              <>
                                <Upload size={24} className="text-slate-300" />
                                <span className="text-xs font-bold text-slate-400">Upload signature image</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="p-4 bg-slate-900 rounded-2xl text-white text-center flex flex-col items-center justify-center min-h-[100px] gap-1 relative overflow-hidden">
                        {signatureType === 'password' ? (
                          <div style={{ fontFamily: '"Great Vibes", cursive' }} className="text-2xl text-indigo-400 opacity-80 italic">
                            {password ? user?.full_name || 'Sahil Kumar' : 'Your Name'}
                          </div>
                        ) : (
                          signatureImage ? <img src={signatureImage} alt="Sign" className="h-12 invert opacity-80" /> : <ImageIcon size={28} className="text-slate-700" />
                        )}
                        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Digital Identity Verified</div>
                        <div className="absolute top-0 left-0 w-full h-1" />
                      </div>
                    </div>

                    <div className="pt-8 border-t border-slate-100 mt-8">
                      <button
                        onClick={handleSubmit}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all shadow-lg shadow-indigo-100 active:scale-[0.98]"
                      >
                        <ShieldCheck size={20} />
                        Confirm & Submit Appraisal
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
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

export default AppraisalCenter;
