import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, Briefcase, CheckCircle2, Clock, LayoutGrid, List, RefreshCw, Trash2,
  ChevronRight, ArrowRight, Sparkles, Users, X, FileText, Calendar,
  Mail, History, ChevronDown, ExternalLink, Loader2,
} from 'lucide-react';
import AssignedJDContent from '../../components/common/AssignedJDContent';
import * as orgService from '../../services/organizationService';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Pagination from '../../components/common/Pagination';
import AssignmentCommandHero3D from '../../components/admin/AssignmentCommandHero3D';

const isComplete = (status) => status?.toLowerCase().includes('complete');
const isPendingStatus = (status) => {
  const s = status?.toLowerCase() || '';
  return s.includes('pending') || s === 'in_progress';
};

const formatDate = (value, opts = { month: 'short', day: 'numeric', year: 'numeric' }) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', opts);
};

const formatDateTime = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
};

/** Group bulk assignments: same JD + same assign minute = one campaign widget */
const getGroupKey = (assignment) => {
  const jdKey = assignment.original_jd_id || assignment.jd_id || assignment.jd_title || 'unknown';
  const batchTime = assignment.assigned_at
    ? new Date(assignment.assigned_at).toISOString().slice(0, 16)
    : 'unknown';
  return `${jdKey}::${batchTime}`;
};

const groupAssignments = (assignments) => {
  const map = new Map();
  for (const assignment of assignments) {
    const key = getGroupKey(assignment);
    if (!map.has(key)) {
      map.set(key, {
        id: key,
        jdId: assignment.original_jd_id || assignment.jd_id,
        jdTitle: assignment.jd_title || 'Untitled JD',
        assignedAt: assignment.assigned_at,
        dueDate: assignment.due_date,
        assignees: [],
      });
    }
    map.get(key).assignees.push(assignment);
  }

  return Array.from(map.values())
    .map((group) => {
      const total = group.assignees.length;
      const completed = group.assignees.filter((a) => isComplete(a.status)).length;
      const pending = group.assignees.filter((a) => isPendingStatus(a.status)).length;
      return {
        ...group,
        total,
        completed,
        pending,
        progress: total ? Math.round((completed / total) * 100) : 0,
      };
    })
    .sort((a, b) => new Date(b.assignedAt) - new Date(a.assignedAt));
};

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, assignmentTitle }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white w-full max-w-sm rounded-[24px] p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300">
        <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Assignment?</h3>
        <p className="text-slate-600 text-[13px] font-medium mb-6">
          This will permanently remove the assignment for{' '}
          <span className="text-slate-900 font-bold">&quot;{assignmentTitle}&quot;</span>.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-[13px]">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold text-[13px]">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

