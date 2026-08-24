import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, Shield, Globe, Database, Zap, ShieldCheck, Loader2, ChevronLeft, AlertCircle, Ban
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { loginSchema } from '../schemas/authSchema';
import { JDContext } from '../../context/JDContext';
import toast from 'react-hot-toast';
import * as authService from '../../services/authService';
import { BASE_URL, setAccessToken } from '../../services/apiClient';
import Hero3DBlob from '../../components/common/Hero3DBlob';
import { getDashboardPathForRole } from '../../utils/roles';

/* ─── Testimonials Data (Executive & Enterprise Focused) ─────────────────── */
const TESTIMONIALS = [
  {
    quote: "Saved our Operations team months of manual job description refactoring.",
    author: "Maria Santos",
    role: "Ops Director"
  },
  {
    quote: "The competency mapping accuracy is unparalleled. Absolutely stellar.",
    author: "David Chen",
    role: "VP of Talent Acquisition"
  },
  {
    quote: "Integrates flawlessly with our enterprise Workday & Phenom stacks.",
    author: "Sarah Jenkins",
    role: "Lead HR Architect"
  }
];

/* ─── Dynamic Background Grid (matching Home.jsx) ────────────────────────── */
const DynamicGridBackground = () => {
  const cols = 5;
  const rows = 4;
  const totalCells = cols * rows;

  const getAdjacentInactiveCells = (activeSet) => {
    const adjacents = new Set();
    activeSet.forEach((idx) => {
      const r = Math.floor(idx / cols);
      const c = idx % cols;
      if (r > 0 && !activeSet.has(idx - cols)) adjacents.add(idx - cols);
      if (r < rows - 1 && !activeSet.has(idx + cols)) adjacents.add(idx + cols);
      if (c > 0 && !activeSet.has(idx - 1)) adjacents.add(idx - 1);
      if (c < cols - 1 && !activeSet.has(idx + 1)) adjacents.add(idx + 1);
    });
    return Array.from(adjacents);
  };

  const getInitialCluster = (count) => {
    const active = new Set();
    const start = Math.floor(totalCells / 3) + Math.floor(Math.random() * (totalCells / 3));
    active.add(start);

    for (let step = 1; step < count; step++) {
      const adjacents = [];
      active.forEach((idx) => {
        const r = Math.floor(idx / cols);
        const c = idx % cols;
        if (r > 0 && !active.has(idx - cols)) adjacents.push(idx - cols);
        if (r < rows - 1 && !active.has(idx + cols)) adjacents.push(idx + cols);
        if (c > 0 && !active.has(idx - 1)) adjacents.push(idx - 1);
        if (c < cols - 1 && !active.has(idx + 1)) adjacents.push(idx + 1);
      });

      if (adjacents.length > 0) {
        const chosen = adjacents[Math.floor(Math.random() * adjacents.length)];
        active.add(chosen);
      } else {
        active.add(Math.floor(Math.random() * totalCells));
      }
    }
    return Array.from(active);
  };

  const [activeIndices, setActiveIndices] = useState(() => getInitialCluster(4));

  useEffect(() => {
    let timeoutId;
    const tick = () => {
      setActiveIndices((prev) => {
        if (prev.length === 0) return getInitialCluster(4);
        const toRemoveIdx = Math.floor(Math.random() * prev.length);
        const textActive = prev.filter((_, i) => i !== toRemoveIdx);
        const activeSet = new Set(textActive);
        const adjacentInactive = getAdjacentInactiveCells(activeSet);

        if (adjacentInactive.length > 0) {
          const toAdd = adjacentInactive[Math.floor(Math.random() * adjacentInactive.length)];
          textActive.push(toAdd);
        } else {
          const allInactive = [];
          for (let i = 0; i < totalCells; i++) {
            if (!activeSet.has(i)) allInactive.push(i);
          }
          if (allInactive.length > 0) {
            textActive.push(allInactive[Math.floor(Math.random() * allInactive.length)]);
          }
        }
        return textActive;
      });

      const nextDelay = 250 + Math.random() * 550;
      timeoutId = setTimeout(tick, nextDelay);
    };

    timeoutId = setTimeout(tick, 300);
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div className="fixed inset-0 z-[-20] grid grid-cols-5 grid-rows-4 gap-6 p-8 pointer-events-none overflow-hidden w-full h-full">
      {Array.from({ length: totalCells }).map((_, idx) => {
        const isActive = activeIndices.includes(idx);
        return (
          <div key={idx} className="w-full h-full flex items-center justify-center">
            <div
              className={`w-full aspect-square max-w-[130px] rounded-2xl bg-white/[0.05] transition-all duration-[120ms] ease-out transform shadow-[0_0_20px_rgba(255,255,255,0.01)] ${isActive ? 'opacity-100 scale-100' : 'opacity-[0.15] scale-[0.96]'
                }`}
            />
          </div>
        );
      })}
    </div>
  );
};

const SUPPORT_EMAIL = 'talentforge.phenomecloud.support@gmail.com';
const EMAIL_REGEX = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

const renderMessageWithHighlightedEmail = (message, isOrgAccess) => {
  const parts = message.split(EMAIL_REGEX);
  return parts.map((part, index) => {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(part)) {
      return (
        <a
          key={`${part}-${index}`}
          href={`mailto:${part}`}
          className={`font-bold underline underline-offset-2 break-all ${
            isOrgAccess
              ? 'text-amber-100 decoration-amber-300/70 hover:text-white'
              : 'text-red-100 decoration-red-300/70 hover:text-white'
          }`}
        >
          {part}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

const AuthErrorAlert = ({ message, variant = 'error' }) => {
  if (!message) return null;

  const isOrgAccess = variant === 'org_access';
  const Icon = isOrgAccess ? Ban : AlertCircle;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border px-4 py-3.5 ${
        isOrgAccess
          ? 'bg-amber-500/10 border-amber-400/25'
          : 'bg-red-500/10 border-red-400/25'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
          isOrgAccess ? 'bg-amber-500/15 text-amber-300' : 'bg-red-500/15 text-red-300'
        }`}>
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <p className={`text-xs font-bold tracking-wide ${
            isOrgAccess ? 'text-amber-200' : 'text-red-200'
          }`}>
            {isOrgAccess ? 'Organization Access Suspended' : 'Unable to Sign In'}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
            {renderMessageWithHighlightedEmail(message, isOrgAccess)}
          </p>
          {isOrgAccess && (
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="mt-2 inline-flex text-[11px] font-semibold text-amber-300 hover:text-amber-200 underline underline-offset-2"
            >
              Contact support
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const Signin = () => {
  const { login } = useContext(JDContext);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [errorVariant, setErrorVariant] = useState('error');
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [testimonialIdx, setTestimonialIdx] = useState(0);

  // MFA States
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState('');
  const [mfaTokenData, setMfaTokenData] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const inputRefs = useRef([]);

  // Cornerstone Login States
  const [showCornerstoneModal, setShowCornerstoneModal] = useState(false);
  const [csodUserId, setCsodUserId] = useState('');
  const [csodLoading, setCsodLoading] = useState(false);

  const handleCornerstoneLogin = async (e) => {
    e.preventDefault();
    if (!csodUserId.trim()) {
      toast.error("Please enter a valid Cornerstone User ID.");
      return;
    }
    setCsodLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/auth/cornerstone-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ user_id: csodUserId }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Authentication failed");
      }
      const data = await response.json();
      completeLogin(data.access_token, data);
      toast.success("Logged in successfully via Cornerstone!");
      setShowCornerstoneModal(false);
    } catch (err) {
      toast.error(err.message || "Cornerstone Login failed");
    } finally {
      setCsodLoading(false);
    }
  };

  // Testimonial rotation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setTestimonialIdx((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const completeLogin = (token, user) => {
    if (token) {
      setAccessToken(token);
    }
    sessionStorage.setItem("jdforge_session", "1");
    login(token, user);
    navigate(getDashboardPathForRole(user?.role));
  };

  // Auto-verify OTP
  useEffect(() => {
    if (step === 2 && otp.trim().length === 6 && !isLoading && !errors.general) {
      const doVerify = async () => {
        setIsLoading(true);
        try {
          const verifyRes = await authService.verifyMFACode(formData.email, otp.trim());
          if (verifyRes && verifyRes.verified === false) {
            throw new Error("Invalid OTP code.");
          }
          if (mfaTokenData) {
            completeLogin(mfaTokenData.access_token, mfaTokenData.user);
          }
        } catch (err) {
          const apiMsg = err.response?.data?.message || err.message;
          setErrorVariant('error');
          setErrors({ general: `Invalid OTP: ${apiMsg}` });
          setIsShaking(true);
          setTimeout(() => setIsShaking(false), 500);
        } finally {
          setIsLoading(false);
        }
      };
      doVerify();
    }
  }, [otp, step, isLoading, errors, formData.email, mfaTokenData]);

  const handleOtpChange = (index, e) => {
    const value = e.target.value;
    if (value && !/^\d+$/.test(value)) return;
    setErrors({});

    let newOtp = otp.padEnd(6, ' ').split('');
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp.join('').trimEnd());

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    setErrors({});
    if (e.key === 'Backspace') {
      e.preventDefault();
      let newOtp = otp.padEnd(6, ' ').split('');
      if (newOtp[index] && newOtp[index] !== ' ') {
        newOtp[index] = ' ';
        setOtp(newOtp.join('').trimEnd());
      } else if (index > 0) {
        newOtp[index - 1] = ' ';
        setOtp(newOtp.join('').trimEnd());
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      setErrors({});
      setOtp(pasted);
      if (pasted.length === 6) {
        inputRefs.current[5]?.focus();
      } else {
        inputRefs.current[pasted.length]?.focus();
      }
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    setErrors({});
    setIsLoading(true);
    try {
      await authService.initiateMFA(formData.email);
      setCountdown(60);
      toast.success('A new OTP has been sent to your email.');
    } catch (err) {
      setErrors({ general: err.message || "Failed to resend OTP." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otp.trim().length === 6) {
      return;
    }
    setErrors({ general: 'Please enter a 6-digit OTP.' });
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleInput = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name] || errors.general) {
      setErrors({ ...errors, [e.target.name]: '', general: '' });
      setErrorVariant('error');
    }
  };

  const classifyLoginError = (err) => {
    const message = err?.message || 'Login failed';
    const isOrgAccess =
      err?.status === 403 &&
      (message.toLowerCase().includes('organization') ||
        message.toLowerCase().includes('suspended') ||
        message.toLowerCase().includes('access'));
    return { message, variant: isOrgAccess ? 'org_access' : 'error' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});
    try {
      await loginSchema.validate(formData, { abortEarly: false });
      const data = await authService.login(formData);
      
      if (data && data.requiresMfa) {
        // Handle MFA flow
        await authService.initiateMFA(formData.email);
        setMfaTokenData({ access_token: data.access_token, user: data.user });
        setStep(2);
        setCountdown(60);
        toast.success('MFA verification required. An OTP has been sent to your email.');
        return;
      }
      
      if (data && (data.access_token || data.error)) {
        completeLogin(data.access_token, data.user);
      }
    } catch (err) {
      if (err.inner) {
        const e2 = {};
        err.inner.forEach(e => { e2[e.path] = e.message; });
        setErrors(e2);
        setErrorVariant('error');
      } else {
        const { message, variant } = classifyLoginError(err);
        if (variant !== 'org_access') {
          toast.error(message);
        }
        setErrorVariant(variant);
        setErrors({ general: message });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative overflow-x-hidden overflow-y-auto bg-transparent flex items-center justify-center py-12 md:py-16">

      {/* ─── Webkit Autofill Style Override (Fixes Browser White Block) ─── */}
      <style dangerouslySetInnerHTML={{
        __html: `
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 100px transparent inset !important;
          box-shadow: 0 0 0 100px transparent inset !important;
          -webkit-text-fill-color: #ffffff !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}} />

      {/* ─── LAYER 1: Purple Radial Spotlight Gradient (Matching Home.jsx) ─── */}
      <div
        className="fixed inset-0 z-[-30] pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 50% 45%,
              rgba(255,255,255,0.95) 0%,
              rgba(233,228,255,0.85) 18%,
              rgba(177,168,255,0.65) 45%,
              rgba(104,94,223,0.95) 75%,
              #4B49B3 100%
            ),
            linear-gradient(
              90deg,
              rgba(255,255,255,0) 0%,
              rgba(255,255,255,0.16) 50%,
              rgba(255,255,255,0) 100%
            ),
            #4B49B3
          `,
        }}
      />

      {/* ─── LAYER 2: Dynamic Grid Background (Matching Home.jsx) ──────────── */}
      <DynamicGridBackground />

      {/* ─── LAYER 3: Centered 3D Morphing Orb (Behind Card) ──────────────── */}
      <div className="fixed inset-0 z-[-10] pointer-events-none flex items-center justify-center">
        <Hero3DBlob className="w-full h-full scale-[1.05] opacity-95 animate-pulse" />
      </div>

      {/* ─── LAYER 4: Film Grain Sheen ─────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-[-5] pointer-events-none opacity-[0.32] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`
        }}
      />

      {/* ═══ THE CENTERED DUAL-PANEL GLASS DASHBOARD ═══════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 85, damping: 18 }}
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.12)', // High-transparency Apple-style glass
          backdropFilter: 'blur(28px) saturate(200%)',
          WebkitBackdropFilter: 'blur(28px) saturate(200%)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          boxShadow: '0 30px 70px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.15)'
        }}
        className="relative z-30 w-full max-w-[790px] rounded-[32px] overflow-hidden flex flex-col md:flex-row items-stretch justify-between shadow-2xl mx-4 group hover:shadow-indigo-500/5 transition-all duration-300"
      >

        {/* ─── LEFT COLUMN: The Product Intelligence Showcase ────────────── */}
        <div className="flex-1 flex flex-col justify-between p-8 md:p-10 md:pr-8 min-h-[360px] md:min-h-0">
          <div>
            {/* Top Logo */}
            <div className="bg-white/90 backdrop-blur-md py-2 px-5 rounded-2xl border border-slate-200/60 shadow-sm w-fit mb-8">
              <img src="/TalentForge-logos.png" alt="TalentForge" className="w-[115px] h-auto object-contain" />
            </div>

            {/* Showcase Header */}
            <span className="text-[9px] font-bold tracking-[0.25em] text-indigo-600 uppercase block mb-1">
              Intelligence Scale
            </span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight mb-2">
              Next-Gen Job<br />Description Engine
            </h2>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed max-w-[280px] mb-6">
              Empower your talent operations with dynamic skill intelligence and secure automation.
            </p>
          </div>

          {/* Stats Showcase */}
          <div className="space-y-3 pr-2">
            {/* Stat 1: JDs */}
            <div className="flex items-center gap-3 bg-white/10 border border-white/20 backdrop-blur-md p-2.5 rounded-2xl shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/10 flex items-center justify-center text-indigo-600">
                <Database size={18} />
              </div>
              <div>
                <div className="text-[13px] font-black text-slate-900 leading-none">300,000+</div>
                <div className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">JD Templates Available</div>
              </div>
            </div>

            {/* Stat 2: Speed */}
            <div className="flex items-center gap-3 bg-white/10 border border-white/20 backdrop-blur-md p-2.5 rounded-2xl shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                <Zap size={18} className="animate-pulse" />
              </div>
              <div>
                <div className="text-[13px] font-black text-slate-900 leading-none">6x Faster Sync</div>
                <div className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Pipeline Creation Speed</div>
              </div>
            </div>

            {/* Stat 3: Integrity */}
            <div className="flex items-center gap-3 bg-white/10 border border-white/20 backdrop-blur-md p-2.5 rounded-2xl shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <ShieldCheck size={18} />
              </div>
              <div>
                <div className="text-[13px] font-black text-slate-900 leading-none">99.8% Accuracy</div>
                <div className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Data Validation Integrity</div>
              </div>
            </div>
          </div>

          {/* Testimonial Carousel at bottom (Height increased to 62px to prevent name/title clipping) */}
          <div className="relative h-[62px] overflow-hidden mt-6 border-t border-slate-200/40 pt-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={testimonialIdx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-x-0 top-3"
              >
                <p className="text-[9.5px] text-slate-600 italic font-medium leading-normal truncate-2-lines">
                  "{TESTIMONIALS[testimonialIdx].quote}"
                </p>
                <p className="text-[8.5px] text-slate-800 font-extrabold mt-1">
                  — {TESTIMONIALS[testimonialIdx].author}, {TESTIMONIALS[testimonialIdx].role}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ─── RIGHT COLUMN: The Secure Entry Gateway ─────────────────────── */}
        <div className="flex-1 flex flex-col justify-between bg-[#0B0B0C] p-8 md:p-10 transition-all duration-300">
          <div>
            {/* Pulse Indicator */}
            <div className="flex items-center justify-between w-full mb-8">
              <span className="text-[9px] font-bold tracking-[0.25em] text-slate-500 uppercase transition-colors duration-300">
                Secure Portal
              </span>
            </div>

            {/* Gateway Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-black text-white tracking-tight leading-none mb-2 transition-colors duration-300">
                {step === 1 ? 'Sign In' : 'Two-Factor Auth'}
              </h1>
              <p className="text-xs text-slate-400 font-semibold tracking-wide transition-colors duration-300">
                {step === 1 ? 'Please enter your credentials to access your secure talent workspace.' : 'Enter the code sent to your email to verify your identity.'}
              </p>
            </div>

            {/* Form with Swiss Bottom-Border Inputs */}
            {step === 1 ? (
              <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                {/* Email */}
                <div className="relative border-b border-slate-700 focus-within:border-indigo-500 transition-colors py-1">
                  <label className="block text-[9px] font-black text-slate-500 tracking-[0.15em] uppercase mb-0.5">
                    Work Email Address
                  </label>
                  <div className="flex items-center gap-3">
                    <Mail size={16} className="text-slate-500 flex-shrink-0" />
                    <input
                      name="email" type="email"
                      value={formData.email} onChange={handleInput}
                      placeholder="sarah.mitchell@company.com"
                      className="w-full bg-transparent py-2 text-xs md:text-sm text-white placeholder-slate-600 outline-none border-none px-0"
                    />
                  </div>
                  {errors.email && <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.email}</p>}
                </div>

                {/* Password */}
                <div className="relative border-b border-slate-700 focus-within:border-indigo-500 transition-colors py-1">
                  <div className="flex justify-between items-center mb-0.5">
                    <label className="text-[9px] font-black text-slate-500 tracking-[0.15em] uppercase">
                      Security Password
                    </label>
                    <Link to={`/forgot-password${formData.email ? `?email=${encodeURIComponent(formData.email)}` : ''}`} className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
                      Forgot?
                    </Link>
                  </div>
                  <div className="flex items-center gap-3">
                    <Lock size={16} className="text-slate-500 flex-shrink-0" />
                    <input
                      name="password" type={showPass ? 'text' : 'password'}
                      value={formData.password} onChange={handleInput}
                      placeholder="••••••••••••"
                      className="w-full bg-transparent py-2 text-xs md:text-sm text-white placeholder-slate-600 outline-none border-none px-0"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(p => !p)}
                      className="text-slate-500 hover:text-slate-300 transition-colors flex items-center justify-center"
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.password}</p>}
                </div>

                {/* General error */}
                <AuthErrorAlert message={errors.general} variant={errorVariant} />

                {/* Solid Indigo Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-white text-slate-950 font-bold text-xs rounded-full hover:bg-slate-200 hover:shadow-lg hover:shadow-white/10 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 shadow-md group disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Signing In...
                    </>
                  ) : (
                    <>
                      Sign In to TalentForge <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 py-0.5 mt-2">
                  <div className="flex-1 h-[1px] bg-slate-700/50" />
                  <span className="text-[8px] font-black text-slate-500 tracking-widest uppercase">OR CONNECT WITH</span>
                  <div className="flex-1 h-[1px] bg-slate-700/50" />
                </div>

                {/* SSO */}
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => window.location.href = `${BASE_URL}/auth/oauth/microsoft/login`}
                      className="w-full py-2.5 border border-slate-700 bg-white/5 hover:bg-white/10 text-white font-bold text-xs rounded-full transition-all duration-200 flex items-center justify-center gap-2 shadow-sm"
                    >
                      <svg width="14" height="14" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                        <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                        <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                        <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                        <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                      </svg>
                      Microsoft
                    </button>
                    <button
                      type="button"
                      onClick={() => window.location.href = `${BASE_URL}/auth/oauth/google/login`}
                      className="w-full py-2.5 border border-slate-700 bg-white/5 hover:bg-white/10 text-white font-bold text-xs rounded-full transition-all duration-200 flex items-center justify-center gap-2 shadow-sm"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                      </svg>
                      Google
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setShowCornerstoneModal(true)}
                      className="w-full py-2.5 border border-slate-700 bg-white/5 hover:bg-white/10 text-white font-bold text-xs rounded-full transition-all duration-200 flex items-center justify-center gap-2 shadow-sm"
                    >
                      <img 
                        src="https://yt3.googleusercontent.com/E6bE11NVBRSTPCGVmlBGsJPfvrxTZVjIuHqGi6Ena5m4cdHm2BRjKSWO6EM4zcgxut9goRfGGg=s160-c-k-c0x00ffffff-no-rj" 
                        alt="Cornerstone Logo" 
                        className="w-3.5 h-3.5 object-contain rounded-full"
                      />
                      Cornerstone
                    </button>
                    <button
                      type="button"
                      onClick={() => window.location.href = `${BASE_URL}/auth/oauth/linkedin/login`}
                      className="w-full py-2.5 border border-slate-700 bg-white/5 hover:bg-white/10 text-white font-bold text-xs rounded-full transition-all duration-200 flex items-center justify-center gap-2 shadow-sm"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                      LinkedIn
                    </button>
                  </div>
                  <button
                    type="button"
                    className="w-full py-2.5 border border-slate-700 bg-white/5 hover:bg-white/10 text-white font-bold text-xs rounded-full transition-all duration-200 flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Shield size={14} /> Continue with SSO / SAML
                  </button>
                </div>
              </form>
            ) : step === 2 ? (
              <form onSubmit={handleVerifyOTP} className="space-y-5 relative z-10">
                <div className="bg-indigo-950/25 border border-indigo-800/30 rounded-xl p-3 mb-2 transition-all duration-300">
                  <p className="text-xs text-slate-300 leading-relaxed font-medium transition-colors duration-300">
                    An OTP has been sent to <strong className="text-indigo-400">{formData.email}</strong>. Please enter it below.
                  </p>
                </div>

                <div className="relative pt-1 pb-3">
                  <label className="block text-[9px] font-black text-slate-500 tracking-[0.15em] uppercase mb-2 transition-colors duration-300">
                    One-Time Password (OTP)
                  </label>
                  <motion.div
                    className="flex items-center gap-2"
                    onPaste={handleOtpPaste}
                    animate={isShaking ? { x: [-8, 8, -8, 8, 0] } : {}}
                    transition={{ duration: 0.4 }}
                  >
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <input
                        key={index}
                        ref={(el) => (inputRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={otp.padEnd(6, ' ')[index] !== ' ' ? otp.padEnd(6, ' ')[index] : ''}
                        onChange={(e) => handleOtpChange(index, e)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className={`w-10 h-12 md:w-12 md:h-14 bg-white/5 border ${errors.general && errors.general.includes('OTP') ? 'border-red-500/80 focus:border-red-400 text-red-400 shadow-[0_0_10px_rgba(248,113,113,0.15)]' : 'border-slate-700 focus:border-indigo-500 text-white'} rounded-xl text-center text-lg md:text-xl font-black shadow-sm outline-none transition-all focus:bg-white/10 focus:shadow-indigo-500/10 focus:-translate-y-0.5`}
                      />
                    ))}
                  </motion.div>
                </div>

                <div className="flex items-center justify-end mt-1 mb-2 text-[9px] font-black uppercase tracking-wider">
                  {countdown > 0 ? (
                    <span className="text-slate-400">
                      Resend OTP in <span className="text-indigo-400 ml-1">{formatTime(countdown)}</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={isLoading}
                      className="text-indigo-400 hover:text-indigo-300 hover:underline transition-all"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>

                <AuthErrorAlert message={errors.general} variant="error" />
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={isLoading}
                  className="w-full py-3.5 font-bold text-xs rounded-full transition-all duration-200 flex items-center justify-center gap-2 shadow-sm bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800/80"
                >
                  <ChevronLeft size={14} /> Back to Sign In
                </button>
              </form>
            ) : null}
          </div>

          {/* Footer Links */}
          <div className="flex items-center justify-between border-t border-slate-800/80 pt-4 mt-8 relative z-10 text-xs font-bold text-slate-500 transition-colors duration-300">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 transition-colors text-slate-400 hover:text-indigo-400"
            >
              <ArrowRight size={12} className="rotate-180" />
              Back to portal
            </Link>
          </div>
        </div>

      </motion.div>

      {/* Cornerstone User ID Modal */}
      <AnimatePresence>
        {showCornerstoneModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl space-y-6"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-slate-800 shadow-inner">
                  <img 
                    src="https://yt3.googleusercontent.com/E6bE11NVBRSTPCGVmlBGsJPfvrxTZVjIuHqGi6Ena5m4cdHm2BRjKSWO6EM4zcgxut9goRfGGg=s160-c-k-c0x00ffffff-no-rj" 
                    alt="Cornerstone Logo" 
                    className="w-10 h-10 object-contain rounded-full"
                  />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">Cornerstone Account Sign In</h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    Please provide your Cornerstone User ID or Email to authenticate via Cornerstone API validation.
                  </p>
                </div>
              </div>

              <form onSubmit={handleCornerstoneLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                    Cornerstone User ID / Email
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-slate-500">
                      <Mail size={16} />
                    </span>
                    <input
                      type="text"
                      required
                      value={csodUserId}
                      onChange={(e) => setCsodUserId(e.target.value)}
                      placeholder="e.g. user@csod.com"
                      className="w-full pl-11 pr-4 py-3 bg-white/5 border border-slate-800 rounded-2xl text-sm font-medium text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCornerstoneModal(false)}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs rounded-full border border-slate-800 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={csodLoading}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-bold text-xs rounded-full shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    {csodLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        Authenticate
                        <ArrowRight size={12} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Signin;