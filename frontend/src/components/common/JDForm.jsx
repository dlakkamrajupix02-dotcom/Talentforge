// // // import { useState } from "react";

// // // export default function JDForm({ onGenerate }) {

// // //   const [form, setForm] = useState({
// // //     title: "",
// // //     department: "",
// // //     location: "",
// // //     skills: ""
// // //   });

// // //   const handleChange = (e) => {
// // //     setForm({
// // //       ...form,
// // //       [e.target.name]: e.target.value
// // //     });
// // //   };

// // //   return (
// // //     <div className="space-y-3">

// // //       <input
// // //         className="border w-full p-2"
// // //         name="title"
// // //         placeholder="Job Title"
// // //         onChange={handleChange}
// // //       />

// // //       <input
// // //         className="border w-full p-2"
// // //         name="department"
// // //         placeholder="Department"
// // //         onChange={handleChange}
// // //       />

// // //       <input
// // //         className="border w-full p-2"
// // //         name="location"
// // //         placeholder="Location"
// // //         onChange={handleChange}
// // //       />

// // //       <textarea
// // //         className="border w-full p-2"
// // //         name="skills"
// // //         placeholder="Key Skills"
// // //         onChange={handleChange}
// // //       />

// // //       <button
// // //         onClick={() => onGenerate(form)}
// // //         className="bg-blue-600 text-white p-2 w-full rounded"
// // //       >
// // //         Generate JD
// // //       </button>

// // //     </div>
// // //   );
// // // }

// // import { useState } from "react";
// // import { useNavigate } from "react-router-dom";

// // export default function JDForm({ onGenerate }) {

// //   const navigate = useNavigate();

// //   const [form, setForm] = useState({
// //     title: "",
// //     department: "",
// //     location: "",
// //     seniority: "",
// //     industry: "",
// //     skills: "",
// //     salary: "",
// //     context: ""
// //   });

// //   const maxChars = 1000;

// //   const handleChange = (e) => {

// //     const { name, value } = e.target;

// //     setForm({
// //       ...form,
// //       [name]: value
// //     });

// //   };

// //   const handleGenerate = () => {

// //     if (!form.title || !form.location || !form.industry) {
// //       alert("Please fill required fields");
// //       return;
// //     }

// //     onGenerate(form);

// //   };

// //   return (
// //     <div className="space-y-4">
// //       <div className="form-container h-[75vh] overflow-y-auto p-4 bg-white rounded shadow">
// //         <div>
// //           <h2 className="text-lg font-semibold">Create a Job Description</h2>

// //           <p className="text-sm text-gray-500">
// //             Describe the role and we'll generate a complete, compliant JD in
// //             seconds.
// //           </p>
// //         </div>

// //         {/* JOB TITLE */}

// //         <div>
// //           <label className="text-sm font-medium">Job Title *</label>

// //           <input
// //             name="title"
// //             value={form.title}
// //             onChange={handleChange}
// //             placeholder="React Developer"
// //             className="border w-full p-2 rounded"
// //           />
// //         </div>

// //         {/* DEPARTMENT */}

// //         <div>
// //           <label className="text-sm font-medium">Department</label>

// //           <input
// //             name="department"
// //             value={form.department}
// //             onChange={handleChange}
// //             placeholder="Engineering"
// //             className="border w-full p-2 rounded"
// //           />
// //         </div>

// //         {/* LOCATION */}

// //         <div>
// //           <label className="text-sm font-medium">Location *</label>

// //           <input
// //             name="location"
// //             value={form.location}
// //             onChange={handleChange}
// //             placeholder="Bengaluru"
// //             className="border w-full p-2 rounded"
// //           />
// //         </div>

// //         {/* SENIORITY */}

// //         <div>
// //           <label className="text-sm font-medium">Seniority</label>

// //           <select
// //             name="seniority"
// //             value={form.seniority}
// //             onChange={handleChange}
// //             className="border w-full p-2 rounded"
// //           >
// //             <option value="">Select</option>
// //             <option>Junior</option>
// //             <option>Mid</option>
// //             <option>Senior</option>
// //             <option>Lead</option>
// //           </select>
// //         </div>

// //         {/* INDUSTRY */}

// //         <div>
// //           <label className="text-sm font-medium">Industry *</label>

// //           <select
// //             name="industry"
// //             value={form.industry}
// //             onChange={handleChange}
// //             className="border w-full p-2 rounded"
// //           >
// //             <option value="">Select</option>
// //             <option>Technology</option>
// //             <option>Healthcare</option>
// //             <option>Finance</option>
// //             <option>Manufacturing</option>
// //             <option>Retail</option>
// //           </select>
// //         </div>

// //         {/* SKILLS */}

// //         <div>
// //           <label className="text-sm font-medium">
// //             Key Skills & Requirements *
// //           </label>

// //           <textarea
// //             name="skills"
// //             value={form.skills}
// //             onChange={handleChange}
// //             placeholder="2+ years of experience in React..."
// //             maxLength={maxChars}
// //             className="border w-full p-2 rounded h-20"
// //           />

// //           <p className="text-xs text-gray-500">
// //             {form.skills.length}/{maxChars} chars
// //           </p>
// //         </div>

// //         {/* SALARY */}

// //         <div>
// //           <label className="text-sm font-medium">Salary Range</label>

// //           <input
// //             name="salary"
// //             value={form.salary}
// //             onChange={handleChange}
// //             placeholder="1500000"
// //             className="border w-full p-2 rounded"
// //           />
// //         </div>

// //         {/* CONTEXT */}

// //         <div>
// //           <label className="text-sm font-medium">Additional Context</label>

// //           <textarea
// //             name="context"
// //             value={form.context}
// //             onChange={handleChange}
// //             placeholder="Need background verification"
// //             className="border w-full p-2 rounded"
// //           />
// //         </div>
// //       </div>

// //       {/* GENERATE */}

// //       <button
// //         onClick={handleGenerate}
// //         className="bg-blue-600 text-white w-full py-2 rounded"
// //       >
// //         Generate JD
// //       </button>

// //       {/* TEMPLATE SHORTCUT */}

// //       <button
// //         onClick={() => navigate("/templates")}
// //         className="text-blue-600 text-sm"
// //       >
// //         📋 Use a Template instead
// //       </button>
// //     </div>
// //   );

// // }


// // import { useState } from "react";
// // import { useNavigate } from "react-router-dom";
// // import { 
// //   Briefcase, 
// //   Building2, 
// //   MapPin, 
// //   Layers, 
// //   Sparkles, 
// //   DollarSign, 
// //   FileText, 
// //   ChevronRight,
// //   AlertCircle,
// //   Wand2
// // } from "lucide-react";

// // export default function JDForm({ onGenerate }) {
// //   const navigate = useNavigate();

// //   const [form, setForm] = useState({
// //     title: "",
// //     department: "",
// //     location: "",
// //     seniority: "",
// //     industry: "",
// //     skills: "",
// //     salary: "",
// //     context: ""
// //   });

// //   const [focusedField, setFocusedField] = useState(null);
// //   const [isGenerating, setIsGenerating] = useState(false);

// //   const maxChars = 1000;

// //   const handleChange = (e) => {
// //     const { name, value } = e.target;
// //     setForm({
// //       ...form,
// //       [name]: value
// //     });
// //   };

// //   const handleGenerate = async () => {
// //     if (!form.title || !form.location || !form.industry) {
// //       // Shake animation trigger could be added here
// //       return;
// //     }

// //     setIsGenerating(true);
// //     // Simulate brief loading for UX
// //     await new Promise(resolve => setTimeout(resolve, 600));
// //     onGenerate(form);
// //     setIsGenerating(false);
// //   };

// //   const requiredFields = ["title", "location", "industry"];
// //   const filledRequired = requiredFields.filter(field => form[field]).length;
// //   const progress = (filledRequired / requiredFields.length) * 100;

// //   const inputClasses = (fieldName) => `
// //     w-full px-4 py-3 bg-slate-50 border-2 rounded-xl outline-none transition-all duration-300
// //     ${focusedField === fieldName 
// //       ? "border-blue-500 bg-white shadow-lg shadow-blue-500/10" 
// //       : "border-slate-200 hover:border-slate-300"
// //     }
// //     ${form[fieldName] ? "border-slate-300" : ""}
// //   `;

// //   const labelClasses = "block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2";

// //   return (
// //     <div className="h-full flex flex-col bg-slate-50/50">
// //       {/* Header Section */}
// //       <div className="px-6 py-6 bg-white border-b border-slate-200">
// //         <div className="flex items-center justify-between mb-4">
// //           <div>
// //             <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
// //               <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg shadow-blue-500/25">
// //                 <Sparkles className="w-6 h-6 text-white" />
// //               </div>
// //               Create Job Description
// //             </h2>
// //             <p className="text-slate-500 mt-1 text-sm">
// //               AI-powered generation with smart suggestions
// //             </p>
// //           </div>

