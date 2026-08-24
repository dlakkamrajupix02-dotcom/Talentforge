// export default function CompliancePanel() {

//   return (
//     <div className="p-4 border-l h-full">

//       <h3 className="font-semibold">
//         Compliance
//       </h3>

//       <p className="text-green-600">
//         ✓ Compliance Clear
//       </p>

//       <p className="text-sm text-gray-500">
//         No flagged phrases found.
//       </p>

//     </div>
//   );
// }


import { useState, useEffect } from "react";
import {
  Shield,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Info,
  Lock,
  Scale,
  Users,
  Clock,
  Globe,
  Flag,
  RotateCcw,
  BookOpen,
  Plus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Multi-region Compliance Data
const REGIONAL_COMPLIANCE_LIBRARY = {
  GLOBAL: [
    {
      id: "G1",
      category: "International Labor Standards",
      status: "passed",
      icon: Globe,
      description: "ILO Convention conformity",
      details: "Ensures no forced labor or child labor clauses are violated.",
      remediationSection: "eeo_statement",
      suggestion: "Maintain strictly neutral language for global reach."
    },
    {
      id: "G2",
      category: "Anti-Discrimination",
      status: "passed",
      icon: Users,
      description: "Universal non-bias verified",
      details: "Language does not target specific age, gender, or ethnicity.",
      remediationSection: "summary",
      suggestion: "AI confirms inclusive tone throughout the document."
    },
    {
      id: "G3",
      category: "Privacy & Data Ethics",
      status: "warning",
      icon: Lock,
      description: "Cross-border data protection",
      details: "Clear data processing purpose missing for international candidates.",
      remediationSection: "eeo_statement",
      suggestion: "Add: 'We process your data for the sole purpose of recruitment with full ethical oversight.'"
    }
  ],
  USA: [
    {
      id: "US1",
      category: "EEOC Compliance",
      status: "passed",
      icon: Shield,
      description: "Equal Employment Opportunity",
      details: "Required non-discrimination clauses (Race, Color, Religion, Sex, etc.) verified.",
      remediationSection: "eeo_statement",
      reasoning: "USA federal law requires explicit EEO statements for certain federal contractors and is best practice for all.",
      suggestion: "Add: 'Qualified applicants will receive consideration for employment without regard to race...'"
    },
    {
      id: "US2",
      category: "ADA Standards",
      status: "passed",
      icon: Shield,
      description: "Americans with Disabilities Act",
      details: "Reasonable accommodation statement detected.",
      reasoning: "The ADA requires businesses to provide reasonable accommodations to qualified individuals.",
      suggestion: "AI confirms your statement on physical requirements is non-exclusionary."
    },
    {
      id: "US3",
      category: "FLSA Exemption Status",
      status: "warning",
      icon: Scale,
      description: "Fair Labor Standards Act",
      details: "Exempt vs Non-Exempt classification not explicitly stated.",
      remediationSection: "summary",
      reasoning: "Failure to correctly classify a role can lead to significant overtime pay liabilities.",
      suggestion: "Suggestion: Add 'This position is [Exempt/Non-Exempt] based on FLSA guidelines.'"
    },
    {
      id: "US4",
      category: "CCPA Privacy Notice",
      status: "failed",
      icon: Lock,
      description: "California Consumer Privacy Act",
      details: "Notice at collection for California candidates missing.",
      remediationSection: "eeo_statement",
      reasoning: "California residents have specific rights regarding their personal data under CCPA/CPRA.",
      suggestion: "Add: 'California applicants, please review our California-specific privacy notice for recruitment data.'"
    }
  ],
  EU: [
    {
      id: "EU1",
      category: "GDPR Compliance",
      status: "failed",
      icon: Lock,
      description: "General Data Protection Regulation",
      details: "Data retention period not specified in JD.",
      remediationSection: "eeo_statement",
      reasoning: "Article 5(1)(e) of the GDPR requires data to be kept for no longer than necessary.",
      suggestion: "Add: 'We retain your application data for up to 6 months after the hiring process concludes.'"
    },
    {
      id: "EU2",
      category: "Equal Treatment Directive",
      status: "passed",
      icon: Users,
      description: "EU Non-Discrimination Acquis",
      details: "Direct and indirect discrimination checks passed.",
      reasoning: "EU law prohibits discrimination on grounds including religion, age, and sexual orientation.",
      suggestion: "Ensure neutral pronouns are used (detected 'they/them' or role-based language)."
    }
  ],
  INDIA: [
    {
      id: "IN1",
      category: "DPDP Alignment",
      status: "warning",
      icon: Lock,
      description: "Digital Personal Data Protection Act",
      details: "Explicit consent mechanism reference missing.",
      remediationSection: "eeo_statement",
      reasoning: "The 2023 DPDP Act requires clear, granular consent for processing personal data.",
      suggestion: "Add: 'By applying, you consent to the processing of your data as per our Privacy Policy aligned with DPDP 2023.'"
    },
    {
      id: "IN2",
      category: "Maternity Benefit Act",
      status: "passed",
      icon: Users,
      description: "Statutory Benefit Compliance",
      details: "No discriminatory clauses against parental leave detected.",
      reasoning: "Section 12 of the Act prohibits dismissal on grounds of pregnancy.",
      suggestion: "AI confirms zero bias regarding career gaps or family status."
    }
  ]
};

function AccessibilityIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v8M8 12h8" strokeLinecap="round" />
    </svg>
  );
}

