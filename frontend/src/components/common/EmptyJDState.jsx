 

// import { useNavigate } from "react-router-dom";
// import { 
//   FileText, 
//   Sparkles, 
//   LayoutTemplate, 
//   ArrowRight, 
//   Wand2, 
//   Plus,
//   Search,
//   Briefcase
// } from "lucide-react";
// import { useState } from "react";

// export default function EmptyJDState() {
//   const navigate = useNavigate();
//   const [hoveredCard, setHoveredCard] = useState(null);

//   const quickExamples = [
//     { title: "ICU Registered Nurse", industry: "Healthcare", icon: "🏥" },
//     { title: "Senior React Developer", industry: "Technology", icon: "💻" },
//     { title: "Financial Analyst", industry: "Finance", icon: "📊" },
//   ];

//   return (
//     <div className="h-full flex flex-col items-center justify-center p-8 relative overflow-hidden">
//       {/* Animated Background Elements */}
//       <div className="absolute inset-0 overflow-hidden pointer-events-none">
//         <div className="absolute top-20 left-20 w-64 h-64 bg-blue-200/20 rounded-full blur-3xl animate-pulse" />
//         <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl animate-pulse delay-1000" />
//         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-blue-100/40 to-indigo-100/40 rounded-full blur-3xl" />
//       </div>

//       {/* Main Content */}
//       <div className="relative z-10 max-w-2xl w-full">
        
//         {/* Hero Illustration */}
//         <div className="relative mb-8">
//           <div className="w-32 h-32 mx-auto relative">
//             {/* Outer rotating ring */}
//             <div className="absolute inset-0 border-2 border-dashed border-slate-300 rounded-full animate-[spin_20s_linear_infinite]" />
            
//             {/* Middle ring */}
//             <div className="absolute inset-4 border-2 border-slate-200 rounded-full" />
            
//             {/* Inner content */}
//             <div className="absolute inset-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full shadow-2xl shadow-blue-500/30 flex items-center justify-center transform hover:scale-105 transition-transform duration-300">
//               <FileText className="w-10 h-10 text-white" />
//             </div>

//             {/* Floating elements */}
//             <div className="absolute -top-2 -right-2 w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center animate-bounce delay-300">
//               <Sparkles className="w-5 h-5 text-amber-500" />
//             </div>
//             <div className="absolute -bottom-2 -left-2 w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center animate-bounce delay-700">
//               <Wand2 className="w-5 h-5 text-blue-500" />
//             </div>
//           </div>
//         </div>

//         {/* Text Content */}
//         <div className="text-center mb-10">
//           <h2 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">
//             Ready to create your first JD?
//           </h2>
//           <p className="text-slate-500 text-lg max-w-md mx-auto leading-relaxed">
//             Fill in the role details on the left and our AI will generate a complete, compliant job description in seconds.
//           </p>
//         </div>

//         {/* Action Cards */}
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
//           {/* Try Example Card */}
//           <div
//             onMouseEnter={() => setHoveredCard("example")}
//             onMouseLeave={() => setHoveredCard(null)}
//             className={`
//               group relative p-6 bg-white rounded-2xl border-2 cursor-pointer transition-all duration-300
//               ${hoveredCard === "example" 
//                 ? "border-blue-500 shadow-xl shadow-blue-500/10 scale-[1.02]" 
//                 : "border-slate-200 shadow-sm hover:border-blue-300"
//               }
//             `}
//           >
//             <div className="flex items-start gap-4">
//               <div className={`
//                 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300
//                 ${hoveredCard === "example" 
//                   ? "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25" 
//                   : "bg-blue-50"
//                 }
//               `}>
//                 <Sparkles className={`
//                   w-6 h-6 transition-colors duration-300
//                   ${hoveredCard === "example" ? "text-white" : "text-blue-600"}
//                 `} />
//               </div>
//               <div className="flex-1">
//                 <h3 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
//                   Try an example
//                   <ArrowRight className={`
//                     w-4 h-4 transition-all duration-300
//                     ${hoveredCard === "example" ? "translate-x-1 opacity-100" : "opacity-0"}
//                   `} />
//                 </h3>
//                 <p className="text-sm text-slate-500 mb-3">
//                   See how it works with a pre-filled example
//                 </p>
                
