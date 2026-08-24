import React, { useContext, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { JDContext } from "../../context/JDContext";
import PageLayout from "../../layout/PageLayout";
import { 
  Sparkles, 
  FileText, 
  LayoutTemplate, 
  Plus, 
  ArrowRight, 
  Clock, 
  ChevronRight,
  TrendingUp,
  Target,
  Users,
  Briefcase
} from "lucide-react";

export default function Dashboard() {
  const { myJDs, user } = useContext(JDContext);
  const navigate = useNavigate();

  const stats = useMemo(() => [
    { label: "Active JDs", value: myJDs.filter(j => j.status === 'Active' || j.status === 'final').length, icon: FileText, color: "text-blue-600", bg: "bg-blue-100" },
    { label: "Drafts", value: myJDs.filter(j => j.status === 'Draft' || !j.status).length, icon: Clock, color: "text-amber-600", bg: "bg-amber-100" },
    { label: "Total Templates", value: 24, icon: LayoutTemplate, color: "text-purple-600", bg: "bg-purple-100" },
    { label: "Team Members", value: 12, icon: Users, color: "text-emerald-600", bg: "bg-emerald-100" },
  ], [myJDs]);

  const recentJDs = useMemo(() => {
    return [...myJDs]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 5);
  }, [myJDs]);

  const quickActions = [
    { title: "Generate new JD", description: "Create a job description using AI", icon: Sparkles, path: "/admin/generate", color: "from-blue-600 to-indigo-600" },
    { title: "Browse Templates", description: "Start from a pre-made template", icon: LayoutTemplate, path: "/admin/templates", color: "from-purple-600 to-pink-600" },
    { title: "Manage Competencies", description: "Configure core & functional skills", icon: Target, path: "/admin/competencies", color: "from-emerald-600 to-teal-600" },
  ];

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-500">
        
        {/* WELCOME HEADER */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Welcome back, {user?.full_name?.split(' ')[0] || 'User'}!
            </h1>
            <p className="text-slate-500 mt-1">
              Here is what's happening with your job descriptions today.
            </p>
          </div>
          <Link
            to="/admin/generate"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/25 hover:bg-blue-700 transition-all hover:-translate-y-0.5"
          >
            <Plus className="w-5 h-5" />
            Create New JD
          </Link>
        </header>

        {/* STATS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2.5 ${stat.bg} ${stat.color} rounded-xl`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  +12%
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
              <div className="text-sm font-medium text-slate-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* RECENT JDS LIST */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Recently Modified
              </h2>
              <Link 
                to={`/${user?.role?.toLowerCase().includes('admin') ? 'admin' : user?.role?.toLowerCase().includes('hr') ? 'hr' : 'manager'}/my-jds`} 
                className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                View All
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {recentJDs.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {recentJDs.map((jd) => (
                    <button
                      key={jd.id}
                      onClick={() => navigate(`/admin/jd/${jd.id}`)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
                          <Briefcase className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{jd.title}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            Edited {(() => {
                              const d = new Date(jd.createdAt);
                              return isNaN(d.getTime()) ? "Recently" : d.toLocaleDateString();
                            })()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          jd.status === 'final' || jd.status === 'Active' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {jd.status || 'Draft'}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-slate-900 font-semibold text-lg">No job descriptions yet</h3>
                  <p className="text-slate-500 max-w-xs mx-auto mt-2">
                    Get started by generating your first AI-powered job description.
                  </p>
                  <button
                    onClick={() => navigate('/admin/generate')}
                    className="mt-6 text-blue-600 font-bold flex items-center gap-2 mx-auto hover:gap-3 transition-all"
                  >
                    Start Generating <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* QUICK ACTIONS */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Quick Actions</h2>
            <div className="grid grid-cols-1 gap-4">
              {quickActions.map((action, i) => (
                <Link
                  key={i}
                  to={action.path}
                  className="group relative bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all hover:border-blue-200"
                >
                  <div className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-500/10 group-hover:scale-110 transition-transform`}>
                    <action.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors uppercase text-sm tracking-wide">
                    {action.title}
                  </h3>
                  <p className="text-slate-500 text-sm mt-1 leading-relaxed">
                    {action.description}
                  </p>
                  <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-5 h-5 text-blue-600" />
                  </div>
                </Link>
              ))}
            </div>
            
            {/* INSIGHT CARD */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl text-white shadow-xl shadow-slate-200 overflow-hidden relative">
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl" />
              <div className="relative z-10">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                  Forge Insights
                </h3>
                <p className="text-slate-400 text-sm mt-3 leading-relaxed">
                  Did you know? Descriptions with specific competency lists get 40% more qualified applicants. 
                </p>
                <button className="mt-4 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors">
                  Learn more best practices
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>
    </PageLayout>
  );
}