export default function CompliancePanel({ jdContent, onApplySuggestion }) {
  const [isScanning, setIsScanning] = useState(false);
  const [expandedItem, setExpandedItem] = useState(null);
  const [appliedFixes, setAppliedFixes] = useState(new Set());
  const [lastScanTime, setLastScanTime] = useState(new Date());
  const [complianceScore, setComplianceScore] = useState(95);
  const [showAllChecks, setShowAllChecks] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState("USA");
  const [activeChecks, setActiveChecks] = useState(REGIONAL_COMPLIANCE_LIBRARY["USA"]);

  // Update checks when region changes OR fixes are applied
  useEffect(() => {
    const baseChecks = REGIONAL_COMPLIANCE_LIBRARY[selectedRegion] || REGIONAL_COMPLIANCE_LIBRARY["GLOBAL"] || [];
    const updatedWithFixes = baseChecks.map(check => {
      if (appliedFixes.has(check.id)) {
        return { ...check, status: 'passed' };
      }
      return check;
    });
    setActiveChecks(updatedWithFixes);
  }, [selectedRegion, appliedFixes]);

  // Simulate scan on mount or when jdContent changes
  useEffect(() => {
    if (jdContent) {
      handleRescan();
    }
  }, [jdContent]);

  const handleRescan = async () => {
    setIsScanning(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setLastScanTime(new Date());
    setIsScanning(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "passed": return "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20";
      case "warning": return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20";
      case "failed": return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20";
      default: return "text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "passed": return <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case "warning": return <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case "failed": return <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
      default: return <Info className="w-5 h-5 text-slate-600 dark:text-slate-400" />;
    }
  };

  const passedChecks = activeChecks.filter(c => c.status === "passed").length;
  const totalChecks = activeChecks.length;
  const score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100;

  return (    <div className="h-full bg-slate-50/50 dark:bg-slate-950 flex flex-col transition-colors duration-300 relative group/compliance">
      {/* Next Version Overlay */}
      <div className="absolute inset-0 bg-white/20 dark:bg-slate-900/20 backdrop-blur-[6px] z-50 flex flex-col items-center justify-center text-center p-6 opacity-0 group-hover/compliance:opacity-100 transition-all duration-500 pointer-events-none group-hover/compliance:pointer-events-auto">
        <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-3xl flex items-center justify-center mb-6 shadow-2xl border border-slate-200 dark:border-white/10 scale-90 group-hover/compliance:scale-110 transition-transform duration-500 bg-gradient-to-br from-indigo-500 to-purple-600">
           <ShieldCheck className="w-8 h-8 text-white animate-pulse" />
        </div>
        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Compliance Intelligence</h3>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 max-w-[240px] leading-relaxed">
          Real-time regulatory scanning and automated EEOC remediation are currently in beta.
        </p>
        <div className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-500/40">
          Available in Next Version
        </div>
      </div>

      {/* Main Content with Blur Effect on Hover */}
      <div className="flex-1 flex flex-col overflow-hidden transition-all duration-700 group-hover/compliance:blur-[3px] group-hover/compliance:grayscale-[0.8] group-hover/compliance:opacity-30 group-hover/compliance:scale-[0.98]">
        {/* Header */}
        <div className="p-5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700 rounded-xl shadow-lg shadow-emerald-500/20 dark:shadow-none flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">Compliance</h3>
                <p className={`text-xs font-semibold ${totalChecks - passedChecks > 0 ? "text-red-500 dark:text-red-400" : "text-slate-500 dark:text-slate-400"}`}>
                  {totalChecks - passedChecks > 0 ? `${totalChecks - passedChecks} Regulatory Issues Found` : "AI-Powered Legal Scanner"}
                </p>
              </div>
            </div>
            <button
              onClick={handleRescan}
              disabled={isScanning}
              className={`
                p-2 rounded-lg transition-all duration-200
                ${isScanning
                  ? "bg-slate-100 dark:bg-white/5 cursor-not-allowed"
                  : "bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400"
                }
              `}
              title="Rescan JD"
            >
              <RotateCcw className={`w-4 h-4 ${isScanning ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Region Selector */}
          <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl mb-4 relative z-20">
            {Object.keys(REGIONAL_COMPLIANCE_LIBRARY).map((region) => (
              <button
                key={region}
                onClick={() => setSelectedRegion(region)}
                className={`
                  flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200
                  ${selectedRegion === region
                    ? "bg-white dark:bg-indigo-600 text-blue-600 dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                  }
                `}
              >
                {region}
              </button>
            ))}
          </div>

          {/* Overall Score Card */}
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-white shadow-lg shadow-emerald-500/20">
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium mb-1">Compliance Score</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{score}</span>
                  <span className="text-emerald-200 text-lg">/100</span>
                </div>
                <p className="text-emerald-100 text-xs mt-1 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  {passedChecks} of {totalChecks} checks passed
                </p>
              </div>

              {/* Circular Progress */}
              <div className="relative w-16 h-16">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    className="text-emerald-700/30 dark:text-white/10"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="white"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${score * 1.76} 176`}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  {score >= 90 ? (
                    <Sparkles className="w-6 h-6 text-white animate-pulse" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-white" />
                  )}
                </div>
              </div>
            </div>

            {/* Decorative background pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>
        </div>

        {/* Scanning Status */}
        {isScanning && (
          <div className="px-5 py-3 bg-blue-50 dark:bg-blue-500/10 border-b border-blue-100 dark:border-blue-500/20">
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-200" />
              </div>
              <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                Scanning for compliance issues...
              </span>
            </div>
            <div className="mt-2 w-full bg-blue-200 dark:bg-blue-500/20 rounded-full h-1 overflow-hidden">
              <div className="h-full bg-blue-600 dark:bg-blue-500 rounded-full animate-[loading_1.5s_ease-in-out_infinite]"
                style={{ width: "60%" }} />
            </div>
          </div>
        )}

        {/* Compliance Checks List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-400 uppercase tracking-wider">
              Detailed Checks
            </h4>
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {lastScanTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {activeChecks
            .sort((a, b) => {
              const priority = { failed: 0, warning: 1, passed: 2 };
              return priority[a.status] - priority[b.status];
            })
            .slice(0, showAllChecks ? undefined : 4).map((check) => {
              const Icon = check.icon || Shield;
              const isExpanded = expandedItem === check.id;
              const isFailed = check.status === "failed";

              return (
                <div
                  key={check.id}
                  className={`
                  rounded-xl border-2 transition-all duration-200 overflow-hidden
                  ${getStatusColor(check.status)}
                  ${isExpanded ? "shadow-md" : "hover:shadow-sm"}
                  ${(isFailed || check.status === "warning") && !isExpanded ? "animate-pulse shadow-red-200 dark:shadow-red-500/20 shadow-sm" : ""}
                `}
                >
                <button
                  onClick={() => setExpandedItem(isExpanded ? null : check.id)}
                  className="w-full p-4 flex items-start gap-3 text-left"
                >
                  <div className="mt-0.5">
                    {getStatusIcon(check.status)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h5 className="font-semibold text-sm truncate">
                        {check.category}
                      </h5>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 opacity-60" />
                      ) : (
                        <ChevronDown className="w-4 h-4 opacity-60" />
                      )}
                    </div>
                    <p className="text-xs opacity-80 mb-1">
                      {check.description}
                    </p>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-current border-opacity-10 animate-in slide-in-from-top-2 duration-300">
                        <div className="mb-3">
                          <p className="text-[10px] uppercase font-bold tracking-wider opacity-60 mb-1 flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            Compliance Reason
                          </p>
                          <p className="text-xs leading-relaxed opacity-90">
                            {check.reasoning || check.details}
                          </p>
                        </div>

                        {!check.reasoning && (
                          <p className="text-xs mb-3 opacity-90">
                            <span className="font-medium">Observed:</span> {check.details}
                          </p>
                        )}
                        {check.suggestion && check.status !== "passed" && (
                          <div className="mt-2 p-2 bg-white/50 rounded-lg border border-current border-opacity-20 flex flex-col gap-2">
                            <div>
                              <p className="text-[10px] font-bold mb-1 flex items-center gap-1 opacity-60 uppercase tracking-tighter">
                                <Sparkles className="w-3 h-3" />
                                AI Remediation
                              </p>
                              <p className="text-xs opacity-80 leading-snug">{check.suggestion}</p>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onApplySuggestion && !appliedFixes.has(check.id)) {
                                  onApplySuggestion(check);
                                  setAppliedFixes(prev => new Set([...prev, check.id]));
                                }
                              }}
                              disabled={appliedFixes.has(check.id)}
                              className={`
                                w-full py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5
                                ${appliedFixes.has(check.id)
                                  ? "bg-emerald-500 text-white cursor-default"
                                  : "bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:scale-[1.02] active:scale-[0.98] shadow-md"
                                }
                              `}
                            >
                              {appliedFixes.has(check.id) ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-white" />
                                  Applied to JD
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3 h-3" />
                                  Accept & Apply Fix
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              </div>
              );
            })}

          {/* Show More/Less */}
          {activeChecks.length > 4 && (
            <button
              onClick={() => setShowAllChecks(!showAllChecks)}
              className="w-full py-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors flex items-center justify-center gap-1"
            >
              {showAllChecks ? (
                <>Show Less <ChevronUp className="w-3 h-3" /></>
              ) : (
                <>Show More Checks <ChevronDown className="w-3 h-3" /></>
              )}
            </button>
          )}
        </div>

        {/* Footer Info */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-white/10">
          <div className="flex items-start gap-2 p-3 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 transition-colors">
            <Info className="w-4 h-4 text-slate-400 dark:text-slate-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              This panel scans for common compliance issues but does not constitute legal advice.
              Always consult your legal team for final approval.
            </p>
          </div>
        </div>
      </div>
    </div>

  );
}