import { Plus, Minus } from "lucide-react";

export default function WeightInput({ value = 0, onChange, readOnly }) {

  const handleInput = (e) => {
    if (readOnly) return;
    let val = Number(e.target.value);
    if (val > 100) val = 100;
    if (val < 0) val = 0;
    onChange(val);
  };

  const increase = () => {
    if (readOnly) return;
    onChange(Math.min(100, value + 5));
  };

  const decrease = () => {
    if (readOnly) return;
    onChange(Math.max(0, value - 5));
  };

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {!readOnly && (
        <button
          type="button"
          onClick={decrease}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all active:scale-95 shadow-sm"
          title="Decrease weight"
        >
          <Minus size={14} strokeWidth={3} />
        </button>
      )}

      <div className={`flex items-center bg-white dark:bg-white/5 border-2 ${readOnly ? "border-slate-100 dark:border-white/5" : "border-slate-200 dark:border-white/10 focus-within:border-blue-500 dark:focus-within:border-indigo-500"} rounded-lg px-2 h-8 transition-all`}>
        <input
          type="number"
          min="0"
          max="100"
          value={value === 0 ? "0" : Number(value).toString()}
          onChange={handleInput}
          readOnly={readOnly}
          className={`w-8 bg-transparent text-center outline-none text-xs font-black text-slate-800 dark:text-slate-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${readOnly ? "cursor-default" : ""}`}
        />
        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 ml-0.5">%</span>
      </div>

      {!readOnly && (
        <button
          type="button"
          onClick={increase}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all active:scale-95 shadow-sm"
          title="Increase weight"
        >
          <Plus size={14} strokeWidth={3} />
        </button>
      )}
    </div>
  );
}