// //           {/* Progress Indicator */}
// //           <div className="flex items-center gap-3">
// //             <div className="text-right">
// //               <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
// //                 Completion
// //               </span>
// //               <div className="text-sm font-bold text-slate-900">
// //                 {Math.round(progress)}%
// //               </div>
// //             </div>
// //             <div className="w-12 h-12 relative">
// //               <svg className="w-full h-full transform -rotate-90">
// //                 <circle
// //                   cx="24"
// //                   cy="24"
// //                   r="20"
// //                   stroke="currentColor"
// //                   strokeWidth="4"
// //                   fill="none"
// //                   className="text-slate-200"
// //                 />
// //                 <circle
// //                   cx="24"
// //                   cy="24"
// //                   r="20"
// //                   stroke="currentColor"
// //                   strokeWidth="4"
// //                   fill="none"
// //                   strokeDasharray={`${progress * 1.26} 126`}
// //                   className="text-blue-500 transition-all duration-500 ease-out"
// //                   strokeLinecap="round"
// //                 />
// //               </svg>
// //               <div className="absolute inset-0 flex items-center justify-center">
// //                 <span className="text-xs font-bold text-slate-700">
// //                   {filledRequired}/{requiredFields.length}
// //                 </span>
// //               </div>
// //             </div>
// //           </div>
// //         </div>

// //         {/* Progress Bar */}
// //         <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
// //           <div 
// //             className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500 ease-out"
// //             style={{ width: `${progress}%` }}
// //           />
// //         </div>
// //       </div>

// //       {/* Scrollable Form Content */}
// //       <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

// //         {/* Required Fields Section */}
// //         <div className="space-y-5">
// //           <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
// //             <AlertCircle className="w-4 h-4" />
// //             Required Information
// //           </div>

// //           {/* Job Title */}
// //           <div className="group">
// //             <label className={labelClasses}>
// //               <Briefcase className="w-4 h-4 text-blue-500" />
// //               Job Title
// //               <span className="text-red-500">*</span>
// //             </label>
// //             <input
// //               name="title"
// //               value={form.title}
// //               onChange={handleChange}
// //               onFocus={() => setFocusedField("title")}
// //               onBlur={() => setFocusedField(null)}
// //               placeholder="e.g., Senior React Developer"
// //               className={inputClasses("title")}
// //             />
// //           </div>

// //           {/* Location & Industry Row */}
// //           <div className="grid grid-cols-2 gap-4">
// //             <div>
// //               <label className={labelClasses}>
// //                 <MapPin className="w-4 h-4 text-blue-500" />
// //                 Location
// //                 <span className="text-red-500">*</span>
// //               </label>
// //               <input
// //                 name="location"
// //                 value={form.location}
// //                 onChange={handleChange}
// //                 onFocus={() => setFocusedField("location")}
// //                 onBlur={() => setFocusedField(null)}
// //                 placeholder="e.g., Bengaluru, India"
// //                 className={inputClasses("location")}
// //               />
// //             </div>

// //             <div>
// //               <label className={labelClasses}>
// //                 <Layers className="w-4 h-4 text-blue-500" />
// //                 Industry
// //                 <span className="text-red-500">*</span>
// //               </label>
// //               <div className="relative">
// //                 <select
// //                   name="industry"
// //                   value={form.industry}
// //                   onChange={handleChange}
// //                   onFocus={() => setFocusedField("industry")}
// //                   onBlur={() => setFocusedField(null)}
// //                   className={`${inputClasses("industry")} appearance-none cursor-pointer`}
// //                 >
// //                   <option value="">Select industry...</option>
// //                   <option value="Technology">Technology</option>
// //                   <option value="Healthcare">Healthcare</option>
// //                   <option value="Finance">Finance</option>
// //                   <option value="Manufacturing">Manufacturing</option>
// //                   <option value="Retail">Retail</option>
// //                   <option value="Education">Education</option>
// //                   <option value="Consulting">Consulting</option>
// //                 </select>
// //                 <ChevronRight className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
// //               </div>
// //             </div>
// //           </div>
// //         </div>

// //         {/* Divider */}
// //         <div className="border-t border-slate-200" />

// //         {/* Additional Details Section */}
// //         <div className="space-y-5">
// //           <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
// //             <Building2 className="w-4 h-4" />
// //             Additional Details
// //           </div>

// //           {/* Department & Seniority Row */}
// //           <div className="grid grid-cols-2 gap-4">
// //             <div>
// //               <label className={labelClasses}>
// //                 <Building2 className="w-4 h-4 text-slate-400" />
// //                 Department
// //               </label>
// //               <input
// //                 name="department"
// //                 value={form.department}
// //                 onChange={handleChange}
// //                 onFocus={() => setFocusedField("department")}
// //                 onBlur={() => setFocusedField(null)}
// //                 placeholder="e.g., Engineering"
// //                 className={inputClasses("department")}
// //               />
// //             </div>

// //             <div>
// //               <label className={labelClasses}>
// //                 <Layers className="w-4 h-4 text-slate-400" />
// //                 Seniority Level
// //               </label>
// //               <div className="relative">
// //                 <select
// //                   name="seniority"
// //                   value={form.seniority}
// //                   onChange={handleChange}
// //                   onFocus={() => setFocusedField("seniority")}
// //                   onBlur={() => setFocusedField(null)}
// //                   className={`${inputClasses("seniority")} appearance-none cursor-pointer`}
// //                 >
// //                   <option value="">Select level...</option>
// //                   <option>Junior</option>
// //                   <option>Mid</option>
// //                   <option>Senior</option>
// //                   <option>Lead</option>
// //                   <option>Principal</option>
// //                 </select>
// //                 <ChevronRight className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
// //               </div>
// //             </div>
// //           </div>

// //           {/* Salary */}
// //           <div>
// //             <label className={labelClasses}>
// //               <DollarSign className="w-4 h-4 text-slate-400" />
// //               Salary Range
// //             </label>
// //             <div className="relative">
// //               <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
// //               <input
// //                 name="salary"
// //                 value={form.salary}
// //                 onChange={handleChange}
// //                 onFocus={() => setFocusedField("salary")}
// //                 onBlur={() => setFocusedField(null)}
// //                 placeholder="e.g., 15,00,000 - 25,00,000"
// //                 className={`${inputClasses("salary")} pl-8`}
// //               />
// //             </div>
// //           </div>

// //           {/* Skills */}
// //           <div>
// //             <label className={labelClasses}>
// //               <Wand2 className="w-4 h-4 text-slate-400" />
// //               Key Skills & Requirements
// //             </label>
// //             <textarea
// //               name="skills"
// //               value={form.skills}
// //               onChange={handleChange}
// //               onFocus={() => setFocusedField("skills")}
// //               onBlur={() => setFocusedField(null)}
// //               placeholder="Describe required skills, experience level, and qualifications..."
// //               maxLength={maxChars}
// //               rows={4}
// //               className={`${inputClasses("skills")} resize-none`}
// //             />
// //             <div className="flex justify-between mt-2">
// //               <span className="text-xs text-slate-400">
// //                 Be specific for better results
// //               </span>
// //               <span className={`text-xs font-medium transition-colors ${
// //                 form.skills.length > maxChars * 0.9 ? "text-amber-500" : "text-slate-400"
// //               }`}>
// //                 {form.skills.length}/{maxChars}
// //               </span>
// //             </div>
// //           </div>

// //           {/* Additional Context */}
// //           <div>
// //             <label className={labelClasses}>
// //               <FileText className="w-4 h-4 text-slate-400" />
// //               Additional Context
// //             </label>
// //             <textarea
// //               name="context"
// //               value={form.context}
// //               onChange={handleChange}
// //               onFocus={() => setFocusedField("context")}
// //               onBlur={() => setFocusedField(null)}
// //               placeholder="Any specific requirements, company culture notes, or compliance needs..."
// //               rows={3}
// //               className={`${inputClasses("context")} resize-none`}
// //             />
// //           </div>
// //         </div>
// //       </div>

// //       {/* Footer Actions */}
// //       <div className="px-6 py-5 bg-white border-t border-slate-200 space-y-3">
// //         <button
// //           onClick={handleGenerate}
// //           disabled={isGenerating || progress < 100}
// //           className={`
// //             w-full py-3.5 px-6 rounded-xl font-semibold text-white shadow-lg transition-all duration-300 flex items-center justify-center gap-2
// //             ${progress === 100 
// //               ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl hover:shadow-blue-500/25 hover:-translate-y-0.5 active:translate-y-0" 
// //               : "bg-slate-300 cursor-not-allowed"
// //             }
// //             ${isGenerating ? "opacity-80 cursor-wait" : ""}
// //           `}
// //         >
// //           {isGenerating ? (
// //             <>
// //               <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
// //               Generating...
// //             </>
// //           ) : (
// //             <>
// //               <Sparkles className="w-5 h-5" />
// //               Generate Job Description
// //               <ChevronRight className="w-5 h-5" />
// //             </>
// //           )}
// //         </button>

// //         <button
// //           onClick={() => navigate("/templates")}
// //           className="w-full py-3 px-6 rounded-xl font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all duration-200 flex items-center justify-center gap-2 group"
// //         >
// //           <FileText className="w-4 h-4 text-slate-500 group-hover:text-slate-700" />
// //           Browse Templates
// //           <span className="text-xs bg-slate-200 px-2 py-0.5 rounded-full text-slate-500 group-hover:bg-slate-300 transition-colors">
// //             10+
// //           </span>
// //         </button>
// //       </div>
// //     </div>
// //   );
// // }

