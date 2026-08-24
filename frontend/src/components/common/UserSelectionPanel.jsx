import React, { useState, useMemo, useEffect } from 'react';
import { Search, X, User, Check, AlertCircle, FolderGit2, Eye, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as organizationService from '../../services/organizationService';

export default function UserSelectionPanel({ 
  isOpen, 
  onClose, 
  users = [], 
  initialSelectedEmails = [], 
  onConfirm, 
  conflictValues = [],
  hideGroupsTab = false
}) {
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'groups'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmails, setSelectedEmails] = useState(initialSelectedEmails);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [emailGroups, setEmailGroups] = useState([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [viewGroupDetails, setViewGroupDetails] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedEmails(initialSelectedEmails);
      setSearchQuery('');
      setCurrentPage(1);
      setActiveTab('users');
      setViewGroupDetails(null);
      fetchGroups();
    }
  }, [isOpen, initialSelectedEmails]);

  const fetchGroups = async () => {
    setIsLoadingGroups(true);
    try {
      const data = await organizationService.getEmailGroups();
      setEmailGroups(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch groups", error);
    } finally {
      setIsLoadingGroups(false);
    }
  };

  // Prevent background scrolling when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const filteredUsers = useMemo(() => {
    let result = users;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = users.filter(u => {
        const name = (u.full_name || u.name || 'User').toLowerCase();
        const email = (u.email || '').toLowerCase();
        return name.includes(query) || email.includes(query);
      });
    }
    // Sort alphabetically by name
    return [...result].sort((a, b) => {
      const nameA = (a.full_name || a.name || 'User').toLowerCase();
      const nameB = (b.full_name || b.name || 'User').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [users, searchQuery]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleSelect = (email) => {
    // Prevent selection if user is already assigned
    if (conflictValues.some(cv => cv.toLowerCase() === email.toLowerCase())) return;

    setSelectedEmails(prev => 
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const toggleSelectAll = () => {
    // Only select emails that are NOT in conflictValues
    const availableEmails = paginatedUsers
      .map(u => u.email)
      .filter(email => !conflictValues.some(cv => cv.toLowerCase() === email.toLowerCase()));

    if (availableEmails.length === 0) return;

    const allSelected = availableEmails.every(email => selectedEmails.includes(email));
    
    if (allSelected) {
      setSelectedEmails(prev => prev.filter(email => !availableEmails.includes(email)));
    } else {
      const newSelected = new Set([...selectedEmails, ...availableEmails]);
      setSelectedEmails(Array.from(newSelected));
    }
  };

  const handleConfirm = () => {
    onConfirm(selectedEmails);
  };

  // Remove the early return so AnimatePresence can handle unmounts
  // if (!isOpen) return null;

  // For Select All Checkbox Logic
  const availablePaginatedEmails = paginatedUsers
    .map(u => u.email)
    .filter(email => !conflictValues.some(cv => cv.toLowerCase() === email.toLowerCase()));
  const allPaginatedSelected = availablePaginatedEmails.length > 0 && availablePaginatedEmails.every(email => selectedEmails.includes(email));

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2000] flex justify-end">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/30 dark:bg-[#020617]/50 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Slide-out Panel */}
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-[650px] h-full bg-white dark:bg-[#0f172a] shadow-2xl flex flex-col border-l border-slate-200 dark:border-white/10"
          >
        
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">Select Learners</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Manage and select learners for this assignment
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Search and Tabs */}
        <div className="px-6 py-4 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 dark:text-white"
            />
          </div>
          {!hideGroupsTab && (
            <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl shrink-0">
              <button
                onClick={() => setActiveTab('users')}
                className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                  activeTab === 'users' 
                    ? 'bg-white dark:bg-[#1e293b] text-indigo-600 dark:text-indigo-400 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                }`}
              >
                Users
              </button>
              <button
                onClick={() => setActiveTab('groups')}
                className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                  activeTab === 'groups' 
                    ? 'bg-white dark:bg-[#1e293b] text-indigo-600 dark:text-indigo-400 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                }`}
              >
                Groups
              </button>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-2 pb-6 custom-scrollbar">
          {activeTab === 'groups' ? (
            <div className="h-full flex flex-col pt-2">
              {viewGroupDetails ? (
                <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center justify-between mb-4 px-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <FolderGit2 className="w-4 h-4 text-indigo-500" /> {viewGroupDetails.group_name}
                      </h3>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{(viewGroupDetails.emails || []).length} Members</p>
                    </div>
                    <button onClick={() => setViewGroupDetails(null)} className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1">
                      <ChevronLeft className="w-3 h-3" /> Back
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 border border-slate-200 dark:border-white/10 rounded-2xl p-4 bg-slate-50 dark:bg-white/[0.02] custom-scrollbar">
                    {(viewGroupDetails.emails || []).map((email, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 shadow-sm">
                         <div className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                           <User className="w-3 h-3 text-indigo-500" />
                         </div>
                         <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{email}</span>
                      </div>
                    ))}
                    {(viewGroupDetails.emails || []).length === 0 && (
                      <p className="text-xs text-slate-500 italic text-center py-4">No members in this group.</p>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {isLoadingGroups ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                      <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading Groups...</p>
                    </div>
                  ) : emailGroups.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center text-center p-8">
                       <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                         <FolderGit2 className="w-8 h-8 text-slate-400" />
                       </div>
                       <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Groups Available</h3>
                       <p className="text-sm text-slate-500 max-w-sm">
                         Groups can be created in the Admin Console under Settings.
                       </p>
                     </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {emailGroups.map((group, idx) => {
                        const groupEmails = group.emails || [];
                        const validEmails = groupEmails.filter(e => !conflictValues.some(cv => cv.toLowerCase() === e.toLowerCase()));
                        const allSelected = validEmails.length > 0 && validEmails.every(e => selectedEmails.includes(e));
                        
                        return (
                          <div key={idx} className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-transparent hover:border-indigo-500/30 transition-colors group/grouprow shadow-sm">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <button 
                                onClick={() => {
                                  if (validEmails.length === 0) return;
                                  if (allSelected) {
                                    setSelectedEmails(prev => prev.filter(e => !validEmails.includes(e)));
                                  } else {
                                    const newSelected = new Set([...selectedEmails, ...validEmails]);
                                    setSelectedEmails(Array.from(newSelected));
                                  }
                                }}
                                disabled={validEmails.length === 0}
                                className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors ${
                                  allSelected ? 'bg-indigo-600 border-indigo-600' : 
                                  validEmails.length === 0 ? 'border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 cursor-not-allowed' :
                                  'border-slate-300 dark:border-slate-600 bg-white dark:bg-[#020617] group-hover/grouprow:border-indigo-400'
                                } border`}
                              >
                                {allSelected && <Check className="w-3.5 h-3.5 text-white" />}
                              </button>
                              <div className="min-w-0 cursor-pointer" onClick={() => setViewGroupDetails(group)}>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover/grouprow:text-indigo-600 dark:group-hover/grouprow:text-indigo-400 transition-colors">{group.group_name}</h4>
                                <div className="flex items-center gap-2 mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                  <span>{group.role || "User"}</span>
                                  <span>·</span>
                                  <span>{groupEmails.length} Members</span>
                                  {validEmails.length < groupEmails.length && (
                                    <span className="text-rose-500">· {groupEmails.length - validEmails.length} Conflict</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <button 
                              onClick={() => setViewGroupDetails(group)}
                              className="ml-4 p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-all shrink-0 border border-transparent hover:border-indigo-100 dark:hover:border-indigo-500/20"
                              title="View Members"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-transparent">
              {/* Table Header */}
              <div className="grid grid-cols-[auto_1fr_1fr] gap-4 items-center px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <div className="flex items-center justify-center w-5">
                  <button 
                    onClick={toggleSelectAll}
                    disabled={availablePaginatedEmails.length === 0}
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      allPaginatedSelected
                        ? 'bg-indigo-600 border-indigo-600'
                        : availablePaginatedEmails.length === 0 
                          ? 'border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 cursor-not-allowed'
                          : 'border-slate-300 dark:border-white/20 hover:border-indigo-400'
                    }`}
                  >
                    {allPaginatedSelected && <Check className="w-3 h-3 text-white" />}
                  </button>
                </div>
                <div>User Name</div>
                <div>Email</div>
              </div>

              {/* Table Body */}
              {paginatedUsers.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  No users found matching your search.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-white/5">
                  {paginatedUsers.map((user) => {
                    const isSelected = selectedEmails.includes(user.email);
                    const isConflict = conflictValues.some(cv => cv.toLowerCase() === user.email.toLowerCase());
                    const name = user.full_name || user.name || 'User';

                    return (
                      <div 
                        key={user.email} 
                        onClick={() => !isConflict && toggleSelect(user.email)}
                        className={`grid grid-cols-[auto_1fr_1fr] gap-4 items-center px-4 py-3 transition-colors ${
                          isConflict 
                            ? 'bg-rose-50/30 dark:bg-rose-500/5 cursor-not-allowed opacity-75' 
                            : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.02]'
                        }`}
                      >
                        <div className="flex items-center justify-center w-5">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            isSelected 
                              ? 'bg-indigo-600 border-indigo-600' 
                              : isConflict 
                                ? 'border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10'
                                : 'border-slate-300 dark:border-white/20'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-slate-400" />
                          </div>
                          <div className="min-w-0 truncate">
                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {name}
                            </p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                              LEARNER
                            </p>
                          </div>
                        </div>

                        <div className="min-w-0 truncate">
                          <p className={`text-xs flex items-center gap-2 truncate ${isConflict ? 'text-rose-600 dark:text-rose-400 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                            {user.email}
                            {isConflict && <span className="px-1.5 py-0.5 bg-rose-100 dark:bg-rose-500/20 text-[9px] font-bold rounded uppercase tracking-wider flex-shrink-0">Already Assigned</span>}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {activeTab === 'users' && totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-2 text-xs font-medium text-slate-500">
              <div className="flex items-center gap-2">
                <span>SHOW</span>
                <select className="bg-transparent border border-slate-200 dark:border-white/10 rounded px-1 py-0.5 outline-none">
                  <option>10</option>
                </select>
                <span>ENTRIES</span>
              </div>
              <div className="flex items-center gap-4">
                <span>
                  Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length}
                </span>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-50"
                  >
                    &lsaquo;
                  </button>
                  <span className="w-6 h-6 flex items-center justify-center bg-indigo-600 text-white rounded font-bold text-[10px]">
                    {currentPage}
                  </span>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-50"
                  >
                    &rsaquo;
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] flex items-center justify-between shrink-0">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            <span className="text-slate-900 dark:text-white">{selectedEmails.length} SELECTED</span> ({selectedEmails.length} USERS, 0 GROUPS)
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose}
              className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleConfirm}
              className="px-6 py-3 bg-indigo-400 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md shadow-indigo-500/20 active:scale-95"
            >
              Confirm Selection
            </button>
          </div>
        </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
