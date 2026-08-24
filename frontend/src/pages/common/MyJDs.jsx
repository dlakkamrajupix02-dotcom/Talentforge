// import { useContext } from "react";
// import PageLayout from "../../layout/PageLayout";
// import { JDContext } from "../../context/JDContext";
// import JDTable from "../../components/JDTable";
// import { useLocation } from "react-router-dom";


// export default function MyJDs() {
//     const location = useLocation();



//   const { myJDs } = useContext(JDContext);

//       const displayJDs =
//   location.state?.results || myJDs;

//   return (
//     <PageLayout>

//       <div className="p-6">

//         <h2 className="text-xl font-semibold mb-4">
//           My Job Descriptions
//         </h2>

//         {myJDs.length === 0 && (
//           <p className="text-gray-500">
//             No JDs created yet.
//           </p>
//         )}

//        <JDTable jds={displayJDs} />

//       </div>

//     </PageLayout>
//   );
// }




import React, { useContext, useState, useRef, useEffect, useMemo } from "react";
import { JDContext } from "../../context/JDContext";
import { useLocation, useNavigate } from "react-router-dom";
import { formatJDText } from "../../utils/formatJD";
import FilterDropdown from "../../components/common/FilterDropdown";
import toast from "react-hot-toast";
import * as jdService from "../../services/jdService";
import * as orgService from "../../services/organizationService";
import { getTemplateIndustries } from "../../services/templateService";
import {
  FileText,
  Search,
  Plus,
  MoreHorizontal,
  Edit3,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown,
  LayoutGrid,
  List,
  Sparkles,
  Copy,
  Download,
  Upload,
  Check,
  Send,
  Archive,
  AlertTriangle,
  RefreshCw,
  Eye,
  Briefcase,
  Filter,
  Link as LinkIcon,
  User,
  Network,
  ArrowLeft,
  Shield,
  Users,
  Zap
} from "lucide-react";
import WorkflowModal from "../../components/common/WorkflowModal";
import SearchableDropdown from "../../components/common/SearchableDropdown";
import UserSelectionPanel from "../../components/common/UserSelectionPanel";
import OrganizationTree from "../../components/common/OrganizationTree";

const isImportedJD = (jd) => {
  const mode = (
    jd.generation_mode ||
    jd.content?.generation_mode ||
    jd.content?.metadata?.generation_mode ||
    jd.generationMode ||
    ''
  ).toLowerCase();

  if (mode === 'saba' || mode === 'import') return true;

  const source = (jd.source || jd._source || jd.content?.source || '').toLowerCase();
  if (source === 'saba' || source === 'import') return true;

  const industry = (jd.industry || jd.content?.industry || jd.content?.metadata?.industry || '').toLowerCase();
  return industry.includes('imported') || industry === 'import';
};

const getJDMode = (jd) => {
  const mode = (
    jd.generation_mode ||
    jd.content?.generation_mode ||
    jd.content?.metadata?.generation_mode ||
    jd.generationMode ||
    ''
  ).toLowerCase();

  if (mode === 'manual') return 'manual';
  if (isImportedJD(jd)) return 'import';
  if (mode === 'template' || jd.template_id || jd.content?.template_id) return 'template';
  return 'ai';
};