// import { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { 
//   Briefcase, 
//   Building2, 
//   MapPin, 
//   Layers, 
//   Sparkles, 
//   DollarSign, 
//   FileText, 
//   ChevronRight,
//   Wand2
// } from "lucide-react";

// export default function JDForm({ onGenerate }) { 


//    const navigate = useNavigate();

//   const [form, setForm] = useState({
//     title: "",
//     department: "",
//     location: "",
//     seniority: "",
//     industry: "",
//     skills: "",
//     salary: "",
//     context: ""
//   });

//   // NEW: Update form when initialData changes (from EmptyJDState)
//   useEffect(() => {
//     if (initialData) {
//       setForm(initialData);
//     }
//   }, [initialData]);

//   const [focusedField, setFocusedField] = useState(null);
//   const [isGenerating, setIsGenerating] = useState(false);

//   const maxChars = 1000;



//   // All fields for progress tracking
//   const allFields = ["title", "department", "location", "seniority", "industry", "skills", "salary", "context"];
//   const requiredFields = ["title", "location", "industry"];

//   const filledCount = allFields.filter(field => form[field]?.toString().trim()).length;
//   const progress = (filledCount / allFields.length) * 100;
//   const requiredFilled = requiredFields.every(field => form[field]?.toString().trim());

//   // const handleChange = (e) => {
//   //   const { name, value } = e.target;
//   //   setForm({ ...form, [name]: value });
//   // };

//   // const handleGenerate = async () => {
//   //   if (!requiredFilled) return;
//   //   setIsGenerating(true);
//   //   await new Promise(resolve => setTimeout(resolve, 600));
//   //   onGenerate(form);
//   //   setIsGenerating(false);
//   // };




//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setForm(prev => ({
//       ...prev,
//       [name]: value
//     }));
//   };

//   const handleGenerate = async () => {
//     if (!form.title || !form.location || !form.industry) {
//       return;
//     }

//     setIsGenerating(true);
//     await new Promise(resolve => setTimeout(resolve, 600));
//     onGenerate(form);
//     setIsGenerating(false);
//   };

//   const inputClasses = (fieldName) => `
//     w-full px-4 py-3 bg-slate-50 border-2 rounded-xl outline-none transition-all duration-300
//     ${focusedField === fieldName 
//       ? "border-blue-500 bg-white shadow-lg shadow-blue-500/10" 
//       : "border-slate-200 hover:border-slate-300"
//     }
//   `;

//   const labelClasses = "block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2";

//   return (
//     <div className="h-full flex flex-col bg-slate-50/50">
//       {/* Compact Header */}
//       <div className="px-6 py-4 bg-white border-b border-slate-200">
//         <div className="flex items-center justify-between mb-3">
//           <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
//             <Sparkles className="w-5 h-5 text-blue-500" />
//             Create Job Description
//           </h2>
//           <span className="text-sm font-medium text-slate-500">
//             {filledCount}/{allFields.length}
//           </span>
//         </div>

//         {/* Simple Progress Bar */}
//         <div className="w-full bg-slate-200 rounded-full h-2">
//           <div 
//             className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
//             style={{ width: `${progress}%` }}
//           />
//         </div>
//       </div>

//       {/* Form Content */}
//       <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

//         {/* Required Fields */}
//         <div className="space-y-4">
//           <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
//             Required *
//           </div>

//           <div>
//             <label className={labelClasses}>
//               <Briefcase className="w-4 h-4 text-blue-500" />
//               Job Title *
//             </label>
//             <input
//               name="title"
//               value={form.title}
//               onChange={handleChange}
//               onFocus={() => setFocusedField("title")}
//               onBlur={() => setFocusedField(null)}
//               placeholder="e.g., Senior React Developer"
//               className={inputClasses("title")}
//             />
//           </div>

//           <div className="grid grid-cols-2 gap-4">
//             <div>
//               <label className={labelClasses}>
//                 <MapPin className="w-4 h-4 text-blue-500" />
//                 Location *
//               </label>
//               <input
//                 name="location"
//                 value={form.location}
//                 onChange={handleChange}
//                 onFocus={() => setFocusedField("location")}
//                 onBlur={() => setFocusedField(null)}
//                 placeholder="Bengaluru"
//                 className={inputClasses("location")}
//               />
//             </div>

//             <div>
//               <label className={labelClasses}>
//                 <Layers className="w-4 h-4 text-blue-500" />
//                 Industry *
//               </label>
//               <select
//                 name="industry"
//                 value={form.industry}
//                 onChange={handleChange}
//                 className={`${inputClasses("industry")} appearance-none`}
//               >
//                 <option value="">Select...</option>
//                 <option>Technology</option>
//                 <option>Healthcare</option>
//                 <option>Finance</option>
//                 <option>Manufacturing</option>
//                 <option>Retail</option>
//               </select>
//             </div>
//           </div>
//         </div>

//         <div className="border-t border-slate-200" />

//         {/* Optional Fields */}
//         <div className="space-y-4">
//           <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
//             Additional Details
//           </div>

//           <div className="grid grid-cols-2 gap-4">
//             <div>
//               <label className={labelClasses}>
//                 <Building2 className="w-4 h-4 text-slate-400" />
//                 Department
//               </label>
//               <input
//                 name="department"
//                 value={form.department}
//                 onChange={handleChange}
//                 onFocus={() => setFocusedField("department")}
//                 onBlur={() => setFocusedField(null)}
//                 placeholder="Engineering"
//                 className={inputClasses("department")}
//               />
//             </div>

//             <div>
//               <label className={labelClasses}>
//                 <Layers className="w-4 h-4 text-slate-400" />
//                 Seniority
//               </label>
//               <select
//                 name="seniority"
//                 value={form.seniority}
//                 onChange={handleChange}
//                 className={`${inputClasses("seniority")} appearance-none`}
//               >
//                 <option value="">Select...</option>
//                 <option>Junior</option>
//                 <option>Mid</option>
//                 <option>Senior</option>
//                 <option>Lead</option>
//               </select>
//             </div>
//           </div>

//           <div>
//             <label className={labelClasses}>
//               <DollarSign className="w-4 h-4 text-slate-400" />
//               Salary Range
//             </label>
//             <input
//               name="salary"
//               value={form.salary}
//               onChange={handleChange}
//               onFocus={() => setFocusedField("salary")}
//               onBlur={() => setFocusedField(null)}
//               placeholder="1500000"
//               className={inputClasses("salary")}
//             />
//           </div>

//           <div>
//             <label className={labelClasses}>
//               <Wand2 className="w-4 h-4 text-slate-400" />
//               Key Skills
//             </label>
//             <textarea
//               name="skills"
//               value={form.skills}
//               onChange={handleChange}
//               onFocus={() => setFocusedField("skills")}
//               onBlur={() => setFocusedField(null)}
//               placeholder="2+ years React experience..."
//               maxLength={maxChars}
//               rows={3}
//               className={`${inputClasses("skills")} resize-none`}
//             />
//             <p className="text-xs text-slate-400 mt-1 text-right">
//               {form.skills.length}/{maxChars}
//             </p>
//           </div>

//           <div>
//             <label className={labelClasses}>
//               <FileText className="w-4 h-4 text-slate-400" />
//               Additional Context
//             </label>
//             <textarea
//               name="context"
//               value={form.context}
//               onChange={handleChange}
//               onFocus={() => setFocusedField("context")}
//               onBlur={() => setFocusedField(null)}
//               placeholder="Background verification required..."
//               rows={2}
//               className={`${inputClasses("context")} resize-none`}
//             />
//           </div>
//         </div>
//       </div>

//       {/* Footer */}
//       <div className="px-6 py-4 bg-white border-t border-slate-200 space-y-2">
//         <button
//           onClick={handleGenerate}
//           disabled={isGenerating || !requiredFilled}
//           className={`
//             w-full py-3 rounded-xl font-semibold text-white shadow-lg transition-all duration-300 flex items-center justify-center gap-2
//             ${requiredFilled 
//               ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-xl hover:-translate-y-0.5" 
//               : "bg-slate-300 cursor-not-allowed"
//             }
//           `}
//         >
//           {isGenerating ? (
//             <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
//           ) : (
//             <>
//               <Sparkles className="w-5 h-5" />
//               Generate JD
//             </>
//           )}
//         </button>

//         <button
//           onClick={() => navigate("/templates")}
//           className="w-full py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors text-sm"
//         >
//           Use Template Instead
//         </button>
//       </div>
//     </div>
//   );
// }  


