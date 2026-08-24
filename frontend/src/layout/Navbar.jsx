
// import { Link } from "react-router-dom";
// import { useContext, useState } from "react";
// import { JDContext } from "../context/JDContext";
// import { useNavigate } from "react-router-dom";

// export default function Navbar() {
//    const { myJDs } = useContext(JDContext);
// const [query, setQuery] = useState("");
// const [results, setResults] = useState([]);
// const navigate = useNavigate();

// const handleSearch = (value) => {

//   setQuery(value);

//   if (!value) {
//     setResults([]);
//     return;
//   }

//   const filtered = myJDs.filter((jd) =>
//     jd.title.toLowerCase().includes(value.toLowerCase())
//   );

//   setResults(filtered);
// };
//   return (
//     <div className="flex items-center justify-between px-6 py-3 border-b bg-white">

//       {/* LEFT SIDE */}

//       <div className="flex items-center gap-6">

//         <h1 className="font-bold text-lg">
//           JDForge
//         </h1>

//         <Link to="/" className="text-blue-600 font-medium">
//           Generate
//         </Link>

//         <Link to="/templates">
//           Templates
//         </Link>

//         <Link to="/my-jds">
//           My JDs
//         </Link>

//         <Link to="/push-csod">
//           Push to CSOD
//         </Link>

//       </div>

//       {/* RIGHT SIDE */}

//       <div className="flex items-center gap-4">

//         {/* SEARCH */}

//     <div className="relative">

//   <input
//     value={query}
//     onChange={(e) => handleSearch(e.target.value)}
//     placeholder="Search your JDs..."
//     className="border px-3 py-1 rounded text-sm w-[220px]"
//   />

//   {/* DROPDOWN */}

//   {results.length > 0 && (

//     <div className="absolute top-9 left-0 w-full bg-white border rounded shadow z-50">

//       {results.map((jd) => (

//         <div
//           key={jd.id}
//           onClick={() =>
//             navigate("/", { state: { jd } })
//           }
//           className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
//         >

//           <div className="text-sm font-medium">
//             {jd.title}
//           </div>

//           <div className="text-xs text-gray-500">
//             {jd.status}
//           </div>

//         </div>

//       ))}

//     </div>

//   )}

// </div>

//         {/* CREATE NEW JD */}

//         <Link
//           to="/"
//           className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
//         >
//           + Create New JD
//         </Link>

//         {/* NOTIFICATION */}

//         <div className="text-xl cursor-pointer">
//           🔔
//         </div>

//         {/* PROFILE */}

//         <div className="flex items-center gap-2 cursor-pointer">

//           <div className="bg-blue-500 text-white w-7 h-7 flex items-center justify-center rounded-full text-sm">
//             S
//           </div>

//           <div className="text-sm">
//             Sarah Chen
//           </div>

//         </div>

//       </div>

//     </div>
//   );
// }

import { Link, useLocation } from "react-router-dom";
import { useContext, useState, useRef, useEffect } from "react";
import { JDContext } from "../context/JDContext";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Bell,
  ChevronDown,
  FileText,
  LayoutTemplate,
  FolderOpen,
  Upload,
  Sparkles,
  X,
  Clock,
  CheckCircle2,
  MoreVertical,
  Sun,
  Moon,
  Target,
  Settings,
  Building2,
  MapPin,
  Globe,
  LogOut,
  Info,
  Calendar,
  AlertCircle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { BASE_URL } from "../services/apiClient";
import { NotificationContext } from "../context/NotificationContext";
import { superAdminService } from "../services/superAdminService";
import { isSuperAdminRole, isOrgAdminRole, getSearchResultPath, shouldShowGlobalSearch } from "../utils/roles";

