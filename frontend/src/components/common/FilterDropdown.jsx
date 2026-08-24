import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function FilterDropdown({ 
  label, 
  options, 
  selected, 
  onSelect, 
  icon: Icon,
  className = "" 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabel = options.find(opt => opt.value === selected)?.label || selected;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 border-2 
          ${isOpen ? "border-blue-500 dark:border-indigo-500 shadow-lg shadow-blue-500/10" : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"} 
          rounded-xl transition-all duration-200 group
        `}
      >
        {Icon && <Icon className={`w-4 h-4 pointer-events-none ${isOpen ? "text-blue-600 dark:text-indigo-400" : "text-slate-400 group-hover:text-slate-500"}`} />}
        <span className={`text-sm font-semibold truncate max-w-[120px] pointer-events-none ${isOpen ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300"}`}>
          {selectedLabel}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 pointer-events-none transition-transform duration-200 ${isOpen ? "rotate-180 text-blue-600 dark:text-indigo-400" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full mt-2 left-0 min-w-[180px] bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden backdrop-blur-xl"
          >
            <div className="p-1.5 max-h-[300px] overflow-y-auto custom-scrollbar">
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onSelect(option.value);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left gap-2
                    ${selected === option.value 
                      ? "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400" 
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"}
                  `}
                >
                  <span className="flex-1">{option.label}</span>
                  {selected === option.value && <Check className="w-4 h-4 shrink-0" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