import { useState, useEffect, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { JDContext } from "../../context/JDContext";
import { Reorder } from "framer-motion";
import {
  Briefcase,
  Building2,
  MapPin,
  Layers,
  Sparkles,
  DollarSign,
  FileText,
  ChevronRight,
  AlertCircle,
  Wand2,
  X,
  Minus,
  Plus,
  Loader2,
  CheckCircle2,
  Clock,
  LayoutTemplate,
  ArrowRight,
  Shield,
  ChevronLeft,
  Save,
  GripVertical
} from "lucide-react";
import SearchableDropdown from "./SearchableDropdown";

import { getTemplates, usePublicTemplate } from "../../services/templateService";
import TemplatePreviewModal from "../Admin/TemplatePreviewModal";
import { formatSalaryRange, rebalanceWeights } from "../../utils/formatJD";
import { getAvailableModels } from "../../services/jdService";
import AddSectionModal from "./AddSectionModal";
import { maybePromptAfterSuccess } from "../../services/feedbackService";


export default function JDForm({ onGenerate, initialData, onSave }) {  // initialData is a prop here
  const navigate = useNavigate();
  const { coreCompetenciesDB, functionalCompetenciesDB, refreshCompetencies, user } = useContext(JDContext);

  const steps = [
    { id: 0, label: "Role Details", icon: <Briefcase className="w-4 h-4" /> },
    { id: 1, label: "Location & Industry", icon: <MapPin className="w-4 h-4" /> },
    { id: 2, label: "Compensation & Skills", icon: <DollarSign className="w-4 h-4" /> },
    { id: 3, label: "AI & Context", icon: <Sparkles className="w-4 h-4" /> },
    { id: 4, label: "JD Content", icon: <FileText className="w-4 h-4" /> }
  ];

  const requiredFields = [
    "title", "companyName", "jobId", "department", "jobFamily",
    "jobLevel", "location", "state", "countryCode", "seniority",
    "industry", "skills", "salary_min_value", "salary_max_value"
  ];

  const isStepComplete = (stepId) => {
    const fields = [
      ["title", "companyName", "jobId", "department", "jobFamily", "jobLevel"],
      ["countryCode", "state", "location", "seniority", "industry"],
      ["salary_min_value", "salary_max_value", "skills"],
      ["model_name"],
      []
    ];
    return fields[stepId]?.every(field => form[field]?.toString().trim());
  };

  const [filteredTitleTemplates, setFilteredTitleTemplates] = useState([]);
  const [totalTemplateMatches, setTotalTemplateMatches] = useState(0);
  const [previewTemplate, setPreviewTemplate] = useState(null);

  const [showTemplateSuggestions, setShowTemplateSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false);
  const suggestionRef = useRef(null);
  const sidePanelRef = useRef(null);
  const previewPanelRef = useRef(null);



  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await getAvailableModels();
        setAvailableModels(response.models || []);
        if (response.default && !form.model_name) {
          setForm(prev => ({ ...prev, model_name: response.default }));
        }
      } catch (error) {
        console.error("Failed to fetch models", error);
      }
    };
    fetchModels();

    // Refresh competencies so new ones appear immediately
    if (refreshCompetencies) {
      refreshCompetencies();
    }
  }, []);


  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedOutsideInput = suggestionRef.current && !suggestionRef.current.contains(event.target);
      const clickedOutsideSidePanel = sidePanelRef.current && !sidePanelRef.current.contains(event.target);
      const clickedOutsidePreview = previewPanelRef.current && !previewPanelRef.current.contains(event.target);

      if (clickedOutsideInput && clickedOutsideSidePanel && clickedOutsidePreview) {
        setShowTemplateSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTemplateSelect = async (template) => {
    try {
      const loadingToast = toast.loading("Creating from template...");
      const newJD = await usePublicTemplate(template.id);

      toast.dismiss(loadingToast);
      toast.success("Job description created successfully!");
      maybePromptAfterSuccess("jd_created", { source: "template" });

      setShowTemplateSuggestions(false);

      const userRole = (user?.role || "").toLowerCase();
      const isAdmin = userRole.includes('admin');
      const isHR = userRole.includes('hr');
      const base = isAdmin ? 'admin' : (isHR ? 'hr' : 'manager');

      const path = (isAdmin || isHR)
        ? `/${base}/generate/${newJD.id}`
        : `/${base}/review/${newJD.id}`;

      navigate(path, { replace: true });
    } catch (error) {
      console.error("Failed to use template:", error);
      toast.error(error.message || "Could not create from template.");
    }
  };

  // Initialize with empty form, then use useEffect to fill if initialData provided
  // const [form, setForm] = useState({
  //   title: "",
  //   department: "",
  //   location: "",
  //   seniority: "",
  //   industry: "",
  //   skills: "",
  //   salary: "",
  //   context: ""
  // });
  const [form, setForm] = useState({
    title: "",
    jobId: "",
    companyName: "",
    department: "",
    jobFamily: "",
    jobLevel: "",
    location: "",
    state: "",
    countryCode: "US",
    seniority: "",
    industry: "",
    skills: "",
    salary_symbol: "$",
    salary_min_value: "",
    salary_max_value: "",
    salary_period: "/yr",
    context: "",
    model_name: "",
    coreCompetencies: [],
    functionalCompetencies: [],
    custom_fields: [],
    content: {}
  });

  // Debounced Template Search
  useEffect(() => {
    if (form.title && form.title.length >= 3) {
      setIsSearching(true);
      const timer = setTimeout(async () => {
        try {
          const data = await getTemplates({ title: form.title, limit: 10 });
          setFilteredTitleTemplates(data.templates || []);
          setTotalTemplateMatches(data.total || 0);
        } catch (error) {
          console.error("Failed to search templates", error);
        } finally {
          setIsSearching(false);
        }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setFilteredTitleTemplates([]);
      setTotalTemplateMatches(0);
      setIsSearching(false);
    }
  }, [form.title]);






  const countryCurrencyMap = {
    "US": "$",
    "CA": "CA$",
    "AU": "AU$",
    "IN": "₹",
    "UK": "£"
  };

  // NEW: Detect region and set defaults on mount
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const isIndia = tz?.toLowerCase().includes('calcutta') || tz?.toLowerCase().includes('kolkata');

      setForm(prev => ({
        ...prev,
        countryCode: isIndia ? "IN" : "US",
        salary_symbol: isIndia ? "₹" : "$",
        salary_period: isIndia ? "/yr" : "/yr" // Default both to /yr for now
      }));
    } catch (e) {
      console.warn("Region detection failed, defaulting to US");
    }
  }, []);

  useEffect(() => {
    if (initialData) {
      setForm(prev => ({
        ...prev,
        ...initialData,
        // Ensure arrays are initialized even if null in initialData
        coreCompetencies: initialData.coreCompetencies || [],
        functionalCompetencies: initialData.functionalCompetencies || [],
        custom_fields: initialData.custom_fields || [],
        content: initialData.content || {}
      }));
    }
  }, [initialData]);

  // NEW: Auto-advance step when complete (but only if moving forward and not typing)
  const [lastCompletedStep, setLastCompletedStep] = useState(-1);

  useEffect(() => {
    if (isStepComplete(currentStep) && currentStep < steps.length - 1 && currentStep > lastCompletedStep) {
      const timer = setTimeout(() => {
        setLastCompletedStep(currentStep);
        setCurrentStep(prev => prev + 1);
      }, 4000); // 4 seconds delay to account for typing/review
      return () => clearTimeout(timer);
    }
  }, [form, currentStep, lastCompletedStep]);




  const [focusedField, setFocusedField] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const maxChars = 500;

  const [statesList, setStatesList] = useState([]);
  const [citiesList, setCitiesList] = useState([]);
  const [flagsList, setFlagsList] = useState({});

  useEffect(() => {
    fetch("https://countriesnow.space/api/v0.1/countries/flag/images")
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          const map = {};
          data.data.forEach(item => {
            map[item.iso2] = item.flag;
          });
          setFlagsList(map);
        }
      })
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    let isActive = true;
    const countryMapping = { "US": "united states", "CA": "canada", "AU": "australia", "IN": "india", "UK": "united kingdom" };
    if (form.countryCode) {
      setStatesList([]);
      setCitiesList([]);
      fetch("https://countriesnow.space/api/v0.1/countries/states", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: countryMapping[form.countryCode] })
      }).then(res => res.json()).then(data => {
        if (isActive) {
          if (!data.error && data.data && data.data.states) {
            const uniqueStates = Array.from(new Set(data.data.states.map(s => s.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))));
            setStatesList(uniqueStates.map(normalName => ({ label: normalName, value: normalName })));
          } else {
            setStatesList([]);
          }
        }
      }).catch(err => {
        console.error(err);
        if (isActive) setStatesList([]);
      });
    }
    return () => { isActive = false; };
  }, [form.countryCode]);

  useEffect(() => {
    let isActive = true;
    const countryMapping = { "US": "united states", "CA": "canada", "AU": "australia", "IN": "india", "UK": "united kingdom" };
    if (form.countryCode && form.state) {
      setCitiesList([]);
      fetch("https://countriesnow.space/api/v0.1/countries/state/cities", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: countryMapping[form.countryCode], state: form.state })
      }).then(res => res.json()).then(data => {
        if (isActive) {
          if (!data.error && data.data) {
            const uniqueCities = Array.from(new Set(data.data.map(c => c.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))));
            setCitiesList(uniqueCities.map(normalName => ({ label: normalName, value: normalName })));
          } else {
            setCitiesList([]);
          }
        }
      }).catch(err => {
        console.error(err);
        if (isActive) setCitiesList([]);
      });
    }
    return () => { isActive = false; };
  }, [form.countryCode, form.state]);

  // const handleChange = (e) => {
  //   const { name, value } = e.target;
  //   setForm(prev => ({
  //     ...prev,
  //     [name]: value
  //   }));
  // };

  const handleChange = (e) => {
    const { name, value } = e.target;

    let finalValue = value;
    if (name === "skills" && value.length > 500) {
      finalValue = value.slice(0, 500);
    }

    const updatedForm = {
      ...form,
      [name]: finalValue
    };



    // Handle salary symbol change to India (₹) - restrict period
    if (name === "salary_symbol") {
      if (value === "₹") {
        const allowedPeriods = ["/mo", "/yr"];
        if (!allowedPeriods.includes(form.salary_period)) {
          updatedForm.salary_period = "/yr";
        }
      }
    }


    setForm(updatedForm);
  };


  const addCoreCompetency = (title) => {

    if (!title) return;

    setForm({
      ...form,
      coreCompetencies: [
        ...(form.coreCompetencies || []),
        { title, description: "", weight: 0 }
      ]
    });
  };

  const addFunctionalCompetency = (title) => {

    if (!title) return;

    setForm({
      ...form,
      functionalCompetencies: [
        ...(form.functionalCompetencies || []),
        { title, description: "", weight: 0 }
      ]
    });
  };

  const removeCoreCompetency = (index) => {
    const updated = [...form.coreCompetencies];
    updated.splice(index, 1);
    setForm({ ...form, coreCompetencies: updated });
  };

  const removeFunctionalCompetency = (index) => {
    const updated = [...form.functionalCompetencies];
    updated.splice(index, 1);
    setForm({ ...form, functionalCompetencies: updated });
  };

  const handleAddWizardSection = (fieldConfig) => {
    const key = fieldConfig.label.trim();
    if (!key) return;
    if (form.content?.[key]) {
      toast.error("Section already exists");
      return;
    }

    const defaultValue = fieldConfig.type === "points" ? [] : "";
    setForm((prev) => ({
      ...prev,
      content: {
        ...(prev.content || {}),
        [key]: defaultValue,
        [`${key}_view`]: fieldConfig.view_section !== false ? "unlocked" : "locked",
        _section_order: [...(prev.content?._section_order || []), key],
        _custom_fields_metadata: {
          ...(prev.content?._custom_fields_metadata || {}),
          [key]: {
            label: fieldConfig.label,
            type: fieldConfig.type,
            fieldType: fieldConfig.fieldType,
            push_to_csod: fieldConfig.push_to_csod !== false,
            view_section: fieldConfig.view_section !== false,
          },
        },
      },
    }));
    setIsAddSectionModalOpen(false);
    toast.success(`Section "${key}" added`);
  };


  const handleGenerate = async (triggerAIGeneration = true) => {
    if (isGenerating || !form.title || !form.location || !form.industry) {
      return;
    }

    setIsGenerating(true);
    try {
      // Simulate/buffer for UX transition
      await new Promise(resolve => setTimeout(resolve, 600));
      await onGenerate(form, triggerAIGeneration);
    } finally {
      setIsGenerating(false);
    }
  };

  const filledRequired = requiredFields.filter(field => form[field]?.toString().trim()).length;

  const progress = (filledRequired / requiredFields.length) * 100;

  const inputClasses = (fieldName) => `
    w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border-2 rounded-xl outline-none transition-all duration-300 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100
    ${focusedField === fieldName
      ? "border-blue-500 dark:border-indigo-500 bg-white dark:bg-white/10 shadow-lg shadow-blue-500/10 dark:shadow-indigo-500/10"
      : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
    }
    ${form[fieldName] ? "border-slate-300 dark:border-white/20" : ""}
  `;

  const labelClasses = "block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-2";

  const getModelDisplayName = (modelId) => {

    if (!modelId) return "Select Model";
    const parts = modelId.split('/');
    if (parts.length > 0) {
      const provider = parts[0];
      if (provider === "google") return "Google";
      if (provider === "nvidia") return "Nvidia";
      if (provider === "anthropic") return "Anthropic";
      if (provider === "meta-llama") return "Llama";
      if (provider === "openai") return "OpenAI";
      if (provider === "microsoft") return "Microsoft";
      if (provider === "qwen") return "Qwen";
      if (provider === "nousresearch") return "Nous";
      return provider.charAt(0).toUpperCase() + provider.slice(1);
    }
    return modelId;
  };

  return (

    <div className="h-full flex flex-col bg-slate-50/50 dark:bg-slate-950 transition-colors duration-300">
      {/* Header Section */}
      <div className="px-6 py-6 bg-white dark:bg-[#020617] border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-lg shadow-blue-500/25">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              Create Job Description
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
              {steps[currentStep].label} • Step {currentStep + 1} of {steps.length}
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Completion
              </span>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {Math.round(progress)}%
              </div>
            </div>
            <div className="w-12 h-12 relative">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  className="text-slate-200 dark:text-white/5"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${progress * 1.26} 126`}
                  className="text-blue-500 transition-all duration-500 ease-out"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {filledRequired}/{requiredFields.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Progress Bar */}
        <div className="relative px-2">
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-100 dark:bg-white/5 -translate-y-1/2 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-700 ease-in-out"
              style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
            />
          </div>
          <div className="relative flex justify-between">
            {steps.map((step) => {
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id || isStepComplete(step.id);
              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(step.id)}
                  className="group relative flex flex-col items-center"
                >
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 z-10 border-4
                    ${isActive ? "bg-blue-500 border-blue-100 dark:border-blue-500/20 scale-125 shadow-lg shadow-blue-500/20" :
                      isCompleted ? "bg-indigo-600 border-indigo-100 dark:border-indigo-600/20 shadow-md" :
                        "bg-white dark:bg-slate-900 border-slate-100 dark:border-white/5"}
                  `}>
                    <div className={`transition-colors duration-300 ${isActive || isCompleted ? "text-white" : "text-slate-400"}`}>
                      {step.icon}
                    </div>
                  </div>
                  <span className={`
                    absolute top-10 whitespace-nowrap text-[10px] font-bold uppercase tracking-widest transition-all duration-300
                    ${isActive ? "text-blue-500 opacity-100 translate-y-0" : "text-slate-400 opacity-0 -translate-y-2"}
                  `}>
                    {step.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>


      {/* Form Content */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-2xl mx-auto">

          {/* STEP 0: Role Details */}
          {currentStep === 0 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                <Briefcase className="w-4 h-4 text-blue-500" />
                Role Foundation
              </div>

              <div className="group relative z-[100]" ref={suggestionRef}>
                <label className={labelClasses}>
                  Job Title <span className="text-red-500">*</span>
                </label>
                <input
                  name="title"
                  value={form.title}
                  onChange={(e) => {
                    handleChange(e);
                    setShowTemplateSuggestions(true);
                  }}
                  onFocus={() => {
                    setFocusedField("title");
                    setShowTemplateSuggestions(true);
                  }}
                  onBlur={() => setFocusedField(null)}
                  placeholder="e.g., Senior React Developer"
                  className={inputClasses("title")}
                />

              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Company Name <span className="text-red-500">*</span></label>
                  <input name="companyName" value={form.companyName} onChange={handleChange} placeholder="DunRite" className={inputClasses("companyName")} />
                </div>
                <div>
                  <label className={labelClasses}>Job ID <span className="text-red-500">*</span></label>
                  <input name="jobId" value={form.jobId} onChange={handleChange} placeholder="SLS_AE" className={inputClasses("jobId")} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Department <span className="text-red-500">*</span></label>
                  <input name="department" value={form.department} onChange={handleChange} placeholder="Engineering" className={inputClasses("department")} />
                </div>
                <div>
                  <label className={labelClasses}>Job Family <span className="text-red-500">*</span></label>
                  <input name="jobFamily" value={form.jobFamily} onChange={handleChange} placeholder="Sales" className={inputClasses("jobFamily")} />
                </div>
              </div>

              <div>
                <label className={labelClasses}>Job Level <span className="text-red-500">*</span></label>
                <select name="jobLevel" value={form.jobLevel} onChange={handleChange} className={inputClasses("jobLevel")}>
                  <option value="">Select Level</option>
                  <option value="L1">L1</option>
                  <option value="L2">L2</option>
                  <option value="L3">L3</option>
                  <option value="L4">L4</option>
                  <option value="L5">L5</option>
                </select>

              </div>
            </div>
          )}

          {/* STEP 1: Location & Details */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                <MapPin className="w-4 h-4 text-blue-500" />
                Geographic & Industry Context
              </div>

              <div className="space-y-4 z-[90] relative">
                <div className="relative z-[95]">
                  <label className={`${labelClasses} whitespace-nowrap`}>Country <span className="text-red-500">*</span></label>
                  <div onClick={() => setFocusedField("countryCode")}>
                    <SearchableDropdown
                      options={[
                        { iso: "US", name: "United States" },
                        { iso: "CA", name: "Canada" },
                        { iso: "AU", name: "Australia" },
                        { iso: "IN", name: "India" },
                        { iso: "GB", name: "United Kingdom", value: "UK" }
                      ].map(c => ({
                        value: c.value || c.iso,
                        searchValue: c.name,
                        label: (
                          <div className="flex items-center gap-2">
                            {flagsList[c.iso] ? (
                              <img src={flagsList[c.iso]} alt={c.iso} className="w-5 h-3.5 object-cover rounded shadow-sm border border-slate-100 dark:border-white/10" />
                            ) : (
                              <div className="w-5 h-3.5 bg-slate-200 dark:bg-white/10 rounded shadow-sm" />
                            )}
                            <span className="truncate">{c.name}</span>
                          </div>
                        )
                      }))}
                      value={form.countryCode}
                      onChange={(val) => setForm(prev => ({
                        ...prev,
                        countryCode: val,
                        state: "",
                        location: "",
                        salary_symbol: countryCurrencyMap[val] || prev.salary_symbol
                      }))}
                      placeholder="Select Country"
                      className={`${inputClasses("countryCode")} py-2.5`}
                    />
                  </div>
                </div>
                <div className="relative z-[94]">
                  <label className={labelClasses}>State <span className="text-red-500">*</span></label>
                  <div onClick={() => setFocusedField("state")}>
                    <SearchableDropdown
                      options={statesList}
                      value={form.state}
                      onChange={(val) => setForm(prev => ({ ...prev, state: val, location: "" }))}
                      placeholder="Select State"
                      className={`${inputClasses("state")} py-2.5`}
                    />
                  </div>
                </div>
                <div className="relative z-[93]">
                  <label className={labelClasses}>City <span className="text-red-500">*</span></label>
                  <div onClick={() => setFocusedField("location")}>
                    <SearchableDropdown
                      options={citiesList}
                      value={form.location}
                      onChange={(val) => setForm(prev => ({ ...prev, location: val }))}
                      placeholder="Select City"
                      className={`${inputClasses("location")} py-2.5`}
                      disabled={!form.state}
                      allowCustom={true}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>Seniority <span className="text-red-500">*</span></label>
                  <select name="seniority" value={form.seniority} onChange={handleChange} className={inputClasses("seniority")}>
                    <option value="">Select Seniority</option>
                    <option>Junior</option>
                    <option>Mid-Level</option>
                    <option>Senior</option>
                    <option>Lead</option>
                    <option>Manager</option>
                    <option>Vice President</option>
                    <option>President</option>
                  </select>
                </div>
                <div>
                  <label className={labelClasses}>Industry <span className="text-red-500">*</span></label>
                  <input name="industry" value={form.industry} onChange={handleChange} placeholder="Technology" className={inputClasses("industry")} />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Compensation & Skills */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                <DollarSign className="w-4 h-4 text-blue-500" />
                Compensation & Talent Profile
              </div>

              <div className="p-6 bg-white dark:bg-white/[0.02] rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
                  <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-blue-500" />
                    Salary Configuration
                  </label>
                  <span className="text-[11px] font-bold text-slate-400 px-2.5 py-1 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/5">
                    {formatSalaryRange(form.salary_min_value, form.salary_max_value, form.salary_symbol, form.salary_period)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Min Salary Input */}
                  <div className="space-y-1.5">
                    <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Min Value</span>
                    <div className="relative rounded-xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <span className="text-slate-450 dark:text-slate-500 font-bold text-xs">{form.salary_symbol}</span>
                      </div>
                      <input
                        name="salary_min_value"
                        value={form.salary_min_value}
                        onChange={handleChange}
                        placeholder="e.g., 4"
                        className={`${inputClasses("salary_min_value")} pl-11`}
                      />
                    </div>
                  </div>

                  {/* Max Salary Input */}
                  <div className="space-y-1.5">
                    <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Max Value</span>
                    <div className="relative rounded-xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <span className="text-slate-455 dark:text-slate-500 font-bold text-xs">{form.salary_symbol}</span>
                      </div>
                      <input
                        name="salary_max_value"
                        value={form.salary_max_value}
                        onChange={handleChange}
                        placeholder="e.g., 6"
                        className={`${inputClasses("salary_max_value")} pl-11`}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 space-y-5">
                  {/* Premium Currency Selector */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Currency</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { sym: "$", label: "USD" },
                        { sym: "CA$", label: "CAD" },
                        { sym: "AU$", label: "AUD" },
                        { sym: "£", label: "GBP" },
                        { sym: "₹", label: "INR" }
                      ].map(({ sym, label }) => (
                        <button
                          key={sym}
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, salary_symbol: sym }))}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 border ${form.salary_symbol === sym
                            ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-400"
                            : "bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
                            }`}
                        >
                          <span className={`text-[10px] ${form.salary_symbol === sym ? "text-blue-500" : "text-slate-400"}`}>
                            {sym}
                          </span>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Premium Frequency Selector */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Payment Frequency</label>
                    <div className="flex gap-3">
                      {[
                        { val: "/mo", label: "Monthly", desc: "Per Month" },
                        { val: "/yr", label: "Yearly", desc: "Per Annum" }
                      ].map((freq) => (
                        <button
                          key={freq.val}
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, salary_period: freq.val }))}
                          className={`flex-1 flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all duration-300 ${form.salary_period === freq.val
                            ? "border-blue-500 bg-blue-50/50 shadow-md shadow-blue-500/10 dark:border-blue-500 dark:bg-blue-500/10"
                            : "border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-slate-100 dark:border-white/5 dark:bg-white/5 dark:hover:border-white/10"
                            }`}
                        >
                          <span className={`text-sm font-bold ${form.salary_period === freq.val ? "text-blue-700 dark:text-blue-400" : "text-slate-600 dark:text-slate-300"}`}>
                            {freq.label}
                          </span>
                          <span className={`text-[10px] mt-0.5 font-semibold ${form.salary_period === freq.val ? "text-blue-500/80 dark:text-blue-400/80" : "text-slate-400"}`}>
                            {freq.desc}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className={labelClasses}>Key Skills & Requirements <span className="text-red-500">*</span></label>
                <textarea
                  name="skills" value={form.skills} onChange={handleChange}
                  placeholder="Describe required skills, experience level..."
                  maxLength={maxChars} rows={4} className={`${inputClasses("skills")} resize-none`}
                />
                <div className="flex justify-between mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <span>AI will use this to generate content</span>
                  <span className={form.skills.length >= maxChars ? "text-rose-500 font-extrabold animate-pulse" : form.skills.length > maxChars * 0.9 ? "text-amber-500" : ""}>
                    {form.skills.length}/{maxChars}
                  </span>
                </div>
                {form.skills.length >= maxChars && (
                  <p className="text-[11px] text-rose-500 font-bold mt-1.5 flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Character limit reached! You cannot add more text.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: AI & Advanced */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                <Wand2 className="w-4 h-4 text-blue-500" />
                AI Configuration & Context
              </div>

              {/* Model Selection Dropdown */}
              <div className="p-5 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 dark:from-blue-500/10 dark:to-indigo-500/10 rounded-2xl border border-blue-100 dark:border-indigo-500/20 shadow-sm">
                <label className={labelClasses}>
                  AI Generation Model
                  <div className="ml-auto flex gap-1">
                    <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-500/20 text-orange-600 dark:text-ornage-400 text-[8px] rounded uppercase font-black">Powered by Phenom</span>
                  </div>
                </label>
                <div className="relative">
                  <SearchableDropdown
                    options={availableModels.map(m => ({ label: getModelDisplayName(m), value: m }))}
                    value={form.model_name}
                    onChange={(val) => setForm(prev => ({ ...prev, model_name: val }))}
                    placeholder="Select AI Model..."
                    className={inputClasses("model_name")}
                  />
                </div>

                <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 font-medium italic">
                  * Choose a model for better results. We recommend Google or Anthropic for creative writing.
                </p>
              </div>

              {/* Competencies */}
              <div className="space-y-4">
                <div>
                  <label className={labelClasses}>Core Competencies</label>
                  <SearchableDropdown options={coreCompetenciesDB} placeholder="Select competency..." onChange={(val) => addCoreCompetency(val)} allowCustom={true} className={inputClasses("coreCompetencies")} />
                  <div className="space-y-3 mt-4">
                    {form.coreCompetencies.map((c, i) => (
                      <div key={i} className="flex flex-col p-4 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm group animate-in fade-in slide-in-from-left-2 duration-300 gap-3.5">
                        <div className="flex items-center justify-between w-full min-w-0">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 min-w-0 flex-1 truncate pr-2" title={c.title}>
                            {c.title}
                          </span>
                          <button onClick={() => removeCoreCompetency(i)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all shrink-0">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/5 w-full">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Weighting</span>
                          <WeightInput
                            value={c.weight}
                            onChange={(val) => {
                              const updated = rebalanceWeights(form.coreCompetencies, i, val);
                              setForm({ ...form, coreCompetencies: updated });
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelClasses}>Functional Competencies</label>
                  <SearchableDropdown options={functionalCompetenciesDB} placeholder="Select competency..." onChange={(val) => addFunctionalCompetency(val)} allowCustom={true} className={inputClasses("functionalCompetencies")} />
                  <div className="space-y-3 mt-4">
                    {form.functionalCompetencies.map((c, i) => (
                      <div key={i} className="flex flex-col p-4 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm group animate-in fade-in slide-in-from-left-2 duration-300 gap-3.5">
                        <div className="flex items-center justify-between w-full min-w-0">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 min-w-0 flex-1 truncate pr-2" title={c.title}>
                            {c.title}
                          </span>
                          <button onClick={() => removeFunctionalCompetency(i)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all shrink-0">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/5 w-full">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Weighting</span>
                          <WeightInput
                            value={c.weight}
                            onChange={(val) => {
                              const updated = rebalanceWeights(form.functionalCompetencies, i, val);
                              setForm({ ...form, functionalCompetencies: updated });
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              </div>

              <div>
                <label className={labelClasses}>Additional Context</label>
                <textarea name="context" value={form.context} onChange={handleChange} placeholder="Company culture, background verification..." rows={3} className={`${inputClasses("context")} resize-none`} />
              </div>
            </div>
          )}
          {/* STEP 4: JD Content */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                <FileText className="w-4 h-4 text-blue-500" />
                JD Sections
              </div>
              {(() => {
                const rawOrder = form.content?._section_order || [];
                const order = rawOrder.map(item => typeof item === 'object' && item !== null ? (item.point || item.title || "") : String(item)).filter(Boolean);
                const allKeys = Object.keys(form.content || {}).filter(k => !["_section_order", "_source", "_custom_fields_metadata", "Job Details"].includes(k) && !k.endsWith("_view"));
                
                const orderedKeys = [...allKeys].sort((a, b) => {
                  const idxA = order.indexOf(a);
                  const idxB = order.indexOf(b);
                  if (idxA === -1 && idxB === -1) return 0;
                  if (idxA === -1) return 1;
                  if (idxB === -1) return -1;
                  return idxA - idxB;
                });

                const sectionsList = orderedKeys.length === 0 ? (
                  <div className="p-10 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl flex flex-col items-center justify-center text-slate-400 mb-6">
                     <p className="text-sm font-medium">No dynamic sections available for this JD.</p>
                  </div>
                ) : (
                  <Reorder.Group
                    values={orderedKeys}
                    onReorder={(newOrder) => {
                      setForm(prev => ({
                        ...prev,
                        content: {
                          ...prev.content,
                          _section_order: newOrder
                        }
                      }));
                    }}
                    className="space-y-6 mb-6"
                  >
                    {orderedKeys.map((key) => {
                      const value = form.content[key];
                      const sectionMeta = form.content?._custom_fields_metadata?.[key] || {};
                      const isPointsSection = sectionMeta.type === "points" || (!sectionMeta.type && Array.isArray(value));
                      const typeLabel = sectionMeta.fieldType === "Weights" ? "Weighted List" : (isPointsSection ? "Bullet Points" : "Text");
                      return (
                        <Reorder.Item
                          key={key}
                          value={key}
                          className="bg-slate-50/50 dark:bg-white/[0.02] p-5 rounded-[1.5rem] border border-slate-200 dark:border-white/5 shadow-sm space-y-3 cursor-grab active:cursor-grabbing relative group"
                        >
                          <div className="flex justify-between items-center select-none">
                            <label className={`${labelClasses} flex items-center gap-2 cursor-grab`}>
                              <GripVertical className="w-4 h-4 text-slate-400" />
                              {key}
                              <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase tracking-wider">
                                {typeLabel}
                              </span>
                            </label>
                            <div className="flex items-center gap-4">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                Drag to reorder
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setForm(prev => {
                                    const newContent = { ...prev.content };
                                    delete newContent[key];
                                    delete newContent[`${key}_view`];
                                    if (newContent._section_order) {
                                      newContent._section_order = newContent._section_order.filter(k => k !== key);
                                    }
                                    if (newContent._custom_fields_metadata) {
                                      const nextMeta = { ...newContent._custom_fields_metadata };
                                      delete nextMeta[key];
                                      newContent._custom_fields_metadata = nextMeta;
                                    }
                                    return { ...prev, content: newContent };
                                  });
                                }}
                                className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                title="Delete Section"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          {isPointsSection ? (
                            <textarea
                              value={value.map(item => {
                                if (typeof item === 'object' && item !== null) {
                                  const t = item.title || item.name || item.point || item.duty || item.DESCRIPTION || item.description || '';
                                  const d = item.description || item.DESCRIPTION || '';
                                  if (t && d && t !== d) return `${t}\n${d}`;
                                  if (t) return t;
                                  if (d) return d;
                                  return JSON.stringify(item);
                                }
                                return String(item);
                              }).join('\n\n')}
                              onChange={(e) => {
                                 const lines = e.target.value.split('\n\n').filter(l => l.trim() !== "");
                                 setForm(prev => ({ ...prev, content: { ...prev.content, [key]: lines } }));
                              }}
                              className={`${inputClasses("")} resize-none min-h-[120px]`}
                            />
                          ) : (
                            <textarea
                              value={typeof value === 'object' && value !== null ? 
                                (value.content || value.description || value.text || 
                                 Object.entries(value).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join('\n')
                                ) : 
                                String(value || '')}
                              onChange={(e) => setForm(prev => ({ ...prev, content: { ...prev.content, [key]: e.target.value } }))}
                              className={`${inputClasses("")} resize-none min-h-[120px]`}
                            />
                          )}
                        </Reorder.Item>
                      );
                    })}
                  </Reorder.Group>
                );

                return (
                  <div>
                    {sectionsList}
                    <button
                      type="button"
                      onClick={() => setIsAddSectionModalOpen(true)}
                      className="w-full px-6 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 border border-dashed border-slate-300 dark:border-white/10"
                    >
                      <Plus className="w-4 h-4" />
                      Add Section
                    </button>
                  </div>
                );
              })()}
              <AddSectionModal
                isOpen={isAddSectionModalOpen}
                onClose={() => setIsAddSectionModalOpen(false)}
                onAddSection={handleAddWizardSection}
                variant="wizard"
              />
            </div>
          )}

        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-6 py-5 bg-white dark:bg-[#020617] border-t border-slate-200 dark:border-white/10">
        <div className="max-w-2xl mx-auto flex gap-4">
          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep(prev => prev - 1)}
              className="flex-1 py-3.5 px-6 rounded-xl font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-all border border-transparent dark:border-white/5 text-xs sm:text-sm tracking-wide"
            >
              Back
            </button>
          )}

          {currentStep < steps.length - 1 ? (
            <button
              onClick={() => {
                if (isStepComplete(currentStep)) setCurrentStep(prev => prev + 1);
                else toast.error("Please fill required fields to continue");
              }}
              className={`flex-[2] py-3.5 px-6 rounded-xl font-semibold text-white shadow-lg transition-all flex items-center justify-center gap-2 text-xs sm:text-sm tracking-wide
                ${isStepComplete(currentStep)
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-500/25 hover:-translate-y-0.5"
                  : "bg-slate-300 dark:bg-white/5 dark:text-slate-600 cursor-not-allowed"}
              `}
            >
              Continue to {steps[currentStep + 1].label}
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <>
              <button
                onClick={() => handleGenerate(true)} // Pass true to indicate it's an AI generation
                disabled={isGenerating || progress < 100}
                className={`flex-[2] py-3.5 px-6 rounded-xl font-semibold text-white shadow-lg transition-all flex items-center justify-center gap-2 text-xs sm:text-sm tracking-wide
                  ${progress === 100
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl hover:shadow-blue-500/25 dark:hover:shadow-indigo-500/25 hover:-translate-y-0.5 active:translate-y-0"
                    : "bg-slate-300 dark:bg-white/5 dark:text-slate-600 cursor-not-allowed"}
                  ${isGenerating ? "opacity-80 cursor-wait" : ""}
                `}
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Job Description
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
              {initialData?.id && (
                <button
                  onClick={() => handleGenerate(false)} // Pass false to indicate just saving
                  disabled={isGenerating}
                  className="flex-[2] py-3.5 px-6 rounded-xl font-semibold text-white shadow-lg transition-all flex items-center justify-center gap-2 text-xs sm:text-sm tracking-wide bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 hover:shadow-xl hover:shadow-emerald-500/25 dark:hover:shadow-emerald-500/25 hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Save className="w-5 h-5" />
                  Save Changes
                </button>
              )}
            </>
          )}
        </div>

        {currentStep === 0 && (
          <button
            onClick={() => {
              const role = user?.role?.toLowerCase() || "";
              const path = role.includes("hr") ? "/hr/templates" : "/admin/templates";
              navigate(path);
            }}
            className="w-full mt-6 py-4 px-6 rounded-2xl bg-indigo-50/50 hover:bg-indigo-50 dark:bg-indigo-500/5 dark:hover:bg-indigo-500/10 border border-indigo-100/50 dark:border-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold transition-all flex items-center justify-center gap-3 group"
          >
            <div className="w-8 h-8 rounded-full bg-white dark:bg-indigo-500/20 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform shrink-0">
              <LayoutTemplate className="w-4 h-4 text-indigo-500" />
            </div>
            Or start from a pre-defined template
            <ArrowRight className="w-4 h-4 ml-auto opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all shrink-0" />
          </button>
        )}
      </div>

      {/* Right-Side Template Search Panel */}
      <div ref={sidePanelRef} className={`fixed inset-y-0 right-0 w-full sm:w-[450px] bg-white dark:bg-[#0f172a] shadow-[0_0_50px_rgba(0,0,0,0.1)] dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] border-l border-slate-200 dark:border-white/10 z-[2000] transform transition-transform duration-500 flex flex-col ${showTemplateSuggestions && form.title.length > 1 ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-indigo-500" /> Suggested Templates
            </h3>
            <p className="text-xs text-slate-500 mt-1">Based on "{form.title}"</p>
          </div>
          <button onClick={() => setShowTemplateSuggestions(false)} className="p-2 bg-white dark:bg-white/5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50 dark:bg-transparent">
          {isSearching ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
              <span className="text-sm font-medium text-slate-500">Searching library...</span>
            </div>
          ) : filteredTitleTemplates.length > 0 ? (
            <>
              {filteredTitleTemplates.slice(0, 10).map(template => {
                const templateContent = typeof template.content === "string" ? JSON.parse(template.content) : (template.content || {});
                const innerContent = templateContent.content || templateContent;
                const jobLevel = template.job_level || template.jobLevel || innerContent.job_level || innerContent.jobLevel;
                const seniority = template.seniority || innerContent.seniority;
                const employmentType = template.employment_type || innerContent.employment_type || innerContent.employmentType;
                const location = template.location || template.country_code || innerContent.location || 'Global';
                const department = template.department || innerContent.department || 'General';

                // Prepare a parsed template for the preview modal
                const parsedTemplate = { ...template, content: innerContent };

                return (
                  <div key={template.id} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 hover:border-indigo-500/30 hover:shadow-lg transition-all group">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{template.title}</h4>
                      {template.template_code && <span className="px-2 py-0.5 bg-slate-100 dark:bg-white/10 text-[10px] font-bold text-slate-500 uppercase tracking-widest rounded">{template.template_code}</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-4">
                      <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {department}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {location}</span>
                      {jobLevel && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 rounded-md font-medium text-[10px] uppercase tracking-wider">{jobLevel}</span>
                        </>
                      )}
                      {seniority && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 rounded-md font-medium text-[10px] uppercase tracking-wider">{seniority}</span>
                        </>
                      )}
                      {employmentType && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-md font-medium text-[10px] uppercase tracking-wider">{employmentType}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={(e) => { e.preventDefault(); setPreviewTemplate(parsedTemplate); }} className="px-4 py-2.5 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 font-bold text-sm rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                        Preview
                      </button>
                      <button onClick={(e) => { e.preventDefault(); handleTemplateSelect(template); }} className="flex-1 py-2.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-sm rounded-xl hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 dark:hover:text-white transition-all flex items-center justify-center gap-2">
                        Use Template <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}

              {totalTemplateMatches > 10 && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    const role = user?.role?.toLowerCase() || "";
                    const path = role.includes("hr") ? "/hr/templates" : "/admin/templates";
                    navigate(path, { state: { search: form.title } });
                  }}
                  className="w-full mt-2 py-3 px-6 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm border border-slate-200 dark:border-white/10"
                >
                  <FileText className="w-4 h-4" />
                  Explore {totalTemplateMatches - 10} more templates
                </button>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 opacity-50 text-center">
              <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">No exact matches</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-[200px]">We couldn't find a template matching that exact title.</p>
            </div>
          )}
        </div>
      </div>

      {/* Slide-over for Template Preview */}
      <div
        ref={previewPanelRef}
        className={`fixed inset-y-0 right-[450px] w-[500px] transform transition-transform duration-300 ease-in-out z-[1999] ${previewTemplate && showTemplateSuggestions ? 'translate-x-0 shadow-2xl' : 'translate-x-[1000px] pointer-events-none'}`}
      >
        <TemplatePreviewSidePanel
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onUse={(t) => {
            setPreviewTemplate(null);
            handleTemplateSelect(t);
          }}
        />
      </div>

    </div>
  );
}



