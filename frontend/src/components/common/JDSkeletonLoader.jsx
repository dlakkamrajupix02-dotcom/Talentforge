import React, { useState, useEffect } from "react";
import { Sparkles, Wand2, BrainCircuit, Search, FileText } from "lucide-react";

export default function JDSkeletonLoader() {
  const [loadingText, setLoadingText] = useState("");
  const [textIndex, setTextIndex] = useState(0);
  const messages = [
    "Analyzing role requirements...",
    "Curating industry-standard skills...",
    "Defining core competencies...",
    "Aligning with compliance standards...",
    "Synthesizing job responsibilities...",
    "Finalizing your premium job description..."
  ];

  useEffect(() => {
    let charIndex = 0;
    let currentMessage = messages[textIndex];
    
    const typingInterval = setInterval(() => {
      if (charIndex <= currentMessage.length) {
        setLoadingText(currentMessage.substring(0, charIndex));
        charIndex++;
      } else {
        clearInterval(typingInterval);
        setTimeout(() => {
          setTextIndex((prev) => (prev + 1) % messages.length);
        }, 1500);
      }
    }, 50);

    return () => clearInterval(typingInterval);
  }, [textIndex]);

  return (
    <div className="max-w-[90%] mx-auto px-6 py-8 space-y-8 relative">
      {/* Document Header Skeleton */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
        {/* Banner Area / AI Thinking Integration */}
        <div className="bg-slate-900 dark:bg-black/40 px-8 py-10 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="relative z-10 flex flex-col items-center gap-4">
             <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl">
                <Wand2 className="w-8 h-8 text-white" />
             </div>
             <div className="flex flex-col items-center gap-1 text-center">
                <p className="text-2xl font-black text-white tracking-tight">
                  {loadingText}
                  <span className="w-1.5 h-6 bg-blue-500 inline-block ml-1 animate-pulse" />
                </p>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Phenom AI is drafting your JD</p>
                </div>
                <p className="mt-2 text-[10px] text-slate-400/80 font-medium tracking-wide">
                  AI can occasionally generate inaccurate information. Please verify the content.
                </p>
             </div>
          </div>
        </div>


        {/* Title & Meta Grid */}
        <div className="px-10 py-6 space-y-8">
          <div className="w-64 h-8 bg-slate-200 dark:bg-slate-800 mx-auto rounded-lg" />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-y-6 gap-x-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="w-20 h-3 bg-slate-100 dark:bg-slate-800 rounded" />
                <div className="w-full h-5 bg-slate-200 dark:bg-slate-700 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content Sections Skeletons */}
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-8 py-6 border-b-2 border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
              <div className="space-y-2">
                <div className="w-32 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="w-48 h-3 bg-slate-100 dark:bg-slate-800 rounded" />
              </div>
            </div>
            <div className="w-24 h-8 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          </div>
          <div className="p-8 pt-2 space-y-4">
            <div className="w-full h-32 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem]" />
          </div>
        </div>
      ))}
    </div>
  );
}


