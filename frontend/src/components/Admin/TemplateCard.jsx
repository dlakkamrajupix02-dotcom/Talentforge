// export default function TemplateCard({
//   template,
//   onPreview,
//   onUse
// }) {

//   return (
//     <div className="border p-4 rounded">

//       <h3 className="font-semibold">
//         {template.title}
//       </h3>

//       <p className="text-sm text-gray-500">
//         {template.industry}
//       </p>

//       <div className="flex gap-2 mt-3">

//         <button
//           className="border px-3 py-1"
//           onClick={() => onPreview(template)}
//         >
//           Preview
//         </button>

//         <button
//           className="bg-blue-600 text-white px-3 py-1"
//           onClick={() => onUse(template)}
//         >
//           Use Template
//         </button>

//       </div>

//     </div>
//   );
// }


// import { 
//   Briefcase, 
//   Eye, 
//   ArrowRight, 
//   FileText,
//   Building2,
//   Stethoscope,
//   Landmark,
//   Factory,
//   Truck,
//   ShoppingBag,
//   Code2,
//   HeartPulse,
//   TrendingUp,
//   Wrench
// } from "lucide-react";
// import { useState } from "react";

// const industryConfig = {
//   Technology: { icon: Code2, color: "blue", bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
//   Healthcare: { icon: HeartPulse, color: "emerald", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
//   Finance: { icon: Landmark, color: "amber", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
//   Manufacturing: { icon: Factory, color: "slate", bg: "bg-slate-100", border: "border-slate-200", text: "text-slate-700" },
//   Logistics: { icon: Truck, color: "indigo", bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700" },
//   Retail: { icon: ShoppingBag, color: "rose", bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700" }
// };

// export default function TemplateCard({ template, viewMode, onPreview, onUse }) {
//   const [isHovered, setIsHovered] = useState(false);
//   const config = industryConfig[template.industry] || industryConfig.Technology;
//   const Icon = config.icon;

//   if (viewMode === "list") {
//     return (
//       <div 
//         className="group bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-lg hover:border-blue-300 transition-all duration-200 flex items-center gap-4"
//         onMouseEnter={() => setIsHovered(true)}
//         onMouseLeave={() => setIsHovered(false)}
//       >
//         <div className={`w-14 h-14 ${config.bg} ${config.border} border rounded-xl flex items-center justify-center flex-shrink-0`}>
//           <Icon className={`w-7 h-7 ${config.text}`} />
//         </div>
        
//         <div className="flex-1 min-w-0">
//           <div className="flex items-center gap-2 mb-1">
//             <h3 className="font-bold text-slate-900 truncate">{template.title}</h3>
//             <span className={`px-2 py-0.5 ${config.bg} ${config.text} text-xs font-medium rounded-full`}>
//               {template.industry}
//             </span>
//           </div>
//           <p className="text-sm text-slate-500 line-clamp-1">{template.content.summary}</p>
//         </div>

//         <div className="flex items-center gap-2">
//           <button
//             onClick={() => onPreview(template)}
//             className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
//             title="Preview"
//           >
//             <Eye className="w-5 h-5" />
//           </button>
//           <button
//             onClick={() => onUse(template)}
//             className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-all hover:shadow-lg group/btn"
//           >
//             Use
//             <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
//           </button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div 
//       className="group bg-white rounded-2xl border-2 border-slate-200 overflow-hidden hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col"
//       onMouseEnter={() => setIsHovered(true)}
//       onMouseLeave={() => setIsHovered(false)}
//     >
//       {/* Card Header */}
//       <div className="p-5 border-b border-slate-100">
//         <div className="flex items-start justify-between mb-3">
//           <div className={`w-12 h-12 ${config.bg} ${config.border} border rounded-xl flex items-center justify-center`}>
//             <Icon className={`w-6 h-6 ${config.text}`} />
//           </div>
//           <span className={`px-3 py-1 ${config.bg} ${config.text} text-xs font-semibold rounded-full`}>
//             {template.industry}
//           </span>
//         </div>
        
//         <h3 className="font-bold text-slate-900 text-lg mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors">
//           {template.title}
//         </h3>
        
//         <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
//           {template.content.summary}
//         </p>
//       </div>

