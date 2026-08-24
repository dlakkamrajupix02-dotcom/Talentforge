import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { MessageSquareHeart, Search, Star, ThumbsUp, Users, X } from 'lucide-react';
import { superAdminService } from '../../services/superAdminService';

const RATING_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#6366f1', '#22c55e'];

function RatingStars({ rating }) {
  if (!rating) return <span className="text-xs text-slate-400">—</span>;
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500 text-sm" aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < rating ? 'opacity-100' : 'opacity-20'}>★</span>
      ))}
    </span>
  );
}

const PlatformVoicesSection = () => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const result = await superAdminService.getFeedbackAnalytics(200);
        setData(result);
      } catch (error) {
        console.error('Failed to load feedback analytics:', error);
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const ratingChartData = useMemo(() => {
    if (!data?.rating_distribution) return [];
    return Object.entries(data.rating_distribution).map(([rating, count]) => ({
      rating: `${rating}★`,
      count,
      fill: RATING_COLORS[Number(rating) - 1],
    }));
  }, [data]);

  const filteredRows = useMemo(() => {
    const rows = data?.recent || [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.user_name?.toLowerCase().includes(q) ||
        row.org_name?.toLowerCase().includes(q) ||
        row.user_role?.toLowerCase().includes(q) ||
        row.tip?.toLowerCase().includes(q) ||
        row.comment?.toLowerCase().includes(q)
    );
  }, [data, search]);

  const loading = isLoading;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-end gap-4">
        {!loading && (
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, org, tip, or comment..."
              className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                <X size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">Loading feedback analytics…</div>
      ) : !data || data.total_count === 0 ? (
        <div className="py-16 text-center px-6">
          <MessageSquareHeart className="mx-auto text-slate-300 mb-3" size={32} />
          <p className="text-sm font-medium text-slate-600">No feedback collected yet</p>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Users will be prompted gently after success moments. Feedback will appear here with analytics automatically.
          </p>
        </div>
      ) : (
        <>
          <div className="p-6 grid grid-cols-2 lg:grid-cols-5 gap-3 border-b border-slate-100 bg-slate-50/40">
            {[
              { label: 'Total Responses', value: data.total_count, icon: MessageSquareHeart, color: 'text-slate-800' },
              { label: 'Avg Rating', value: data.average_rating ? `${data.average_rating}/5` : '—', icon: Star, color: 'text-amber-500' },
              { label: 'Satisfaction', value: `${data.satisfaction_score}%`, icon: ThumbsUp, color: 'text-emerald-600' },
              { label: 'Tips Shared', value: data.tips_count, icon: Users, color: 'text-indigo-600' },
              { label: 'With Comments', value: data.comments_count, icon: MessageSquareHeart, color: 'text-violet-600' },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-xl bg-white border border-slate-100 p-4">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <kpi.icon size={14} />
                  <span className="text-[10px] uppercase tracking-wide font-semibold">{kpi.label}</span>
                </div>
                <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
              </div>
            ))}
          </div>

          <div className="p-6 grid lg:grid-cols-3 gap-6 border-b border-slate-100">
            <div className="lg:col-span-1">
              <h3 className="text-sm font-bold text-slate-800 mb-3">Rating Distribution</h3>
              <div className="w-full min-w-0" style={{ minHeight: 200 }}>
                <ResponsiveContainer width="100%" height={200} minWidth={0}>
                  <BarChart data={ratingChartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="rating" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={36}>
                      {ratingChartData.map((entry) => (
                        <Cell key={entry.rating} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-3 mt-2 text-[10px] text-slate-500">
                <span><strong className="text-emerald-600">{data.promoters}</strong> promoters</span>
                <span><strong className="text-indigo-600">{data.passives}</strong> passives</span>
                <span><strong className="text-rose-600">{data.detractors}</strong> detractors</span>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-3">By Role</h3>
              <div className="space-y-2">
                {(data.by_role || []).map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50">
                    <span className="font-medium text-slate-700">{item.label}</span>
                    <span className="text-slate-500">
                      {item.count} · {item.average_rating != null ? `${item.average_rating}★ avg` : 'no rating'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-3">By Organization</h3>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {(data.by_org || []).map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50">
                    <span className="font-medium text-slate-700 truncate pr-2">{item.label}</span>
                    <span className="text-slate-500 shrink-0">
                      {item.count} · {item.average_rating != null ? `${item.average_rating}★` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 sticky top-0">
                <tr>
                  <th className="px-5 py-3.5">Person</th>
                  <th className="px-5 py-3.5">Organization</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Rating</th>
                  <th className="px-5 py-3.5 min-w-[180px]">Tip</th>
                  <th className="px-5 py-3.5 min-w-[180px]">Comment</th>
                  <th className="px-5 py-3.5">Trigger</th>
                  <th className="px-5 py-3.5">When</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/60 align-top">
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-800">{row.user_name}</div>
                      <div className="text-xs text-slate-400">{row.user_email}</div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700">{row.org_name || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-xs font-medium text-slate-600">{row.user_role}</span>
                    </td>
                    <td className="px-5 py-3.5"><RatingStars rating={row.rating} /></td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs leading-relaxed">{row.tip || '—'}</td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs leading-relaxed">{row.comment || '—'}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-500 capitalize">
                      {(row.trigger_context?.trigger || '—').replace(/_/g, ' ')}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                      {format(new Date(row.created_at), 'MMM dd, yyyy · h:mm a')}
                    </td>
                  </tr>
                ))}
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-slate-400 text-sm">
                      No feedback matches your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default PlatformVoicesSection;
