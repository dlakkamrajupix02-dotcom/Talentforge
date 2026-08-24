import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Type, ChevronDown, AlignLeft, Calendar, Layers, Circle, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

const CUSTOM_FIELD_TYPES = [
  { key: "TextBox", label: "Text Box", desc: "Single-line free text", icon: Type },
  { key: "Dropdown", label: "Dropdown", desc: "Select one from list", icon: ChevronDown },
  { key: "Paragraph", label: "Paragraph", desc: "Multi-line rich text", icon: AlignLeft },
  { key: "DateTime", label: "Date / Time", desc: "Date and time picker", icon: Calendar },
  { key: "Weights", label: "Weights (%)", desc: "Percentage-based weights", icon: Layers },
  { key: "MultipleChoice", label: "Multiple Choice", desc: "Single selection (radio)", icon: Circle },
  { key: "Checkbox", label: "Checkbox", desc: "Multi-select options", icon: CheckCircle2 }
];

const ToggleSwitch = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
      checked ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
    }`}
  >
    <span
      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

export default function AddSectionModal({ isOpen, onClose, onAddSection, variant = "full" }) {
  const isWizard = variant === "wizard";
  const visibleFieldTypes = isWizard
    ? CUSTOM_FIELD_TYPES.filter((t) => ["TextBox", "Paragraph", "Weights"].includes(t.key))
    : CUSTOM_FIELD_TYPES;

  const [sideLabel, setSideLabel] = useState("");
  const [sideFieldType, setSideFieldType] = useState("TextBox");
  const [sidePlaceholder, setSidePlaceholder] = useState("");
  const [sideUseCustomValue, setSideUseCustomValue] = useState(false);
  const [sideRequired, setSideRequired] = useState(false);
  const [sideHideFromCandidates, setSideHideFromCandidates] = useState(false);
  const [sidePushToCSOD, setSidePushToCSOD] = useState(true);
  const [sideViewSection, setSideViewSection] = useState(true);
  const [sideOptionsInput, setSideOptionsInput] = useState("");

  // Reset form when opened
  React.useEffect(() => {
    if (isOpen) {
      setSideLabel("");
      setSideFieldType("TextBox");
      setSidePlaceholder("");
      setSideUseCustomValue(false);
      setSideRequired(false);
      setSideHideFromCandidates(false);
      setSidePushToCSOD(true);
      setSideViewSection(true);
      setSideOptionsInput("");
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!sideLabel.trim()) {
      toast.error("Section label is required");
      return;
    }
    const resolvedType = (sideFieldType === "Weights" || sideFieldType === "Checkbox") ? "points" : "text";
    const options = ["Dropdown", "MultipleChoice", "Checkbox"].includes(sideFieldType)
      ? sideOptionsInput.split(",").map(o => o.trim()).filter(Boolean)
      : [];
    if (["Dropdown", "MultipleChoice", "Checkbox"].includes(sideFieldType) && options.length === 0) {
      toast.error("At least one option is required");
      return;
    }

    onAddSection({
      label: sideLabel.trim(),
      type: resolvedType,
      fieldType: sideFieldType,
      placeholder: sidePlaceholder.trim(),
      use_custom_value: sideUseCustomValue,
      required: sideRequired,
      hide_from_candidates: sideHideFromCandidates,
      push_to_csod: sidePushToCSOD,
      view_section: sideViewSection,
      options
    });
  };

  const panelContent = (
    <>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-black text-slate-900 dark:text-white">
          {isWizard ? "Add JD Section" : "Configure Section"}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/5 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 flex-1 flex flex-col">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-bold">
            Section Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={sideLabel}
            onChange={(e) => setSideLabel(e.target.value)}
            placeholder="e.g. Benefits, Tech Stack, Skills"
            className="w-full px-4 py-2.5 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/5 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-bold">
            Section Type
          </label>
          <div className="grid grid-cols-1 gap-2">
            {visibleFieldTypes.map((t) => {
              const Icon = t.icon;
              const isSelected = sideFieldType === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setSideFieldType(t.key)}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-blue-50/50 border-blue-500 dark:bg-blue-500/5 dark:border-blue-500'
                      : 'bg-white dark:bg-[#0f172a] border-slate-200 dark:border-white/5 hover:border-slate-350'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    <Icon size={12} />
                  </div>
                  <div className="space-y-0.5">
                    <p className={`text-[10px] font-black uppercase tracking-wider ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-355'}`}>
                      {t.label}
                    </p>
                    {!isWizard && (
                      <p className="text-[9px] text-slate-400 font-medium">{t.desc}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {!isWizard && ["Dropdown", "MultipleChoice", "Checkbox"].includes(sideFieldType) && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-bold">
              Options (comma-separated) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={sideOptionsInput}
              onChange={(e) => setSideOptionsInput(e.target.value)}
              placeholder="e.g. Option 1, Option 2, Option 3"
              className="w-full px-4 py-2.5 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/5 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              required
            />
          </div>
        )}

        {!isWizard && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-bold">
              Placeholder Text
            </label>
            <input
              type="text"
              value={sidePlaceholder}
              onChange={(e) => setSidePlaceholder(e.target.value)}
              placeholder="Hint text shown inside the field..."
              className="w-full px-4 py-2.5 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/5 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
        )}

        <div className="space-y-3.5 pt-2">
          {!isWizard && [
            { key: "useCustomValue", label: "Use Custom Value", desc: "Separate internal key", val: sideUseCustomValue, set: setSideUseCustomValue },
            { key: "required", label: "Mark as Required", desc: "Required before submitting", val: sideRequired, set: setSideRequired },
            { key: "hideFromCandidates", label: "Hide from Candidates", desc: "Visible to recruiters only", val: sideHideFromCandidates, set: setSideHideFromCandidates }
          ].map((toggle) => (
            <div key={toggle.key} className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-white/5 last:border-0">
              <div className="space-y-0.5 pr-2">
                <p className="text-[10px] font-black text-slate-700 dark:text-slate-350 uppercase tracking-wide">{toggle.label}</p>
                <p className="text-[9px] text-slate-400 font-medium">{toggle.desc}</p>
              </div>
              <ToggleSwitch checked={toggle.val} onChange={toggle.set} />
            </div>
          ))}

          <div className="bg-blue-50/50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10 p-3 rounded-xl flex items-center justify-between">
            <div className="space-y-0.5 pr-2">
              <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wide">Push to CSOD</p>
              <p className="text-[9px] text-slate-400 font-medium font-semibold">Sync with Cornerstone</p>
            </div>
            <ToggleSwitch checked={sidePushToCSOD} onChange={setSidePushToCSOD} />
          </div>

          <div className="bg-purple-50/50 dark:bg-purple-500/5 border border-purple-100 dark:border-purple-500/10 p-3 rounded-xl flex items-center justify-between mt-2">
            <div className="space-y-0.5 pr-2">
              <p className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-wide">View Section</p>
              <p className="text-[9px] text-slate-400 font-medium font-semibold">Make this section visible</p>
            </div>
            <ToggleSwitch checked={sideViewSection} onChange={setSideViewSection} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-white/5 mt-auto">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-white dark:bg-transparent border border-slate-200 dark:border-white/10 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-lg shadow-blue-500/20 transition-all"
          >
            {isWizard ? "Add Section" : "Save Section"}
          </button>
        </div>
      </form>
    </>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        isWizard ? (
          <div className="fixed inset-0 z-[1010] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 260 }}
              className="relative w-full sm:max-w-md max-h-[90vh] overflow-y-auto bg-slate-50 dark:bg-[#0b1329] rounded-t-[2rem] sm:rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-2xl p-6 custom-scrollbar"
            >
              {panelContent}
            </motion.div>
          </div>
        ) : (
        <div className="fixed inset-0 z-[1010] flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
          />

          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-[380px] bg-slate-50 dark:bg-[#0b1329] h-full border-l border-slate-200 dark:border-white/10 flex flex-col z-10 overflow-y-auto p-6 text-left shadow-2xl custom-scrollbar"
          >
            {panelContent}
          </motion.div>
        </div>
        )
      )}
    </AnimatePresence>
  );
}
