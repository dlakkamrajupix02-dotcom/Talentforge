import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { BarChart3, ChevronLeft, ChevronRight, Search, TrendingUp, X } from 'lucide-react';

const TIER_COLORS = ['#94a3b8', '#a5b4fc', '#6366f1', '#4f46e5', '#312e81'];
const TOP_LIMITS = [10, 25, 50];

const ACTIVITY_TIERS = [
  { label: 'Zero', sub: '0 JDs/mo', min: 0, max: 0 },
  { label: 'Low', sub: '1–5', min: 1, max: 5 },
  { label: 'Growing', sub: '6–20', min: 6, max: 20 },
  { label: 'Active', sub: '21–50', min: 21, max: 50 },
  { label: 'Power', sub: '50+', min: 51, max: Infinity },
];

function truncateName(name, max = 14) {
  if (!name) return '—';
  return name.length > max ? `${name.slice(0, max)}…` : name;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  return (
    <div className="rounded-xl bg-white border border-slate-200 shadow-xl px-3 py-2.5 text-xs min-w-[160px]">
      <p className="font-semibold text-slate-800 mb-1.5">{row?.fullName || label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex justify-between gap-4 text-slate-600">
          <span>{entry.name}</span>
          <span className="font-semibold text-slate-800">{entry.value?.toLocaleString()}</span>
        </div>
      ))}
      {row?.total_users != null && (
        <p className="text-slate-400 mt-1.5 pt-1.5 border-t border-slate-100">{row.total_users} users</p>
      )}
    </div>
  );
}

