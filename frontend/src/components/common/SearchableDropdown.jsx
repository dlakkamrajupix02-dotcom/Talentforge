import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export default function SearchableDropdown({ options, value, onChange, placeholder, className, emptyMessage = "No matching options found.", isMulti = false, conflictValues = [], disabled = false, allowCustom = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Normalize options to [{label, value}]
  const normalizedOptions = useMemo(() => {
    return (options || []).map(opt => {
      if (typeof opt === 'string') return { label: opt, value: opt };
      return opt;
    });
  }, [options]);

  // Filter options based on local search query
  const filteredOptions = useMemo(() => {
    let filtered;
    if (!query) {
      filtered = normalizedOptions;
    } else {
      filtered = normalizedOptions.filter(opt => {
        const searchStr = typeof opt.label === 'string' ? opt.label : (opt.searchValue || opt.value || "");
        return searchStr.toLowerCase().includes(query.toLowerCase());
      });
    }

    if (allowCustom && query) {
      const exactMatch = normalizedOptions.find(opt => {
        const searchStr = typeof opt.label === 'string' ? opt.label : (opt.searchValue || opt.value || "");
        return searchStr.toLowerCase() === query.toLowerCase();
      });
      if (!exactMatch) {
        filtered = [...filtered, { label: `Add "${query}"`, value: query, isCustom: true }];
      }
    }

    return filtered;
  }, [normalizedOptions, query, allowCustom]);

  const handleSelect = (opt) => {
    if (isMulti) {
      const currentValues = Array.isArray(value) ? value : [];
      let newValues;
      if (currentValues.includes(opt.value)) {
        newValues = currentValues.filter(v => v !== opt.value);
      } else {
        newValues = [...currentValues, opt.value];
      }
      onChange(newValues);
      setIsOpen(false);
      setQuery('');
    } else {
      onChange(opt.value);
      setIsOpen(false);
      setQuery('');
    }
  };

  const selectedOption = normalizedOptions.find(opt => opt.value === value) || (allowCustom && value ? { label: value, value: value } : undefined);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      
      {/* Target input pretending to be a select box */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between text-left appearance-none ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      >
        <div className={`flex flex-wrap gap-1.5 flex-1 overflow-hidden ${value && (!isMulti || value.length > 0) ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
          {isMulti ? (
            Array.isArray(value) && value.length > 0 ? (
              value.map(val => {
                const opt = normalizedOptions.find(o => o.value === val);
                const isConflict = conflictValues && conflictValues.some(cv => cv.toLowerCase() === val.toLowerCase());
                const chipBg = isConflict ? 'bg-rose-50 dark:bg-rose-500/10' : 'bg-emerald-50 dark:bg-emerald-500/10';
                const chipText = isConflict ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400';
                const chipHover = isConflict ? 'hover:bg-rose-200 dark:hover:bg-rose-500/20' : 'hover:bg-emerald-200 dark:hover:bg-emerald-500/20';

                return (
                  <span key={val} className={`inline-flex items-center gap-1 pl-2 pr-1 py-0.5 ${chipBg} ${chipText} rounded-md text-xs font-semibold z-10 relative`}>
                    <span className="truncate max-w-[150px]">{opt ? opt.label : val}</span>
                    <button
                      type="button"
                      className={`${chipHover} rounded-full p-0.5 transition-colors`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect({value: val});
                      }}
                    >
                      <X size={12} strokeWidth={3} />
                    </button>
                  </span>
                )
              })
            ) : (
              <span className="pointer-events-none truncate">{placeholder || "Select options..."}</span>
            )
          ) : (
            <span className="pointer-events-none truncate">
              {selectedOption ? selectedOption.label : (placeholder || "Select option...")}
            </span>
          )}
        </div>
        <ChevronDown className={`w-5 h-5 text-slate-400 pointer-events-none transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 min-w-[220px] w-full bg-white dark:bg-[#0f172a] rounded-xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Search Box */}
          <div className="p-3 border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (filteredOptions.length > 0) {
                    handleSelect(filteredOptions[0]);
                  }
                } else if (e.key === 'Escape') {
                  setIsOpen(false);
                  setQuery('');
                }
              }}
              placeholder="Search..."
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-white/10 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all dark:text-white dark:placeholder:text-slate-500"
            />
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto p-2 custom-scrollbar">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = isMulti 
                  ? (Array.isArray(value) && value.includes(opt.value))
                  : value === opt.value;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isSelected 
                        ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400' 
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                  >
                    <span className="truncate pr-4">{opt.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 pointer-events-none flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