//                 {/* Example Preview */}
//                 <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
//                   <span className="text-lg">🏥</span>
//                   <div className="text-left">
//                     <div className="text-sm font-medium text-slate-900">ICU Registered Nurse</div>
//                     <div className="text-xs text-slate-500">Healthcare</div>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Templates Card */}
//           <div
//             onClick={() => navigate("/templates")}
//             onMouseEnter={() => setHoveredCard("template")}
//             onMouseLeave={() => setHoveredCard(null)}
//             className={`
//               group relative p-6 bg-white rounded-2xl border-2 cursor-pointer transition-all duration-300
//               ${hoveredCard === "template" 
//                 ? "border-indigo-500 shadow-xl shadow-indigo-500/10 scale-[1.02]" 
//                 : "border-slate-200 shadow-sm hover:border-indigo-300"
//               }
//             `}
//           >
//             <div className="flex items-start gap-4">
//               <div className={`
//                 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300
//                 ${hoveredCard === "template" 
//                   ? "bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25" 
//                   : "bg-indigo-50"
//                 }
//               `}>
//                 <LayoutTemplate className={`
//                   w-6 h-6 transition-colors duration-300
//                   ${hoveredCard === "template" ? "text-white" : "text-indigo-600"}
//                 `} />
//               </div>
//               <div className="flex-1">
//                 <h3 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
//                   Start from template
//                   <ArrowRight className={`
//                     w-4 h-4 transition-all duration-300
//                     ${hoveredCard === "template" ? "translate-x-1 opacity-100" : "opacity-0"}
//                   `} />
//                 </h3>
//                 <p className="text-sm text-slate-500 mb-3">
//                   Choose from 10+ industry-specific templates
//                 </p>
                
//                 {/* Template Tags */}
//                 <div className="flex flex-wrap gap-1.5">
//                   {["Tech", "Healthcare", "Finance", "Retail"].map((tag) => (
//                     <span 
//                       key={tag}
//                       className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full border border-indigo-100"
//                     >
//                       {tag}
//                     </span>
//                   ))}
//                   <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
//                     +6 more
//                   </span>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Quick Examples Row */}
//         <div className="text-center">
//           <p className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
//             Popular examples
//           </p>
//           <div className="flex flex-wrap justify-center gap-3">
//             {quickExamples.map((example, index) => (
//               <button
//                 key={index}
//                 className={`
//                   group flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full
//                   hover:border-blue-300 hover:shadow-md transition-all duration-200
//                 `}
//               >
//                 <span className="text-lg group-hover:scale-110 transition-transform">
//                   {example.icon}
//                 </span>
//                 <span className="text-sm font-medium text-slate-700">
//                   {example.title}
//                 </span>
//                 <span className="text-xs text-slate-400">
//                   • {example.industry}
//                 </span>
//               </button>
//             ))}
//           </div>
//         </div>

//         {/* Help Text */}
//         <div className="mt-10 text-center">
//           <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-sm text-slate-600">
//             <Search className="w-4 h-4" />
//             <span>Need inspiration?</span>
//             <button className="text-blue-600 font-medium hover:text-blue-700">
//               Browse all templates →
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }


import { useNavigate } from "react-router-dom";
import { 
  FileText, 
  Sparkles, 
  LayoutTemplate, 
  ArrowRight, 
  Wand2, 
  Plus,
  Search,
  Briefcase,
  Stethoscope,
  Code2,
  TrendingUp
} from "lucide-react";
import { useState, useContext } from "react";
import { JDContext } from "../../context/JDContext";

// Example data that will pre-fill the form
const EXAMPLE_JD_DATA = {
  title: "ICU Registered Nurse",
  jobId: "CRI_ICU",
  companyName: "DunRite International",
  department: "Critical Care",
  jobFamily: "Nursing",
  jobLevel: "L3",
  location: "Bengaluru, India",
  city: "Bengaluru",
  countryCode: "IN",
  seniority: "Senior",
  industry: "Healthcare",
  skills: "• 3+ years ICU experience\n• BLS/ACLS certification\n• Ventilator management\n• Critical thinking under pressure\n• Epic EMR proficiency",
  salary_symbol: "₹",
  salary_min_value: "8",
  salary_max_value: "12",
  salary_period: "/yr",
  context: "12-bed ICU unit, night shift availability required, background verification mandatory",
  coreCompetencies: [
    { title: "Critical Thinking", description: "", weight: 40 },
    { title: "Compassion", description: "", weight: 20 },
    { title: "Integrity", description: "", weight: 40 }
  ],
  functionalCompetencies: [
    { title: "Hemodynamic Monitoring", description: "", weight: 40 },
    { title: "Ventilation Management", description: "", weight: 40 },
    { title: "Epic EMR Proficiency", description: "", weight: 20 }
  ]
};

