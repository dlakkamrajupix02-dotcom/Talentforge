import React, { useState, useCallback, useMemo, useContext, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  ControlButton,
  MiniMap,
  useNodesState,
  useEdgesState,
  Position,
  MarkerType,
  Handle,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { JDContext } from '../../context/JDContext';
import { apiGet } from '../../services/apiClient';
import {
  FileText, Eye, MapPin, Search, Filter, X, Folder, FolderOpen, Files, ChevronRight, ChevronDown, BarChart2, RotateCcw
} from 'lucide-react';

// ─── 1. API Data Structure (Ready for Backend Integration) ───
// We now fetch this dynamically from the backend and automatically layout the nodes!

const getInitials = (name) => {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

const getRoleColor = (role) => {
  const r = role ? role.toLowerCase() : '';
  if (r === 'admin') return '#3b82f6';
  if (r === 'manager') return '#ea580c';
  if (r === 'hr') return '#10b981';
  if (r === 'user') return '#8b5cf6';
  return '#94a3b8'; // default grey
};

// ─── Custom Digital Folder Node ───
function OrgNode({ data }) {
  const {
    label,
    name,
    abbr,
    color,
    isSelected,
    jdCount,
    onClick,
    level,
    isDimmed,
    department,
    hasChildren,
    isCollapsed,
    onToggleCollapse,
    layoutMode,
    isCategory,
    memberCount
  } = data;

  const isJdEnabled = abbr?.toLowerCase() === 'admin' || abbr?.toLowerCase() === 'hr';

  if (isCategory) {
    return (
      <div
        onClick={onClick}
        className={`relative select-none group w-[240px] h-[95px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between ${isDimmed ? 'opacity-40' : 'opacity-100'}`}
      >
        <Handle
          type="target"
          position={Position.Top}
          style={{ background: 'transparent', borderColor: 'transparent', width: 1, height: 1, zIndex: -1, left: '50%' }}
        />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0 shadow-sm" style={{ backgroundColor: color }}>
            <Folder size={18} className="fill-current" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">{name}</div>
            <div className="text-[10px] text-slate-400 font-bold tracking-wider uppercase mt-0.5">{memberCount} Staff</div>
          </div>
        </div>
        <div className="flex justify-between items-center text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-1">
          <span>{isCollapsed ? "Click to expand" : "Click to collapse"}</span>
          <ChevronDown size={12} className={`transition-transform duration-300 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`} />
        </div>
        {!isCollapsed && (
          <Handle
            type="source"
            position={Position.Bottom}
            style={{ background: 'transparent', borderColor: 'transparent', width: 1, height: 1, zIndex: -1, left: '50%' }}
          />
        )}
      </div>
    );
  }

  return (
    <div
      onClick={isJdEnabled ? onClick : undefined}
      className={`relative select-none group transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] w-[240px]
        ${isJdEnabled ? 'cursor-pointer hover:-translate-y-2 hover:z-30' : 'cursor-default'}
        ${isDimmed ? 'opacity-40 grayscale-[40%] scale-95' : 'opacity-100'}
        ${isSelected && isJdEnabled ? 'z-20 -translate-y-4' : 'z-10'}`}
    >
      {/* Target handle on Top/Left */}
      {level > 0 && (
        <Handle
          type="target"
          position={layoutMode === 'horizontal' ? Position.Left : Position.Top}
          style={
            layoutMode === 'horizontal'
              ? { background: 'transparent', borderColor: 'transparent', width: 1, height: 1, zIndex: -1, top: '50%' }
              : { background: 'transparent', borderColor: 'transparent', width: 1, height: 1, zIndex: -1, left: '50%' }
          }
        />
      )}

      {/* The Folder Wrapper */}
      <div className="relative w-[240px] h-[155px]">

        {/* BACK FOLDER FLAP & TAB */}
        <div className="absolute bottom-0 left-0 right-0 h-[145px] rounded-xl flex flex-col shadow-sm transition-transform duration-300 group-hover:rotate-[-1deg] origin-bottom-left">
          {/* Tab */}
          <div className="w-[85px] h-[22px] rounded-t-[14px]" style={{ backgroundColor: color }} />
          {/* Back Body */}
          <div className="flex-1 rounded-b-xl rounded-tr-xl border-t border-white/20" style={{ backgroundColor: color, opacity: 0.95 }} />
          {/* Label on the back tab */}
          <div className="absolute top-1 left-3 text-[9px] font-black text-white/90 uppercase tracking-widest truncate max-w-[65px]">
            {abbr}
          </div>
        </div>

        {/* PAPER DOCUMENTS (Slip out on hover if there are JDs) */}
        {isJdEnabled && jdCount > 0 && (
          <div className={`absolute left-[15px] right-[15px] bg-white rounded-t-md shadow-md border border-slate-200 p-3 flex flex-col gap-1.5 transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)]
            ${isSelected ? 'bottom-[40px] h-[115px]' : 'bottom-[25px] h-[105px] group-hover:bottom-[45px] group-hover:h-[120px]'}`}>
            <div className="w-full h-1.5 bg-slate-100 rounded-full" />
            <div className="w-3/4 h-1.5 bg-slate-100 rounded-full" />
            <div className="w-5/6 h-1.5 bg-slate-100 rounded-full" />
            <div className="mt-auto flex justify-between items-end">
              <FileText size={16} className="text-slate-300" />
              <span className="text-[10px] font-bold text-slate-400">FILES</span>
            </div>
          </div>
        )}
        {/* Empty State Paper */}
        {isJdEnabled && jdCount === 0 && (
          <div className="absolute bottom-[20px] left-[20px] right-[20px] h-[80px] bg-white/50 rounded-t-md border border-slate-200/50 transition-all duration-300 group-hover:bottom-[25px]">
            <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-slate-400 uppercase tracking-widest opacity-50">Empty</div>
          </div>
        )}

        {/* FRONT FOLDER FLAP (Glassmorphic) */}
        <div className={`absolute bottom-0 left-0 right-0 h-[105px] rounded-xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-white/60 dark:border-white/10 p-4 flex flex-col justify-between transition-transform duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-bottom
          ${isSelected ? 'shadow-[0_20px_40px_rgba(0,0,0,0.15)] scale-[1.03] rotate-1 translate-y-1' : 'shadow-[0_8px_20px_rgba(0,0,0,0.06)] group-hover:scale-[1.03] group-hover:rotate-1 group-hover:translate-y-1'}`}>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0"
                style={{ backgroundColor: color }}
              >
                {getInitials(name)}
              </div>
              <div className="min-w-0 pr-2">
                <div className="text-sm font-bold text-slate-800 dark:text-white leading-tight truncate">{name}</div>
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest truncate">{department}</div>
              </div>
            </div>

            {/* 🔥 HIGHLY VISIBLE JD COUNT BADGE 🔥 */}
            {isJdEnabled && (
              <div className={`flex flex-col items-center justify-center px-2 py-1 rounded-lg border shadow-sm shrink-0 transition-colors
                ${jdCount > 0
                  ? 'bg-indigo-50 dark:bg-indigo-500/20 border-indigo-200 dark:border-indigo-500/30'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}
              >
                <div className={`text-base font-black leading-none ${jdCount > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                  {jdCount}
                </div>
                <div className="text-[8px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">
                  {jdCount === 1 ? 'JD' : 'JDs'}
                </div>
              </div>
            )}
          </div>

          <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate pr-2 mt-auto">
            {label}
          </div>

        </div>

      </div>

      {/* Expand/Collapse Button for Nodes with children */}
      {hasChildren && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse();
          }}
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-40 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 hover:scale-110 active:scale-95 transition-all text-slate-500 dark:text-slate-400 cursor-pointer pointer-events-auto"
          title={isCollapsed ? "Expand Children" : "Collapse Children"}
        >
          <ChevronDown size={14} className={`transition-transform duration-300 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`} />
        </button>
      )}

      {/* Source handle on Bottom/Right */}
      {level === 0 && (
        <Handle
          type="source"
          position={layoutMode === 'horizontal' ? Position.Right : Position.Bottom}
          style={
            layoutMode === 'horizontal'
              ? { background: 'transparent', borderColor: 'transparent', width: 1, height: 1, zIndex: -1, top: '50%', right: 0 }
              : { background: 'transparent', borderColor: 'transparent', width: 1, height: 1, zIndex: -1, left: '50%', bottom: 0 }
          }
        />
      )}
    </div>
  );
}

const nodeTypes = {
  orgNode: OrgNode
};

// ─── Status Badge ───
function StatusBadge({ status }) {
  const map = {
    draft: { bg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700', label: 'Draft' },
    final: { bg: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20', label: 'Final' },
    finalized: { bg: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20', label: 'Finalized' },
    approved: { bg: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20', label: 'Approved' },
    in_review: { bg: 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-500/20', label: 'In Review' },
    declined: { bg: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20', label: 'Declined' },
  };
  const s = map[status] || map.draft;
  return <span className={`px-2 py-0.5 text-[10px] font-bold border rounded-md ${s.bg}`}>{s.label}</span>;
}

// ─── Side Panel (Folder Contents View) ───
function JDPanel({ node, jds, onClose, onViewJD }) {
  if (!node) return null;
  const { label, name, department, color, abbr } = node;

  return (
    <div className="w-[420px] flex-shrink-0 bg-[#f8fafc] dark:bg-[#0b0f19] text-slate-800 dark:text-slate-100 border-l border-slate-200 dark:border-slate-800/60 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">

      {/* Panel Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800/60 px-4 py-3 flex items-center justify-between shadow-sm relative z-10">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors mr-1">
            <X size={16} />
          </button>
          <FolderOpen size={16} style={{ color }} />
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{abbr} _ Directory</span>
        </div>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{jds.length} Items</div>
      </div>

      <div className="bg-white dark:bg-slate-900 px-6 py-4 border-b border-slate-100 dark:border-slate-800 shadow-sm relative z-0">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-base shadow-sm shrink-0"
            style={{ backgroundColor: color }}
          >
            {getInitials(name)}
          </div>
          <div className="min-w-0">
            <div className="text-[9px] font-bold uppercase tracking-widest mb-0.5 text-slate-500">{department}</div>
            <div className="text-base font-bold text-slate-900 dark:text-white leading-tight mb-0.5 truncate">{name}</div>
            <div className="text-xs font-medium text-slate-500 truncate">{label}</div>
          </div>
        </div>
      </div>

      {/* Panel Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3 scrollbar-thin">
        {jds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Files size={32} className="text-slate-300 dark:text-slate-700 mb-4" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Directory is empty</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">No job descriptions stored in this folder.</p>
          </div>
        ) : (
          jds.map((jd) => (
            <div
              key={jd.id}
              onClick={() => onViewJD(jd)}
              className="group relative flex items-center gap-4 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-700 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 transition-colors">
                <FileText size={18} className="text-slate-400 group-hover:text-indigo-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  {jd.title}
                </h4>
                <div className="flex items-center gap-2">
                  <StatusBadge status={jd.status} />
                  <span className="text-[10px] text-slate-400 truncate max-w-[100px]">{jd.location || 'Remote'}</span>
                </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity p-2">
                <ChevronRight size={16} className="text-indigo-500" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───
export default function OrganizationTree() {
  const [orgData, setOrgData] = useState([]);
  const [apiJDs, setApiJDs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiGet('/job_descriptions/?sort=newest_first'),
      apiGet('/organizations/organization_hierarchy')
    ])
      .then(([jdData, hierarchyData]) => {
        // 1. Fetch JDs
        const approvedAndFinal = jdData.filter(jd => jd.status === 'approved' || jd.status === 'final');
        setApiJDs(approvedAndFinal);

        // 2. Keep only Admins at the root, and show their children (Admin, HR, Manager, User)
        const filterData = (items, isRoot = false) => {
          return items
            .filter(i => {
              const role = i.role ? i.role.toLowerCase() : '';
              if (isRoot) return role === 'admin';
              return role === 'admin' || role === 'hr' || role === 'manager' || role === 'user';
            })
            .map(i => ({
              ...i,
              children: filterData(i.children || [], false)
            }));
        };
        const filteredHierarchy = filterData(hierarchyData, true);
        setOrgData(filteredHierarchy);
      })
      .catch(err => console.error("Failed to fetch Org Tree data:", err))
      .finally(() => setIsLoading(false));
  }, []);

  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [collapsedNodeIds, setCollapsedNodeIds] = useState(new Set());
  const [layoutMode, setLayoutMode] = useState('vertical'); // 'vertical' or 'horizontal'

  const toggleCollapse = useCallback((id) => {
    setCollapsedNodeIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleCollapseAll = useCallback(() => {
    const ids = new Set();
    orgData.forEach(r => {
      ids.add(r.id);
      ids.add(`${r.id}-cat-hr`);
      ids.add(`${r.id}-cat-manager`);
      ids.add(`${r.id}-cat-user`);
    });
    setCollapsedNodeIds(ids);
  }, [orgData]);

  const handleExpandAll = useCallback(() => {
    setCollapsedNodeIds(new Set());
  }, []);

  const flatNodes = useMemo(() => {
    const list = [];
    const traverse = (items) => {
      items.forEach(i => {
        list.push(i);
        if (i.children) traverse(i.children);
      });
    };
    if (orgData) traverse(orgData);
    return list;
  }, [orgData]);

  // Dynamically link JDs based on user ID
  const getJDsForNode = useCallback((node) => {
    if (!apiJDs || !node || !node.id) return [];

    const role = node.role ? node.role.toLowerCase() : '';
    if (role !== 'admin' && role !== 'hr') return [];

    return apiJDs.filter(jd => {
      const cid = String(jd.creator_id || jd.createdBy || "").toLowerCase().trim();
      return cid === String(node.id).toLowerCase().trim();
    });
  }, [apiJDs]);

  const metrics = useMemo(() => {
    if (!apiJDs) return { total: 0, active: 0, draft: 0 };
    return {
      total: apiJDs.length,
      active: apiJDs.length, // they are all approved or final
      draft: 0
    };
  }, [apiJDs]);

  const departments = useMemo(() => {
    const depts = new Set(['All']);
    flatNodes.forEach(n => {
      if (n.role) depts.add(n.role);
    });
    return Array.from(depts);
  }, [flatNodes]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const checkIsDimmed = useCallback((nodeData) => {
    if (!nodeData) return false;
    if (nodeData.isCategory) return false; // Category folders are structural, do not dim them
    const jds = getJDsForNode(nodeData);
    let dimmed = false;
    if (selectedDept !== 'All' && nodeData.department !== selectedDept) dimmed = true;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      if (!nodeData.name?.toLowerCase().includes(query) && !nodeData.label?.toLowerCase().includes(query) && !jds.some(j => j.title?.toLowerCase().includes(query))) dimmed = true;
    }
    return dimmed;
  }, [selectedDept, searchQuery, getJDsForNode]);

  // 1. Initialize Nodes and Edges with a balanced Layout (Grid/Stack/Columns)
  useEffect(() => {
    if (!orgData || orgData.length === 0) return;

    const newNodes = [];
    const newEdges = [];

    if (layoutMode === 'horizontal') {
      const cardHeight = 180;
      let currentY = 0;

      orgData.forEach((root) => {
        // Group children by role
        const hrChildren = [];
        const managerChildren = [];
        const userChildren = [];

        if (root.children) {
          root.children.forEach(child => {
            const role = child.role ? child.role.toLowerCase() : '';
            if (role === 'hr') hrChildren.push(child);
            else if (role === 'manager') managerChildren.push(child);
            else userChildren.push(child);
          });
        }

        const hrCollapsed = collapsedNodeIds.has(`${root.id}-cat-hr`);
        const managerCollapsed = collapsedNodeIds.has(`${root.id}-cat-manager`);
        const userCollapsed = collapsedNodeIds.has(`${root.id}-cat-user`);

        // Compute vertical span (height) of children for each category
        const hrSpan = (!hrCollapsed && hrChildren.length > 0) ? (hrChildren.length - 1) * cardHeight : 0;
        const managerSpan = (!managerCollapsed && managerChildren.length > 0) ? (managerChildren.length - 1) * cardHeight : 0;
        const userSpan = (!userCollapsed && userChildren.length > 0) ? (userChildren.length - 1) * cardHeight : 0;

        const hrHeight = Math.max(hrSpan + 100, 100);
        const managerHeight = Math.max(managerSpan + 100, 100);
        const userHeight = Math.max(userSpan + 100, 100);

        // Position category cards stacked vertically
        const hrCatY = currentY + (hrHeight / 2);
        const managerCatY = hrCatY + (hrHeight / 2) + 50 + (managerHeight / 2);
        const userCatY = managerCatY + (managerHeight / 2) + 50 + (userHeight / 2);

        const totalTreeHeight = (userCatY + (userHeight / 2)) - currentY;
        const rootY = currentY + (totalTreeHeight / 2);

        // 1. Add Root Admin
        newNodes.push({
          id: root.id,
          type: 'orgNode',
          position: { x: 0, y: rootY - 78 },
          data: {
            ...root,
            label: root.email,
            abbr: root.role,
            department: root.role,
            level: 0,
            color: getRoleColor(root.role),
            onClick: () => setSelectedNodeId(prev => prev === root.id ? null : root.id),
            hasChildren: false,
            isCollapsed: false,
            layoutMode,
          }
        });

        // 2. HR Directory
        if (hrChildren.length > 0) {
          newNodes.push({
            id: `${root.id}-cat-hr`,
            type: 'orgNode',
            position: { x: 360, y: hrCatY - 48 },
            data: {
              isCategory: true,
              name: 'HR Directory',
              department: 'Human Resources',
              color: '#10b981',
              memberCount: hrChildren.length,
              isCollapsed: hrCollapsed,
              onClick: () => toggleCollapse(`${root.id}-cat-hr`),
              layoutMode,
            }
          });

          newEdges.push({
            id: `${root.id}-${root.id}-cat-hr`,
            source: root.id,
            target: `${root.id}-cat-hr`,
            type: 'smoothstep'
          });

          if (!hrCollapsed) {
            hrChildren.forEach((child, idx) => {
              const childY = hrCatY - (hrSpan / 2) + (idx * cardHeight) - 78;
              newNodes.push({
                id: child.id,
                type: 'orgNode',
                position: { x: 720, y: childY },
                data: {
                  ...child,
                  label: child.email,
                  abbr: child.role,
                  department: child.role,
                  level: 1,
                  color: getRoleColor(child.role),
                  onClick: () => setSelectedNodeId(prev => prev === child.id ? null : child.id),
                  layoutMode,
                }
              });

              newEdges.push({
                id: `${root.id}-cat-hr-${child.id}`,
                source: `${root.id}-cat-hr`,
                target: child.id,
                type: 'smoothstep'
              });
            });
          }
        }

        // 3. Manager Directory
        if (managerChildren.length > 0) {
          newNodes.push({
            id: `${root.id}-cat-manager`,
            type: 'orgNode',
            position: { x: 360, y: managerCatY - 48 },
            data: {
              isCategory: true,
              name: 'Manager Directory',
              department: 'Management',
              color: '#f97316',
              memberCount: managerChildren.length,
              isCollapsed: managerCollapsed,
              onClick: () => toggleCollapse(`${root.id}-cat-manager`),
              layoutMode,
            }
          });

          newEdges.push({
            id: `${root.id}-${root.id}-cat-manager`,
            source: root.id,
            target: `${root.id}-cat-manager`,
            type: 'smoothstep'
          });

          if (!managerCollapsed) {
            managerChildren.forEach((child, idx) => {
              const childY = managerCatY - (managerSpan / 2) + (idx * cardHeight) - 78;
              newNodes.push({
                id: child.id,
                type: 'orgNode',
                position: { x: 720, y: childY },
                data: {
                  ...child,
                  label: child.email,
                  abbr: child.role,
                  department: child.role,
                  level: 1,
                  color: getRoleColor(child.role),
                  onClick: () => setSelectedNodeId(prev => prev === child.id ? null : child.id),
                  layoutMode,
                }
              });

              newEdges.push({
                id: `${root.id}-cat-manager-${child.id}`,
                source: `${root.id}-cat-manager`,
                target: child.id,
                type: 'smoothstep'
              });
            });
          }
        }

        // 4. User Directory
        if (userChildren.length > 0) {
          newNodes.push({
            id: `${root.id}-cat-user`,
            type: 'orgNode',
            position: { x: 360, y: userCatY - 48 },
            data: {
              isCategory: true,
              name: 'Users Directory',
              department: 'Standard Staff',
              color: '#64748b',
              memberCount: userChildren.length,
              isCollapsed: userCollapsed,
              onClick: () => toggleCollapse(`${root.id}-cat-user`),
              layoutMode,
            }
          });

          newEdges.push({
            id: `${root.id}-${root.id}-cat-user`,
            source: root.id,
            target: `${root.id}-cat-user`,
            type: 'smoothstep'
          });

          if (!userCollapsed) {
            userChildren.forEach((child, idx) => {
              const childY = userCatY - (userSpan / 2) + (idx * cardHeight) - 78;
              newNodes.push({
                id: child.id,
                type: 'orgNode',
                position: { x: 720, y: childY },
                data: {
                  ...child,
                  label: child.email,
                  abbr: child.role,
                  department: child.role,
                  level: 1,
                  color: getRoleColor(child.role),
                  onClick: () => setSelectedNodeId(prev => prev === child.id ? null : child.id),
                  layoutMode,
                }
              });

              newEdges.push({
                id: `${root.id}-cat-user-${child.id}`,
                source: `${root.id}-cat-user`,
                target: child.id,
                type: 'smoothstep'
              });
            });
          }
        }

        currentY += totalTreeHeight + 150;
      });
    } else if (layoutMode === 'columns') {
      // Group flat nodes by role
      const admins = [];
      const hrs = [];
      const managers = [];
      const users = [];

      orgData.forEach(root => {
        admins.push(root);
        const isCollapsed = collapsedNodeIds.has(root.id);
        if (root.children && !isCollapsed) {
          root.children.forEach(child => {
            const role = child.role ? child.role.toLowerCase() : '';
            if (role === 'admin') admins.push(child);
            else if (role === 'hr') hrs.push(child);
            else if (role === 'manager') managers.push(child);
            else users.push(child);
          });
        }
      });

      const colGapX = 320;
      const cardGapY = 180;

      // Position Admins (Col 0)
      admins.forEach((node, idx) => {
        newNodes.push({
          id: node.id,
          type: 'orgNode',
          position: { x: 0, y: idx * cardGapY },
          data: {
            ...node,
            label: node.email,
            abbr: node.role,
            department: node.role,
            level: 0,
            color: getRoleColor(node.role),
            onClick: () => setSelectedNodeId(prev => prev === node.id ? null : node.id),
            hasChildren: node.children && node.children.length > 0 && orgData.some(r => r.id === node.id),
            isCollapsed: collapsedNodeIds.has(node.id),
            onToggleCollapse: () => toggleCollapse(node.id),
            layoutMode,
          }
        });
      });

      // Position HRs (Col 1)
      hrs.forEach((node, idx) => {
        newNodes.push({
          id: node.id,
          type: 'orgNode',
          position: { x: colGapX, y: idx * cardGapY },
          data: {
            ...node,
            label: node.email,
            abbr: node.role,
            department: node.role,
            level: 1,
            color: getRoleColor(node.role),
            onClick: () => setSelectedNodeId(prev => prev === node.id ? null : node.id),
            layoutMode,
          }
        });
      });

      // Position Managers (Col 2)
      managers.forEach((node, idx) => {
        newNodes.push({
          id: node.id,
          type: 'orgNode',
          position: { x: colGapX * 2, y: idx * cardGapY },
          data: {
            ...node,
            label: node.email,
            abbr: node.role,
            department: node.role,
            level: 1,
            color: getRoleColor(node.role),
            onClick: () => setSelectedNodeId(prev => prev === node.id ? null : node.id),
            layoutMode,
          }
        });
      });

      // Position Users (Col 3)
      users.forEach((node, idx) => {
        newNodes.push({
          id: node.id,
          type: 'orgNode',
          position: { x: colGapX * 3, y: idx * cardGapY },
          data: {
            ...node,
            label: node.email,
            abbr: node.role,
            department: node.role,
            level: 1,
            color: getRoleColor(node.role),
            onClick: () => setSelectedNodeId(prev => prev === node.id ? null : node.id),
            layoutMode,
          }
        });
      });

      // Create Edges
      orgData.forEach(root => {
        const isCollapsed = collapsedNodeIds.has(root.id);
        if (root.children && !isCollapsed) {
          root.children.forEach(child => {
            newEdges.push({
              id: `${root.id}-${child.id}`,
              source: root.id,
              target: child.id,
              type: 'smoothstep'
            });
          });
        }
      });
    } else {
      // Category Grouped Vertical Tree Layout
      const rootHeight = 220;
      const childHeight = 390;
      const childHorizontalGap = 270;

      let currentX = 0;

      orgData.forEach((root) => {
        // Group children by role
        const hrChildren = [];
        const managerChildren = [];
        const userChildren = [];

        if (root.children) {
          root.children.forEach(child => {
            const role = child.role ? child.role.toLowerCase() : '';
            if (role === 'hr') hrChildren.push(child);
            else if (role === 'manager') managerChildren.push(child);
            else userChildren.push(child);
          });
        }

        // Check category collapse states
        const hrCollapsed = collapsedNodeIds.has(`${root.id}-cat-hr`);
        const managerCollapsed = collapsedNodeIds.has(`${root.id}-cat-manager`);
        const userCollapsed = collapsedNodeIds.has(`${root.id}-cat-user`);

        // Compute spans
        const hrSpan = (!hrCollapsed && hrChildren.length > 0) ? (hrChildren.length - 1) * childHorizontalGap : 0;
        const managerSpan = (!managerCollapsed && managerChildren.length > 0) ? (managerChildren.length - 1) * childHorizontalGap : 0;
        const userSpan = (!userCollapsed && userChildren.length > 0) ? (userChildren.length - 1) * childHorizontalGap : 0;

        const hrWidth = Math.max(hrSpan + 240, 240);
        const managerWidth = Math.max(managerSpan + 240, 240);
        const userWidth = Math.max(userSpan + 240, 240);

        // Position category columns side by side
        const hrCatX = currentX + (hrWidth / 2);
        const managerCatX = hrCatX + (hrWidth / 2) + 60 + (managerWidth / 2);
        const userCatX = managerCatX + (managerWidth / 2) + 60 + (userWidth / 2);

        const totalTreeWidth = (userCatX + (userWidth / 2)) - currentX;
        const rootX = currentX + (totalTreeWidth / 2);

        // 1. Add Root Node
        newNodes.push({
          id: root.id,
          type: 'orgNode',
          position: { x: rootX - 120, y: 0 },
          data: {
            ...root,
            label: root.email,
            abbr: root.role,
            department: root.role,
            level: 0,
            color: getRoleColor(root.role),
            onClick: () => setSelectedNodeId(prev => prev === root.id ? null : root.id),
            hasChildren: false, // Directories are always visible under the root admin
            isCollapsed: false,
            layoutMode,
          }
        });

        // 2. HR Category Node
        if (hrChildren.length > 0) {
            newNodes.push({
              id: `${root.id}-cat-hr`,
              type: 'orgNode',
              position: { x: hrCatX - 120, y: rootHeight },
              data: {
                isCategory: true,
                name: 'HR Directory',
                department: 'Human Resources',
                color: '#10b981',
                memberCount: hrChildren.length,
                isCollapsed: hrCollapsed,
                onClick: () => toggleCollapse(`${root.id}-cat-hr`),
              }
            });

            newEdges.push({
              id: `${root.id}-${root.id}-cat-hr`,
              source: root.id,
              target: `${root.id}-cat-hr`,
              type: 'smoothstep'
            });

            if (!hrCollapsed) {
              hrChildren.forEach((child, idx) => {
                const childX = hrCatX - (hrSpan / 2) + (idx * childHorizontalGap) - 120;
                newNodes.push({
                  id: child.id,
                  type: 'orgNode',
                  position: { x: childX, y: childHeight },
                  data: {
                    ...child,
                    label: child.email,
                    abbr: child.role,
                    department: child.role,
                    level: 1,
                    color: getRoleColor(child.role),
                    onClick: () => setSelectedNodeId(prev => prev === child.id ? null : child.id),
                    layoutMode,
                  }
                });

                newEdges.push({
                  id: `${root.id}-cat-hr-${child.id}`,
                  source: `${root.id}-cat-hr`,
                  target: child.id,
                  type: 'smoothstep'
                });
              });
            }
          }

          // 3. Manager Category Node
          if (managerChildren.length > 0) {
            newNodes.push({
              id: `${root.id}-cat-manager`,
              type: 'orgNode',
              position: { x: managerCatX - 120, y: rootHeight },
              data: {
                isCategory: true,
                name: 'Manager Directory',
                department: 'Management',
                color: '#f97316',
                memberCount: managerChildren.length,
                isCollapsed: managerCollapsed,
                onClick: () => toggleCollapse(`${root.id}-cat-manager`),
              }
            });

            newEdges.push({
              id: `${root.id}-${root.id}-cat-manager`,
              source: root.id,
              target: `${root.id}-cat-manager`,
              type: 'smoothstep'
            });

            if (!managerCollapsed) {
              managerChildren.forEach((child, idx) => {
                const childX = managerCatX - (managerSpan / 2) + (idx * childHorizontalGap) - 120;
                newNodes.push({
                  id: child.id,
                  type: 'orgNode',
                  position: { x: childX, y: childHeight },
                  data: {
                    ...child,
                    label: child.email,
                    abbr: child.role,
                    department: child.role,
                    level: 1,
                    color: getRoleColor(child.role),
                    onClick: () => setSelectedNodeId(prev => prev === child.id ? null : child.id),
                    layoutMode,
                  }
                });

                newEdges.push({
                  id: `${root.id}-cat-manager-${child.id}`,
                  source: `${root.id}-cat-manager`,
                  target: child.id,
                  type: 'smoothstep'
                });
              });
            }
          }

          // 4. User Category Node
          if (userChildren.length > 0) {
            newNodes.push({
              id: `${root.id}-cat-user`,
              type: 'orgNode',
              position: { x: userCatX - 120, y: rootHeight },
              data: {
                isCategory: true,
                name: 'Users Directory',
                department: 'Standard Staff',
                color: '#64748b',
                memberCount: userChildren.length,
                isCollapsed: userCollapsed,
                onClick: () => toggleCollapse(`${root.id}-cat-user`),
              }
            });

            newEdges.push({
              id: `${root.id}-${root.id}-cat-user`,
              source: root.id,
              target: `${root.id}-cat-user`,
              type: 'smoothstep'
            });

            if (!userCollapsed) {
              userChildren.forEach((child, idx) => {
                const childX = userCatX - (userSpan / 2) + (idx * childHorizontalGap) - 120;
                newNodes.push({
                  id: child.id,
                  type: 'orgNode',
                  position: { x: childX, y: childHeight },
                  data: {
                    ...child,
                    label: child.email,
                    abbr: child.role,
                    department: child.role,
                    level: 1,
                    color: getRoleColor(child.role),
                    onClick: () => setSelectedNodeId(prev => prev === child.id ? null : child.id),
                    layoutMode,
                  }
                });

                newEdges.push({
                  id: `${root.id}-cat-user-${child.id}`,
                  source: `${root.id}-cat-user`,
                  target: child.id,
                  type: 'smoothstep'
                });
              });
            }
          }

        // Advance currentX
        currentX += totalTreeWidth + 300;
      });
    }

    setNodes(newNodes);
    setEdges(newEdges);
  }, [orgData, collapsedNodeIds, layoutMode, toggleCollapse, setNodes, setEdges]);

  // 2. Update visual states (dimmed, selected, jdCount) dynamically WITHOUT resetting positions
  useEffect(() => {
    setNodes(nds => nds.map(n => {
      const jds = getJDsForNode(n.data);
      return {
        ...n,
        data: {
          ...n.data,
          jdCount: jds.length,
          isSelected: selectedNodeId === n.id,
          isDimmed: checkIsDimmed(n.data),
        }
      };
    }));

    setEdges(eds => eds.map(e => {
      const isHighlighted = selectedNodeId === e.source || selectedNodeId === e.target;
      const srcNode = flatNodes.find(d => d.id === e.source);
      const trgNode = flatNodes.find(d => d.id === e.target);
      const isDimmedEdge = checkIsDimmed(srcNode) || checkIsDimmed(trgNode);
      const themeColor = getRoleColor(trgNode?.role);

      return {
        ...e,
        animated: isHighlighted && !isDimmedEdge,
        style: {
          stroke: isHighlighted ? themeColor : (document.documentElement.classList.contains('dark') ? '#334155' : '#cbd5e1'),
          strokeWidth: isHighlighted ? 3 : 2,
          opacity: isDimmedEdge ? 0.2 : (isHighlighted ? 1 : 0.7),
          transition: 'stroke 0.3s, stroke-width 0.3s, opacity 0.3s',
        }
      };
    }));
  }, [selectedNodeId, checkIsDimmed, getJDsForNode, flatNodes, setNodes, setEdges]);

  // 3. Auto-fit viewport on structural changes or deselecting a node
  useEffect(() => {
    if (reactFlowInstance) {
      const timer = setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.15, duration: 600 });
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [collapsedNodeIds, layoutMode, selectedNodeId === null, reactFlowInstance]);

  const selectedNode = flatNodes.find(h => h.id === selectedNodeId);
  const selectedJDs = selectedNode ? getJDsForNode(selectedNode) : [];

  const handleViewJD = useCallback((jd) => {
    window.open(`/admin/view/${jd.id}`, '_blank');
  }, []);

  const onInit = useCallback((instance) => {
    setReactFlowInstance(instance);
    instance.fitView({ padding: 0.15, duration: 800 });
  }, []);

  const handleResetLayout = useCallback(() => {
    setSearchQuery('');
    setSelectedDept('All');
    setSelectedNodeId(null);
    setCollapsedNodeIds(new Set());

    if (reactFlowInstance) {
      reactFlowInstance.fitView({ padding: 0.15, duration: 800 });
    }
  }, [reactFlowInstance]);

  const handleResetView = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ padding: 0.15, duration: 800 });
    }
  }, [reactFlowInstance]);

  return (
    <div className="flex h-[calc(100vh-210px)] min-h-[600px] bg-slate-50 dark:bg-[#020617] text-slate-800 dark:text-slate-100 rounded-[20px] overflow-hidden border border-slate-200 dark:border-slate-800/80 shadow-md transition-all duration-300 relative font-sans">

      {/* Flow Canvas */}
      <div className="flex-1 relative flex flex-col">

        {/* Workspace HUD Bar */}
        <div className="absolute top-6 left-6 right-6 z-10 flex items-center justify-between pointer-events-none">
          <div className="pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg px-5 py-3 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Folder className="text-indigo-500 fill-indigo-500/20" size={18} />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Organization Tree</h3>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
                <div className="text-[9px] font-black uppercase tracking-widest text-indigo-500 mt-0.5">Live Hierarchy</div>
              </div>
            </div>

            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />

            <div className="flex items-center gap-4 text-xs font-bold px-1">
              <div className="flex flex-col">
                <span className="text-[8px] text-slate-400 uppercase tracking-widest">Total Files</span>
                <span className="text-slate-900 dark:text-white">{metrics.total}</span>
              </div>
            </div>
          </div>

          <div className="pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <div className="relative flex items-center">
              <Search size={14} className="absolute left-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search directories..."
                className="w-48 pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-400 transition-all"
              />
            </div>

            <div className="relative flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
              <Filter size={12} className="text-slate-400 mr-2" />
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer pr-1"
              >
                {departments.map(d => (
                  <option key={d} value={d} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">{d}</option>
                ))}
              </select>
            </div>

            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />

            {/* Layout Toggle Segmented Control */}
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-0.5">
              <button
                onClick={() => {
                  setLayoutMode('vertical');
                  setTimeout(() => {
                    if (reactFlowInstance) reactFlowInstance.fitView({ padding: 0.15, duration: 600 });
                  }, 100);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${layoutMode === 'vertical' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                Vertical Grid
              </button>
              <button
                onClick={() => {
                  setLayoutMode('horizontal');
                  setTimeout(() => {
                    if (reactFlowInstance) reactFlowInstance.fitView({ padding: 0.15, duration: 600 });
                  }, 100);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${layoutMode === 'horizontal' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                Horizontal Stack
              </button>
              <button
                onClick={() => {
                  setLayoutMode('columns');
                  setTimeout(() => {
                    if (reactFlowInstance) reactFlowInstance.fitView({ padding: 0.15, duration: 600 });
                  }, 100);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${layoutMode === 'columns' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                Role Columns
              </button>
            </div>

            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />

            <div className="flex items-center gap-1">
              <button
                onClick={handleExpandAll}
                className="px-2.5 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="Expand All Branches"
              >
                Expand All
              </button>
              <button
                onClick={handleCollapseAll}
                className="px-2.5 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="Collapse All Branches"
              >
                Collapse All
              </button>
            </div>
          </div>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onInit={onInit}
          minZoom={0.2}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={true}
          zoomOnScroll={true}
          zoomOnPinch={true}
          zoomOnDoubleClick={true}
        >
          <Background variant="dots" gap={32} size={1.5} color="#94a3b8" className="opacity-30 dark:opacity-10" />
          <Controls
            showInteractive={false}
            className="!bg-white dark:!bg-slate-900 !border-slate-200 dark:!border-slate-800 !rounded-xl !shadow-md [&>button]:!border-slate-200 dark:[&>button]:!border-slate-800 [&>button]:!bg-transparent [&>button]:text-slate-500 hover:[&>button]:text-indigo-500"
          >
            <ControlButton onClick={handleResetLayout} title="Reset Layout & Filters">
              <RotateCcw />
            </ControlButton>
          </Controls>
        </ReactFlow>
      </div>

      {/* Side Panel */}
      {selectedNode && (
        <JDPanel
          node={selectedNode}
          jds={selectedJDs}
          onClose={() => setSelectedNodeId(null)}
          onViewJD={handleViewJD}
        />
      )}
    </div>
  );
}
