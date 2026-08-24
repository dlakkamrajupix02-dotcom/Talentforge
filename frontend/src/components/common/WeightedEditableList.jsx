import { Plus, X, GripVertical } from "lucide-react";
import { Reorder, useDragControls } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import WeightInput from "./WeightInput";
import { HighlightedText } from "./HighlightedText";
import { stripHighlightTags, rebalanceWeights } from "../../utils/formatJD";
import SearchableDropdown from "./SearchableDropdown";

// Auto-expanding Textarea Component
function AutoExpandingTextarea({ value, onChange, placeholder, className, rows = 1, onFocus, onBlur, readOnly }) {
  const textareaRef = useRef(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  return (
    <div className="w-full">
      {readOnly ? (
        <HighlightedText 
          text={value} 
          className={`${className} py-0.5`}
        />
      ) : (
        <textarea
          ref={textareaRef}
          value={stripHighlightTags(value)}
          onChange={(e) => {
            if (!readOnly) {
              onChange(e.target.value);
              adjustHeight();
            }
          }}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          rows={rows}
          readOnly={readOnly}
          className={`${className} resize-none overflow-hidden block w-full leading-relaxed ${readOnly ? "cursor-default" : ""}`}
        />
      )}
    </div>
  );
}

export default function WeightedEditableList({
  items = [],
  setItems,
  titlePlaceholder = "Task description...",
  descriptionPlaceholder = "Additional details...",
  showDescription = false,
  readOnly = false,
  hideWeight = false,
  onRegeneratePoint,
  options // Add options here
}) {
  const [isAnyItemDragging, setIsAnyItemDragging] = useState(false);

  const updateItemTitle = (index, value) => {
    const updated = [...items];
    updated[index] = { ...updated[index], title: value };
    setItems(updated);
  };

  const updateItemDescription = (index, value) => {
    const updated = [...items];
    updated[index] = { ...updated[index], description: value };
    setItems(updated);
  };

  const updateItemWeight = (index, value) => {
    const updated = rebalanceWeights(items, index, value);
    setItems(updated);
  };

  const addItem = () => {
    setItems([...items, { id: `new-${Date.now()}-${Math.random()}`, title: "", description: "", weight: 0 }]);
  };

  const addCompetencyItem = (title) => {
    if (!title) return;
    setItems([...items, { id: `new-${Date.now()}-${Math.random()}`, title, description: "", weight: 0 }]);
  };

  const removeItem = (index) => {
    const itemToRemove = items[index];
    const removedWeight = Number(itemToRemove?.weight) || 0;
    const updated = items.filter((_, i) => i !== index);

    if (updated.length > 0 && removedWeight > 0) {
      const remainingWeight = updated.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
      
      if (remainingWeight === 0) {
        const avg = Math.floor(100 / updated.length);
        let remainder = 100 % updated.length;
        updated.forEach(item => {
          item.weight = avg + (remainder-- > 0 ? 1 : 0);
        });
      } else {
        let distributed = 0;
        updated.forEach((item, i) => {
          if (i === updated.length - 1) {
             item.weight = (Number(item.weight) || 0) + (removedWeight - distributed);
          } else {
             const proportion = (Number(item.weight) || 0) / remainingWeight;
             const add = Math.round(proportion * removedWeight);
             item.weight = (Number(item.weight) || 0) + add;
             distributed += add;
          }
        });
      }
    }
    setItems(updated);
  };

  const totalWeight = items.reduce((acc, item) => acc + (Number(item?.weight) || 0), 0);

  return (
    <div className="space-y-6">
      <Reorder.Group
        axis="y"
        values={items}
        onReorder={setItems}
        className={`space-y-4 ${isAnyItemDragging ? "select-none cursor-grabbing" : ""}`}
      >
        {items.map((item, index) => (
          <ReorderItem
            key={item.id || index}
            item={item}
            index={index}
            updateItemTitle={updateItemTitle}
            updateItemDescription={updateItemDescription}
            updateItemWeight={updateItemWeight}
            removeItem={removeItem}
            showDescription={showDescription}
            titlePlaceholder={titlePlaceholder}
            descriptionPlaceholder={descriptionPlaceholder}
            setGlobalDragging={setIsAnyItemDragging}
            readOnly={readOnly}
            hideWeight={hideWeight}
            onRegeneratePoint={onRegeneratePoint}
          />
        ))}
      </Reorder.Group>

      {!readOnly && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-8 px-2">
          {options && options.length > 0 ? (
            <div className="flex-1">
              <SearchableDropdown
                options={options}
                value=""
                onChange={(val) => addCompetencyItem(val)}
                placeholder={titlePlaceholder || "Select or type competency..."}
                allowCustom={true}
                className="w-full flex items-center justify-between gap-3 px-6 py-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-indigo-300 hover:bg-indigo-50/30 text-slate-400 dark:text-slate-500 hover:text-indigo-600 transition-all duration-300 text-sm font-semibold"
              />
            </div>
          ) : (
            <button
                onClick={addItem}
                className="group flex items-center gap-3 px-6 py-4 flex-1 rounded-2xl border-2 border-dashed border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/30 text-slate-400 hover:text-indigo-600 transition-all duration-300"
            >
                <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                <Plus size={18} />
                </div>
                <span className="font-bold text-sm tracking-wide">Add New Item</span>
            </button>
          )}

          {!hideWeight && (
            <div className="flex items-center gap-4 px-6 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">Total Allocation</span>
                <span className="text-[10px] font-medium text-slate-500">Must equal 100%</span>
              </div>
              <div className={`
                px-5 py-2 rounded-xl font-black text-lg transition-all duration-500
                ${totalWeight === 100
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-100 ring-4 ring-emerald-500/5"
                  : "bg-amber-50 text-amber-600 border border-amber-100 ring-4 ring-amber-500/5"
                }
              `}>
                {totalWeight}%
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// Individual Item Component to handle its own drag controls
function ReorderItem({ 
  item, 
  index, 
  updateItemTitle, 
  updateItemDescription, 
  updateItemWeight, 
  removeItem, 
  showDescription, 
  titlePlaceholder, 
  descriptionPlaceholder, 
  setGlobalDragging,
  readOnly,
  hideWeight,
  onRegeneratePoint
}) {
  const controls = useDragControls();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <Reorder.Item
      value={item}
      dragListener={!readOnly}
      dragControls={controls}
      onDragStart={() => !readOnly && setGlobalDragging(true)}
      onDragEnd={() => setGlobalDragging(false)}
      whileDrag={readOnly ? {} : { 
        scale: 1.01, 
        backgroundColor: "rgba(248, 250, 252, 0.9)",
        boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
        zIndex: 50
      }}
      className={`
        flex flex-col group rounded-xl border transition-colors duration-200 relative min-h-[100px] overflow-hidden
        ${isFocused ? "bg-white border-indigo-200 shadow-md ring-2 ring-indigo-500/5" : "bg-white border-slate-200 hover:border-slate-300"}
        ${readOnly ? "bg-slate-50/10 cursor-default" : ""}
      `}
    >
      <div className="flex gap-5 items-start p-5">
        {/* Numbering & Drag Handle - Integrated & Cleaner */}
        <div 
          onPointerDown={(e) => {
            if (!readOnly) {
              e.preventDefault();
              controls.start(e);
            }
          }}
          className={`
            flex flex-col items-center gap-1 shrink-0 select-none ${readOnly ? "cursor-default" : "cursor-grab active:cursor-grabbing"} p-1 rounded-lg transition-colors
            ${isFocused ? "bg-indigo-50/50" : "hover:bg-slate-50"}
          `}
        >
            <span className={`
                text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-md border transition-colors
                ${isFocused ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 text-slate-400 border-slate-200"}
            `}>
                {(index + 1).toString().padStart(2, '0')}
            </span>
            {!readOnly && (
              <div className="text-slate-300 group-hover:text-indigo-400 transition-colors">
                  <GripVertical size={14} strokeWidth={2.5} />
              </div>
            )}
        </div>

        {/* Main Content Area - Refined Typography */}
        <div className="flex-1 min-w-0">
            <AutoExpandingTextarea
            value={item?.title || ""}
            onChange={(val) => updateItemTitle(index, val)}
            readOnly={readOnly}
            onFocus={() => !readOnly && setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={titlePlaceholder}
            className={`bg-transparent px-0 py-0.5 outline-none font-semibold text-slate-800 placeholder:text-slate-200 focus:text-indigo-600 transition-all text-[15px] leading-snug ${readOnly ? "cursor-default" : ""}`}
            />
            {showDescription && (item?.description || isFocused) && (
            <AutoExpandingTextarea
                value={item?.description || ""}
                onChange={(val) => updateItemDescription(index, val)}
                readOnly={readOnly}
                onFocus={() => !readOnly && setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder=""
                className={`bg-transparent px-0 py-0.5 outline-none text-[13px] text-slate-500 focus:text-slate-700 transition-all leading-relaxed mt-0.5 ${readOnly ? "cursor-default" : ""}`}
            />
            )}
        </div>

        {!hideWeight && (
          <div className="shrink-0 flex flex-col items-center pl-4 border-l border-slate-100 dark:border-white/5 min-w-[56px]">
            <span className="text-sm font-black text-indigo-500 leading-none">{item?.weight || 0}%</span>
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Weight</span>
          </div>
        )}

        {/* Inline Actions (When weights are hidden) */}
        {hideWeight && !readOnly && (
            <div className="flex items-center gap-2 pt-1 pl-2 shrink-0 border-l border-slate-100 dark:border-white/5">
                {onRegeneratePoint && (
                  <button
                    onClick={() => onRegeneratePoint(index, item)}
                    className="flex items-center justify-center w-8 h-8 text-indigo-400 hover:text-white hover:bg-indigo-500 rounded-lg border border-transparent transition-all"
                    title="Refine this point with AI"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
                  </button>
                )}
                <button
                  onClick={() => removeItem(index)}
                  className="flex items-center justify-center w-8 h-8 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg border border-transparent transition-all"
                  title="Remove item"
                >
                  <X size={15} strokeWidth={2.5} />
                </button>
            </div>
        )}
      </div>

      {/* Integrated Action Toolbar - Smooth Transition & Better Layout */}
      {!hideWeight && (!readOnly) && (
        <div className="flex items-center justify-between px-6 py-2 border-t bg-slate-50/50 border-slate-100 opacity-100">
          <div className="flex items-center gap-6 flex-1 max-w-3xl">
              <div className="flex flex-col gap-0.5">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">Distribute Weight</span>
                  <span className="text-[10px] font-bold text-indigo-600/60 bg-indigo-50 px-1.5 rounded-sm w-fit">{item?.weight || 0}%</span>
              </div>
              <div className="flex-1 pt-0.5">
                  <WeightInput
                      value={item?.weight || 0}
                      onChange={(val) => updateItemWeight(index, val)}
                      readOnly={readOnly}
                  />
              </div>
          </div>
          
          <div className="flex items-center gap-3 ml-8">
              <div className="w-px h-6 bg-slate-200" />
              {onRegeneratePoint && (
                <button
                  onClick={() => onRegeneratePoint(index, item)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-500 bg-indigo-50 hover:bg-indigo-500 hover:text-white rounded-lg border border-indigo-100 hover:border-indigo-500 transition-all shrink-0"
                  title="Refine this point with AI"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
                  Refine
                </button>
              )}
              <button
                onClick={() => removeItem(index)}
                className="flex items-center justify-center w-8 h-8 text-slate-300 hover:text-red-500 hover:bg-white rounded-lg border border-transparent hover:border-red-100 transition-all shrink-0"
                title="Remove item"
              >
              <X size={15} strokeWidth={2.5} />
              </button>
          </div>
        </div>
      )}
    </Reorder.Item>
  );
}