const GlassStatus = ({ status }) => {
  const pending = isPendingStatus(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
      pending
        ? 'bg-orange-500/10 text-orange-600 border-orange-500/20'
        : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${pending ? 'bg-orange-500' : 'bg-emerald-500'}`} />
      {status || 'Pending'}
    </span>
  );
};

const ProgressRing = ({ progress, size = 52 }) => {
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="#6366f1" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[11px] font-black text-indigo-600">{progress}%</span>
      </div>
    </div>
  );
};

const AvatarStack = ({ assignees, max = 4 }) => {
  const shown = assignees.slice(0, max);
  const extra = assignees.length - max;

  return (
    <div className="flex items-center">
      {shown.map((a, i) => (
        <div
          key={a.id}
          className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 border-2 border-white flex items-center justify-center text-[10px] font-black text-white shadow-sm"
          style={{ marginLeft: i === 0 ? 0 : -10, zIndex: max - i }}
          title={a.candidate_name || a.candidate_email}
        >
          {(a.candidate_name || a.candidate_email || '?').charAt(0).toUpperCase()}
        </div>
      ))}
      {extra > 0 && (
        <div
          className="w-8 h-8 rounded-full bg-slate-800 border-2 border-white flex items-center justify-center text-[10px] font-black text-white shadow-sm"
          style={{ marginLeft: -10 }}
        >
          +{extra}
        </div>
      )}
    </div>
  );
};

const AssignmentGroupPanel = ({ group, onClose, onOpenFullView, onDelete }) => {
  const [activeTab, setActiveTab] = useState('tracker');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState(null);
  const [jdPreview, setJdPreview] = useState(null);
  const [jdLoading, setJdLoading] = useState(false);

  useEffect(() => {
    setActiveTab('tracker');
    setSelectedAssigneeId(group?.assignees?.[0]?.id ?? null);
    setJdPreview(null);
  }, [group?.id]);

  useEffect(() => {
    if (!group || activeTab !== 'jd') return;
    const sampleId = group.assignees[0]?.id;
    if (!sampleId) return;

    let cancelled = false;
    setJdLoading(true);
    orgService.getAssignedJDDetails(sampleId)
      .then((data) => { if (!cancelled) setJdPreview(data); })
      .catch(() => { if (!cancelled) toast.error('Could not load job description'); })
      .finally(() => { if (!cancelled) setJdLoading(false); });

    return () => { cancelled = true; };
  }, [group, activeTab]);

  if (!group) return null;

  const dueDate = group.dueDate ? new Date(group.dueDate) : null;
  const isOverdue = dueDate && group.pending > 0 && dueDate < new Date();
  const selectedAssignee = group.assignees.find((a) => a.id === selectedAssigneeId) || group.assignees[0];

  const signOffLabel = (assignment) => {
    if (isComplete(assignment.status)) {
      return formatDateTime(assignment.completed_at || assignment.terms_accepted_at);
    }
    if (isPendingStatus(assignment.status)) return 'Awaiting sign-off';
    return assignment.status?.replace(/-/g, ' ') || '—';
  };

  return (
    <div className="fixed inset-0 z-[110] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="relative w-full max-w-3xl h-full bg-white shadow-2xl flex flex-col"
      >
        <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-slate-800 text-white shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200 mb-1">JD Assignment Campaign</p>
              <h2 className="text-xl font-black leading-tight truncate">{group.jdTitle}</h2>
              <p className="text-xs text-slate-300 mt-2 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-1"><Users size={12} /> {group.total} assignees</span>
                <span className="inline-flex items-center gap-1"><Calendar size={12} /> Sent {formatDate(group.assignedAt)}</span>
                <span className={`inline-flex items-center gap-1 ${isOverdue ? 'text-rose-300' : ''}`}>
                  <Clock size={12} /> Due {formatDate(group.dueDate)}
                </span>
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors shrink-0">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-5">
            {[
              { label: 'Completed', value: group.completed, tone: 'text-emerald-300' },
              { label: 'Pending', value: group.pending, tone: 'text-orange-300' },
              { label: 'Progress', value: `${group.progress}%`, tone: 'text-indigo-200' },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-xl bg-white/10 border border-white/10 px-3 py-2.5 text-center">
                <p className={`text-lg font-black ${kpi.tone}`}>{kpi.value}</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{kpi.label}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-5 p-1 bg-white/10 rounded-xl border border-white/10">
            {[
              { id: 'tracker', label: 'Sign-off Tracker', icon: Users },
              { id: 'jd', label: 'Job Description', icon: FileText },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'tracker' ? (
            <div className="p-6 space-y-6">
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-indigo-900 font-medium">
                  One job description shared across all assignees — track sign-off per person below.
                </p>
                <button
                  type="button"
                  onClick={() => onOpenFullView(group, selectedAssignee?.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors shrink-0"
                >
                  <ExternalLink size={12} /> Open Full JD View
                </button>
              </div>

              <div className="rounded-2xl border border-slate-100 overflow-hidden bg-white shadow-sm">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Assignee</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">Status</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400 hidden sm:table-cell">Signed At</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.assignees.map((assignment) => {
                      const isSelected = assignment.id === selectedAssigneeId;
                      const signedAt = assignment.completed_at || assignment.terms_accepted_at;
                      return (
                        <React.Fragment key={assignment.id}>
                          <tr
                            className={`border-b border-slate-50 cursor-pointer transition-colors ${
                              isSelected ? 'bg-indigo-50/60' : 'hover:bg-slate-50/80'
                            }`}
                            onClick={() => setSelectedAssigneeId(assignment.id)}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                                  {(assignment.candidate_name || assignment.candidate_email || '?').charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-900 text-sm truncate">{assignment.candidate_name || 'Unknown'}</p>
                                  <p className="text-[11px] text-slate-500 truncate">{assignment.candidate_email || '—'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <GlassStatus status={assignment.status} />
                            </td>
                            <td className="px-4 py-3 hidden sm:table-cell">
                              <p className="text-xs font-semibold text-slate-700">{isComplete(assignment.status) ? formatDateTime(signedAt) : '—'}</p>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="inline-flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                {!isComplete(assignment.status) && (
                                  <button
                                    type="button"
                                    onClick={() => onDelete(assignment)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 text-[11px] font-bold transition-colors"
                                  >
                                    <Trash2 size={11} /> Remove
                                  </button>
                                )}
                                <ChevronDown size={14} className={`text-slate-400 transition-transform ${isSelected ? 'rotate-180' : ''}`} />
                              </div>
                            </td>
                          </tr>
                          {isSelected && (
                            <tr className="bg-slate-50/50">
                              <td colSpan={4} className="px-4 py-4">
                                <div className="rounded-xl border border-slate-100 bg-white p-4 space-y-3">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                    <History size={12} className="text-indigo-500" /> Sign-off detail — {assignment.candidate_name || assignment.candidate_email}
                                  </p>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {[
                                      { label: 'Assigned', value: formatDateTime(assignment.assigned_at) },
                                      { label: 'Due', value: formatDate(group.dueDate) },
                                      { label: 'Sign-off', value: signOffLabel(assignment) },
                                      { label: 'Decision', value: assignment.decision || (isComplete(assignment.status) ? 'Accepted' : '—') },
                                    ].map((item) => (
                                      <div key={item.label} className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{item.label}</p>
                                        <p className="text-[11px] font-bold text-slate-800 mt-0.5 truncate" title={String(item.value)}>{item.value}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-600 font-medium">
                  Same document for all {group.total} assignees — only sign-off status differs per person.
                </p>
                <button
                  type="button"
                  onClick={() => onOpenFullView(group, group.assignees[0]?.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors shrink-0"
                >
                  <ExternalLink size={12} /> Expand Full View
                </button>
              </div>

              {jdLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <Loader2 size={28} className="animate-spin mb-3 text-indigo-500" />
                  <p className="text-sm font-bold">Loading job description…</p>
                </div>
              ) : jdPreview ? (
                <div className="space-y-4">
                  <AssignedJDContent jd={jdPreview} compact />
                </div>
              ) : (
                <div className="text-center py-16 text-slate-500 text-sm font-medium">No preview available.</div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const JdGroupCard = ({ group, onOpen }) => {
  const dueDate = group.dueDate ? new Date(group.dueDate) : null;
  const isOverdue = dueDate && group.pending > 0 && dueDate < new Date();

  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      onClick={() => onOpen(group)}
      className="group text-left w-full bg-white rounded-[24px] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.04)] border border-slate-100 hover:border-indigo-200 hover:shadow-[0_16px_48px_rgba(99,102,241,0.12)] transition-all duration-300 flex flex-col h-full"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-wider">
          <Briefcase size={12} />
          {group.total} {group.total === 1 ? 'Assignee' : 'Assignees'}
        </div>
        <ProgressRing progress={group.progress} size={48} />
      </div>

      <h3 className="text-[15px] font-black text-slate-900 leading-snug mb-3 line-clamp-2 group-hover:text-indigo-700 transition-colors">
        {group.jdTitle}
      </h3>

      <div className="flex items-center justify-between mb-4">
        <AvatarStack assignees={group.assignees} />
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Completion</p>
          <p className="text-sm font-black text-slate-800">{group.completed}/{group.total}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Sent</p>
          <p className="text-[12px] font-bold text-slate-800">{formatDate(group.assignedAt, { month: 'short', day: 'numeric' })}</p>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Due</p>
          <p className={`text-[12px] font-bold ${isOverdue ? 'text-rose-600' : 'text-slate-800'}`}>
            {formatDate(group.dueDate, { month: 'short', day: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex gap-2 text-[10px] font-bold">
          <span className="text-emerald-600">{group.completed} done</span>
          <span className="text-slate-300">·</span>
          <span className="text-orange-500">{group.pending} pending</span>
        </div>
        <span className="inline-flex items-center gap-1 text-[12px] font-bold text-indigo-600 group-hover:gap-2 transition-all">
          Open <ArrowRight size={14} />
        </span>
      </div>
    </motion.button>
  );
};

const JdGroupRow = ({ group, onOpen }) => (
  <tr className="group hover:bg-indigo-50/40 transition-colors border-b border-slate-100 cursor-pointer" onClick={() => onOpen(group)}>
    <td className="px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
          <Briefcase size={16} />
        </div>
        <div>
          <p className="text-[13px] font-bold text-slate-900 line-clamp-1">{group.jdTitle}</p>
          <p className="text-[11px] text-slate-500">{group.total} assignees · batch {formatDate(group.assignedAt, { month: 'short', day: 'numeric' })}</p>
        </div>
      </div>
    </td>
    <td className="px-6 py-4"><AvatarStack assignees={group.assignees} max={5} /></td>
    <td className="px-6 py-4 text-center"><ProgressRing progress={group.progress} size={40} /></td>
    <td className="px-6 py-4 text-center">
      <span className="text-emerald-600 font-bold text-sm">{group.completed}</span>
      <span className="text-slate-400 mx-1">/</span>
      <span className="text-slate-600 font-bold text-sm">{group.total}</span>
    </td>
    <td className="px-6 py-4 text-[12px] font-semibold text-slate-600">{formatDate(group.dueDate, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
    <td className="px-6 py-4 text-right">
      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-[11px] font-bold text-indigo-600 group-hover:border-indigo-200">
        View all <ChevronRight size={12} />
      </span>
    </td>
  </tr>
);

const AssignedJDs = () => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewMode, setViewMode] = useState('grid');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  const fetchAssignments = async () => {
    setIsLoading(true);
    try {
      const data = await orgService.getAllAssignments();
      setAssignments(Array.isArray(data) ? data : (data?.assignments || []));
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
      toast.error('Could not load assigned JDs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const assignmentGroups = useMemo(() => groupAssignments(assignments), [assignments]);

  const filteredGroups = useMemo(() => {
    return assignmentGroups.filter((group) => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch = !q || group.jdTitle?.toLowerCase().includes(q)
        || group.assignees.some((a) =>
          a.candidate_name?.toLowerCase().includes(q) || a.candidate_email?.toLowerCase().includes(q));

      let matchesStatus = true;
      if (statusFilter === 'Pending') {
        matchesStatus = group.assignees.some((a) => isPendingStatus(a.status));
      } else if (statusFilter === 'Completed') {
        matchesStatus = group.assignees.every((a) => isComplete(a.status));
      }

      return matchesSearch && matchesStatus;
    });
  }, [assignmentGroups, searchTerm, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const stats = useMemo(() => ({
    campaigns: assignmentGroups.length,
    totalAssignees: assignments.length,
    pending: assignments.filter((a) => isPendingStatus(a.status)).length,
    completed: assignments.filter((a) => isComplete(a.status)).length,
  }), [assignments, assignmentGroups]);

  const totalPages = Math.ceil(filteredGroups.length / pageSize);
  const paginatedGroups = filteredGroups.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleOpenFullView = (group, assigneeId) => {
    const id = assigneeId || group.assignees[0]?.id;
    if (!id) return toast.error('Assignment ID not found');
    navigate(`/admin/assigned/view/${id}`, { state: { campaign: group, assigneeId: id } });
  };

  const confirmDelete = (assignment) => {
    setAssignmentToDelete(assignment);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!assignmentToDelete) return;
    try {
      await orgService.removeAssignment(assignmentToDelete.id);
      toast.success('Assignment removed successfully');
      setIsDeleteModalOpen(false);
      setAssignmentToDelete(null);
      const data = await orgService.getAllAssignments();
      const nextAssignments = Array.isArray(data) ? data : (data?.assignments || []);
      setAssignments(nextAssignments);
      if (selectedGroup) {
        const nextGroup = groupAssignments(nextAssignments).find((g) => g.id === selectedGroup.id);
        setSelectedGroup(nextGroup || null);
      }
    } catch (error) {
      console.error('Failed to delete assignment:', error);
      toast.error('Could not remove assignment');
    }
  };

  return (
    <div className="h-full bg-[#f4f6f9] font-sans text-slate-900 pb-8 relative">
      <div className="absolute inset-0 pointer-events-none z-0 opacity-40">
        <div className="absolute top-[5%] left-[20%] w-[400px] h-[400px] rounded-full bg-indigo-200/40 blur-[120px]" />
        <div className="absolute bottom-[10%] right-[10%] w-[450px] h-[450px] rounded-full bg-rose-200/30 blur-[135px]" />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 pt-10">
        <div className="bg-gradient-to-b from-slate-900 to-slate-800 p-8 sm:p-10 rounded-[2rem] shadow-xl shadow-slate-900/10 border border-slate-800 mb-8 relative overflow-hidden">
          <div className="absolute top-0 left-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 right-10 w-72 h-72 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 grid lg:grid-cols-[1fr_minmax(240px,300px)] gap-8 items-stretch">
            <div className="flex flex-col justify-center min-w-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-indigo-100 text-[10px] font-bold uppercase tracking-widest mb-4 border border-white/10 w-fit">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Assignment Command Center
              </span>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2 leading-tight">
                Assigned Job Descriptions
              </h1>
              <p className="text-slate-300 text-sm font-medium leading-relaxed max-w-xl mb-6">
                Bulk assignments are grouped by JD — one widget per campaign, drill into every assignee, acceptance time, and status.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { label: 'JD Campaigns', value: stats.campaigns, tone: 'text-white' },
                  { label: 'Total Assignees', value: stats.totalAssignees, tone: 'text-white' },
                  { label: 'Pending', value: stats.pending, tone: 'text-orange-400' },
                  { label: 'Completed', value: stats.completed, tone: 'text-emerald-400' },
                ].map((kpi) => (
                  <div key={kpi.label} className="flex flex-col bg-white/5 border border-white/10 backdrop-blur-md px-3 py-2.5 rounded-2xl text-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{kpi.label}</span>
                    <span className={`text-lg font-black ${kpi.tone}`}>{kpi.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative rounded-[1.5rem] border border-white/10 bg-white/[0.04] backdrop-blur-sm overflow-hidden min-h-[220px] lg:min-h-0 shadow-inner shadow-indigo-500/5">
              <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-900/60 border border-white/10">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Live Network</span>
              </div>
              <AssignmentCommandHero3D
                campaigns={stats.campaigns}
                totalAssignees={stats.totalAssignees}
                pending={stats.pending}
                completed={stats.completed}
                className="min-h-[220px] lg:min-h-[260px]"
              />
            </div>
          </div>
        </div>

        <div className="sticky top-0 z-50 -mx-6 px-6 py-4 bg-[#f4f6f9]/90 backdrop-blur-2xl border-b border-white/60 mb-8">
          <div className="flex flex-col md:flex-row items-center gap-2 mx-auto w-fit p-1.5 bg-white/80 border border-white rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
            <div className="relative group w-full md:w-[280px] focus-within:md:w-[420px] transition-all duration-500">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search JD title or assignee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-10 pr-4 bg-transparent border-none focus:ring-0 text-[13px] font-bold text-slate-800 placeholder:text-slate-400 outline-none"
              />
            </div>

            <div className="h-6 w-px bg-slate-200 hidden md:block" />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 pl-4 pr-8 bg-transparent hover:bg-slate-100/50 rounded-full text-[13px] font-bold text-slate-700 appearance-none outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Has Pending</option>
              <option value="Completed">All Complete</option>
            </select>

            <div className="h-6 w-px bg-slate-200 hidden md:block" />

            <div className="flex p-0.5 bg-slate-100 rounded-full">
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded-full transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>
                <LayoutGrid size={14} />
              </button>
              <button onClick={() => setViewMode('list')} className={`p-2 rounded-full transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>
                <List size={14} />
              </button>
            </div>

            <button onClick={fetchAssignments} className="w-10 h-10 flex items-center justify-center bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-full transition-all shrink-0">
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="min-h-[400px]">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-[24px] p-5 border border-slate-100 h-[280px] animate-pulse" />
              ))}
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="h-[300px] flex flex-col items-center justify-center text-center bg-white border border-slate-100 rounded-[32px] shadow-sm px-6">
              <Search size={24} className="text-slate-400 mb-3" />
              <h3 className="text-lg font-bold text-slate-900 mb-1">No assignment campaigns found</h3>
              <p className="text-[13px] text-slate-500 mb-6">Try clearing filters or assign a JD to multiple users.</p>
              <button onClick={() => { setSearchTerm(''); setStatusFilter('All'); }} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[13px] font-bold">
                Clear Filters
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <AnimatePresence mode="popLayout">
                {paginatedGroups.map((group) => (
                  <JdGroupCard key={group.id} group={group} onOpen={setSelectedGroup} />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="bg-white border border-slate-100 rounded-[32px] shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Job Description</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Assignees</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-center">Progress</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-center">Done</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Due</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedGroups.map((group) => (
                    <JdGroupRow key={group.id} group={group} onOpen={setSelectedGroup} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredGroups.length > pageSize && (
            <div className="mt-6 border border-slate-100 bg-white rounded-[32px] shadow-sm overflow-hidden">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                pageSize={pageSize}
                onPageSizeChange={(newSize) => { setPageSize(newSize); setCurrentPage(1); }}
                totalResults={filteredGroups.length}
                showRowsSelector={false}
                className="!border-t-0 !bg-transparent"
              />
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedGroup && (
          <AssignmentGroupPanel
            group={selectedGroup}
            onClose={() => setSelectedGroup(null)}
            onOpenFullView={handleOpenFullView}
            onDelete={confirmDelete}
          />
        )}
      </AnimatePresence>

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        assignmentTitle={assignmentToDelete?.candidate_name || assignmentToDelete?.jd_title}
      />
    </div>
  );
};

export default AssignedJDs;