//       {/* Quick Stats */}
//       <div className="px-5 py-3 bg-slate-50/50 border-b border-slate-100">
//         <div className="flex items-center gap-4 text-xs text-slate-500">
//           <span className="flex items-center gap-1">
//             <FileText className="w-3.5 h-3.5" />
//             {template.content.responsibilities?.length || 0} responsibilities
//           </span>
//           <span className="flex items-center gap-1">
//             <Briefcase className="w-3.5 h-3.5" />
//             {(template.content.qualifications?.required?.length || 0) + (template.content.qualifications?.preferred?.length || 0)} qualifications
//           </span>
//         </div>
//       </div>

//       {/* Actions */}
//       <div className="p-4 mt-auto flex gap-2">
//         <button
//           onClick={() => onPreview(template)}
//           className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-slate-200 text-slate-600 rounded-xl font-medium hover:border-slate-300 hover:bg-slate-50 transition-all"
//         >
//           <Eye className="w-4 h-4" />
//           Preview
//         </button>
//         <button
//           onClick={() => onUse(template)}
//           className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0"
//         >
//           Use Template
//           <ArrowRight className="w-4 h-4" />
//         </button>
//       </div>
//     </div>
//   );
// }

import { forwardRef, useRef, useImperativeHandle, useState } from "react";
import { 
  Eye, 
  ArrowRight, 
  FileText,
  Briefcase,
  Code2,
  HeartPulse,
  Landmark,
  Factory,
  Truck,
  ShoppingBag,
  RefreshCw,
  MapPin,
  Building2
} from "lucide-react";