const TenantJdOutputAnalytics = ({
  organizations = [],
  totals = {},
  isLoading = false,
}) => {
  const [topLimit, setTopLimit] = useState(10);
  const [tableSearch, setTableSearch] = useState('');
  const [sortKey, setSortKey] = useState('monthly_count');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const rankedOrgs = useMemo(() => {
    return [...organizations]
      .map((org) => ({
        ...org,
        monthly_count: org.monthly_count || 0,
        yearly_count: org.yearly_count || 0,
        daily_count: org.daily_count || 0,
        total_count: org.total_count || 0,
      }))
      .sort((a, b) => b.monthly_count - a.monthly_count || b.yearly_count - a.yearly_count);
  }, [organizations]);

  const activityTiers = useMemo(() => {
    return ACTIVITY_TIERS.map((tier, index) => {
      const count = organizations.filter((org) => {
        const m = org.monthly_count || 0;
        return m >= tier.min && m <= tier.max;
      }).length;
      return {
        ...tier,
        count,
        fill: TIER_COLORS[index],
        pct: organizations.length ? Math.round((count / organizations.length) * 100) : 0,
      };
    });
  }, [organizations]);

  const topChartData = useMemo(() => {
    return rankedOrgs.slice(0, topLimit).map((org) => ({
      name: truncateName(org.org_name),
      fullName: org.org_name,
      monthly: org.monthly_count,
      yearly: org.yearly_count,
      daily: org.daily_count,
      total_users: org.total_users,
    }));
  }, [rankedOrgs, topLimit]);

  const activeTenants = useMemo(
    () => organizations.filter((o) => (o.monthly_count || 0) > 0).length,
    [organizations]
  );

  const filteredTableRows = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    let rows = rankedOrgs;
    if (q) {
      rows = rows.filter(
        (org) =>
          org.org_name?.toLowerCase().includes(q) ||
          org.industry?.toLowerCase().includes(q)
      );
    }
    rows = [...rows].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return rows;
  }, [rankedOrgs, tableSearch, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredTableRows.length / pageSize));
  const paginatedRows = filteredTableRows.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(1);
  };

  const chartHeight = Math.max(280, Math.min(topLimit * 28, 720));

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-slate-400 text-sm">
        Loading JD output analytics…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'JDs Today', value: totals.daily_jds, accent: 'text-indigo-600', bg: 'from-indigo-50/80' },
          { label: 'JDs This Month', value: totals.monthly_jds, accent: 'text-violet-600', bg: 'from-violet-50/80' },
          { label: 'JDs This Year', value: totals.yearly_jds, accent: 'text-emerald-600', bg: 'from-emerald-50/80' },
          { label: 'Active Tenants', value: activeTenants, suffix: `/ ${organizations.length}`, accent: 'text-slate-800', bg: 'from-slate-50' },
        ].map((kpi) => (
          <div key={kpi.label} className={`rounded-xl bg-gradient-to-br ${kpi.bg} to-white border border-slate-100 p-4`}>
            <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">{kpi.label}</p>
            <p className={`text-2xl font-bold mt-1 ${kpi.accent}`}>
              {(kpi.value ?? 0).toLocaleString()}
              {kpi.suffix && <span className="text-sm font-medium text-slate-400">{kpi.suffix}</span>}
            </p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Activity distribution — scales to any org count */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={16} className="text-indigo-500" />
            <h3 className="font-bold text-slate-800 text-sm">Activity Distribution</h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">Tenants grouped by monthly JD volume — works at any fleet size</p>

          <div className="space-y-2.5">
            {activityTiers.map((tier) => (
              <div key={tier.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-600">
                    <span className="font-semibold text-slate-800">{tier.label}</span>
                    <span className="text-slate-400 ml-1">({tier.sub})</span>
                  </span>
                  <span className="font-semibold text-slate-800 tabular-nums">
                    {tier.count} <span className="text-slate-400 font-normal">({tier.pct}%)</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${tier.pct}%`, backgroundColor: tier.fill, minWidth: tier.count > 0 ? '4px' : 0 }}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-slate-400 mt-4 leading-relaxed">
            {organizations.length > 50
              ? `${organizations.length} tenants aggregated — no per-org clutter.`
              : 'Distribution updates automatically as your fleet grows.'}
          </p>
        </div>

        {/* Top tenants horizontal chart — scales via top-N selector */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-indigo-500" />
                <h3 className="font-bold text-slate-800 text-sm">Top Performers</h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Horizontal rank chart — readable even with 100+ tenants</p>
            </div>
            <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium">
              {TOP_LIMITS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setTopLimit(n)}
                  className={`px-3 py-1.5 transition-colors ${
                    topLimit === n ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  Top {n}
                </button>
              ))}
            </div>
          </div>

          {topChartData.length > 0 ? (
            <div className="w-full min-w-0" style={{ height: chartHeight, minHeight: chartHeight }}>
              <ResponsiveContainer width="100%" height={chartHeight} minWidth={0}>
                <BarChart
                  data={topChartData}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
                  barCategoryGap={topLimit > 25 ? 4 : 8}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={88}
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Bar dataKey="monthly" name="Monthly JDs" fill="#6366f1" radius={[0, 4, 4, 0]} maxBarSize={topLimit > 25 ? 10 : 16} />
                  <Bar dataKey="yearly" name="Yearly JDs" fill="#cbd5e1" radius={[0, 4, 4, 0]} maxBarSize={topLimit > 25 ? 10 : 16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No JD output data yet</div>
          )}
        </div>
      </div>

      {/* Full rankings table — paginated + searchable */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-800">Full Tenant Rankings</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {filteredTableRows.length} of {organizations.length} tenants · sorted by activity
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={tableSearch}
              onChange={(e) => {
                setTableSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Filter tenants..."
              className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300"
            />
            {tableSearch && (
              <button type="button" onClick={() => { setTableSearch(''); setPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50/80">
              <tr>
                <th className="px-5 py-3 w-10">#</th>
                <th className="px-5 py-3">Organization</th>
                {[
                  { key: 'daily_count', label: 'Today' },
                  { key: 'monthly_count', label: 'Month' },
                  { key: 'yearly_count', label: 'Year' },
                  { key: 'total_count', label: 'All Time' },
                  { key: 'total_users', label: 'Users' },
                ].map((col) => (
                  <th
                    key={col.key}
                    className="px-5 py-3 text-center cursor-pointer hover:text-indigo-600 select-none"
                    onClick={() => toggleSort(col.key)}
                  >
                    {col.label}
                    {sortKey === col.key && (sortDir === 'desc' ? ' ↓' : ' ↑')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((org, idx) => {
                const rank = (page - 1) * pageSize + idx + 1;
                return (
                  <tr key={org.org_id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3 text-xs text-slate-400 tabular-nums">{rank}</td>
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-800">{org.org_name}</div>
                      {org.industry && <div className="text-xs text-slate-400">{org.industry}</div>}
                    </td>
                    <td className="px-5 py-3 text-center font-semibold text-indigo-600">{org.daily_count}</td>
                    <td className="px-5 py-3 text-center text-slate-700">{org.monthly_count}</td>
                    <td className="px-5 py-3 text-center text-slate-600">{org.yearly_count}</td>
                    <td className="px-5 py-3 text-center font-medium text-slate-700">{org.total_count}</td>
                    <td className="px-5 py-3 text-center text-slate-600">{org.total_users}</td>
                  </tr>
                );
              })}
              {paginatedRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-400 text-sm">
                    No tenants match your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredTableRows.length > pageSize && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredTableRows.length)} of {filteredTableRows.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-2 tabular-nums">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TenantJdOutputAnalytics;