/* -------------------------------
   Template Preview Side Panel
--------------------------------*/
const TemplatePreviewSidePanel = ({ template, onClose, onUse }) => {
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
  const coreComps = content.core_competencies || content.coreCompetencies || [];
  const funcComps = content.functional_competencies || content.functionalCompetencies || [];
  const reqQuals = content.qualifications_required || content.qualifications?.required || content.required_licenses_certifications || content.licenses_and_certifications || [];
  const prefQuals = content.qualifications_preferred || content.qualifications?.preferred || [];
  const compliance = content.compliance_requirements || [];

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-white/10">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 flex items-center justify-between sticky top-0 z-10 shrink-0">
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider rounded-full truncate">
              {template.industry || "General"}
            </span>
            <span className="text-slate-400 text-xs flex items-center gap-1 font-medium truncate">
              <FileText className="w-3.5 h-3.5" />
              Template #{template.id?.split('-')[0] || "1"}
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1">{template.title}</h2>

          {/* Metadata Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-2">
            <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {template.department || content.department || 'General'}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {template.location || template.country_code || content.location || 'Global'}</span>
            {(template.job_level || template.jobLevel || content.job_level || content.jobLevel) && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 rounded-md font-medium text-[10px] uppercase tracking-wider">{template.job_level || template.jobLevel || content.job_level || content.jobLevel}</span>
              </>
            )}
            {(template.seniority || content.seniority) && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 rounded-md font-medium text-[10px] uppercase tracking-wider">{template.seniority || content.seniority}</span>
              </>
            )}
            {(template.employment_type || content.employment_type || content.employmentType) && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-md font-medium text-[10px] uppercase tracking-wider">{template.employment_type || content.employment_type || content.employmentType}</span>
              </>
            )}
          </div>
        </div>
        <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-white/5 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 transition-colors shrink-0">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Summary */}
        <section>
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5" />
            Summary
          </h3>
          <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{summary}</p>
        </section>

        {/* Responsibilities */}
        <section>
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            Key Responsibilities
          </h3>
          <ul className="space-y-2.5">
            {responsibilities.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{renderListItem(item)}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Core Competencies */}
        {coreComps.length > 0 && (
          <section>
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Core Competencies
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {coreComps.map((comp, i) => (
                <div key={i} className="p-3 bg-white dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/10 shadow-sm">
                  <p className="font-bold text-slate-900 dark:text-white text-sm">{renderListItem(comp)}</p>
                  {comp?.description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{renderListItem(comp.description)}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Functional Competencies */}
        {funcComps.length > 0 && (
          <section>
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Wand2 className="w-3.5 h-3.5" />
              Functional Competencies
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {funcComps.map((comp, i) => (
                <div key={i} className="p-3 bg-white dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/10 shadow-sm">
                  <p className="font-bold text-slate-900 dark:text-white text-sm">{renderListItem(comp)}</p>
                  {comp?.description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{renderListItem(comp.description)}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Compliance Requirements */}
        {compliance.length > 0 && (
          <section>
            <h3 className="text-xs font-bold text-rose-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              Compliance & Regulatory
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {compliance.map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 p-3 bg-rose-50/50 dark:bg-rose-500/5 rounded-xl border border-rose-100 dark:border-rose-500/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                  <p className="text-xs font-bold text-rose-900 dark:text-rose-300 uppercase tracking-wider">{renderListItem(item)}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Qualifications */}
        {(reqQuals.length > 0 || prefQuals.length > 0) && (
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Qualifications
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-2 border-l-2 border-slate-100 dark:border-white/5 ml-1.5">
              {/* Required */}
              {reqQuals.length > 0 && (
                <section>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-white/5 pb-2 mb-3">Required</p>
                  <ul className="space-y-2">
                    {reqQuals.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                        <span className="w-1 h-1 bg-red-400 dark:bg-red-500 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-sm leading-relaxed">{renderListItem(item)}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Preferred */}
              {prefQuals.length > 0 && (
                <section>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-white/5 pb-2 mb-3">Preferred</p>
                  <ul className="space-y-2">
                    {prefQuals.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                        <span className="w-1 h-1 bg-amber-400 dark:bg-amber-500 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-sm leading-relaxed">{renderListItem(item)}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </div>
        )}

        {/* EEO Statement / Compliance */}
        {content.eeo_statement && (
          <section className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-200 dark:border-emerald-500/20 mt-6">
            <h3 className="text-xs font-bold text-emerald-700 dark:text-emerald-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Compliance
            </h3>
            <p className="text-sm text-emerald-800 dark:text-emerald-400 leading-relaxed">{content.eeo_statement}</p>
          </section>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 shrink-0">
        <button
          onClick={() => onUse(template)}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2"
        >
          Use This Template
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};



/* -------------------------------
   Weight Input Component
--------------------------------*/
const WeightInput = ({ value, onChange }) => {
  return (
    <div className="flex items-center gap-3 shrink-0">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 5))}
        className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-all text-slate-500"
      >
        <Minus className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg min-w-[70px] justify-center focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500 transition-all">
        <input
          type="text"
          value={value.toString()}
          onChange={(e) => {
            let v = e.target.value.replace(/\D/g, "");
            if (v === "") {
              onChange(0);
            } else {
              const num = parseInt(v, 10);
              if (!isNaN(num)) onChange(Math.min(100, Math.max(0, num)));
            }
          }}
          onFocus={(e) => e.target.select()}
          className="w-8 bg-transparent text-center text-sm font-bold text-slate-900 dark:text-white border-none p-0 focus:ring-0"
        />
        <span className="text-[10px] font-bold text-slate-400">%</span>
      </div>

      <button
        type="button"
        onClick={() => onChange(Math.min(100, value + 5))}
        className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-all text-slate-500"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
};


/* -------------------------------
   Job ID Generator
--------------------------------*/