export default function MyJDs() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    myJDs, deleteJD, isLoadingJDs, refreshMyJDs, refreshReceivedJDs, user,
    workflows, submitJDWithWorkflow, bulkSubmitJDWithWorkflow, teamMembers
  } = useContext(JDContext);

  const { queueJDForPush } = useContext(JDContext);

  const isHR = user?.role?.toLowerCase().includes('hr');
  const isManager = user?.role?.toLowerCase().includes('manager');
  const isAdmin = user?.role?.toLowerCase().includes('admin');
  const base = isAdmin ? 'admin' : (isHR ? 'hr' : 'manager');

  useEffect(() => {
    refreshMyJDs();
    if (isManager) {
      refreshReceivedJDs();
    }
  }, [isManager]);

  useEffect(() => {
    if (location.state?.statusFilter) {
      setStatusFilter(location.state.statusFilter);
    }
  }, [location.state]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(() => {
    return location.state?.statusFilter || "All";
  });
  const [industryFilter, setIndustryFilter] = useState("All");
  const [modeFilter, setModeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState("list");

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;
  const [selectedJDs, setSelectedJDs] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedJDForAssign, setSelectedJDForAssign] = useState(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [candidateUsers, setCandidateUsers] = useState([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [selectedCandidateEmails, setSelectedCandidateEmails] = useState([]);
  const [alreadyAssignedEmails, setAlreadyAssignedEmails] = useState([]);
  const [showUserSelectionPanel, setShowUserSelectionPanel] = useState(false);
  const [dynamicIndustries, setDynamicIndustries] = useState([]);

  useEffect(() => {
    const fetchIndustries = async () => {
      const inds = await getTemplateIndustries();
      setDynamicIndustries(Array.isArray(inds) ? inds : []);
    };
    fetchIndustries();
  }, []);

  useEffect(() => {
    if (showAssignModal) {
      const fetchCandidates = async () => {
        setIsLoadingCandidates(true);
        try {
          const data = await orgService.listCandidateUsers();
          // Extract candidates from response safely
          const candidates = Array.isArray(data) ? data : (data?.candidates || data?.users || data?.results || data?.data || []);
          setCandidateUsers(candidates);

          const assignmentsRes = await orgService.getAllAssignments();
          const allAssignments = Array.isArray(assignmentsRes) ? assignmentsRes : (assignmentsRes?.assignments || []);

          const assignedEmails = allAssignments.filter(a => {
            const aJdId = a.original_jd_id || a.jd_id || a.job_description_id || a.jd;
            const jdMatch = aJdId
              ? String(aJdId) === String(selectedJDForAssign?.id)
              : a.jd_title === selectedJDForAssign?.title;
            return jdMatch;
          }).map(a => (a.candidate_email || a.email || "").toLowerCase());

          setAlreadyAssignedEmails(assignedEmails);

        } catch (error) {
          console.error("[MyJDs] Failed to fetch candidate users:", error);
        } finally {
          setIsLoadingCandidates(false);
        }
      };
      fetchCandidates();
    } else {
      setSelectedCandidateEmails([]);
      setCandidateUsers([]);
      setAlreadyAssignedEmails([]);
    }
  }, [showAssignModal, selectedJDForAssign?.id, selectedJDForAssign?.title]);

  const [copiedId, setCopiedId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [jdToSubmit, setJdToSubmit] = useState(null); // Single or Array
  const [activeTab, setActiveTab] = useState("all"); // 'all', 'mine', 'hr'
  const [showOrgTree, setShowOrgTree] = useState(false);
  const [targetDepartment, setTargetDepartment] = useState("");
  const [workflowSearch, setWorkflowSearch] = useState("");

  const displayJDs = (location.state?.results || myJDs).filter(jd => jd.status !== 'push_to_csod' && jd.status !== 'pushed_to_csod' && jd.status !== 'public_view' && jd.status !== 'published');

  const handleSubmit = (id) => {
    console.log(`[MyJDs] Triggering handleSubmit for ID: ${id}`);
    const jd = myJDs.find(j => String(j.id) === String(id));
    setTargetDepartment(jd?.department || jd?.content?.department || "");
    setJdToSubmit(id);
    setShowWorkflowModal(true);
  };

  const handleConfirmWorkflow = async (workflowId) => {
    try {
      if (Array.isArray(jdToSubmit)) {
        await bulkSubmitJDWithWorkflow(jdToSubmit, workflowId);
        toast.success(`Sent ${jdToSubmit.length} Job Descriptions for review.`);
      } else {
        await submitJDWithWorkflow(jdToSubmit, workflowId);
        toast.success("JD sent for review based on selected workflow.");
      }
    } catch (error) {
      console.error("Failed to submit workflow:", error);
      toast.error(error?.response?.data?.detail || error?.response?.data?.message || "Failed to submit for review.");
    } finally {
      setShowWorkflowModal(false);
      setTargetDepartment("");
      setJdToSubmit(null);
      setSelectedJDs([]);
    }
  };

  const handleBulkSubmit = (ids) => {
    // Robust ID comparison
    const validJDs = myJDs.filter(jd => ids.some(id => String(id) === String(jd.id)) && (jd.status === 'finalized' || jd.status === 'final'));
    const validIds = validJDs.map(jd => jd.id);

    if (validIds.length === 0) {
      toast.error("No finalized, rejected or declined JDs selected for review.");
      return;
    }

    setTargetDepartment(validJDs[0]?.department || "");
    setJdToSubmit(validIds);
    setWorkflowSearch("");
    setShowWorkflowModal(true);
  };

  const industryOptions = useMemo(() => {
    const inds = new Set(dynamicIndustries);

    // Exactly match Templates.jsx presets
    const presets = [
      "Airlines",
      "Aviation",
      "Educational Service",
      "Finance",
      "Healthcare",
      "Hospital",
      "Legal Service",
      "Logistics",
      "Manufacturing",
      "Retail",
      "Technology"
    ];
    presets.forEach(p => inds.add(p));

    const optionsMap = new Map();
    for (const ind of inds) {
      let val = ind;
      let label = ind;

      const lower = ind.toLowerCase();
      if (lower === "education services" || lower === "educational service" || lower === "education") {
        val = "Educational Service";
        label = "Educational Service";
      } else if (lower === "legal services" || lower === "legal service" || lower === "legal") {
        val = "Legal Service";
        label = "Legal Service";
      } else if (lower === "healthcare") {
        val = "Healthcare";
        label = "Healthcare";
      } else if (lower === "hospital administration" || lower === "hospital") {
        val = "Hospital";
        label = "Hospital";
      }

      if (!optionsMap.has(val)) {
        optionsMap.set(val, label);
      }
    }

    if (industryFilter && industryFilter !== "All") {
      if (!optionsMap.has(industryFilter)) optionsMap.set(industryFilter, industryFilter);
    }

    const sortedVals = Array.from(optionsMap.keys())
      .filter(Boolean)
      .sort((a, b) => optionsMap.get(a).localeCompare(optionsMap.get(b), undefined, { sensitivity: "base" }));

    return [{ label: "All Industries", value: "All" }, ...sortedVals.map((v) => ({ label: optionsMap.get(v), value: v }))];
  }, [displayJDs, industryFilter, dynamicIndustries]);

  const modeCounts = useMemo(() => {
    const counts = { all: displayJDs.length, manual: 0, ai: 0, template: 0, import: 0 };
    displayJDs.forEach(jd => {
      const mode = getJDMode(jd);
      counts[mode] = (counts[mode] || 0) + 1;
    });
    return counts;
  }, [displayJDs]);

  const filteredJDs = useMemo(() => {
    let baseList = displayJDs;

    // Admin-specific tab filtering
    if (isAdmin && activeTab !== 'all') {
      const loggedUserId = String(user?.id || user?.userId || "").toLowerCase().trim();

      if (activeTab === 'mine') {
        baseList = baseList.filter(jd => {
          const cid = String(jd.creator_id || jd.createdBy || "").toLowerCase().trim();
          return cid === loggedUserId;
        });
      } else if (activeTab === 'others') {
        baseList = baseList.filter(jd => {
          const cid = String(jd.creator_id || jd.createdBy || "").toLowerCase().trim();
          return cid !== loggedUserId;
        });
      }
    }

    return baseList
      .filter(jd => {
        const title = (jd.title || "").toLowerCase();
        const matchesSearch = title.includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "All" || jd.status === statusFilter;
        const matchesMode = modeFilter === "all" || getJDMode(jd) === modeFilter;

        // Industry detection fallback for existing JDs without industry tag
        let jdIndustry = jd.industry || jd.content?.industry || jd.content?.metadata?.industry;

        if (jdIndustry) {
          const lowInd = String(jdIndustry).toLowerCase();
          if (lowInd.includes('education')) jdIndustry = "Educational Service";
          else if (lowInd.includes('legal') || lowInd.includes('law')) jdIndustry = "Legal Service";
        }

        if (!jdIndustry) {
          if (title.includes('nurse') || title.includes('health') || title.includes('patient')) jdIndustry = "Healthcare";
          else if (title.includes('developer') || title.includes('react') || title.includes('tech') || title.includes('engineer')) jdIndustry = "Technology";
          else if (title.includes('analyst') || title.includes('financial') || title.includes('finance')) jdIndustry = "Finance";
          else if (title.includes('aviation') || title.includes('pilot')) jdIndustry = "Aviation";
          else if (title.includes('teacher') || title.includes('education') || title.includes('student') || title.includes('professor')) jdIndustry = "Educational Service";
          else if (title.includes('lawyer') || title.includes('legal') || title.includes('attorney') || title.includes('counsel')) jdIndustry = "Legal Service";
        }

        const matchesIndustry = industryFilter === "All" ||
          (String(jdIndustry).toLowerCase() === industryFilter.toLowerCase()) ||
          (!jdIndustry && industryFilter === "General");

        return matchesSearch && matchesStatus && matchesIndustry && matchesMode;
      })
      .sort((a, b) => {
        const getTime = (obj) => new Date(obj.updated_at || obj.updatedAt || obj.created_at || obj.createdAt || obj.timestamp || 0).getTime();
        if (sortBy === "newest") return getTime(b) - getTime(a);
        if (sortBy === "oldest") return getTime(a) - getTime(b);
        if (sortBy === "name") return (a.title || "").localeCompare(b.title || "");
        return 0;
      });
  }, [displayJDs, searchQuery, statusFilter, industryFilter, modeFilter, sortBy, activeTab, isAdmin, user]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, industryFilter, modeFilter, sortBy, activeTab]);

  // Scroll to top when page changes
  useEffect(() => {
    const scrollContainer = document.querySelector('main') || document.documentElement;
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage]);

  const totalPages = Math.ceil(filteredJDs.length / ITEMS_PER_PAGE);
  const paginatedJDs = filteredJDs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Dynamic Status Counts Calculation
  const statusOptions = useMemo(() => {
    const counts = {};
    displayJDs.forEach(jd => {
      const s = jd.status || 'draft';
      counts[s] = (counts[s] || 0) + 1;
    });

    const options = [
      { label: `All Status (${displayJDs.length})`, value: "All" }
    ];

    // Status map for better labels
    const statusLabels = {
      draft: 'Draft',
      finalized: 'Finalized',
      final: 'Final',
      declined: 'Declined',
      approved: 'Approved',
      pushed: 'Pushed',
      archived: 'Archived',
      rejected: 'Rejected',
      submitted: 'Submitted',
      in_review: 'In Review',
      pending: 'Pending Review',
      public_view: 'JD Published',
      published: 'JD Published'
    };

    Object.entries(counts).forEach(([status, count]) => {
      options.push({
        label: `${statusLabels[status] || (status.charAt(0).toUpperCase() + status.slice(1))} (${count})`,
        value: status
      });
    });

    return options;
  }, [displayJDs]);

  const stats = {
    total: myJDs.filter(jd => jd.status !== 'push_to_csod' && jd.status !== 'pushed_to_csod' && jd.status !== 'public_view' && jd.status !== 'published').length,
    draft: myJDs.filter(j => j.status === "draft").length,
    final: myJDs.filter(j => j.status === "finalized" || j.status === "final").length,
    approved: myJDs.filter(j => j.status === "approved" || j.status === "pushed").length
  };

  // Get selected JD objects for bulk actions
  const selectedJDObjects = myJDs.filter(jd => selectedJDs.includes(jd.id));

  const unpublishedApprovedJDs = useMemo(() => {
    return selectedJDObjects.filter(jd => 
      jd.status === 'approved' && 
      !['published', 'public_view'].includes(jd.status?.toLowerCase()) && 
      !jd.public_jd_id && 
      !jd.content?.public_jd_id && 
      !jd.content?.metadata?.public_jd_id
    );
  }, [selectedJDObjects]);

  const handleCopy = async (jd, e) => {
    e.stopPropagation();
    try {
      if (jd.id) {
        const result = await jdService.exportClipboard(jd.id);
        const text = result?.text || result?.data || formatJDText(jd.content);
        await navigator.clipboard.writeText(text);
      } else {
        const text = formatJDText(jd.content);
        await navigator.clipboard.writeText(text);
      }
      setCopiedId(jd.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("Clipboard export failed:", error);
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleDownload = (jd, e) => {
    e.stopPropagation();
    const content = jd.content || {};
    const text = formatJDText(content);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${jd.title?.replace(/\s+/g, "-").toLowerCase() || "jd"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePDF = async (jd, e) => {
    e.stopPropagation();
    try {
      await jdService.exportPDF(jd.id, jd.title);
    } catch (error) {
      console.error("PDF export failed:", error);
      toast.error("Failed to generate PDF. Please try again.");
    }
  };


  const handlePush = async (jd, e) => {
    if (e) e.stopPropagation();
    if (Array.isArray(jd)) {
      // Bulk push
      queueJDForPush(jd);
      try {
        await Promise.all(jd.map(j => jdService.pushJDToCSODStatus(j.id)));
        refreshMyJDs();
      } catch (err) {
        console.error("Failed to update status on backend:", err);
      }
      toast.success(`${jd.length} JDs added to CSOD push queue. Go to "Push to CSOD" to complete the sync.`, {
        duration: 5000,
        icon: '🚀'
      });
    } else {
      // Single push
      queueJDForPush(jd);
      try {
        await jdService.pushJDToCSODStatus(jd.id);
        refreshMyJDs();
      } catch (err) {
        console.error("Failed to update status on backend:", err);
      }
      toast.success(`"${jd.title}" added to CSOD push queue. Go to "Push to CSOD" to complete the sync.`, {
        duration: 5000,
        icon: '🚀'
      });
    }
  };

  const handleDelete = async (ids, e) => {
    e?.stopPropagation();
    if (Array.isArray(ids)) {
      // Bulk delete
      toast.promise(
        Promise.all(ids.map(id => deleteJD(id))),
        {
          loading: 'Deleting selected JDs...',
          success: 'JDs deleted successfully',
          error: 'Failed to delete some JDs'
        }
      );
      setSelectedJDs([]);
      setShowDeleteConfirm(false);
    } else {
      // Single delete
      await deleteJD(ids);
      toast.success("JD deleted successfully");
    }
  };

  const handleArchive = async (jd, e) => {
    e?.stopPropagation();
    try {
      await jdService.archiveJD(jd.id);
      toast.success("JD archived successfully");
      refreshMyJDs();
    } catch (error) {
      console.error("Archive JD failed:", error);
      toast.error("Failed to archive JD");
    }
  };

  const handleBulkPublish = async (jdsToPublish) => {
    const unpublishedJDs = jdsToPublish.filter(jd => 
      jd.status === 'approved' && 
      !['published', 'public_view'].includes(jd.status?.toLowerCase()) && 
      !jd.public_jd_id && 
      !jd.content?.public_jd_id && 
      !jd.content?.metadata?.public_jd_id
    );

    if (unpublishedJDs.length === 0) {
      toast.error("No unpublished approved JDs selected.");
      return;
    }

    const jdIds = unpublishedJDs.map(jd => jd.id);

    toast.promise(
      jdService.bulkUpdateJDStatus("approved", "public_view", jdIds),
      {
        loading: `Publishing ${unpublishedJDs.length} Job Description(s)...`,
        success: `${unpublishedJDs.length} Job Description(s) published successfully!`,
        error: 'Failed to publish Job Descriptions.'
      }
    ).then(() => {
      refreshMyJDs();
      setSelectedJDs([]);
    }).catch(err => {
      console.error("Failed to bulk publish JDs:", err);
    });
  };

  const handleAssignJD = async (emails, dueDate) => {
    const targetEmails = emails || selectedCandidateEmails;
    if (!targetEmails || targetEmails.length === 0) {
      toast.error("Please select at least one candidate email");
      return;
    }
    if (!dueDate) {
      toast.error("Please select a due date");
      return;
    }

    setIsAssigning(true);
    try {
      const assignmentsRes = await orgService.getAllAssignments();
      const allAssignments = Array.isArray(assignmentsRes) ? assignmentsRes : (assignmentsRes?.assignments || []);

      const alreadyAssigned = allAssignments.filter(a => {
        const aJdId = a.original_jd_id || a.jd_id || a.job_description_id || a.jd;
        const jdMatch = aJdId
          ? String(aJdId) === String(selectedJDForAssign.id)
          : a.jd_title === selectedJDForAssign.title;

        return jdMatch && targetEmails.some(email =>
          email.toLowerCase() === (a.candidate_email || a.email || "").toLowerCase()
        );
      });

      if (alreadyAssigned.length > 0) {
        const conflictEmails = alreadyAssigned.map(a => a.candidate_email).join(', ');
        toast.error(`JD already assigned to: ${conflictEmails}.`);
        setIsAssigning(false);
        return;
      }

      const payload = {
        jd_id: selectedJDForAssign.id,
        data: targetEmails.map(email => ({
          email: email,
          due_date: new Date(dueDate).toISOString()
        }))
      };
      await orgService.bulkAssignJD(payload);
      toast.success(`JD assigned successfully!`, { icon: '🤝' });
      setShowAssignModal(false);
      setSelectedJDForAssign(null);
      refreshMyJDs();
    } catch (error) {
      console.error("Failed to assign JD:", error);
      toast.error(error.message || "Failed to assign JD");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleEdit = (jd) => {
    const isManual = getJDMode(jd) === 'manual';
    const path = isManual ? `/${base}/generate/manual/${jd.id}` : `/${base}/generate/${jd.id}`;
    navigate(path, { state: { jd } });
  };

  const toggleSelection = (id) => {
    setSelectedJDs(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedJDs.length === filteredJDs.length) {
      setSelectedJDs([]);
    } else {
      setSelectedJDs(filteredJDs.map(jd => jd.id));
    }
  };

  const clearSelection = () => {
    setSelectedJDs([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50/20 dark:from-slate-950 dark:via-[#090d16] dark:to-slate-900 pb-24 transition-colors duration-300 font-sans">

      {/* ── STICKY TOP HEADER ── */}
      <div className="bg-white/80 dark:bg-[#020617]/80 backdrop-blur-md border-b border-slate-200/80 dark:border-white/10 sticky top-0 z-40 transition-colors duration-300 shadow-sm">
        <div className="max-w-[1720px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-[22px] font-bold text-[#0F172A] dark:text-white tracking-tight leading-none">Job Description Library</h1>
            <p className="text-sm text-[#64748B] dark:text-slate-500 mt-1">Manage, organize, and track your organization's job descriptions.</p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {isAdmin && (
              <button
                onClick={() => setShowOrgTree(prev => !prev)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all duration-300 hover:-translate-y-0.5 ${showOrgTree
                    ? 'bg-indigo-50 dark:bg-indigo-500/15 border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-sm shadow-indigo-500/10'
                    : 'border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                title={showOrgTree ? 'View JD Library' : 'Organization Tree'}
              >
                {showOrgTree ? <ArrowLeft className="w-3.5 h-3.5" /> : <Network className="w-3.5 h-3.5" />}
                {showOrgTree ? 'JD Library' : 'Org Tree'}
              </button>
            )}
            <button
              onClick={refreshMyJDs}
              disabled={isLoadingJDs}
              className={`p-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:border-blue-400 hover:text-blue-600 transition-all ${isLoadingJDs ? 'text-blue-600 border-blue-200' : 'text-slate-500 dark:text-slate-400'
                }`}
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingJDs ? 'animate-spin' : ''}`} />
            </button>
            {!isManager && (
              <button
                onClick={() => navigate(`/${base}/generate`)}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 dark:bg-indigo-600 hover:bg-blue-700 dark:hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-500/20 transition-all hover:-translate-y-0.5"
              >
                <Plus className="w-4 h-4" />
                Create Job Description
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Org Tree View */}
      {showOrgTree ? (
        <div className="max-w-[1720px] mx-auto px-6 py-8">
          <OrganizationTree />
        </div>
      ) : (
        <div className="max-w-[1720px] mx-auto px-6 py-8 flex flex-col gap-8">

          {/* ── KPI OVERVIEW CARDS ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { label: 'Total JDs', value: stats.total, icon: FileText, trend: '+12% vs last month', trendUp: true, border: 'border-blue-500/20 dark:border-blue-500/30 hover:border-blue-500/50', bg: 'bg-[#EFF6FF] dark:bg-blue-950/20 hover:bg-blue-100/70 dark:hover:bg-blue-950/30', iconBg: 'bg-gradient-to-tr from-[#2563EB] to-blue-600 shadow-blue-500/20' },
              { label: 'Drafts', value: stats.draft, icon: Clock, trend: '-3% vs last month', trendUp: false, border: 'border-amber-500/20 dark:border-amber-500/30 hover:border-amber-500/50', bg: 'bg-[#FFFBEB] dark:bg-amber-950/20 hover:bg-amber-100/70 dark:hover:bg-amber-950/30', iconBg: 'bg-gradient-to-tr from-[#F59E0B] to-amber-500 shadow-amber-500/20' },
              { label: 'Finalized', value: stats.final, icon: CheckCircle2, trend: '+5% vs last month', trendUp: true, border: 'border-emerald-500/20 dark:border-emerald-500/30 hover:border-emerald-500/50', bg: 'bg-[#ECFDF5] dark:bg-emerald-950/20 hover:bg-emerald-100/70 dark:hover:bg-emerald-950/30', iconBg: 'bg-gradient-to-tr from-emerald-500 to-green-500 shadow-emerald-500/20' },
              { label: 'Approved', value: stats.approved, icon: Sparkles, trend: '+24% vs last month', trendUp: true, border: 'border-purple-500/20 dark:border-purple-500/30 hover:border-purple-500/50', bg: 'bg-[#F5F3FF] dark:bg-purple-950/20 hover:bg-purple-100/70 dark:hover:bg-purple-950/30', iconBg: 'bg-gradient-to-tr from-purple-500 to-indigo-500 shadow-purple-500/20' },
            ].map(({ label, value, icon: Icon, trend, trendUp, border, bg, iconBg }) => (
              <div key={label} className={`relative overflow-hidden rounded-[20px] p-5 border ${border} ${bg} group hover:-translate-y-1 hover:shadow-xl transition-all duration-300`}>
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/30 dark:bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
                <div className="flex items-start justify-between relative z-10">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{label}</p>
                    <p className="text-[32px] font-black text-[#0F172A] dark:text-white leading-none mt-1 tracking-tight">{value}</p>
                    <div className={`flex items-center gap-1 mt-2 text-[11px] font-bold ${trendUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                      {trendUp ? <span className="text-lg leading-none">↑</span> : <span className="text-lg leading-none">↓</span>}
                      <span>{trend}</span>
                    </div>
                  </div>
                  <div className={`w-11 h-11 rounded-[12px] flex items-center justify-center text-white shadow-md ${iconBg}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── SEARCH & FILTER STRIP ── */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-white/40 dark:bg-slate-900/35 backdrop-blur-xl p-3.5 rounded-[24px] border border-white/60 dark:border-white/10 shadow-lg relative z-10">

            {/* Global Search */}
            <div className="relative w-full lg:w-[350px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search JDs by title, keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-full text-sm outline-none focus:border-blue-500 dark:focus:border-blue-500/50 dark:text-white transition-all placeholder:text-slate-400 shadow-inner"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-3 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0 scrollbar-hide">
              {isAdmin && (
                <div className="relative flex-shrink-0">
                  <select
                    value={activeTab}
                    onChange={(e) => setActiveTab(e.target.value)}
                    className="appearance-none bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-700 dark:text-slate-200 py-2.5 pl-5 pr-11 rounded-full outline-none focus:border-blue-500 dark:focus:border-blue-500/50 cursor-pointer shadow-sm transition-all"
                  >
                    <option value="all" className="dark:bg-slate-950">View: All Library</option>
                    <option value="mine" className="dark:bg-slate-950">View: My Creations</option>
                    <option value="others" className="dark:bg-slate-950">View: Other Users</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400 pointer-events-none" />
                </div>
              )}

              <div className="relative flex-shrink-0">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-700 dark:text-slate-200 py-2.5 pl-5 pr-11 rounded-full outline-none focus:border-blue-500 dark:focus:border-blue-500/50 cursor-pointer shadow-sm transition-all"
                >
                  <option value="All" className="dark:bg-slate-950">Status: All</option>
                  {statusOptions.filter(opt => opt.value !== 'All').map(opt => (
                    <option key={opt.value} value={opt.value} className="dark:bg-slate-950">{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400 pointer-events-none" />
              </div>

              <div className="relative flex-shrink-0">
                <select
                  value={industryFilter}
                  onChange={(e) => setIndustryFilter(e.target.value)}
                  className="appearance-none bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-700 dark:text-slate-200 py-2.5 pl-5 pr-11 rounded-full outline-none focus:border-blue-500 dark:focus:border-blue-500/50 cursor-pointer shadow-sm transition-all"
                >
                  <option value="All" className="dark:bg-slate-950">Industry: All</option>
                  {industryOptions.filter(opt => opt.value !== 'All').map(opt => (
                    <option key={opt.value} value={opt.value} className="dark:bg-slate-950">{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400 pointer-events-none" />
              </div>

              <div className="relative flex-shrink-0">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-700 dark:text-slate-200 py-2.5 pl-5 pr-11 rounded-full outline-none focus:border-blue-500 dark:focus:border-blue-500/50 cursor-pointer shadow-sm transition-all"
                >
                  <option value="newest" className="dark:bg-slate-950">Sort: Newest</option>
                  <option value="oldest" className="dark:bg-slate-950">Sort: Oldest</option>
                  <option value="name" className="dark:bg-slate-950">Sort: Name A-Z</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400 pointer-events-none" />
              </div>

              {(statusFilter !== 'All' || industryFilter !== 'All' || searchQuery || modeFilter !== 'all') && (
                <button
                  onClick={() => { setStatusFilter('All'); setIndustryFilter('All'); setSearchQuery(''); setModeFilter('all'); }}
                  className="px-5 py-2.5 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-full transition-colors whitespace-nowrap shadow-sm"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* ── MAIN CONTENT AREA ── */}
          <div className="w-full">

            {/* ── TOP TOOLBAR ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 bg-white/30 dark:bg-slate-900/30 backdrop-blur-md rounded-xl border border-white/30 dark:border-white/5 px-4 py-2.5 shadow-sm relative z-10">

              {/* Left: results + page + select all */}
              <div className="flex items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {filteredJDs.length} {filteredJDs.length === 1 ? 'result' : 'results'}
                  </span>
                  {filteredJDs.length > ITEMS_PER_PAGE && (
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                      (Page {currentPage} of {totalPages})
                    </span>
                  )}
                </div>

                {filteredJDs.length > 0 && (
                  <>
                    <div className="mx-4 w-px h-4 bg-slate-200 dark:bg-white/10" />
                    <button
                      onClick={selectAll}
                      className="flex items-center gap-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-indigo-400 transition-all duration-200 active:scale-95 group"
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200 ${selectedJDs.length === filteredJDs.length && filteredJDs.length > 0
                        ? 'bg-blue-600 border-blue-600 shadow-sm shadow-blue-500/40'
                        : 'bg-white dark:bg-white/5 border-slate-300 dark:border-white/20 group-hover:border-blue-400'
                        }`}>
                        {selectedJDs.length === filteredJDs.length && filteredJDs.length > 0 && (
                          <Check className="w-2.5 h-2.5 text-white" />
                        )}
                      </div>
                      Select All
                      {selectedJDs.length > 0 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 bg-blue-100 dark:bg-indigo-500/20 text-blue-700 dark:text-indigo-400 text-[10px] font-bold rounded-md">
                          {selectedJDs.length} selected
                        </span>
                      )}
                    </button>
                  </>
                )}
              </div>

              {/* Right: Generation Mode Toggle Buttons (All, Manual, AI, Template) */}
              <div className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200/60 dark:border-white/10">
                {[
                  { id: 'all', label: 'All', icon: List },
                  { id: 'manual', label: 'Manual', icon: FileText },
                  { id: 'ai', label: 'AI', icon: Sparkles },
                  { id: 'import', label: 'Import', icon: Upload },
                  { id: 'template', label: 'Template', icon: LayoutGrid }
                ].map(({ id, label, icon: Icon }) => {
                  const isActive = modeFilter === id;
                  const count = modeCounts[id] || 0;
                  return (
                    <button
                      key={id}
                      onClick={() => setModeFilter(id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10'
                      }`}
                      title={isActive ? `Showing all ${label} JDs` : `Filter by ${label}`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-400'}`} />
                      <span>{label}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* JD Grid / Empty */}
            {filteredJDs.length === 0 ? (
              <EmptyState onCreate={() => navigate(`/${base}/generate`)} isManager={isManager} />
            ) : (
              <GridView jds={paginatedJDs} isManager={isManager} selectedJDs={selectedJDs} onToggleSelect={toggleSelection} onEdit={handleEdit} onCopy={handleCopy} onDownload={handleDownload} onPDF={handlePDF} onPush={handlePush} onAssign={(jd) => { setSelectedJDForAssign(jd); setShowAssignModal(true); }} onSubmit={handleSubmit} onDelete={handleDelete} onArchive={handleArchive} copiedId={copiedId} isHR={isHR} isAdmin={isAdmin} />
            )}

            {/* Bottom bar: Select All + Pagination */}
            {filteredJDs.length > 0 && (
              <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-200 dark:border-white/5">

                {/* Select All */}
                <button
                  onClick={selectAll}
                  className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-indigo-400 transition-colors"
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${selectedJDs.length === filteredJDs.length && filteredJDs.length > 0 ? 'bg-blue-600 border-blue-600' : 'bg-white dark:bg-white/5 border-slate-300 dark:border-white/20'}`}>
                    {selectedJDs.length === filteredJDs.length && filteredJDs.length > 0 && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  {selectedJDs.length === filteredJDs.length && filteredJDs.length > 0 ? 'Deselect All' : 'Select All'}
                  {selectedJDs.length > 0 && (
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-indigo-500/20 text-blue-700 dark:text-indigo-400 text-xs font-bold rounded-full">
                      {selectedJDs.length} selected
                    </span>
                  )}
                </button>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm"
                    >
                      &lsaquo;
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .reduce((acc, p, idx, arr) => {
                        if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, idx) =>
                        p === '...' ? (
                          <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-slate-400 text-sm">&#8230;</span>
                        ) : (
                          <button
                            key={p}
                            onClick={() => setCurrentPage(p)}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition-all ${currentPage === p
                              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                              : 'border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
                              }`}
                          >
                            {p}
                          </button>
                        )
                      )
                    }
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm"
                    >
                      &rsaquo;
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FLOATING BULK ACTION BAR */}
      {selectedJDs.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-6 duration-300">
          <div className="bg-white dark:bg-[#1e293b] text-[#0F172A] dark:text-white px-5 py-3 rounded-[16px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 dark:border-white/10 flex items-center gap-5 backdrop-blur-xl">
            <div className="flex items-center gap-3 pr-5 border-r border-slate-200 dark:border-white/10">
              <div className="w-8 h-8 bg-[#2563EB] text-white rounded-[8px] flex items-center justify-center">
                <Check className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm leading-none">{selectedJDs.length}</span>
                <span className="text-[10px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide mt-0.5">Selected</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Conditional Action: Submit for HR (if finalized), Push for Admin, None for Manager */}
              {isHR ? (
                <>
                  <button
                    onClick={() => handleBulkSubmit(selectedJDs)}
                    disabled={!selectedJDObjects.some(jd => jd.status === 'finalized' || jd.status === 'final')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-[8px] transition-all ${selectedJDObjects.some(jd => jd.status === 'finalized' || jd.status === 'final')
                      ? "bg-[#2563EB] hover:bg-blue-700 text-white shadow-sm"
                      : "bg-slate-100 dark:bg-white/5 text-slate-400 cursor-not-allowed"
                      }`}
                  >
                    <Send className="w-4 h-4" />
                    {selectedJDObjects.filter(jd => jd.status === 'finalized' || jd.status === 'final').length > 0
                      ? `Send ${selectedJDObjects.filter(jd => jd.status === 'finalized' || jd.status === 'final').length} for Review`
                      : "Send for Review"
                    }
                  </button>
                  <button
                    onClick={() => handleBulkPublish(selectedJDObjects)}
                    disabled={unpublishedApprovedJDs.length === 0}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-[8px] transition-all ${unpublishedApprovedJDs.length > 0
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                      : "bg-slate-100 dark:bg-white/5 text-slate-400 cursor-not-allowed"
                      }`}
                  >
                    <Zap className="w-4 h-4" />
                    {unpublishedApprovedJDs.length > 0
                      ? `Publish ${unpublishedApprovedJDs.length} JD`
                      : "Publish JD"
                    }
                  </button>
                </>
              ) : isAdmin ? (
                <>
                  {selectedJDObjects.some(jd => jd.status === 'finalized' || jd.status === 'final') && (
                    <button
                      onClick={() => handleBulkSubmit(selectedJDs)}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-[8px] transition-all bg-[#2563EB] hover:bg-blue-700 text-white shadow-sm"
                    >
                      <Send className="w-4 h-4" />
                      Submit {selectedJDObjects.filter(jd => jd.status === 'finalized' || jd.status === 'final').length} for Review
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const approvedJDs = selectedJDObjects.filter(jd => jd.status === 'approved');
                      handlePush(approvedJDs);
                    }}
                    disabled={!selectedJDObjects.some(jd => jd.status === 'approved')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-[8px] transition-all ${selectedJDObjects.some(jd => jd.status === 'approved')
                      ? "bg-[#2563EB] hover:bg-blue-700 text-white shadow-sm"
                      : "bg-slate-100 dark:bg-white/5 text-slate-400 cursor-not-allowed"
                      }`}
                  >
                    <Upload className="w-4 h-4" />
                    {selectedJDObjects.filter(jd => jd.status === 'approved').length > 0
                      ? `Push ${selectedJDObjects.filter(jd => jd.status === 'approved').length} to CSOD`
                      : "Push to CSOD"
                    }
                  </button>
                  <button
                    onClick={() => handleBulkPublish(selectedJDObjects)}
                    disabled={unpublishedApprovedJDs.length === 0}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-[8px] transition-all ${unpublishedApprovedJDs.length > 0
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                      : "bg-slate-100 dark:bg-white/5 text-slate-400 cursor-not-allowed"
                      }`}
                  >
                    <Zap className="w-4 h-4" />
                    {unpublishedApprovedJDs.length > 0
                      ? `Publish ${unpublishedApprovedJDs.length} JD`
                      : "Publish JD"
                    }
                  </button>
                </>
              ) : null}

              {/* Export */}
              <button
                onClick={() => {
                  selectedJDObjects.forEach(jd => {
                    const text = formatJDText(jd.content);
                    const blob = new Blob([text], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${jd.title.replace(/\s+/g, "-").toLowerCase()}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                  });
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-[8px] text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>

              {/* Delete */}
              <button
                onClick={() => {
                  if (!selectedJDObjects.some(jd => {
                    const status = (jd.status || '').toLowerCase();
                    return status === 'in_review' || status === 'under_review' || status === 'submitted' || status === 'pending' || status.startsWith('review step');
                  })) {
                    setShowDeleteConfirm(true);
                  }
                }}
                disabled={selectedJDObjects.some(jd => {
                  const status = (jd.status || '').toLowerCase();
                  return status === 'in_review' || status === 'under_review' || status === 'submitted' || status === 'pending' || status.startsWith('review step');
                })}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-[8px] transition-all ${selectedJDObjects.some(jd => {
                  const status = (jd.status || '').toLowerCase();
                  return status === 'in_review' || status === 'under_review' || status === 'submitted' || status === 'pending' || status.startsWith('review step');
                })
                    ? "opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-600"
                    : "text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                  }`}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>

              <div className="w-px h-5 bg-slate-200 dark:bg-white/10 mx-2" />

              {/* Clear */}
              <button
                onClick={clearSelection}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 rounded-[6px] transition-colors"
                title="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[40] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-[#020617]/80 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl p-6 max-w-md w-full animate-in zoom-in-95 duration-200 border border-transparent dark:border-white/10">
            <div className="flex items-center gap-3 mb-4 text-red-600">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Delete {selectedJDs.length} JDs?</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              This action cannot be undone. These job descriptions will be permanently removed from your account.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 border-2 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:border-slate-300 dark:hover:border-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={(e) => handleDelete(selectedJDs, e)}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      <WorkflowModal
        isOpen={showWorkflowModal}
        onClose={() => setShowWorkflowModal(false)}
        onConfirm={handleConfirmWorkflow}
        workflows={workflows}
        targetDepartment={targetDepartment}
      />

      {/* Assign JD Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-[40] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-[#020617]/80 backdrop-blur-sm" onClick={() => !isAssigning && setShowAssignModal(false)} />
          <div className="relative bg-white dark:bg-[#0f172a] rounded-[2.5rem] border border-slate-200 dark:border-white/10 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300 z-10 overflow-visible text-left">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />

            <div className="relative z-10">
              <div className="px-8 pt-8 pb-6 border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shadow-inner">
                      <Plus className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Assign JD to User</h3>
                      <p className="text-xs text-slate-500 font-medium">Link this JD to a candidate</p>
                    </div>
                  </div>
                  <button onClick={() => setShowAssignModal(false)} className="p-2 h-10 w-10 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all outline-none focus:ring-2 focus:ring-indigo-500/20"><X className="w-5 h-5" /></button>
                </div>
              </div>

              <div className="p-8 pb-4">
                <div className="bg-slate-50 dark:bg-white/[0.02] p-4 rounded-2xl border border-slate-200 dark:border-white/5 mb-6">
                  <p className="text-xs text-slate-400 uppercase font-black tracking-widest mb-1">Selected JD</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{selectedJDForAssign?.title}</p>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleAssignJD(selectedCandidateEmails, e.target.due_date.value);
                }}>
                  <div className="space-y-6 mb-8">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2.5">Candidate Email</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowUserSelectionPanel(true)}
                          className="w-full pl-4 pr-4 py-3.5 bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold outline-none hover:border-indigo-500 transition-all text-slate-900 dark:text-white flex items-center justify-between"
                        >
                          {selectedCandidateEmails.length > 0 ? (
                            <span>{selectedCandidateEmails.length} User(s) selected</span>
                          ) : (
                            <span className="text-slate-400">{isLoadingCandidates ? "Loading users..." : "Select users or groups..."}</span>
                          )}
                          <User className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2.5">Due Date</label>
                      <div className="relative">
                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          required
                          name="due_date"
                          type="date"
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 dark:text-white font-sans"
                        />
                      </div>
                      <p className="mt-2 text-[10px] text-slate-400 font-medium tracking-tight">The candidate will be linked to this JD via their email address.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setShowAssignModal(false)}
                      disabled={isAssigning}
                      className="flex-1 py-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 font-bold text-sm rounded-[1.5rem] hover:bg-slate-100 transition-all disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isAssigning}
                      className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-[1.5rem] flex items-center justify-center gap-2 transition-all shadow-xl shadow-indigo-500/30 active:scale-[0.98] disabled:opacity-50"
                    >
                      {isAssigning ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          ASSIGNING...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          ASSIGN JD
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      <UserSelectionPanel
        isOpen={showUserSelectionPanel}
        onClose={() => setShowUserSelectionPanel(false)}
        users={candidateUsers}
        initialSelectedEmails={selectedCandidateEmails}
        onConfirm={(emails) => {
          setSelectedCandidateEmails(emails);
          setShowUserSelectionPanel(false);
        }}
        conflictValues={alreadyAssignedEmails}
      />
    </div>
  );
}

// Accordion sidebar section — animated open/close
function SidebarSection({ title, children, defaultOpen = true, activeLabel = null }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="border-t border-slate-100 dark:border-white/5">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5 transition-all duration-150 active:scale-[0.98] group select-none"
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors duration-150">{title}</span>
          {activeLabel && (
            <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 text-[9px] font-black rounded truncate max-w-[70px] animate-in fade-in duration-150">
              {activeLabel}
            </span>
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-all duration-200 ${open ? 'rotate-180' : 'rotate-0'}`} />
      </button>
      {/* Animated content panel */}
      <div
        className="overflow-hidden transition-all duration-250 ease-in-out"
        style={{ maxHeight: open ? '1500px' : '0px', opacity: open ? 1 : 0 }}
      >
        <div className="px-2 pb-2 space-y-0.5">
          {children}
        </div>
      </div>
    </div>
  );
}

// Stat Card (kept for backward compat, not used in header anymore)
function StatCard({ label, value, icon: Icon, color }) {
  const colors = {
    blue: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400",
    amber: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400",
    emerald: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    slate: "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400"
  };

  return (
    <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-xl p-4 flex items-center gap-3 hover:shadow-md dark:hover:border-white/20 transition-all hover:-translate-y-0.5 group">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]} dark:bg-opacity-20 group-hover:scale-110 transition-transform`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

// Empty State
function EmptyState({ onCreate, isManager }) {
  return (
    <div className="text-center py-20">
      <div className="w-24 h-24 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
        <FileText className="w-12 h-12 text-slate-400 dark:text-slate-600" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No job descriptions yet</h3>
      <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
        {isManager
          ? "There are no job descriptions available in your library yet."
          : "Create your first job description to get started with AI-powered generation."
        }
      </p>
      {!isManager && (
        <button
          onClick={onCreate}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 dark:bg-indigo-600 hover:bg-blue-700 dark:hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 dark:shadow-indigo-500/25 transition-all hover:-translate-y-0.5"
        >
          <Sparkles className="w-5 h-5" />
          Create Your First JD
        </button>
      )}
    </div>
  );
}

// Premium 3-Column Grid View
function GridView({ jds, selectedJDs, onToggleSelect, onEdit, onCopy, onDownload, onPDF, onPush, onAssign, onSubmit, onDelete, onArchive, copiedId, isHR, isAdmin, isManager }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {jds.map((jd) => (
        <JDCard
          key={jd.id}
          jd={jd}
          isManager={isManager}
          isSelected={selectedJDs.includes(jd.id)}
          onToggleSelect={() => onToggleSelect(jd.id)}
          onEdit={() => onEdit(jd)}
          onCopy={(e) => onCopy(jd, e)}
          onDownload={(e) => onDownload(jd, e)}
          onPDF={(e) => onPDF(jd, e)}
          onPush={(e) => onPush(jd, e)}
          onAssign={() => onAssign(jd)}
          onSubmit={() => onSubmit(jd.id)}
          onDelete={(e) => onDelete(jd.id, e)}
          onArchive={(e) => onArchive(jd, e)}
          isCopied={copiedId === jd.id}
          isHR={isHR}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  );
}

// JD Card with Individual Delete
function JDCard({ jd, isSelected, onToggleSelect, onEdit, onCopy, onDownload, onPDF, onPush, onAssign, onSubmit, onDelete, onArchive, isCopied, isHR, isAdmin, isManager }) {
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuRef = useRef(null);

  const isJdLive = ['published', 'public_view'].includes(jd.status?.toLowerCase()) || !!jd.public_jd_id || !!jd.content?.public_jd_id || !!jd.content?.metadata?.public_jd_id;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const statusConfig = {
    draft: {
      bg: "bg-[#F59E0B]/10 dark:bg-amber-500/10",
      border: "border-[#F59E0B]/20 dark:border-amber-500/20",
      text: "text-[#F59E0B] dark:text-amber-400",
      icon: FileText,
      cardBg: "bg-gradient-to-br from-amber-500/[0.08] to-[#fffdf2]/98 dark:from-amber-500/[0.12] dark:to-[#120f0b]/98",
      cardBorder: "border-amber-500/35 hover:border-amber-500/70 dark:border-amber-500/40 dark:hover:border-amber-500/75",
      shadow: "shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_12px_24px_-8px_rgba(245,158,11,0.12)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_20px_40px_-12px_rgba(245,158,11,0.3)]",
      hoverShadow: "hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_20px_35px_-8px_rgba(245,158,11,0.2)] dark:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_25px_50px_-10px_rgba(245,158,11,0.45)]"
    },
    finalized: {
      bg: "bg-orange-500/10 dark:bg-orange-500/10",
      border: "border-orange-500/20 dark:border-orange-500/20",
      text: "text-orange-600 dark:text-orange-400",
      icon: CheckCircle2,
      cardBg: "bg-gradient-to-br from-orange-500/[0.08] to-[#fffaf5]/98 dark:from-orange-500/[0.12] dark:to-[#120e0b]/98",
      cardBorder: "border-orange-500/35 hover:border-orange-500/70 dark:border-orange-500/40 dark:hover:border-orange-500/75",
      shadow: "shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_12px_24px_-8px_rgba(249,115,22,0.12)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_20px_40px_-12px_rgba(249,115,22,0.3)]",
      hoverShadow: "hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_20px_35px_-8px_rgba(249,115,22,0.2)] dark:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_25px_50px_-10px_rgba(249,115,22,0.45)]"
    },
    submitted: {
      bg: "bg-[#8B5CF6]/10 dark:bg-purple-500/10",
      border: "border-[#8B5CF6]/20 dark:border-purple-500/20",
      text: "text-[#8B5CF6] dark:text-purple-400",
      icon: Clock,
      cardBg: "bg-gradient-to-br from-purple-500/[0.08] to-[#faf8ff]/98 dark:from-purple-500/[0.12] dark:to-[#0f0b14]/98",
      cardBorder: "border-purple-500/35 hover:border-purple-500/70 dark:border-purple-500/40 dark:hover:border-purple-500/75",
      shadow: "shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_12px_24px_-8px_rgba(139,92,246,0.12)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_20px_40px_-12px_rgba(139,92,246,0.3)]",
      hoverShadow: "hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_20px_35px_-8px_rgba(139,92,246,0.2)] dark:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_25px_50px_-10px_rgba(139,92,246,0.45)]"
    },
    in_review: {
      bg: "bg-[#8B5CF6]/10 dark:bg-purple-500/10",
      border: "border-[#8B5CF6]/20 dark:border-purple-500/20",
      text: "text-[#8B5CF6] dark:text-purple-400",
      icon: Clock,
      cardBg: "bg-gradient-to-br from-purple-500/[0.08] to-[#faf8ff]/98 dark:from-purple-500/[0.12] dark:to-[#0f0b14]/98",
      cardBorder: "border-purple-500/35 hover:border-purple-500/70 dark:border-purple-500/40 dark:hover:border-purple-500/75",
      shadow: "shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_12px_24px_-8px_rgba(139,92,246,0.12)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_20px_40px_-12px_rgba(139,92,246,0.3)]",
      hoverShadow: "hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_20px_35px_-8px_rgba(139,92,246,0.2)] dark:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_25px_50px_-10px_rgba(139,92,246,0.45)]"
    },
    under_review: {
      bg: "bg-[#8B5CF6]/10 dark:bg-purple-500/10",
      border: "border-[#8B5CF6]/20 dark:border-purple-500/20",
      text: "text-[#8B5CF6] dark:text-purple-400",
      icon: Clock,
      cardBg: "bg-gradient-to-br from-purple-500/[0.08] to-[#faf8ff]/98 dark:from-purple-500/[0.12] dark:to-[#0f0b14]/98",
      cardBorder: "border-purple-500/35 hover:border-purple-500/70 dark:border-purple-500/40 dark:hover:border-purple-500/75",
      shadow: "shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_12px_24px_-8px_rgba(139,92,246,0.12)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_20px_40px_-12px_rgba(139,92,246,0.3)]",
      hoverShadow: "hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_20px_35px_-8px_rgba(139,92,246,0.2)] dark:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_25px_50px_-10px_rgba(139,92,246,0.45)]"
    },
    rejected: {
      bg: "bg-[#EF4444]/10 dark:bg-red-500/10",
      border: "border-[#EF4444]/20 dark:border-red-500/20",
      text: "text-[#EF4444] dark:text-red-400",
      icon: AlertCircle,
      cardBg: "bg-gradient-to-br from-red-500/[0.08] to-[#fff5f5]/98 dark:from-red-500/[0.12] dark:to-[#140b0b]/98",
      cardBorder: "border-red-500/35 hover:border-red-500/70 dark:border-red-500/40 dark:hover:border-red-500/75",
      shadow: "shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_12px_24px_-8px_rgba(239,68,68,0.12)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_20px_40px_-12px_rgba(239,68,68,0.3)]",
      hoverShadow: "hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_20px_35px_-8px_rgba(239,68,68,0.2)] dark:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_25px_50px_-10px_rgba(239,68,68,0.45)]"
    },
    declined: {
      bg: "bg-[#EF4444]/10 dark:bg-red-500/10",
      border: "border-[#EF4444]/20 dark:border-red-500/20",
      text: "text-[#EF4444] dark:text-red-400",
      icon: AlertCircle,
      cardBg: "bg-gradient-to-br from-red-500/[0.08] to-[#fff5f5]/98 dark:from-red-500/[0.12] dark:to-[#140b0b]/98",
      cardBorder: "border-red-500/35 hover:border-red-500/70 dark:border-red-500/40 dark:hover:border-red-500/75",
      shadow: "shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_12px_24px_-8px_rgba(239,68,68,0.12)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_20px_40px_-12px_rgba(239,68,68,0.3)]",
      hoverShadow: "hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_20px_35px_-8px_rgba(239,68,68,0.2)] dark:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_25px_50px_-10px_rgba(239,68,68,0.45)]"
    },
    approved: {
      bg: "bg-[#22C55E]/10 dark:bg-green-500/10",
      border: "border-[#22C55E]/20 dark:border-green-500/20",
      text: "text-[#22C55E] dark:text-green-400",
      icon: CheckCircle2,
      cardBg: "bg-gradient-to-br from-green-500/[0.08] to-[#f5fcf7]/98 dark:from-green-500/[0.12] dark:to-[#0b140e]/98",
      cardBorder: "border-green-500/35 hover:border-green-500/70 dark:border-green-500/40 dark:hover:border-green-500/75",
      shadow: "shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_12px_24px_-8px_rgba(34,197,94,0.12)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_20px_40px_-12px_rgba(34,197,94,0.3)]",
      hoverShadow: "hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_20px_35px_-8px_rgba(34,197,94,0.2)] dark:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_25px_50px_-10px_rgba(34,197,94,0.45)]"
    },
    final: {
      bg: "bg-teal-500/10 dark:bg-teal-500/10",
      border: "border-teal-500/20 dark:border-teal-500/20",
      text: "text-teal-600 dark:text-teal-400",
      icon: CheckCircle2,
      cardBg: "bg-gradient-to-br from-teal-500/[0.08] to-[#f5fdfc]/98 dark:from-teal-500/[0.12] dark:to-[#0b1211]/98",
      cardBorder: "border-teal-500/35 hover:border-teal-500/70 dark:border-teal-500/40 dark:hover:border-teal-500/75",
      shadow: "shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_12px_24px_-8px_rgba(20,184,166,0.12)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_20px_40px_-12px_rgba(20,184,166,0.3)]",
      hoverShadow: "hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_20px_35px_-8px_rgba(20,184,166,0.2)] dark:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_25px_50px_-10px_rgba(20,184,166,0.45)]"
    },
    pushed: {
      bg: "bg-blue-500/10 dark:bg-blue-500/10",
      border: "border-blue-500/20 dark:border-blue-500/20",
      text: "text-blue-600 dark:text-blue-400",
      icon: Upload,
      cardBg: "bg-gradient-to-br from-blue-500/[0.08] to-[#f5f9ff]/98 dark:from-blue-500/[0.12] dark:to-[#0b0e14]/98",
      cardBorder: "border-blue-500/35 hover:border-blue-500/70 dark:border-blue-500/40 dark:hover:border-blue-500/75",
      shadow: "shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_12px_24px_-8px_rgba(37,99,235,0.12)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_20px_40px_-12px_rgba(37,99,235,0.3)]",
      hoverShadow: "hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_20px_35px_-8px_rgba(37,99,235,0.2)] dark:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_25px_50px_-10px_rgba(37,99,235,0.45)]"
    },
    public_view: {
      bg: "bg-blue-500/10 dark:bg-blue-500/10",
      border: "border-blue-500/20 dark:border-blue-500/20",
      text: "text-blue-600 dark:text-blue-400",
      icon: Zap,
      cardBg: "bg-gradient-to-br from-blue-500/[0.08] to-[#f5f9ff]/98 dark:from-blue-500/[0.12] dark:to-[#0b0e14]/98",
      cardBorder: "border-blue-500/35 hover:border-blue-500/70 dark:border-blue-500/40 dark:hover:border-blue-500/75",
      shadow: "shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_12px_24px_-8px_rgba(37,99,235,0.12)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_20px_40px_-12px_rgba(37,99,235,0.3)]",
      hoverShadow: "hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_20px_35px_-8px_rgba(37,99,235,0.2)] dark:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_25px_50px_-10px_rgba(37,99,235,0.45)]"
    },
    published: {
      bg: "bg-blue-500/10 dark:bg-blue-500/10",
      border: "border-blue-500/20 dark:border-blue-500/20",
      text: "text-blue-600 dark:text-blue-400",
      icon: Zap,
      cardBg: "bg-gradient-to-br from-blue-500/[0.08] to-[#f5f9ff]/98 dark:from-blue-500/[0.12] dark:to-[#0b0e14]/98",
      cardBorder: "border-blue-500/35 hover:border-blue-500/70 dark:border-blue-500/40 dark:hover:border-blue-500/75",
      shadow: "shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_12px_24px_-8px_rgba(37,99,235,0.12)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_20px_40px_-12px_rgba(37,99,235,0.3)]",
      hoverShadow: "hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_20px_35px_-8px_rgba(37,99,235,0.2)] dark:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_25px_50px_-10px_rgba(37,99,235,0.45)]"
    },
    archived: {
      bg: "bg-slate-500/10 dark:bg-slate-500/10",
      border: "border-slate-500/20 dark:border-slate-500/20",
      text: "text-slate-600 dark:text-slate-400",
      icon: Archive,
      cardBg: "bg-gradient-to-br from-slate-500/[0.08] to-[#f8fafc]/98 dark:from-slate-500/[0.12] dark:to-[#0f1115]/98",
      cardBorder: "border-slate-300 dark:border-slate-700/50 hover:border-slate-450 dark:hover:border-slate-600",
      shadow: "shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_12px_30px_-10px_rgba(100,116,139,0.05)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_15px_35px_-12px_rgba(0,0,0,0.4)]",
      hoverShadow: "hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_20px_40px_-10px_rgba(100,116,139,0.10)] dark:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_25px_50px_-10px_rgba(0,0,0,0.45)]"
    }
  };

  const config = statusConfig[jd.status] || statusConfig.draft;
  const StatusIcon = config.icon;

  return (
    <>
      <div
        className={`
          group relative ${config.cardBg} backdrop-blur-xl rounded-[28px] overflow-visible transition-all duration-300 flex flex-col justify-between h-full
          ${isSelected
            ? "shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_8px_32px_0_rgba(37,99,235,0.25)] border-2 border-blue-500/80 dark:border-blue-500"
            : `border ${config.cardBorder} ${config.shadow} ${config.hoverShadow} hover:-translate-y-1`
          }
        `}
      >
        {/* Top Header Row */}
        <div className="flex items-start justify-between p-6 pb-4 relative z-20">
          <div className="flex items-start gap-3">
            {/* Checkbox */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect();
              }}
              className={`
                w-5 h-5 rounded-[6px] border-[1.5px] flex items-center justify-center transition-colors flex-shrink-0 mt-1
                ${isSelected ? "bg-[#2563EB] border-[#2563EB]" : "bg-white/50 dark:bg-[#0f172a]/50 border-slate-300 dark:border-white/20 group-hover:border-slate-400"}
              `}
            >
              {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 bg-white/50 dark:bg-black/20 backdrop-blur-md border ${config.border} rounded-full text-xs font-semibold ${config.text}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {jd.status.charAt(0).toUpperCase() + jd.status.slice(1)}
              </span>
              {(() => {
                const mode = getJDMode(jd);
                const isManual = mode === 'manual';
                const isImport = mode === 'import';
                const isTemplate = mode === 'template';
                const modeLabel = isManual ? 'Manual' : (isImport ? 'Import' : (isTemplate ? 'Template' : 'AI'));
                const modeBadgeClass = isManual
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                  : isImport
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-600 dark:text-cyan-400'
                    : isTemplate
                      ? 'bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400'
                      : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400';
                return (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 backdrop-blur-md border rounded-full text-xs font-semibold ${modeBadgeClass}`}>
                    {modeLabel}
                  </span>
                );
              })()}
              {isJdLive && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-semibold">
                  <Zap className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                  Live
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 transition-opacity duration-300 bg-white/50 dark:bg-slate-950/50 backdrop-blur-md rounded-[12px] shadow-sm border border-white/40 dark:border-white/10 p-1">
            {(isAdmin || isHR) ? (
              <>
                <button
                  onClick={() => navigate(isAdmin ? `/admin/view/${jd.id}` : `/hr/jd/${jd.id}`)}
                  className="p-1.5 text-slate-400 hover:text-[#2563EB] hover:bg-blue-50 dark:hover:bg-[#2563EB]/10 rounded-[8px] transition-colors"
                  title="View Details"
                >
                  <Eye className="w-4 h-4" />
                </button>
                {((jd.status || '').toLowerCase() === 'in_review' || (jd.status || '').toLowerCase() === 'submitted' || (jd.status || '').toLowerCase() === 'under_review' || (jd.status || '').toLowerCase().startsWith('review step') || (jd.status || '').toLowerCase() === 'pending') ? (
                  <div className="relative group/edit">
                    <button disabled className="p-1.5 text-slate-300 dark:text-slate-600 cursor-not-allowed rounded-[8px]">
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                ) : !(jd.status === 'approved' || jd.status === 'pushed') && (
                  <button
                    onClick={onEdit}
                    className="p-1.5 text-slate-400 hover:text-[#2563EB] hover:bg-blue-50 dark:hover:bg-[#2563EB]/10 rounded-[8px] transition-colors"
                    title="Edit JD"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
              </>
            ) : isManager ? (
              <button
                onClick={() => navigate(`/manager/review/${jd.id}`)}
                className="p-1.5 text-slate-400 hover:text-[#2563EB] hover:bg-blue-50 dark:hover:bg-[#2563EB]/10 rounded-[8px] transition-colors"
                title="View Full JD"
              >
                <Eye className="w-4 h-4" />
              </button>
            ) : null}

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 rounded-[8px] transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1e293b] rounded-xl shadow-xl border border-slate-200 dark:border-white/10 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                  <button onClick={onCopy} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left">
                    {isCopied ? (
                      <>
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-green-600 font-medium">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        Copy to Clipboard
                      </>
                    )}
                  </button>

                  <button onClick={onDownload} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left">
                    <Download className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    Download TXT
                  </button>

                  <button onClick={onPDF} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-blue-700 dark:text-indigo-400 hover:bg-blue-50 dark:hover:bg-indigo-500/10 transition-colors text-left font-medium">
                    <Download className="w-4 h-4 text-blue-500 dark:text-indigo-400" />
                    Download PDF
                  </button>

                  <div className="border-t border-slate-100 dark:border-white/5" />

                  {isAdmin && jd.status === 'approved' && !jd.allotted_to ? (
                    <button onClick={onPush} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors text-left font-medium">
                      <Upload className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                      Push to CSOD
                    </button>
                  ) : null}

                  {jd.status !== 'draft' && jd.status !== 'in_review' && jd.status !== 'archived' && jd.status !== 'archive' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onArchive(e);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left"
                    >
                      <Archive className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      Add to Archive
                    </button>
                  )}

                  {jd.status !== 'approved' && jd.status !== 'in_review' && (
                    <>
                      <div className="border-t border-slate-100 dark:border-white/5" />

                      <button
                        onClick={() => {
                          setShowMenu(false);
                          setShowDeleteConfirm(true);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="px-6 pb-6 relative z-10 flex flex-col flex-grow justify-between">
          <div className="flex-grow">
            <div className="flex gap-2 mb-3">
              <span className="text-[11px] font-bold tracking-wide text-[#64748B] dark:text-slate-400 uppercase">{jd.industry || jd.content?.industry || 'General'}</span>
              <span className="text-[#E2E8F0] dark:text-slate-600">•</span>
              <span className="text-[11px] font-bold tracking-wide text-[#2563EB] dark:text-blue-400 uppercase">{jd.seniority || jd.content?.seniority || 'Mid Level'}</span>
            </div>

            <h3 className="font-bold text-[#0F172A] dark:text-white text-xl mb-3 line-clamp-2 leading-snug group-hover:text-[#2563EB] dark:group-hover:text-blue-400 transition-colors">
              {jd.title}
            </h3>

            {/* Description */}
            <p className="text-sm text-[#64748B] dark:text-slate-400 line-clamp-2 mb-6 leading-relaxed">
              {typeof jd.content?.summary === 'string' ? jd.content.summary.replace(/\[\[.*?\]\]/g, '') : (jd.content?.summary || "No description provided.")}
            </p>
          </div>

          <div>
            <div className="w-full h-px bg-slate-200/80 dark:bg-white/10 mb-6" />

            {/* Footer Info Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-white dark:border-[#111827] shadow-sm bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-xs uppercase">
                  {(jd.creator_name || "Admin").charAt(0)}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#0F172A] dark:text-white leading-none">Created by {jd.creator_name || "Admin"}</span>
                  <span className="text-[10px] font-medium text-[#64748B] dark:text-slate-400 mt-1">
                    {(() => {
                      const d = new Date(jd.updated_at || jd.updatedAt || jd.created_at || jd.createdAt || jd.timestamp || Date.now());
                      if (isNaN(d.getTime())) return "Recently updated";
                      return `Updated ${d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`;
                    })()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold text-[#64748B] dark:text-slate-400">
                <div className="flex flex-col items-end">
                  <span className="text-[#0F172A] dark:text-white text-sm">{(jd.content?.key_duties?.length || jd.content?.responsibilities?.length || 5)}</span>
                  <span className="text-[10px] uppercase tracking-wide">Tasks</span>
                </div>
                <div className="w-px h-6 bg-slate-200/50 dark:bg-white/10" />
                <div className="flex flex-col items-start">
                  <span className="text-[#0F172A] dark:text-white text-sm">{(jd.content?.qualifications_required?.length || jd.content?.qualifications?.required?.length || 3)}</span>
                  <span className="text-[10px] uppercase tracking-wide">Reqs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Individual Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[40] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4 text-red-600">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Delete JD?</h3>
            </div>
            <p className="text-slate-600 mb-6 text-sm">
              "{jd.title}" will be permanently deleted. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border-2 border-slate-200 text-slate-700 font-medium rounded-xl hover:border-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={(e) => {
                  onDelete(e);
                  setShowDeleteConfirm(false);
                }}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

