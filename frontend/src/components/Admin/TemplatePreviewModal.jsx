// export default function TemplatePreviewModal({
//   template,
//   onClose,
//   onUse
// }) {

//   if (!template) return null;

//   return (
//     <div className="fixed inset-0 bg-black/40 flex justify-center items-center">

//       <div className="bg-white w-[700px] max-h-[80vh] overflow-auto p-6 rounded">

//         <h2 className="text-xl font-semibold mb-4">
//           {template.title}
//         </h2>

//         <h3 className="font-semibold">Summary</h3>
//         <p>{template.content.summary}</p>

//         <h3 className="mt-4 font-semibold">Responsibilities</h3>
//         <ul className="list-disc ml-6">
//           {template.content.responsibilities.map((item, i) => (
//             <li key={i}>{item}</li>
//           ))}
//         </ul>

//         <h3 className="mt-4 font-semibold">
//           Required Qualifications
//         </h3>
//         <ul className="list-disc ml-6">
//           {template.content.qualifications_required.map((item, i) => (
//             <li key={i}>{item}</li>
//           ))}
//         </ul>

//         <div className="flex justify-end gap-3 mt-6">

//           <button
//             className="border px-4 py-2"
//             onClick={onClose}
//           >
//             Close
//           </button>

//           <button
//             className="bg-blue-600 text-white px-4 py-2"
//             onClick={() => onUse(template)}
//           >
//             Use Template
//           </button>

//         </div>

//       </div>

//     </div>
//   );
// }

import { 
  X, 
  ArrowRight, 
  CheckCircle2, 
  FileText, 
  Briefcase,
  Building2,
  MapPin,
  Clock
} from "lucide-react";
import { useEffect } from "react";

export default function TemplatePreviewModal({ template, onClose, onUse }) {
  useEffect(() => {
    if (template) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [template]);

  if (!template) return null;

  const renderListItem = (item) => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object') {
      return item.point || item.responsibility || item.qualification || item.text || JSON.stringify(item);
    }
    return String(item);
  };

  const content = template.content || {};
  const summary = template.professional_summary || template.responsibilities_overview || content.summary || "";
  const responsibilities = content.key_duties || content.responsibilities || [];
  const requiredQuals = content.qualifications_required || content.qualifications?.required || [];
  const preferredQuals = content.qualifications_preferred || content.qualifications?.preferred || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-200 flex flex-col">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-200 bg-slate-50/50 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full">
                {template.industry}
              </span>
              <span className="text-slate-400 text-sm flex items-center gap-1">
                <FileText className="w-4 h-4" />
                Template #{template.id}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">{template.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Summary */}
          <section>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Summary
            </h3>
            <p className="text-slate-700 leading-relaxed text-lg">{summary}</p>
          </section>

          {/* Responsibilities */}
          <section>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Key Responsibilities
            </h3>
            <ul className="space-y-3">
              {responsibilities.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-slate-700">{renderListItem(item)}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Qualifications */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Required */}
            <section>
              <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Required
              </h3>
              <ul className="space-y-2">
                {requiredQuals.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-slate-700">
                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2 flex-shrink-0" />
                    <span className="text-sm">{renderListItem(item)}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Preferred */}
            <section>
              <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Preferred
              </h3>
              <ul className="space-y-2">
                {preferredQuals.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-slate-700">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-2 flex-shrink-0" />
                    <span className="text-sm">{renderListItem(item)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* EEO Statement */}
          <section className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
            <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Compliance
            </h3>
            <p className="text-sm text-emerald-800">{template.content.eeo_statement}</p>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="px-8 py-6 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-6 py-3 text-slate-600 font-medium hover:text-slate-900 transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => onUse(template)}
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            Use This Template
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}