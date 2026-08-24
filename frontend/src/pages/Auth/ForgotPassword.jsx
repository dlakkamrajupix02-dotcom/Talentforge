import React, { useState, useEffect, useRef } from 'react';
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, Shield, Database, Zap, ShieldCheck, Loader2, CheckCircle2, ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import * as authService from '../../services/authService';
import Hero3DBlob from '../../components/common/Hero3DBlob';

const forgotPasswordSchema = yup.object().shape({
  email: yup.string().email("Invalid email format").required("Email is required"),
  new_password: yup.string()
    .min(8, "Password must be at least 8 characters")
    .required("New password is required"),
  confirm_password: yup.string()
    .oneOf([yup.ref('new_password'), null], "Passwords must match")
    .required("Confirm password is required"),
});

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

const ForgotPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialEmail = searchParams.get('email') || '';

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [resendAttempts, setResendAttempts] = useState(0);

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

  const getPasswordStrength = (pass) => {
    if (!pass) return { label: '', color: 'bg-transparent', percent: 0, text: '' };
    if (pass.length < 8) return { label: 'Weak', color: 'bg-red-400', percent: 33, text: 'text-red-500' };

    const hasLetters = /[a-zA-Z]/.test(pass);
    const hasNumbers = /[0-9]/.test(pass);
    const hasSpecial = /[^a-zA-Z0-9]/.test(pass);

    if (hasLetters && hasNumbers && hasSpecial) return { label: 'Strong', color: 'bg-emerald-400', percent: 100, text: 'text-emerald-500' };
    if (hasLetters && hasNumbers) return { label: 'Medium', color: 'bg-amber-400', percent: 66, text: 'text-amber-500' };

    return { label: 'Weak', color: 'bg-red-400', percent: 33, text: 'text-red-500' };
  };

  const passStrength = getPasswordStrength(newPassword);
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  const canSubmitReset = passStrength.label !== 'Weak' && passwordsMatch && otp.trim().length === 6;

  // Auto-verify OTP
  useEffect(() => {
    if (step === 2 && otp.trim().length === 6 && !isLoading && !error) {
      const doVerify = async () => {
        setIsLoading(true);
        try {
          const verifyRes = await authService.verifyOTP(email, otp.trim());
          if (verifyRes && verifyRes.verified === false) {
            throw new Error("Invalid OTP code.");
          }
          setStep(3);
        } catch (err) {
          const apiMsg = err.response?.data?.message || err.message;
          setError(`Invalid OTP: ${apiMsg}`);
          setIsShaking(true);
          setTimeout(() => setIsShaking(false), 500);
        } finally {
          setIsLoading(false);
        }
      };
      doVerify();
    }
  }, [otp, step, isLoading, error, email]);

  const inputRefs = useRef([]);

  const handleOtpChange = (index, e) => {
    const value = e.target.value;
    if (value && !/^\d+$/.test(value)) return;
    setError('');

    let newOtp = otp.padEnd(6, ' ').split('');
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp.join('').trimEnd());

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    setError('');
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
      setError('');
      setOtp(pasted);
      if (pasted.length === 6) {
        inputRefs.current[5]?.focus();
      } else {
        inputRefs.current[pasted.length]?.focus();
      }
    }
  };

  // Testimonial rotation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setTestimonialIdx((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const handleInitiate = async (e) => {
    e.preventDefault();
    setError('');
    if (!email) {
      setError('Please enter your work email.');
      return;
    }
    setIsLoading(true);
    try {
      await authService.initiateForgotPassword(email);
      setStep(2);
      setResendAttempts(0);
      setCountdown(60);
      toast.success('OTP sent to your email!');
    } catch (err) {
      setError(err.message || "Failed to send OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    setError('');
    setIsLoading(true);
    try {
      await authService.initiateForgotPassword(email);
      const newAttempts = resendAttempts + 1;
      setResendAttempts(newAttempts);
      
      if (newAttempts === 1) {
        setCountdown(180); // 3 mins
      } else {
        setCountdown(300); // 5 mins
      }
      toast.success('A new OTP has been sent to your email.');
    } catch (err) {
      setError(err.message || "Failed to resend OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otp.trim().length === 6) {
      // Validation is handled automatically by useEffect
      return;
    }
    setError('Please enter a 6-digit OTP.');
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        email,
        new_password: newPassword,
        confirm_password: confirmPassword,
        purpose: "forgot_password"
      };


      await forgotPasswordSchema.validate(payload, { abortEarly: false });
      setIsLoading(true);

      // Reset password
      await authService.resetPassword(payload);

      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.errors ? err.errors[0] : (err.message || "Failed to reset password."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative overflow-x-hidden overflow-y-auto bg-transparent flex items-center justify-center py-12 md:py-16">

      {/* ─── Webkit Autofill Style Override ─── */}
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

      {/* ─── LAYER 1: Purple Radial Spotlight Gradient ─── */}
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

      {/* ─── LAYER 2: Dynamic Grid Background ──────────── */}
      <DynamicGridBackground />

      {/* ─── LAYER 3: Centered 3D Morphing Orb ──────────────── */}
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
          backgroundColor: 'rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(28px) saturate(200%)',
          WebkitBackdropFilter: 'blur(28px) saturate(200%)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          boxShadow: '0 30px 70px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.15)'
        }}
        className="relative z-30 w-full max-w-[850px] rounded-[32px] overflow-hidden flex flex-col md:flex-row shadow-2xl mx-4 group hover:shadow-indigo-500/5 transition-all duration-300"
      >

        {/* ─── LEFT COLUMN: The Product Intelligence Showcase ────────────── */}
        <div className="flex-1 flex flex-col justify-between p-8 md:p-10 min-h-[360px] md:min-h-0">
          <div>
            <div className="bg-white/90 backdrop-blur-md py-2 px-5 rounded-2xl border border-slate-200/60 shadow-sm w-fit mb-8">
              <img src="/TalentForge-logos.png" alt="TalentForge" className="w-[115px] h-auto object-contain" />
            </div>
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

          <div className="space-y-3 pr-2">
            <div className="flex items-center gap-3 bg-white/10 border border-white/20 backdrop-blur-md p-2.5 rounded-2xl shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/10 flex items-center justify-center text-indigo-600">
                <Database size={18} />
              </div>
              <div>
                <div className="text-[13px] font-black text-slate-900 leading-none">300,000+</div>
                <div className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">JD Templates Available</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/10 border border-white/20 backdrop-blur-md p-2.5 rounded-2xl shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                <Zap size={18} className="animate-pulse" />
              </div>
              <div>
                <div className="text-[13px] font-black text-slate-900 leading-none">6x Faster Sync</div>
                <div className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Pipeline Creation Speed</div>
              </div>
            </div>
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

        {/* ─── RIGHT COLUMN: Form ─────────────────────── */}
        <div className="flex-1 flex flex-col justify-between bg-[#0a0a0b] p-8 md:p-10">
          <div>
            <div className="flex items-center justify-between w-full mb-6">
              <span className="text-[9px] font-bold tracking-[0.25em] text-slate-500 uppercase">
                Account Recovery
              </span>
              <Link to="/login" className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
                <ChevronLeft size={12} /> Back to Sign In
              </Link>
            </div>

            <div className="mb-6">
              <h1 className="text-3xl font-black text-white tracking-tight leading-none mb-2">
                Reset Password
              </h1>
              <p className="text-xs text-slate-400 font-semibold tracking-wide">
                Update your password instantly. Enter your work email and set a new, secure password.
              </p>
            </div>

            {success ? (
              <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-2xl p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4 text-emerald-400">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">Password Reset!</h3>
                <p className="text-emerald-200/70 text-xs leading-relaxed">
                  Your password has been successfully updated. Redirecting you to login...
                </p>
              </div>
            ) : step === 1 ? (
              <form onSubmit={handleInitiate} className="space-y-5 relative z-10">
                <div className="relative border-b border-slate-700 focus-within:border-indigo-500 transition-colors py-1">
                  <label className="block text-[9px] font-black text-slate-500 tracking-[0.15em] uppercase mb-0.5">
                    Work Email Address
                  </label>
                  <div className="flex items-center gap-3">
                    <Mail size={16} className="text-slate-500 flex-shrink-0" />
                    <input
                      name="email" type="email"
                      value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full bg-transparent py-2 text-xs md:text-sm text-white placeholder-slate-600 outline-none border-none px-0"
                    />
                  </div>
                </div>
                {error && <p className="text-[10px] text-white font-semibold mt-1">{error}</p>}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-slate-950 text-white font-bold text-xs rounded-full hover:bg-slate-800 hover:shadow-lg active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 shadow-md group disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Sending OTP...
                    </>
                  ) : (
                    <>
                      Get OTP <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            ) : step === 2 ? (
              <form onSubmit={handleVerifyOTP} className="space-y-5 relative z-10">
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 mb-2">
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    An OTP has been sent to <strong className="text-indigo-400">{email}</strong>. Please enter it below.
                  </p>
                </div>

                <div className="relative pt-1 pb-3">
                  <label className="block text-[9px] font-black text-slate-500 tracking-[0.15em] uppercase mb-2">
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
                        className={`w-10 h-12 md:w-12 md:h-14 bg-white/5 border ${error ? 'border-red-500/80 focus:border-red-400 text-red-400 shadow-[0_0_10px_rgba(248,113,113,0.15)]' : 'border-slate-700 focus:border-indigo-500 text-white'} rounded-xl text-center text-lg md:text-xl font-black shadow-sm outline-none transition-all focus:bg-white/10 focus:shadow-indigo-500/10 focus:-translate-y-0.5`}
                      />
                    ))}
                  </motion.div>
                </div>

                <div className="flex items-center justify-end mt-1 mb-2 text-[9px] font-black uppercase tracking-wider">
                  {countdown > 0 ? (
                    <span className="text-slate-400">
                      Resend OTP in <span className="text-indigo-600 ml-1">{formatTime(countdown)}</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={isLoading}
                      className="text-indigo-600 hover:text-indigo-700 hover:underline transition-all"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>

                {error && error.toLowerCase().includes('otp') && <p className="text-[10px] text-white font-semibold mt-1">{error}</p>}


              </form>
            ) : (
              <form onSubmit={handleReset} className="space-y-5 relative z-10">
                <div className="relative border-b border-slate-700 focus-within:border-indigo-500 transition-colors py-1">
                  <div className="flex justify-between items-center mb-0.5">
                    <label className="block text-[9px] font-black text-slate-500 tracking-[0.15em] uppercase">
                      New Password
                    </label>
                    {passStrength.label && (
                      <span className={`text-[9px] font-black uppercase tracking-wider ${passStrength.text}`}>
                        {passStrength.label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 pb-1">
                    <Lock size={16} className="text-slate-500 flex-shrink-0" />
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-transparent py-1 text-xs md:text-sm text-white placeholder-slate-600 outline-none border-none px-0"
                    />
                    <button type="button" onClick={() => setShowNewPass(p => !p)} className="text-slate-500 hover:text-slate-300 transition-colors">
                      {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                {/* 3-Segment Strength Meter */}
                {newPassword && (
                  <div className="flex gap-1.5 mt-2">
                    <div className={`h-1 flex-1 rounded-full transition-colors duration-300 ${newPassword.length > 0 ? passStrength.color : 'bg-slate-200/50'}`} />
                    <div className={`h-1 flex-1 rounded-full transition-colors duration-300 ${passStrength.label === 'Medium' || passStrength.label === 'Strong' ? passStrength.color : 'bg-slate-200/50'}`} />
                    <div className={`h-1 flex-1 rounded-full transition-colors duration-300 ${passStrength.label === 'Strong' ? passStrength.color : 'bg-slate-200/50'}`} />
                  </div>
                )}

                <div className={`relative border-b transition-colors py-1 ${confirmPassword && !passwordsMatch ? 'border-red-500/80' : confirmPassword && passwordsMatch ? 'border-emerald-500/80' : 'border-slate-700 focus-within:border-indigo-500'} ${newPassword ? 'mt-4' : ''}`}>
                  <div className="flex justify-between items-center mb-0.5">
                    <label className="block text-[9px] font-black text-slate-500 tracking-[0.15em] uppercase">
                      Confirm New Password
                    </label>
                    {confirmPassword && passwordsMatch && (
                      <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400">
                        Matches
                      </span>
                    )}
                    {confirmPassword && !passwordsMatch && (
                      <span className="text-[9px] font-black uppercase tracking-wider text-red-400">
                        No Match
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 pb-1">
                    <Lock size={16} className={`flex-shrink-0 ${confirmPassword && !passwordsMatch ? 'text-red-400' : confirmPassword && passwordsMatch ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <input
                      type={showConfirmPass ? 'text' : 'password'}
                      value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-transparent py-1 text-xs md:text-sm text-white placeholder-slate-600 outline-none border-none px-0"
                    />
                    <button type="button" onClick={() => setShowConfirmPass(p => !p)} className="text-slate-500 hover:text-slate-300 transition-colors">
                      {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                {error && !error.toLowerCase().includes('otp') && <p className="text-[10px] text-white font-semibold mt-1">{error}</p>}

                <button
                  type="submit"
                  disabled={isLoading || passStrength.label === 'Weak' || !passwordsMatch}
                  className="w-full py-3.5 bg-white text-slate-950 font-bold text-xs rounded-full hover:bg-slate-200 hover:shadow-lg hover:shadow-white/10 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 shadow-md group disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Updating Account...
                    </>
                  ) : (
                    <>
                      Reset Password <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

        </div>

      </motion.div>

    </div>
  );
};

export default ForgotPassword;