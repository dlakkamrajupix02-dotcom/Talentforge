import { JDContext } from '../../context/JDContext';
import { updateWordLimits } from '../../services/jdService';
import { BASE_URL } from '../../services/apiClient';
import * as organizationService from '../../services/organizationService';
import * as authService from '../../services/authService';
import * as termsService from '../../services/termsService';
import toast from 'react-hot-toast';
import {
  Settings as SettingsIcon, Database, Link as LinkIcon, Users,
  ShieldCheck, ShieldOff, FileText, Target, UploadCloud, Plus, ChevronRight, X, Mail, Clock, ArrowRight, Activity, Cpu, Shield, Zap, Check, CheckSquare, Search, FileUp, MoreHorizontal,
  Trash2, ChevronUp, ChevronDown, Pencil, UserPlus, Eye, EyeOff, Lock, Building2,
  Sparkles, Globe, Layers, Box, Workflow, ExternalLink, Image, Loader2, AlertTriangle, Briefcase, User, ScrollText, Save, RefreshCw, FolderGit2, Info, Download
} from 'lucide-react';
import React, { useContext, useEffect, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Pagination from '../../components/common/Pagination';
import UserSelectionPanel from '../../components/common/UserSelectionPanel';
import RichTextEditor from '../../components/common/RichTextEditor';
import TermsMarkdown from '../../components/common/TermsMarkdown';
import { termsPlainExcerpt } from '../../utils/markdownHtmlConverter';
import AdminConsoleHeaderScene from '../../components/common/AdminConsoleHeaderScene';

const tabs = [
  // { id: "Job Framework", icon: Database },
  { id: "Approval Workflows", icon: LinkIcon },
  { id: "Resource Guide", icon: Target },
  { id: "Team & Permissions", icon: Users },
  { id: "User Assign Groups", icon: FolderGit2 },
  { id: "Integrations", icon: Zap },
  { id: "Terms & Conditions", icon: ScrollText },
];

export default function Settings() {
   const location = useLocation();
   const navigate = useNavigate();
  const {
    departments, setDepartments,
    workflows, setWorkflows,
    teamMembers, setTeamMembers,
    createJDWorkflow, deleteJDWorkflow,
    refreshMembers, refreshWorkflows,
    user,
    createMember,
    isAuthenticated
  } = useContext(JDContext);

  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (!tab || tab === 'Job Framework' || !tabs.find((t) => t.id === tab)) {
      return 'Approval Workflows';
    }
    return tab;
  });

  useEffect(() => {
    refreshMembers();
    refreshWorkflows();
  }, []);

  useEffect(() => {
    const url = new URL(window.location);
    url.searchParams.set('tab', activeTab);
    window.history.replaceState({}, '', url);
  }, [activeTab]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && !tabs.find(t => t.id === tabParam)) {
      setActiveTab("Approval Workflows");
    }
  }, [tabs]);

  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);

  // Custom Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    title: "",
    message: "",
    onConfirm: () => { },
    confirmText: "Delete",
    variant: "danger" // "danger" or "primary"
  });

  const confirmAction = (config) => {
    setConfirmConfig({
      ...config,
      onConfirm: () => {
        config.onConfirm();
        setShowConfirmModal(false);
      }
    });
    setShowConfirmModal(true);
  };


  // --- Member Creation State ---
  const [showCreateMemberModal, setShowCreateMemberModal] = useState(false);
  const [showCreateEndUserModal, setShowCreateEndUserModal] = useState(false);
  const [showImportUsersModal, setShowImportUsersModal] = useState(false);
  const [importType, setImportType] = useState('regular'); // 'regular' or 'enduser'
  const [showImportInfo, setShowImportInfo] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [isUploadingUsers, setIsUploadingUsers] = useState(false);
  const [selectedImportFile, setSelectedImportFile] = useState(null);
  const [isCreatingMember, setIsCreatingMember] = useState(false);
  const [isCreatingEndUser, setIsCreatingEndUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showEndUserPassword, setShowEndUserPassword] = useState(false);
  const [memberForm, setMemberForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'Manager'
  });

  // --- Member Edit State ---
  const [showEditMemberModal, setShowEditMemberModal] = useState(false);
  const [updatingType, setUpdatingType] = useState(null); // 'profile', 'security', or null
  const [originalMemberName, setOriginalMemberName] = useState('');
  const [editForm, setEditForm] = useState({
    user_id: '',
    full_name: '',
    email: '',
    password: ''
  });

  // Ã¢â€â‚¬Ã¢â€â‚¬ Workflow Builder State Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const [workflowActive, setWorkflowActive] = useState(true);
  const [workflowSteps, setWorkflowSteps] = useState([
    { id: 1, name: "", reviewerEmail: "", role: "Manager", sla: 1, email: true, escalate: true, searchTerm: "" }
  ]);
  const addWorkflowStep = () => {
    if (workflowSteps.length >= 20) {
      toast.error("You have reached the maximum level of 20 approval workflows supported. To increase this limit further, please contact support@talentforge.com.");
      return;
    }
    setWorkflowSteps(prev => [...prev, { id: Date.now(), name: "", reviewerEmail: "", role: "Manager", sla: 1, email: true, escalate: true, searchTerm: "" }]);
  };

  // --- Brand Image Library State ---
  const [orgImages, setOrgImages] = useState([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isLoadingImages, setIsLoadingImages] = useState(false);

  useEffect(() => {
    if (activeTab === "Resource Guide") {
      fetchOrgImages();
    }
  }, [activeTab]);

  const fetchOrgImages = async () => {
    setIsLoadingImages(true);
    try {
      const response = await organizationService.listOrgImages();
      // Handle both raw array and object-wrapped responses (e.g. {images: [], total: 0})
      const imagesList = Array.isArray(response) ? response : (response?.images || response?.data || []);
      setOrgImages(Array.isArray(imagesList) ? imagesList : []);
    } catch (error) {
      console.error("Failed to fetch organization images:", error);
      toast.error("Could not load brand images.");
    } finally {
      setIsLoadingImages(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large. Max 5MB allowed.");
      e.target.value = '';
      return;
    }

    setIsUploadingImage(true);

    try {
      // Validate dimensions
      await new Promise((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => {
          if (img.width > 650 || img.height > 150) {
            reject(new Error("Image dimensions must be 650x150 pixels or smaller."));
          } else {
            resolve();
          }
        };
        img.onerror = () => reject(new Error("Invalid image file."));
        img.src = URL.createObjectURL(file);
      });
    } catch (err) {
      toast.error(err.message);
      setIsUploadingImage(false);
      e.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append("image", file);
    formData.append("label", file.name.split('.')[0]);

    try {
      await organizationService.uploadOrgImage(formData);
      toast.success("Brand image uploaded successfully!");
      fetchOrgImages();
    } catch (error) {
      console.error("Failed to upload image:", error);
      toast.error("Image upload failed.");
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleDeleteImage = async (imageId) => {
    confirmAction({
      title: "Delete Brand Image?",
      message: "This action will remove the selected image from your organizational library. This cannot be undone.",
      onConfirm: async () => {
        try {
          await organizationService.deleteOrgImage(imageId);
          toast.success("Image removed from library.");
          fetchOrgImages();
        } catch (error) {
          console.error("Failed to delete image:", error);
          toast.error("Failed to delete image.");
        }
      }
    });
  };
  const removeWorkflowStep = (id) => { if (workflowSteps.length > 1) setWorkflowSteps(prev => prev.filter(s => s.id !== id)); };
  const updateWorkflowStep = (id, field, value) => setWorkflowSteps(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  const moveWorkflowStep = (index, dir) => {
    const next = index + dir;
    if (next < 0 || next >= workflowSteps.length) return;
    const arr = [...workflowSteps];[arr[index], arr[next]] = [arr[next], arr[index]]; setWorkflowSteps(arr);
  };
  const totalSLA = workflowSteps.reduce((acc, s) => acc + s.sla, 0);
  const hasDuplicateReviewers = workflowSteps.some((step, index) =>
    step.reviewerEmail && workflowSteps.some((s, i) => i !== index && s.reviewerEmail === step.reviewerEmail)
  );

  /*
  // ── Job Framework Local Modal State ──
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deptForm, setDeptForm] = useState({ name: "", subtitle: "" });
  const [newFamilyInputs, setNewFamilyInputs] = useState({});
  const toggleDept = (id) => setDepartments(prev => prev.map(d => d.id === id ? { ...d, isOpen: !d.isOpen } : d));
  const deleteDept = (id) => {
    confirmAction({
      title: "Delete Department?",
      message: "Are you sure you want to delete this department and all its job families? This will affect JD generation taxonomy.",
      onConfirm: () => {
        setDepartments(prev => prev.filter(d => d.id !== id));
        toast.success("Department removed");
      }
    });
  };
  const openAddDept = () => { setEditingDept(null); setDeptForm({ name: "", subtitle: "" }); setShowDeptModal(true); };
  const openEditDept = (d) => { setEditingDept(d); setDeptForm({ name: d.name, subtitle: d.subtitle }); setShowDeptModal(true); };
  const saveDept = () => {
    if (!deptForm.name.trim()) return;
    if (editingDept) {
      setDepartments(prev => prev.map(d => d.id === editingDept.id ? { ...d, name: deptForm.name, subtitle: deptForm.subtitle.toUpperCase() } : d));
    } else {
      setDepartments(prev => [...prev, { id: Date.now(), name: deptForm.name, subtitle: deptForm.subtitle.toUpperCase(), families: [], isOpen: true }]);
    }
    setShowDeptModal(false); setDeptForm({ name: "", subtitle: "" }); setEditingDept(null);
  };
  const addFamily = (deptId) => {
    const val = (newFamilyInputs[deptId] || "").trim();
    if (!val) return;
    setDepartments(prev => prev.map(d => {
      if (d.id === deptId) {
        if (d.families.includes(val)) return d; // Prevent duplicates
        return { ...d, families: [...d.families, val] };
      }
      return d;
    }));
    setNewFamilyInputs(prev => ({ ...prev, [deptId]: "" }));
  };
  const removeFamily = (deptId, fam) => setDepartments(prev => prev.map(d => d.id === deptId ? { ...d, families: d.families.filter(f => f !== fam) } : d));

  const updateFamilyInline = (deptId, oldFam, newFam) => {
    if (!newFam.trim()) return;
    setDepartments(prev => prev.map(d => d.id === deptId ? { ...d, families: d.families.map(f => f === oldFam ? newFam.trim() : f) } : d));
  };
  */

  // Ã¢â€â‚¬Ã¢â€â‚¬ Style Guide State Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const [bannedWords, setBannedWords] = useState(['ninja', 'rockstar', 'unicorn', 'guru', 'superstar', 'killer']);
  const [newBannedWord, setNewBannedWord] = useState('');
  const [targetWordCount, setTargetWordCount] = useState({ min: 400, max: 700 });
  const [sectionWordLimits, setSectionWordLimits] = useState({
    summary: { min: 50, max: 150 },
    key_duties: { min: 50, max: 150 },
    core_competencies: { min: 50, max: 150 },
    functional_competencies: { min: 50, max: 150 },
    qualifications_required: { min: 50, max: 150 },
    qualifications_preferred: { min: 50, max: 150 },
    eeo_statement: { min: 50, max: 150 }
  });
  const [requiredSections, setRequiredSections] = useState([
    { id: 1, name: "Company Mission", enabled: true, icon: Target },
    { id: 2, name: "Role Purpose", enabled: true, icon: FileText },
    { id: 3, name: "Key Outcomes", enabled: true, icon: Sparkles },
    { id: 4, name: "Technical Skills", enabled: true, icon: Zap },
    { id: 5, name: "Behavioral Traits", enabled: false, icon: Users },
  ]);

  const toggleSection = (id) => setRequiredSections(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  const addBannedWord = () => { if (newBannedWord.trim()) { setBannedWords(prev => [...new Set([...prev, newBannedWord.trim().toLowerCase()])]); setNewBannedWord(''); } };
  const removeBannedWord = (word) => setBannedWords(prev => prev.filter(w => w !== word));
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("User");
  const [memberSearchTerm, setMemberSearchTerm] = useState("");
  const [memberRoleFilter, setMemberRoleFilter] = useState("All Roles");
  const [memberStatusFilter, setMemberStatusFilter] = useState(() => {
    return location.state?.memberStatusFilter || "Status";
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(7);
  const [activeRoleDropdown, setActiveRoleDropdown] = useState(null);
  const [activeStatusDropdown, setActiveStatusDropdown] = useState(null);


  useEffect(() => {
    if (location.state?.memberStatusFilter) {
      setMemberStatusFilter(location.state.memberStatusFilter);
    }
  }, [location.state]);

  useEffect(() => {
    setCurrentPage(1);
  }, [memberSearchTerm, memberRoleFilter, memberStatusFilter]);

  const filteredMembersList = (Array.isArray(teamMembers) ? teamMembers : [])
    .filter(m => {
      const nameVal = m.full_name || m.name || "";
      const matchesSearch = nameVal.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
        (m.email || "").toLowerCase().includes(memberSearchTerm.toLowerCase());
      const matchesRole = memberRoleFilter === "All Roles" ||
        m.role?.toLowerCase() === memberRoleFilter?.toLowerCase();
      const mStatus = (typeof m.is_active !== 'undefined' ? (m.is_active ? 'Active' : 'Inactive') : (m.status || 'Active')).toLowerCase() === 'inactive' ? 'Inactive' : 'Active';
      const matchesStatus = memberStatusFilter === "Status" ||
        mStatus === memberStatusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });

  const totalMemberPages = Math.ceil(filteredMembersList.length / pageSize);
  const paginatedMembersList = filteredMembersList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const [styleGuideFile, setStyleGuideFile] = useState(null);

  const handleToggleUserStatus = async (email) => {
    try {
      await organizationService.toggleStatusByEmail(email);
      toast.success("User status toggled successfully!");
      refreshMembers();
    } catch (error) {
      console.error("Failed to toggle user status:", error);
      toast.error(error.message || "Failed to toggle user status.");
    }
  };

  const updateMemberRole = async (email, newRole) => {
    try {
      await organizationService.updateUserRole(email, newRole);
      toast.success("User role updated successfully!");
      refreshMembers();
    } catch (error) {
      console.error("Failed to update user role:", error);
      toast.error(error.message || "Failed to update user role.");
    }
  };


  const handleToggleMFA = async (member) => {
    const newMfaStatus = !member.mfa;
    // Eagerly update local state first
    setTeamMembers(prev => prev.map(m => m.email === member.email ? { ...m, mfa: newMfaStatus } : m));

    try {
      await authService.toggleUserMFA(member.email, newMfaStatus);
      toast.success(`MFA ${newMfaStatus ? 'enabled' : 'disabled'} for ${member.full_name || member.email}`);
    } catch (error) {
      console.error("Failed to toggle MFA:", error);
      toast.error(error.message || "Failed to toggle MFA");
      // Rollback on error
      setTeamMembers(prev => prev.map(m => m.email === member.email ? { ...m, mfa: member.mfa } : m));
    }
  };

  const removeMember = (email, role) => {
    const isCandidate = role?.toLowerCase() === 'user';
    confirmAction({
      title: isCandidate ? "Remove Enduser?" : "Remove Team Member?",
      message: `Are you sure you want to remove this ${isCandidate ? 'enduser' : 'member'}? This will revoke their access to the platform.`,
      onConfirm: async () => {
        try {
          if (isCandidate) {
            await organizationService.deleteCandidateUser(email);
          } else {
            await authService.deleteUser(email);
          }
          toast.success(`${isCandidate ? 'Enduser' : 'Team member'} removed successfully`);
          refreshMembers();
        } catch (error) {
          console.error("Failed to delete member:", error);
          toast.error(error.message || `Failed to remove ${isCandidate ? 'enduser' : 'member'}`);
        }
      }
    });
  };
  const inviteMember = () => {
    if (!inviteEmail.trim()) return;
    const newMember = { id: Date.now(), name: inviteEmail.split('@')[0], email: inviteEmail, role: inviteRole, status: "Invited", avatar: inviteEmail.charAt(0).toUpperCase() };
    setTeamMembers(prev => [...prev, newMember]);
    setInviteEmail("");
  };

  const handleCreateMember = async () => {
    if (!memberForm.full_name || !memberForm.email || !memberForm.password) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsCreatingMember(true);
    try {
      await organizationService.createMember(memberForm);
      toast.success("Team member created successfully!");
      setShowCreateMemberModal(false);
      setMemberForm({ full_name: '', email: '', password: '', role: 'Manager' });
      refreshMembers();
    } catch (error) {
      console.error("Failed to create member:", error);
      toast.error(error.message || "Failed to create team member");
    } finally {
      setIsCreatingMember(false);
    }
  };

  const handleCreateEndUser = async (formData) => {
    setIsCreatingEndUser(true);
    try {
      await organizationService.createCandidateUser(formData);
      toast.success("End-user (Candidate) created successfully!");
      setShowCreateEndUserModal(false);
      refreshMembers();
    } catch (error) {
      console.error("Failed to create end-user:", error);
      toast.error(error.message || "Failed to create end-user");
    } finally {
      setIsCreatingEndUser(false);
    }
  };

  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      await organizationService.downloadTemplate(importType);
      toast.success("Template downloaded successfully");
    } catch (error) {
      console.error("Failed to download template:", error);
      toast.error(error.message || "Failed to download template");
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleImportUsers = async (e) => {
    e.preventDefault();
    const file = selectedImportFile || e.target.file?.files[0];
    if (!file) {
      toast.error("Please select an Excel or CSV file to upload");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setIsUploadingUsers(true);
    try {
      await organizationService.bulkImportUsers(importType, formData);
      toast.success("Users imported successfully!");
      setShowImportUsersModal(false);
      setSelectedImportFile(null);
      refreshMembers();
    } catch (error) {
      console.error("Failed to import users:", error);
      toast.error(error.message || "Failed to import users");
    } finally {
      setIsUploadingUsers(false);
    }
  };

  const handleEditMember = (m) => {
    const memberName = m.name || m.full_name || '';
    setOriginalMemberName(memberName);
    setEditForm({
      user_id: m.id || m.user_id,
      full_name: memberName,
      email: m.email || '',
      password: '', // Keep empty for security, only update if typed
      role: m.role || '',
      employee_id: m.employee_id || ''
    });
    setShowEditMemberModal(true);
  };

  const saveEditedMember = async (type = 'all') => {
    // Validation
    if (type === 'profile' || type === 'all') {
      if (!editForm.full_name) {
        toast.error("Full name is required");
        return;
      }
    }
    if (type === 'security' && !editForm.password) {
      toast.error("Please enter a new password");
      return;
    }

    setUpdatingType(type);
    try {
      const isCandidate = editForm.role?.toLowerCase() === 'user';
      if (isCandidate) {
        // Build candidate update payload for PATCH /candidate-users/by-email/{email}
        const payload = {};
        if (type === 'profile' || type === 'all') {
          payload.full_name = editForm.full_name;
        }
        if (type === 'security' || type === 'all') {
          if (editForm.password) {
            payload.password = editForm.password;
          }
        }
        payload.email = editForm.email;
        payload.employee_id = editForm.employee_id || "EMP_" + Math.floor(Math.random() * 1000);

        await organizationService.updateCandidateUser(editForm.email, payload);
      } else {
        const payload = {
          user_id: editForm.user_id,
          email: editForm.email,
        };

        if (type === 'profile' || type === 'all') {
          payload.full_name = editForm.full_name;
        }

        if (type === 'security' || type === 'all') {
          if (editForm.password) {
            payload.password = editForm.password;
          }
        }

        await authService.updateUserProfile(payload);
      }

      toast.success(
        type === 'profile' ? "Name updated successfully!" :
          type === 'security' ? "Password updated successfully!" :
            "Profile updated successfully!"
      );

      setShowEditMemberModal(false);
      // Clear password field after security update
      if (type === 'security') setEditForm(prev => ({ ...prev, password: '' }));

      refreshMembers();
    } catch (error) {
      console.error("Failed to update user profile:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setUpdatingType(null);
    }
  };

  const [permissions, setPermissions] = useState({
    HR: { create: true, edit: true, delete: true, approve: false, invite: false },
    Manager: { create: false, edit: true, delete: false, approve: true, invite: false },
    User: { create: false, edit: false, delete: false, approve: false, invite: false },
  });

  const togglePermission = (role, action) => {
    if (role === 'Admin') return;
    setPermissions(prev => ({
      ...prev,
      [role]: { ...prev[role], [action]: !prev[role][action] }
    }));
  };
  const updateWordCount = (field, val) => {
    const num = parseInt(val) || 0;
    setTargetWordCount(prev => {
      const next = { ...prev, [field]: num };
      if (field === 'min' && next.min > next.max) next.max = next.min + 100;
      if (field === 'max' && next.max < next.min) next.min = Math.max(0, next.max - 100);
      return next;
    });
  };

  const updateSectionLimit = (section, field, val) => {
    const num = parseInt(val) || 0;
    setSectionWordLimits(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: num }
    }));
  };

  const [isSavingLimits, setIsSavingLimits] = useState(false);
  const saveWordLimits = async () => {
    setIsSavingLimits(true);
    try {
      await updateWordLimits(sectionWordLimits);
      // Optional: Success toast
    } catch (error) {
      console.error("Save word limits failed", error);
    } finally {
      setIsSavingLimits(false);
    }
  };



  const [workflowName, setWorkflowName] = useState("");
  const [workflowApplyTo, setWorkflowApplyTo] = useState("All departments");

  const saveWorkflow = async () => {
    if (!workflowName.trim()) return;
    try {
      const payload = {
        name: workflowName,
        steps: workflowSteps.map((s, idx) => ({
          step_name: s.name || `Step ${idx + 1}`,
          user_email: s.reviewerEmail,
          sla_days: s.sla
        })),
        is_draft: !workflowActive
      };

      await createJDWorkflow(payload);
      toast.success("Workflow created successfully!");

      setShowWorkflowModal(false);
      setWorkflowName("");
      setWorkflowApplyTo("All departments");
      setWorkflowSteps([{ id: Date.now(), name: "", reviewerEmail: "", role: "Manager", sla: 1, email: true, escalate: true, searchTerm: "" }]);
    } catch (error) {
      console.error("Failed to save workflow:", error);
      alert("Failed to save workflow. Please check if all steps have reviewer emails.");
    }
  };

  const openWorkflowView = (wf) => {
    setWorkflowName(wf.name || "");
    setWorkflowApplyTo(wf.scope || wf.department || "All departments");
    setWorkflowActive(wf.active ?? true);
    setWorkflowSteps((wf.steps || []).map((s, idx) => {
      const email = s.user_email || s.reviewerEmail || s.email || "";
      return {
        id: idx,
        name: s.step_name || s.name || "",
        reviewerEmail: email,
        role: s.role || "Manager",
        sla: s.sla_days || s.sla || 1,
        email: true,
        escalate: true,
        searchTerm: email
      };
    }));
    setIsViewOnly(true);
    setShowWorkflowModal(true);
  };

  const handleDeleteWorkflow = async (id) => {
    confirmAction({
      title: "Delete Workflow?",
      message: "Are you sure you want to delete this approval sequence? Any JDs currently using this workflow will need to be re-assigned.",
      onConfirm: async () => {
        try {
          await deleteJDWorkflow(id);
          toast.success("Workflow deleted");
        } catch (error) {
          console.error("Failed to delete workflow:", error);
          toast.error("Failed to delete workflow");
        }
      }
    });
  };

  // --- Terms & Conditions State ---
  const [termsList, setTermsList] = useState([]);
  const [isLoadingTerms, setIsLoadingTerms] = useState(false);
  const [isSavingTerms, setIsSavingTerms] = useState(false);
  const [termsForm, setTermsForm] = useState({ content: '', is_active: true });
  const [editingTermsId, setEditingTermsId] = useState(null);
  const termsEditorRef = useRef(null);
  const [termsPreviewMode, setTermsPreviewMode] = useState(false);

  const fetchTermsList = async (silent = false) => {
    if (!silent) setIsLoadingTerms(true);
    try {
      const data = await termsService.getTermsList();
      setTermsList(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch terms:', error);
      if (!silent) toast.error('Could not load Terms and Conditions');
    } finally {
      if (!silent) setIsLoadingTerms(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'Terms & Conditions') {
      fetchTermsList();
    }
  }, [activeTab]);

  const handleSaveTerms = async () => {
    if (!termsForm.content.trim()) {
      toast.error('Content cannot be empty');
      return;
    }
    setIsSavingTerms(true);
    try {
      if (editingTermsId) {
        await termsService.updateTerms(editingTermsId, termsForm);
        toast.success('Terms updated successfully!');
      } else {
        await termsService.createTerms(termsForm);
        toast.success('Terms created successfully!');
      }
      setTermsForm({ content: '', is_active: true });
      setEditingTermsId(null);
      setTermsPreviewMode(false);
      fetchTermsList();
    } catch (error) {
      toast.error(error.message || 'Failed to save Terms and Conditions');
    } finally {
      setIsSavingTerms(false);
    }
  };

  const handleEditTerms = (term) => {
    const id = term.tc_id || term.id;
    setEditingTermsId(id);
    setTermsForm({ content: term.content || '', is_active: term.is_active ?? true });
    setTermsPreviewMode(false);
    // Bring the editor into view (list is below the form)
    requestAnimationFrame(() => {
      termsEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleDeleteTerms = (id) => {
    confirmAction({
      title: 'Delete Policy?',
      message: 'Are you sure you want to delete this Terms & Conditions policy? This action cannot be undone.',
      confirmText: 'Delete Policy',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await termsService.deleteTerms(id);
          toast.success('Policy deleted successfully');
          fetchTermsList();
        } catch (error) {
          toast.error(error.message || 'Failed to delete policy');
        }
      }
    });
  };

  const handleToggleTermsActive = async (term) => {
    const id = term.tc_id || term.id;
    const newActiveState = !term.is_active;

    // Optimistically update the UI list to avoid lag
    setTermsList(prev => prev.map(t => {
      const tId = t.tc_id || t.id;
      if (tId === id) {
        return { ...t, is_active: newActiveState };
      }
      if (newActiveState && tId !== id) {
        return { ...t, is_active: false };
      }
      return t;
    }));

    try {
      await termsService.updateTerms(id, {
        content: term.content,
        is_active: newActiveState
      });
      toast.success(newActiveState ? 'Policy activated successfully!' : 'Policy deactivated successfully!');
      fetchTermsList(true);
    } catch (error) {
      toast.error(error.message || 'Failed to update policy status');
      fetchTermsList(true);
    }
  };

  // --- User Assign Groups State ---
  const [emailGroups, setEmailGroups] = useState([]);
  const [isLoadingEmailGroups, setIsLoadingEmailGroups] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showViewGroupModal, setShowViewGroupModal] = useState(false);
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [groupForm, setGroupForm] = useState({ group_name: '', role: 'User', emails: '' });
  const [editingGroupName, setEditingGroupName] = useState(null);
  const [selectedGroupDetails, setSelectedGroupDetails] = useState(null);

  const [candidateUsers, setCandidateUsers] = useState([]);
  const [showUserSelectionPanel, setShowUserSelectionPanel] = useState(false);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);

  const handleOpenUserSelection = async () => {
    if (candidateUsers.length === 0) {
      setIsLoadingCandidates(true);
      try {
        const data = await organizationService.listCandidateUsers();
        setCandidateUsers(Array.isArray(data) ? data : (data?.candidates || data?.users || data?.results || data?.data || []));
      } catch (error) {
        toast.error("Failed to fetch users");
      } finally {
        setIsLoadingCandidates(false);
      }
    }
    setShowUserSelectionPanel(true);
  };

  const fetchEmailGroups = async (silent = false) => {
    if (!silent) setIsLoadingEmailGroups(true);
    try {
      const data = await organizationService.getEmailGroups();
      setEmailGroups(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch email groups:', error);
      if (!silent) toast.error('Could not load User Assign Groups');
    } finally {
      if (!silent) setIsLoadingEmailGroups(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'User Assign Groups') {
      fetchEmailGroups();
    }
  }, [activeTab]);

  const handleSaveGroup = async () => {
    if (!groupForm.group_name.trim()) {
      toast.error('Group name is required');
      return;
    }

    // Parse comma-separated emails
    const emailList = groupForm.emails.split(',').map(e => e.trim()).filter(e => e);
    if (emailList.length === 0) {
      toast.error('At least one email is required');
      return;
    }

    const payload = {
      group_name: groupForm.group_name.trim(),
      role: groupForm.role,
      emails: emailList
    };

    setIsSavingGroup(true);
    try {
      if (editingGroupName) {
        await organizationService.updateEmailGroup(editingGroupName, payload);
        toast.success('Group updated successfully!');
      } else {
        await organizationService.createEmailGroup(payload);
        toast.success('Group created successfully!');
      }
      setGroupForm({ group_name: '', role: 'User', emails: '' });
      setEditingGroupName(null);
      setShowCreateGroupModal(false);
      fetchEmailGroups(true);
    } catch (error) {
      toast.error(error.message || 'Failed to save group');
    } finally {
      setIsSavingGroup(false);
    }
  };

  const handleEditGroup = (group) => {
    setEditingGroupName(group.group_name);
    setGroupForm({
      group_name: group.group_name,
      role: group.role || 'User',
      emails: (group.emails || []).join(', ')
    });
    setShowCreateGroupModal(true);
  };

  const handleDeleteGroup = (groupName) => {
    confirmAction({
      title: 'Delete Group?',
      message: `Are you sure you want to delete the group "${groupName}"? This action cannot be undone.`,
      confirmText: 'Delete Group',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await organizationService.deleteEmailGroup(groupName);
          toast.success('Group deleted successfully');
          fetchEmailGroups(true);
        } catch (error) {
          toast.error(error.message || 'Failed to delete group');
        }
      }
    });
  };

  const handleViewGroup = (group) => {
    setSelectedGroupDetails(group);
    setShowViewGroupModal(true);
  };



  if (!departments || !workflows || !teamMembers) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#020617] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <Activity className="w-12 h-12 text-indigo-500 animate-spin" />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Initializing Admin Console...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-[#020617] transition-colors duration-500 font-sans p-6 lg:p-10">
      <div className="max-w-[1600px] mx-auto animate-in fade-in duration-500">

        {/* HERO SECTION - Glass Tech-Noir */}
        <div className="relative rounded-[1.5rem] overflow-hidden bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/5 p-6 lg:p-8 mb-4 shadow-sm dark:shadow-2xl">
          <AdminConsoleHeaderScene />
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-blue-500/5 dark:from-indigo-500/10 dark:via-purple-500/5 dark:to-blue-500/10 pointer-events-none" />
          <div className="absolute -top-32 -right-32 w-[400px] h-[400px] bg-indigo-500/20 dark:bg-indigo-500/20 rounded-full blur-[100px] opacity-60 mix-blend-screen pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] bg-blue-500/20 dark:bg-blue-500/20 rounded-full blur-[100px] opacity-60 mix-blend-screen pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 mb-4">
                <Target className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">System Configuration</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3">
                Admin Console
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
                Configure competency libraries, resource guides, and organizational SLA approval pipelines across the entire enterprise.
              </p>
            </div>
          </div>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Sidebar Nav Bento */}
          <div className="lg:col-span-3 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/5 rounded-[2rem] p-2 shadow-sm dark:shadow-2xl sticky top-6 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />

            <div className="relative z-10 space-y-1 mt-1">
              <div className="px-3 pb-1.5 mb-1.5 border-b border-slate-100 dark:border-white/5">
                <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Module Selection</span>
              </div>
              {tabs.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      if (tab.id === "Team & Permissions") refreshMembers();
                      if (tab.id === "Approval Workflows") refreshWorkflows();
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[13px] font-bold transition-all relative overflow-hidden group/btn ${isActive
                      ? "text-indigo-700 dark:text-indigo-300 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                  >
                    {isActive && (
                      <div className="absolute inset-0 bg-indigo-50 dark:bg-gradient-to-r dark:from-indigo-500/20 dark:to-purple-500/5 border border-indigo-100 dark:border-indigo-500/20 rounded-xl" />
                    )}
                    {!isActive && (
                      <div className="absolute inset-0 bg-slate-50 dark:bg-white/5 opacity-0 group-hover/btn:opacity-100 transition-opacity rounded-xl" />
                    )}
                    <tab.icon className={`w-[18px] h-[18px] relative z-10 ${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 group-hover/btn:text-slate-500"}`} />
                    <span className="relative z-10">{tab.id}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Content Area Bento */}
          <div className="lg:col-span-9 space-y-8">

            {/* View: Job Framework — commented out
            {activeTab === "Job Framework" && (
              <> ... department & job family UI ... </>
            )}
            */}


            {/* View: Style Guide (Rebranded as Brand Image Library & Content Guard) */}
            {activeTab === "Resource Guide" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">

                {/* 1. Brand Image Library */}
                <div className="bg-white dark:bg-[#0f172a] border border-slate-200/60 dark:border-white/5 shadow-sm dark:shadow-2xl rounded-[2.5rem] p-8 lg:p-10 relative overflow-hidden group hover:border-indigo-500/30 transition-colors">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-3">
                        <Image className="w-5 h-5 text-indigo-500" /> Brand Image Library
                      </h2>
                      <p className="text-[13px] text-slate-400 font-medium">Manage shared logos and brand assets used across organizational JDs</p>
                    </div>

                    <div className="flex flex-col items-end">
                      <label className={`
                          flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-lg active:scale-95
                          ${isUploadingImage ? 'bg-slate-100 text-slate-400 cursor-wait' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/20'}
                      `}>
                        {isUploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        {isUploadingImage ? "Uploading..." : "Add New Asset"}
                        <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" disabled={isUploadingImage} />
                      </label>
                      <span className="text-[10px] text-slate-400 font-medium mt-2 text-right">Max dimensions: 650x150px</span>
                    </div>
                  </div>

                  {isLoadingImages ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                      <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading Library...</p>
                    </div>
                  ) : orgImages.length === 0 ? (
                    <div className="py-20 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[2rem] flex flex-col items-center justify-center text-center px-10">
                      <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center text-slate-300 dark:text-slate-700 mb-4 transition-transform hover:scale-110 duration-300">
                        <Image className="w-8 h-8" />
                      </div>
                      <h4 className="text-slate-900 dark:text-white font-bold mb-1">Your library is empty</h4>
                      <p className="text-sm text-slate-400 dark:text-slate-500 max-w-[300px]">Upload brand logos and images to share with your entire organization.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                      {(Array.isArray(orgImages) ? orgImages : []).map((img) => (
                        <div key={img.id} className="group relative bg-slate-50 dark:bg-[#020617] rounded-3xl border border-slate-100 dark:border-white/5 overflow-hidden hover:border-indigo-500/30 transition-all duration-300 shadow-sm hover:shadow-xl">
                          <div className="aspect-[4/3] flex items-center justify-center p-6 bg-white dark:bg-white/5">
                            <img
                              src={(img.image_url || img.url)?.startsWith('http') ? (img.image_url || img.url) : `${BASE_URL}${img.image_url || img.url}`}
                              alt={img.label}
                              className="max-w-full max-h-full object-contain filter group-hover:scale-110 transition-transform duration-500"
                            />
                          </div>
                          <div className="p-4 flex items-center justify-between border-t border-slate-100 dark:border-white/5">
                            <div className="truncate pr-2">
                              <p className="text-xs font-black text-slate-900 dark:text-white truncate uppercase tracking-tight">{img.label || 'Unnamed Asset'}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(img.created_at).toLocaleDateString()}</p>
                            </div>
                            <button
                              onClick={() => handleDeleteImage(img.id)}
                              className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all active:scale-95"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Banned Words List & Word Counter (Coming Soon) */}
                <div className="relative group/guard">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 transition-all duration-500 group-hover/guard:blur-[6px] group-hover/guard:scale-[0.99] group-hover/guard:opacity-50">
                    <div className="lg:col-span-2 bg-white dark:bg-[#0f172a] border border-slate-200/60 dark:border-white/5 shadow-sm dark:shadow-2xl rounded-[2.5rem] p-8 lg:p-10">
                      <div className="mb-8">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                          <Zap className="w-5 h-5 text-indigo-500" /> Banned Words List
                        </h2>
                        <p className="text-[13px] text-slate-400 font-medium mt-1 ml-8">These words will be automatically flagged as bias indicators during JD generation</p>
                      </div>

                      <div className="bg-slate-50 dark:bg-[#020617]/50 border border-slate-100 dark:border-white/5 rounded-3xl p-6 mb-6">
                        <div className="flex flex-wrap gap-2 mb-6">
                          {(Array.isArray(bannedWords) ? bannedWords : []).map(word => (
                            <div key={word} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl group/tag hover:border-rose-500/30 transition-all duration-300">
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{word}</span>
                              <button onClick={() => removeBannedWord(word)} className="text-slate-300 hover:text-rose-500 transition-colors">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newBannedWord}
                            onChange={e => setNewBannedWord(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addBannedWord()}
                            placeholder="Add restricted term..."
                            className="flex-1 bg-white dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-sans"
                          />
                          <button onClick={addBannedWord} className="px-6 py-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95">ADD</button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-500/20 flex flex-col justify-between relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20" />
                      <div className="relative z-10">
                        <h3 className="text-lg font-black uppercase tracking-tighter mb-1">Global Target</h3>
                        <p className="text-indigo-100 text-xs font-medium mb-8">System-wide word count goal for a generated JD</p>

                        <div className="space-y-6">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200">Min Threshold</label>
                              <span className="text-xl font-black">{targetWordCount.min}</span>
                            </div>
                            <input
                              type="range" min="300" max="1000" step="50"
                              value={targetWordCount.min}
                              onChange={e => updateWordCount('min', e.target.value)}
                              className="w-full h-1.5 bg-indigo-900/40 rounded-lg appearance-none cursor-pointer accent-white"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200">Max Threshold</label>
                              <span className="text-xl font-black">{targetWordCount.max}</span>
                            </div>
                            <input
                              type="range" min="300" max="1500" step="50"
                              value={targetWordCount.max}
                              onChange={e => updateWordCount('max', e.target.value)}
                              className="w-full h-1.5 bg-indigo-900/40 rounded-lg appearance-none cursor-pointer accent-white"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="relative z-10 pt-6 mt-6 border-t border-white/10 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <p className="text-[10px] font-bold text-indigo-100 leading-relaxed uppercase tracking-wide">Optimized for readability and AI coherence</p>
                      </div>
                    </div>
                  </div>

                  {/* Coming Soon Overlay */}
                  <div className="absolute inset-x-0 inset-y-8 flex flex-col items-center justify-center opacity-0 group-hover/guard:opacity-100 transition-all duration-500 z-30 pointer-events-none">
                    <div className="bg-white/90 dark:bg-[#020617]/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 px-8 py-5 rounded-[2rem] shadow-2xl scale-90 group-hover/guard:scale-100 transition-all duration-500 flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                        <Cpu className="w-6 h-6 animate-pulse" />
                      </div>
                      <div className="text-center">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">Coming in next version</h4>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Advanced Content Guard & AI Safety</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Section Word Limits */}
                <div className="relative group/wordlimits overflow-hidden rounded-[2.5rem]">
                  <div className="bg-white dark:bg-[#0f172a] border border-slate-200/60 dark:border-white/5 shadow-sm dark:shadow-2xl rounded-[2.5rem] p-8 lg:p-10 transition-all duration-500 group-hover/wordlimits:blur-[6px] group-hover/wordlimits:scale-[0.99] group-hover/wordlimits:opacity-50">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                          <Box className="w-5 h-5 text-indigo-500" /> Section Word Limits
                        </h2>
                        <p className="text-[13px] text-slate-400 font-medium mt-1 ml-8">Define granular target ranges for each AI-generated JD section</p>
                      </div>
                      <button
                        onClick={saveWordLimits}
                        disabled={isSavingLimits}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2 disabled:opacity-50"
                      >
                        {isSavingLimits ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
                        Save Thresholds
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {Object.entries(sectionWordLimits).map(([key, limits]) => (
                        <div key={key} className="bg-slate-50 dark:bg-[#020617]/50 border border-slate-100 dark:border-white/5 rounded-3xl p-6 transition-all duration-300 hover:shadow-md hover:border-indigo-500/10">
                          <h4 className="text-[11px] font-black text-slate-900 dark:text-white mb-4 uppercase tracking-wider">{key.replace('_', ' ')}</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Min</label>
                              <input
                                type="number"
                                value={limits.min}
                                onChange={e => updateSectionLimit(key, 'min', e.target.value)}
                                className="w-full px-4 py-2.5 bg-white dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all font-sans"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Max</label>
                              <input
                                type="number"
                                value={limits.max}
                                onChange={e => updateSectionLimit(key, 'max', e.target.value)}
                                className="w-full px-4 py-2.5 bg-white dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all font-sans"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Coming Soon Overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover/wordlimits:opacity-100 transition-all duration-500 z-30 pointer-events-none">
                    <div className="bg-white/90 dark:bg-[#020617]/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 px-8 py-5 rounded-[2rem] shadow-2xl scale-90 group-hover/wordlimits:scale-100 transition-all duration-500 flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                        <Cpu className="w-6 h-6 animate-pulse" />
                      </div>
                      <div className="center">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">Coming in next version</h4>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Granular AI Section Controls</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}


            {/* View: User Assign Groups */}
            {activeTab === "User Assign Groups" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white dark:bg-[#0f172a] border border-slate-200/60 dark:border-white/5 shadow-sm dark:shadow-2xl rounded-[2.5rem] p-8 lg:p-10 mb-8 relative overflow-hidden group hover:border-indigo-500/30 transition-colors">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-[80px] -mr-40 -mt-40 pointer-events-none" />

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 relative z-10">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <FolderGit2 className="w-5 h-5 text-indigo-500" /> User Assign Groups
                      </h2>
                      <p className="text-[13px] text-slate-400 font-medium mt-1 ml-8">Manage groups of users for bulk JD assignments</p>
                    </div>
                    <button
                      onClick={() => {
                        setEditingGroupName(null);
                        setGroupForm({ group_name: '', role: 'User', emails: '' });
                        setShowCreateGroupModal(true);
                      }}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Create Group
                    </button>
                  </div>

                  {isLoadingEmailGroups ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4 relative z-10">
                      <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading Groups...</p>
                    </div>
                  ) : emailGroups.length === 0 ? (
                    <div className="py-20 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[2rem] flex flex-col items-center justify-center text-center px-10 relative z-10">
                      <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center text-slate-300 dark:text-slate-700 mb-4">
                        <FolderGit2 className="w-8 h-8" />
                      </div>
                      <h4 className="text-slate-900 dark:text-white font-bold mb-1">No groups found</h4>
                      <p className="text-sm text-slate-400 dark:text-slate-500 max-w-[300px]">Create an email group to easily assign JDs to multiple users at once.</p>
                    </div>
                  ) : (
                    <div className="border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden bg-white dark:bg-[#020617] shadow-inner relative z-10">
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                          <thead className="bg-slate-50/80 dark:bg-[#020617]/80 border-b border-slate-200 dark:border-white/5 backdrop-blur-sm">
                            <tr>
                              <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Group Name</th>
                              <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Role</th>
                              <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Members</th>
                              <th className="px-6 py-4 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-white/5 bg-white dark:bg-[#0f172a]">
                            {emailGroups.map((group, i) => (
                              <tr key={i} className="hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors group/row cursor-pointer">
                                <td className="px-6 py-5">
                                  <div className="font-bold text-sm text-slate-900 dark:text-white">{group.group_name}</div>
                                </td>
                                <td className="px-6 py-5">
                                  <span className="px-2.5 py-1 rounded-md text-[10px] font-bold border inline-block bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-500/20">{group.role || "User"}</span>
                                </td>
                                <td className="px-6 py-5 text-center">
                                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 text-xs font-bold text-slate-600 dark:text-slate-300">
                                    {(group.emails || []).length}
                                  </span>
                                </td>
                                <td className="px-6 py-5 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => handleViewGroup(group)}
                                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-all"
                                      title="View Details"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleEditGroup(group)}
                                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-all"
                                      title="Edit Group"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteGroup(group.group_name)}
                                      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
                                      title="Delete Group"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Create/Edit Group Modal */}
                {showCreateGroupModal && (
                  <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isSavingGroup && setShowCreateGroupModal(false)} />
                    <div className="relative bg-white dark:bg-[#0f172a] rounded-3xl border border-slate-200 dark:border-white/10 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300">
                      <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                            <FolderGit2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{editingGroupName ? 'Edit Group' : 'Create New Group'}</h3>
                            <p className="text-[11px] text-slate-500 uppercase tracking-widest">{editingGroupName ? 'Update group details' : 'Setup a new assignment group'}</p>
                          </div>
                        </div>
                        <button onClick={() => !isSavingGroup && setShowCreateGroupModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="p-6 space-y-5">
                        <div>
                          <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Group Name *</label>
                          <input
                            type="text"
                            value={groupForm.group_name}
                            onChange={(e) => setGroupForm({ ...groupForm, group_name: e.target.value })}
                            placeholder="e.g. Frontend Engineering Team"
                            disabled={!!editingGroupName}
                            className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Role</label>
                          <div className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-slate-500 dark:text-slate-400">
                            Learner / User
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Member Emails *</label>
                          <p className="text-[10px] text-slate-400 mb-2">Select learners to add to this group</p>
                          <div className="flex flex-col gap-3">
                            <button
                              onClick={handleOpenUserSelection}
                              disabled={isLoadingCandidates}
                              className="w-full bg-slate-50 hover:bg-slate-100 dark:bg-[#020617] dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-between"
                            >
                              <span>
                                {groupForm.emails ? `${groupForm.emails.split(',').length} Users Selected` : 'Select Users'}
                              </span>
                              {isLoadingCandidates ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> : <Users className="w-4 h-4 text-slate-400" />}
                            </button>
                            {groupForm.emails && (
                              <div className="text-xs text-slate-500 max-h-24 overflow-y-auto custom-scrollbar p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 break-words">
                                {groupForm.emails}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="p-6 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-end gap-3 rounded-b-3xl">
                        <button
                          onClick={() => setShowCreateGroupModal(false)}
                          disabled={isSavingGroup}
                          className="px-5 py-2.5 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveGroup}
                          disabled={isSavingGroup}
                          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center gap-2"
                        >
                          {isSavingGroup && <Loader2 className="w-4 h-4 animate-spin" />}
                          {editingGroupName ? 'Save Changes' : 'Create Group'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* View Group Details Modal */}
                {showViewGroupModal && selectedGroupDetails && (
                  <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowViewGroupModal(false)} />
                    <div className="relative bg-white dark:bg-[#0f172a] rounded-3xl border border-slate-200 dark:border-white/10 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[80vh]">
                      <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5 shrink-0">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedGroupDetails.group_name}</h3>
                            <p className="text-[11px] text-slate-500 uppercase tracking-widest">{selectedGroupDetails.role || "User"} Role · {(selectedGroupDetails.emails || []).length} Members</p>
                          </div>
                        </div>
                        <button onClick={() => setShowViewGroupModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="p-6 overflow-y-auto custom-scrollbar">
                        <h4 className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Member Emails</h4>
                        <div className="space-y-2">
                          {(selectedGroupDetails.emails || []).map((email, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-[#020617] flex items-center justify-center shrink-0">
                                <User className="w-4 h-4 text-slate-500" />
                              </div>
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{email}</span>
                            </div>
                          ))}
                          {(selectedGroupDetails.emails || []).length === 0 && (
                            <p className="text-sm text-slate-500 italic text-center py-4">No members in this group.</p>
                          )}
                        </div>
                      </div>

                      <div className="p-6 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-end rounded-b-3xl shrink-0">
                        <button
                          onClick={() => setShowViewGroupModal(false)}
                          className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:bg-slate-800 dark:hover:bg-slate-200"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* User Selection Panel for Group Creation */}
                <UserSelectionPanel
                  isOpen={showUserSelectionPanel}
                  onClose={() => setShowUserSelectionPanel(false)}
                  users={candidateUsers}
                  initialSelectedEmails={groupForm.emails ? groupForm.emails.split(',').map(e => e.trim()).filter(e => e) : []}
                  onConfirm={(selected) => {
                    setGroupForm(prev => ({ ...prev, emails: selected.join(', ') }));
                    setShowUserSelectionPanel(false);
                  }}
                  conflictValues={[]}
                  hideGroupsTab={true}
                />
              </div>
            )}
            {activeTab === "Team & Permissions" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Modern SaaS Team Members List */}
                <div className="relative bg-white/40 dark:bg-[#0a0f1e]/80 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)] rounded-[2.5rem] p-1 overflow-hidden mb-8">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-violet-500/5 dark:from-indigo-500/10 dark:via-transparent dark:to-violet-500/10 pointer-events-none" />

                  <div className="bg-white/60 dark:bg-[#020617]/60 backdrop-blur-xl rounded-[2.25rem] p-8 lg:p-10 relative z-10">
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
                      <div>
                        <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2 mb-1 tracking-tight">
                          <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white">
                            <Users className="w-3.5 h-3.5" />
                          </div>
                          Team Workspace
                        </h2>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wide flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {teamMembers.length} active members · Acme Corp
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <div className="relative group flex-1 min-w-[160px]">
                          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full opacity-0 group-focus-within:opacity-100 blur transition-opacity duration-500" />
                          <div className="relative flex items-center">
                            <Search className="absolute left-3 w-3 h-3 text-slate-400" />
                            <input
                              type="text"
                              value={memberSearchTerm}
                              onChange={(e) => setMemberSearchTerm(e.target.value)}
                              placeholder="Search members..."
                              className="w-full bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md border border-slate-200/50 dark:border-white/5 rounded-full pl-8 pr-3 py-2 text-[10px] font-bold text-slate-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#0f172a] transition-all placeholder:text-slate-400"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={memberRoleFilter}
                            onChange={(e) => setMemberRoleFilter(e.target.value)}
                            className="bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md border border-slate-200/50 dark:border-white/5 rounded-full px-3 py-2 text-[10px] font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all appearance-none cursor-pointer hover:bg-white dark:hover:bg-[#0f172a]"
                          >
                            <option>All Roles</option>
                            <option>Admin</option>
                            <option>HR</option>
                            <option>Manager</option>
                            <option>User</option>
                          </select>

                          <select
                            value={memberStatusFilter}
                            onChange={(e) => setMemberStatusFilter(e.target.value)}
                            className="bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-md border border-slate-200/50 dark:border-white/5 rounded-full px-3 py-2 text-[10px] font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all appearance-none cursor-pointer hover:bg-white dark:hover:bg-[#0f172a]"
                          >
                            <option>Status</option>
                            <option>Active</option>
                            <option>Inactive</option>
                          </select>

                          <button
                            onClick={() => setShowCreateMemberModal(true)}
                            className="relative group px-4 py-2 rounded-full text-[10px] font-bold text-white overflow-hidden shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 group-hover:from-indigo-500 group-hover:to-violet-500 transition-colors" />
                            <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/20" />
                            <UserPlus className="w-3 h-3 relative z-10" />
                            <span className="relative z-10">Create Member</span>
                          </button>

                          <button
                            onClick={() => setShowCreateEndUserModal(true)}
                            className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full text-[10px] font-bold transition-all shadow-md shadow-slate-900/10 dark:shadow-white/10 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5 ring-1 ring-inset ring-white/10 dark:ring-black/10"
                          >
                            <Plus className="w-3 h-3" /> Create Enduser
                          </button>

                          <button
                            onClick={() => setShowImportUsersModal(true)}
                            className="group px-4 py-2 bg-white/50 dark:bg-white/5 backdrop-blur-md border border-slate-200/50 dark:border-white/10 text-slate-700 dark:text-slate-300 rounded-full text-[10px] font-bold hover:bg-white dark:hover:bg-white/10 transition-all flex items-center gap-1.5 shadow-sm hover:shadow-md"
                          >
                            <FileUp className="w-3 h-3 text-violet-500 group-hover:-translate-y-0.5 transition-transform" />
                            <span>Import Users</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/40 dark:bg-[#020617]/40 backdrop-blur-xl border border-slate-200/50 dark:border-white/5 rounded-3xl overflow-visible shadow-inner relative">
                      <div className="overflow-x-auto custom-scrollbar rounded-t-3xl">
                        <table className="w-full text-left whitespace-nowrap">
                          <thead className="bg-slate-50/50 dark:bg-[#0f172a]/50 backdrop-blur-md border-b border-slate-200/50 dark:border-white/5">
                            <tr>
                              <th className="px-6 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Member Info</th>
                              <th className="px-6 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Access Level</th>
                              <th className="px-6 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Current Status</th>
                              <th className="px-6 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] text-center">Multi-Factor Authentication Security</th>
                              <th className="px-6 py-3 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] text-right">Manage</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100/50 dark:divide-white/5 relative">
                            {paginatedMembersList.map((m, index) => {
                              const initials = (m.full_name || m.name || m.email || "U").split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                              const avatarColors = [
                                'from-indigo-400 to-cyan-400 shadow-indigo-500/20 text-indigo-900',
                                'from-purple-400 to-pink-400 shadow-purple-500/20 text-purple-900',
                                'from-emerald-400 to-teal-400 shadow-emerald-500/20 text-emerald-900',
                                'from-amber-400 to-orange-400 shadow-amber-500/20 text-amber-900',
                                'from-rose-400 to-red-400 shadow-rose-500/20 text-rose-900',
                              ];
                              const colorIdx = (m.email?.length || index) % avatarColors.length;
                              const currentAvatarColor = avatarColors[colorIdx];
                              const mStatus = (typeof m.is_active !== 'undefined' ? (m.is_active ? 'Active' : 'Inactive') : (m.status || 'Active')).toLowerCase() === 'inactive' ? 'Inactive' : 'Active';

                              return (
                                <tr key={m.id || m.email || index} className="hover:bg-white/60 dark:hover:bg-white/[0.02] transition-colors group/row">
                                  <td className="px-6 py-4 relative">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 opacity-0 group-hover/row:opacity-100 transition-opacity" />
                                    <div className="flex items-center gap-4">
                                      <div className="relative">
                                        <div className="absolute inset-0 bg-white dark:bg-slate-800 rounded-full scale-110 shadow-sm" />
                                        <div className={`relative w-9 h-9 rounded-full bg-gradient-to-br ${currentAvatarColor} flex items-center justify-center text-xs font-black shadow-md ring-2 ring-white dark:ring-[#0f172a]`}>
                                          <span className="text-white drop-shadow-md">{initials}</span>
                                        </div>
                                      </div>
                                      <div>
                                        <p className="text-xs font-black text-slate-900 dark:text-white mb-0.5 group-hover/row:text-indigo-600 dark:group-hover/row:text-indigo-400 transition-colors">{m.full_name || m.name || (m.email && m.email.split('@')[0]) || 'User'}</p>
                                        <p className="text-[10px] text-slate-500 font-medium tracking-wide">{m.email}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="relative inline-block">
                                      <button
                                        disabled={m.email === user?.email}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveRoleDropdown(activeRoleDropdown === m.email ? null : m.email);
                                          setActiveStatusDropdown(null);
                                        }}
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black tracking-widest border transition-all ${
                                          m.email === user?.email ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:scale-105 active:scale-95'
                                        } ${m.role === 'Admin'
                                          ? 'bg-indigo-50/80 text-indigo-700 border-indigo-200/50 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20'
                                          : m.role === 'Manager'
                                            ? 'bg-purple-50/80 text-purple-700 border-purple-200/50 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20'
                                            : m.role === 'HR'
                                              ? 'bg-amber-50/80 text-amber-700 border-amber-200/50 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                                              : m.role === 'User'
                                                ? 'bg-emerald-50/80 text-emerald-700 border-emerald-200/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                                                : 'bg-slate-50/80 text-slate-700 border-slate-200/50 dark:bg-white/5 dark:text-slate-400 dark:border-white/10'
                                        }`}
                                      >
                                        {m.role === 'Admin' ? <Shield className="w-3 h-3" /> :
                                          m.role === 'Manager' ? <Briefcase className="w-3 h-3" /> :
                                            m.role === 'HR' ? <Activity className="w-3 h-3" /> :
                                              m.role === 'User' ? <User className="w-3 h-3" /> :
                                                <Shield className="w-3 h-3" />}
                                        <span className="uppercase">{m.role}</span>
                                        {m.email !== user?.email && <ChevronDown className="w-3 h-3 opacity-60" />}
                                      </button>

                                      {activeRoleDropdown === m.email && (
                                        <>
                                          <div className="fixed inset-0 z-40" onClick={() => setActiveRoleDropdown(null)} />
                                          <div className={`absolute left-0 w-36 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl z-50 py-1.5 animate-in fade-in duration-200 ${
                                            (index >= paginatedMembersList.length - 2 && paginatedMembersList.length > 2)
                                              ? 'bottom-full mb-1.5 origin-bottom slide-in-from-bottom-2'
                                              : 'top-full mt-1.5 origin-top slide-in-from-top-2'
                                          }`}>
                                            {['Admin', 'HR', 'Manager', 'User'].map((r) => (
                                              <button
                                                key={r}
                                                onClick={() => {
                                                  updateMemberRole(m.email, r);
                                                  setActiveRoleDropdown(null);
                                                }}
                                                className={`w-full px-4 py-2 text-left text-[10px] font-bold tracking-wider uppercase transition-colors flex items-center gap-2 ${
                                                  m.role === r
                                                    ? 'bg-slate-50 dark:bg-white/5 text-indigo-600 dark:text-indigo-400'
                                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                                                }`}
                                              >
                                                {r === 'Admin' ? <Shield className="w-3.5 h-3.5" /> :
                                                  r === 'Manager' ? <Briefcase className="w-3.5 h-3.5" /> :
                                                    r === 'HR' ? <Activity className="w-3.5 h-3.5" /> :
                                                      <User className="w-3.5 h-3.5" />}
                                                {r}
                                              </button>
                                            ))}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="relative inline-block">
                                      <button
                                        disabled={m.email === user?.email}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveStatusDropdown(activeStatusDropdown === m.email ? null : m.email);
                                          setActiveRoleDropdown(null);
                                        }}
                                        className={`inline-flex items-center gap-1.5 pl-6 pr-3 py-1 border shadow-sm rounded-full text-[10px] font-bold transition-all relative ${
                                          m.email === user?.email ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:scale-105 active:scale-95'
                                        } ${mStatus === 'Inactive'
                                          ? 'bg-white dark:bg-[#0f172a] text-slate-500 dark:text-slate-400 border-slate-200/50 dark:border-white/10'
                                          : 'bg-white dark:bg-[#0f172a] text-emerald-600 dark:text-emerald-400 border-slate-200/50 dark:border-white/10'
                                        }`}
                                      >
                                        <div className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${
                                          mStatus === 'Inactive' ? 'bg-slate-400' : 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                                        }`} />
                                        <span>{mStatus}</span>
                                        {m.email !== user?.email && <ChevronDown className="w-3 h-3 opacity-60" />}
                                      </button>

                                      {activeStatusDropdown === m.email && (
                                        <>
                                          <div className="fixed inset-0 z-40" onClick={() => setActiveStatusDropdown(null)} />
                                          <div className={`absolute left-0 w-32 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl z-50 py-1.5 animate-in fade-in duration-200 ${
                                            (index >= paginatedMembersList.length - 2 && paginatedMembersList.length > 2)
                                              ? 'bottom-full mb-1.5 origin-bottom slide-in-from-bottom-2'
                                              : 'top-full mt-1.5 origin-top slide-in-from-top-2'
                                          }`}>
                                            {['Active', 'Inactive'].map((s) => (
                                              <button
                                                key={s}
                                                onClick={() => {
                                                  handleToggleUserStatus(m.email);
                                                  setActiveStatusDropdown(null);
                                                }}
                                                className={`w-full px-4 py-2 text-left text-[10px] font-bold transition-colors flex items-center gap-2 ${
                                                  mStatus === s
                                                    ? 'bg-slate-50 dark:bg-white/5 text-emerald-600 dark:text-emerald-400'
                                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                                                }`}
                                              >
                                                <div className={`w-1.5 h-1.5 rounded-full ${
                                                  s === 'Inactive' ? 'bg-slate-400' : 'bg-emerald-500'
                                                }`} />
                                                {s}
                                              </button>
                                            ))}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center justify-center gap-3">
                                      <button
                                        onClick={() => handleToggleMFA(m)}
                                        className={`group relative inline-flex h-[28px] w-[52px] shrink-0 cursor-pointer items-center rounded-full border transition-all duration-500 ease-out focus:outline-none focus:ring-2 focus:ring-indigo-500/50 hover:shadow-md ${
                                          m.mfa 
                                            ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)] border-emerald-400' 
                                            : 'bg-slate-100 dark:bg-slate-800/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] border-slate-200/80 dark:border-white/10'
                                        }`}
                                        role="switch"
                                        aria-checked={m.mfa}
                                        title={`MFA is ${m.mfa ? 'Enabled' : 'Disabled'}`}
                                      >
                                        {m.mfa && (
                                          <span className="absolute inset-0 rounded-full bg-emerald-400 blur-[6px] opacity-40" />
                                        )}
                                        <span className="sr-only">Toggle MFA</span>
                                        <span
                                          aria-hidden="true"
                                          className={`pointer-events-none absolute left-[3px] h-[20px] w-[20px] transform rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.2)] transition-transform duration-500 ease-out flex items-center justify-center ${
                                            m.mfa ? 'translate-x-[24px]' : 'translate-x-0'
                                          }`}
                                        >
                                          {m.mfa ? (
                                            <ShieldCheck className="w-[10px] h-[10px] text-emerald-500" strokeWidth={3} />
                                          ) : (
                                            <ShieldOff className="w-[10px] h-[10px] text-slate-400 dark:text-slate-500" strokeWidth={3} />
                                          )}
                                        </span>
                                      </button>
                                      <div className="flex flex-col items-start min-w-[36px]">
                                        <span className={`text-[10px] font-black tracking-widest uppercase transition-colors duration-300 ${
                                          m.mfa ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                                        }`}>
                                          {m.mfa ? 'ON' : 'OFF'}
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    {m.role?.toLowerCase() !== 'admin' && (
                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          onClick={() => handleEditMember(m)}
                                          className="p-2 w-8 h-8 flex items-center justify-center bg-white dark:bg-[#0f172a] text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 border border-slate-200/50 dark:border-white/5 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105"
                                          title="Edit Member"
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => removeMember(m.email, m.role)}
                                          className="p-2 w-8 h-8 flex items-center justify-center bg-white dark:bg-[#0f172a] text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/20 border border-slate-200/50 dark:border-white/5 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105"
                                          title="Remove Member"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalMemberPages}
                        onPageChange={setCurrentPage}
                        pageSize={pageSize}
                        onPageSizeChange={(newSize) => {
                          setPageSize(newSize);
                          setCurrentPage(1);
                        }}
                        totalResults={filteredMembersList.length}
                        className="border-t border-slate-100 dark:border-white/5 px-6"
                      />
                    </div>
                  </div>
                </div>

                {/* Permission Matrix */}
                <div className="bg-white dark:bg-[#0f172a] border border-slate-200/60 dark:border-white/5 shadow-sm dark:shadow-2xl rounded-[2.5rem] p-8 lg:p-10 relative overflow-hidden group/permission">
                  <div className="absolute inset-0 bg-slate-50/30 dark:bg-slate-900/30 backdrop-blur-[4px] z-20 flex flex-col items-center justify-center text-center p-6 opacity-0 group-hover/permission:opacity-100 transition-all duration-500 pointer-events-none group-hover/permission:pointer-events-auto">
                    <div className="w-12 h-12 bg-white dark:bg-[#020617] rounded-2xl flex items-center justify-center mb-4 shadow-xl border border-slate-200 dark:border-white/10 scale-90 group-hover/permission:scale-100 transition-transform duration-500">
                      <Cpu className="w-6 h-6 text-indigo-500 animate-pulse" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Advanced RBAC Engine</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[280px]">granular role-based access control is currently in development for Version 2.0</p>
                    <div className="mt-4 px-3 py-1 bg-indigo-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20">Available in Next Release</div>
                  </div>

                  <div className="relative z-10 transition-all duration-500 group-hover/permission:blur-[2px] group-hover/permission:grayscale-[0.5] group-hover/permission:opacity-40 group-hover/permission:scale-[0.98]">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-indigo-500" /> Role-Based Permissions
                      </h2>
                      <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded border border-indigo-100 dark:border-indigo-500/20 uppercase tracking-widest">Beta Access Path</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-6 font-medium">Configure deep structural permissions for your organization. Admin role always has full system overrides.</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                          <tr>
                            <th className="px-6 py-3 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Role</th>
                            <th className="px-6 py-3 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Create</th>
                            <th className="px-6 py-3 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Edit</th>
                            <th className="px-6 py-3 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Delete</th>
                            <th className="px-6 py-3 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Approve</th>
                            <th className="px-6 py-3 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Invite</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                          {/* Admin Row (always full access) */}
                          <tr className="border-b border-slate-100 dark:border-white/5 bg-indigo-50/30 dark:bg-indigo-500/5">
                            <td className="px-6 py-3 text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Admin</td>
                            {['create', 'edit', 'delete', 'approve', 'invite'].map((action) => (
                              <td key={action} className="px-6 py-3">
                                <div className="flex justify-center">
                                  <div className="w-4 h-4 rounded border bg-indigo-500 border-indigo-500 text-white shadow-md shadow-indigo-500/20 flex items-center justify-center">
                                    <Check className="w-3 h-3" />
                                  </div>
                                </div>
                              </td>
                            ))}
                          </tr>
                          {Object.keys(permissions).map((role) => (
                            <tr key={role} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                              <td className="px-6 py-3 text-[10px] font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">{role}</td>
                              {['create', 'edit', 'delete', 'approve', 'invite'].map((action) => (
                                <td key={action} className="px-6 py-3">
                                  <div className="flex justify-center">
                                    <button
                                      className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${permissions?.[role]?.[action] ? "bg-indigo-500 border-indigo-500 text-white shadow-md shadow-indigo-500/20" : "bg-white dark:bg-[#020617] border-slate-200 dark:border-white/10 text-transparent"}`}
                                    >
                                      <Check className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* View: Approval Workflows */}
            {activeTab === "Approval Workflows" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white dark:bg-[#0f172a] border border-slate-200/60 dark:border-white/5 shadow-sm dark:shadow-2xl rounded-[2.5rem] p-8 lg:p-10 relative overflow-hidden group hover:border-indigo-500/30 transition-colors">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/5 rounded-full blur-[80px] -mr-40 -mt-40 pointer-events-none" />

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 relative z-10">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <LinkIcon className="w-5 h-5 text-indigo-500" /> Approval Workflow Templates
                      </h2>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2 ml-8 max-w-md">Drag-and-drop approver sequences and tie them to SLA timelines.</p>
                    </div>
                    <button
                      onClick={() => {
                        setIsViewOnly(false);
                        setWorkflowName("");
                        setWorkflowSteps([{ id: Date.now(), name: "", reviewerEmail: "", role: "Manager", sla: 1, email: true, escalate: true, searchTerm: "" }]);
                        setShowWorkflowModal(true);
                      }}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> New Workflow
                    </button>
                  </div>

                  <div className="space-y-6 relative z-10">
                    {(Array.isArray(workflows) ? workflows : []).map((wf) => (
                      <div key={wf?.id || Math.random()} className="border border-slate-200 dark:border-white/10 rounded-2xl bg-white dark:bg-[#020617] shadow-sm overflow-hidden mb-6">
                        <div className="flex flex-wrap items-center justify-between p-5 border-b border-slate-100 dark:border-white/5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-indigo-500 shadow-inner">
                              <LinkIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <h3 className="text-[15px] font-bold text-slate-900 dark:text-white leading-tight">{wf?.name || 'Untitled Workflow'}</h3>
                              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-2 py-0.5 rounded-md mt-1.5 inline-block">{wf?.scope || wf?.department}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => openWorkflowView(wf)}
                              className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <div className="w-[1px] h-4 bg-slate-200 dark:bg-white/10" />
                            <button onClick={() => handleDeleteWorkflow(wf.id || wf.workflow_id || wf._id)} className="text-slate-400 hover:text-rose-500 transition-colors p-1">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="p-5 flex items-center gap-4 overflow-x-auto custom-scrollbar">
                          {(wf?.steps || []).map((s, i) => (
                            <div key={i} className="flex items-center gap-4 shrink-0">
                              <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-xl min-w-[170px] shadow-sm relative overflow-hidden group/step">
                                <div className={`absolute top-0 left-0 w-6 h-6 bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center rounded-br-lg`}>{i + 1}</div>
                                <div className="p-4 pt-5">
                                  <h4 className="text-[13px] font-bold text-slate-900 dark:text-white mt-1 mb-3 flex items-center gap-2">
                                    {s?.step_name || s?.name || `Step ${i + 1}`}
                                    {s?.role === 'Group' && <span className="text-[8px] bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/30 uppercase tracking-widest">Group</span>}
                                  </h4>
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-1.5 overflow-hidden" title={s?.user_email || s?.reviewerEmail || s?.email || 'Unassigned'}>
                                      <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate pr-2">
                                        {s?.user_email || s?.reviewerEmail || s?.email || 'Unassigned'}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded border border-indigo-100 dark:border-indigo-500/20 flex items-center gap-1 shadow-inner">
                                        <Clock className="w-3 h-3" /> SLA: {s?.sla_days || s?.sla || 0}d
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              {i < (wf?.steps?.length || 0) - 1 && <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "Integrations" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white dark:bg-[#0f172a] border border-slate-200/60 dark:border-white/5 shadow-sm dark:shadow-2xl rounded-[2.5rem] p-8 lg:p-10 relative overflow-hidden transition-colors">

                  <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-[80px] -mr-40 -mt-40 pointer-events-none" />

                  <div className="relative z-10 transition-all duration-500">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                          <Zap className="w-5 h-5 text-indigo-500" /> Enterprise Ecosystem
                        </h2>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2 ml-8 max-w-xl">Synchronize your job framework with external HRIS, ATS, and LMS platforms to maintain a single source of truth.</p>
                      </div>
                      <button className="px-5 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold flex items-center gap-2">
                        Documentation <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {[
                        {
                          name: "Cornerstone (CSOD)",
                          category: "LMS",
                          status: "Configured",
                          desc: "Export approved JDs directly to the Cornerstone Learning & Talent portal.",
                          icon: Layers,
                          color: "purple"
                        },
                        {
                          name: "PDF Import",
                          category: "LMS",
                          status: "Configured",
                          desc: "Import approved JDs directly into the Job library from PDF documents.",
                          icon: RefreshCw,
                          color: "blue"
                        },
                        {
                          name: "Workday HCM",
                          category: "HRIS",
                          status: "Active",
                          desc: "Bi-directional sync for departments, job families, and employee records.",
                          icon: Globe,
                          color: "indigo"
                        },
                        {
                          name: "DDI Systems",
                          category: "Assessment",
                          status: "Configured",
                          desc: "Seamlessly integrate with DDI behavioral and leadership assessments.",
                          icon: ShieldCheck,
                          color: "blue"
                        },
                        {
                          name: "Greenhouse",
                          category: "ATS",
                          status: "Available",
                          desc: "Auto-create job posts from finalized JDs with customized templates.",
                          icon: Briefcase,
                          color: "emerald"
                        },
                        {
                          name: "SAP SuccessFactors",
                          category: "HRIS",
                          status: "Available",
                          desc: "Synchronize organizational structures and competency mappings.",
                          icon: Cpu,
                          color: "blue"
                        },
                        {
                          name: "Custom Webhooks",
                          category: "Developer",
                          status: "Active",
                          desc: "Trigger external events when JDs are approved, rejected, or finalized.",
                          icon: LinkIcon,
                          color: "rose"
                        },
                        {
                          name: "BambooHR",
                          category: "HRIS",
                          status: "Available",
                          desc: "Lightweight sync for small to medium business employee management.",
                          icon: Activity,
                          color: "orange"
                        },
                        {
                          name: "iCIMS",
                          category: "ATS",
                          status: "Available",
                          desc: "Export JDs and sync requisition fields directly to your iCIMS talent platform.",
                          icon: FolderGit2,
                          color: "indigo"
                        }
                      ].map((int, i) => {
                        const isAvailable = int.name === "Cornerstone (CSOD)" || int.name === "PDF Import" || int.name === "DDI Systems";
                        return (
                          <div key={i} className="relative group/card flex flex-col">
                            {!isAvailable && (
                              <div className="absolute inset-0 bg-slate-50/60 dark:bg-slate-900/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center text-center p-4 opacity-0 group-hover/card:opacity-100 transition-all duration-300 rounded-3xl pointer-events-none group-hover/card:pointer-events-auto">
                                <Zap className="w-5 h-5 text-indigo-500 mb-2 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg shadow-sm border border-indigo-100 dark:border-indigo-500/20">Next Release</span>
                              </div>
                            )}
                            <div className={`flex flex-col bg-slate-50/50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-3xl p-6 h-full transition-all duration-300 ${!isAvailable ? 'group-hover/card:blur-[2px] group-hover/card:grayscale-[0.5] group-hover/card:opacity-60' : ''}`}>
                              <div className="flex items-start justify-between mb-6">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner border border-slate-200 dark:border-white/10 bg-white dark:bg-[#020617] text-slate-400`}>
                                  <int.icon className="w-6 h-6" />
                                </div>
                                <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border bg-slate-100 text-slate-400 border-slate-200 dark:bg-white/5 dark:border-white/10">
                                  {isAvailable ? int.status : 'Coming Soon'}
                                </span>
                              </div>
                              <h4 className="text-[15px] font-bold text-slate-900 dark:text-white mb-2">{int.name}</h4>
                              <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium mb-6 flex-grow">{int.desc}</p>
 
                              <div className="flex items-center justify-between pt-4 border-t border-slate-200/50 dark:border-white/5 mt-auto">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{int.category}</span>
                                <button 
                                  onClick={() => {
                                    if (int.name === "Cornerstone (CSOD)") {
                                      navigate("/admin/push-csod?mode=sync");
                                    } else if (int.name === "PDF Import") {
                                      navigate("/admin/push-csod?mode=import");
                                    }
                                  }}
                                  className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-slate-400 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                                >
                                  {isAvailable ? (int.status === 'Available' ? 'Connect' : 'Manage Settings') : 'Learn More'}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-12 p-8 bg-indigo-600 rounded-[2rem] relative overflow-hidden group/cta">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
                      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="text-center md:text-left">
                          <h3 className="text-xl font-bold text-white mb-2">Need a custom integration?</h3>
                          <p className="text-indigo-100 text-sm font-medium">Our API allows you to build custom connectors for your unique tech stack.</p>
                        </div>
                        <button className="whitespace-nowrap px-8 py-3 bg-white text-indigo-600 rounded-xl font-bold text-sm">
                          Request API Keys
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* View: Terms & Conditions */}
            {activeTab === "Terms & Conditions" && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">

                {/* Editor / Form Card */}
                <div
                  ref={termsEditorRef}
                  className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-2xl rounded-[2.5rem] p-8 lg:p-10 relative overflow-visible scroll-mt-6"
                >
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                          <ScrollText className="w-5 h-5 text-indigo-500" />
                          {editingTermsId ? 'Edit Terms & Conditions' : 'Create Terms & Conditions'}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 ml-8">
                          This will be displayed to end users when they review job descriptions.
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {termsForm.content && (
                          <button
                            onClick={() => setTermsPreviewMode(p => !p)}
                            className="px-4 py-2 bg-white dark:bg-[#020617] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-white/5 transition-all flex items-center gap-2 shadow-sm"
                          >
                            <Eye className="w-4 h-4 text-indigo-500" />
                            {termsPreviewMode ? 'Edit' : 'Preview'}
                          </button>
                        )}
                        {editingTermsId && (
                          <button
                            onClick={() => { setEditingTermsId(null); setTermsForm({ content: '', is_active: true }); setTermsPreviewMode(false); }}
                            className="px-4 py-2 bg-white dark:bg-[#020617] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
                          >
                            <X className="w-4 h-4" /> Cancel Edit
                          </button>
                        )}
                      </div>
                    </div>

                    {/* is_active toggle */}
                    <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-200 dark:border-white/10">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Set as Active Policy</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Only one policy is shown to users at a time. Activating this will deactivate the current one.</p>
                      </div>
                      <button
                        onClick={() => setTermsForm(p => ({ ...p, is_active: !p.is_active }))}
                        className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${termsForm.is_active ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${termsForm.is_active ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    {/* Editor or Preview */}
                    {termsPreviewMode ? (
                      <TermsMarkdown content={termsForm.content} className="tc-markdown-body py-2" />
                    ) : (
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2.5">
                          Content
                        </label>
                        <RichTextEditor
                          value={termsForm.content}
                          onChange={e => setTermsForm(p => ({ ...p, content: e.target.value }))}
                          placeholder="Start with a section title (H1/H2), then add numbered clauses (H3) and body text…"
                        />
                      </div>
                    )}

                    {/* Save button */}
                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={handleSaveTerms}
                        disabled={isSavingTerms || !termsForm.content.trim()}
                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-2xl flex items-center gap-2.5 shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98]"
                      >
                        {isSavingTerms ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {isSavingTerms ? 'Saving...' : editingTermsId ? 'Update Policy' : 'Publish Policy'}
                      </button>
                    </div>
                </div>

                {/* Existing Records */}
                <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-2xl rounded-[2.5rem] p-8 lg:p-10 relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-indigo-500" /> Published Policies
                      </h3>
                      <button
                        onClick={fetchTermsList}
                        disabled={isLoadingTerms}
                        className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-all"
                        title="Refresh"
                      >
                        <RefreshCw className={`w-4 h-4 ${isLoadingTerms ? 'animate-spin' : ''}`} />
                      </button>
                    </div>

                    {isLoadingTerms ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                      </div>
                    ) : termsList.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-14 h-14 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center mb-3">
                          <ScrollText className="w-7 h-7 text-slate-300 dark:text-slate-600" />
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">No policies published yet.</p>
                        <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Create one using the form above.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {termsList.map((term) => (
                          <div
                            key={term.tc_id || term.id}
                            className={`flex items-start justify-between gap-4 p-5 rounded-2xl border transition-all ${term.is_active
                              ? 'border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/30 dark:bg-indigo-500/5 shadow-sm shadow-indigo-500/5'
                              : 'border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]'
                              }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                {term.is_active ? (
                                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-100 dark:border-emerald-500/20 uppercase tracking-widest">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Active
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 rounded-full border border-slate-200 dark:border-white/10 uppercase tracking-widest">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                    Inactive
                                  </span>
                                )}
                                {term.created_at && (
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                    {new Date(term.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                {termsPlainExcerpt(term.content)}
                              </p>
                              {term.is_active && (
                                <Link
                                  to="/terms"
                                  className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold mt-2 underline underline-offset-2 transition-colors"
                                >
                                  View public page <ExternalLink className="w-3 h-3" />
                                </Link>
                              )}
                            </div>
                            <div className="flex items-center gap-2.5">
                              {term.is_active ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleToggleTermsActive(term);
                                  }}
                                  className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-600 dark:bg-rose-500/10 dark:hover:bg-rose-600 text-rose-600 hover:text-white dark:text-rose-400 dark:hover:text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 border border-rose-100 dark:border-rose-500/20 hover:border-transparent mr-1"
                                  title="Deactivate Policy"
                                >
                                  Deactivate
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleToggleTermsActive(term);
                                  }}
                                  className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-600 dark:bg-emerald-500/10 dark:hover:bg-emerald-600 text-emerald-600 hover:text-white dark:text-emerald-400 dark:hover:text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 border border-emerald-100 dark:border-emerald-500/20 hover:border-transparent mr-1"
                                  title="Activate Policy"
                                >
                                  Activate
                                </button>
                              )}
                              <button
                                onClick={() => handleEditTerms(term)}
                                className="shrink-0 p-2.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all border border-transparent hover:border-indigo-100 dark:hover:border-indigo-500/20"
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTerms(term.tc_id || term.id)}
                                className="shrink-0 p-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all border border-transparent hover:border-rose-100 dark:hover:border-rose-500/20"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}







            {/* Modern Glass Modal: New Workflow */}
            {showWorkflowModal && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
                <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-300 pointer-events-none" />

                <div className="bg-white dark:bg-[#0f172a] rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.2)] dark:shadow-[0_0_50px_rgba(99,102,241,0.1)] border border-slate-200 dark:border-white/10 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col relative z-10 animate-in zoom-in-95 duration-300">

                  {/* Modal Header */}
                  <div className="bg-white/80 dark:bg-[#020617]/80 backdrop-blur-xl border-b border-slate-100 dark:border-white/5 px-8 py-5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                        <LinkIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{isViewOnly ? "Workflow Details" : "New Workflow"}</h2>
                        <p className="text-[13px] text-slate-500 font-medium">{isViewOnly ? "Review the configuration of this approval sequence" : "Define approver sequence, SLA timings, and notification channels"}</p>
                      </div>
                    </div>
                    <button onClick={() => setShowWorkflowModal(false)} className="w-10 h-10 flex items-center justify-center bg-transparent border border-slate-200 dark:border-white/10 rounded-full hover:bg-slate-50 dark:hover:bg-white/5 text-slate-500 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Modal Scroll Content */}
                  <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8 bg-white dark:bg-transparent">

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-2">Workflow Name <span className="text-red-500">*</span></label>
                        <input type="text" value={workflowName} readOnly={isViewOnly} onChange={e => setWorkflowName(e.target.value)} placeholder="e.g. Engineering Exec (4-step)" className="w-full px-4 py-2.5 bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-white/10 rounded-xl text-[15px] font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-900 dark:text-white" />
                      </div>
                      <div className="hidden">
                        <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-2">Apply To</label>
                        <select value={workflowApplyTo} disabled={isViewOnly} onChange={e => setWorkflowApplyTo(e.target.value)} className="w-full px-4 py-2.5 bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-white/10 rounded-xl text-[15px] font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-900 dark:text-white appearance-none">
                          <option>All departments</option>
                          <option>Engineering</option>
                          <option>Product</option>
                          <option>Design</option>
                          <option>Sales</option>
                        </select>
                      </div>
                    </div>

                    {/* Active Toggle */}
                    <div className="bg-slate-50/50 dark:bg-white/5 border border-indigo-100 dark:border-indigo-500/20 p-5 rounded-2xl flex items-center gap-4 hidden">
                      <button
                        onClick={() => !isViewOnly && setWorkflowActive(!workflowActive)}
                        className={`w-14 h-8 rounded-full p-1 transition-colors duration-200 relative ${workflowActive ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                      >
                        <div className={`w-6 h-6 bg-white rounded-full transition-transform duration-200 shadow-sm ${workflowActive ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                      <div>
                        <h4 className={`text-[15px] font-bold ${workflowActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}`}>Active</h4>
                        <p className="text-[13px] text-slate-500">This workflow will be applied immediately upon saving</p>
                      </div>
                    </div>

                    <div>
                      <div className="mb-6 px-1">
                        <div className="flex items-center flex-wrap gap-2 mb-1">
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">Approval Steps</h3>
                          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-400 px-2 py-0.5 rounded-full">{workflowSteps.length} step{workflowSteps.length !== 1 ? 's' : ''}</span>
                        </div>
                        <p className="text-[13px] text-slate-500">Define each approver in sequence. Total SLA: <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{workflowSteps.reduce((acc, s) => acc + s.sla, 0)} business days</strong></p>
                      </div>

                      <div className="space-y-4 relative w-full overflow-hidden px-1">

                        {workflowSteps.map((step, index) => (
                          <div key={step.id} className="flex gap-4 relative" style={{ zIndex: 50 - index }}>
                            {/* Connecting Line (Only shows if there are multiple, and doesn't extend past the last node) */}
                            <div className="w-10 flex flex-col items-center shrink-0">
                              <button
                                onClick={(e) => { e.stopPropagation(); !isViewOnly && moveWorkflowStep(index, -1); }}
                                disabled={index === 0 || isViewOnly}
                                className={`p-1 rounded transition-colors ${index === 0 || isViewOnly ? 'text-slate-200 dark:text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10'}`}
                              ><ChevronUp className="w-4 h-4" /></button>
                              <div className={`w-8 h-8 rounded-full font-bold text-sm flex items-center justify-center border-2 z-10 
                               ${index === 0 ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'}`}>
                                {index + 1}
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); !isViewOnly && moveWorkflowStep(index, 1); }}
                                disabled={index === workflowSteps.length - 1 || isViewOnly}
                                className={`p-1 rounded transition-colors ${index === workflowSteps.length - 1 || isViewOnly ? 'text-slate-200 dark:text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10'}`}
                              ><ChevronDown className="w-4 h-4" /></button>
                              {/* Connecting Line */}
                              {index < workflowSteps.length - 1 && (
                                <div className="w-[1px] h-full bg-slate-200 dark:bg-slate-700 my-2" />
                              )}
                            </div>

                            <div className={`flex-1 bg-white dark:bg-[#0f172a] border rounded-2xl p-5 shadow-sm transition-all group ${step.type === 'group' ? 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/10' : 'border-slate-200 dark:border-white/10'}`}>
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-6">
                                  <div className="col-span-3 space-y-4">
                                    <div>
                                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Step Name</label>
                                      <div className="relative">
                                        <input
                                          type="text"
                                          value={step.name}
                                          readOnly={isViewOnly}
                                          onChange={(e) => updateWorkflowStep(step.id, 'name', e.target.value)}
                                          placeholder="e.g. Standard JD Review"
                                          className={`w-full px-4 py-2.5 bg-white dark:bg-[#020617] border rounded-xl text-[14px] font-bold outline-none focus:border-indigo-500 transition-colors ${step.type === 'group' ? 'border-emerald-200 dark:border-emerald-500/40 text-emerald-900 dark:text-emerald-400' : 'border-slate-200 dark:border-white/10 text-slate-900 dark:text-white'}`}
                                        />

                                      </div>
                                    </div>

                                    <div>
                                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Assign Reviewer <span className="text-rose-500">*</span></label>
                                      <div className="relative group/search">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within/search:text-indigo-500 transition-colors pointer-events-none" />
                                        <input
                                          type="text"
                                          value={step.searchTerm || ""}
                                          readOnly={isViewOnly}
                                          onChange={(e) => {
                                            if (isViewOnly) return;
                                            const val = e.target.value;
                                            updateWorkflowStep(step.id, 'searchTerm', val);
                                            updateWorkflowStep(step.id, 'hideDropdown', false);
                                            if (!val) updateWorkflowStep(step.id, 'reviewerEmail', "");
                                          }}
                                          placeholder="Search by name or email..."
                                          className={`w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#020617] border rounded-xl text-[14px] font-bold outline-none transition-all text-slate-900 dark:text-white shadow-sm
                                       ${workflowSteps.some(s => s.reviewerEmail === step.reviewerEmail && s.reviewerEmail !== "" && s.id !== step.id)
                                              ? 'border-rose-500 focus:border-rose-600 focus:ring-rose-500/10 ring-2 ring-rose-500/10'
                                              : 'border-slate-200 dark:border-white/10 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'}`}
                                        />
                                        {workflowSteps.some(s => s.reviewerEmail === step.reviewerEmail && s.reviewerEmail !== "" && s.id !== step.id) && (
                                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-500 animate-in fade-in zoom-in duration-200">
                                            <AlertTriangle className="w-4 h-4" />
                                          </div>
                                        )}

                                        {step.searchTerm && !step.hideDropdown && !isViewOnly && (
                                          <div className="absolute z-[30] w-full mt-1 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
                                            {teamMembers
                                              .filter(m => m.role === 'Manager' && ((m.name || '').toLowerCase().includes((step.searchTerm || '').toLowerCase()) ||
                                                (m.email || '').toLowerCase().includes((step.searchTerm || '').toLowerCase())))
                                              .map(m => (
                                                <button
                                                  key={m.id}
                                                  onClick={() => {
                                                    if (workflowSteps.some(s => s.reviewerEmail === m.email && s.id !== step.id)) {
                                                      toast.error(`"${m.email}" is already assigned to another step.`);
                                                      return;
                                                    }
                                                    updateWorkflowStep(step.id, 'reviewerEmail', m.email);
                                                    updateWorkflowStep(step.id, 'searchTerm', m.email);
                                                    updateWorkflowStep(step.id, 'hideDropdown', true);
                                                  }}
                                                  className="w-full px-4 py-3 text-left hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors border-b last:border-none border-slate-50 dark:border-white/5 flex items-center justify-between group/item"
                                                >
                                                  <div>
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 transition-colors">{m.name}</p>
                                                    <p className="text-[10px] text-slate-500 font-medium">{m.email}</p>
                                                  </div>
                                                  <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-400 group-hover/item:bg-indigo-100 dark:group-hover/item:bg-indigo-500/20 group-hover/item:text-indigo-600 transition-all">{m.role}</span>
                                                </button>
                                              ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-4">
                                      <div>
                                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Notify via</label>
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => !isViewOnly && updateWorkflowStep(step.id, 'email', !step.email)}
                                            className={`px-3 py-1.5 rounded-lg border text-[13px] font-medium flex items-center gap-2 transition-all
                                                   ${step.email ? 'border-slate-300 dark:border-slate-600 bg-white dark:bg-[#020617] text-slate-800 dark:text-slate-200 shadow-sm' : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 text-slate-400 hover:bg-slate-100'}`}
                                          >
                                            <Mail className={`w-4 h-4 ${step.email ? 'text-indigo-600' : 'text-slate-400'}`} /> Email
                                          </button>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3 mt-4 sm:mt-6">
                                        <button
                                          onClick={() => !isViewOnly && updateWorkflowStep(step.id, 'escalate', !step.escalate)}
                                          className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 relative shrink-0 ${step.escalate ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                                        >
                                          <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow-sm ${step.escalate ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </button>
                                        <div className="flex items-center gap-1.5 text-[12px] text-slate-500 font-medium whitespace-nowrap">
                                          <Clock className="w-3.5 h-3.5 text-slate-400" /> Auto-escalate on SLA breach
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="col-span-2 flex flex-col items-end">
                                    <div className="w-full max-w-[140px]">
                                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">SLA (days)</label>
                                      <div className="flex items-center justify-between gap-1">
                                        <button
                                          onClick={() => !isViewOnly && updateWorkflowStep(step.id, 'sla', Math.max(1, step.sla - 1))}
                                          disabled={isViewOnly}
                                          className="w-8 h-8 rounded-full border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                                        >-</button>
                                        <div className="px-4 py-2 bg-indigo-50/50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl text-indigo-700 dark:text-indigo-400 font-bold text-sm min-w-[50px] text-center">
                                          {step.sla}d
                                        </div>
                                        <button
                                          onClick={() => !isViewOnly && updateWorkflowStep(step.id, 'sla', step.sla + 1)}
                                          disabled={isViewOnly}
                                          className="w-8 h-8 rounded-full border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                                        >+</button>
                                      </div>
                                    </div>
                                    {!isViewOnly && (
                                      <button
                                        onClick={() => removeWorkflowStep(step.id)}
                                        disabled={workflowSteps.length === 1}
                                        className={`mt-auto p-2 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-100 transition-colors self-end ${workflowSteps.length === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}

                        {!isViewOnly && (
                          <div className="flex justify-center pt-4 relative z-0 ml-10">
                            <button
                              onClick={addWorkflowStep}
                              className="w-full py-3.5 bg-white dark:bg-transparent border-2 border-dashed border-indigo-200 dark:border-indigo-500/30 rounded-xl text-[14px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/5 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all flex items-center justify-center gap-2"
                            >
                              <Plus className="w-4 h-4" /> Add Approval Step
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full border border-amber-500 text-amber-600 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">i</div>
                      <p className="text-[13px] text-amber-800 dark:text-amber-400 leading-relaxed font-medium">If an approver does not action within the SLA window, the system will auto-escalate to the next approver and notify HR. Ensure all roles listed here exist in your Team & Permissions settings.</p>
                    </div>

                  </div>

                  <div className="bg-white dark:bg-[#020617] border-t border-slate-100 dark:border-white/5 px-8 py-5 flex items-center justify-between shrink-0">
                    <button onClick={() => setShowWorkflowModal(false)} className="px-6 py-2.5 bg-white dark:bg-transparent border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 font-bold text-[14px] rounded-xl transition-all">Cancel</button>
                    {!isViewOnly && (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={saveWorkflow}
                          disabled={hasDuplicateReviewers || !workflowName.trim() || workflowSteps.some(s => !s.reviewerEmail)}
                          className={`px-8 py-2.5 font-bold text-[14px] rounded-xl flex items-center gap-2 transition-all shadow-md 
                      ${(hasDuplicateReviewers || !workflowName.trim() || workflowSteps.some(s => !s.reviewerEmail))
                              ? 'bg-slate-100 dark:bg-white/5 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-white/10 shadow-none'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'}`}
                        >
                          <LinkIcon className="w-4 h-4" /> Create Workflow
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}

            {/* Member Creation Modal */}
            {showCreateMemberModal && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[8px] animate-in fade-in duration-500" onClick={() => !isCreatingMember && setShowCreateMemberModal(false)} />
                <div className="relative bg-white dark:bg-[#0f172a] rounded-[2.5rem] border border-slate-200 dark:border-white/10 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300 z-10 overflow-hidden text-left">
                  {/* Mesh Background Decorations */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] -ml-32 -mb-32 pointer-events-none" />

                  <div className="relative z-10">
                    <div className="px-8 pt-8 pb-6 border-b border-slate-100 dark:border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shadow-inner">
                            <UserPlus className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Create Member</h3>
                            <p className="text-xs text-slate-500 font-medium">Add a new user to your organization workspace</p>
                          </div>
                        </div>
                        <button onClick={() => setShowCreateMemberModal(false)} className="p-2 h-10 w-10 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all outline-none focus:ring-2 focus:ring-indigo-500/20"><X className="w-5 h-5" /></button>
                      </div>
                    </div>

                    <div className="p-8 space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2">
                          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2.5">Full Name</label>
                          <div className="relative">
                            <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              type="text"
                              value={memberForm.full_name}
                              onChange={e => setMemberForm(p => ({ ...p, full_name: e.target.value }))}
                              placeholder="e.g. John Doe"
                              className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 dark:text-white font-sans"
                            />
                          </div>
                        </div>

                        <div className="col-span-2">
                          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2.5">Email Address</label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              type="email"
                              value={memberForm.email}
                              onChange={e => setMemberForm(p => ({ ...p, email: e.target.value }))}
                              placeholder="john@company.com"
                              className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 dark:text-white font-sans"
                            />
                          </div>
                        </div>

                        <div className="col-span-2">
                          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2.5">Password</label>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              type={showPassword ? "text" : "password"}
                              value={memberForm.password}
                              onChange={e => setMemberForm(p => ({ ...p, password: e.target.value }))}
                              placeholder="••••••••"
                              className="w-full pl-11 pr-12 py-3 bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 dark:text-white font-sans"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div className="col-span-2">
                          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2.5">Assigned Role</label>
                          <div className="grid grid-cols-3 gap-3">
                            {['Admin', 'Manager', 'HR'].map((role) => (
                              <button
                                key={role}
                                onClick={() => setMemberForm(p => ({ ...p, role }))}
                                className={`
                            px-4 py-3 rounded-2xl border-2 text-[10px] font-extrabold uppercase tracking-widest transition-all flex flex-col items-center gap-1.5
                            ${memberForm.role === role
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                    : 'bg-white dark:bg-[#020617] border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:border-indigo-500/30'}
                          `}
                              >
                                <Shield className={`w-3.5 h-3.5 ${memberForm.role === role ? 'text-white' : 'text-slate-400'}`} />
                                {role}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="px-8 pb-8 flex items-center gap-4">
                      <button
                        onClick={() => setShowCreateMemberModal(false)}
                        disabled={isCreatingMember}
                        className="flex-1 py-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 font-bold text-sm rounded-[1.5rem] hover:bg-slate-100 transition-all disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateMember}
                        disabled={isCreatingMember}
                        className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-[1.5rem] flex items-center justify-center gap-2 transition-all shadow-xl shadow-indigo-500/30 active:scale-[0.98] disabled:opacity-50"
                      >
                        {isCreatingMember ? (
                          <>
                            <Activity className="w-4 h-4 animate-spin" />
                            CREATING...
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4" />
                            CREATE MEMBER
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Enduser Creation Modal */}
            {showCreateEndUserModal && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[8px] animate-in fade-in duration-500" onClick={() => !isCreatingEndUser && setShowCreateEndUserModal(false)} />
                <div className="relative bg-white dark:bg-[#0f172a] rounded-[2.5rem] border border-slate-200 dark:border-white/10 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300 z-10 overflow-hidden text-left">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />

                  <div className="relative z-10">
                    <div className="px-8 pt-8 pb-6 border-b border-slate-100 dark:border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center shadow-inner">
                            <Plus className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Create Enduser</h3>
                            <p className="text-xs text-slate-500 font-medium">Add a candidate user for JD allotment</p>
                          </div>
                        </div>
                        <button onClick={() => setShowCreateEndUserModal(false)} className="p-2 h-10 w-10 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all outline-none focus:ring-2 focus:ring-emerald-500/20"><X className="w-5 h-5" /></button>
                      </div>
                    </div>

                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = {
                        full_name: e.target.full_name.value,
                        email: e.target.email.value,
                        password: e.target.password.value,
                        employee_id: e.target.employee_id.value
                      };
                      handleCreateEndUser(formData);
                    }}>
                      <div className="p-8 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">Full Name</label>
                          <div className="relative">
                            <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              required
                              name="full_name"
                              type="text"
                              placeholder="e.g. Jane Smith"
                              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 dark:text-white font-sans"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">Email Address</label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              required
                              name="email"
                              type="email"
                              placeholder="jane.smith@example.com"
                              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 dark:text-white font-sans"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">Password</label>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              required
                              name="password"
                              type={showEndUserPassword ? "text" : "password"}
                              placeholder="••••••••"
                              className="w-full pl-11 pr-12 py-2.5 bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 dark:text-white font-sans"
                            />
                            <button
                              type="button"
                              onClick={() => setShowEndUserPassword(!showEndUserPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-500 transition-colors"
                            >
                              {showEndUserPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">Employee ID</label>
                          <div className="relative">
                            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              required
                              name="employee_id"
                              type="text"
                              placeholder="EMP_001"
                              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 dark:text-white font-sans"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="px-8 pb-8 flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => setShowCreateEndUserModal(false)}
                          disabled={isCreatingEndUser}
                          className="flex-1 py-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 font-bold text-sm rounded-[1.5rem] hover:bg-slate-100 transition-all disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isCreatingEndUser}
                          className="flex-[2] py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-[1.5rem] flex items-center justify-center gap-2 transition-all shadow-xl shadow-emerald-500/30 active:scale-[0.98] disabled:opacity-50"
                        >
                          {isCreatingEndUser ? (
                            <>
                              <Activity className="w-4 h-4 animate-spin" />
                              CREATING...
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4" />
                              CREATE ENDUSER
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* Import Users Modal */}
            {showImportUsersModal && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[8px] animate-in fade-in duration-500" onClick={() => { if (!isUploadingUsers) { setShowImportUsersModal(false); setSelectedImportFile(null); setShowImportInfo(false); } }} />
                <div className="relative bg-white dark:bg-[#0f172a] rounded-[2rem] border border-slate-200 dark:border-white/10 w-full max-w-3xl shadow-2xl animate-in zoom-in-95 duration-300 z-10 overflow-hidden text-left flex flex-col max-h-[85vh]">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/15 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />

                  <div className="relative z-10 flex flex-col flex-1 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 shrink-0 flex items-center justify-between bg-white dark:bg-[#0f172a]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-500/20 dark:to-indigo-500/20 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/30 rounded-[14px] flex items-center justify-center shadow-inner">
                          <FileUp className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Bulk Import Users</h3>
                          <p className="text-[10px] text-slate-500 font-medium mt-0.5">Upload an Excel or CSV file containing user details</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg w-[200px]">
                          <button
                            onClick={() => setImportType('regular')}
                            className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${importType === 'regular' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
                          >
                            Team Members
                          </button>
                          <button
                            onClick={() => setImportType('enduser')}
                            className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${importType === 'enduser' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
                          >
                            End Users
                          </button>
                        </div>
                        <button onClick={() => { setShowImportUsersModal(false); setSelectedImportFile(null); setShowImportInfo(false); }} className="p-1.5 h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all outline-none focus:ring-2 focus:ring-violet-500/20"><X className="w-4 h-4" /></button>
                      </div>
                    </div>

                    <div className="flex-1 flex overflow-hidden">
                      {/* Left Pane - Upload Area */}
                      <div className="flex-[3] p-6 overflow-y-auto custom-scrollbar border-r border-slate-100 dark:border-white/5 flex flex-col">
                        <form id="importUsersForm" onSubmit={handleImportUsers} className="flex-1 flex flex-col">
                          <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3">Select File</label>
                          <div className="flex-1 relative border-2 border-dashed border-violet-300 dark:border-violet-500/30 rounded-[1.5rem] p-6 flex flex-col items-center justify-center bg-gradient-to-br from-white to-violet-50/50 dark:from-slate-900/80 dark:to-violet-900/20 hover:border-violet-500 dark:hover:border-violet-400 transition-all group cursor-pointer shadow-sm hover:shadow-md hover:shadow-violet-500/10 min-h-[240px]">
                            {selectedImportFile ? (
                              <>
                                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(16,185,129,0.15)] border border-emerald-200 dark:border-emerald-500/30 transition-transform duration-300 scale-110">
                                  <Check className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <h4 className="text-xs font-black text-slate-900 dark:text-white mb-1 text-center px-4 truncate max-w-full">{selectedImportFile.name}</h4>
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold text-center">
                                  File ready to upload. Click or drag to change.
                                </p>
                              </>
                            ) : (
                              <>
                                <div className="w-12 h-12 bg-white dark:bg-[#020617] rounded-xl flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(139,92,246,0.15)] border border-violet-100 dark:border-violet-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                                  <FileUp className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                                </div>
                                <h4 className="text-xs font-black text-slate-900 dark:text-white mb-1 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">Click to upload or drag and drop</h4>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center max-w-[220px] leading-relaxed mt-1">
                                  Excel or CSV files only.
                                </p>
                              </>
                            )}
                            <input
                              required
                              name="file"
                              type="file"
                              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                              onChange={(e) => setSelectedImportFile(e.target.files[0] || null)}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                          </div>
                        </form>
                      </div>

                      {/* Right Pane - Instructions */}
                      <div className="flex-[2] p-6 bg-slate-50 dark:bg-[#020617]/50 overflow-y-auto custom-scrollbar flex flex-col">
                        <div className="flex-1">
                          <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center mb-3 border border-violet-200 dark:border-violet-500/30">
                            <Info className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                          </div>
                          <h4 className="text-sm font-black text-slate-900 dark:text-white mb-1.5">Import Format Requirements</h4>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                            Download our standardized template to ensure your data is formatted correctly. The file must contain the specific headers matching the {importType === 'regular' ? 'Team Members' : 'End Users'} layout.
                          </p>

                          <h5 className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Required Columns</h5>
                          <div className="flex flex-col gap-2">
                            {importType === 'regular' ? (
                              <>
                                <div className="flex items-center gap-2.5 bg-white dark:bg-[#0f172a] p-2 rounded-lg border border-slate-100 dark:border-white/5"><Check className="w-3.5 h-3.5 text-emerald-500" /><span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">full_name</span></div>
                                <div className="flex items-center gap-2.5 bg-white dark:bg-[#0f172a] p-2 rounded-lg border border-slate-100 dark:border-white/5"><Check className="w-3.5 h-3.5 text-emerald-500" /><span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">email</span></div>
                                <div className="flex items-center gap-2.5 bg-white dark:bg-[#0f172a] p-2 rounded-lg border border-slate-100 dark:border-white/5"><Check className="w-3.5 h-3.5 text-emerald-500" /><span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">password</span></div>
                                <div className="flex items-center gap-2.5 bg-white dark:bg-[#0f172a] p-2 rounded-lg border border-slate-100 dark:border-white/5"><Check className="w-3.5 h-3.5 text-emerald-500" /><span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">role</span></div>
                              </>
                            ) : (
                              <>
                                <div className="flex items-center gap-2.5 bg-white dark:bg-[#0f172a] p-2 rounded-lg border border-slate-100 dark:border-white/5"><Check className="w-3.5 h-3.5 text-emerald-500" /><span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">full_name</span></div>
                                <div className="flex items-center gap-2.5 bg-white dark:bg-[#0f172a] p-2 rounded-lg border border-slate-100 dark:border-white/5"><Check className="w-3.5 h-3.5 text-emerald-500" /><span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">email</span></div>
                                <div className="flex items-center gap-2.5 bg-white dark:bg-[#0f172a] p-2 rounded-lg border border-slate-100 dark:border-white/5"><Check className="w-3.5 h-3.5 text-emerald-500" /><span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">password</span></div>
                                <div className="flex items-center gap-2.5 bg-white dark:bg-[#0f172a] p-2 rounded-lg border border-slate-100 dark:border-white/5"><Check className="w-3.5 h-3.5 text-slate-400" /><span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded">employee_id <span className="italic font-normal">(Optional)</span></span></div>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="pt-6">
                          <button
                            onClick={handleDownloadTemplate}
                            disabled={isDownloadingTemplate}
                            className="w-full py-2.5 bg-white dark:bg-violet-500/10 hover:bg-violet-50 dark:hover:bg-violet-500/20 text-violet-700 dark:text-violet-300 text-[10px] font-black rounded-lg border border-violet-200 dark:border-violet-500/30 transition-all flex items-center justify-center gap-2 shadow-sm uppercase tracking-wider"
                          >
                            {isDownloadingTemplate ? <Activity className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                            {isDownloadingTemplate ? "DOWNLOADING..." : "DOWNLOAD TEMPLATE"}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 shrink-0 flex items-center justify-end gap-3 bg-white dark:bg-[#0f172a]">
                      <button
                        type="button"
                        onClick={() => { setShowImportUsersModal(false); setSelectedImportFile(null); setShowImportInfo(false); }}
                        disabled={isUploadingUsers}
                        className="px-5 py-2 bg-transparent text-slate-500 dark:text-slate-400 font-bold text-xs rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 transition-all disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        form="importUsersForm"
                        type="submit"
                        disabled={isUploadingUsers}
                        className="px-6 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black text-xs rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-500/25 active:scale-[0.98] disabled:opacity-50"
                      >
                        {isUploadingUsers ? (
                          <>
                            <Activity className="w-4 h-4 animate-spin" />
                            UPLOADING...
                          </>
                        ) : (
                          <>
                            <FileUp className="w-4 h-4" />
                            IMPORT {importType === 'regular' ? 'MEMBERS' : 'END USERS'}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Member Modal */}
            {showEditMemberModal && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[8px] animate-in fade-in duration-500" onClick={() => !updatingType && setShowEditMemberModal(false)} />
                <div className="relative bg-white dark:bg-[#0f172a] rounded-[2.5rem] border border-slate-200 dark:border-white/10 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300 z-10 overflow-hidden text-left">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />

                  <div className="relative z-10">
                    <div className="px-8 pt-8 pb-6 border-b border-slate-100 dark:border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shadow-inner">
                            <Pencil className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Edit Member</h3>
                            <p className="text-xs text-slate-500 font-medium">Update profile details for {editForm.email}</p>
                          </div>
                        </div>
                        <button onClick={() => setShowEditMemberModal(false)} className="p-2 h-10 w-10 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all outline-none focus:ring-2 focus:ring-indigo-500/20"><X className="w-5 h-5" /></button>
                      </div>
                    </div>

                    <div className="p-8 space-y-4">
                      {/* Name Row */}
                      <div className="flex flex-col gap-3 p-5 bg-slate-50/50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 rounded-3xl transition-all hover:bg-white dark:hover:bg-white/[0.05] hover:shadow-xl hover:shadow-indigo-500/5 group">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                            <Users className="w-4 h-4 text-indigo-500" />
                          </div>
                          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Full Name</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="text"
                            value={editForm.full_name}
                            onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))}
                            placeholder="Display Name"
                            className="flex-1 bg-white dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-900 dark:text-white font-sans"
                          />
                          <button
                            onClick={() => saveEditedMember('profile')}
                            disabled={!!updatingType || !editForm.full_name || editForm.full_name === originalMemberName}
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-30 disabled:grayscale"
                          >
                            {updatingType === 'profile' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Update'}
                          </button>
                        </div>
                      </div>

                      {/* Password Row */}
                      <div className="flex flex-col gap-3 p-5 bg-slate-50/50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 rounded-3xl transition-all hover:bg-white dark:hover:bg-white/[0.05] hover:shadow-xl hover:shadow-amber-500/5 group">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                            <Lock className="w-4 h-4 text-amber-500" />
                          </div>
                          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Security Credentials</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              value={editForm.password}
                              onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))}
                              placeholder="New Password"
                              className="w-full bg-white dark:bg-[#020617] border border-slate-200 dark:border-white/10 rounded-2xl pl-4 pr-10 py-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all text-slate-900 dark:text-white font-sans"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-500 transition-colors"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          <button
                            onClick={() => saveEditedMember('security')}
                            disabled={!!updatingType || !editForm.password}
                            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-30"
                          >
                            {updatingType === 'security' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Reset'}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="px-8 pb-8 pt-2">
                      <button
                        onClick={() => setShowEditMemberModal(false)}
                        className="w-full py-4 bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase tracking-[0.25em] rounded-2xl hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
      {/* Standard Confirmation Modal (Glassmorphism) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowConfirmModal(false)} />

          <div className="bg-white dark:bg-[#0f172a] rounded-[2rem] shadow-2xl border border-white/20 w-full max-w-sm overflow-hidden relative z-10 animate-in zoom-in-95 duration-300">
            <div className="p-8 text-center">
              <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-6 ${confirmConfig.variant === 'danger' ? 'bg-rose-500/10 text-rose-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                <AlertTriangle className="w-8 h-8" />
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{confirmConfig.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                {confirmConfig.message}
              </p>
            </div>

            <div className="flex border-t border-slate-100 dark:border-white/5">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-4 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-r border-slate-100 dark:border-white/5"
              >
                Cancel
              </button>
              <button
                onClick={confirmConfig.onConfirm}
                className={`flex-1 py-4 text-sm font-bold transition-colors hover:opacity-90 ${confirmConfig.variant === 'danger' ? 'text-rose-500 hover:bg-rose-500/5' : 'text-indigo-600 hover:bg-indigo-600/5'}`}
              >
                {confirmConfig.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


