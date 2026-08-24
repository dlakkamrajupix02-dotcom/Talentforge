import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, RefreshCw, Sparkles } from 'lucide-react';

export default function AIPromptModal({ isOpen, onClose, onSubmit, sectionTitle, isGenerating, isPointLevel }) {
  const [prompt, setPrompt] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (prompt.trim()) {
      onSubmit(prompt);
      setPrompt("");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 dark:bg-[#020617]/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">AI Assistant</h3>
              <p className="text-blue-100 text-sm">
                {isPointLevel ? `Refine point in ${sectionTitle}` : `Enhance ${sectionTitle}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              {isPointLevel ? "How should this bullet point be refined?" : "What would you like to improve?"}
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              {isPointLevel 
                 ? "Describe specific changes, tone adjustments, or details to add to this single point." 
                 : "Describe specific changes, tone adjustments, or additional details you want included."}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="relative">
              <textarea
                ref={inputRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., Make it more formal, add emphasis on leadership skills, include remote work benefits..."
                rows={4}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border-2 border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-blue-500 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-white/10 transition-all resize-none text-sm dark:text-white"
              />
              <div className="absolute bottom-3 right-3 text-xs text-slate-400 dark:text-slate-500">
                {prompt.length} chars
              </div>
            </div>

            {/* Quick Suggestions */}
            <div className="mt-3 flex flex-wrap gap-2">
              {["Make Professional", "Make EEOC compliance", "Make GDPR compliance", "Make healthcare compliant"].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setPrompt(suggestion)}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-indigo-500/20 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-indigo-400 text-xs font-medium rounded-full transition-colors border border-slate-200 dark:border-white/10 hover:border-blue-200 dark:hover:border-indigo-500/30"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border-2 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!prompt.trim() || isGenerating}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Refine with AI
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
