
import React, { useState, useEffect } from 'react';
import { 
  Inbox, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  TrendingUp,
  Info,
  User,
  LayoutList,
  Table as TableIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as candidateService from '../../services/candidateService';
import toast from 'react-hot-toast';
import Pagination from '../../components/common/Pagination';

const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (e) {
    return dateString;
  }
};

const InboxTasks = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All Tasks');
  const [viewMode, setViewMode] = useState('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(7);
  
  const tabs = ['All Tasks', 'Pending', 'Completed', 'Overdue'];

  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      try {
        const data = await candidateService.getMyTasks();
        
        // Calculate Overdue status on the frontend
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const processedTasks = (data || []).map(task => {
          let normalizedStatus = 'Pending';
          const rawStatus = task.status?.toLowerCase();
          if (rawStatus === 'completed' || rawStatus === 'accepted' || rawStatus === 'signed') {
            normalizedStatus = 'Completed';
          } else {
            if (task.due_date) {
              const dueDate = new Date(task.due_date);
              if (dueDate < today) {
                normalizedStatus = 'Overdue';
              }
            }
          }
          return {
            ...task,
            status: normalizedStatus
          };
        });

        setTasks(processedTasks);
      } catch (error) {
        toast.error('Failed to load tasks. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  const filteredTasks = tasks.filter(task => {
    const matchesTab = activeTab === 'All Tasks' || task.status === activeTab;
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  const totalPages = Math.ceil(filteredTasks.length / pageSize);
  const paginatedTasks = filteredTasks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Overdue': return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'Pending': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'Completed': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      default: return 'bg-blue-50 text-blue-600 border-blue-100';
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'JD_SIGN_OFF': return <FileText size={20} className="text-indigo-500" />;
      case 'APPRAISAL': return <TrendingUp size={20} className="text-blue-500" />;
      default: return <Info size={20} className="text-slate-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-10">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100">
              <Inbox size={24} className="text-indigo-600" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Inbox & Task Center</h1>
              <div className="flex items-center gap-4 mt-1">
                <span className={`flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-full ${tasks.filter(t => t.status === 'Overdue').length > 0 ? 'text-rose-600 bg-rose-50' : 'text-slate-400 bg-slate-50'}`}>
                  <AlertCircle size={12} /> {tasks.filter(t => t.status === 'Overdue').length} Overdue
                </span>
                <span className={`flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-full ${tasks.filter(t => t.status === 'Pending').length > 0 ? 'text-amber-600 bg-amber-50' : 'text-slate-400 bg-slate-50'}`}>
                  <Clock size={12} /> {tasks.filter(t => t.status === 'Pending').length} Pending
                </span>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Find a task..." 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to first page when searching
              }}
              className="w-full md:w-80 pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-medium"
            />
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 border-b border-slate-200">
          <div className="flex gap-8 overflow-x-auto custom-scrollbar">
            {tabs.map(tab => {
              const count = tab === 'All Tasks' ? tasks.length : tasks.filter(t => t.status === tab).length;
              return (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`pb-4 text-sm font-bold transition-all relative whitespace-nowrap ${activeTab === tab ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {tab} ({count})
                  {activeTab === tab && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full" />
                  )}
                </button>
              );
            })}
          </div>
          
          <div className="flex items-center gap-2 pb-4">
            <div className="bg-white border border-slate-200 rounded-xl p-1 flex shadow-sm">
               <button 
                 onClick={() => setViewMode('table')}
                 className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-slate-100 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                 title="Table View"
               >
                 <TableIcon size={16} />
               </button>
               <button 
                 onClick={() => setViewMode('list')}
                 className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-slate-100 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                 title="List View"
               >
                 <LayoutList size={16} />
               </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* Table View */}
            {viewMode === 'table' && filteredTasks.length > 0 && (
              <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden mb-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="py-5 px-6 text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Task Details</th>
                        <th className="py-5 px-6 text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Status</th>
                        <th className="py-5 px-6 text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Due Date</th>
                        <th className="py-5 px-6 text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Assigned By</th>
                        <th className="py-5 px-6 text-right text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {paginatedTasks.map((task) => (
                        <tr key={task.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="py-4 px-6 min-w-[280px]">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${getStatusColor(task.status).replace('text-', 'bg-').split(' ')[0]}10`}>
                                {getIcon(task.type)}
                              </div>
                              <div>
                                <div className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">{task.title}</div>
                                {task.description && (
                                  <div className="text-xs text-slate-500 line-clamp-1 mt-0.5 max-w-sm italic font-medium">"{task.description}"</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border whitespace-nowrap ${getStatusColor(task.status)}`}>
                              {task.status}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 whitespace-nowrap">
                              {task.due_date ? (
                                <>
                                  <Clock size={14} className={task.status === 'Overdue' ? 'text-rose-500' : 'text-slate-400'} />
                                  {formatDate(task.due_date)}
                                </>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 whitespace-nowrap">
                              <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                                <User size={12} />
                              </div>
                              {typeof task.assigned_by === 'object' ? task.assigned_by?.name || task.assigned_by?.email : task.assigned_by}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right">
                            {task.status !== 'Completed' ? (
                              <button 
                                onClick={() => task.type === 'JD_SIGN_OFF' ? navigate(`/enduser/jd-review/${task.id}`) : toast('Action not available')}
                                className="px-5 py-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white text-xs font-bold rounded-xl transition-all shadow-sm hover:shadow-lg hover:shadow-indigo-200 whitespace-nowrap"
                              >
                                Action
                              </button>
                            ) : (
                              <button 
                                onClick={() => navigate('/enduser/performance', { state: { autoSelectId: task.id } })}
                                className="px-5 py-2.5 bg-slate-50 text-slate-600 hover:bg-slate-900 hover:text-white text-xs font-bold rounded-xl transition-all shadow-sm hover:shadow-lg whitespace-nowrap"
                              >
                                View
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Embedded Pagination inside the card */}
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  pageSize={pageSize}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setCurrentPage(1);
                  }}
                  totalResults={filteredTasks.length}
                  className="border-t-slate-100 rounded-none bg-slate-50/30"
                />
              </div>
            )}

            {/* List View */}
            {viewMode === 'list' && filteredTasks.length > 0 && (
              <>
                <div className="space-y-4">
                  {paginatedTasks.map((task) => (
                    <div 
                      key={task.id}
                      className="bg-white p-5 rounded-[24px] md:rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center gap-6 group"
                    >
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${getStatusColor(task.status).replace('text-', 'bg-').split(' ')[0]}10`}>
                        {getIcon(task.type)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-2">
                          <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors text-base">{task.title}</h3>
                          <span className={`w-fit px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest rounded-full border ${getStatusColor(task.status)}`}>
                            {task.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium">
                          {task.due_date && (
                            <div className="flex items-center gap-1.5 font-bold">
                              <Clock size={14} className={task.status === 'Overdue' ? 'text-rose-500' : 'text-slate-400'} />
                              Due: {formatDate(task.due_date)}
                            </div>
                          )}
                          {task.due_date && <span className="text-slate-300 hidden md:inline">•</span>}
                          <div className="flex items-center gap-1.5 font-bold">
                            <User size={14} className="text-slate-400" />
                            {typeof task.assigned_by === 'object' ? task.assigned_by?.name || task.assigned_by?.email : task.assigned_by}
                          </div>
                        </div>
                        {task.description && (
                          <p className="mt-2.5 text-xs text-slate-500 line-clamp-1 italic font-medium">"{task.description}"</p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0 pt-4 md:pt-0 border-t md:border-none border-slate-50">
                        {task.status !== 'Completed' ? (
                          <button 
                            onClick={() => task.type === 'JD_SIGN_OFF' ? navigate(`/enduser/jd-review/${task.id}`) : toast('Action not available')}
                            className="w-full md:w-auto px-6 py-3 md:py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 transition-all active:scale-95 text-center"
                          >
                            {task.type === 'JD_SIGN_OFF' ? 'Review & Sign JD' : 'Action Required'}
                          </button>
                        ) : (
                          <button 
                            onClick={() => navigate('/enduser/performance', { state: { autoSelectId: task.id } })}
                            className="w-full md:w-auto px-6 py-3 md:py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg active:scale-95 text-center"
                          >
                            View Details
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Standalone Pagination for List View */}
                <div className="mt-6 bg-white rounded-[32px] shadow-sm border border-slate-100">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    pageSize={pageSize}
                    onPageSizeChange={(newSize) => {
                      setPageSize(newSize);
                      setCurrentPage(1);
                    }}
                    totalResults={filteredTasks.length}
                    className="border-none"
                  />
                </div>
              </>
            )}

            {/* Empty State */}
            {filteredTasks.length === 0 && (
              <div className="py-20 text-center bg-white rounded-[32px] border border-dashed border-slate-200">
                 <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={32} className="text-slate-300" />
                 </div>
                 <h3 className="text-lg font-black text-slate-900 mb-1">All caught up!</h3>
                 <p className="text-sm font-bold text-slate-400">No tasks found for the selected category.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default InboxTasks;
