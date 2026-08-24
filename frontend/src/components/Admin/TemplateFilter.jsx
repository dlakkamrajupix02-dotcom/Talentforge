// export default function TemplateFilter({ industries, setIndustry }) {

//   return (
//     <div className="flex gap-3 mb-4">

//       {industries.map((item) => (
//         <button
//           key={item}
//           onClick={() => setIndustry(item)}
//           className="border px-3 py-1 rounded"
//         >
//           {item}
//         </button>
//       ))}

//     </div>
//   );

// }

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Filter } from "lucide-react";

export default function TemplateFilter({ industries, selected, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 border-2 border-slate-200 dark:border-white/10 rounded-xl font-medium text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20 transition-all"
      >
        <Filter className="w-4 h-4" />
        {selected === "All" ? "All Industries" : selected}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-[#1e293b] rounded-xl shadow-xl border border-slate-200 dark:border-white/10 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2">
            {industries.map((industry) => (
              <button
                key={industry}
                onClick={() => {
                  onSelect(industry);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${selected === industry 
                    ? "bg-blue-50 dark:bg-indigo-500/10 text-blue-700 dark:text-indigo-400" 
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                  }
                `}
              >
                {industry === "All" ? "All Industries" : industry}
                {selected === industry && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}