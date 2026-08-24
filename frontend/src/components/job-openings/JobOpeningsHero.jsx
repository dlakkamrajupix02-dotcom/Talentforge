import React, { useRef, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { RefreshCw, Sparkles } from "lucide-react";
import JobOpeningsHeroOrb from "./JobOpeningsHeroOrb";

const PARTICLES = [
  { top: "18%", left: "72%", delay: 0 },
  { top: "62%", left: "85%", delay: 1.2 },
  { top: "78%", left: "28%", delay: 2.4 },
  { top: "35%", left: "55%", delay: 0.8 },
  { top: "48%", left: "18%", delay: 1.8 },
  { top: "22%", left: "42%", delay: 3 },
];

export default function JobOpeningsHero({ loading, onSync }) {
  const reduceMotion = useReducedMotion();
  const heroRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, active: false });

  const fadeUp = (delay = 0) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] },
        };

  const handleMouseMove = useCallback((e) => {
    const el = heroRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    mouseRef.current = { x, y, active: true };
  }, []);

  const handleMouseLeave = useCallback(() => {
    mouseRef.current = { x: 0, y: 0, active: false };
  }, []);

  return (
    <div
      ref={heroRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="jo-hero relative rounded-[2.5rem] p-8 sm:p-10 lg:p-12 overflow-hidden shadow-2xl border border-indigo-500/20 min-h-[220px] sm:min-h-[260px] lg:min-h-[280px]"
    >
      <div className="jo-hero-gradient" aria-hidden="true" />
      <div className="jo-hero-grid" aria-hidden="true" />
      <div className="jo-hero-glow" aria-hidden="true" />
      <div className="jo-hero-streak" aria-hidden="true" />

      {!reduceMotion &&
        PARTICLES.map((p, i) => (
          <span
            key={i}
            className="jo-particle"
            style={{ top: p.top, left: p.left, animationDelay: `${p.delay}s` }}
            aria-hidden="true"
          />
        ))}

      {/* 3D orb — WebGL on desktop/tablet, CSS rings on mobile or reduced motion */}
      {!reduceMotion ? (
        <div className="jo-hero-orb-wrap hidden sm:block" aria-hidden="true">
          <JobOpeningsHeroOrb mouseRef={mouseRef} />
        </div>
      ) : (
        <div className="jo-hero-rings hidden sm:block" aria-hidden="true">
          <div className="jo-hero-ring" />
          <div className="jo-hero-ring" />
          <div className="jo-hero-ring" />
        </div>
      )}

      <svg
        className="absolute right-[38%] top-0 h-full w-1/4 opacity-[0.06] pointer-events-none hidden lg:block"
        viewBox="0 0 200 300"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M200 0 L200 300 M160 0 L160 300 M120 40 L120 260" stroke="white" strokeWidth="0.5" fill="none" />
      </svg>

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
        <div className="space-y-5 max-w-2xl lg:max-w-[55%]">
          <motion.span
            {...fadeUp(0)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-[10px] font-black rounded-full uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(99,102,241,0.25)]"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            Internal Mobility
          </motion.span>

          <motion.h1
            {...fadeUp(0.08)}
            className="text-4xl sm:text-5xl lg:text-[3.25rem] font-black text-white uppercase tracking-tight leading-[0.95] drop-shadow-[0_0_40px_rgba(99,102,241,0.15)]"
          >
            Internal Opportunities
          </motion.h1>

          <motion.p
            {...fadeUp(0.16)}
            className="text-slate-300/90 text-sm sm:text-[15px] font-medium max-w-xl leading-relaxed"
          >
            Explore open roles within our organization. Search by department or employment type to find your next internal career move and growth opportunity.
          </motion.p>
        </div>

        <motion.button
          {...fadeUp(0.24)}
          onClick={onSync}
          disabled={loading}
          className="jo-sync-btn relative z-10 flex items-center justify-center gap-2.5 px-7 py-4 bg-white/10 hover:bg-white/15 text-white rounded-2xl text-xs font-black uppercase tracking-[0.15em] border border-white/15 backdrop-blur-sm disabled:opacity-50 self-start lg:self-auto shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Sync Opportunities
        </motion.button>
      </div>
    </div>
  );
}
