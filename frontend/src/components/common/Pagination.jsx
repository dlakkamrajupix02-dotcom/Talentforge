import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal, ChevronDown, Check } from "lucide-react";

/**
 * Premium Pagination Component - Directly Anchored Dropdown without Scrollbar
 */
export default function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  pageSize, 
  onPageSizeChange, 
  totalResults,
  showRowsSelector = true,
  className = "" 
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Dynamically include active pageSize if it's custom (e.g. 7)
  const defaultOptions = [7, 12, 24, 48, 60, 100];
  const pageSizeOptions = Array.from(new Set([pageSize, ...defaultOptions]))
    .filter(Boolean)
    .sort((a, b) => a - b);

  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isDropdownOpen]);

  const handleSelectPageSize = (opt) => {
    if (onPageSizeChange) {
      onPageSizeChange(opt);
    }
    if (onPageChange) {
      onPageChange(1);
    }
    setIsDropdownOpen(false);
  };

  const buildPages = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [];
    const SIBS = 1;
    const leftSib = Math.max(currentPage - SIBS, 2);
    const rightSib = Math.min(currentPage + SIBS, totalPages - 1);
    pages.push(1);
    if (leftSib > 2) pages.push("...");
    for (let i = leftSib; i <= rightSib; i++) pages.push(i);
    if (rightSib < totalPages - 1) pages.push("...");
    pages.push(totalPages);
    return pages;
  };

  const pages = buildPages();

  return (
    <div className={`flex flex-col md:flex-row items-center justify-between gap-4 px-6 py-4 bg-white dark:bg-[#020617] border-t border-slate-50 dark:border-white/5 rounded-b-[32px] ${className}`}>
      
      {/* Left: Info & Rows Per Page */}
      {showRowsSelector && (
        <div className="flex items-center gap-6 order-2 md:order-1">
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
              Rows
            </span>
            
            {/* Custom Dropdown Container */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                type="button"
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-black transition-all duration-300
                  ${isDropdownOpen 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' 
                    : 'bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-slate-200 border-slate-100 dark:border-white/10 hover:border-indigo-600 hover:bg-white'}
                  border
                `}
              >
                {pageSize}
                <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : 'text-slate-400'}`} />
              </button>

              {/* Directly Anchored Dropdown Menu (Full Height, No Scrollbar) */}
              {isDropdownOpen && (
                <div 
                  className="absolute bottom-full mb-2 left-0 w-28 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200 backdrop-blur-xl"
                >
                  <div className="py-1.5">
                    {pageSizeOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleSelectPageSize(opt)}
                        className={`
                          w-full flex items-center justify-between px-3.5 py-2 text-[11px] font-bold transition-colors
                          ${pageSize === opt 
                            ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 font-black' 
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'}
                        `}
                      >
                        {opt}
                        {pageSize === opt && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" strokeWidth={3} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {totalResults !== undefined && (
            <div className="h-5 w-[1px] bg-slate-100 dark:bg-white/10 hidden sm:block" />
          )}

          {totalResults !== undefined && (
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Showing <span className="text-slate-900 dark:text-white">{totalResults > 0 ? ((currentPage - 1) * pageSize + 1).toLocaleString('en-IN') : 0}</span>-
              <span className="text-slate-900 dark:text-white">{Math.min(currentPage * pageSize, totalResults).toLocaleString('en-IN')}</span> of 
              <span className="text-slate-900 dark:text-white ml-1">{totalResults.toLocaleString('en-IN')}</span>
            </p>
          )}
        </div>
      )}

      {/* Right: Navigation Controls */}
      <div className={`flex items-center gap-3 order-1 ${showRowsSelector ? 'md:order-2' : 'w-full justify-center sm:justify-end'}`}>
        <div className="flex items-center p-1 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1 px-1">
            {pages.map((p, idx) => (
              p === "..." ? (
                <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-slate-300">
                  <MoreHorizontal className="w-4 h-4" />
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={`
                    w-8 h-8 rounded-lg text-[11px] font-black transition-all
                    ${p === currentPage 
                      ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm shadow-slate-200/50 dark:shadow-none ring-1 ring-slate-100 dark:ring-indigo-500' 
                      : 'text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/10'}
                  `}
                >
                  {p}
                </button>
              )
            ))}
          </div>

          <button
            type="button"
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => onPageChange(currentPage + 1)}
            className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