export default function EmptyJDState({ onFillExample }) {
  const navigate = useNavigate();
  const { user } = useContext(JDContext);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [isFilling, setIsFilling] = useState(false);

  const handleTryExample = async () => {
    setIsFilling(true);
    
    // Simulate a brief "magic" moment
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Call the parent handler with example data
    if (onFillExample) {
      onFillExample(EXAMPLE_JD_DATA);
    }
    
    setIsFilling(false);
  };

  const quickExamples = [
    { 
      title: "ICU Registered Nurse", 
      industry: "Healthcare", 
      icon: Stethoscope,
      data: EXAMPLE_JD_DATA 
    },
    { 
      title: "Senior React Developer", 
      industry: "Technology", 
      icon: Code2,
      data: {
        title: "Senior React Developer",
        jobId: "ENG_SEN",
        companyName: "Acme Tech",
        department: "Engineering",
        jobFamily: "Software Development",
        jobLevel: "L4",
        location: "Hyderabad, India",
        city: "Hyderabad",
        countryCode: "IN",
        seniority: "Senior",
        industry: "Technology",
        skills: "• 4+ years React.js experience\n• TypeScript & Next.js\n• State management (Redux/Zustand)\n• REST/GraphQL APIs\n• CI/CD pipelines",
        salary_symbol: "₹",
        salary_min_value: "20",
        salary_max_value: "35",
        salary_period: "/yr",
        context: "Product team building fintech solutions, agile environment",
        coreCompetencies: [
          { title: "Technical Leadership", description: "", weight: 40 },
          { title: "Problem Solving", description: "", weight: 40 },
          { title: "Effective Communication", description: "", weight: 20 }
        ],
        functionalCompetencies: [
          { title: "React Ecosystem", description: "", weight: 50 },
          { title: "Frontend Architecture", description: "", weight: 50 }
        ]
      }
    },
    { 
      title: "Financial Analyst", 
      industry: "Finance", 
      icon: TrendingUp,
      data: {
        title: "Financial Analyst",
        jobId: "FIN_FIN",
        companyName: "Global Finance Corp",
        department: "Finance",
        jobFamily: "Analysis",
        jobLevel: "L2",
        location: "Mumbai, India",
        city: "Mumbai",
        countryCode: "IN",
        seniority: "Mid",
        industry: "Finance",
        skills: "• Financial modeling & forecasting\n• Advanced Excel & SQL\n• Variance analysis\n• SAP/Oracle ERP\n• CFA Level 2 preferred",
        salary_symbol: "₹",
        salary_min_value: "12",
        salary_max_value: "18",
        salary_period: "/yr",
        context: "Investment banking division, quarterly reporting focus",
        coreCompetencies: [
          { title: "Business Acumen", description: "", weight: 40 },
          { title: "Analytical Thinking", description: "", weight: 60 }
        ],
        functionalCompetencies: [
          { title: "Financial Modeling", description: "", weight: 60 },
          { title: "SaaS Metrics", description: "", weight: 40 }
        ]
      }
    },
  ];

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-blue-200/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-blue-100/40 to-indigo-100/40 rounded-full blur-3xl" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-2xl w-full">
        
        {/* Hero Illustration */}
        <div className="relative mb-8">
          <div className="w-32 h-32 mx-auto relative">
            <div className="absolute inset-0 border-2 border-dashed border-slate-300 rounded-full animate-[spin_20s_linear_infinite]" />
            <div className="absolute inset-4 border-2 border-slate-200 rounded-full" />
            <div className="absolute inset-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full shadow-2xl shadow-blue-500/30 flex items-center justify-center transform hover:scale-105 transition-transform duration-300">
              <FileText className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center animate-bounce delay-300">
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
            <div className="absolute -bottom-2 -left-2 w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center animate-bounce delay-700">
              <Wand2 className="w-5 h-5 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Text Content */}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">
            Ready to create your first JD?
          </h2>
          <p className="text-slate-500 text-lg max-w-md mx-auto leading-relaxed">
            Fill in the role details on the left and our AI will generate a complete, compliant job description in seconds.
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Try Example Card */}
          <button
            onClick={handleTryExample}
            disabled={isFilling}
            onMouseEnter={() => setHoveredCard("example")}
            onMouseLeave={() => setHoveredCard(null)}
            className={`
              group relative p-6 bg-white rounded-2xl border-2 text-left transition-all duration-300
              ${hoveredCard === "example" 
                ? "border-blue-500 shadow-xl shadow-blue-500/10 scale-[1.02]" 
                : "border-slate-200 shadow-sm hover:border-blue-300"
              }
              ${isFilling ? "opacity-80 cursor-wait" : "cursor-pointer"}
            `}
          >
            <div className="flex items-start gap-4">
              <div className={`
                w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300
                ${hoveredCard === "example" || isFilling
                  ? "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25" 
                  : "bg-blue-50"
                }
              `}>
                {isFilling ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Sparkles className={`
                    w-6 h-6 transition-colors duration-300
                    ${hoveredCard === "example" ? "text-white" : "text-blue-600"}
                  `} />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
                  {isFilling ? "Filling form..." : "Try an example"}
                  <ArrowRight className={`
                    w-4 h-4 transition-all duration-300
                    ${hoveredCard === "example" && !isFilling ? "translate-x-1 opacity-100" : "opacity-0"}
                  `} />
                </h3>
                <p className="text-sm text-slate-500 mb-3">
                  {isFilling 
                    ? "Auto-filling with ICU Nurse details..." 
                    : "See how it works with a pre-filled example"}
                </p>
                
                {/* Example Preview */}
                <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-lg">🏥</span>
                  <div className="text-left">
                    <div className="text-sm font-medium text-slate-900">ICU Registered Nurse</div>
                    <div className="text-xs text-slate-500">Healthcare • Bengaluru</div>
                  </div>
                </div>
              </div>
            </div>
          </button>

          {/* Templates Card */}
          <button
            onClick={() => {
              const role = user?.role?.toLowerCase() || "";
              const path = role.includes("hr") ? "/hr/templates" : "/admin/templates";
              navigate(path);
            }}
            onMouseEnter={() => setHoveredCard("template")}
            onMouseLeave={() => setHoveredCard(null)}
            className={`
              group relative p-6 bg-white rounded-2xl border-2 text-left transition-all duration-300
              ${hoveredCard === "template" 
                ? "border-indigo-500 shadow-xl shadow-indigo-500/10 scale-[1.02]" 
                : "border-slate-200 shadow-sm hover:border-indigo-300"
              }
            `}
          >
            <div className="flex items-start gap-4">
              <div className={`
                w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300
                ${hoveredCard === "template" 
                  ? "bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25" 
                  : "bg-indigo-50"
                }
              `}>
                <LayoutTemplate className={`
                  w-6 h-6 transition-colors duration-300
                  ${hoveredCard === "template" ? "text-white" : "text-indigo-600"}
                `} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
                  Start from template
                  <ArrowRight className={`
                    w-4 h-4 transition-all duration-300
                    ${hoveredCard === "template" ? "translate-x-1 opacity-100" : "opacity-0"}
                  `} />
                </h3>
                <p className="text-sm text-slate-500 mb-3">
                  Choose from 10+ industry-specific templates
                </p>
                
                {/* Template Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {["Tech", "Healthcare", "Finance", "Retail"].map((tag) => (
                    <span 
                      key={tag}
                      className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full border border-indigo-100"
                    >
                      {tag}
                    </span>
                  ))}
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                    +6 more
                  </span>
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Quick Examples Row */}
        <div className="text-center">
          <p className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
            Or jump to popular examples
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {quickExamples.map((example, index) => {
              const Icon = example.icon;
              return (
                <button
                  key={index}
                  onClick={() => onFillExample && onFillExample(example.data)}
                  className={`
                    group flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full
                    hover:border-blue-300 hover:shadow-md transition-all duration-200
                  `}
                >
                  <Icon className="w-4 h-4 text-slate-500 group-hover:text-blue-500 transition-colors" />
                  <span className="text-sm font-medium text-slate-700">
                    {example.title}
                  </span>
                  <span className="text-xs text-slate-400">
                    • {example.industry}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Success Hint */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full text-sm text-green-700">
            <Sparkles className="w-4 h-4" />
            <span>Click "Try an example" → Then hit Generate JD to see the magic!</span>
          </div>
        </div>
      </div>
    </div>
  );
}