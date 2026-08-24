import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  Megaphone,
  MessageSquareHeart,
  Radio,
  Shield,
  ShieldAlert,
  TrendingUp,
  Users,
  Wrench,
  Zap,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { superAdminService } from '../../services/superAdminService';
import AnalyticsHero3D from '../../components/superadmin/AnalyticsHero3D';
import OrgConstellation3D from '../../components/superadmin/OrgConstellation3D';
import TenantJdOutputAnalytics from '../../components/superadmin/TenantJdOutputAnalytics';

const HEALTH_META = {
  healthy: { label: 'Healthy', color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
  expiring: { label: 'Expiring Soon', color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500' },
  suspended: { label: 'Suspended', color: 'text-rose-600', bg: 'bg-rose-50', dot: 'bg-rose-500' },
  expired: { label: 'Expired', color: 'text-red-700', bg: 'bg-red-50', dot: 'bg-red-600' },
  idle: { label: 'Idle', color: 'text-slate-500', bg: 'bg-slate-50', dot: 'bg-slate-400' },
};

const ALERT_STYLES = {
  critical: 'border-rose-200 bg-rose-50/80 text-rose-800',
  warning: 'border-amber-200 bg-amber-50/80 text-amber-900',
  info: 'border-indigo-200 bg-indigo-50/80 text-indigo-900',
};

const ROLE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#94a3b8'];

function AnimatedNumber({ value, isLoading }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (isLoading) return;
    const target = Number(value) || 0;
    const start = display;
    const duration = 700;
    const startTime = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (target - start) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [value, isLoading]);

  return <span>{isLoading ? '—' : display.toLocaleString()}</span>;
}

function HealthRing({ score, isLoading }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference;
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        {!isLoading && (
          <motion.circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-slate-800">{isLoading ? '—' : score}</span>
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Health</span>
      </div>
    </div>
  );
}

const SuperAdminAnalytics = () => {
  const [overview, setOverview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchOverview = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const data = await superAdminService.getPlatformOverview();
      setOverview(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load platform analytics');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const rolePieData = useMemo(() => {
    if (!overview?.role_totals) return [];
    const { admin, hr, manager, enduser } = overview.role_totals;
    return [
      { name: 'Admins', value: admin },
      { name: 'HR', value: hr },
      { name: 'Managers', value: manager },
      { name: 'End Users', value: enduser },
    ].filter((d) => d.value > 0);
  }, [overview]);

  const alerts = overview?.maintenance_alerts || [];
  const organizations = overview?.organizations || [];

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto w-full">
      {/* Hero command strip */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-100/80 bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 text-white mb-8 shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.25),transparent_45%)] pointer-events-none" />
        <div className="grid lg:grid-cols-[1fr_320px] gap-0 relative">
          <div className="p-6 lg:p-8 z-10">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-medium text-indigo-200 mb-3">
                  <Shield size={12} /> Super Admin Command Center
                </div>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Platform Analytics</h1>
                <p className="text-indigo-200/80 mt-2 max-w-xl text-sm lg:text-base">
                  Real-time tenant health, maintenance signals, and JD velocity — everything you need before downtime or access changes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => fetchOverview(true)}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-sm transition-colors disabled:opacity-60"
              >
                <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Organizations', value: overview?.total_organizations, icon: Building2 },
                { label: 'Platform Users', value: overview?.total_users, icon: Users },
                { label: 'JDs This Month', value: overview?.monthly_jds, icon: TrendingUp },
                { label: 'Active Broadcasts', value: overview?.active_broadcasts, icon: Megaphone },
              ].map((kpi, i) => (
                <motion.div
                  key={kpi.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl bg-white/5 border border-white/10 p-4 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-2 text-indigo-200 text-xs mb-2">
                    <kpi.icon size={14} /> {kpi.label}
                  </div>
                  <p className="text-2xl font-bold">
                    <AnimatedNumber value={kpi.value} isLoading={isLoading} />
                  </p>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="relative min-h-[240px] lg:min-h-full border-t lg:border-t-0 lg:border-l border-white/10">
            <AnalyticsHero3D
              healthScore={overview?.platform_health_score ?? 75}
              orgCount={overview?.total_organizations ?? 6}
              className="h-full"
            />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-indigo-200/70">
              <span>Live platform pulse</span>
              <span className="font-semibold text-white">{isLoading ? '—' : `${overview?.platform_health_score ?? 0}% health`}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Maintenance + health row */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <Wrench size={18} />
              </div>
              <div>
                <h2 className="font-bold text-slate-800">Maintenance Command Center</h2>
                <p className="text-xs text-slate-500">Actions needed before downtime, renewals, or tenant outreach</p>
              </div>
            </div>
            <Link
              to="/superadmin/broadcasts"
              className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Manage broadcasts <ArrowRight size={12} />
            </Link>
          </div>
          <div className="p-4 space-y-2 max-h-[320px] overflow-y-auto">
            {isLoading ? (
              <div className="py-8 text-center text-slate-400 text-sm">Loading maintenance signals…</div>
            ) : alerts.length === 0 ? (
              <div className="py-8 text-center">
                <ShieldAlert className="mx-auto text-emerald-400 mb-2" size={28} />
                <p className="text-sm font-medium text-slate-700">All clear — no maintenance alerts</p>
                <p className="text-xs text-slate-500 mt-1">Platform tenants are healthy and active.</p>
              </div>
            ) : (
              alerts.map((alert, idx) => (
                <div
                  key={`${alert.type}-${alert.org_id || idx}`}
                  className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${ALERT_STYLES[alert.severity] || ALERT_STYLES.info}`}
                >
                  {alert.severity === 'critical' ? (
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  ) : alert.type === 'broadcast' ? (
                    <Radio size={16} className="mt-0.5 shrink-0" />
                  ) : (
                    <CalendarClock size={16} className="mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p>{alert.message}</p>
                    {alert.org_name && (
                      <Link
                        to="/superadmin/organizations"
                        className="inline-flex items-center gap-1 mt-1 text-xs font-semibold underline underline-offset-2"
                      >
                        Open Organizations <ArrowRight size={10} />
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6"
        >
          <h2 className="font-bold text-slate-800 mb-1">Platform Health Score</h2>
          <p className="text-xs text-slate-500 mb-4">Weighted by suspended, expiring, and idle tenants</p>
          <div className="flex flex-col items-center">
            <HealthRing score={overview?.platform_health_score ?? 0} isLoading={isLoading} />
            <div className="grid grid-cols-2 gap-2 w-full mt-4">
              {[
                { label: 'Active', value: overview?.active_organizations, color: 'text-emerald-600' },
                { label: 'Suspended', value: overview?.suspended_organizations, color: 'text-rose-600' },
                { label: 'Expiring', value: overview?.expiring_organizations, color: 'text-amber-600' },
                { label: 'Idle', value: overview?.idle_organizations, color: 'text-slate-500' },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-slate-50 px-3 py-2 text-center">
                  <p className={`text-lg font-bold ${item.color}`}>{isLoading ? '—' : item.value ?? 0}</p>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Role distribution */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-1">
            <Users size={18} className="text-emerald-500" />
            <h2 className="font-bold text-slate-800">Role Distribution</h2>
          </div>
          <p className="text-xs text-slate-500 mb-2">Platform-wide user mix</p>
          <div className="w-full min-w-0" style={{ minHeight: 260 }}>
            {!isLoading && rolePieData.length > 0 && (
              <ResponsiveContainer width="100%" height={260} minWidth={0}>
                <PieChart>
                  <Pie data={rolePieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {rolePieData.map((entry, index) => (
                      <Cell key={entry.name} fill={ROLE_COLORS[index % ROLE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-2 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-slate-800">{isLoading ? '—' : (overview?.total_jds ?? 0).toLocaleString()}</p>
              <p className="text-[10px] text-slate-400 uppercase">Total JDs</p>
            </div>
            <div>
              <p className="text-lg font-bold text-indigo-600">{isLoading ? '—' : (overview?.daily_jds ?? 0).toLocaleString()}</p>
              <p className="text-[10px] text-slate-400 uppercase">JDs Today</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={18} className="text-indigo-500" />
            <h2 className="font-bold text-slate-800">Platform JD Pulse</h2>
          </div>
          <p className="text-xs text-slate-500 mb-5">Aggregated output across all tenants — scales cleanly regardless of org count</p>
          {!isLoading && (
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { label: 'Today', value: overview?.daily_jds ?? 0, color: '#6366f1', pct: overview?.monthly_jds ? Math.min(100, ((overview?.daily_jds ?? 0) / overview.monthly_jds) * 100 * 30) : 0 },
                { label: 'This Month', value: overview?.monthly_jds ?? 0, color: '#8b5cf6', pct: overview?.yearly_jds ? Math.min(100, ((overview?.monthly_jds ?? 0) / overview.yearly_jds) * 100 * 12) : 0 },
                { label: 'This Year', value: overview?.yearly_jds ?? 0, color: '#10b981', pct: overview?.total_jds ? Math.min(100, ((overview?.yearly_jds ?? 0) / overview.total_jds) * 100) : 0 },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <div className="flex items-end justify-between mb-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">{item.label}</p>
                      <p className="text-3xl font-bold text-slate-800 mt-1">{item.value.toLocaleString()}</p>
                    </div>
                    <p className="text-xs text-slate-500">JDs</p>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.max(item.pct, item.value > 0 ? 8 : 0)}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            {[
              { label: 'Total Tenants', value: overview?.total_organizations },
              { label: 'Active Tenants', value: organizations.filter((o) => (o.monthly_count || 0) > 0).length },
              { label: 'Idle Tenants', value: overview?.idle_organizations },
              { label: 'Total Users', value: overview?.total_users },
            ].map((item) => (
              <div key={item.label} className="rounded-lg bg-white border border-slate-100 py-2.5 px-2">
                <p className="text-lg font-bold text-slate-800">{isLoading ? '—' : (item.value ?? 0).toLocaleString()}</p>
                <p className="text-[9px] uppercase tracking-wide text-slate-400 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3D tenant fleet map */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-8 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-indigo-500" />
              <h2 className="font-bold text-slate-800">Tenant Fleet Map</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">Interactive 3D command view — column height reflects activity, cap color shows tenant health</p>
          </div>
          <div className="flex flex-wrap gap-3 text-[10px]">
            {Object.entries(HEALTH_META).map(([key, meta]) => (
              <span key={key} className="inline-flex items-center gap-1.5 text-slate-500">
                <span className={`w-2 h-2 rounded-full ${meta.dot}`} /> {meta.label}
              </span>
            ))}
          </div>
        </div>
        {!isLoading && (
          <OrgConstellation3D
            organizations={overview?.organizations || []}
            healthScore={overview?.platform_health_score ?? 84}
          />
        )}
      </div>

      {/* JD output — scales to 100+ orgs */}
      <div className="mb-8">
        <div className="mb-4">
          <h2 className="font-bold text-slate-800 text-lg">JD Output Intelligence</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Built for large fleets — aggregated tiers, top-N rankings, and paginated search instead of cramped bar charts
          </p>
        </div>
        <TenantJdOutputAnalytics
          organizations={organizations}
          totals={{
            daily_jds: overview?.daily_jds,
            monthly_jds: overview?.monthly_jds,
            yearly_jds: overview?.yearly_jds,
            total_jds: overview?.total_jds,
          }}
          isLoading={isLoading}
        />
      </div>

      {/* Tenant health table — paginated via search in rankings; health-focused view */}
      <div className="grid gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-800">Tenant Health & Access</h2>
              <p className="text-xs text-slate-500 mt-0.5">Renewals, suspensions, and access planning — {organizations.length} tenants</p>
            </div>
            <Link
              to="/superadmin/organizations"
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Manage tenants <ArrowRight size={12} />
            </Link>
          </div>
          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 sticky top-0 z-10">
                <tr>
                  <th className="px-5 py-3.5">Organization</th>
                  <th className="px-5 py-3.5">Health</th>
                  <th className="px-5 py-3.5 text-center">Users</th>
                  <th className="px-5 py-3.5 text-center">JDs/mo</th>
                  <th className="px-5 py-3.5 text-center">Access Until</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((org) => {
                  const meta = HEALTH_META[org.health] || HEALTH_META.healthy;
                  const accessLabel = org.access_valid_until
                    ? new Date(org.access_valid_until).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—';
                  return (
                    <tr key={org.org_id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-slate-800">{org.org_name}</div>
                        {org.industry && <div className="text-xs text-slate-400">{org.industry}</div>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${meta.bg} ${meta.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center text-slate-600">{org.total_users}</td>
                      <td className="px-5 py-3.5 text-center text-slate-700">{org.monthly_count}</td>
                      <td className="px-5 py-3.5 text-center text-xs text-slate-500">{accessLabel}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Quick actions footer */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { to: '/superadmin/broadcasts', icon: Megaphone, title: 'Schedule Maintenance Broadcast', desc: 'Notify all users before downtime' },
          { to: '/superadmin/organizations', icon: Building2, title: 'Manage Tenant Access', desc: 'Suspend, renew, or extend org access' },
          { to: '/superadmin/platform-voices', icon: MessageSquareHeart, title: 'Platform Voices', desc: 'User feedback, ratings, and tips across tenants' },
          { to: '/superadmin/dashboard', icon: Shield, title: 'Tenant Deep Dive', desc: 'Inspect members and add users per org' },
        ].map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="group flex items-start gap-3 p-4 rounded-xl border border-slate-100 bg-white hover:border-indigo-200 hover:shadow-md transition-all"
          >
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors">
              <action.icon size={18} />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">{action.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{action.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default SuperAdminAnalytics;
