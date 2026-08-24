import React, { useState, useContext, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutGrid,
  FileText,
  BarChart2,
  LayoutTemplate,
  Settings,
  Shield,
  Zap,
  Plus,
  ChevronRight,
  ChevronLeft,
  Menu,
  Briefcase,
  Target,
  Building2,
  Radio,
  MessageSquareHeart,
  Bot,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { JDContext } from '../context/JDContext';
import { isSuperAdminRole, isOrgAdminRole, isHrRole, isManagerRole, isEndUserRole } from '../utils/roles';

const Sidebar = () => {
  const { theme, user, allJDs } = useContext(JDContext);
  const isSuperAdmin = isSuperAdminRole(user?.role);
  const isAdmin = isOrgAdminRole(user?.role);
  const isHR = isHrRole(user?.role);
  const isManager = isManagerRole(user?.role);
  const isEndUser = isEndUserRole(user?.role);

  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const location = useLocation();

  const toggleSidebar = () => {
    setIsCollapsed(next => {
      localStorage.setItem('sidebar_collapsed', JSON.stringify(!next));
      return !next;
    });
  };

  const pendingCount = React.useMemo(() => {
    if (!isManager || !user?.email) return 0;
    return allJDs.filter(jd =>
      jd.assignedTo === user.email &&
      (jd.status || "").toLowerCase().includes('review step')
    ).length;
  }, [allJDs, user?.email, isManager]);

  useEffect(() => {
    const isDetailOrGenerate = location.pathname.includes('/generate') || (location.pathname.includes('/jd/') && !location.pathname.includes('/my-jds'));
    const isExpandablePage = location.pathname.includes('/dashboard') ||
      location.pathname.includes('/templates') ||
      location.pathname.includes('/my-jds');

    if (isDetailOrGenerate) {
      setIsCollapsed(true);
      localStorage.setItem('sidebar_collapsed', 'true');
    } else if (isExpandablePage) {
      setIsCollapsed(false);
      localStorage.setItem('sidebar_collapsed', 'false');
    }
  }, [location.pathname]);

  const allMenuItems = [
    { name: 'Dashboard', icon: LayoutGrid, path: isSuperAdmin ? '/superadmin/dashboard' : isHR ? '/hr/dashboard' : isManager ? '/manager/dashboard' : isEndUser ? '/enduser/dashboard' : '/admin/dashboard' },
    { name: 'AI Intelligence Agent', icon: Bot, path: '/superadmin/agent' },
    { name: 'Organizations', icon: Building2, path: '/superadmin/organizations' },
    { name: 'System Broadcasts', icon: Radio, path: '/superadmin/broadcasts' },
    { name: 'JD Library', icon: FileText, path: isHR ? '/hr/my-jds' : isManager ? '/manager/my-jds' : '/admin/my-jds' },
    { name: 'Job Openings', icon: Briefcase, path: isHR ? '/hr/job-openings' : isManager ? '/manager/job-openings' : isEndUser ? '/enduser/job-openings' : '/admin/job-openings' },
    { name: 'My Jobs', icon: BarChart2, path: '/enduser/performance' },
    { name: 'Inbox & Tasks', icon: Menu, path: '/enduser/inbox' },
    { name: 'Synchronization', icon: Zap, path: '/admin/push-csod' },
    { name: 'Templates', icon: LayoutTemplate, path: isHR ? '/hr/templates' : '/admin/templates' },
    { name: 'My Assigned JDs', icon: Plus, path: '/admin/assigned-jds' },
    { name: 'Analytics', icon: BarChart2, path: isSuperAdmin ? '/superadmin/analytics' : '/admin/analytics' },
    { name: 'Platform Voices', icon: MessageSquareHeart, path: '/superadmin/platform-voices' },
    { name: 'Competency Library', icon: Target, path: '/admin/competencies' },
    { name: 'Admin Console', icon: Settings, path: '/admin/settings' },
  ];

  const menuItems = isSuperAdmin
    ? allMenuItems.filter(item => ['Dashboard', 'Organizations', 'Analytics', 'Platform Voices', 'System Broadcasts'].includes(item.name))
    : isAdmin
      ? allMenuItems.filter(item => ['Dashboard', 'JD Library', 'Job Openings', 'My Assigned JDs', 'Synchronization', 'Templates', 'Analytics', 'Competency Library', 'Admin Console'].includes(item.name))
      : isHR
        ? allMenuItems.filter(item => ['Dashboard', 'JD Library', 'Job Openings', 'Templates'].includes(item.name))
        : isManager
          ? allMenuItems.filter(item => ['Dashboard', 'JD Library', 'Job Openings'].includes(item.name))
          : isEndUser
            ? allMenuItems.filter(item => ['Dashboard', 'My Jobs', 'Inbox & Tasks', 'Job Openings'].includes(item.name))
            : [];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 },
  };

  return (
    <motion.aside
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      onClick={() => {
        if (isCollapsed) {
          setIsCollapsed(false);
          localStorage.setItem('sidebar_collapsed', 'false');
        }
      }}
      className={`h-screen bg-white dark:bg-[#020617] text-slate-600 dark:text-slate-400 flex flex-col sticky top-0 left-0 z-[1005] border-r border-slate-200 dark:border-white/10 overflow-visible shrink-0 font-sans transition-all duration-300 ease-in-out ${isCollapsed ? "cursor-pointer hover:bg-slate-50/40 dark:hover:bg-white/[0.01]" : ""}`}
      style={{ width: isCollapsed ? '80px' : '270px' }}
    >
      {/* MESH GRADIENT GLOWS */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/5 dark:bg-indigo-600/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-[20%] right-[-10%] w-[30%] h-[30%] bg-violet-600/5 dark:bg-violet-600/10 blur-[80px] rounded-full" />
      </div>

      {/* OVERLAY GLASS EFFECT */}
      <div className="absolute inset-0 backdrop-blur-[1px] bg-white/20 dark:bg-gradient-to-b dark:from-transparent dark:via-[#020617]/50 dark:to-[#020617] pointer-events-none" />

      <div className="relative z-10 flex flex-col h-full">
        {/* TOP BRAND SECTION */}
        <div className={`h-16 px-4 shrink-0 border-b border-slate-200/80 dark:border-white/10 relative flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div
            className="cursor-pointer group relative w-full h-10"
            onClick={() => window.location.reload()}
          >
            {/* Collapsed State Logo */}
            <div className={`absolute left-0 top-0 w-[52px] h-11 overflow-hidden shrink-0 flex justify-start items-center transition-opacity duration-300 ease-in-out ${isCollapsed ? 'opacity-100 z-10 delay-150' : 'opacity-0 z-0'}`}>
              <img
                src="/TalentForge-logos.png"
                alt="TalentForge"
                className="h-full max-w-none object-cover object-left"
              />
            </div>

            {/* Expanded State Logo */}
            <div className={`absolute left-0 top-0 h-10 flex items-center w-[160px] transition-opacity duration-300 ease-in-out ${isCollapsed ? 'opacity-0 z-0' : 'opacity-100 z-10 delay-150'}`}>
              <img
                src="/TalentForge-logos.png"
                alt="TalentForge"
                className="w-full h-auto object-contain object-left shrink-0"
              />
            </div>
          </div>
        </div>

        {/* PRIMARY NAVIGATION */}
        <div className="flex-1 px-4 py-6 space-y-8 overflow-y-auto custom-scrollbar">
          {/* QUICK ACTIONS SECTION */}
          {!isManager && !isEndUser && !isSuperAdmin && (
            <motion.div variants={itemVariants} className={isCollapsed ? "flex justify-center" : ""}>
              <NavLink
                to={isHR ? "/hr/generate" : isManager ? "/manager/generate" : "/admin/generate"}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCollapsed(true);
                  localStorage.setItem('sidebar_collapsed', 'true');
                }}
                className={`
                flex items-center gap-3 border border-slate-200 dark:border-indigo-500/20 bg-white dark:bg-indigo-500/5 text-slate-900 dark:text-white rounded-2xl shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.2)] hover:bg-slate-50 dark:hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 group overflow-hidden
                ${isCollapsed ? "w-12 h-12 justify-center p-0" : "px-4 py-2.5"}
              `}
              >
                <div className="w-8 h-8 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-lg flex items-center justify-center group-hover:rotate-90 transition-transform duration-500 shrink-0 border border-indigo-500/20">
                  <Plus size={18} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="font-bold text-[14px] tracking-tight whitespace-nowrap"
                  >
                    Create New JD
                  </motion.span>
                )}
              </NavLink>
            </motion.div>
          )}

          <div>
            {!isCollapsed && (
              <div className="px-4 mb-4">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.22em] select-none">Core Platform</span>
              </div>
            )}

            <nav className="space-y-1">
              {menuItems.map((item) => {
                let isActive = location.pathname === item.path;

                // Special mapping for EndUser sub-pages
                if (isEndUser) {
                  if (item.name === 'Inbox & Tasks' && location.pathname.includes('/enduser/jd-review')) isActive = true;
                  if (item.name === 'My Jobs' && location.pathname.includes('/enduser/performance')) isActive = true;
                  if (item.name === 'Dashboard' && location.pathname === '/enduser/dashboard') isActive = true;
                }

                return (
                  <motion.div key={item.path} variants={itemVariants}>
                    <NavLink
                      to={item.path}
                      className={`
                        group relative flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300
                        ${isActive
                          ? "text-blue-600 dark:text-white bg-blue-50/50 dark:bg-white/[0.03] shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-white/[0.02]"}
                        ${isCollapsed ? "justify-center px-0 w-12 h-12 mx-auto" : ""}
                      `}
                    >
                      {/* Active Background Pill Effect */}
                      {isActive && (
                        <motion.div
                          layoutId="active-pill"
                          className="absolute inset-0 bg-gradient-to-r from-blue-500/5 dark:from-indigo-500/10 via-blue-500/0 dark:via-violet-500/5 to-transparent rounded-xl border border-blue-500/10 dark:border-white/5"
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}

                      {/* Active Indicator Bar */}
                      {isActive && (
                        <motion.div
                          layoutId="active-indicator"
                          className="absolute left-0 w-[2px] h-5 bg-gradient-to-b from-blue-500 dark:from-indigo-400 to-indigo-600 dark:to-violet-500 rounded-r-full shadow-sm dark:shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}

                      <item.icon
                        size={19}
                        className={`relative z-10 transition-all duration-300 shrink-0 ${isActive ? "text-blue-500 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-slate-300"}`}
                      />

                      {!isCollapsed && (
                        <motion.span
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="relative z-10 text-[14px] font-medium tracking-tight whitespace-nowrap"
                        >
                          {item.name}
                        </motion.span>
                      )}

                      {/* TOOLTIP ON COLLAPSE */}
                      {isCollapsed && !location.pathname.includes('/generate') && (
                        <div className="fixed left-20 px-3 py-1.5 bg-slate-900 dark:bg-[#0f172a] text-white text-[11px] rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all border border-white/10 shadow-2xl whitespace-nowrap z-[100] translate-x-2 group-hover:translate-x-4 backdrop-blur-xl">
                          {item.name}
                          {item.name === 'JD Library' && isManager && pendingCount > 0 && ` (${pendingCount} pending)`}
                        </div>
                      )}

                      {/* NOTIFICATION BADGE */}
                      {!isCollapsed && item.name === 'JD Library' && isManager && pendingCount > 0 && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-lg shadow-rose-500/20 ring-1 ring-white/50 dark:ring-white/10"
                        >
                          {pendingCount}
                        </motion.span>
                      )}

                      {isCollapsed && item.name === 'JD Library' && isManager && pendingCount > 0 && (
                        <div className="absolute top-1 right-1 h-3 w-3 rounded-full bg-rose-500 border-2 border-white dark:border-[#020617]" />
                      )}
                    </NavLink>
                  </motion.div>
                );
              })}
            </nav>
          </div>
        </div>

        {/* BOTTOM STATUS CARD & TOGGLE */}
        <div className="p-6 mt-auto space-y-4">

          {/* SYSTEM TOGGLE - MOVED TO BOTTOM */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleSidebar();
            }}
            className={`
              w-full p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-all group flex items-center shadow-sm relative overflow-hidden
              ${isCollapsed ? "justify-center" : "gap-3"}
            `}
          >
            <div className="relative z-10 flex items-center justify-center w-6 min-w-[24px]">
              {isCollapsed ? (
                <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
              ) : (
                <ChevronLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
              )}
            </div>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-[11px] font-black uppercase tracking-[0.2em] relative z-10"
              >
                Collapse Menu
              </motion.span>
            )}
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        /* Hide scrollbars but keep functionality */
        .custom-scrollbar::-webkit-scrollbar {
          width: 0;
        }
      `}} />
    </motion.aside>
  );
};

export default Sidebar;