const industryConfig = {
  Technology: { icon: Code2, color: "blue", bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
  Healthcare: { icon: HeartPulse, color: "emerald", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
  Finance: { icon: Landmark, color: "amber", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
  Manufacturing: { icon: Factory, color: "slate", bg: "bg-slate-100", border: "border-slate-200", text: "text-slate-700" },
  Logistics: { icon: Truck, color: "indigo", bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700" },
  Retail: { icon: ShoppingBag, color: "rose", bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700" }
};

const TemplateCard = forwardRef(({ template, viewMode, onPreview, onUse, isAnimating, isUsing, isDisabled }, ref) => {
  const [isHovered, setIsHovered] = useState(false);
  const localRef = useRef(null);

  useImperativeHandle(ref, () => localRef.current);
  
  // Data normalization for robust rendering based on JD structure
  const templateContent = template.content || {};
  const innerContent = templateContent.content || templateContent;

  const displaySummary = template.professional_summary || template.responsibilities_overview || innerContent.summary || "";
  const dutiesCount = (innerContent.key_duties || innerContent.responsibilities || []).length;
  const qualsCount = (
    (innerContent.qualifications_required || innerContent.qualifications?.required || []).length + 
    (innerContent.qualifications_preferred || innerContent.qualifications?.preferred || []).length +
    (innerContent.required_licenses_certifications || innerContent.licenses_and_certifications || []).length
  );

  const displayDepartment = template.department || innerContent.department || templateContent.department || "General";
  const displayEmployment = template.employment_type || template.employmentType || innerContent.employment_type || innerContent.employmentType || "Full-Time";


  const config = industryConfig[template.industry] || industryConfig.Technology;
  const Icon = config.icon;

  // Hide card when it's animating (replaced by morphing layer)
  if (isAnimating) {
    return <div ref={ref} className="invisible" />;
  }

  if (viewMode === "list") {
    return (
      <div 
        ref={localRef}
        className="group bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-white/10 p-4 hover:shadow-lg dark:hover:border-indigo-500/50 transition-all duration-200 flex items-center gap-4"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className={`w-14 h-14 ${config.bg} ${config.border} border rounded-xl flex items-center justify-center flex-shrink-0 dark:bg-opacity-10 dark:border-opacity-20`}>
          <Icon className={`w-7 h-7 ${config.text} dark:text-opacity-90`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-slate-900 dark:text-white truncate">{template.title}</h3>
            <span className={`px-2 py-0.5 ${config.bg} ${config.text} text-xs font-medium rounded-full dark:bg-opacity-10 dark:text-opacity-90`}>
              {template.industry}
            </span>
            {(template.job_level || template.jobLevel || innerContent.job_level || innerContent.jobLevel) && (
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider rounded-full border border-slate-200 dark:border-white/10">
                {template.job_level || template.jobLevel || innerContent.job_level || innerContent.jobLevel}
              </span>
            )}
            {displayDepartment && (
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider rounded-full border border-slate-200 dark:border-white/10 truncate max-w-[120px]" title={displayDepartment}>
                {displayDepartment}
              </span>
            )}
            {displayEmployment && (
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider rounded-full border border-slate-200 dark:border-white/10 truncate max-w-[120px]" title={displayEmployment}>
                {displayEmployment}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">{displaySummary}</p>
        </div>


        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPreview(template, localRef.current);
            }}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
          >
            <Eye className="w-5 h-5" />
          </button>
          <button
            onClick={() => onUse(template)}
            disabled={isUsing}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all group/btn shadow-lg ${
              isUsing 
                ? 'bg-slate-200 dark:bg-white/10 text-slate-400 cursor-not-allowed shadow-none' 
                : 'bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white shadow-slate-900/10 dark:shadow-indigo-500/20'
            }`}
          >
            {isUsing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Use
                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={localRef}
      className="group bg-white dark:bg-[#0f172a] rounded-2xl border-2 border-slate-200 dark:border-white/10 overflow-hidden hover:border-blue-300 dark:hover:border-indigo-500 hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-indigo-500/10 transition-all duration-300 flex flex-col"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="p-5 border-b border-slate-100 dark:border-white/5">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-12 h-12 ${config.bg} ${config.border} border rounded-xl flex items-center justify-center dark:bg-opacity-10 dark:border-opacity-20`}>
            <Icon className={`w-6 h-6 ${config.text} dark:text-opacity-90`} />
          </div>
          <div className="flex flex-wrap gap-1.5 justify-end">
            {(template.job_level || template.jobLevel || innerContent.job_level || innerContent.jobLevel) && (
              <span className="px-2.5 py-1 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-xs font-semibold rounded-full border border-slate-200 dark:border-white/10">
                {template.job_level || template.jobLevel || innerContent.job_level || innerContent.jobLevel}
              </span>
            )}
            <span className={`px-3 py-1 ${config.bg} ${config.text} text-xs font-semibold rounded-full dark:bg-opacity-10 dark:text-opacity-90`}>
              {template.industry}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-bold text-slate-900 dark:text-white text-lg line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-indigo-400 transition-colors">
            {template.title}
          </h3>
          {template.template_code && (
            <span className="shrink-0 px-1.5 py-0.5 bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 text-[9px] font-black uppercase tracking-tighter rounded border border-slate-200 dark:border-white/10">
              {template.template_code}
            </span>
          )}
        </div>

        
        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
          {displaySummary}
        </p>

      </div>

      <div className="px-5 py-3 bg-slate-50/50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5 truncate min-w-0" title={displayDepartment}>
            <Building2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
            <span className="truncate">{displayDepartment}</span>
          </span>
          <span className="flex items-center gap-1.5 truncate min-w-0" title={displayEmployment}>
            <Briefcase className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
            <span className="truncate">{displayEmployment}</span>
          </span>
          {(template.location || innerContent.location) && (
            <span className="flex items-center gap-1.5 truncate min-w-0" title={template.location || innerContent.location}>
              <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
              <span className="truncate">{template.location || innerContent.location}</span>
            </span>
          )}
        </div>
      </div>

      <div className="p-4 mt-auto flex gap-2">
        <button
          onClick={() => onPreview(template, localRef.current)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 rounded-xl font-medium hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
        >
          <Eye className="w-4 h-4" />
          Preview
        </button>
        <button
          onClick={() => onUse(template)}
          disabled={isUsing}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium shadow-lg transition-all ${
            isUsing 
              ? 'bg-slate-100 dark:bg-white/5 text-slate-400 cursor-not-allowed shadow-none' 
              : 'bg-blue-600 dark:bg-indigo-600 hover:bg-blue-700 dark:hover:bg-indigo-700 text-white shadow-blue-500/25 dark:shadow-indigo-500/25 hover:-translate-y-0.5 active:translate-y-0'
          }`}
        >
          {isUsing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Use
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
});

TemplateCard.displayName = 'TemplateCard';

export default TemplateCard;