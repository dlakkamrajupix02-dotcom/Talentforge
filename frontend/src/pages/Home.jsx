
import React, { useState, useEffect, useRef, useContext } from 'react';
import Lenis from 'lenis';
import { useNavigate, Link } from 'react-router-dom';
import { JDContext } from '../context/JDContext';
import Hero3DBlob from '../components/common/Hero3DBlob';
import { siteData } from '../data/homeSiteData';
import {
  ArrowRight,
  Check,
  Menu,
  X,
  Sparkles,
  ChevronRight,
  Play,
  BarChart3,
  Layers,
  Globe,
  Shield,
  Search,
  Bell,
  FileText,
  Zap,
  Activity,
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────────

const FadeIn = ({ children, delay = 0, className = '' }) => {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.12 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out ${className} ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

const Glass = ({ children, className = '' }) => (
  <div className={`rounded-3xl apple-blur text-white ${className}`}>
    {children}
  </div>
);

const SectionLabel = ({ children }) => (
  <p className="text-[11px] uppercase tracking-[0.28em] text-indigo-300 font-semibold mb-4">{children}</p>
);

const SignUpBtn = ({ className = '', dark = false }) => (
  <Link
    to="/login"
    className={`group inline-flex items-center gap-2 font-semibold rounded-full transition-all duration-300 hover:scale-[1.03] ${dark ? 'bg-indigo-600 text-white pl-6 pr-2 py-2.5 shadow-lg shadow-indigo-950/30' : 'bg-slate-900 text-white pl-6 pr-2 py-2.5 shadow-xl shadow-slate-900/20'} ${className}`}
  >
    Sign Up
    <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-sm">
      <ArrowRight size={14} className={dark ? 'text-indigo-600' : 'text-slate-900'} />
    </span>
  </Link>
);

// ── Navbar ─────────────────────────────────────────────────────────────────

const Navbar = () => {
  const [open, setOpen] = useState(false);
  return (
    <nav className="fixed top-0 inset-x-0 z-50 px-8 pt-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <img src="/TF-white.png" alt="TalentForge" className="h-7 lg:h-12 w-auto object-contain" />
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <div className="flex items-center bg-white/80 backdrop-blur-md rounded-full px-2 py-1.5 border border-slate-200/80 shadow-lg shadow-indigo-50/20">
            {siteData.navigation.links.map((l) => (
              <a key={l.name} href={l.href} className="text-sm font-medium text-slate-600 hover:text-indigo-600 px-5 py-2.5 transition-colors">
                {l.name}
              </a>
            ))}
          </div>
          <SignUpBtn dark />
        </div>

        <button className="md:hidden text-slate-900" onClick={() => setOpen(!open)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      {open && (
        <div className="md:hidden mt-4 mx-auto max-w-sm bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200 p-6 space-y-3 shadow-xl">
          {siteData.navigation.links.map((l) => (
            <a key={l.name} href={l.href} onClick={() => setOpen(false)} className="block text-slate-700 font-medium py-2 hover:text-indigo-600">{l.name}</a>
          ))}
          <SignUpBtn dark className="w-full justify-center mt-2" />
        </div>
      )}
    </nav>
  );
};

// ── Hero ───────────────────────────────────────────────────────────────────

const Hero = () => (
  <section className="relative z-10 min-h-screen flex flex-col justify-between pb-16 pt-36">
    <div className="max-w-7xl mx-auto px-8 w-full flex-grow flex flex-col justify-end">
      <div className="grid lg:grid-cols-12 gap-12 items-end w-full">
        {/* Left Column */}
        <div className="lg:col-span-7 flex flex-col justify-between min-h-[45vh] lg:min-h-[55vh]">
          <FadeIn className="my-auto">
            <h1
              className="text-5xl sm:text-7xl lg:text-[5.5rem] font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 leading-[1] tracking-[-0.04em] max-w-4xl pb-4"
            >
              {siteData.hero.title}
            </h1>
          </FadeIn>

          <FadeIn delay={60} className="mt-10 lg:mt-auto">
            <p className="text-sm text-slate-300 font-medium mb-4">{siteData.hero.trusted}</p>
            <div className="flex -space-x-2.5">
              {[11, 12, 13, 14].map((i) => (
                <div key={i} className="w-9 h-9 rounded-full border-2 border-white/60 overflow-hidden shadow-md">
                  <img src={`https://i.pravatar.cc/100?img=${i}`} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </FadeIn>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-5 flex flex-col justify-end lg:pb-3">
          <FadeIn delay={120} className="text-left">
            <p className="text-white leading-relaxed mb-8 max-w-md text-[1.05rem]">
              {siteData.hero.description}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <SignUpBtn />
              <a href="#product" className="inline-flex items-center px-6 py-3 rounded-full font-semibold text-slate-800 bg-white/70 border border-slate-200 hover:bg-slate-50 shadow-sm transition-all text-sm">
                {siteData.hero.cta.secondary}
              </a>
            </div>
          </FadeIn>
        </div>
      </div>
    </div>
  </section>
);


// ── Clients ────────────────────────────────────────────────────────────────

const ClientCard = ({ children, className = '' }) => (
  <div
    className={`group w-32 h-24 rounded-2xl bg-white/10 border border-white/20 shadow-md shadow-indigo-950/10 backdrop-blur-md flex items-center justify-center hover:bg-white/15 hover:border-white/30 hover:scale-[1.05] hover:shadow-xl hover:shadow-indigo-950/20 transition-all duration-300 cursor-default shrink-0 ${className}`}
  >
    {children}
  </div>
);

const Clients = () => {
  return (
    <section className="relative z-10 py-24">
      <div className="max-w-6xl mx-auto px-8 text-center">
        <FadeIn>
          <p className="text-[11px] uppercase tracking-[0.28em] text-indigo-200/80 font-semibold mb-4">
            {siteData.clients.badge}
          </p>
          <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight max-w-2xl mx-auto tracking-tight mb-14">
            {siteData.clients.title}
          </h2>
        </FadeIn>

        <FadeIn delay={120}>
          <div className="flex flex-wrap justify-center gap-4 lg:gap-6">
            {siteData.clients.logos.map((logo) => (
              <ClientCard key={logo.name} className={logo.hoverShadow}>
                <img
                  src={logo.src}
                  alt={logo.name}
                  className={`${logo.className} object-contain brightness-0 invert opacity-75 group-hover:opacity-100 transition-opacity duration-300`}
                />
              </ClientCard>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
};

// ── Icons for Pillars ────────────────────────────────────────────────────────

const AsteriskIcon = ({ className = "text-white" }) => (
  <svg className={`w-5 h-5 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19" />
  </svg>
);

const NetworkIcon = ({ className = "text-white" }) => (
  <svg className={`w-5 h-5 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <circle cx="12" cy="5" r="2.5" />
    <circle cx="5" cy="19" r="2.5" />
    <circle cx="19" cy="19" r="2.5" />
    <path d="M12 7.5l-4.5 9M12 7.5l4.5 9M7.5 19h9" />
  </svg>
);

const GridIcon = ({ className = "text-white" }) => (
  <svg className={`w-5 h-5 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
  </svg>
);

// ── Pillars Section ─────────────────────────────────────────────────────────

// ── Reusable 3D Tilt Feature Card ──────────────────────────────────────────

const FeatureCard = ({ title, description, badge, isHero = false, children }) => {
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();

    // Mouse coordinates relative to card
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert to percentage (0 to 100) for glare
    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;

    // Calculate tilt angles (range from -8 to 8 degrees)
    const tiltX = -((y - rect.height / 2) / (rect.height / 2)) * 8;
    const tiltY = ((x - rect.width / 2) / (rect.width / 2)) * 8;

    setTilt({ x: tiltX, y: tiltY });
    setGlare({ x: glareX, y: glareY });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
    setGlare({ x: 50, y: 50 });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`p-8 rounded-[32px] text-left flex flex-col justify-between min-h-[360px] transition-all duration-300 relative overflow-hidden border ${isHero
        ? 'bg-slate-950 border-slate-900 text-white shadow-[0_20px_50px_rgba(15,23,42,0.25)]'
        : 'bg-slate-50/70 border-slate-200/60 text-slate-800 shadow-[0_15px_30px_rgba(148,163,184,0.05)]'
        }`}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${isHovered ? 1.025 : 1})`,
        transformStyle: 'preserve-3d',
        transition: isHovered ? 'transform 0.05s ease-out' : 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)'
      }}
    >
      {/* Dynamic Cursor Glare Reflection */}
      <div
        className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-300"
        style={{
          opacity: isHovered ? (isHero ? 0.15 : 0.1) : 0,
          background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.8) 0%, transparent 60%)`
        }}
      />

      {/* Top Section: Icon & Technical Badge */}
      <div style={{ transform: 'translateZ(20px)' }}>
        <div className="flex items-center justify-between mb-8">
          {/* Custom SVG Icon slot */}
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-colors ${isHero
            ? 'bg-white/10 border-white/10 text-white'
            : 'bg-white border-slate-200/80 text-slate-700 shadow-sm'
            }`}>
            {children}
          </div>

          <span className={`text-[9px] font-extrabold font-mono tracking-wider px-2.5 py-1 rounded border uppercase ${isHero
            ? 'bg-white/5 border-white/10 text-indigo-300'
            : 'bg-indigo-50 border-indigo-100/60 text-indigo-600'
            }`}>
            {badge}
          </span>
        </div>

        <h3 className={`text-2xl font-extrabold tracking-tight mb-3 ${isHero ? 'text-white' : 'text-slate-900'}`}>
          {title}
        </h3>
      </div>

      {/* Bottom Section: Description */}
      <p
        className={`text-xs md:text-sm leading-relaxed font-normal ${isHero ? 'text-slate-300' : 'text-slate-600'}`}
        style={{ transform: 'translateZ(10px)' }}
      >
        {description}
      </p>
    </div>
  );
};

// ── Pillars Section ─────────────────────────────────────────────────────────

const Pillars = () => {
  return (
    <section className="relative z-10 py-32 bg-white text-slate-900 overflow-hidden">

      {styleTagForPillarsAnimations}

      <div className="max-w-6xl mx-auto px-8 relative z-10">

        {/* Header Grid */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-20">
          <div className="max-w-2xl text-left">
            <p className="text-[11px] uppercase tracking-[0.28em] text-indigo-600 font-extrabold mb-4 font-mono">
              FEATURES
            </p>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-slate-900 leading-tight tracking-tight">
              Platform Core Pillars
            </h2>
            <p className="text-slate-500 mt-4 text-sm md:text-base leading-relaxed font-normal">
              Accelerate talent acquisition and streamline specifications using automated, high-precision, and adaptable AI intelligence.
            </p>
          </div>
          <div className="text-left shrink-0">
            <a
              href="#ai-generator"
              className="inline-flex items-center gap-3 px-6 py-3.5 rounded-full font-bold text-white bg-slate-950 hover:bg-slate-900 shadow-xl shadow-slate-950/10 hover:shadow-slate-950/25 hover:translate-y-[-1px] transition-all text-xs"
            >
              Interactive Sandbox
              <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-slate-950">
                <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            </a>
          </div>
        </div>

        {/* 3-Column Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Card 1 - Efficiency */}
          <FeatureCard
            title="Instant Efficiency"
            badge="0.4s Compilation"
            description="Slash draft creation cycles from hours to seconds. Empower your recruiting teams to focus on relationships while AI automates compliant JD drafting."
          >
            <svg className="w-6 h-6 overflow-visible" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {/* Outer spinning dash circle */}
              <circle cx="12" cy="12" r="10" strokeDasharray="4, 4" className="animate-spin-clockwise origin-center" />
              {/* Inner counter-spinning circle */}
              <circle cx="12" cy="12" r="6" strokeDasharray="3, 3" className="animate-spin-counter origin-center text-indigo-500" />
              {/* Central pulsing core node */}
              <circle cx="12" cy="12" r="2" fill="currentColor" className="animate-pulse-core" />
            </svg>
          </FeatureCard>

          {/* Card 2 - Accuracy (The HERO Card - Dark Mode) */}
          <FeatureCard
            title="Targeted Accuracy"
            badge="99.8% Precision"
            description="Leverage deep semantic matching heuristics to curate precise candidate specifications, eliminating keyword stuffing and attracting top-tier talent."
            isHero={true}
          >
            <svg className="w-6 h-6 overflow-visible" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {/* Grid background coordinate tracks */}
              <line x1="12" y1="2" x2="12" y2="22" opacity="0.3" strokeDasharray="2, 2" />
              <line x1="2" y1="12" x2="22" y2="12" opacity="0.3" strokeDasharray="2, 2" />
              {/* Target box lines */}
              <rect x="5" y="5" width="14" height="14" rx="3" strokeWidth="1" opacity="0.4" />
              {/* Center locking crosshair */}
              <circle cx="12" cy="12" r="4" className="text-cyan-400 animate-pulse-core" />
              <path d="M12 8v8M8 12h8" className="text-cyan-400" />
            </svg>
          </FeatureCard>

          {/* Card 3 - Customizable */}
          <FeatureCard
            title="Modular Adaptability"
            badge="100% Customizable"
            description="Tailor writing styles, tone boundaries, and compliance parameters to fit your organization's unique requirements with modular layout controls."
          >
            <svg className="w-6 h-6 overflow-visible" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {/* Four small grid boxes that dynamically translate/scale */}
              <rect x="3" y="3" width="7" height="7" rx="1.5" className="animate-morph-box-1 text-indigo-500" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" className="animate-morph-box-2" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" className="animate-morph-box-3" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" className="animate-morph-box-4 text-indigo-500" />
            </svg>
          </FeatureCard>

        </div>
      </div>
    </section>
  );
};

// CSS styles to support the custom SVG animations
const styleTagForPillarsAnimations = (
  <style>{`
    @keyframes spinClockwise {
      to { transform: rotate(360deg); }
    }
    @keyframes spinCounter {
      to { transform: rotate(-360deg); }
    }
    @keyframes pulseCore {
      0%, 100% { opacity: 0.4; transform: scale(0.9); }
      50% { opacity: 1; transform: scale(1.15); }
    }
    
    /* Morphs for customization grid */
    @keyframes morphBox1 {
      0%, 100% { transform: translate(0, 0); }
      50% { transform: translate(1.5px, 1.5px) scale(0.95); }
    }
    @keyframes morphBox2 {
      0%, 100% { transform: translate(0, 0); }
      50% { transform: translate(-1.5px, 1.5px) scale(0.95); }
    }
    @keyframes morphBox3 {
      0%, 100% { transform: translate(0, 0); }
      50% { transform: translate(1.5px, -1.5px) scale(0.95); }
    }
    @keyframes morphBox4 {
      0%, 100% { transform: translate(0, 0); }
      50% { transform: translate(-1.5px, -1.5px) scale(0.95); }
    }

    .animate-spin-clockwise {
      animation: spinClockwise 12s linear infinite;
    }
    .animate-spin-counter {
      animation: spinCounter 8s linear infinite;
    }
    .animate-pulse-core {
      animation: pulseCore 2.5s ease-in-out infinite;
    }
    .animate-morph-box-1 {
      animation: morphBox1 3.5s ease-in-out infinite;
    }
    .animate-morph-box-2 {
      animation: morphBox2 3.5s ease-in-out infinite;
    }
    .animate-morph-box-3 {
      animation: morphBox3 3.5s ease-in-out infinite;
    }
    .animate-morph-box-4 {
      animation: morphBox4 3.5s ease-in-out infinite;
    }
  `}</style>
);

// ── Success Stories Section ──────────────────────────────────────────────────

const SuccessStories = () => {
  const [activeTab, setActiveTab] = useState('prada');

  // Prada sync simulation state
  const [pradaStatus, setPradaStatus] = useState('idle'); // 'idle', 'syncing', 'completed'
  const [pradaLogs, setPradaLogs] = useState([]);
  const [pradaPercent, setPradaPercent] = useState(0);

  // Nike approval simulation state
  const [nikeStep, setNikeStep] = useState(0); // 0: HR, 1: Manager, 2: VP, 3: Completed
  const [nikeAnimating, setNikeAnimating] = useState(false);
  const [nikeParticleLeft, setNikeParticleLeft] = useState(0);

  // Bosch mapping simulation state
  const [boschAnimating, setBoschAnimating] = useState(false);
  const [boschMapped, setBoschMapped] = useState(false);

  // Disney compliance state
  const [disneyScanning, setDisneyScanning] = useState(false);
  const [disneyScore, setDisneyScore] = useState(null);

  // Prada Sync Simulation
  const runPradaSync = () => {
    if (pradaStatus === 'syncing') return;
    setPradaStatus('syncing');
    setPradaLogs([]);
    setPradaPercent(0);

    const logsList = [
      { pct: 4, text: '[INIT] Initializing direct Cornerstone API API handshake...' },
      { pct: 20, text: '[AUTH] Mutual SSL certificate handshake verified successfully.' },
      { pct: 40, text: '[MAP] Reading 12,000 legacy Oracle HCM job profiles...' },
      { pct: 60, text: '[BUILD] Mapping legacy structures to HRIS competency schemas...' },
      { pct: 80, text: '[POST] Pushing compliant JSON payloads to endpoint queue...' },
      { pct: 95, text: '[VERIFY] Running zero-loss synchrony verification audit...' },
      { pct: 100, text: '[SUCCESS] Sync finished. 12,000 records synchronized, 0 errors.' }
    ];

    let currentPct = 0;
    const interval = setInterval(() => {
      currentPct += 1;
      setPradaPercent(currentPct);

      const logToAdd = logsList.find(log => log.pct === currentPct);
      if (logToAdd) {
        setPradaLogs(prev => [...prev, logToAdd.text]);
      }

      if (currentPct >= 100) {
        clearInterval(interval);
        setPradaStatus('completed');
      }
    }, 25); // Sleek, energetic sync cadence
  };

  // Nike Workflow Simulation with Flowing Energy
  const advanceNikeWorkflow = () => {
    if (nikeAnimating) return;
    if (nikeStep >= 3) {
      setNikeStep(0);
      setNikeParticleLeft(0);
      return;
    }

    const nextStep = nikeStep + 1;
    const targetLeft = Math.min(nextStep * 50, 100); // 0% -> 50% -> 100%

    setNikeAnimating(true);
    setNikeParticleLeft(targetLeft);

    // Coordinate state update with the particle slide transition
    setTimeout(() => {
      setNikeStep(nextStep);
      setNikeAnimating(false);
    }, 800);
  };

  // Bosch Mapping Simulation with self-drawing lasers
  const runBoschMapping = () => {
    if (boschAnimating) return;
    setBoschAnimating(true);
    setBoschMapped(false);

    setTimeout(() => {
      setBoschAnimating(false);
      setBoschMapped(true);
    }, 1500); // 1.5s high-fidelity sweep
  };

  // Disney Compliance Simulation with live scoring
  const runDisneyScan = () => {
    if (disneyScanning) return;
    setDisneyScanning(true);
    setDisneyScore(0);

    let score = 0;
    const interval = setInterval(() => {
      score += 2;
      setDisneyScore(score);
      if (score >= 100) {
        clearInterval(interval);
        setDisneyScanning(false);
      }
    }, 30);
  };

  // Prada Radial Gauge calculations
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pradaPercent / 100) * circumference;

  return (
    <section className="relative z-10 py-28 bg-gradient-to-b from-[#FAF9F6] to-[#F3F4F6] text-slate-900 border-t border-slate-100 overflow-hidden">
      {/* Dynamic CSS Keyframes for Retro-Futuristic Animations */}
      <style>{`
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(180px); }
        }
        @keyframes laserFlow {
          0% { stroke-dashoffset: 20; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes shockwave {
          0% { transform: scale(0.9); opacity: 0.8; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes springPop {
          0% { transform: scale(0.85); }
          70% { transform: scale(1.08); }
          90% { transform: scale(0.97); }
          100% { transform: scale(1); }
        }
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes sweep {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(115px); }
        }
        .animate-scanline {
          animation: scanline 2.5s linear infinite;
        }
        .animate-slide-up-fade {
          animation: slideUpFade 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-spring-pop {
          animation: springPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .animate-shockwave {
          animation: shockwave 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-sweep-line {
          animation: sweep 2.2s ease-in-out infinite;
        }
      `}</style>

      {/* Atmospheric warm lighting */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-indigo-100/40 filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-rose-100/30 filter blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-8 relative z-10">
        <div className="max-w-3xl text-left mb-16">
          <p className="text-[11px] uppercase tracking-[0.28em] text-indigo-600 font-extrabold mb-4 font-mono">
            ENTERPRISE SIMULATOR
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-slate-955 leading-tight tracking-tight">
            Interactive Impact Hub.
          </h2>
          <p className="text-slate-600 mt-4 text-base font-medium leading-relaxed">
            Click through our case studies below to interact with real-time functional simulations of how TalentForge (JD Forge) handles massive corporate migrations and workflows.
          </p>
        </div>

        {/* Tab Navigation Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { id: 'prada', label: 'PRADA GROUP', sub: 'API Sync' },
            { id: 'nike', label: 'NIKE OPERATIONS', sub: 'Workflows' },
            { id: 'bosch', label: 'BOSCH GLOBAL', sub: 'Competencies' },
            { id: 'disney', label: 'DISNEY CORP', sub: 'Compliance' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-5 rounded-2xl text-left transition-all relative overflow-hidden border ${activeTab === tab.id
                ? 'bg-white/80 border-indigo-500/30 shadow-[0_10px_25px_rgba(99,102,241,0.08)] scale-[1.02]'
                : 'bg-white/30 border-slate-200/55 hover:bg-white/50 hover:border-slate-300/65'
                }`}
            >
              <div className="text-[11px] font-mono font-black text-slate-500 tracking-wider mb-1">{tab.label}</div>
              <div className="text-sm font-bold text-slate-900">{tab.sub}</div>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600" />
              )}
            </button>
          ))}
        </div>

        {/* Interactive Case Study Console */}
        <div className="light-liquid-glass rounded-[32px] p-8 lg:p-12 min-h-[480px] grid md:grid-cols-12 gap-8 items-center relative overflow-hidden border border-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,#4f46e5_0%,transparent_50%)] opacity-[0.03]" />

          {/* Left Column: Metrics & Copy */}
          <div className="md:col-span-6 text-left relative z-10 flex flex-col justify-between h-full">
            {activeTab === 'prada' && (
              <div>
                <span className="text-[10px] font-mono font-black text-indigo-600 tracking-widest uppercase bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                  CASE STUDY 01 // ORACLE TO HRIS
                </span>
                <div className="mt-6 mb-2 text-[56px] font-black text-slate-950 leading-none tracking-tight flex items-baseline gap-2">
                  <span>900</span>
                  <span className="text-xl font-bold text-indigo-600">HOURS SAVED</span>
                </div>
                <h3 className="text-2xl font-black text-slate-950 mb-4">Prada Group Sync Integration</h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                  Automated the migration and schema mapping of 12,000 legacy records directly into Cornerstone. Running our direct API bridge replaced months of developer mapping tasks.
                </p>
                <ul className="space-y-2.5 text-sm text-slate-650 mb-8">
                  <li className="flex items-center gap-2.5">
                    <span className="text-indigo-600 font-black">✓</span> 100% schema alignment with HRIS standards
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="text-indigo-600 font-black">✓</span> Live audit reports with zero data loss
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="text-indigo-600 font-black">✓</span> Automated synchronization terminal logs
                  </li>
                </ul>

                <div className="flex items-center gap-4">
                  <button
                    onClick={runPradaSync}
                    className="px-6 py-3.5 rounded-full font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all shadow-lg shadow-indigo-600/10"
                  >
                    {pradaStatus === 'syncing' ? 'Syncing...' : pradaStatus === 'completed' ? 'Restart Sync Simulation' : 'Execute API Sync'}
                  </button>

                  {pradaStatus === 'syncing' && (
                    <div className="flex items-center gap-2 font-mono text-xs text-indigo-600 font-black">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping" />
                      <span>{pradaPercent}% SYNCED</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'nike' && (
              <div>
                <span className="text-[10px] font-mono font-black text-emerald-600 tracking-widest uppercase bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                  CASE STUDY 02 // WORKFLOW SLA
                </span>
                <div className="mt-6 mb-2 text-[56px] font-black text-slate-950 leading-none tracking-tight flex items-baseline gap-2">
                  <span>85%</span>
                  <span className="text-xl font-bold text-emerald-600">FASTER REVIEWS</span>
                </div>
                <h3 className="text-2xl font-black text-slate-950 mb-4">Nike Global Approval Chains</h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                  Implemented dynamic, progressive approval workflows across 42 countries. Review chains automatically lock actions, track SLAs, and allow secure reviewer delegation.
                </p>
                <ul className="space-y-2.5 text-sm text-slate-650 mb-8">
                  <li className="flex items-center gap-2.5">
                    <span className="text-emerald-600 font-black">✓</span> Reduced review cycles from 28 to 4.2 days
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="text-emerald-600 font-black">✓</span> Action lockdown prevents unapproved edits
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="text-emerald-600 font-black">✓</span> Full collaboration threads preserved in PDFs
                  </li>
                </ul>
                <button
                  onClick={advanceNikeWorkflow}
                  disabled={nikeAnimating}
                  className="px-6 py-3.5 rounded-full font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all shadow-lg shadow-emerald-600/10 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {nikeAnimating ? 'Advancing Laser Node...' : nikeStep === 3 ? 'Reset Workflow' : nikeStep === 0 ? 'Start Approval Simulation' : 'Advance Workflow Step'}
                </button>
              </div>
            )}

            {activeTab === 'bosch' && (
              <div>
                <span className="text-[10px] font-mono font-black text-violet-600 tracking-widest uppercase bg-violet-50 px-3 py-1 rounded-full border border-violet-100">
                  CASE STUDY 03 // TAXONOMY ALIGNMENT
                </span>
                <div className="mt-6 mb-2 text-[56px] font-black text-slate-950 leading-none tracking-tight flex items-baseline gap-2">
                  <span>99.8%</span>
                  <span className="text-xl font-bold text-violet-600">SKILL MATCH</span>
                </div>
                <h3 className="text-2xl font-black text-slate-950 mb-4">Bosch Competency Matrices</h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                  Automatically structured 35,000 active manufacturing roles. Our semantic AI parsed chaotic text and linked legacy skills directly to unified Cornerstone competency codes.
                </p>
                <ul className="space-y-2.5 text-sm text-slate-650 mb-8">
                  <li className="flex items-center gap-2.5">
                    <span className="text-violet-600 font-black">✓</span> Extracted skill structures instantly from text
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="text-violet-600 font-black">✓</span> Standardized multi-source database fields
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="text-violet-600 font-black">✓</span> Eliminated skill duplicates and database clutter
                  </li>
                </ul>
                <button
                  onClick={runBoschMapping}
                  disabled={boschAnimating}
                  className="px-6 py-3.5 rounded-full font-bold text-sm text-white bg-violet-600 hover:bg-violet-500 active:scale-95 transition-all shadow-lg shadow-violet-600/10 disabled:opacity-60"
                >
                  {boschAnimating ? 'Aligning Competencies...' : boschMapped ? 'Restart AI Mapping' : 'Run AI Competency Alignment'}
                </button>
              </div>
            )}

            {activeTab === 'disney' && (
              <div>
                <span className="text-[10px] font-mono font-black text-blue-600 tracking-widest uppercase bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                  CASE STUDY 04 // COMPLIANCE
                </span>
                <div className="mt-6 mb-2 text-[56px] font-black text-slate-950 leading-none tracking-tight flex items-baseline gap-2">
                  <span>100%</span>
                  <span className="text-xl font-bold text-blue-600">BRAND COMPLIANT</span>
                </div>
                <h3 className="text-2xl font-black text-slate-950 mb-4">Disney Brand Enforcement</h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                  Standardized brand voice, formatting, and compliance protocols across 18 business units. Our custom guardrails scan and block unauthorized modifications.
                </p>
                <ul className="space-y-2.5 text-sm text-slate-650 mb-8">
                  <li className="flex items-center gap-2.5">
                    <span className="text-blue-600 font-black">✓</span> Continuous scanning for legal guardrails
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="text-blue-600 font-black">✓</span> Direct brand voice standard compliance
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="text-blue-600 font-black">✓</span> Admin workflow builders lock crucial sections
                  </li>
                </ul>
                <button
                  onClick={runDisneyScan}
                  disabled={disneyScanning}
                  className="px-6 py-3.5 rounded-full font-bold text-sm text-white bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all shadow-lg shadow-blue-600/10 disabled:opacity-60"
                >
                  {disneyScanning ? `Scanning Draft (${disneyScore}%)` : disneyScore !== null ? 'Re-Run Compliance Scan' : 'Scan Brand Alignment'}
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Dynamic Visual Sandbox (Premium Glass Dashboard) */}
          <div className="md:col-span-6 h-80 w-full rounded-2xl border border-slate-200/60 bg-white/60 backdrop-blur-md p-6 relative overflow-hidden shadow-xl flex flex-col justify-between">
            <div className="absolute top-0 right-0 p-3 text-[8px] font-mono text-slate-455 select-none z-20">
              TALENTFORGE_SANDBOX_v2.0
            </div>

            {/* Prada Sandbox: Sync Terminal */}
            {activeTab === 'prada' && (
              <div className="flex-grow flex flex-col text-left font-mono text-[11px] h-full justify-between select-none relative z-10">
                <div className="border-b border-slate-100 pb-2 mb-2 flex items-center justify-between text-slate-500">
                  <div className="flex items-center gap-2">
                    {/* Live radial gauge next to title */}
                    {pradaStatus === 'syncing' && (
                      <svg className="w-5 h-5 -rotate-90" viewBox="0 0 48 48">
                        <circle cx="24" cy="24" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="4" />
                        <circle
                          cx="24"
                          cy="24"
                          r={radius}
                          fill="none"
                          stroke="#4f46e5"
                          strokeWidth="4"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          className="transition-all duration-75"
                        />
                      </svg>
                    )}
                    <span>TELEMETRY TERMINAL // CSOD_BRIDGE</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${pradaStatus === 'syncing' ? 'bg-amber-500 animate-pulse' : pradaStatus === 'completed' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    <span className="text-[9px] font-bold uppercase">{pradaStatus === 'syncing' ? `syncing: ${pradaPercent}%` : pradaStatus}</span>
                  </div>
                </div>

                {/* Visual side-by-side terminal & telemetry details */}
                <div className="flex-grow grid grid-cols-12 gap-3 min-h-[140px] max-h-[175px]">
                  <div className="col-span-8 flex flex-col gap-1 overflow-y-auto custom-scrollbar rounded-lg bg-slate-950 p-3 shadow-inner border border-slate-900 relative">
                    {/* Holographic scan line overlay */}
                    {pradaStatus === 'syncing' && (
                      <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent h-4 animate-scanline pointer-events-none border-b border-indigo-500/20" />
                    )}

                    {pradaLogs.length === 0 && (
                      <div className="text-slate-500 italic py-8 text-center text-[10px]">
                        Console standby. Click "Execute API Sync" to run live schema sync.
                      </div>
                    )}
                    {pradaLogs.map((log, index) => {
                      if (!log) return null;
                      return (
                        <div key={index} className={`animate-slide-up-fade text-[9px] leading-tight ${log.includes('[SUCCESS]')
                          ? 'text-emerald-400 font-bold'
                          : log.includes('[BUILD]')
                            ? 'text-indigo-300'
                            : log.includes('[AUTH]')
                              ? 'text-violet-300'
                              : 'text-slate-300'
                          }`}>
                          {log}
                        </div>
                      );
                    })}
                  </div>

                  {/* Telemetry info card */}
                  <div className="col-span-4 rounded-lg bg-slate-50 border border-slate-150 p-2.5 flex flex-col justify-between text-[8px] font-mono text-slate-500">
                    <div>
                      <div className="font-black text-slate-700 border-b border-slate-200 pb-1 mb-1 uppercase">API Readout</div>
                      <div>IP: <span className="font-bold text-slate-800">10.240.82.11</span></div>
                      <div>PORT: <span className="font-bold text-slate-800">443 (SSL)</span></div>
                      <div>RATE: <span className="font-bold text-slate-800">9600 BAUD</span></div>
                    </div>
                    <div>
                      <div className="font-black text-slate-700 border-b border-slate-200 pb-1 mb-1 uppercase text-[7px]">COMPRESS RATE</div>
                      <div className="text-xs font-black text-indigo-600">{pradaPercent}%</div>
                    </div>
                  </div>
                </div>

                {pradaStatus === 'completed' && (
                  <div className="bg-emerald-50 border border-emerald-200 p-2 rounded-lg text-emerald-700 flex items-center gap-2 mt-2 animate-spring-pop text-[10px] relative overflow-hidden">
                    <div className="absolute inset-0 bg-emerald-450/10 animate-shockwave rounded-lg pointer-events-none" />
                    <span className="text-xs">✓</span>
                    <span className="font-bold">Sync successful. 12,000 JDs mapped directly to Cornerstone.</span>
                  </div>
                )}
              </div>
            )}

            {/* Nike Sandbox: Progressive Stepper with High-Fidelity Flow */}
            {activeTab === 'nike' && (
              <div className="flex-grow flex flex-col h-full justify-between text-left select-none relative z-10">
                <div className="border-b border-slate-100 pb-2 mb-3 flex items-center justify-between text-slate-400 font-mono text-[11px]">
                  <span>WORKFLOW // progressive_review</span>
                  <span className="text-[9px] font-bold uppercase text-emerald-600">ENFORCED</span>
                </div>

                <div className="flex-grow flex items-center justify-between px-4 relative mb-2 h-24">
                  {/* High-Fidelity Stepper Pipeline Connector Line */}
                  <div className="absolute top-[26px] left-[38px] right-[38px] h-2 -z-10">
                    <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
                      {/* Base track */}
                      <line x1="0" y1="2" x2="100%" y2="2" stroke="#f1f5f9" strokeWidth="4" strokeLinecap="round" />

                      {/* Solid green progress line */}
                      <line
                        x1="0"
                        y1="2"
                        x2={`${nikeParticleLeft}%`}
                        y2="2"
                        stroke="#10b981"
                        strokeWidth="4"
                        strokeLinecap="round"
                        className="transition-all duration-[800ms] cubic-bezier(0.4, 0, 0.2, 1)"
                        style={{ filter: 'drop-shadow(0 0 6px rgba(16,185,129,0.4))' }}
                      />

                      {/* Flowing energy dash inside the green line */}
                      {nikeParticleLeft > 0 && (
                        <line
                          x1="0"
                          y1="2"
                          x2={`${nikeParticleLeft}%`}
                          y2="2"
                          stroke="#ffffff"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray="6 6"
                          className="transition-all duration-[800ms] cubic-bezier(0.4, 0, 0.2, 1) opacity-60"
                          style={{ animation: 'laserFlow 0.8s linear infinite reverse' }}
                        />
                      )}
                    </svg>
                  </div>

                  {/* Glowing Energy Head Particle */}
                  <div className="absolute top-[28px] left-[38px] right-[38px] h-0 z-25 pointer-events-none">
                    <div
                      className="absolute top-0 h-3 w-3 rounded-full bg-emerald-400 border-2 border-white shadow-[0_0_12px_#34d399] transition-all duration-[800ms] cubic-bezier(0.4, 0, 0.2, 1)"
                      style={{
                        left: `${nikeParticleLeft}%`,
                        transform: 'translate(-50%, -50%)',
                        opacity: nikeStep === 3 ? 0 : 1
                      }}
                    >
                      {nikeParticleLeft > 0 && nikeStep !== 3 && (
                        <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" style={{ animationDuration: '1.2s' }} />
                      )}
                    </div>
                  </div>

                  {[
                    { label: 'HR Draft', role: 'HR Manager' },
                    { label: 'Reviewer', role: 'Dept Head' },
                    { label: 'VP Sign', role: 'VP Operations' }
                  ].map((step, idx) => {
                    const isDone = nikeStep > idx;
                    const isActive = nikeStep === idx;
                    return (
                      <div key={idx} className="flex flex-col items-center gap-2 relative">
                        {/* Stepper node with bounce effect */}
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold border-2 transition-all duration-300 relative ${isDone
                          ? 'bg-emerald-500 border-emerald-600 text-white shadow-[0_5px_15px_rgba(16,185,129,0.3)] animate-spring-pop'
                          : isActive
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_5px_15px_rgba(99,102,241,0.35)] scale-[1.08]'
                            : 'bg-white border-slate-200 text-slate-400'
                          }`}>
                          {isDone ? '✓' : idx + 1}

                          {/* Pulsating halo around the active node */}
                          {isActive && (
                            <>
                              <div className="absolute -inset-2 rounded-full border border-indigo-500/40 animate-ping opacity-75" style={{ animationDuration: '2s' }} />
                              <div className="absolute -inset-3 rounded-full border border-dashed border-indigo-500/30 animate-spin-clockwise opacity-50" />
                            </>
                          )}
                        </div>
                        <div className="text-center">
                          <span className={`text-[10px] block font-black uppercase tracking-wider ${isActive ? 'text-indigo-600 scale-[1.03] transition-all' : isDone ? 'text-slate-800' : 'text-slate-400'}`}>
                            {step.label}
                          </span>
                          <span className="text-[8px] font-mono text-slate-400 block">
                            {step.role}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {nikeStep === 3 ? (
                  <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-emerald-800 flex items-center gap-3 animate-spring-pop relative overflow-hidden">
                    <div className="absolute inset-0 bg-emerald-450/10 animate-shockwave rounded-xl pointer-events-none" />
                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold font-mono shadow-md shadow-emerald-500/20">✓</div>
                    <div className="text-left">
                      <div className="text-[10px] font-mono font-black uppercase tracking-wider">WORKFLOW_SLA_COMPLETED</div>
                      <div className="text-[10px] text-slate-600">All digital signatures applied. Document synchronized securely.</div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl flex items-center justify-between text-xs transition-all duration-300">
                    <div className="flex flex-col text-left">
                      <span className="text-[9px] font-mono text-slate-455 uppercase">SLA TRACKER // CURRENT STATE</span>
                      <span className="font-bold text-slate-800">
                        {nikeStep === 0 ? 'Drafting Job Description' : nikeStep === 1 ? 'Pending Manager Endorsement' : 'Awaiting Final VP Signature'}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-black text-indigo-650 animate-pulse uppercase">
                      {nikeStep === 0 ? 'HR Action' : nikeStep === 1 ? 'Manager Action' : 'VP Action'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Bosch Sandbox: Triple Laser-Node Competency Mapper */}
            {activeTab === 'bosch' && (
              <div className="flex-grow flex flex-col h-full justify-between text-left select-none relative z-10">
                <div className="border-b border-slate-100 pb-2 mb-2 flex items-center justify-between text-slate-455 font-mono text-[11px]">
                  <span>ALIGNMENT ENGINE // competency_mapper</span>
                  <span className="text-[9px] font-bold uppercase text-violet-600">AI BRAIN</span>
                </div>

                <div className="flex-grow grid grid-cols-12 gap-2 items-center relative py-1 overflow-hidden">
                  {/* Cybernetic Grid Overlay */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:14px_14px] opacity-[0.25]" />

                  {/* Left Legacy Nodes */}
                  <div className="col-span-4 flex flex-col gap-1.5 z-10">
                    {[
                      { id: 'l1', label: 'Robotics Control' },
                      { id: 'l2', label: 'PLC Programming' },
                      { id: 'l3', label: 'Mechatronics Sys' }
                    ].map((node) => (
                      <div key={node.id} className={`p-2 rounded-lg border text-[9px] font-bold transition-all duration-300 flex flex-col justify-center leading-tight ${boschAnimating
                        ? 'bg-indigo-50 border-indigo-200/50 shadow-[0_3px_8px_rgba(99,102,241,0.05)] scale-[0.98]'
                        : 'bg-white border-slate-200 shadow-sm'
                        }`}>
                        <span className="text-[7px] font-mono text-slate-400 uppercase">Legacy Tag</span>
                        <span className="text-slate-800 truncate">{node.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Middle Connecting Laser Paths */}
                  <div className="col-span-4 h-full w-full relative flex items-center justify-center overflow-visible">
                    <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 100 80">
                      {[
                        { fromY: 15, toY: 15, delay: 0 },
                        { fromY: 40, toY: 40, delay: 0.25 },
                        { fromY: 65, toY: 65, delay: 0.5 }
                      ].map((laser, idx) => {
                        const path = `M 0 ${laser.fromY} C 50 ${laser.fromY}, 50 ${laser.toY}, 100 ${laser.toY}`;
                        return (
                          <g key={idx}>
                            {/* Base connecting track */}
                            <path d={path} fill="none" stroke="#e2e8f0" strokeWidth="1.5" />

                            {/* Self-drawing curved neon laser path */}
                            <path
                              d={path}
                              fill="none"
                              stroke={boschMapped ? '#10b981' : '#6366f1'}
                              strokeWidth="2"
                              className="transition-all duration-[1200ms] cubic-bezier(0.4, 0, 0.2, 1)"
                              style={{
                                strokeDasharray: '120',
                                strokeDashoffset: boschAnimating ? '0' : boschMapped ? '0' : '120',
                                animation: boschAnimating ? 'laserFlow 1.2s linear infinite' : 'none'
                              }}
                            />
                          </g>
                        );
                      })}
                    </svg>
                  </div>

                  {/* Right Target Nodes (Cornerstone Standards) */}
                  <div className="col-span-4 flex flex-col gap-1.5 z-10">
                    {[
                      { id: 'r1', code: 'HRIS-MFG-ROB', match: '99.8%' },
                      { id: 'r2', code: 'HRIS-ENG-PLC', match: '98.5%' },
                      { id: 'r3', code: 'HRIS-MFG-MECH', match: '99.1%' }
                    ].map((node) => (
                      <div key={node.id} className={`p-2 rounded-lg border text-right transition-all duration-300 leading-none flex flex-col justify-center ${boschMapped
                        ? 'bg-emerald-50 border-emerald-250 shadow-[0_3px_8px_rgba(16,185,129,0.08)] scale-[1.02]'
                        : boschAnimating
                          ? 'bg-violet-50 border-violet-200'
                          : 'bg-white border-slate-200'
                        }`}>
                        <div className="flex justify-between items-center gap-1 mb-1">
                          <span className={`text-[7px] font-black tracking-wider font-mono ${boschMapped ? 'text-emerald-700' : 'text-slate-405'}`}>
                            {boschMapped ? 'MAPPED' : 'TARGET'}
                          </span>
                          {boschMapped && (
                            <span className="text-[6.5px] font-mono font-black text-emerald-650 bg-emerald-100 px-1 rounded animate-spring-pop">
                              {node.match}
                            </span>
                          )}
                        </div>
                        <span className={`text-[9px] font-black uppercase block tracking-wide truncate ${boschMapped ? 'text-emerald-800 animate-spring-pop' : 'text-slate-400'}`}>
                          {node.code}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {boschMapped && (
                  <div className="bg-emerald-50 border border-emerald-200 p-2 rounded-lg text-emerald-700 text-[9px] font-mono text-center animate-spring-pop relative overflow-hidden">
                    <div className="absolute inset-0 bg-emerald-450/10 animate-shockwave rounded-lg pointer-events-none" />
                    <span>✓ AI ALIGNMENT COMPLETE: Taxonomy verified.</span>
                  </div>
                )}
              </div>
            )}

            {/* Disney Sandbox: Holographic Brand Scanner */}
            {activeTab === 'disney' && (
              <div className="flex-grow flex flex-col h-full justify-between text-left select-none relative z-10">
                <div className="border-b border-slate-100 pb-2 mb-3 flex items-center justify-between text-slate-400 font-mono text-[11px]">
                  <span>HOLOGRAPHIC SCANNER // brand_compliance</span>
                  <span className="text-[9px] font-bold uppercase text-blue-600">GUARDRAIL STATUS</span>
                </div>

                <div className="flex-grow flex flex-col items-center justify-center relative min-h-[110px] rounded-xl bg-slate-50 border border-slate-150 overflow-hidden p-3 shadow-inner">
                  {/* Holographic Laser Sweep Bar */}
                  {disneyScanning && (
                    <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-sweep-line pointer-events-none z-10 shadow-[0_0_8px_#3b82f6]" />
                  )}

                  {disneyScanning ? (
                    <div className="w-full space-y-2 animate-slide-up-fade">
                      <div className="flex justify-between items-center text-[10px] font-mono font-bold text-blue-600 px-2">
                        <span>SCANNING DOCUMENT DRAFT...</span>
                        <span>{disneyScore}% COMPLETE</span>
                      </div>

                      <div className="space-y-1.5 w-full">
                        <div className={`h-4 rounded border px-2 text-[8px] font-mono font-bold flex items-center justify-between transition-colors duration-200 ${disneyScore >= 35 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-600'
                          }`}>
                          <span>1. TITLE VERIFICATION</span>
                          <span>{disneyScore >= 35 ? 'PASSED ✓' : 'VERIFYING...'}</span>
                        </div>
                        <div className={`h-4 rounded border px-2 text-[8px] font-mono font-bold flex items-center justify-between transition-colors duration-200 ${disneyScore >= 70 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-600'
                          }`}>
                          <span>2. ROLE & COMPENSATORY CLAUSES</span>
                          <span>{disneyScore >= 70 ? 'PASSED ✓' : 'VERIFYING...'}</span>
                        </div>
                        <div className={`h-4 rounded border px-2 text-[8px] font-mono font-bold flex items-center justify-between transition-colors duration-200 ${disneyScore >= 95 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-600'
                          }`}>
                          <span>3. LEGAL COMPLIANCE BRACKETS</span>
                          <span>{disneyScore >= 95 ? 'PASSED ✓' : 'VERIFYING...'}</span>
                        </div>
                      </div>
                    </div>
                  ) : disneyScore === 100 ? (
                    <div className="flex flex-col items-center gap-1.5 animate-spring-pop relative">
                      {/* Shockwave halo */}
                      <div className="absolute w-12 h-12 rounded-full bg-emerald-450/20 border border-emerald-500 animate-shockwave" />

                      <div className="w-11 h-11 rounded-full bg-emerald-500 flex items-center justify-center text-white text-lg font-bold shadow-[0_5px_15px_rgba(16,185,129,0.3)] border border-emerald-600 z-10 animate-spring-pop">
                        🛡
                      </div>
                      <span className="text-emerald-700 font-black tracking-widest text-[11px] font-mono mt-1">100% BRAND COMPLIANT</span>
                      <span className="text-[9px] text-slate-500 font-medium">Compliance locks verified. Document ready for HRIS deploy.</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-400 py-2">
                      <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21a3.745 3.745 0 01-3.297-1.593 3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                      </svg>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Guardrail system standby</span>
                    </div>
                  )}
                </div>

                <div className="text-[9px] font-mono text-slate-400 text-center mt-2">
                  Auto-enforcing guidelines for Disney Entertainment, ESPN, & Pixar.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

// ── Method Section ───────────────────────────────────────────────────────────

const Method = () => {
  return (
    <section className="relative z-10 py-28 bg-white text-slate-900 border-t border-slate-100 overflow-hidden">
      {/* Soft atmospheric lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-50/50 rounded-full filter blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-8 relative z-10">
        <div className="max-w-3xl text-left mb-20">
          <p className="text-[11px] uppercase tracking-[0.28em] text-indigo-600 font-extrabold mb-4 font-mono">
            THE SYSTEM LIFECYCLE
          </p>
          <h2 className="text-4xl lg:text-5xl font-black text-slate-955 leading-tight tracking-tight">
            The TalentForge Pipeline.
          </h2>
          <p className="text-slate-600 mt-4 text-base font-medium leading-relaxed">
            A three-phase, highly integrated pipeline engineered to translate unstructured recruitment text into compliant, synchronized Cornerstone job descriptions.
          </p>
        </div>

        {/* Pipeline horizontal cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">

          {/* Connector line behind for desktop */}
          <div className="hidden md:block absolute top-[120px] left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-indigo-500/15 via-violet-500/15 to-emerald-500/15 -z-10" />

          {/* Phase 1 */}
          <div className="light-liquid-glass p-8 rounded-[32px] flex flex-col justify-between min-h-[400px] text-left group border border-white hover:border-indigo-500/20 hover:shadow-xl transition-all duration-300 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div>
              <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 mb-8 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <span className="text-[10px] font-mono font-black text-indigo-600 tracking-widest uppercase bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">PHASE 01 // ENGINE</span>
              <h3 className="text-2xl font-black text-slate-950 mt-4 mb-3">AI Deconstruction</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Upload unstructured text files or copy old descriptions. Our semantic AI parses the document, extracting core roles, duties, and mapping them directly to official competency catalogs in seconds.
              </p>
            </div>

            <div className="text-[10px] font-mono text-slate-400 font-bold mt-8 border-t border-slate-100 pt-4 flex items-center justify-between">
              <span>LEGACY INGESTION</span>
              <span className="text-indigo-600 font-black tracking-widest">ACTIVE // DECONSTRUCT</span>
            </div>
          </div>

          {/* Phase 2 */}
          <div className="light-liquid-glass p-8 rounded-[32px] flex flex-col justify-between min-h-[400px] text-left group border border-white hover:border-violet-500/20 hover:shadow-xl transition-all duration-300 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div>
              <div className="w-14 h-14 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-600 mb-8 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="text-[10px] font-mono font-black text-violet-600 tracking-widest uppercase bg-violet-50 px-2.5 py-0.5 rounded-full border border-violet-100">PHASE 02 // WORKFLOW</span>
              <h3 className="text-2xl font-black text-slate-950 mt-4 mb-3">Progressive Review</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Enforce a rigid, role-based approval chain. Review nodes lock actions dynamically, track reviewer SLAs, and log all comments in a bulletproof audit timeline with digital signatures.
              </p>
            </div>

            <div className="text-[10px] font-mono text-slate-400 font-bold mt-8 border-t border-slate-100 pt-4 flex items-center justify-between">
              <span>SLA ENFORCEMENT</span>
              <span className="text-violet-600 font-black tracking-widest">ACTIVE // LOCKDOWN</span>
            </div>
          </div>

          {/* Phase 3 */}
          <div className="light-liquid-glass p-8 rounded-[32px] flex flex-col justify-between min-h-[400px] text-left group border border-white hover:border-emerald-500/20 hover:shadow-xl transition-all duration-300 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 mb-8 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-[10px] font-mono font-black text-emerald-600 tracking-widest uppercase bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">PHASE 03 // SYNC</span>
              <h3 className="text-2xl font-black text-slate-950 mt-4 mb-3">Cornerstone Sync</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Connect and push compliant descriptions straight to production HRIS environments with a single click. The API Terminal verifies data mapping, ensuring zero loss and total database parity.
              </p>
            </div>

            <div className="text-[10px] font-mono text-slate-400 font-bold mt-8 border-t border-slate-100 pt-4 flex items-center justify-between">
              <span>ODATA PARITY Sync</span>
              <span className="text-emerald-600 font-black tracking-widest">ACTIVE // TERMINAL</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

// ── Product ────────────────────────────────────────────────────────────────

const Product = () => {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [sourceCount, setSourceCount] = useState('12,482');
  const [targetCount, setTargetCount] = useState('12,482');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setSyncDone(true);
    }, 2000);
  };

  return (
    <section id="product" className="relative z-10 py-24">
      <div className="max-w-7xl mx-auto px-8">
        <Glass className="p-8 lg:p-14">
          {/* Header Grid */}
          <div className="grid lg:grid-cols-12 gap-8 items-start mb-12">
            <div className="lg:col-span-7">
              <FadeIn>
                <SectionLabel>PRODUCT</SectionLabel>
                <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
                  Streamline job description migrations.
                </h2>
                <div className="flex gap-3 mt-8">
                  <SignUpBtn />
                  <a href="#features" className="inline-flex items-center gap-2 text-indigo-100 hover:text-indigo-300 font-semibold px-4 py-2 transition-colors">
                    <Play size={16} className="text-indigo-400 fill-indigo-400" /> Watch Demo
                  </a>
                </div>
              </FadeIn>
            </div>
            <div className="lg:col-span-5 lg:pt-8">
              <FadeIn delay={80}>
                <p className="text-slate-200 leading-relaxed text-sm lg:text-base">
                  Track migration progress through files, APIs, and schemas, ensuring complete data accuracy. Automate mapping and auditing tasks across templates to reduce manual intervention.
                </p>
              </FadeIn>
            </div>
          </div>

          {/* Large Dark Dashboard Widget */}
          <FadeIn delay={120}>
            <div className="bg-slate-950 text-slate-100 rounded-3xl p-6 border border-slate-800 shadow-2xl overflow-hidden">
              <div className="grid lg:grid-cols-12 gap-6">

                {/* Left Sidebar */}
                <div className="lg:col-span-3 border-r border-slate-800/85 pr-4 space-y-2">
                  <div className="flex items-center gap-2 px-3 py-2 text-slate-400 font-bold text-xs uppercase tracking-wider mb-4">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                    TalentForge OS
                  </div>
                  {[
                    { name: 'Dashboard', icon: BarChart3 },
                    { name: 'Schema Mapper', icon: Layers },
                    { name: 'Integrations', icon: Globe },
                    { name: 'Audit Logs', icon: Shield }
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.name}
                        onClick={() => setActiveTab(tab.name)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === tab.name
                          ? 'bg-slate-900 text-white border border-slate-800 shadow-lg'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                          }`}
                      >
                        <Icon size={16} className={activeTab === tab.name ? 'text-indigo-400' : 'text-slate-500'} />
                        {tab.name}
                      </button>
                    );
                  })}
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-9 space-y-6">
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Console / {activeTab}</div>
                      <h3 className="text-xl font-bold text-white mt-1">Migration Console</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search schemas..."
                          className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-350 placeholder-slate-600 focus:outline-none focus:border-indigo-500 w-48 font-mono"
                        />
                      </div>
                      <button className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors relative">
                        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500" />
                        <Bell size={14} />
                      </button>
                    </div>
                  </div>

                  {activeTab === 'Dashboard' && (
                    <div className="grid md:grid-cols-12 gap-6">
                      {/* Chart Area */}
                      <div className="md:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-xs text-slate-500 font-mono">Total JDs Synced</div>
                            <div className="text-3xl font-extrabold text-white mt-1 flex items-baseline gap-2">
                              312,482
                              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">+99.8% Integrity</span>
                            </div>
                          </div>
                          <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-1 text-[10px] font-mono">
                            {['1D', '7D', '1M', '1Y'].map((t) => (
                              <button key={t} className={`px-2 py-1 rounded ${t === '1Y' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>{t}</button>
                            ))}
                          </div>
                        </div>

                        {/* Custom Neon Graph */}
                        <div className="h-44 w-full relative pt-2">
                          <svg className="w-full h-full overflow-visible" viewBox="0 0 100 40" preserveAspectRatio="none">
                            <defs>
                              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
                              </linearGradient>
                              <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#06b6d4" />
                                <stop offset="50%" stopColor="#6366f1" />
                                <stop offset="100%" stopColor="#a855f7" />
                              </linearGradient>
                            </defs>
                            {/* Grid lines */}
                            <line x1="0" y1="10" x2="100" y2="10" stroke="#1e293b" strokeWidth="0.15" strokeDasharray="1,2" />
                            <line x1="0" y1="20" x2="100" y2="20" stroke="#1e293b" strokeWidth="0.15" strokeDasharray="1,2" />
                            <line x1="0" y1="30" x2="100" y2="30" stroke="#1e293b" strokeWidth="0.15" strokeDasharray="1,2" />

                            {/* Glowing area under line */}
                            <path d="M 0 35 Q 20 28, 40 22 T 80 12 T 100 5 L 100 40 L 0 40 Z" fill="url(#chartGrad)" />

                            {/* Line path */}
                            <path d="M 0 35 Q 20 28, 40 22 T 80 12 T 100 5" fill="none" stroke="url(#lineGrad)" strokeWidth="1.2" strokeLinecap="round" className="drop-shadow-[0_2px_8px_rgba(99,102,241,0.5)]" />
                          </svg>
                          <div className="absolute bottom-0 inset-x-0 flex justify-between text-[9px] text-slate-500 font-mono">
                            <span>Q1 2025</span>
                            <span>Q2 2025</span>
                            <span>Q3 2025</span>
                            <span>Q4 2025</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Column Quick-Action */}
                      <div className="md:col-span-5 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
                          <span className="text-xs font-bold text-white uppercase tracking-wider">Sync Quick-Action</span>
                          <span className="text-[10px] text-indigo-400 font-mono">AI Mapper</span>
                        </div>

                        <div className="space-y-3 relative">
                          {/* Box 1 (Legacy) */}
                          <div className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl">
                            <label className="text-[10px] text-slate-500 font-mono">Source Schema</label>
                            <div className="flex items-center justify-between mt-1">
                              <input
                                type="text"
                                value={sourceCount}
                                onChange={(e) => setSourceCount(e.target.value)}
                                className="bg-transparent text-lg font-bold text-white outline-none w-1/2 font-mono"
                              />
                              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-350">
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                Legacy XML
                              </div>
                            </div>
                          </div>

                          {/* Swap icon */}
                          <div className="absolute left-1/2 top-[50%] -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-indigo-600 border-4 border-slate-950 flex items-center justify-center text-white cursor-pointer hover:bg-indigo-500 transition-colors z-10">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                          </div>

                          {/* Box 2 (HRIS) */}
                          <div className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl mt-4">
                            <label className="text-[10px] text-slate-500 font-mono">Target Endpoint</label>
                            <div className="flex items-center justify-between mt-1">
                              <input
                                type="text"
                                value={isSyncing ? 'Syncing...' : syncDone ? targetCount : 'Ready'}
                                readOnly
                                className="bg-transparent text-lg font-bold text-indigo-400 outline-none w-1/2 font-mono"
                              />
                              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-350">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                HRIS API
                              </div>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={handleSync}
                          disabled={isSyncing}
                          className="w-full mt-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-indigo-900/30"
                        >
                          {isSyncing ? (
                            <>
                              <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              Mapping Structures...
                            </>
                          ) : syncDone ? (
                            'Execute AI Mapping ✓'
                          ) : (
                            'Execute AI Mapping >'
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Active Pipelines & Repartition */}
                  {activeTab === 'Dashboard' && (
                    <div className="grid md:grid-cols-12 gap-6 border-t border-slate-850 pt-6">
                      <div className="md:col-span-7 space-y-3">
                        <span className="text-xs font-bold text-white uppercase tracking-wider block">Active Connectors</span>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-xs">
                            <div className="flex items-center gap-2.5">
                              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="font-mono text-slate-300">Legacy Cloud Legacy API</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">1.2s response time</span>
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-xs">
                            <div className="flex items-center gap-2.5">
                              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                              <span className="font-mono text-slate-350">HRIS Production Endpoint</span>
                            </div>
                            <span className="text-[10px] text-indigo-400 font-mono">Connected & Audited</span>
                          </div>
                        </div>
                      </div>

                      <div className="md:col-span-5 space-y-3">
                        <span className="text-xs font-bold text-white uppercase tracking-wider block">Schema Repartition</span>
                        <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl space-y-3 text-xs">
                          <div>
                            <div className="flex justify-between mb-1 text-slate-450 font-mono text-[10px]">
                              <span>Parsed Templates</span>
                              <span>82%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500" style={{ width: '82%' }} />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between mb-1 text-slate-450 font-mono text-[10px]">
                              <span>AI Enrichment</span>
                              <span>12%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500" style={{ width: '12%' }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab !== 'Dashboard' && (
                    <div className="h-64 flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-800 rounded-2xl font-mono text-xs">
                      <Layers className="w-8 h-8 text-slate-700 mb-3 animate-pulse" />
                      Loading {activeTab} view...
                    </div>
                  )}

                </div>
              </div>
            </div>
          </FadeIn>
        </Glass>
      </div>
    </section>
  );
};

// ── Workflow (remaining steps) ─────────────────────────────────────────────

const ThreeDTimelineCard = ({ step, index }) => {
  const cardRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const isRight = index % 2 === 1;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.05 }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Calculate how far the card is from the center of the viewport (-1 to 1)
      const cardCenter = rect.top + rect.height / 2;
      const progress = (cardCenter - viewportHeight / 2) / (viewportHeight / 2);

      const clampedProgress = Math.max(-1.5, Math.min(1.5, progress));

      // 3D rotations:
      // Rotate X based on scroll
      const rotateX = clampedProgress * -7;
      // Rotate Y: V-shaped book angle facing the center timeline, plus scroll flex
      const isMobile = window.innerWidth < 1024;
      const baseRotateY = isMobile ? -6 : (isRight ? -11 : 11);
      const rotateY = baseRotateY + (clampedProgress * 3.5);

      const translateZ = Math.abs(clampedProgress) * -35;
      const scale = 1 - Math.min(0.06, Math.abs(clampedProgress) * 0.03);
      const opacity = isVisible ? (1 - Math.min(0.25, Math.abs(clampedProgress) * 0.15)) : 0;

      cardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(${translateZ}px) scale(${scale})`;
      cardRef.current.style.opacity = `${opacity}`;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isRight, isVisible]);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cardRef.current.style.setProperty('--mouse-x', `${x}px`);
    cardRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className="group relative p-7 lg:p-8 rounded-[32px] bg-white/[0.06] backdrop-blur-[28px] saturate-[220%] border border-white/[0.18] border-t-white/[0.45] border-l-white/[0.3] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.4),inset_0_-1px_20px_0_rgba(255,255,255,0.05),0_0_25px_1px_rgba(99,102,241,0.05)] hover:bg-white/[0.09] hover:border-t-white/[0.6] hover:border-l-white/[0.4] hover:shadow-[0_35px_75px_-10px_rgba(0,0,0,0.45),inset_0_1.5px_0_0_rgba(255,255,255,0.55),inset_0_-1px_30px_0_rgba(255,255,255,0.08),0_0_35px_2px_rgba(99,102,241,0.09)] transition-all duration-300 ease-out overflow-hidden"
      style={{
        transformStyle: 'preserve-3d',
        transition: 'transform 0.15s ease-out, opacity 0.25s ease-out, border-color 0.4s, background-color 0.4s, box-shadow 0.4s',
        willChange: 'transform, opacity'
      }}
    >
      {/* Glowing holographic dot-matrix tech grid */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.4] group-hover:opacity-[0.65] transition-opacity duration-500"
        style={{
          backgroundImage: 'radial-gradient(rgba(165, 180, 252, 0.08) 1px, transparent 1px)',
          backgroundSize: '16px 16px'
        }}
      />

      {/* Left edge neon glowing accent rail */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 rounded-r-full bg-gradient-to-b from-indigo-400 via-purple-500 to-pink-500 group-hover:h-16 transition-all duration-500 ease-out shadow-[0_0_8px_rgba(129,116,244,0.8)]" />

      {/* Sleek diagonal glare sheen sweep */}
      <div
        className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.04), transparent)',
        }}
      />

      {/* Radial spotlight tracking hover */}
      <div
        className="absolute -inset-px rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `radial-gradient(350px circle at var(--mouse-x, 0px) var(--mouse-y, 0px), rgba(129, 116, 244, 0.06), transparent 80%)`,
        }}
      />

      {/* Header Container */}
      <div className="flex items-center justify-between mb-6 relative z-10" style={{ transform: 'translateZ(25px)' }}>
        {/* Step Badge with pulsing active process LED */}
        <span className="text-[10px] font-bold text-indigo-200 font-mono bg-slate-950/60 px-2.5 py-1 rounded-md border border-indigo-500/20 shadow-inner flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]" />
          STEP {step.id}
        </span>

        {/* Circular Icon Socket */}
        <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-indigo-600/15 group-hover:border-indigo-500/30 transition-all duration-300">
          <step.icon size={16} className="text-indigo-300 group-hover:text-indigo-200 group-hover:scale-110 transition-all duration-300 drop-shadow-[0_0_6px_rgba(165,180,252,0.3)]" />
        </div>
      </div>

      {/* Title */}
      <h3 className="text-white font-semibold text-lg mb-2.5 tracking-tight group-hover:text-white transition-colors relative z-10" style={{ transform: 'translateZ(35px)' }}>
        {step.title}
      </h3>

      {/* Description */}
      <p className="text-white/80 text-[13.5px] leading-relaxed group-hover:text-white transition-colors relative z-10" style={{ transform: 'translateZ(15px)' }}>
        {step.desc}
      </p>
    </div>
  );
};

const Workflow = () => {
  const steps = siteData.workflow.steps;
  const timelineRef = useRef(null);
  const lineRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!timelineRef.current || !lineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Calculate scroll progress through the timeline
      const start = viewportHeight / 2;
      const totalHeight = rect.height;
      const current = start - rect.top;
      const progress = Math.max(0, Math.min(1, current / totalHeight));

      lineRef.current.style.height = `${progress * 100}%`;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <section id="workflow" className="relative z-10 py-32 overflow-hidden">
      {/* Subtle depth-gradient spotlight background */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.03)_0%,transparent_70%)] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-8">
        <FadeIn className="text-center mb-20">
          <SectionLabel>{siteData.workflow.badge}</SectionLabel>
          <h2 className="text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
            {siteData.workflow.title}
          </h2>
          <p className="text-white mt-4 text-base max-w-2xl mx-auto leading-relaxed">
            {siteData.workflow.subtitle}
          </p>
        </FadeIn>

        {/* The Timeline Container */}
        <div ref={timelineRef} className="relative mt-24 max-w-5xl mx-auto">

          {/* Center vertical line track */}
          <div className="absolute left-4 lg:left-1/2 top-0 bottom-0 w-[2px] bg-white/[0.06] -translate-x-1/2 z-0" />

          {/* Glowing active scroll progress laser line */}
          <div
            ref={lineRef}
            className="absolute left-4 lg:left-1/2 top-0 w-[2px] bg-white -translate-x-1/2 shadow-[0_0_15px_#ffffff,_0_0_8px_rgba(129,116,244,0.6)] z-10 transition-all duration-100 ease-out"
            style={{ height: '0%' }}
          />

          {/* Steps list */}
          <div className="space-y-16 lg:space-y-28">
            {steps.map((step, idx) => {
              const isRight = idx % 2 === 1;
              return (
                <div key={step.id} className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-center group">

                  {/* Glowing junction node on the timeline */}
                  <div className="absolute left-4 lg:left-1/2 top-8 lg:top-1/2 w-4 h-4 rounded-full bg-slate-950 border-2 border-white/30 -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center transition-all duration-300 group-hover:border-white group-hover:scale-110">
                    <div className="w-1.5 h-1.5 rounded-full bg-white transition-colors shadow-[0_0_8px_#ffffff]" />
                  </div>

                  {/* Card container column */}
                  <div className={`pl-12 lg:pl-0 lg:col-span-6 ${isRight ? 'lg:col-start-7' : 'lg:text-right lg:col-start-1'}`}>
                    <ThreeDTimelineCard step={step} index={idx} />
                  </div>

                  {/* Step giant holographic background number (only on desktop) */}
                  <div className={`hidden lg:flex lg:col-span-5 items-center justify-center ${isRight ? 'lg:col-start-1 lg:row-start-1 text-right' : 'lg:col-start-7 text-left'}`}>
                    <span className="font-mono text-[9rem] font-black text-white/[0.12] tracking-tighter select-none transition-all duration-500 group-hover:text-indigo-300/[0.22] group-hover:scale-105">
                      {step.id}
                    </span>
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      </div>
    </section>
  );
};

// ── AI Generator ───────────────────────────────────────────────────────────

const AIGenerator = () => {
  const presets = [
    {
      id: "graphics",
      title: "Senior 3D React Engineer",
      dept: "Engineering",
      salary: "$140K – $180K",
      rating: 98,
      themeColor: "from-indigo-500 via-purple-500 to-indigo-600",
      shadowGlow: "rgba(99,102,241,0.2)",
      skills: ["React 19", "Three.js", "WebGL & GLSL", "Custom Shaders"],
      userMsg: "Optimize this JD for 3D WebGL graphics and performance tuning.",
      aiMsg: "Ingesting parameters... Added Three.js, WebGL render pipelines, and custom shader compilation. Compliance audit passed. Target match score is 98%."
    },
    {
      id: "database",
      title: "Principal Infrastructure Architect",
      dept: "Operations",
      salary: "$155K – $195K",
      rating: 95,
      themeColor: "from-amber-500 via-orange-500 to-red-600",
      shadowGlow: "rgba(245,158,11,0.2)",
      skills: ["Data Migration", "API APIs", "SaaS Auditing", "Schema Design"],
      userMsg: "Structure this JD for zero-loss database migrations and API APIs.",
      aiMsg: "Recalculating specifications... Integrated schema auditing, fail-safe API endpoints, and transactional migration compliance. Match score is 95%."
    },
    {
      id: "ai",
      title: "AI Research Scientist",
      dept: "AI Lab",
      salary: "$175K – $230K",
      rating: 99,
      themeColor: "from-emerald-500 via-teal-500 to-cyan-600",
      shadowGlow: "rgba(16,185,129,0.2)",
      skills: ["LLM Fine-Tuning", "RAG Workflows", "Vector DBs", "PyTorch Models"],
      userMsg: "Configure this JD for LLM fine-tuning and retrieval-augmented generation (RAG).",
      aiMsg: "Injecting neural parameters... Added PyTorch models, vector database indexing, and fine-tuning pipelines. Compliance verified. Match score is 99%."
    }
  ];

  const [activePreset, setActivePreset] = useState(0);
  const [chatMessages, setChatMessages] = useState([
    { sender: "ai", text: "Hello! I am ForgeAI, your conversational job architect. Select one of the optimization blueprints below to compile your custom specifications:" }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [cardFlash, setCardFlash] = useState(false);

  const sectionRef = useRef(null);
  const cardRef = useRef(null);
  const gridRef = useRef(null);
  const hasTriggeredRef = useRef(false);

  // Trigger Chat & Card Morph Action
  const handlePresetSelect = (idx) => {
    if (isTyping) return;
    setActivePreset(idx);

    // Add User Message to Chat
    setChatMessages(prev => [
      ...prev,
      { sender: "user", text: presets[idx].userMsg }
    ]);

    setIsTyping(true);

    // Simulate AI thinking & typing
    setTimeout(() => {
      setIsTyping(false);
      setCardFlash(true);
      setChatMessages(prev => [
        ...prev,
        { sender: "ai", text: presets[idx].aiMsg }
      ]);

      // Remove flash highlight
      setTimeout(() => setCardFlash(false), 600);
    }, 900);
  };

  // 1. Scroll-triggered welcome sequence
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasTriggeredRef.current) {
          hasTriggeredRef.current = true;
          // Run initial automated interaction
          setTimeout(() => {
            handlePresetSelect(0);
          }, 600);
        }
      },
      { threshold: 0.15 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  // 2. Scroll-linked 3D Layered Explosion Parallax
  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current || !cardRef.current || !gridRef.current) return;

      const rect = sectionRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Calculate scroll progress ratio for the section
      // 0 when section enters screen, 1 when it leaves
      const entrance = viewportHeight - rect.top;
      const range = viewportHeight + rect.height;
      const progress = Math.max(0, Math.min(1, entrance / range));

      // Rotations and translations
      const rotateX = -10 + progress * 20; // -10deg to +10deg
      const rotateY = -12 + progress * 24; // -12deg to +12deg

      // Explosive separation: peaks at the center of the screen
      const explodeDepth = Math.sin(progress * Math.PI) * 65; // Peak Z-separation of 65px

      // Grid movement
      const gridOffset = progress * 120;

      // Direct DOM manipulation for buttery smooth 60fps performance
      cardRef.current.style.transform = `perspective(1600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      cardRef.current.style.setProperty('--explode-depth', `${explodeDepth}px`);

      gridRef.current.style.transform = `rotateX(65deg) scale(1.6) translateY(${gridOffset}px)`;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Run once to initialize
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const currentPreset = presets[activePreset];

  return (
    <section
      ref={sectionRef}
      id="ai-generator"
      className="relative z-10 py-32 bg-white border-y border-slate-100 overflow-hidden"
    >

      <style>{`
        @keyframes typingDots {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .typing-dot {
          animation: typingDots 1s infinite ease-in-out;
        }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        
        .spec-card-pulse {
          transition: transform 0.1s ease-out, box-shadow 0.4s ease-out;
        }
        .spec-card-flash {
          box-shadow: 0 0 40px var(--flash-glow, rgba(99,102,241,0.25)) !important;
        }


      `}</style>

      {/* 3D Perspective Grid System Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-45">
        <div
          ref={gridRef}
          className="w-[200%] h-[200%] absolute -left-1/2 -top-1/2 origin-center transition-transform duration-100 ease-out"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(99, 102, 241, 0.05) 1.5px, transparent 1.5px),
              linear-gradient(to bottom, rgba(99, 102, 241, 0.05) 1.5px, transparent 1.5px)
            `,
            backgroundSize: '48px 48px',
            transform: 'rotateX(65deg) scale(1.6) translateY(0px)',
            transformStyle: 'preserve-3d'
          }}
        />
      </div>

      {/* Lighting radial gradients */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.025)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute -left-48 top-1/4 w-96 h-96 rounded-full bg-indigo-400/[0.04] blur-[120px] pointer-events-none animate-pulse duration-[8000ms]" />
      <div className="absolute -right-48 bottom-1/4 w-96 h-96 rounded-full bg-violet-400/[0.04] blur-[120px] pointer-events-none animate-pulse duration-[6000ms]" />



      <div className="relative z-10 max-w-7xl mx-auto px-8">
        <div className="grid lg:grid-cols-12 gap-12 items-center">

          {/* Left Column: Conversational AI Agent Console */}
          <div className="lg:col-span-6 flex flex-col justify-center text-left">
            <FadeIn>
              <span className="text-[11px] font-extrabold text-indigo-600 font-mono tracking-wider bg-indigo-50 border border-indigo-100 px-3.5 py-1.5 rounded-full w-fit shadow-sm shadow-indigo-100/10 uppercase">
                {siteData.aiGenerator.badge}
              </span>
              <h2 className="text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mt-5">
                AI Job Architect
              </h2>
              <p className="text-slate-600 mt-4 leading-relaxed text-sm md:text-base font-normal">
                Collaborate with our conversational agent to architect compliant, high-performance job roles. Select a prompt action below to command the AI agent.
              </p>
            </FadeIn>

            {/* Chat Log Console Container */}
            <div className="mt-8 bg-slate-50/70 border border-slate-200/50 rounded-3xl p-5 shadow-inner relative z-10">
              <div className="h-[250px] overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-slate-200">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs md:text-sm font-medium leading-relaxed border ${msg.sender === 'user'
                        ? 'bg-slate-800 border-slate-750 text-white shadow-sm'
                        : 'bg-white border-slate-200/60 text-slate-800 shadow-sm'
                        }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex justify-start animate-fadeIn">
                    <div className="bg-white border border-slate-200/60 text-slate-400 rounded-2xl px-4 py-3.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full typing-dot" />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full typing-dot" />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full typing-dot" />
                    </div>
                  </div>
                )}
              </div>

              {/* Spark Prompt Actions */}
              <div className="border-t border-slate-200/60 pt-4 mt-4">
                <span className="text-[9px] font-bold text-slate-400 font-mono tracking-wider uppercase block mb-2.5">
                  Select Prompt Blueprint:
                </span>
                <div className="flex flex-wrap gap-2">
                  {presets.map((preset, idx) => (
                    <button
                      key={preset.id}
                      onClick={() => handlePresetSelect(idx)}
                      disabled={isTyping}
                      className={`px-4 py-2.5 rounded-full border text-xs font-bold transition-all duration-300 flex items-center gap-2 ${activePreset === idx
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-900 shadow-sm'
                        : 'bg-white border-slate-200/80 text-slate-500 hover:bg-slate-50 hover:text-slate-850'
                        }`}
                    >
                      <Sparkles size={12} className={activePreset === idx ? 'text-indigo-600' : 'text-slate-400'} />
                      {preset.id === 'graphics' ? '3D Graphics Focus' : preset.id === 'database' ? 'Database & APIs' : 'LLM & AI Focus'}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Right Column: Morphing Job Spec Blueprint Card with Layered 3D Depth Explosion */}
          <div className="lg:col-span-6 flex items-center justify-center relative min-h-[520px]" style={{ perspective: '1600px' }}>

            {/* The 3D Layered Card Container */}
            <div
              ref={cardRef}
              className={`spec-card-pulse w-full max-w-[480px] bg-white/95 border border-slate-200/85 rounded-[36px] p-8 relative overflow-hidden transition-all duration-100 text-left ${cardFlash ? 'spec-card-flash' : ''
                }`}
              style={{
                transformStyle: 'preserve-3d',
                transform: 'perspective(1600px) rotateX(0deg) rotateY(0deg)',
                boxShadow: '0 30px 80px rgba(15,23,42,0.05)',
                willChange: 'transform',
                '--flash-glow': presets[activePreset].shadowGlow
              }}
            >
              {/* Dynamic Theme Radial Glow Background Layer (translateZ deep) */}
              <div
                className={`absolute inset-0 filter blur-[40px] opacity-15 -z-10 transition-all duration-700 bg-gradient-to-r ${currentPreset.themeColor}`}
                style={{
                  transform: 'translateZ(-35px) scale(0.95)',
                  pointerEvents: 'none'
                }}
              />

              {/* Abstract structural grid watermark on the base plate */}
              <div
                className="absolute inset-0 opacity-[0.025] bg-[linear-gradient(to_right,#818cf8_1px,transparent_1px),linear-gradient(to_bottom,#818cf8_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none"
                style={{ transform: 'translateZ(-10px)' }}
              />

              {/* 3D LAYER 1: Header Specs & Est Salary (translateZ: 20px to 45px) */}
              <div
                className="transition-transform duration-100 ease-out"
                style={{
                  transform: 'translateZ(calc(var(--explode-depth, 0px) * 0.45))',
                  transformStyle: 'preserve-3d'
                }}
              >
                <div className="flex items-start justify-between border-b border-slate-100 pb-6 mb-6">
                  <div className="space-y-2">
                    <span className="text-[9px] font-extrabold text-indigo-600 font-mono bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded tracking-wider uppercase inline-block">
                      ACTIVE BLUEPRINT SPEC
                    </span>
                    <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-tight pt-1">
                      {currentPreset.title}
                    </h3>

                    <div className="flex items-center gap-3 text-xs font-bold text-slate-400 pt-0.5">
                      <span>Dept: {currentPreset.dept}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <span>Est: {currentPreset.salary}</span>
                    </div>
                  </div>

                  {/* Active Status Badge */}
                  <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-1 shadow-sm shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-extrabold text-emerald-700 font-mono tracking-wider uppercase">
                      ACTIVE
                    </span>
                  </div>
                </div>
              </div>

              {/* 3D LAYER 2: Target Match Slider (translateZ: 35px to 70px) */}
              <div
                className="space-y-1.5 mb-6 transition-transform duration-100 ease-out"
                style={{
                  transform: 'translateZ(calc(var(--explode-depth, 0px) * 0.7))',
                  transformStyle: 'preserve-3d'
                }}
              >
                <div className="flex justify-between text-[10px] font-extrabold text-slate-400 font-mono uppercase tracking-wider">
                  <span>Architectural Target Match</span>
                  <span className="text-slate-800 font-black">{currentPreset.rating}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/35 shadow-inner">
                  <div
                    className={`h-full bg-gradient-to-r ${currentPreset.themeColor} rounded-full transition-all duration-750 ease-out`}
                    style={{ width: `${currentPreset.rating}%` }}
                  />
                </div>
              </div>

              {/* 3D LAYER 3: Core Competencies Grid (translateZ: 50px to 95px) */}
              <div
                className="space-y-3 mb-6 transition-transform duration-100 ease-out"
                style={{
                  transform: 'translateZ(calc(var(--explode-depth, 0px) * 0.95))',
                  transformStyle: 'preserve-3d'
                }}
              >
                <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider block">
                  Required Core Competencies
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  {currentPreset.skills.map((skill) => (
                    <div
                      key={skill}
                      className="flex items-center gap-2.5 bg-slate-50/70 border border-slate-200/60 rounded-2xl p-3 shadow-sm hover:bg-slate-100/60 hover:scale-[1.02] transition-all duration-300"
                    >
                      <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${currentPreset.themeColor} shadow-sm shrink-0`} />
                      <span className="text-xs font-bold text-slate-700 truncate">
                        {skill}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3D LAYER 4: Compliance & Auditing Badges (translateZ: 65px to 120px) */}
              <div
                className="border-t border-slate-100 pt-5 flex items-center justify-between transition-transform duration-100 ease-out"
                style={{
                  transform: 'translateZ(calc(var(--explode-depth, 0px) * 1.2))',
                  transformStyle: 'preserve-3d'
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100/60 flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div className="leading-none">
                    <span className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-wider block">
                      COMPLIANCE AUDIT
                    </span>
                    <span className="text-xs font-extrabold text-slate-800">
                      100% Verified Spec
                    </span>
                  </div>
                </div>

                <span className="text-[9px] font-extrabold text-slate-400 font-mono tracking-wider uppercase">
                  SECURED BY TALENTFORGE
                </span>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

// ── Features Section ─────────────────────────────────────────────────────────

// ── Bento Grid Interactive Features Matrix ───────────────────────────────────

const Features = () => {
  // ── 1. Schema Mapper State
  const [mapperSelectedSource, setMapperSelectedSource] = useState(null);
  const [mapperConnections, setMapperConnections] = useState([]); // Array of [sourceIdx, targetIdx]
  const [mapperSuccess, setMapperSuccess] = useState(false);

  const mapperSources = ["legacy_description", "competency_scale", "legacy_department_id"];
  const mapperTargets = ["csod_jd_text", "csod_competency_weight", "csod_cost_center"];

  const handleMapperClick = (type, idx) => {
    if (type === "source") {
      setMapperSelectedSource(idx);
    } else if (type === "target" && mapperSelectedSource !== null) {
      // Create connection
      if (!mapperConnections.some(c => c[0] === mapperSelectedSource || c[1] === idx)) {
        const newConnections = [...mapperConnections, [mapperSelectedSource, idx]];
        setMapperConnections(newConnections);
        setMapperSelectedSource(null);

        // If all 3 connected, trigger success
        if (newConnections.length === 3) {
          setMapperSuccess(true);
        }
      }
    }
  };

  const resetMapper = () => {
    setMapperConnections([]);
    setMapperSelectedSource(null);
    setMapperSuccess(false);
  };

  // ── 2. Competency Explorer State
  const [competencyCategory, setCompetencyCategory] = useState("technical");
  const [competencyLang, setCompetencyLang] = useState("EN");
  const [competencySearch, setCompetencySearch] = useState("");

  const competencyDatabase = {
    technical: [
      { EN: "Cloud Architecture Schema Mapping", ES: "Mapeo de Arquitectura en la Nube", JA: "クラウドアーキテクチャスキーママッピング" },
      { EN: "Valkyrie Security Encryption Pipeline", ES: "Canal de Cifrado de Seguridad Valkyrie", JA: "Valkyrieセキュリティ暗号化パイプライン" },
      { EN: "REST API API Schema Synthesizer", ES: "Sintetizador de Esquema API REST", JA: "REST API APIスキーマシンセサイザー" }
    ],
    leadership: [
      { EN: "Cross-Functional Talent Sync", ES: "Sincronización de Talento Interfuncional", JA: "部門間タレント同期" },
      { EN: "Strategic Schema Migration Governance", ES: "Gobernanza Estratégica de Migración", JA: "戦略的スキーマ移行ガバナンス" }
    ],
    operations: [
      { EN: "Zero-Loss Database Auditing Procedures", ES: "Procedimientos de Auditoría de Base de Datos", JA: "ゼロロスデータベース監査手順" },
      { EN: "Automated Rollback Risk Mitigation", ES: "Mitigación Automatizada de Riesgos de Reversión", JA: "自動ロールバックリスク軽減" }
    ]
  };

  // ── 3. Approval Chain State
  const [approvalStep, setApprovalStep] = useState(0); // 0: idle, 1: drafting, 2: reviewing, 3: manager, 4: complete
  const [approvalSimulating, setApprovalSimulating] = useState(false);

  const triggerApprovalSim = () => {
    if (approvalSimulating) return;
    setApprovalSimulating(true);
    setApprovalStep(0);

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      setApprovalStep(currentStep);
      if (currentStep === 4) {
        clearInterval(interval);
        setApprovalSimulating(false);
      }
    }, 1200);
  };

  // ── 4. HRIS Export Terminal State
  const [terminalStatus, setTerminalStatus] = useState("idle"); // idle, compiling, syncing, verified
  const [terminalProgress, setTerminalProgress] = useState(0);
  const [terminalLines, setTerminalLines] = useState([]);
  const termProgressRef = useRef(null);
  const termLogRef = useRef(null);

  const startTerminalSync = () => {
    if (terminalStatus !== "idle" && terminalStatus !== "verified") return;

    if (termLogRef.current) clearInterval(termLogRef.current);
    if (termProgressRef.current) clearInterval(termProgressRef.current);

    setTerminalStatus("compiling");
    setTerminalProgress(0);
    setTerminalLines(["[COMPILE] Packaging XML schemas...", "[COMPILE] Compiling competency weights..."]);

    const logs = [
      "[CRYPT] Signing payload with system certificate...",
      "[HANDSHAKE] Establishing connection with Cornerstone API API...",
      "[SYNC] Handshake accepted. Pushing 12,482 competency records...",
      "[SYNC] Database records push in progress...",
      "[SYNC] Verifying relational integrity hashes...",
      "[SUCCESS] Sync complete. Zero-loss migration report generated."
    ];

    let logIdx = 0;
    termLogRef.current = setInterval(() => {
      if (logIdx < logs.length) {
        setTerminalLines(prev => [...prev, logs[logIdx]]);
        logIdx++;
      } else {
        clearInterval(termLogRef.current);
      }
    }, 700);

    termProgressRef.current = setInterval(() => {
      setTerminalProgress(prev => {
        if (prev >= 100) {
          clearInterval(termProgressRef.current);
          setTerminalStatus("verified");
          return 100;
        }
        return prev + 2;
      });
    }, 100);
  };

  const resetTerminal = () => {
    setTerminalStatus("idle");
    setTerminalProgress(0);
    setTerminalLines([]);
    if (termProgressRef.current) clearInterval(termProgressRef.current);
    if (termLogRef.current) clearInterval(termLogRef.current);
  };

  useEffect(() => {
    return () => {
      if (termProgressRef.current) clearInterval(termProgressRef.current);
      if (termLogRef.current) clearInterval(termLogRef.current);
    };
  }, []);

  return (
    <section
      id="features"
      className="relative py-32 bg-transparent overflow-hidden z-10"
    >
      {/* Textured SVG Fine-Grain Overlay */}
      <div className="noise-bg absolute inset-0 opacity-[0.025] pointer-events-none z-0" />

      <div className="max-w-7xl mx-auto px-8 relative z-10">

        {/* Section Headers */}
        <div className="text-center mb-20">
          <p className="text-[10px] uppercase tracking-[0.35em] text-white font-extrabold font-mono mb-3">
            {siteData.features.badge}
          </p>
          <h2 className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight max-w-3xl mx-auto">
            {siteData.features.title}
          </h2>
        </div>

        {/* ── INTERACTIVE BENTO GRID MATRIX ──────────────────────────────────── */}
        <div className="grid lg:grid-cols-12 gap-6 items-stretch">

          {/* BENTO BLOCK 1: Multi-Source Schema Mapper (7 Cols) */}
          <div className="lg:col-span-7 liquid-glass rounded-[36px] p-6 lg:p-8 flex flex-col justify-between relative overflow-hidden group min-h-[400px]">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700" />

            <div className="w-full text-left">
              <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/25 border border-indigo-400/40 flex items-center justify-center text-indigo-200">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </div>
                  <span className="text-[10px] font-black text-indigo-200 font-mono tracking-wider uppercase">SCHEMA MAPPER</span>
                </div>

                {mapperSuccess ? (
                  <span className="text-[10px] font-black font-mono text-emerald-400 uppercase tracking-wider animate-pulse">100% SCHEMA ALIGNED</span>
                ) : (
                  <span className="text-[9px] font-black font-mono text-indigo-200/80 uppercase tracking-wider">MAP LEGACY TO HRIS FIELDS</span>
                )}
              </div>

              <p className="text-white font-black text-xl tracking-tight mb-2">Multi-Source Field Mapper</p>
              <p className="text-slate-100/95 text-xs font-semibold leading-relaxed mb-8 max-w-lg">Click a legacy source on the left, then connect it to its corresponding target field on the right to verify structural synchronization.</p>

              {/* Mapper Sandbox Grid */}
              <div className="grid grid-cols-12 gap-4 items-center relative py-2">

                {/* SVG Connection Lines Overlay */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
                  {mapperConnections.map(([srcIdx, tgtIdx], i) => {
                    const srcElement = document.getElementById(`mapper-src-${srcIdx}`);
                    const tgtElement = document.getElementById(`mapper-tgt-${tgtIdx}`);
                    if (!srcElement || !tgtElement) return null;

                    const container = srcElement.offsetParent;
                    if (!container) return null;

                    const srcBox = srcElement.getBoundingClientRect();
                    const tgtBox = tgtElement.getBoundingClientRect();
                    const containerBox = container.getBoundingClientRect();

                    const x1 = srcBox.right - containerBox.left;
                    const y1 = (srcBox.top + srcBox.bottom) / 2 - containerBox.top;
                    const x2 = tgtBox.left - containerBox.left;
                    const y2 = (tgtBox.top + tgtBox.bottom) / 2 - containerBox.top;

                    return (
                      <g key={i}>
                        <path
                          d={`M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`}
                          fill="none"
                          stroke="url(#mapperGrad)"
                          strokeWidth="3.5"
                          className="animate-svg-dash shadow-[0_0_15px_rgba(129,140,248,0.5)]"
                        />
                        <circle cx={x2} cy={y2} r="4" className="fill-indigo-300 shadow-lg" />
                      </g>
                    );
                  })}
                  <defs>
                    <linearGradient id="mapperGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#818cf8" />
                      <stop offset="50%" stopColor="#ec4899" />
                      <stop offset="100%" stopColor="#34d399" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Left Legacy Sources */}
                <div className="col-span-5 space-y-3 z-10">
                  {mapperSources.map((src, idx) => {
                    const isConnected = mapperConnections.some(c => c[0] === idx);
                    const isSelected = mapperSelectedSource === idx;
                    return (
                      <button
                        key={idx}
                        id={`mapper-src-${idx}`}
                        onClick={() => !isConnected && handleMapperClick("source", idx)}
                        className={`w-full p-3.5 rounded-2xl text-left text-[11px] font-mono font-bold border tracking-wide transition-all ${isConnected
                          ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                          : isSelected
                            ? "bg-indigo-600/30 border-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                            : "bg-white/[0.08] hover:bg-white/[0.14] border-white/[0.15] hover:border-white/25 text-slate-100 shadow-sm"
                          }`}
                      >
                        {src}
                      </button>
                    );
                  })}
                </div>

                {/* Center Spacer */}
                <div className="col-span-2 flex justify-center text-white/40 select-none font-black font-mono">
                  &gt;&gt;
                </div>

                {/* Right Target Fields */}
                <div className="col-span-5 space-y-3 z-10">
                  {mapperTargets.map((tgt, idx) => {
                    const isConnected = mapperConnections.some(c => c[1] === idx);
                    return (
                      <button
                        key={idx}
                        id={`mapper-tgt-${idx}`}
                        onClick={() => !isConnected && handleMapperClick("target", idx)}
                        className={`w-full p-3.5 rounded-2xl text-left text-[11px] font-mono font-bold border tracking-wide transition-all ${isConnected
                          ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                          : "bg-white/[0.08] hover:bg-white/[0.14] border-white/[0.15] hover:border-white/25 text-slate-100 shadow-sm"
                          }`}
                      >
                        {tgt}
                      </button>
                    );
                  })}
                </div>

              </div>
            </div>

            {/* Success Overlay Panel */}
            {mapperSuccess && (
              <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-md flex flex-col items-center justify-center gap-3 animate-fadeIn z-30">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                </div>
                <div className="text-center">
                  <span className="text-xs font-mono font-extrabold text-emerald-400 tracking-widest uppercase block">MAPPING COMPLETED</span>
                  <span className="text-[10px] text-white font-bold">Data integrity verified at 100% structural fidelity</span>
                </div>
                <button
                  onClick={resetMapper}
                  className="mt-2 px-5 py-2 rounded-full border border-emerald-400/40 hover:border-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-400 text-[10px] font-bold tracking-wider uppercase transition-all"
                >
                  Reset Sandbox
                </button>
              </div>
            )}
          </div>

          {/* BENTO BLOCK 2: Global Translation & Competency Explorer (5 Cols) */}
          <div className="lg:col-span-5 liquid-glass rounded-[36px] p-6 lg:p-8 flex flex-col justify-between relative overflow-hidden group min-h-[400px]">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700" />

            <div className="w-full text-left">
              <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/25 border border-cyan-400/40 flex items-center justify-center text-cyan-200">
                    <Globe size={15} />
                  </div>
                  <span className="text-[10px] font-black text-cyan-200 font-mono tracking-wider uppercase">LOCALIZATION</span>
                </div>

                {/* Language Switcher Button Group */}
                <div className="flex gap-1 bg-white/5 border border-white/10 rounded-full p-0.5">
                  {["EN", "ES", "JA"].map(lang => (
                    <button
                      key={lang}
                      onClick={() => setCompetencyLang(lang)}
                      className={`px-2.5 py-0.5 rounded-full text-[9px] font-black transition-all ${competencyLang === lang ? "bg-white text-slate-900 shadow-sm" : "text-white hover:text-white"
                        }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-white font-black text-xl tracking-tight mb-2">Competency Library Explorer</p>
              <p className="text-slate-100/95 text-xs font-semibold leading-relaxed mb-6">Search and instantly translate our system-linked competencies. Features native UTF-8 multi-language encoding.</p>

              {/* Search Bar */}
              <div className="relative mb-5">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" />
                <input
                  type="text"
                  placeholder="Search 50K+ competencies..."
                  value={competencySearch}
                  onChange={e => setCompetencySearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-black/40 border border-white/15 text-[11px] text-white placeholder-white/50 font-bold focus:outline-none focus:border-cyan-400/40 transition-colors"
                />
              </div>

              {/* Category Pills */}
              <div className="flex gap-2 mb-6">
                {["technical", "leadership", "operations"].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCompetencyCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-[9px] font-extrabold tracking-wider uppercase border transition-all ${competencyCategory === cat
                      ? "bg-cyan-400/20 border-cyan-400/40 text-cyan-200 shadow-sm"
                      : "bg-white/[0.08] border-white/[0.12] text-slate-200 hover:text-white"
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Competency Output List */}
              <div className="space-y-2.5 h-[130px] overflow-y-auto pr-1">
                {competencyDatabase[competencyCategory]
                  ?.filter(item => item[competencyLang].toLowerCase().includes(competencySearch.toLowerCase()))
                  .map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-white/[0.07] border border-white/10 flex items-center justify-between text-left group/item hover:bg-white/[0.12] transition-colors overflow-hidden shadow-sm"
                    >
                      <span className="text-[11px] text-white font-bold leading-tight line-clamp-1 transition-all duration-300">
                        {item[competencyLang]}
                      </span>
                      <span className="text-[9px] font-black font-mono text-cyan-200 bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-400/30 uppercase select-none">
                        active
                      </span>
                    </div>
                  ))}
              </div>

            </div>
          </div>

          {/* BENTO BLOCK 3: Four-Step Approval Chain Simulator (5 Cols) */}
          <div className="lg:col-span-5 liquid-glass rounded-[36px] p-6 lg:p-8 flex flex-col justify-between relative overflow-hidden group min-h-[440px]">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-pink-400/50 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700" />

            <div className="w-full text-left">
              <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-pink-500/25 border border-pink-400/40 flex items-center justify-center text-pink-200">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  </div>
                  <span className="text-[10px] font-black text-pink-200 font-mono tracking-wider uppercase">WORKFLOWS</span>
                </div>
                <span className="text-[9px] font-black text-pink-200/80 font-mono uppercase tracking-wider">4 approval levels</span>
              </div>

              <p className="text-white font-black text-xl tracking-tight mb-2">Automated Approval Pipeline</p>
              <p className="text-slate-100/95 text-xs font-semibold leading-relaxed mb-8">Simulate the automated routing of job descriptions across four approval layers prior to system locked sync.</p>

              {/* Approval Chain Nodes */}
              <div className="space-y-4 relative pl-3.5 text-left">
                {/* Visual Connector Track line */}
                <div className="absolute left-5 top-2 bottom-8 w-[2px] bg-white/10" />
                <div
                  className="absolute left-5 top-2 w-[2px] bg-gradient-to-b from-pink-400 to-emerald-400 transition-all duration-700"
                  style={{ height: `${(Math.max(0, approvalStep - 1) / 3) * 80}%` }}
                />

                {[
                  { role: "JD Manager", action: "Drafts and validates schema structure" },
                  { role: "HR Representative", action: "Runs compliance audit & language verification" },
                  { role: "Department Head", action: "Confirms competency weights & budgets" },
                  { role: "Executive Director", action: "Final locks and pushes to HRIS Production" }
                ].map((step, idx) => {
                  const nodeNum = idx + 1;
                  const isCurrent = approvalStep === nodeNum;
                  const isPassed = approvalStep > nodeNum;
                  const isPending = approvalStep < nodeNum;

                  return (
                    <div key={idx} className="flex items-start gap-4 relative transition-all duration-300">

                      {/* Node circle */}
                      <div className={`w-3.5 h-3.5 rounded-full z-10 mt-1 transition-all duration-300 ${isPassed
                        ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                        : isCurrent
                          ? "bg-pink-400 animate-pulse ring-4 ring-pink-500/20 shadow-[0_0_8px_rgba(244,114,182,0.5)]"
                          : "bg-white/30"
                        }`} />

                      <div className="flex-grow">
                        <div className="flex justify-between items-center mb-0.5">
                          <p className={`text-[11px] font-extrabold tracking-wide ${isPending ? "text-slate-300/60" : "text-white"}`}>
                            {step.role}
                          </p>
                          {isPassed ? (
                            <span className="text-[9px] font-bold font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase">
                              Approved
                            </span>
                          ) : isCurrent ? (
                            <span className="text-[9px] font-bold font-mono text-pink-400 bg-pink-500/10 px-1.5 py-0.5 rounded border border-pink-500/20 uppercase animate-pulse">
                              Active
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono font-bold text-white/40 uppercase">Pending</span>
                          )}
                        </div>
                        <p className={`text-[10px] font-medium leading-relaxed ${isPending ? "text-slate-300/40" : "text-slate-100"}`}>
                          {step.action}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* Action Trigger */}
            <button
              onClick={triggerApprovalSim}
              disabled={approvalSimulating}
              className={`w-full mt-6 py-4 px-6 rounded-2xl text-xs font-extrabold tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2 border shadow-md ${approvalSimulating
                ? "bg-white/5 border-white/10 text-white/30 cursor-not-allowed"
                : approvalStep === 4
                  ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30"
                  : "bg-white text-slate-900 border-white hover:bg-white/90 hover:scale-[1.015]"
                }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              {approvalStep === 4 ? "Reset Simulation" : approvalSimulating ? "Simulating Workflow..." : "Trigger Approval Chain"}
            </button>
          </div>

          {/* BENTO BLOCK 4: Cornerstone OnDemand Sync Hub (7 Cols) */}
          <div className="lg:col-span-7 liquid-glass rounded-[36px] p-6 lg:p-8 flex flex-col justify-between relative overflow-hidden group min-h-[440px]">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700" />

            <div className="w-full text-left">
              <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/25 border border-emerald-400/40 flex items-center justify-center text-emerald-200">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  </div>
                  <span className="text-[10px] font-black text-emerald-200 font-mono tracking-wider uppercase">EXPORT TERMINAL</span>
                </div>

                {terminalStatus === "compiling" && (
                  <span className="text-[9px] font-black font-mono text-indigo-300 animate-pulse uppercase tracking-wider">COMPILING...</span>
                )}
                {terminalStatus === "syncing" && (
                  <span className="text-[9px] font-black font-mono text-pink-300 animate-pulse uppercase tracking-wider">SYNCING NODES...</span>
                )}
                {terminalStatus === "verified" && (
                  <span className="text-[9px] font-black font-mono text-emerald-400 uppercase tracking-wider">SYNC COMPLETE</span>
                )}
                {terminalStatus === "idle" && (
                  <span className="text-[9px] font-black font-mono text-emerald-200/85 uppercase tracking-wider">READY</span>
                )}
              </div>

              <p className="text-white font-black text-xl tracking-tight mb-2">HRIS Production Sync Hub</p>
              <p className="text-slate-100/95 text-xs font-semibold leading-relaxed mb-6">Automate your schema exports directly into Cornerstone OnDemand with full API API syncing and error rollbacks.</p>

              {/* Terminal Pane */}
              <div className="bg-black/50 border border-white/15 rounded-2xl p-4 font-mono text-[11px] text-slate-100/90 space-y-1.5 min-h-[175px] max-h-[175px] overflow-y-auto text-left relative shadow-inner">
                {terminalLines.length === 0 ? (
                  <span className="text-white/45 italic block">Terminal standing by. Awaiting HRIS Sync trigger...</span>
                ) : (
                  terminalLines.map((log, idx) => {
                    const safeLog = log || "";
                    return (
                      <div key={idx} className="flex gap-2 items-start text-left animate-fadeIn">
                        <span className="text-emerald-400 font-bold select-none">&gt;</span>
                        <p className={safeLog.includes("[SUCCESS]") ? "text-emerald-300 font-bold" : safeLog.includes("[COMPILE]") ? "text-indigo-200 font-medium" : "text-slate-200"}>
                          {safeLog}
                        </p>
                      </div>
                    );
                  })
                )}

                {/* Micro Ingestion Complete Seal */}
                {terminalStatus === "verified" && (
                  <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-sm flex flex-col items-center justify-center gap-2 animate-fadeIn z-20">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.2)]">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className="text-[10px] font-mono font-extrabold text-emerald-400 tracking-widest uppercase">SYNC SECURED</span>
                  </div>
                )}
              </div>
            </div>

            {/* Ingestion progress and CTA panel */}
            <div className="mt-6 space-y-4 text-left">
              <div>
                <div className="flex justify-between text-[10px] font-black font-mono text-slate-200 mb-1.5 uppercase tracking-wider">
                  <span>Packet transmission status</span>
                  <span className="text-white font-bold">{Math.round(terminalProgress)}%</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-pink-400 to-emerald-400 transition-all duration-100 rounded-full"
                    style={{ width: `${terminalProgress}%` }}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={startTerminalSync}
                  disabled={terminalStatus === "compiling" || terminalStatus === "syncing"}
                  className={`flex-grow py-4 px-6 rounded-2xl text-xs font-extrabold tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2 border shadow-md ${terminalStatus === "compiling" || terminalStatus === "syncing"
                    ? "bg-white/5 border-white/10 text-white/30 cursor-not-allowed"
                    : terminalStatus === "verified"
                      ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30"
                      : "bg-white text-slate-900 border-white hover:bg-white/90 hover:scale-[1.015]"
                    }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  {terminalStatus === "verified" ? "Execute Rollback" : "Initiate HRIS Sync"}
                </button>

                {terminalStatus === "verified" && (
                  <button
                    onClick={resetTerminal}
                    className="px-6 py-4 rounded-2xl border border-white/15 bg-white/10 hover:bg-white/20 text-white text-xs font-extrabold tracking-wider uppercase transition-all shadow-sm"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

          </div>

        </div>
        {/* ── END INTERACTIVE BENTO GRID MATRIX ──────────────────────────────── */}

        {/* Extras Bottom Capsules Row */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-16">
          {siteData.features.extras.map((e, i) => {
            const Icon = e.icon;
            return (
              <FadeIn key={e.title} delay={i * 40}>
                <div className="flex items-center gap-2.5 px-6 py-3.5 rounded-full bg-white/[0.06] border border-white/15 text-white font-bold text-xs hover:bg-white/[0.12] hover:border-white/25 hover:scale-[1.03] hover:shadow-lg hover:shadow-black/5 transition-all duration-300 cursor-default shadow-sm">
                  <Icon size={14} className="text-indigo-200" />
                  <span className="tracking-wide">{e.title}</span>
                </div>
              </FadeIn>
            );
          })}
        </div>

      </div>

      {styleDefinitions}
    </section>
  );
};

// Extracted styles to keep Features clean and neat
const styleDefinitions = (
  <style>{`
    .noise-bg {
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    }
    
    @keyframes svgDash {
      to {
        stroke-dashoffset: -40;
      }
    }
    
    .animate-svg-dash {
      stroke-dasharray: 8, 4;
      animation: svgDash 2.5s infinite linear;
    }
  `}</style>
);

// ── Interactive Integration Hub (NEW Widget!) ──────────────────────────────

const InteractiveIntegrationHub = () => {
  const integrations = [
    { name: 'Cornerstone OnDemand', desc: 'Native API API synchronization with bidirectional schema mapping.', active: true },
    { name: 'Legacy Cloud', desc: 'Legacy XML & database schema parser to extract legacy competencies.', active: true },
    { name: 'Workday', desc: 'Secure OAuth2 connector for synchronized employee profile mapping.', active: false },
    { name: 'SuccessFactors', desc: 'SAP SuccessFactors API adapter with automated compliance reports.', active: true },
    { name: 'Oracle HCM', desc: 'Cloud migration pipeline with digital auditing and rollback trails.', active: false },
    { name: 'Custom ERP', desc: 'Flexible JSON/CSV Ingestion pipeline for bespoke corporate architectures.', active: true },
  ];

  return (
    <section className="relative z-10 py-24">
      <div className="max-w-7xl mx-auto px-8">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5">
            <FadeIn>
              <SectionLabel>INTEGRATIONS</SectionLabel>
              <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
                Connect your entire enterprise ecosystem.
              </h2>
              <p className="text-slate-300 mt-5 leading-relaxed">
                TalentForge interfaces directly with industry-standard HR platforms, legacy databases, and APIs. Establish secure, fully-audited pipelines that protect and modernize your data.
              </p>
              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-450">
                    <Check size={12} className="stroke-[3px]" />
                  </div>
                  <span className="text-sm font-semibold text-slate-200">AES-256 Bit End-to-End Encryption</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-450">
                    <Check size={12} className="stroke-[3px]" />
                  </div>
                  <span className="text-sm font-semibold text-slate-200">ISO/IEC 27001 Certified Infrastructure</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-450">
                    <Check size={12} className="stroke-[3px]" />
                  </div>
                  <span className="text-sm font-semibold text-slate-200">Real-Time Rollback and Audit Trails</span>
                </div>
              </div>
            </FadeIn>
          </div>

          <div className="lg:col-span-7">
            <FadeIn delay={120}>
              <div className="grid sm:grid-cols-2 gap-4 relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 to-cyan-500/5 rounded-3xl filter blur-3xl -z-10 pointer-events-none" />

                {integrations.map((item) => (
                  <Glass key={item.name} className="p-6 relative group hover:-translate-y-1 hover:bg-white/15 hover:shadow-xl hover:shadow-indigo-950/25 transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-white font-bold text-base group-hover:text-indigo-300 transition-colors duration-300">{item.name}</h4>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${item.active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
                        <span className="text-[9px] font-mono font-bold tracking-wider uppercase text-white/60">
                          {item.active ? 'Active' : 'Standby'}
                        </span>
                      </div>
                    </div>
                    <p className="text-slate-200 text-xs leading-relaxed">{item.desc}</p>

                    {item.active && (
                      <div className="absolute bottom-0 inset-x-8 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                    )}
                  </Glass>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
};

// ── Roles ──────────────────────────────────────────────────────────────────

const Roles = () => {
  const [active, setActive] = useState(0);
  const role = siteData.roles.items[active];
  const RoleIcon = role.icon;

  return (
    <section id="roles" className="relative z-10 py-24">
      <div className="max-w-7xl mx-auto px-8">
        <FadeIn className="text-center mb-12">
          <SectionLabel>{siteData.roles.badge}</SectionLabel>
          <h2 className="text-4xl lg:text-5xl font-bold text-white">{siteData.roles.title}</h2>
        </FadeIn>

        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {siteData.roles.items.map((r, i) => (
            <button
              key={r.name}
              onClick={() => setActive(i)}
              className={`px-5 py-3 rounded-full text-sm font-semibold transition-all ${active === i
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/50'
                : 'bg-white/10 text-white hover:bg-white/20 border border-white/20 shadow-sm'
                }`}
            >
              {r.name}
            </button>
          ))}
        </div>

        <FadeIn>
          <Glass className="p-8 lg:p-12 max-w-3xl mx-auto relative overflow-hidden">
            <div className="absolute -right-16 -bottom-16 w-48 h-48 rounded-full bg-indigo-950/20 filter blur-xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-6 pb-6 border-b border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-950/50 flex items-center justify-center border border-indigo-500/20 shrink-0">
                  <RoleIcon size={24} className="text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-xl">{role.name}</h3>
                  <span className="text-[10px] uppercase tracking-wider text-indigo-300 font-bold font-mono">{role.badge}</span>
                </div>
              </div>
              <Link to="/login" className="self-start sm:self-auto text-xs font-bold text-indigo-300 hover:text-indigo-400 flex items-center gap-1">
                Configure Permissions <ChevronRight size={14} />
              </Link>
            </div>

            <p className="text-slate-200 leading-relaxed text-base mb-8">{role.desc}</p>

            <div className="grid sm:grid-cols-2 gap-4">
              {role.perms.map((p) => (
                <div key={p} className="flex items-center gap-3 text-white text-sm font-medium bg-white/5 px-4 py-3 rounded-xl border border-white/10">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-405 shrink-0">
                    <Check size={12} className="stroke-[3px]" />
                  </div>
                  <span>{p}</span>
                </div>
              ))}
            </div>
          </Glass>
        </FadeIn>
      </div>
    </section>
  );
};


// ── CountUp Helper ──────────────────────────────────────────────────────────

const CountUp = ({ to, suffix = '', duration = 1500 }) => {
  const [count, setCount] = useState('0');
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const target = parseFloat(to);
    if (isNaN(target)) {
      setCount(to);
      return;
    }

    const formatNumber = (num) => {
      if (to.toString().includes('.')) {
        return num.toFixed(1);
      }
      return Math.floor(num).toLocaleString('en-US');
    };

    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        let start = 0;
        const stepTime = 20;
        const totalSteps = duration / stepTime;
        const increment = target / totalSteps;
        let currentStep = 0;

        const timer = setInterval(() => {
          currentStep++;
          if (currentStep >= totalSteps) {
            setCount(formatNumber(target));
            clearInterval(timer);
          } else {
            const val = start + increment * currentStep;
            setCount(formatNumber(val));
          }
        }, stepTime);
      }
    }, { threshold: 0.1 });

    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
};

// ── Interactive Dashboard Widget ───────────────────────────────────────────

const InteractiveDashboardWidget = () => {
  const [progress, setProgress] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [logs, setLogs] = useState([]);
  const ref = useRef(null);

  const steps = [
    { title: 'Parsing Legacy Job Schemas', status: 'completed' },
    { title: 'AI Field-Mapping & Enrichment', status: 'running' },
    { title: 'Cornerstone OnDemand API Sync', status: 'pending' }
  ];

  const logDatabase = [
    'Initializing Legacy XML import stream...',
    'Found 12,482 job profile records.',
    'Validating key-value pairs...',
    'Warning: Missing competency map resolved via AI Suggest.',
    'Mapping fields to HRIS standard schemas...',
    'Modernizing JD summaries using GPT-4 API...',
    'Establishing secure Oauth2 session to HRIS endpoint...',
    'Uploading Job Profiles... [1,200/12,482]',
    'Uploading Job Profiles... [4,500/12,482]',
    'Uploading Job Profiles... [8,900/12,482]',
    'Migration complete. Verification report generated.'
  ];

  useEffect(() => {
    let timer;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        let logIndex = 0;
        setLogs([logDatabase[0]]);

        timer = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 100) {
              clearInterval(timer);
              setActiveStep(2);
              return 100;
            }
            const next = prev + 5;

            if (next > 40 && next < 80) setActiveStep(1);
            if (next >= 80) setActiveStep(2);

            if (next % 10 === 0 && logIndex < logDatabase.length - 1) {
              logIndex++;
              setLogs((curr) => [...curr.slice(-3), logDatabase[logIndex]]);
            }
            return next;
          });
        }, 200);
      }
    }, { threshold: 0.2 });

    if (ref.current) obs.observe(ref.current);
    return () => {
      obs.disconnect();
      clearInterval(timer);
    };
  }, []);

  return (
    <section ref={ref} className="relative z-10 py-24">
      <div className="max-w-7xl mx-auto px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <FadeIn>
            <SectionLabel>REAL-TIME DEMONSTRATION</SectionLabel>
            <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
              Watch your data migrate in real-time.
            </h2>
            <p className="text-slate-300 mt-5 leading-relaxed max-w-lg">
              TalentForge orchestrates legacy databases, sanitizes structural schemas, and securely integrates with Cornerstone OnDemand. Observe our automated pipeline in action.
            </p>

            <div className="mt-8 space-y-4 max-w-md">
              {steps.map((step, idx) => (
                <div key={step.title} className="flex items-center gap-3.5 p-4 rounded-2xl bg-white/10 border border-white/20 shadow-sm hover:bg-white/15 transition-all">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${idx < activeStep ? 'bg-emerald-500 text-white' : idx === activeStep ? 'bg-indigo-650 text-white animate-pulse shadow-[0_0_12px_rgba(79,70,229,0.4)]' : 'bg-white/10 text-white/50 border border-white/10'
                    }`}>
                    {idx < activeStep ? (
                      <Check size={12} className="stroke-[3px]" />
                    ) : (
                      <span className="text-xs font-bold">{idx + 1}</span>
                    )}
                  </div>
                  <span className={`text-sm font-semibold ${idx === activeStep ? 'text-white font-bold' : idx < activeStep ? 'text-slate-100' : 'text-white/55'}`}>
                    {step.title}
                  </span>
                </div>
              ))}
            </div>
          </FadeIn>

          <FadeIn delay={120}>
            <div className="bg-slate-950 text-slate-100 rounded-3xl p-6 border border-slate-850 shadow-2xl overflow-hidden min-h-[380px] flex flex-col justify-between">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="text-xs text-slate-500 ml-2 font-mono">migration_pipeline.log</span>
                </div>
                <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">active stream</span>
              </div>

              {/* Log terminal */}
              <div className="flex-grow font-mono text-xs text-emerald-400/90 space-y-2 bg-black/40 p-4 rounded-xl border border-white/5 min-h-[180px]">
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-emerald-500/40 select-none">&gt;</span>
                    <p>{log}</p>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div className="mt-6">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Overall Sync Progress</span>
                  <span className="font-semibold text-white">{progress}%</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
};

// ── Testimonial Marquee ──────────────────────────────────────────────────────

const TestimonialMarquee = () => {
  const containerRef = useRef(null);
  const row1Ref = useRef(null);
  const row2Ref = useRef(null);

  const row1 = [
    {
      text: "TalentForge shortened our Cornerstone migration timeline from 9 months to just 6 weeks.",
      author: "Sarah Jenkins",
      role: "VP of HR, Nike",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&h=100&q=80"
    },
    {
      text: "The AI competency generator resolved years of fragmented database tags automatically.",
      author: "David Chen",
      role: "Director of L&D, Google",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&h=100&q=80"
    },
    {
      text: "Absolutely seamless integration. We synchronized 45,000 active records with zero loss.",
      author: "Elena Rostova",
      role: "Talent Analytics Lead, Sony",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&h=100&q=80"
    },
    {
      text: "Auditing compliance across international entities is now completely automated.",
      author: "Marcus Vance",
      role: "VP of Compliance, Bosch",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&h=100&q=80"
    }
  ];

  const row2 = [
    {
      text: "A game-changer for enterprise HR workflows. The preview editor is simple yet powerful.",
      author: "Leila Al-Jamil",
      role: "HR Architect, Google",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=100&h=100&q=80"
    },
    {
      text: "Custom mapping configurations saved us hundreds of developer hours.",
      author: "Thomas Wright",
      role: "IT Integration VP, Prada",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&h=100&q=80"
    },
    {
      text: "Our managers love the simple role-based approval steps.",
      author: "Naomi Takahashi",
      role: "HR Ops Director, Disney",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=100&h=100&q=80"
    },
    {
      text: "Fantastic customer support and a bulletproof migration process.",
      author: "Peter Kowalski",
      role: "HR Director, Apple",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=100&h=100&q=80"
    }
  ];

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current || !row1Ref.current || !row2Ref.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Calculate progress from when the section top enters the viewport bottom, to when its bottom leaves the viewport top
      const entryPoint = rect.top - viewportHeight;
      const exitPoint = rect.bottom;
      const totalDist = viewportHeight + rect.height;
      const currentDist = -entryPoint;

      // Normalize progress between 0 and 1
      const progress = Math.max(0, Math.min(1, currentDist / totalDist));

      // 1. Perspective 3D Tilt calculation:
      // Start tilted at 18 degrees when entering, straighten out at progress = 0.5, and tilt the opposite way when leaving
      const rotateX = 18 * (1 - progress * 2);  // 18deg down to -18deg
      const rotateY = -8 * (1 - progress * 2);  // -8deg to 8deg
      const rotateZ = 3 * (1 - progress * 2);   // 3deg to -3deg
      const scale = 0.96 + Math.sin(progress * Math.PI) * 0.04; // scale up to 1.0 at center

      // Apply the 3D transforms to the container
      containerRef.current.style.transform = `perspective(1800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale(${scale})`;
      containerRef.current.style.transformStyle = 'preserve-3d';
      containerRef.current.style.willChange = 'transform';

      // 2. Parallax horizontal sliding (Row 1 moves left, Row 2 moves right)
      // We repeat cards so translating from -15% to -45% is completely seamless
      const row1Translate = -12 + (progress * -28); // moves from -12% to -40%
      const row2Translate = -38 + (progress * 28);  // moves from -38% to -10%

      row1Ref.current.style.transform = `translateX(${row1Translate}%) translateZ(25px)`;
      row2Ref.current.style.transform = `translateX(${row2Translate}%) translateZ(25px)`;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial run

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <section className="relative z-10 py-32 overflow-hidden">
      {/* Dynamic glow spotlight backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.02)_0%,transparent_65%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-8 text-center mb-20 relative z-10">
        <SectionLabel>ENTERPRISE FEEDBACK</SectionLabel>
        <h2 className="text-4xl lg:text-5xl font-bold text-white tracking-tight">
          Loved by global talent leaders.
        </h2>
      </div>

      {/* The 3D Perspective Animation Wrapper */}
      <div
        ref={containerRef}
        className="space-y-8 transition-transform duration-100 ease-out select-none"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Row 1: Parallax Left-sliding */}
        <div className="relative flex overflow-x-hidden py-2" style={{ transformStyle: 'preserve-3d' }}>
          <div
            ref={row1Ref}
            className="flex gap-6 w-max transition-transform duration-150 ease-out"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {[...row1, ...row1, ...row1, ...row1].map((item, idx) => (
              <div
                key={idx}
                className="w-[380px] p-7 rounded-3xl liquid-glass-no-shadow shrink-0 flex flex-col justify-between group text-left"
                style={{ transform: 'translateZ(10px)' }}
              >
                <p className="text-white text-sm italic leading-relaxed whitespace-normal transition-colors group-hover:text-white">
                  "{item.text}"
                </p>
                <div className="mt-5 pt-5 border-t border-white/10 flex items-center gap-3">
                  <img
                    src={item.avatar}
                    alt={item.author}
                    className="w-9 h-9 rounded-full object-cover border border-white/20 shadow-sm"
                  />
                  <div className="flex-grow min-w-0">
                    <div className="text-xs font-black text-white truncate">{item.author}</div>
                    <div className="text-[9px] text-indigo-200 font-extrabold tracking-wider uppercase mt-0.5">{item.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Row 2: Parallax Right-sliding */}
        <div className="relative flex overflow-x-hidden py-2" style={{ transformStyle: 'preserve-3d' }}>
          <div
            ref={row2Ref}
            className="flex gap-6 w-max transition-transform duration-150 ease-out"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {[...row2, ...row2, ...row2, ...row2].map((item, idx) => (
              <div
                key={idx}
                className="w-[380px] p-7 rounded-3xl liquid-glass-no-shadow shrink-0 flex flex-col justify-between group text-left"
                style={{ transform: 'translateZ(10px)' }}
              >
                <p className="text-white text-sm italic leading-relaxed whitespace-normal transition-colors group-hover:text-white">
                  "{item.text}"
                </p>
                <div className="mt-5 pt-5 border-t border-white/10 flex items-center gap-3">
                  <img
                    src={item.avatar}
                    alt={item.author}
                    className="w-9 h-9 rounded-full object-cover border border-white/20 shadow-sm"
                  />
                  <div className="flex-grow min-w-0">
                    <div className="text-xs font-black text-white truncate">{item.author}</div>
                    <div className="text-[9px] text-indigo-200 font-extrabold tracking-wider uppercase mt-0.5">{item.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// ── Solutions ──────────────────────────────────────────────────────────────

const Solutions = () => (
  <section id="solutions" className="relative z-10 py-24">
    <div className="max-w-7xl mx-auto px-8">
      <div className="grid lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-5 lg:sticky lg:top-28">
          <FadeIn>
            <SectionLabel>{siteData.solutions.badge}</SectionLabel>
            <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight">{siteData.solutions.title}</h2>
            <p className="text-slate-300 mt-5 leading-relaxed">{siteData.solutions.description}</p>
          </FadeIn>
        </div>
        <div className="lg:col-span-7 space-y-4">
          {siteData.solutions.cards.map((card, i) => (
            <FadeIn key={card.title} delay={i * 80}>
              <div className="p-6 lg:p-8 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-md shadow-indigo-950/15 hover:bg-white/15 hover:border-white/30 hover:shadow-xl hover:shadow-indigo-950/25 transition-all group">
                <h3 className="text-white font-bold text-lg mb-2 group-hover:text-indigo-200 transition-colors duration-300">{card.title}</h3>
                <p className="text-slate-200 text-sm leading-relaxed">{card.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </div>
  </section>
);

// ── Stats ──────────────────────────────────────────────────────────────────

const statsConfig = [
  {
    icon: FileText,
    gradient: 'from-indigo-400 to-cyan-300',
    glow: 'rgba(99,102,241,0.2)',
    badge: 'Verified Templates',
    subLabel: '300,000+ pre-mapped schemas'
  },
  {
    icon: Shield,
    gradient: 'from-emerald-400 to-teal-300',
    glow: 'rgba(16,185,129,0.2)',
    badge: 'Zero Data Loss',
    subLabel: 'HRIS API sync standard'
  },
  {
    icon: Zap,
    gradient: 'from-blue-400 to-violet-400',
    glow: 'rgba(59,130,246,0.2)',
    badge: 'Legacy to HRIS Acceleration',
    subLabel: 'Automated workflow pipeline'
  },
  {
    icon: Activity,
    gradient: 'from-amber-400 to-orange-400',
    glow: 'rgba(245,158,11,0.2)',
    badge: 'Post-Sync Audit Integrity',
    subLabel: 'Support tickets reduced'
  }
];

const Stats = () => {
  return (
    <section className="relative z-10 py-28 border-y border-white/10 bg-slate-950/40 backdrop-blur-md overflow-hidden">
      {/* Background glow accents */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-80 h-80 rounded-full bg-indigo-500/10 filter blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-80 h-80 rounded-full bg-cyan-500/10 filter blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-8">

        {/* Section Title */}
        <div className="text-center mb-16">
          <p className="text-[11px] uppercase tracking-[0.35em] text-indigo-300 font-extrabold font-mono mb-3">
            SYSTEM PERFORMANCE
          </p>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
            Migrate with absolute confidence.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {siteData.stats.map((s, i) => {
            const config = statsConfig[i];
            const Icon = config.icon;
            return (
              <FadeIn key={s.label} delay={i * 80}>
                <div
                  className="relative p-6 rounded-[32px] liquid-glass overflow-hidden flex flex-col justify-between min-h-[220px] group"
                >
                  {/* Internal Glow Spotlight */}
                  <div
                    className="absolute -right-10 -bottom-10 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 filter blur-2xl pointer-events-none"
                    style={{ backgroundColor: config.glow }}
                  />

                  {/* Header Row */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[9px] font-extrabold font-mono text-slate-400 tracking-wider uppercase group-hover:text-slate-300 transition-colors">
                      {config.badge}
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 group-hover:text-white group-hover:border-white/20 transition-all duration-300 shadow-inner">
                      <Icon size={16} />
                    </div>
                  </div>

                  {/* Stat Value */}
                  <div className="my-auto">
                    <div className="text-4xl lg:text-5xl font-black tracking-tight bg-gradient-to-r from-white to-slate-100 bg-clip-text text-transparent filter drop-shadow-sm">
                      <span className={`bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent`}>
                        <CountUp
                          to={s.value.replace(/[^0-9.]/g, '')}
                          suffix={s.value.replace(/[0-9.,]/g, '')}
                        />
                      </span>
                    </div>
                    <div className="text-white font-bold text-base mt-2 tracking-tight">
                      {s.label}
                    </div>
                  </div>

                  {/* Footer sub-label */}
                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[11px] text-slate-300/80 font-medium tracking-wide">
                      {config.subLabel}
                    </span>
                    {/* Tiny visual check badge */}
                    <span className="w-4 h-4 rounded-full bg-emerald-500/10 border border-emerald-400/25 flex items-center justify-center text-emerald-400 text-[8px] font-bold shadow-sm">
                      ✓
                    </span>
                  </div>

                </div>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// ── CTA ────────────────────────────────────────────────────────────────────

const CTA = () => (
  <section id="cta" className="relative z-10 py-28">
    <div className="max-w-4xl mx-auto px-8 text-center">
      <FadeIn>
        <Glass className="p-10 lg:p-16 relative overflow-hidden">
          <div className="absolute -left-20 -top-20 w-64 h-64 rounded-full bg-indigo-200/40 filter blur-3xl pointer-events-none" />
          <div className="absolute -right-20 -bottom-20 w-64 h-64 rounded-full bg-cyan-200/40 filter blur-3xl pointer-events-none" />

          <h2 className="text-4xl lg:text-6xl font-bold text-white leading-tight relative z-10">{siteData.cta.title}</h2>
          <p className="text-slate-300 mt-6 text-lg leading-relaxed max-w-2xl mx-auto relative z-10">{siteData.cta.description}</p>

          <div className="flex flex-wrap justify-center gap-4 mt-10 relative z-10">
            <Link to="/login" className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold hover:scale-105 transition-all shadow-lg shadow-indigo-950/50">
              {siteData.cta.primary}
            </Link>
            <a href="#product" className="px-8 py-4 rounded-full font-bold text-white bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 shadow-sm transition-all">
              {siteData.cta.secondary}
            </a>
          </div>

          <div className="flex flex-wrap justify-center gap-6 mt-10 text-xs text-slate-400 relative z-10 border-t border-white/10 pt-6">
            {siteData.cta.features.map((f) => (
              <span key={f} className="flex items-center gap-1.5 font-medium text-slate-200">
                <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-450">
                  <Check size={10} className="stroke-[3px]" />
                </div>
                {f}
              </span>
            ))}
          </div>
        </Glass>
      </FadeIn>
    </div>
  </section>
);

// ── Footer ─────────────────────────────────────────────────────────────────

const Footer = () => (
  <footer className="relative z-10 pt-20 pb-10 border-t border-white/10 bg-slate-950/40 backdrop-blur-md overflow-hidden">
    {/* Abstract background elements */}
    <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
      <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full" />
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-purple-600/10 blur-[100px] rounded-full" />
    </div>

    <div className="max-w-7xl mx-auto px-8 relative">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8 mb-16">

        {/* Brand Column (takes up 2 columns on lg screens) */}
        <div className="lg:col-span-2 flex flex-col items-start">
          <img src="/TF-white.png" alt="TalentForge" className="h-8 w-auto object-contain mb-6 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
          <p className="text-slate-400 text-sm leading-relaxed mb-8 max-w-sm">
            {siteData.footer.description}
          </p>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors cursor-pointer group w-full max-w-sm backdrop-blur-sm flex flex-col justify-center"
            onClick={() => window.open(siteData.footer.poweredBy.url, '_blank')}>
            <p className="text-slate-400 text-xs mb-3">{siteData.footer.poweredBy.text}</p>
            <div className="flex items-center justify-between">
              <img src={siteData.footer.poweredBy.logo} alt={siteData.footer.poweredBy.brand} className="h-6 w-auto object-contain drop-shadow-md opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all origin-left" />
              <ArrowRight size={16} className="text-indigo-400 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </div>
          </div>
        </div>

        {/* Dynamic Link Columns */}
        {siteData.footer.columns.map((col, idx) => (
          <div key={idx}>
            <h4 className="text-white font-semibold mb-6 tracking-wide">{col.title}</h4>
            <ul className="space-y-4">
              {col.links.map((link) => (
                <li key={link}>
                  <Link to={"/"} className="text-slate-400 hover:text-indigo-400 text-sm transition-colors flex items-center gap-2 group">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/0 group-hover:bg-indigo-500 transition-colors" />
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom Bar */}
      <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-slate-500 text-sm font-medium">
          {siteData.footer.copyright}
        </p>
        <div className="flex items-center gap-6">
          <a href={`mailto:${siteData.footer.contact}`} className="text-slate-400 hover:text-white text-sm transition-colors">
            {siteData.footer.contact}
          </a>
          <div className="flex items-center gap-4">
            {/* Social mock icons */}
            {['Twitter', 'LinkedIn', 'GitHub'].map((social) => (
              <a key={social} href="#" className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all">
                <span className="text-[10px] font-bold">{social[0]}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  </footer>
);

// ── Dynamic Background Grid ──────────────────────────────────────────────────

const DynamicGridBackground = () => {
  const cols = 5;
  const rows = 4;
  const totalCells = cols * rows;

  // Helper to find all inactive cells adjacent to the current active cluster
  const getAdjacentInactiveCells = (activeSet) => {
    const adjacents = new Set();
    activeSet.forEach((idx) => {
      const r = Math.floor(idx / cols);
      const c = idx % cols;
      // Up, Down, Left, Right
      if (r > 0 && !activeSet.has(idx - cols)) adjacents.add(idx - cols);
      if (r < rows - 1 && !activeSet.has(idx + cols)) adjacents.add(idx + cols);
      if (c > 0 && !activeSet.has(idx - 1)) adjacents.add(idx - 1);
      if (c < cols - 1 && !activeSet.has(idx + 1)) adjacents.add(idx + 1);
    });
    return Array.from(adjacents);
  };

  // Helper to generate a fully connected initial cluster of 4 boxes
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

        // 1. Randomly deactivate one of the current active cells
        const toRemoveIdx = Math.floor(Math.random() * prev.length);
        const nextActive = prev.filter((_, i) => i !== toRemoveIdx);

        // 2. Find all inactive cells adjacent to the remaining active cluster
        const activeSet = new Set(nextActive);
        const adjacentInactive = getAdjacentInactiveCells(activeSet);

        // 3. Randomly pick one adjacent inactive cell to activate (growing the cluster!)
        if (adjacentInactive.length > 0) {
          const toAdd = adjacentInactive[Math.floor(Math.random() * adjacentInactive.length)];
          nextActive.push(toAdd);
        } else {
          // Fallback: if no adjacent, pick any random inactive cell
          const allInactive = [];
          for (let i = 0; i < totalCells; i++) {
            if (!activeSet.has(i)) allInactive.push(i);
          }
          if (allInactive.length > 0) {
            nextActive.push(allInactive[Math.floor(Math.random() * allInactive.length)]);
          }
        }

        return nextActive;
      });

      // Randomized fast glitch delay: between 250ms and 800ms
      const nextDelay = 250 + Math.random() * 550;
      timeoutId = setTimeout(tick, nextDelay);
    };

    timeoutId = setTimeout(tick, 300);

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div className="fixed inset-0 z-0 grid grid-cols-5 grid-rows-4 gap-6 p-8 pointer-events-none overflow-hidden w-full h-full">
      {Array.from({ length: totalCells }).map((_, idx) => {
        const isActive = activeIndices.includes(idx);
        return (
          <div key={idx} className="w-full h-full flex items-center justify-center">
            <div
              className={`w-full aspect-square max-w-[130px] rounded-2xl bg-white/[0.045] transition-all duration-[120ms] ease-out transform shadow-[0_0_20px_rgba(255,255,255,0.01)] ${isActive ? 'opacity-100 scale-100' : 'opacity-[0.16] scale-[0.96]'
                }`}
            />
          </div>
        );
      })}
    </div>
  );
};

// ── Main ───────────────────────────────────────────────────────────────────

const Home = () => {
  const { isAuthenticated, role } = useContext(JDContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) return;
    const routes = { Admin: '/admin-dashboard', HR: '/hr-dashboard', Manager: '/manager-dashboard' };
    if (routes[role]) navigate(routes[role]);
  }, [isAuthenticated, role, navigate]);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.0,
      smoothTouch: false,
    });

    let rafId;
    function raf(time) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="relative min-h-screen text-slate-800 overflow-x-hidden">
      {/* Purple radial spotlight gradient centering behind the orb */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background: `
      radial-gradient(circle at 50% 45%,
        #B7AFFF 0%,
        #9D92F4 18%,
        #7867E3 42%,
        #5A49CF 68%,
        #4138A9 100%
      ),
      linear-gradient(
        90deg,
        rgba(255,255,255,0) 0%,
        rgba(255,255,255,0.08) 50%,
        rgba(255,255,255,0) 100%
      ),
      #4138A9
    `,
        }}
      />

      {/* Dynamic Background Grid (fades glass squares in and out) */}
      <DynamicGridBackground />

      {/* Film grain */}
      <div className="fixed inset-0 z-[1] pointer-events-none opacity-[0.35] mix-blend-overlay"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")` }}
      />

      {/* 3D orb — fixed, full screen to prevent clipping */}
      <div className="fixed inset-0 z-[2] pointer-events-none">
        <Hero3DBlob className="w-full h-full" />
      </div>

      {/* Page content */}
      <div className="relative z-10">
        <Navbar />
        <main>
          <Hero />
          <Product />
          <Clients />
          <Pillars />
          <SuccessStories />
          <Method />
          <Workflow />
          <AIGenerator />
          <Features />
          <InteractiveIntegrationHub />
          <Roles />
          <InteractiveDashboardWidget />
          <TestimonialMarquee />
          <Solutions />
          <Stats />
          <CTA />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Home;
