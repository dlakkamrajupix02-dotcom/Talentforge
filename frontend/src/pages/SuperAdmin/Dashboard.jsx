import React, { useState, useContext, useEffect, useCallback } from 'react';
import { Search, Shield, Users, Briefcase, Building2, FileText, Radio, ChevronRight, UserCheck, Calendar, TrendingUp, Minus, Crown, X, UserPlus, Mail, Lock, Eye, EyeOff, Sparkles, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { superAdminService } from '../../services/superAdminService';
import { JDContext } from '../../context/JDContext';
import TiltCard3D from '../../components/common/TiltCard3D';
import SuperAdminHero3D from '../../components/superadmin/SuperAdminHero3D';
import toast from 'react-hot-toast';

const ROLE_BY_TAB = {
  admins: 'Admin',
  hr: 'HR',
  managers: 'Manager',
  users: 'User',
};

const MEMBER_ROLES = [
  { value: 'Admin', label: 'Admin', description: 'Full organization control' },
  { value: 'Manager', label: 'Manager', description: 'Hiring manager access' },
  { value: 'HR', label: 'HR', description: 'HR operations access' },
  { value: 'User', label: 'End User', description: 'Candidate / end-user portal' },
];

const EMPTY_MEMBER_FORM = {
  full_name: '',
  email: '',
  password: '',
  role: 'Admin',
  country: '',
  color_code: '',
};

const SuperAdminDashboard = () => {
  const { user } = useContext(JDContext);
  const navigate = useNavigate();
  
  const [kpiData, setKpiData] = useState({ orgs: 0, users: 0, jds: 0, broadcasts: 0 });
  const [analyticsData, setAnalyticsData] = useState([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  const [orgData, setOrgData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('admins');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [memberForm, setMemberForm] = useState(EMPTY_MEMBER_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [isCreatingMember, setIsCreatingMember] = useState(false);

  const refreshAnalytics = useCallback(async () => {
    const analytics = await superAdminService.getJdAnalytics();
    setAnalyticsData(analytics);
    const totalUsers = analytics.reduce((acc, curr) => acc + curr.total_users, 0);
    const totalJds = analytics.reduce((acc, curr) => acc + curr.total_count, 0);
    setKpiData((prev) => ({ ...prev, users: totalUsers, jds: totalJds }));
    return analytics;
  }, []);

  const refreshOrgData = useCallback(async (orgName) => {
    const [data] = await Promise.all([
      superAdminService.getOrgMembersByName(orgName),
      refreshAnalytics(),
    ]);
    setOrgData(data);
    return data;
  }, [refreshAnalytics]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsInitialLoading(true);
      try {
        const [orgs, analytics, broadcasts] = await Promise.all([
          superAdminService.getAllOrganizations(),
          superAdminService.getJdAnalytics(),
          superAdminService.getActiveBroadcasts()
        ]);
        
        setAnalyticsData(analytics);
        
        const totalUsers = analytics.reduce((acc, curr) => acc + curr.total_users, 0);
        const totalJds = analytics.reduce((acc, curr) => acc + curr.total_count, 0);

        setKpiData({
          orgs: orgs.length,
          users: totalUsers,
          jds: totalJds,
          broadcasts: broadcasts.length
        });
      } catch (error) {
        console.error("Dashboard data load error:", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setIsInitialLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const handleOrgClick = async (orgName) => {
    setIsLoading(true);
    try {
      await refreshOrgData(orgName);
      setActiveTab('admins');
      toast.success(`${orgName} details loaded`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch org members");
    } finally {
      setIsLoading(false);
    }
  };

  const openAddMemberModal = () => {
    setMemberForm({
      ...EMPTY_MEMBER_FORM,
      role: ROLE_BY_TAB[activeTab] || 'Admin',
    });
    setShowPassword(false);
    setShowAddMemberModal(true);
  };

  const handleCreateMember = async (e) => {
    e.preventDefault();
    if (!orgData?.organization_id) return;
    if (!memberForm.full_name.trim() || !memberForm.email.trim() || !memberForm.password) {
      toast.error('Please fill in name, email, and password');
      return;
    }

    setIsCreatingMember(true);
    try {
      const payload = {
        full_name: memberForm.full_name.trim(),
        email: memberForm.email.trim(),
        password: memberForm.password,
        role: memberForm.role,
      };
      if (memberForm.country.trim()) payload.country = memberForm.country.trim();
      if (memberForm.color_code.trim()) payload.color_code = memberForm.color_code.trim();

      const result = await superAdminService.createOrgMember(orgData.organization_id, payload);
      await refreshOrgData(orgData.organization_name);

      const roleTabMap = { Admin: 'admins', HR: 'hr', Manager: 'managers', User: 'users' };
      setActiveTab(roleTabMap[memberForm.role] || 'admins');

      if (result?.email_sent === false) {
        toast.success('Member created, but welcome email could not be sent.');
      } else {
        toast.success(`${memberForm.role === 'User' ? 'End user' : memberForm.role} added successfully`);
      }

      setShowAddMemberModal(false);
      setMemberForm(EMPTY_MEMBER_FORM);
    } catch (error) {
      toast.error(error?.message || 'Failed to add member');
    } finally {
      setIsCreatingMember(false);
    }
  };

  useEffect(() => {
    const handleOpenModal = (e) => {
      if (e.detail?.orgName) {
        handleOrgClick(e.detail.orgName);
      }
    };
    window.addEventListener('open-org-modal', handleOpenModal);
    return () => window.removeEventListener('open-org-modal', handleOpenModal);
  }, []);

  const UserTable = ({ title, icon: Icon, users, colorClass }) => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 mb-5">
      <div className="flex items-center space-x-3 mb-5">
        <div className={`p-2 rounded-lg ${colorClass}`}>
          <Icon size={18} />
        </div>
        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-full text-xs font-semibold">{users?.length || 0}</span>
      </div>
      
      {users && users.length > 0 ? (
        <div className="overflow-auto max-h-[400px] custom-scrollbar border border-slate-100 rounded-lg">
          <table className="w-full text-sm text-left relative">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-20 shadow-sm">
              <tr>
                <th className="px-6 py-3 bg-slate-50">Name</th>
                <th className="px-6 py-3 bg-slate-50">Email</th>
                <th className="px-6 py-3 bg-slate-50">Status</th>
                <th className="px-6 py-3 bg-slate-50">Type</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">{user.name}</td>
                  <td className="px-6 py-4 text-slate-600">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      (user.status || '').toLowerCase() === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {user.status || 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{user.user_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500 text-sm">
          No users found in this category.
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full relative">
      {/* 3D Interactive Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#090d16] via-[#0f172a] to-[#111827] text-white p-6 md:p-8 mb-10 shadow-2xl border border-indigo-500/30 min-h-[240px] flex flex-col justify-center"
      >
        {/* Futuristic Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293715_1px,transparent_1px),linear-gradient(to_bottom,#1f293715_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-40" />

        {/* 3D Multi-Tenant Cloud Architecture Matrix Canvas */}
        <div className="absolute right-0 top-0 bottom-0 w-full md:w-[55%] lg:w-[58%] h-full z-0 pointer-events-auto">
          <SuperAdminHero3D className="h-full w-full" />
        </div>
        
        <div className="relative z-10 max-w-xl pr-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-400/30 text-indigo-300 text-xs font-semibold mb-3.5 backdrop-blur-md shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Super Admin Cloud Core</span>
            <span className="text-[10px] text-indigo-400 font-mono">v3.0</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-black tracking-tight text-white leading-tight">
            Welcome back, <span className="bg-gradient-to-r from-indigo-300 via-sky-300 to-pink-300 bg-clip-text text-transparent">{user?.full_name?.split(' ')[0] || 'Super Admin'}</span>!
          </h1>
          <p className="text-slate-300/90 text-sm sm:text-base mt-2.5 font-normal leading-relaxed max-w-lg">
            Live multi-tenant architecture with real-time telemetry, server node orchestration, and cross-organization governance.
          </p>

          <div className="pt-4 flex items-center gap-3">
            <button
              onClick={() => navigate('/superadmin/agent')}
              className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-violet-500/25 flex items-center gap-2 border border-violet-400/30 hover:scale-105 transition-all"
            >
              <Bot size={15} />
              <span>Launch AI Intelligence Agent</span>
              <Sparkles size={13} className="text-violet-200" />
            </button>
          </div>
        </div>
      </motion.div>

      {isInitialLoading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-600">Loading interactive tenant ecosystem...</p>
        </div>
      ) : (
        <>
          {/* 3D KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {/* KPI 1 */}
            <TiltCard3D
              onClick={() => navigate('/superadmin/organizations')}
              className="cursor-pointer bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:border-indigo-300 transition-all group overflow-hidden"
              maxTilt={12}
            >
              <div className="flex justify-between items-start mb-4" style={{ transform: 'translateZ(25px)' }}>
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm group-hover:shadow-indigo-300">
                  <Building2 size={24} />
                </div>
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping opacity-75" />
              </div>
              <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight" style={{ transform: 'translateZ(30px)' }}>{kpiData.orgs}</h3>
              <p className="text-slate-500 text-sm font-medium mt-1" style={{ transform: 'translateZ(18px)' }}>Total Organizations</p>
            </TiltCard3D>
            
            {/* KPI 2 */}
            <TiltCard3D
              onClick={() => navigate('/superadmin/analytics')}
              className="cursor-pointer bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:border-blue-300 transition-all group overflow-hidden"
              maxTilt={12}
            >
              <div className="flex justify-between items-start mb-4" style={{ transform: 'translateZ(25px)' }}>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm group-hover:shadow-blue-300">
                  <Users size={24} />
                </div>
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping opacity-75" />
              </div>
              <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight" style={{ transform: 'translateZ(30px)' }}>{kpiData.users}</h3>
              <p className="text-slate-500 text-sm font-medium mt-1" style={{ transform: 'translateZ(18px)' }}>Total Users</p>
            </TiltCard3D>

            {/* KPI 3 */}
            <TiltCard3D
              onClick={() => navigate('/superadmin/analytics')}
              className="cursor-pointer bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:border-emerald-300 transition-all group overflow-hidden"
              maxTilt={12}
            >
              <div className="flex justify-between items-start mb-4" style={{ transform: 'translateZ(25px)' }}>
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm group-hover:shadow-emerald-300">
                  <FileText size={24} />
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-75" />
              </div>
              <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight" style={{ transform: 'translateZ(30px)' }}>{kpiData.jds}</h3>
              <p className="text-slate-500 text-sm font-medium mt-1" style={{ transform: 'translateZ(18px)' }}>JDs Generated</p>
            </TiltCard3D>

            {/* KPI 4 */}
            <TiltCard3D
              onClick={() => navigate('/superadmin/broadcasts')}
              className="cursor-pointer bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:border-rose-300 transition-all group overflow-hidden"
              maxTilt={12}
            >
              <div className="flex justify-between items-start mb-4" style={{ transform: 'translateZ(25px)' }}>
                <div className="p-3 bg-rose-50 text-rose-600 rounded-xl group-hover:bg-rose-600 group-hover:text-white transition-all shadow-sm group-hover:shadow-rose-300">
                  <Radio size={24} />
                </div>
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping opacity-75" />
              </div>
              <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight" style={{ transform: 'translateZ(30px)' }}>{kpiData.broadcasts}</h3>
              <p className="text-slate-500 text-sm font-medium mt-1" style={{ transform: 'translateZ(18px)' }}>Active Broadcasts</p>
            </TiltCard3D>
          </div>

          {/* 3D Organization Cards Directory */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Building2 size={22} />
                </div>
                <span>Organizations Directory</span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100">
                  {analyticsData.length} tenants
                </span>
              </h2>
            </div>

            <motion.div 
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.06 }
                }
              }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {analyticsData.map(org => (
                <motion.div
                  key={org.org_id}
                  variants={{
                    hidden: { opacity: 0, y: 20, scale: 0.95 },
                    visible: { opacity: 1, y: 0, scale: 1 }
                  }}
                  transition={{ duration: 0.35 }}
                  className="h-full"
                >
                  <TiltCard3D
                    onClick={() => handleOrgClick(org.org_name)}
                    maxTilt={9}
                    scale={1.025}
                    perspective={1200}
                    className="cursor-pointer bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-slate-100 hover:border-indigo-400 hover:shadow-2xl transition-all group relative overflow-hidden flex flex-col h-full"
                  >
                    {/* Top Header Section (Purple/Indigo Gradient with 3D Depth) */}
                    <div 
                      style={{ transform: 'translateZ(20px)' }}
                      className="bg-gradient-to-br from-[#eef2ff] via-[#f5f3ff] to-white p-4 relative border-b border-slate-100/80"
                    >
                      <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-indigo-500/10 via-purple-500/5 to-transparent pointer-events-none"></div>
                      <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center space-x-3 max-w-[85%]">
                          <div 
                            style={{ transform: 'translateZ(30px)' }}
                            className="w-11 h-11 shrink-0 bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200/60 group-hover:scale-105 transition-transform"
                          >
                            <Building2 size={22} className="text-white" />
                          </div>
                          <div className="truncate">
                            <h3 className="text-base font-bold text-[#0f172a] truncate leading-tight group-hover:text-indigo-600 transition-colors">
                              {org.org_name}
                            </h3>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Organization Overview</p>
                          </div>
                        </div>
                        <div 
                          style={{ transform: 'translateZ(25px)' }}
                          className="w-8 h-8 bg-white rounded-lg shadow-sm border border-slate-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-md transition-all shrink-0"
                        >
                          <ChevronRight size={16} strokeWidth={2.5} />
                        </div>
                      </div>
                    </div>

                    {/* 4 Stat Cards Grid with 3D pop */}
                    <div className="p-4 bg-white flex-1" style={{ transform: 'translateZ(15px)' }}>
                      <div className="grid grid-cols-2 gap-3">
                        {/* Admins */}
                        <div className="bg-white hover:bg-[#fff1f2] p-2.5 rounded-xl border border-[#ffe4e8] shadow-sm flex items-center justify-between hover:shadow-md hover:-translate-y-0.5 transition-all">
                          <div className="flex items-center space-x-2">
                             <div className="w-6 h-6 rounded-full bg-[#ffe4e8] flex items-center justify-center shrink-0">
                               <UserCheck size={12} className="text-[#e11d48]" />
                             </div>
                             <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Admins</span>
                          </div>
                          <span className="text-sm font-extrabold text-[#e11d48]">{org.admin_count || 0}</span>
                        </div>
                        
                        {/* HR */}
                        <div className="bg-white hover:bg-[#eef2ff] p-2.5 rounded-xl border border-[#e0e7ff] shadow-sm flex items-center justify-between hover:shadow-md hover:-translate-y-0.5 transition-all">
                          <div className="flex items-center space-x-2">
                             <div className="w-6 h-6 rounded-full bg-[#e0e7ff] flex items-center justify-center shrink-0">
                               <Users size={12} className="text-[#4f46e5]" />
                             </div>
                             <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">HR</span>
                          </div>
                          <span className="text-sm font-extrabold text-[#4f46e5]">{org.hr_count || 0}</span>
                        </div>
                        
                        {/* Managers */}
                        <div className="bg-white hover:bg-[#f0fdf4] p-2.5 rounded-xl border border-[#dcfce7] shadow-sm flex items-center justify-between hover:shadow-md hover:-translate-y-0.5 transition-all">
                          <div className="flex items-center space-x-2">
                             <div className="w-6 h-6 rounded-full bg-[#dcfce7] flex items-center justify-center shrink-0">
                               <UserCheck size={12} className="text-[#16a34a]" />
                             </div>
                             <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Managers</span>
                          </div>
                          <span className="text-sm font-extrabold text-[#16a34a]">{org.manager_count || 0}</span>
                        </div>
                        
                        {/* Users */}
                        <div className="bg-white hover:bg-slate-50 p-2.5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md hover:-translate-y-0.5 transition-all">
                          <div className="flex items-center space-x-2">
                             <div className="w-6 h-6 rounded-full bg-[#e2e8f0] flex items-center justify-center shrink-0">
                               <Users size={12} className="text-[#475569]" />
                             </div>
                             <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Users</span>
                          </div>
                          <span className="text-sm font-extrabold text-[#334155]">{org.enduser_count || 0}</span>
                        </div>
                      </div>
                    </div>
                  </TiltCard3D>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </>
      )}

      {isLoading && !isInitialLoading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      <AnimatePresence>
      {orgData && !isLoading && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 sm:p-6 md:p-8"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-slate-50 w-full max-w-5xl h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="overflow-y-auto p-4 md:p-6 w-full flex-1 custom-scrollbar">
          
          {/* OVERVIEW CARD */}
          {(() => {
            const counts = {
              admin_count: orgData.admins?.length || 0,
              hr_count: orgData.hr?.length || 0,
              manager_count: orgData.managers?.length || 0,
              enduser_count: orgData.end_users?.length || 0,
            };
            const totalMembers = counts.admin_count + counts.hr_count + counts.manager_count + counts.enduser_count;

            return (
              <div className="bg-white rounded-[20px] shadow-sm border border-slate-100 overflow-hidden mb-6 relative">
                {/* Top Header Section (Purple Gradient) */}
                <div className="bg-gradient-to-br from-[#eff3ff] via-[#f5f0ff] to-white p-4 relative border-b border-slate-50">
                  <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-indigo-500/10 via-purple-500/5 to-transparent pointer-events-none"></div>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-indigo-600/30 via-purple-600/10 to-transparent rounded-bl-full pointer-events-none"></div>
                  
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm shadow-indigo-200/50">
                        <Building2 size={24} className="text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-[#0f172a] tracking-tight leading-none mb-1">{orgData.organization_name}</h2>
                        <p className="text-xs text-slate-500 font-medium">Organization Overview</p>
                      </div>
                    </div>
                    <button onClick={() => setOrgData(null)} className="w-8 h-8 bg-white rounded-lg shadow-sm border border-slate-100 flex items-center justify-center text-rose-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors">
                      <X size={18} strokeWidth={2.5} />
                    </button>
                  </div>
                  <div className="flex justify-end mt-4 relative z-10">
                    <button
                      type="button"
                      onClick={openAddMemberModal}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-indigo-200 transition-colors"
                    >
                      <UserPlus size={16} />
                      Add Member
                    </button>
                  </div>
                </div>

                {/* 4 Cards Grid */}
                <div className="p-4">
                  <div className="grid grid-cols-4 gap-4">
                    {/* Admins Card */}
                    <div className="bg-white border border-[#ffecf0] shadow-sm rounded-xl p-4 flex items-center justify-between relative overflow-hidden group hover:shadow-md transition-all">
                      <Crown size={48} className="absolute -right-2 -bottom-2 text-rose-500/5 group-hover:text-rose-500/10 transition-colors" />
                      <div className="flex items-center space-x-3 relative z-10">
                        <div className="w-10 h-10 rounded-full bg-[#ffe4e8] flex items-center justify-center shrink-0">
                          <UserCheck size={20} className="text-[#e11d48]" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-600 tracking-wide uppercase mb-0.5">Admins</p>
                          <h3 className="text-2xl font-bold text-[#e11d48] leading-none">{counts.admin_count}</h3>
                        </div>
                      </div>
                      <div className="bg-[#ffe4e8] text-[#e11d48] px-2 py-1 rounded flex items-center space-x-1 self-end mt-4 relative z-10">
                        <TrendingUp size={12} strokeWidth={2.5} />
                        <span className="text-[10px] font-bold">0%</span>
                      </div>
                    </div>

                    {/* HR Card */}
                    <div className="bg-white border border-[#eff3ff] shadow-sm rounded-xl p-4 flex items-center justify-between relative overflow-hidden group hover:shadow-md transition-all">
                      <Users size={48} className="absolute -right-2 -bottom-2 text-indigo-500/5 group-hover:text-indigo-500/10 transition-colors" />
                      <div className="flex items-center space-x-3 relative z-10">
                        <div className="w-10 h-10 rounded-full bg-[#e0e7ff] flex items-center justify-center shrink-0">
                          <Users size={20} className="text-[#4f46e5]" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-600 tracking-wide uppercase mb-0.5">HR</p>
                          <h3 className="text-2xl font-bold text-[#4f46e5] leading-none">{counts.hr_count}</h3>
                        </div>
                      </div>
                      <div className="bg-[#e0e7ff] text-[#4f46e5] px-2 py-1 rounded flex items-center space-x-1 self-end mt-4 relative z-10">
                        <TrendingUp size={12} strokeWidth={2.5} />
                        <span className="text-[10px] font-bold">12%</span>
                      </div>
                    </div>

                    {/* Managers Card */}
                    <div className="bg-white border border-[#dcfce7] shadow-sm rounded-xl p-4 flex items-center justify-between relative overflow-hidden group hover:shadow-md transition-all">
                      <UserCheck size={48} className="absolute -right-2 -bottom-2 text-emerald-500/5 group-hover:text-emerald-500/10 transition-colors" />
                      <div className="flex items-center space-x-3 relative z-10">
                        <div className="w-10 h-10 rounded-full bg-[#dcfce7] flex items-center justify-center shrink-0">
                          <UserCheck size={20} className="text-[#16a34a]" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-600 tracking-wide uppercase mb-0.5">Managers</p>
                          <h3 className="text-2xl font-bold text-[#16a34a] leading-none">{counts.manager_count}</h3>
                        </div>
                      </div>
                      <div className="bg-[#dcfce7] text-[#16a34a] px-2 py-1 rounded flex items-center space-x-1 self-end mt-4 relative z-10">
                        <TrendingUp size={12} strokeWidth={2.5} />
                        <span className="text-[10px] font-bold">6%</span>
                      </div>
                    </div>

                    {/* Users Card */}
                    <div className="bg-white border border-slate-100 shadow-sm rounded-xl p-4 flex items-center justify-between relative overflow-hidden group hover:shadow-md transition-all">
                      <Users size={48} className="absolute -right-2 -bottom-2 text-slate-500/5 group-hover:text-slate-500/10 transition-colors" />
                      <div className="flex items-center space-x-3 relative z-10">
                        <div className="w-10 h-10 rounded-full bg-[#e2e8f0] flex items-center justify-center shrink-0">
                          <Users size={20} className="text-[#475569]" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-600 tracking-wide uppercase mb-0.5">Users</p>
                          <h3 className="text-2xl font-bold text-[#334155] leading-none">{counts.enduser_count}</h3>
                        </div>
                      </div>
                      <div className="bg-[#e2e8f0] text-[#475569] px-2 py-1 rounded flex items-center space-x-1 self-end mt-4 relative z-10">
                        <Minus size={12} strokeWidth={2.5} />
                        <span className="text-[10px] font-bold">0%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-slate-50 bg-slate-50/50 flex items-center justify-center text-sm">
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center mr-2">
                      <Users size={14} className="text-indigo-600" />
                    </div>
                    <span className="font-medium text-slate-500">Total Members</span>
                    <span className="font-bold text-indigo-600 ml-2">{totalMembers}</span>
                  </div>
                  
                  <div className="h-4 w-px bg-slate-200 mx-5"></div>
                  
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-lg bg-slate-200 flex items-center justify-center mr-2">
                      <Calendar size={14} className="text-slate-500" />
                    </div>
                    <span className="font-medium text-slate-500">Last Updated</span>
                    <span className="font-bold text-slate-700 ml-2">04 Aug, 2026</span>
                  </div>
                </div>
              </div>
            );
          })()}

            {/* Tabs Navigation */}
            <div className="flex border-b border-slate-200 mb-6 overflow-x-auto hide-scrollbar">
              <button 
                onClick={() => setActiveTab('admins')} 
                className={`flex items-center space-x-2 pb-3 px-4 font-semibold text-sm transition-colors whitespace-nowrap ${activeTab === 'admins' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Shield size={16} />
                <span>Platform Administrators</span>
              </button>
              <button 
                onClick={() => setActiveTab('hr')} 
                className={`flex items-center space-x-2 pb-3 px-4 font-semibold text-sm transition-colors whitespace-nowrap ${activeTab === 'hr' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Briefcase size={16} />
                <span>Human Resources (HR)</span>
              </button>
              <button 
                onClick={() => setActiveTab('managers')} 
                className={`flex items-center space-x-2 pb-3 px-4 font-semibold text-sm transition-colors whitespace-nowrap ${activeTab === 'managers' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Users size={16} />
                <span>Hiring Managers</span>
              </button>
              <button 
                onClick={() => setActiveTab('users')} 
                className={`flex items-center space-x-2 pb-3 px-4 font-semibold text-sm transition-colors whitespace-nowrap ${activeTab === 'users' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <UserCheck size={16} />
                <span>Users</span>
              </button>
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'admins' && <UserTable title="Platform Administrators" icon={Shield} users={orgData.admins} colorClass="bg-rose-100 text-rose-600" />}
                {activeTab === 'hr' && <UserTable title="Human Resources (HR)" icon={Briefcase} users={orgData.hr} colorClass="bg-indigo-100 text-indigo-600" />}
                {activeTab === 'managers' && <UserTable title="Hiring Managers" icon={Users} users={orgData.managers} colorClass="bg-emerald-100 text-emerald-600" />}
                {activeTab === 'users' && <UserTable title="Users" icon={UserCheck} users={orgData.end_users || orgData.users || []} colorClass="bg-slate-200 text-slate-700" />}
              </motion.div>
            </AnimatePresence>

            {showAddMemberModal && (
              <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                <div
                  className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                  onClick={() => !isCreatingMember && setShowAddMemberModal(false)}
                />
                <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
                  <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                        <UserPlus size={20} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">Add Organization Member</h3>
                        <p className="text-xs text-slate-500">Created by Super Admin · {orgData.organization_name}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => !isCreatingMember && setShowAddMemberModal(false)}
                      className="p-2 rounded-lg text-slate-400 hover:bg-slate-50"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleCreateMember} className="p-6 space-y-5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Full Name</label>
                      <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="text"
                          value={memberForm.full_name}
                          onChange={(e) => setMemberForm((prev) => ({ ...prev, full_name: e.target.value }))}
                          placeholder="John Doe"
                          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="email"
                          value={memberForm.email}
                          onChange={(e) => setMemberForm((prev) => ({ ...prev, email: e.target.value }))}
                          placeholder="user@company.com"
                          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={memberForm.password}
                          onChange={(e) => setMemberForm((prev) => ({ ...prev, password: e.target.value }))}
                          placeholder="Minimum 8 characters"
                          className="w-full pl-10 pr-11 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          required
                          minLength={8}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Role</label>
                      <div className="grid grid-cols-2 gap-2">
                        {MEMBER_ROLES.map((role) => (
                          <button
                            key={role.value}
                            type="button"
                            onClick={() => setMemberForm((prev) => ({ ...prev, role: role.value }))}
                            className={`p-3 rounded-xl border-2 text-left transition-all ${
                              memberForm.role === role.value
                                ? 'border-indigo-600 bg-indigo-50'
                                : 'border-slate-200 hover:border-indigo-200'
                            }`}
                          >
                            <p className={`text-sm font-bold ${memberForm.role === role.value ? 'text-indigo-700' : 'text-slate-700'}`}>
                              {role.label}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">{role.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Country (optional)</label>
                        <input
                          type="text"
                          value={memberForm.country}
                          onChange={(e) => setMemberForm((prev) => ({ ...prev, country: e.target.value }))}
                          placeholder="India"
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Color (optional)</label>
                        <input
                          type="text"
                          value={memberForm.color_code}
                          onChange={(e) => setMemberForm((prev) => ({ ...prev, color_code: e.target.value }))}
                          placeholder="#667eea"
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddMemberModal(false)}
                        disabled={isCreatingMember}
                        className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isCreatingMember}
                        className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
                      >
                        {isCreatingMember ? 'Adding...' : 'Add Member'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {!orgData && !isLoading && !isInitialLoading && (
        <div className="text-center py-20 bg-slate-50/50 rounded-2xl border border-slate-100 border-dashed">
          <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Users className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-700">Select an Organization</h3>
          <p className="text-slate-500 mt-2 max-w-md mx-auto">Click on any organization card above to view its complete member directory, including all administrators, HR, and managers.</p>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
