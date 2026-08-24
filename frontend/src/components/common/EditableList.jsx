import { HighlightedText } from "./HighlightedText";
import { listItemDisplayText } from "../../utils/formatJD";

export default function EditableList({ items = [], setItems, readOnly = false, onRegeneratePoint }) {

  const updateItem = (index, value) => {
    const updated = [...items];
    updated[index] = value;
    setItems(updated);
  };

  const addItem = () => {
    setItems([...items, ""]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="flex gap-3 items-start group">
          <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
          
          <div className="flex-1">
            {readOnly ? (
              <HighlightedText 
                text={listItemDisplayText(item)} 
                className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed py-1"
              />
            ) : (
              <input
                value={listItemDisplayText(item)}
                onChange={(e) => updateItem(index, e.target.value)}
                className="w-full bg-transparent border-b border-slate-100 dark:border-white/5 focus:border-indigo-500 outline-none p-1 text-sm text-slate-700 dark:text-slate-300 transition-colors"
                placeholder="List item..."
              />
            )}
          </div>

          {!readOnly && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
              {onRegeneratePoint && (
                <button
                  onClick={() => onRegeneratePoint(index, item)}
                  className="mt-1 text-slate-300 hover:text-indigo-500 p-1 transition-colors"
                  title="Refine this point with AI"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
                </button>
              )}
              <button
                onClick={() => removeItem(index)}
                className="mt-1 text-slate-300 hover:text-rose-500 p-1 transition-colors"
                title="Remove item"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
          )}
        </div>
      ))}

      {!readOnly && (
        <button
          onClick={addItem}
          className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-widest hover:text-indigo-700 transition-colors px-1 mt-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          Add Item
        </button>
      )}
    </div>
  );
}