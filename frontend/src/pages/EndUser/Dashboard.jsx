
import React, { useEffect, useState, useContext } from 'react';
import {
  Bell,
  Calendar,
  ChevronRight,
  FileText,
  TrendingUp,
  BookOpen,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  User,
  LayoutDashboard,
  Target,
  Users,
  MessageSquare,
  HelpCircle,
  History
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { JDContext } from '../../context/JDContext';
import Pagination from '../../components/common/Pagination';

const getGreeting = (hour) => {
  if (hour >= 5 && hour < 12) return { label: "Good morning", emoji: "🌅 ✨ ☕", subtext: "Ready for a productive start?" };
  if (hour >= 12 && hour < 17) return { label: "Good afternoon", emoji: "☀️", subtext: "Maintaining peak performance." };
  if (hour >= 17 && hour < 21) return { label: "Good evening", emoji: "🌆", subtext: "Wrapping up today's wins." };
  return { label: "Good night", emoji: "🌙 🌌 😴", subtext: "Preparation is the key to tomorrow." };
};

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

import { getDashboardSummary, getMyTasks } from '../../services/candidateService';
import toast from 'react-hot-toast';

const EndUserDashboardSkeleton = () => {
  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-10 relative">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Premium Header Section Skeleton */}
        <div className="bg-slate-200/50 rounded-[32px] p-6 lg:p-10 animate-pulse">
          <div className="h-6 w-32 bg-slate-300 rounded-full mb-6"></div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
            <div className="flex-1">
              <div className="h-10 w-3/4 md:w-1/2 bg-slate-300 rounded-lg mb-4"></div>
              <div className="h-4 w-full md:w-2/3 bg-slate-300 rounded-lg mt-4"></div>
              <div className="h-4 w-1/2 md:w-1/3 bg-slate-300 rounded-lg mt-2"></div>
            </div>
            <div className="w-full md:w-48 h-24 bg-slate-300 rounded-[28px]"></div>
          </div>
        </div>

        {/* Stats Row Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-4 animate-pulse">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl"></div>
              <div className="flex-1">
                <div className="h-8 w-16 bg-slate-200 rounded-lg mb-2"></div>
                <div className="h-3 w-24 bg-slate-100 rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Main Content Area Skeleton */}
          <div className="lg:col-span-8 space-y-10">
            {/* Pending Task Skeleton */}
            <div className="bg-white rounded-[40px] border border-slate-100 p-8 lg:p-10 animate-pulse">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-slate-200 rounded-2xl"></div>
                <div className="h-4 w-32 bg-slate-200 rounded-lg"></div>
              </div>
              <div className="h-8 w-3/4 bg-slate-200 rounded-lg mb-4"></div>
              <div className="flex gap-4 mb-10">
                <div className="h-8 w-32 bg-slate-100 rounded-full"></div>
                <div className="h-8 w-32 bg-slate-100 rounded-full"></div>
              </div>
              <div className="h-12 w-48 bg-slate-200 rounded-[20px]"></div>
            </div>

            {/* Tasks List Skeleton */}
            <div className="bg-white rounded-[32px] border border-slate-100 p-8 animate-pulse">
              <div className="flex items-center justify-between mb-8">
                <div className="h-6 w-48 bg-slate-200 rounded-lg"></div>
                <div className="h-4 w-20 bg-slate-100 rounded-lg"></div>
              </div>
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-5 bg-white rounded-3xl border border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-2xl"></div>
                      <div>
                        <div className="h-5 w-48 bg-slate-200 rounded-lg mb-2"></div>
                        <div className="h-3 w-32 bg-slate-100 rounded-lg"></div>
                      </div>
                    </div>
                    <div className="h-8 w-20 bg-slate-100 rounded-xl"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar Skeleton */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-white rounded-3xl border border-slate-100 p-6 animate-pulse">
              <div className="h-4 w-32 bg-slate-200 rounded-lg mb-6"></div>
              <div className="space-y-6">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-slate-100 shrink-0"></div>
                    <div className="flex-1 mt-1">
                      <div className="h-4 w-full bg-slate-200 rounded-lg mb-2"></div>
                      <div className="h-3 w-20 bg-slate-100 rounded-lg"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const EndUserDashboard = () => {
  const { user } = useContext(JDContext);
  const now = new Date();
  const greeting = getGreeting(now.getHours());

  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [activity, setActivity] = useState([]);
  const [stats, setStats] = useState({
    pending_jds: 0,
    completed_jds: 0,
    pending_appraisals: 0,
    completed_appraisals: 0,
    total_tasks: 0,
    completion_rate: 0
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const [summaryData, tasksData] = await Promise.all([
          getDashboardSummary(),
          getMyTasks()
        ]);

        // Calculate Overdue status on the frontend
        const rawTasks = tasksData || [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const processedTasks = rawTasks.map(task => {
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
        setActivity(summaryData.recent_activity || []);
        setStats(summaryData.stats || {
          pending_jds: 0,
          completed_jds: 0,
          pending_appraisals: 0,
          completed_appraisals: 0,
          total_tasks: 0,
          completion_rate: 0
        });
      } catch (error) {
        console.error('Dashboard fetch error:', error);
        toast.error('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  const pendingJDTask = tasks.find(t => t.type === 'JD_SIGN_OFF' && !['completed', 'accepted', 'signed'].includes(t.status?.toLowerCase()));

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedTasks = tasks.slice(startIndex, startIndex + pageSize);

  if (loading) {
    return <EndUserDashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-10 relative">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Premium Header Section */}
        <div className="bg-[#0f172a] rounded-[32px] p-6 lg:p-10 text-white shadow-2xl relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-6">
              <div className="px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center gap-2">
                <LayoutDashboard size={12} className="text-amber-400" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Employee Console</span>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
              <div className="flex-1">
                <h1 className="text-3xl lg:text-4xl font-light text-slate-400 leading-tight">
                  <span className="opacity-70">{greeting.label},</span> <br />
                  <span className="font-black text-white">{user?.full_name?.split(' ')[0] || 'Sahil'} {greeting.emoji}</span>
                </h1>
                <p className="text-slate-400 mt-4 max-w-xl text-xs lg:text-sm font-medium leading-relaxed">
                  {greeting.subtext} <br className="hidden md:block" />
                  <span className="text-white font-bold">{user?.designation || 'Employee'}</span> at <span className="text-white font-bold">{user?.org_name || 'Phenomecloud'}</span>.
                  Your performance dashboard is ready. You have <span className="text-indigo-400 font-bold">{stats.total_tasks ?? 0} pending {(stats.total_tasks ?? 0) === 1 ? 'task' : 'tasks'}</span> requiring your attention.
                </p>
              </div>

              <div className="shrink-0 self-start md:self-center">
                <div className="px-6 py-4 bg-white/5 border border-white/10 rounded-[28px] flex items-center gap-4 backdrop-blur-md shadow-2xl relative overflow-hidden group/date">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-indigo-400 shrink-0 group-hover/date:bg-indigo-600 group-hover/date:text-white transition-all duration-500">
                    <Calendar size={24} />
                  </div>
                  <div className="pr-4">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none mb-2">Today</div>
                    <div className="text-lg font-black text-white tracking-tight whitespace-nowrap">
                      {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 w-1 h-full bg-indigo-500 opacity-50" />
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Background Elements */}
          <div className="absolute top-0 right-0 w-[40%] h-full bg-gradient-to-l from-indigo-600/20 to-transparent pointer-events-none" />
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] group-hover:bg-indigo-500/20 transition-all duration-1000" />
          <div className="absolute bottom-0 left-1/4 w-64 h-24 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none" />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-4 group hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
              <FileText size={22} />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">{stats.completed_jds ?? 0}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Signed JDs</div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-4 group hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
              <TrendingUp size={22} />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">{Math.round(stats.completion_rate ?? 0)}%</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Completion Rate</div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-4 group hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-all">
              <Clock size={22} />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">{stats.total_tasks ?? 0}</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Open Tasks</div>
            </div>
          </div>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-10">

            {/* Premium JD Task Card */}
            {pendingJDTask && (
              <div className="relative group">
                <div className="absolute inset-0 bg-indigo-500 rounded-[40px] blur-xl opacity-5 group-hover:opacity-10 transition-opacity" />
                <div className="relative bg-white rounded-[40px] border border-slate-100 shadow-xl shadow-indigo-100/10 overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    <div className="flex-1 p-8 lg:p-10">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                          <ShieldCheck size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] leading-none">Security Compliance</p>
                          <p className="text-xs font-bold text-slate-400 mt-1">Action required for verification</p>
                        </div>
                      </div>

                      <h2 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight mb-4">
                        {pendingJDTask.title.replace(' JD Sign-off Required', '')}
                      </h2>

                      <div className="flex flex-wrap items-center gap-6 mb-10">
                        <div className="flex items-center gap-2 text-slate-500 font-bold text-xs bg-slate-50 px-4 py-2 rounded-full">
                          <Clock size={14} className="text-amber-500" />
                          Due: {formatDate(pendingJDTask.due_date)}
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 font-bold text-xs bg-slate-50 px-4 py-2 rounded-full">
                          <AlertCircle size={14} className="text-indigo-500" />
                          High Priority
                        </div>
                      </div>

                      <button
                        onClick={() => navigate(`/enduser/jd-review/${pendingJDTask.id}`)}
                        className="group/btn relative px-8 py-4 bg-[#0f172a] text-white rounded-[20px] font-black text-sm transition-all hover:bg-slate-800 active:scale-95 shadow-xl shadow-slate-200 flex items-center gap-3"
                      >
                        Start Review Process
                        <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    </div>

                    <div className="hidden md:flex w-72 bg-indigo-50/30 border-l border-slate-50 items-center justify-center relative overflow-hidden">
                      <div className="relative z-10 p-8 text-center">
                        <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mx-auto mb-4 rotate-3">
                          <FileText size={40} className="text-indigo-600" />
                        </div>
                        <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Document v1.2</div>
                      </div>
                      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-600/5 rounded-full blur-3xl" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tasks List */}

            {/* Tasks List */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold text-slate-900">Current Assignments</h3>
                  <button onClick={() => navigate('/enduser/inbox')} className="text-sm font-bold text-indigo-600 hover:underline">View Inbox</button>
                </div>
                <div className="space-y-4">
                  {paginatedTasks.length > 0 ? (
                    paginatedTasks.map(task => (
                      <div
                        key={task.id}
                        onClick={() => {
                          if (['completed', 'accepted', 'signed', 'sign-off-complete'].includes(task.status?.toLowerCase())) {
                            navigate('/enduser/performance', { state: { autoSelectId: task.id } });
                          } else if (task.type === 'JD_SIGN_OFF') {
                            navigate(`/enduser/jd-review/${task.id}`);
                          } else {
                            toast('Action not available');
                          }
                        }}
                        className="flex items-center justify-between p-5 bg-white rounded-3xl border border-slate-100 group hover:border-indigo-600 hover:shadow-2xl hover:shadow-indigo-100/30 transition-all cursor-pointer relative overflow-hidden"
                      >
                        <div className="flex items-center gap-4 relative z-10">
                          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-sm">
                            <Target size={22} />
                          </div>
                          <div>
                            <div className="font-black text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">{task.title}</div>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                <Clock size={10} /> {formatDate(task.due_date)}
                              </span>
                              <span className="w-1 h-1 bg-slate-200 rounded-full" />
                              <span className={`text-[10px] font-black uppercase tracking-widest ${task.status === 'Completed' ? 'text-emerald-500' : task.status === 'Overdue' ? 'text-rose-500' : 'text-amber-500'}`}>
                                {task.status}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="relative z-10 flex items-center gap-4">
                          <div className="px-4 py-2 bg-slate-50 group-hover:bg-indigo-50 text-slate-400 group-hover:text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                            Action
                          </div>
                          <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                        </div>

                        {/* Hover decoration */}
                        <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-indigo-50/0 to-transparent group-hover:from-indigo-50/50 transition-all" />
                      </div>
                    ))
                  ) : (
                    <div className="py-20 flex flex-col items-center justify-center bg-slate-50/30 rounded-[40px] border-2 border-dashed border-slate-100">
                      <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-xl mb-6 rotate-3">
                        <ShieldCheck size={40} className="text-indigo-200" />
                      </div>
                      <h4 className="text-xl font-black text-slate-900 mb-2">Zero Tasks Pending</h4>
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">Efficiency level: 100%</p>
                    </div>
                  )}
                </div>
              </div>

              {tasks.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(tasks.length / pageSize)}
                  onPageChange={setCurrentPage}
                  pageSize={pageSize}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setCurrentPage(1);
                  }}
                  totalResults={tasks.length}
                  className="border-none bg-slate-50/50"
                />
              )}
            </div>
          </div>

          {/* Sidebar Column */}
          <div className="lg:col-span-4 space-y-8">



            {/* Recent Activity */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <History size={16} /> Recent Activity
              </h4>
              <div className="space-y-6">
                {activity.length > 0 ? (
                  activity.map((item, index) => {
                    const activityText = item.text || (
                      item.type === 'JD_SIGN_OFF'
                        ? `Signed Job Description: ${item.title}`
                        : `Completed Task: ${item.title}`
                    );

                    let formattedDate = item.date;
                    try {
                      formattedDate = new Date(item.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      });
                    } catch (e) {
                      // fallback to original date string
                    }

                    return (
                      <div key={item.id || index} className="flex gap-4 relative">
                        <div className="w-1 h-full absolute left-4 top-8 bg-slate-50 -z-10" />
                        <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                          <div className="w-2 h-2 rounded-full bg-indigo-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-800 leading-snug">{activityText}</div>
                          <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{formattedDate}</div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <History size={24} className="text-slate-300" />
                    </div>
                    <p className="text-slate-900 font-bold text-xs uppercase tracking-widest">No Recent Activity</p>
                    <p className="text-slate-400 text-[10px] mt-1 italic">Your journey logs will appear here.</p>
                  </div>
                )}
              </div>
            </div>


          </div>
        </div>
      </div>
    </div>
  );
};

export default EndUserDashboard;