export default function Navbar() {
  const { myJDs, logout, user, theme, toggleTheme } = useContext(JDContext);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [allOrgs, setAllOrgs] = useState([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, fetchNotifications } = useContext(NotificationContext);
  const searchRef = useRef(null);
  const profileRef = useRef(null);
  const notificationsRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Handle Search Results
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchFocused(false);
      }

      // Handle Profile Menu
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }

      // Handle Notifications Menu
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Aggressively clear search on any route change to prevent auto-population or persistence
  useEffect(() => {
    setQuery("");
    setResults([]);
    // Brief delay to handle late-mounting/browser-autofill race conditions
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  const handleMarkAllAsRead = markAllAsRead;
  const handleMarkAsRead = markAsRead;

  // Prevent browser auto-fill from populating the search bar with the user's email
  useEffect(() => {
    if (query && user?.email && query.toLowerCase() === user.email.toLowerCase()) {
      setQuery("");
      setResults([]);
    }
  }, [query, user?.email]);

  const isSuperAdminPage = location.pathname === '/superadmin/dashboard';
  const showGlobalSearch = shouldShowGlobalSearch(location.pathname, user?.role);

  useEffect(() => {
    if (isSuperAdminPage) {
      superAdminService.getAllOrganizations()
        .then(res => {
          setAllOrgs(Array.isArray(res) ? res : []);
        })
        .catch(err => console.error(err));
    }
  }, [isSuperAdminPage]);

  const handleSearch = async (value) => {
    setQuery(value);
    if (!value) {
      setResults([]);
      return;
    }
    
    if (isSuperAdminPage) {
      const filtered = allOrgs.filter(org => 
        (org.name || org.organization_name || "").toLowerCase().includes(value.toLowerCase())
      );
      setResults(filtered);
    } else {
      const filtered = myJDs.filter((jd) =>
        jd.title.toLowerCase().includes(value.toLowerCase())
      );
      setResults(filtered);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setIsSearchFocused(false);
  };

  const openSearchResult = (result) => {
    if (isSuperAdminPage) {
      const title = result.name || result.organization_name || 'Unknown Org';
      setQuery(title);
      window.dispatchEvent(new CustomEvent('open-org-modal', { detail: { orgName: title } }));
    } else {
      navigate(getSearchResultPath(user?.role, result), { state: { jd: result } });
    }
    clearSearch();
  };
  const userRoleLower = user?.role?.toLowerCase() || "";
  const navItems = [
    { path: "/", label: "Dashboard", icon: FolderOpen, roles: ["admin", "manager", "hr"] },
    { path: "/admin/generate", label: "Generate", icon: Sparkles, roles: ["admin"] },
    { path: "/admin/templates", label: "Templates", icon: LayoutTemplate, roles: ["admin"] },
    {
      path: `/${userRoleLower.includes('admin') ? 'admin' : userRoleLower.includes('hr') ? 'hr' : 'manager'}/my-jds`,
      label: userRoleLower.includes('hr') ? "JD Library" : "My JDs",
      icon: FolderOpen,
      roles: ["admin", "manager", "hr"]
    },
    { path: "/admin/push-csod", label: "Push to CSOD", icon: Upload, roles: ["admin"] },
    { path: "/admin/competencies", label: "Competencies", icon: Target, roles: ["admin"] },
  ];

  const filteredNavItems = navItems.filter(item => {
    const hasRole = item.roles.some(role => userRoleLower.includes(role));
    if (userRoleLower.includes('hr')) {
      return hasRole && ["Dashboard", "JD Library"].includes(item.label);
    }
    return hasRole;
  });

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-[1005] bg-white/80 dark:bg-[#020617]/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/10 shadow-sm transition-colors duration-300">
      <div className="  mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* LEFT SIDE - Logo & Navigation (Hidden if sidebar is present) */}
          <div className="flex items-center gap-8">
            {/* Ensure we have a user and they DON'T have a dashboard role before showing this */}
            {isReady && user && !(userRoleLower.includes('admin') || userRoleLower.includes('hr') || userRoleLower.includes('manager') || userRoleLower.includes('enduser') || userRoleLower.includes('learner')) && (
              <>


                <div className="hidden md:flex items-center gap-1">
                  {filteredNavItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`
                          relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2
                          ${active
                            ? "text-blue-600 bg-blue-50/80"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                          }
                        `}
                      >
                        <Icon className={`w-4 h-4 ${active ? "text-blue-600" : "text-slate-500"}`} />
                        {item.label}
                        {active && (
                          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* RIGHT SIDE - Search, Actions, Profile */}
          <div className="flex items-center gap-4">

            {/* Search Bar — JD quick-jump for admin/hr/manager; org search on super-admin dashboard */}
            {showGlobalSearch ? (
            <div ref={searchRef} className="relative">
              <div className={`
                relative flex items-center transition-all duration-300
                ${isSearchFocused ? "w-[320px]" : "w-[260px]"}
              `}>
                <Search className={`
                  absolute left-3 w-4 h-4 transition-colors duration-200
                  ${isSearchFocused ? "text-blue-500" : "text-slate-400"}
                `} />
                <input
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  placeholder={isSuperAdminPage ? "Search Organizations..." : "Search your JDs..."}
                  autoComplete="new-password"
                  id="tf-global-search-input-unq"
                  name="tf-search-unq-field"
                  className={`
                    w-full pl-10 pr-10 py-2.5 bg-slate-100 dark:bg-white/5 border-2 border-transparent dark:border-white/5 rounded-xl text-sm
                    outline-none transition-all duration-200 dark:text-white
                    ${isSearchFocused
                      ? "bg-white dark:bg-[#0f172a] border-blue-500 shadow-lg shadow-blue-500/10 dark:border-blue-500/50"
                      : "hover:bg-slate-200/70 dark:hover:bg-white/10"
                    }
                  `}
                />
                {query && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 p-0.5 rounded-full hover:bg-slate-200 transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                )}
              </div>

              {/* Search Dropdown Results */}
              {isSearchFocused && (query ? results.length > 0 : false) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#020617] rounded-xl shadow-xl border border-slate-200/60 dark:border-white/10 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-3 py-2 bg-slate-50/80 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {results.length} Results
                    </span>
                  </div>
                  <div className="max-h-[320px] overflow-y-auto">
                    {results.map((result, index) => {
                      const isOrg = isSuperAdminPage;
                      const title = isOrg ? (result.name || result.organization_name || 'Unknown Org') : result.title;
                      
                      return (
                        <button
                          key={result.id || result.org_id || index}
                          onClick={() => openSearchResult(result)}
                          className={`
                            w-full px-4 py-3 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left
                            ${index !== results.length - 1 ? "border-b border-slate-100 dark:border-white/5" : ""}
                          `}
                        >
                          <div className={`
                            w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                            ${isOrg ? "bg-indigo-100 text-indigo-600" :
                              result.status === "Active" ? "bg-green-100 text-green-600" :
                              result.status === "Draft" ? "bg-amber-100 text-amber-600" :
                                "bg-slate-100 text-slate-600"}
                          `}>
                            {isOrg ? <Building2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-900 dark:text-white truncate">
                              {title}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {isOrg ? (
                                <span className="text-xs text-slate-400">Organization</span>
                              ) : (
                                <>
                                  <span className={`
                                    text-xs px-2 py-0.5 rounded-full font-medium
                                    ${result.status === "Active" ? "bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400" :
                                      result.status === "Draft" ? "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400" :
                                        "bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300"}
                                  `}>
                                    {result.status}
                                  </span>
                                  <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Modified recently
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="px-4 py-2 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5">
                    <Link
                      to={
                        isSuperAdminPage ? '/superadmin/organizations' :
                        userRoleLower.includes('admin') ? '/admin/my-jds' :
                          userRoleLower.includes('hr') ? '/hr/my-jds' :
                            userRoleLower.includes('manager') ? '/manager/my-jds' :
                              (userRoleLower.includes('enduser') || userRoleLower.includes('learner') || userRoleLower === 'user') ? '/enduser/inbox' : '/'
                      }
                      className="text-xs text-blue-600 dark:text-indigo-400 font-medium hover:text-blue-700 dark:hover:text-indigo-300 flex items-center gap-1"
                    >
                      {isSuperAdminPage ? 'View all Organizations' :
                        (userRoleLower.includes('enduser') || userRoleLower.includes('learner') || userRoleLower === 'user') ? 'View all tasks' : 'View all JDs'}
                      <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
                    </Link>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {isSearchFocused && query && results.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#020617] rounded-xl shadow-xl border border-slate-200/60 dark:border-white/10 p-6 text-center animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Search className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                  </div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">No results found</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Try adjusting your search terms
                  </p>
                </div>
              )}
            </div>
            ) : null}
            {/* Notifications */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) fetchNotifications();
                }}
                className={`relative p-2 rounded-xl transition-all duration-300 ${showNotifications
                  ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-inner"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
                  }`}
              >
                <Bell className={`w-5 h-5 ${unreadCount > 0 ? "animate-swing" : ""}`} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[1rem] px-1 items-center justify-center bg-rose-500 rounded-full ring-2 ring-white dark:ring-[#020617] text-[10px] font-bold text-white shadow-lg animate-in zoom-in-50">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute top-full right-0 mt-3 w-[360px] bg-white dark:bg-[#0f172a] rounded-[2rem] shadow-2xl border border-slate-200/60 dark:border-white/10 overflow-hidden animate-in fade-in slide-in-from-top-3 duration-300 z-[1010]">
                  <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-white dark:bg-[#0f172a]">
                    <div>
                      <h3 className="font-black text-slate-900 dark:text-white text-base tracking-tight">Notifications</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{unreadCount} Unread messages</p>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-xs text-indigo-600 dark:text-indigo-400 font-black hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-full border border-indigo-100 dark:border-indigo-500/20"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-[420px] overflow-y-auto custom-scrollbar bg-slate-50/30 dark:bg-[#020617]/20">
                    {notifications.length === 0 ? (
                      <div className="py-16 flex flex-col items-center justify-center text-center px-6">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center mb-4 text-slate-300">
                          <Bell className="w-8 h-8 opacity-20" />
                        </div>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Inbox Zero</p>
                        <p className="text-xs text-slate-400 mt-1">You're all caught up!</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => !n.is_read && handleMarkAsRead(n.id)}
                          className={`group px-6 py-4 transition-all border-b border-slate-100 dark:border-white/5 last:border-0 flex gap-4 cursor-pointer relative ${!n.is_read
                            ? "bg-white dark:bg-indigo-500/[0.03] hover:bg-indigo-50/50 dark:hover:bg-indigo-500/[0.06]"
                            : "opacity-70 hover:opacity-100 hover:bg-white/50 dark:hover:bg-white/[0.02]"
                            }`}
                        >
                          {!n.is_read && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
                          )}
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner transition-transform group-hover:scale-110 ${n.type === 'success' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600' :
                            n.type === 'error' ? 'bg-rose-100 dark:bg-rose-500/10 text-rose-600' :
                              n.type === 'warning' ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-600' :
                                'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600'
                            }`}>
                            {n.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> :
                              n.type === 'error' ? <AlertCircle className="w-5 h-5" /> :
                                n.type === 'info' ? <Info className="w-5 h-5" /> :
                                  <Bell className="w-5 h-5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className={`text-sm tracking-tight truncate ${!n.is_read ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-600 dark:text-slate-400'}`}>
                                {n.title}
                              </p>
                              <span className="text-[10px] text-slate-400 whitespace-nowrap font-medium uppercase tracking-tighter">
                                {n.created_at ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true }) : ''}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                              {typeof n.message === 'string' ? n.message : (n.message?.name ? `From: ${n.message.name}` : JSON.stringify(n.message))}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <div className="px-6 py-4 bg-white dark:bg-[#0f172a] border-t border-slate-100 dark:border-white/5">
                      <button
                        onClick={() => {
                          navigate('/notifications');
                          setShowNotifications(false);
                        }}
                        className="w-full py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase tracking-[0.25em] rounded-2xl hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
                      >
                        View All Activity
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all duration-200 group"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-md group-hover:shadow-lg transition-shadow">
                  {user?.full_name?.charAt(0) || user?.name?.charAt(0) || "U"}
                </div>
                <div className="hidden lg:block text-left">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{user?.full_name || user?.name || "there"}</div>
                  <div className="flex items-center gap-1.5">
                    <div className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                      isSuperAdminRole(user?.role) ? 'bg-violet-100 text-violet-700' :
                      isOrgAdminRole(user?.role) ? 'bg-red-100 text-red-700' :
                      userRoleLower.includes('learner') ? 'bg-purple-100 text-purple-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                      {user?.role || "Member"}
                    </div>
                  </div>
                </div>
                <ChevronDown className={`
                  w-4 h-4 text-slate-400 transition-transform duration-200
                  ${showProfileMenu ? "rotate-180" : ""}
                `} />
              </button>

              {/* Profile Menu */}
              {showProfileMenu && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-[#1e293b] rounded-xl shadow-xl border border-slate-200/60 dark:border-white/10 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/30 dark:bg-white/[0.01]">
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate mb-2">{user?.email || "user@company.com"}</p>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <Building2 className="w-3.5 h-3.5 text-indigo-500/70" />
                        <span className="font-medium tracking-tight text-slate-700 dark:text-slate-200">{user?.org_name || 'Organization'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <Globe className="w-3.5 h-3.5 text-emerald-500/70" />
                        <span className="font-medium tracking-tight text-slate-700 dark:text-slate-200">{user?.country || 'Region'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="py-1">

                    {/* Theme Toggle in Menu */}
                    <div className="px-4 py-2 border-t border-slate-100 dark:border-white/5 mt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Appearance</span>
                        <button
                          disabled
                          className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 transition-all opacity-50 cursor-not-allowed"
                        >
                          <div className={`p-1 rounded-md transition-all ${theme === 'light' ? 'bg-white shadow-sm text-amber-500' : 'text-slate-500'}`}>
                            <Sun size={14} />
                          </div>
                          <div className={`p-1 rounded-md transition-all ${theme === 'dark' ? 'bg-slate-800 shadow-sm text-indigo-400' : 'text-slate-500'}`}>
                            <Moon size={14} />
                          </div>
                        </button>
                      </div>
                    </div>

                  </div>
                  <div className="p-1 px-2 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.03]">
                    <button
                      onClick={() => {
                        logout();
                        navigate("/login");
                      }}
                      className="w-full px-3 py-2 text-left text-sm font-bold text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all flex items-center gap-2.5 group"
                    >
                      <LogOut className="w-4 h-4 text-red-400 group-hover:translate-x-0.5 transition-transform" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}